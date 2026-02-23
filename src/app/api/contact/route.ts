// src/app/api/contact/route.ts
import { NextResponse } from "next/server";
import { Resend } from "resend";

export const runtime = "nodejs";

type Payload = {
  name?: string;
  email?: string;
  company?: string;
  message?: string;
};

function json(status: number, body: any) {
  return NextResponse.json(body, { status });
}

function sanitizeHeaderValue(v: string) {
  // Prevent header injection via CRLF
  return v.replace(/[\r\n]+/g, " ").trim();
}

function safeText(v: string) {
  // Keep content readable and bounded
  return v.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
}

export async function POST(req: Request) {
  const apiKey = process.env.RESEND_API_KEY;
  const internalTo = process.env.SITARA_CONTACT_TO;
  const from = process.env.SITARA_CONTACT_FROM; // MUST be set to @sitara.ae

  // Optional override for the confirmation email (defaults to the submitter's email)
  const confirmToOverride = process.env.SITARA_CONTACT_CONFIRM_TO;

  // Optional custom subject prefix / brand name
  const brandName = process.env.SITARA_BRAND_NAME || "Sitara";

  if (!apiKey) return json(500, { error: "RESEND_API_KEY not set" });
  if (!internalTo) return json(500, { error: "SITARA_CONTACT_TO not set" });
  if (!from) return json(500, { error: "SITARA_CONTACT_FROM not set" });

  let body: Payload;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "Invalid JSON" });
  }

  const name = safeText(body.name || "");
  const email = safeText(body.email || "");
  const company = safeText(body.company || "");
  const message = safeText(body.message || "");

  if (!name || name.length < 2) return json(400, { error: "Name is required" });
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return json(400, { error: "Valid email is required" });
  if (!message || message.length < 10)
    return json(400, { error: "Message must be at least 10 characters" });

  const resend = new Resend(apiKey);

  const internalRecipients = internalTo
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (internalRecipients.length === 0) {
    return json(500, { error: "SITARA_CONTACT_TO did not contain any valid recipients" });
  }

  const internalSubject = sanitizeHeaderValue(
    `${brandName} enquiry: ${name}${company ? ` (${company})` : ""}`,
  );

  const internalText = [
    `Name: ${name}`,
    `Email: ${email}`,
    company ? `Company: ${company}` : null,
    "",
    "Message:",
    message,
  ]
    .filter(Boolean)
    .join("\n");

  // 1) Internal notification email
  const internalSend = await resend.emails.send({
    from: sanitizeHeaderValue(from), // e.g. "Sitara <no-reply@sitara.ae>"
    to: internalRecipients,
    replyTo: sanitizeHeaderValue(email),
    subject: internalSubject,
    text: internalText,
  });

  if (internalSend.error) {
    return json(502, {
      error: (internalSend.error as any)?.message
        ? String((internalSend.error as any).message)
        : "Internal email send failed",
    });
  }

  // 2) Sender confirmation email (to the submitter)
  const confirmTo = sanitizeHeaderValue(confirmToOverride || email);

  const confirmationSubject = sanitizeHeaderValue(
    `We've received your message – ${brandName}`,
  );

  const confirmationText = [
    `Hi ${name},`,
    "",
    `Thank you for contacting ${brandName}. We've received your message and a member of our team will respond shortly.`,
    "",
    company ? `Company: ${company}` : null,
    "",
    "For reference, here is a copy of your message:",
    "—",
    message,
    "",
    `Kind regards,`,
    `${brandName} Team`,
  ]
    .filter(Boolean)
    .join("\n");

  const confirmationSend = await resend.emails.send({
    from: sanitizeHeaderValue(from),
    to: [confirmTo],
    subject: confirmationSubject,
    text: confirmationText,
  });

  if (confirmationSend.error) {
    return json(200, {
      ok: true,
      internal_id: internalSend.data?.id,
      confirmation_ok: false,
      confirmation_error: (confirmationSend.error as any)?.message
        ? String((confirmationSend.error as any).message)
        : "Confirmation email send failed",
    });
  }

  return json(200, {
    ok: true,
    internal_id: internalSend.data?.id,
    confirmation_id: confirmationSend.data?.id,
    confirmation_ok: true,
  });
}
