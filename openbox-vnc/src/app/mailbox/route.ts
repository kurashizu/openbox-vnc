import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";

interface WebhookPayload {
  created_at: string;
  data: {
    attachments: string[];
    bcc: string[];
    cc: string[];
    created_at: string;
    email_id: string;
    from: string;
    message_id: string;
    subject: string;
    to: string[];
  };
  type: string;
}

interface ResendEmail {
  object: string;
  id: string;
  to: string[];
  from: string;
  created_at: string;
  subject: string;
  html: string;
  text: string | null;
  bcc: string[];
  cc: string[];
  reply_to: string[];
  message_id: string;
  attachments: Array<{
    id: string;
    filename: string;
    content_type: string;
    content_disposition: string | null;
    content_id: string | null;
  }>;
}

export async function POST(request: NextRequest) {
  try {
    const payload: WebhookPayload = await request.json();

    if (payload.type !== "email.received") {
      return NextResponse.json({ error: "Unsupported event type" }, { status: 400 });
    }

    const ctx = await getCloudflareContext({ async: true });
    const db = ctx.env.emails_db;
    const resendToken = process.env.RESEND_API_TOKEN;

    if (!db) {
      console.error("Database binding not found");
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    const { data } = payload;
    console.error("Processing email:", data.email_id);

    const emailRes = await fetch(`https://api.resend.com/emails/receiving/${data.email_id}`, {
      headers: {
        Authorization: `Bearer ${resendToken}`,
      },
    });

    if (!emailRes.ok) {
      console.error("Resend API error:", emailRes.status, await emailRes.text());
      return NextResponse.json({ error: "Failed to retrieve email from Resend" }, { status: 500 });
    }

    const emailData: ResendEmail = await emailRes.json();

    for (const recipient of emailData.to) {
      const deleteQuery = `WITH ranked AS (
          SELECT id, ROW_NUMBER() OVER (PARTITION BY "to" ORDER BY created_at ASC) as rn
          FROM emails WHERE "to" = ?
        )
        DELETE FROM emails WHERE id IN (SELECT id FROM ranked WHERE rn > 19)`;
      await db.prepare(deleteQuery).bind(recipient).run();
    }

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    await db
      .prepare(
        `INSERT INTO emails (id, created_at, "from", subject, "to", cc, bcc, reply_to, html, text, message_id, attachments, expires_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        emailData.id,
        emailData.created_at,
        emailData.from,
        emailData.subject,
        JSON.stringify(emailData.to),
        JSON.stringify(emailData.cc),
        JSON.stringify(emailData.bcc),
        JSON.stringify(emailData.reply_to),
        emailData.html,
        emailData.text,
        emailData.message_id,
        JSON.stringify(emailData.attachments),
        expiresAt
      )
      .run();

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Mailbox POST error:", error);
    const message = error instanceof Error ? error.message : String(error);
    console.error("Error details:", message);
    return NextResponse.json({ error: "Internal server error", details: message }, { status: 500 });
  }
}