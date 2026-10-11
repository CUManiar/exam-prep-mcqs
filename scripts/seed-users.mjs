import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const SEED_USERS = [
  {
    email: 'admin@upscprep.internal',
    password: 'AdminPassword2026!',
    fullName: 'Admin User',
    isAdmin: true,
    isPro: true,
  },
  {
    email: 'test@upscprep.internal',
    password: 'TestPassword2026!',
    fullName: 'Test Aspirant',
    isAdmin: false,
    isPro: false,
  },
  {
    email: 'pro-test@upscprep.internal',
    password: 'ProTestPassword2026!',
    fullName: 'Pro Verified Aspirant',
    isAdmin: false,
    isPro: true,
  },
];

async function seed() {
  console.log('Seeding / verifying admin and test accounts in Supabase...');

  const { data: listData, error: listErr } = await supabase.auth.admin.listUsers();
  if (listErr) {
    console.error('Failed to list users:', listErr);
    process.exit(1);
  }

  const existingUsers = listData?.users || [];

  for (const userDef of SEED_USERS) {
    const existing = existingUsers.find((u) => u.email === userDef.email);
    let userId = existing?.id;

    if (!existing) {
      console.log(`Creating user: ${userDef.email}...`);
      const { data: createData, error: createErr } = await supabase.auth.admin.createUser({
        email: userDef.email,
        password: userDef.password,
        email_confirm: true,
        user_metadata: {
          full_name: userDef.fullName,
          role: userDef.isAdmin ? 'admin' : 'aspirant',
        },
      });

      if (createErr) {
        console.error(`Error creating ${userDef.email}:`, createErr.message);
        continue;
      }
      userId = createData.user.id;
      console.log(`  -> Created user with ID: ${userId}`);
    } else {
      console.log(`User ${userDef.email} already exists (ID: ${userId}). Updating metadata & password...`);
      await supabase.auth.admin.updateUserById(userId, {
        password: userDef.password,
        email_confirm: true,
        user_metadata: {
          full_name: userDef.fullName,
          role: userDef.isAdmin ? 'admin' : 'aspirant',
        },
      });
    }

    // Ensure profile entry in public.profiles
    if (userId) {
      const { error: profileErr } = await supabase.from('profiles').upsert(
        {
          id: userId,
          email: userDef.email,
          full_name: userDef.fullName,
          is_pro: userDef.isPro,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );

      if (profileErr) {
        console.error(`  -> Failed upserting profile for ${userDef.email}:`, profileErr.message);
      } else {
        console.log(`  -> Profile synced: is_pro=${userDef.isPro}`);
      }
    }
  }

  console.log('\nSeed completed successfully!');
}

seed().catch((err) => {
  console.error('Seed script error:', err);
  process.exit(1);
});
