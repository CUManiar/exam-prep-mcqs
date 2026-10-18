import { NextRequest, NextResponse } from "next/server";
import {
  readJsonStore,
  writeJsonStore,
  deleteFile,
  isProdEnv,
  getProdApiUrl,
  getBlobToken,
} from "@/lib/cloudStorage";

import fs from "node:fs";
import path from "node:path";
import { INITIAL_PAPERS } from "@/lib/defaults";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const cleanId = id.toLowerCase();

    // Forward to PROD if configured
    if (isProdEnv() && !process.env.VERCEL && !getBlobToken()) {
      try {
        await fetch(`${getProdApiUrl()}/api/papers/${cleanId}`, {
          method: "DELETE",
          redirect: "follow",
        });
      } catch (err) {
        console.warn("Failed forwarding paper DELETE to PROD:", err);
      }
    }

    // 1. HARD DELETE from Supabase custom_papers table and Supabase storage bucket
    if (
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY
    ) {
      try {
        const { createClient } = await import("@supabase/supabase-js");
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL,
          process.env.SUPABASE_SERVICE_ROLE_KEY,
        );

        // Find all matching rows in custom_papers table
        const { data: rows } = await supabase
          .from("custom_papers")
          .select("*")
          .or(`id.eq.${id},id.eq.${cleanId},id.ilike.${cleanId}`);

        if (rows && rows.length > 0) {
          for (const row of rows) {
            // Delete specific file URLs
            if (row.qp_url) await deleteFile(row.qp_url);
            if (row.ak_url) await deleteFile(row.ak_url);
            if (row.exs_url) await deleteFile(row.exs_url);

            // Also list and remove the isolated storage folder
            if (row.user_id && row.id) {
              const folder = `custom-papers/${row.user_id}/${row.id}`;
              const { data: files } = await supabase.storage
                .from("papers")
                .list(folder);
              if (files && files.length > 0) {
                const paths = files.map((f) => `${folder}/${f.name}`);
                await supabase.storage.from("papers").remove(paths);
              }
            }
          }

          // Permanently delete the database record
          await supabase
            .from("custom_papers")
            .delete()
            .or(`id.eq.${id},id.eq.${cleanId},id.ilike.${cleanId}`);
        }
      } catch (sbErr) {
        console.warn("Supabase paper deletion error:", sbErr);
      }
    }

    // 2. HARD DELETE from papers.json and Blob
    const customMeta = await readJsonStore<Record<string, any>>(
      "papers.json",
      {},
    );
    const targetPaper = customMeta[cleanId] || customMeta[id];
    if (targetPaper) {
      // Clean up uploaded files
      if (targetPaper.qpUrl) await deleteFile(targetPaper.qpUrl);
      if (targetPaper.akUrl) await deleteFile(targetPaper.akUrl);
      if (targetPaper.exsUrl) await deleteFile(targetPaper.exsUrl);

      delete customMeta[cleanId];
      delete customMeta[id];
    }

    // Check if it's an initial UPSC built-in paper
    const isInitial = INITIAL_PAPERS.some(
      (p) => p.id.toLowerCase() === cleanId,
    );
    if (isInitial) {
      // Built-in paper tombstone so it stays hidden
      customMeta[`__deleted_${cleanId}`] = {
        deletedAt: new Date().toISOString(),
      };
    } else {
      // Custom user paper: do NOT store tombstones or metadata waste
      delete customMeta[`__deleted_${cleanId}`];
      delete customMeta[`__deleted_${id}`];
    }
    await writeJsonStore("papers.json", customMeta);

    // 3. HARD DELETE local public/data files if present
    const localDir = path.join(process.cwd(), "public", "data");
    if (fs.existsSync(localDir)) {
      try {
        const files = fs.readdirSync(localDir);
        for (const file of files) {
          if (file.toLowerCase().includes(cleanId)) {
            try {
              fs.unlinkSync(path.join(localDir, file));
            } catch {}
          }
        }
      } catch {}
    }

    return NextResponse.json({ ok: true, deletedId: cleanId, hardDeleted: true });
  } catch (err: any) {
    console.error("Delete paper error:", err);
    return NextResponse.json(
      { ok: false, error: err.message },
      { status: 500 },
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const cleanId = id.toLowerCase();
    const body = await req.json();

    // Forward to PROD if configured
    if (isProdEnv() && !process.env.VERCEL && !getBlobToken()) {
      try {
        await fetch(`${getProdApiUrl()}/api/papers/${cleanId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          redirect: "follow",
        });
      } catch (err) {
        console.warn("Failed forwarding paper PATCH to PROD:", err);
      }
    }

    const customMeta = await readJsonStore<Record<string, any>>(
      "papers.json",
      {},
    );
    const current = customMeta[cleanId] || { id: cleanId };
    const updated = {
      ...current,
      ...body,
      id: cleanId,
      updatedAt: new Date().toISOString(),
    };

    customMeta[cleanId] = updated;
    await writeJsonStore("papers.json", customMeta);

    return NextResponse.json({ ok: true, paper: updated });
  } catch (err: any) {
    console.error("Patch paper error:", err);
    return NextResponse.json(
      { ok: false, error: err.message },
      { status: 500 },
    );
  }
}
