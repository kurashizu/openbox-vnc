import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";

interface EmailRow {
  id: string;
  created_at: string;
  from: string;
  subject: string;
  html: string;
  text: string | null;
  to: string;
  cc: string;
  bcc: string;
  reply_to: string;
  message_id: string;
  attachments: string;
  expires_at: string;
}

interface QueryParams {
  to: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: QueryParams = await request.json();

    if (!body.to) {
      return NextResponse.json({ error: "Missing 'to' parameter" }, { status: 400 });
    }

    const ctx = await getCloudflareContext({ async: true });
    const db = ctx.env.emails_db;

    if (!db) {
      console.error("Database binding not found");
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    const result = await db
      .prepare('SELECT id, created_at, "from", subject, html, text, "to", cc, bcc, reply_to, message_id, attachments, expires_at FROM emails WHERE "to" LIKE ? ORDER BY created_at DESC')
      .bind(`%\"${body.to}\"%`)
      .all();

    const emails = result.results as unknown as EmailRow[];

    return NextResponse.json({ emails }, { status: 200 });
  } catch (error) {
    console.error("Email API error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: "Internal server error", details: message }, { status: 500 });
  }
}