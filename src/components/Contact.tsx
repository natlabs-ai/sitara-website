"use client";

import React from "react";

type Status = "idle" | "sending" | "sent" | "error";

export default function Contact() {
  const [status, setStatus] = React.useState<Status>("idle");
  const [error, setError] = React.useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setStatus("sending");

    const form = e.currentTarget;
    const fd = new FormData(form);

    const payload = {
      name: String(fd.get("name") || ""),
      email: String(fd.get("email") || ""),
      company: String(fd.get("company") || ""),
      message: String(fd.get("message") || ""),
    };

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data?.ok) {
        const err =
          typeof data?.error === "string"
            ? data.error
            : data?.error?.message
              ? String(data.error.message)
              : data?.error
                ? JSON.stringify(data.error)
                : "Could not send. Please try again.";

        setStatus("error");
        setError(err);
        return;
      }

      setStatus("sent");
      form.reset();
    } catch {
      setStatus("error");
      setError("Network error. Please try again.");
    }
  }

  return (
    <section id="contact" className="bg-black text-neutral-200 sitara-contact">
      <div className="mx-auto max-w-screen-xl px-4 sm:px-6 md:px-8 py-16">
        <h2 className="text-2xl sm:text-3xl font-semibold text-white">
          Start a Conversation
        </h2>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <input
              name="name"
              placeholder="Full name"
              className="w-full rounded-lg bg-neutral-900 border border-neutral-800 px-4 py-3"
              required
            />
            <input
              name="email"
              placeholder="Email"
              type="email"
              className="w-full rounded-lg bg-neutral-900 border border-neutral-800 px-4 py-3"
              required
            />
            <input
              name="company"
              placeholder="Company (optional)"
              className="w-full rounded-lg bg-neutral-900 border border-neutral-800 px-4 py-3"
            />
            <textarea
              name="message"
              placeholder="Message"
              rows={5}
              className="w-full rounded-lg bg-neutral-900 border border-neutral-800 px-4 py-3"
              required
            />

            {status === "sent" && (
              <p className="text-sm text-emerald-300">
                Sent. We&apos;ll get back to you shortly.
              </p>
            )}
            {status === "error" && typeof error === "string" && (
              <p className="text-sm text-red-300">{error}</p>
            )}

            <button
              type="submit"
              disabled={status === "sending"}
              className="w-full md:w-auto inline-flex items-center justify-center rounded-xl border border-amber-500 px-6 py-3 font-medium text-white hover:bg-amber-500/10 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {status === "sending" ? "Sending..." : "Submit Enquiry"}
            </button>
          </form>

          <div className="md:pl-4 flex flex-col justify-between">
            <ul className="space-y-3 text-sm">
              <li>📍 Dubai, UAE</li>
              <li>
                ✉️{" "}
                <a
                  href="mailto:contact@sitara.ae"
                  className="underline underline-offset-2"
                >
                  contact@sitara.ae
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
