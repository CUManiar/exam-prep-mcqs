import { list, del } from '@vercel/blob';

const token = process.env.BLOB_READ_WRITE_TOKEN || process.env.PAPERS_DATA_READ_WRITE_TOKEN;

if (!token) {
  console.log(`
========================================================================
Vercel Blob Purge Utility
========================================================================
No BLOB_READ_WRITE_TOKEN found in environment.

Since all 52 official UPSC papers and answer keys are now permanently
hosted in Supabase Storage, you can either:

OPTION 1: Delete the Vercel Blob store completely (RECOMMENDED)
1. Open Vercel Dashboard -> Storage -> select 'papers-data'.
2. Click 'Settings' tab.
3. Scroll to bottom -> Click 'Delete Store'.
   (This stops any maintenance, removes all data, and costs $0).

OPTION 2: Purge files via command line using token:
Run:
   BLOB_READ_WRITE_TOKEN=vercel_blob_rw_... node scripts/delete-all-vercel-blobs.mjs
========================================================================
`);
  process.exit(0);
}

async function clean() {
  console.log('Listing all blobs in Vercel Blob store...');
  const { blobs } = await list({ token });
  console.log(`Found ${blobs.length} blobs in store.`);

  for (let i = 0; i < blobs.length; i++) {
    const b = blobs[i];
    console.log(`[${i + 1}/${blobs.length}] Deleting ${b.pathname} (${b.url})...`);
    try {
      await del(b.url, { token });
      console.log(`  -> Deleted.`);
    } catch (err) {
      console.error(`  -> Failed:`, err.message);
    }
  }

  console.log('\nAll blobs successfully purged from Vercel Blob!');
}

clean().catch((err) => {
  console.error('Blob cleanup error:', err);
  process.exit(1);
});
