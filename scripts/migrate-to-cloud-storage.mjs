import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { put } from '@vercel/blob';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const blobToken = process.env.BLOB_READ_WRITE_TOKEN || process.env.PAPERS_DATA_READ_WRITE_TOKEN;

let supabase = null;
if (supabaseUrl && serviceRoleKey) {
  supabase = createClient(supabaseUrl, serviceRoleKey);
}

if (!supabase && !blobToken) {
  console.error('Neither Supabase credentials nor Vercel Blob token found in environment.');
  process.exit(1);
}

const PUBLIC_DIR = path.join(process.cwd(), 'public');

function getAllFiles(dir, exts = ['.pdf', '.txt'], fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      getAllFiles(fullPath, exts, fileList);
    } else if (entry.isFile() && exts.some((ext) => entry.name.endsWith(ext))) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

async function uploadFile(relativePath, buffer, contentType) {
  const cleanKey = relativePath.replace(/\\/g, '/').replace(/^\/+/, '');

  if (blobToken) {
    const blob = await put(cleanKey, buffer, {
      access: 'public',
      addRandomSuffix: false,
      contentType,
      token: blobToken,
    });
    return blob.url;
  }

  // Fallback to Supabase Storage
  const { data, error } = await supabase.storage.from('papers').upload(cleanKey, buffer, {
    contentType,
    upsert: true,
  });

  if (error) throw error;

  const { data: urlData } = supabase.storage.from('papers').getPublicUrl(cleanKey);
  return urlData.publicUrl;
}

async function run() {
  const paperFiles = getAllFiles(path.join(PUBLIC_DIR, 'papers'), ['.pdf']);
  const keyFiles = getAllFiles(path.join(PUBLIC_DIR, 'answer_keys'), ['.txt']);
  const allFiles = [...paperFiles, ...keyFiles];

  console.log(`Starting migration of ${allFiles.length} files to Cloud Storage (${blobToken ? 'Vercel Blob' : 'Supabase Storage'})...`);

  const mapping = {};

  for (let i = 0; i < allFiles.length; i++) {
    const filePath = allFiles[i];
    const relPath = '/' + path.relative(PUBLIC_DIR, filePath).replace(/\\/g, '/');
    const isPdf = filePath.endsWith('.pdf');
    const contentType = isPdf ? 'application/pdf' : 'text/plain;charset=utf-8';
    const buffer = fs.readFileSync(filePath);

    console.log(`[${i + 1}/${allFiles.length}] Uploading ${relPath} (${(buffer.length / 1024 / 1024).toFixed(2)} MB)...`);
    try {
      const publicUrl = await uploadFile(relPath, buffer, contentType);
      mapping[relPath] = publicUrl;
      console.log(`  -> Live: ${publicUrl}`);
    } catch (err) {
      console.error(`  -> Failed:`, err.message);
    }
  }

  const outPath = path.join(process.cwd(), 'scripts', 'cloud-urls-mapping.json');
  fs.writeFileSync(outPath, JSON.stringify(mapping, null, 2), 'utf-8');
  console.log(`\nMigration complete! Saved mapping to scripts/cloud-urls-mapping.json`);
}

run().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
