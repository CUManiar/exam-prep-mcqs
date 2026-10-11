import { NextRequest, NextResponse } from "next/server";
import { uploadFile } from "@/lib/cloudStorage";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file || file.size === 0) {
      return NextResponse.json(
        { ok: false, error: "No file provided" },
        { status: 400 },
      );
    }

    const originalName = file.name || "answer_scan.pdf";
    const cleanName = originalName.toLowerCase().replace(/[^a-z0-9_.]/g, "_");
    const timestamp = Date.now();
    const fileName = `sub_${timestamp}_${cleanName}`;

    const buffer = Buffer.from(await file.arrayBuffer());
    const contentType =
      file.type ||
      (fileName.endsWith(".pdf") ? "application/pdf" : "image/jpeg");
    const url = await uploadFile(fileName, buffer, contentType);

    return NextResponse.json({
      ok: true,
      url,
      fileName: originalName,
      fileSize: file.size,
    });
  } catch (err: any) {
    console.error("Error uploading submission copy:", err);
    return NextResponse.json(
      { ok: false, error: err.message || "Upload failed" },
      { status: 500 },
    );
  }
}
