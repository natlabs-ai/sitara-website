import { NextResponse } from "next/server";
import { Resend } from "resend";

export const runtime = "nodejs";

type Payload = {
  name?: string;
  email?: string;
  company?: string;
  message?: string;
};

export async function POST(req: Request) {
  // Dev-only hard gate
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.SITARA_CONTACT_TO;
  const from =
    process.env.SITARA_CONTACT_FROM || "Sitara Dev <onboarding@resend.dev>";

  if (!apiKey) {
    return NextResponse.json({ error: "RESEND_API_KEY not set" }, { status: 500 });
  }
  if (!to) {
    return NextResponse.json({ error: "SITARA_CONTACT_TO not set" }, { status: 500 });
  }

  let body: Payload;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const name = (body.name || "").trim();
  const email = (body.email || "").trim();
  const company = (body.company || "").trim();
  const message = (body.message || "").trim();

  if (!name || name.length < 2) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
  }
  if (!message || message.length < 10) {
    return NextResponse.json(
      { error: "Message must be at least 10 characters" },
      { status: 400 },
    );
  }

  const resend = new Resend(apiKey);

  const subject = `Sitara enquiry (dev): ${name}${company ? ` (${company})` : ""}`;

  const { data, error } = await resend.emails.send({
    from,
    to: to.split(",").map((s) => s.trim()).filter(Boolean),
    reply_to: email,
    subject,
    text: [
      `Name: ${name}`,
      `Email: ${email}`,
      company ? `Company: ${company}` : null,
      "",
      "Message:",
      message,
    ]
      .filter(Boolean)
      .join("\n"),
  });

if (error) {
  return NextResponse.json(
  { error: (error as any)?.message ? String((error as any).message) : "Email send failed" },
  { status: 502 },
);

}


  return NextResponse.json({ ok: true, id: data?.id });
}
