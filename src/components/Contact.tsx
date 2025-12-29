import React from "react";

export default function Contact() {
  return (
    <section id="contact" className="bg-black text-neutral-200">
      <div className="mx-auto max-w-screen-xl px-4 sm:px-6 md:px-8 py-16">
        <h2 className="text-2xl sm:text-3xl font-semibold text-white">
          Start a Conversation
        </h2>
        {/* Stack on mobile, two columns on md+ */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Form */}
          <form className="space-y-4">
            <input
              placeholder="Full name"
              className="w-full rounded-lg bg-neutral-900 border border-neutral-800 px-4 py-3"
            />
            <input
              placeholder="Email"
              type="email"
              className="w-full rounded-lg bg-neutral-900 border border-neutral-800 px-4 py-3"
            />
            <input
              placeholder="Company (optional)"
              className="w-full rounded-lg bg-neutral-900 border border-neutral-800 px-4 py-3"
            />
            <textarea
              placeholder="Message"
              rows={5}
              className="w-full rounded-lg bg-neutral-900 border border-neutral-800 px-4 py-3"
            />
            <button
              type="submit"
              className="w-full md:w-auto inline-flex items-center justify-center rounded-xl border border-amber-500 px-6 py-3 font-medium text-white hover:bg-amber-500/10"
            >
              Submit Enquiry
            </button>
          </form>

          {/* Contact details */}
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
