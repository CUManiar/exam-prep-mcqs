import { NextRequest, NextResponse } from "next/server";
import { revokeMcpToken } from "../../../../lib/mcpAuth";
import { noStoreHeaders } from "../../../../lib/mcpProtocol";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const form = await req.formData();
  const token = String(form.get("token") || "");
  if (token) await revokeMcpToken(token);
  return new NextResponse(null, { status: 200, headers: noStoreHeaders() });
}
