import fs from 'node:fs';
import path from 'node:path';
import { put } from '@vercel/blob';

const token = process.env.BLOB_READ_WRITE_TOKEN || process.env.PAPERS_DATA_READ_WRITE_TOKEN;

if (!token) {
  console.log(`
========================================================================
Vercel Blob Migration Utility
========================================================================
To migrate the local 287MB question paper PDFs from public/papers/ into
your Vercel Blob store ('papers-data'), retrieve your Read/Write token:

1. Open Vercel Dashboard -> Storage -> select 'papers-data' (store_sdAcsRLFlB7o4NL5).
2. Go to '.env.local' or 'Tokens' tab and copy BLOB_READ_WRITE_TOKEN.
3. Run this script with the token:

   BLOB_READ_WRITE_TOKEN=vercel_blob_rw_... node scripts/migrate-to-blob.mjs

Once uploaded, the script generates a mapping file that updates
src/lib/defaults.ts to use the high-speed CDN URLs.
========================================================================
`);
  process.exit(0);
}

const PAPERS_DIR = path.join(process.cwd(), 'public', 'papers');

function getAllPdfFiles(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      getAllPdfFiles(fullPath, fileList);
    } else if (entry.isFile() && entry.name.endsWith('.pdf')) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

async function migrate() {
  const files = getAllPdfFiles(PAPERS_DIR);
  console.log(`Found ${files.length} paper PDFs to upload to Vercel Blob...`);

  const results = {};

  for (let i = 0; i < files.length; i++) {
    const filePath = files[i];
    const relativePath = path.relative(path.join(process.cwd(), 'public'), filePath);
    const cleanBlobKey = relativePath.replace(/\\/g, '/');

    console.log(`[${i + 1}/${files.length}] Uploading ${cleanBlobKey}...`);
    const fileBuffer = fs.readFileSync(filePath);

    try {
      const blob = await put(cleanBlobKey, fileBuffer, {
        access: 'public',
        addRandomSuffix: false,
        contentType: 'application/pdf',
        token,
      });

      console.log(`  -> Uploaded: ${blob.url}`);
      results[`/${cleanBlobKey}`] = blob.url;
    } catch (err) {
      console.error(`  -> Failed ${cleanBlobKey}:`, err.message);
    }
  }

  const outPath = path.join(process.cwd(), 'scripts', 'blob-urls-mapping.json');
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2), 'utf-8');
  console.log(`\nMigration completed! Saved mapping to scripts/blob-urls-mapping.json`);
}

migrate();
