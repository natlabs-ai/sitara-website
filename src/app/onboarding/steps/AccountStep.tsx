// src\app\onboarding\steps\AccountStep.tsx

"use client";

import React from "react";
import {
  GOLD,
  GOLD_BG_SOFT,
  Label,
  DEV_MODE,
} from "../onboardingShared";

export function AccountStep({
  answers,
  setValue,
}: {
  answers: Record<string, any>;
  setValue: (id: string, val: any) => void;
}) {
  const countries = React.useMemo(
    () =>
      [
        { name: "Australia", iso2: "AU", dial: "61" },
        { name: "Bahrain", iso2: "BH", dial: "973" },
        { name: "Canada", iso2: "CA", dial: "1" },
        { name: "France", iso2: "FR", dial: "33" },
        { name: "Germany", iso2: "DE", dial: "49" },
        { name: "Hong Kong", iso2: "HK", dial: "852" },
        { name: "India", iso2: "IN", dial: "91" },
        { name: "Kuwait", iso2: "KW", dial: "965" },
        { name: "Nigeria", iso2: "NG", dial: "234" },
        { name: "Oman", iso2: "OM", dial: "968" },
        { name: "Pakistan", iso2: "PK", dial: "92" },
        { name: "Qatar", iso2: "QA", dial: "974" },
        { name: "Saudi Arabia", iso2: "SA", dial: "966" },
        { name: "Singapore", iso2: "SG", dial: "65" },
        { name: "South Africa", iso2: "ZA", dial: "27" },
        { name: "Switzerland", iso2: "CH", dial: "41" },
        { name: "Turkey", iso2: "TR", dial: "90" },
        { name: "United Arab Emirates", iso2: "AE", dial: "971" },
        { name: "United Kingdom", iso2: "GB", dial: "44" },
        { name: "United States", iso2: "US", dial: "1" },
      ].sort((a, b) => a.name.localeCompare(b.name)),
    []
  );

  const currentIso = answers.phoneCountry || "AE";
  const current = countries.find((c) => c.iso2 === currentIso) || countries[0];
  const dial = answers.phoneDial || current.dial;
  const national = answers.phoneNational || "";

  const baseInput =
    "w-full rounded-lg border border-neutral-800 bg-black/40 text-neutral-100 placeholder:text-neutral-500 px-3 py-2 " +
    "focus:outline-none focus:ring-1 focus:border-[--gold-color] focus:ring-[--gold-color] transition";

  function updateE164(nextDial: string, nextNational: string) {
    const nsn = nextNational.replace(/\D+/g, "").replace(/^0+/, "");
    const e164 = nsn ? `+${nextDial}${nsn}` : `+${nextDial}`;
    setValue("phoneDial", nextDial);
    setValue("phoneNational", nsn);
    setValue("phone", e164);
  }

  function onCountryChange(iso2: string) {
    const c = countries.find((x) => x.iso2 === iso2) || current;
    setValue("phoneCountry", c.iso2);
    updateE164(c.dial, national);
  }

  function onNationalChange(v: string) {
    updateE164(dial, v);
  }

  function sendSmsOtp() {
    if (!answers.phone) return;
    setValue("phoneOtp", "000000");
  }

  const baseBtn =
    "px-3 py-2 rounded-lg border border-neutral-800 bg-neutral-900 text-neutral-100 hover:bg-neutral-800";

  return (
    <div className="space-y-5">
      {/* Email */}
      <div className="rounded-xl border border-neutral-800 bg-black/30 p-4">
        <Label required>Email</Label>
        <div className="grid md:grid-cols-3 gap-3 items-center">
          <input
            type="email"
            className={`${baseInput} md:col-span-2`}
            placeholder="name@example.com"
            value={answers.email || ""}
            onChange={(e) => {
              setValue("email", e.target.value);
              setValue("emailVerified", false);
            }}
          />
          <div className="flex items-center gap-2">
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              className={baseInput}
              placeholder="Email OTP"
              value={answers.emailOtp || ""}
              onChange={(e) => setValue("emailOtp", e.target.value)}
            />
            <button
              type="button"
              onClick={() => {
                if (!answers.email) return;
                setValue("emailOtp", "000000");
              }}
              className={baseBtn}
            >
              Send
            </button>
            <button
              type="button"
              onClick={() =>
                setValue("emailVerified", !!answers.email && !!answers.emailOtp)
              }
              className="px-3 py-2 rounded-lg border border-[--gold-color] text-[--gold-color] hover:bg-[--gold-bg-soft]"
            >
              {answers.emailVerified ? "Verified" : "Verify"}
            </button>
          </div>
        </div>
        <style>{`:root{--gold-color:${GOLD};--gold-bg-soft:${GOLD_BG_SOFT}}`}</style>
      </div>

      {/* Mobile */}
      <div className="rounded-xl border border-neutral-800 bg-black/30 p-4">
        <Label required>Mobile</Label>
        <div className="grid md:grid-cols-3 gap-3">
          <select
            className={baseInput}
            value={currentIso}
            onChange={(e) => onCountryChange(e.target.value)}
            aria-label="Country"
            title="Country"
          >
            {countries.map((c) => (
              <option key={c.iso2} value={c.iso2}>
                {c.name} (+{c.dial})
              </option>
            ))}
          </select>

          <div className="flex">
            <span className="inline-flex items-center px-3 rounded-l-lg border border-neutral-800 bg-neutral-900 text-neutral-200">
              +{dial}
            </span>
            <input
              type="tel"
              className={`${baseInput} rounded-l-none`}
              placeholder="501234567"
              value={national}
              onChange={(e) => onNationalChange(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              className={baseInput}
              placeholder="SMS OTP"
              value={answers.phoneOtp || ""}
              onChange={(e) => setValue("phoneOtp", e.target.value)}
            />
            <button type="button" onClick={sendSmsOtp} className={baseBtn}>
              Send
            </button>
            <button
              type="button"
              onClick={() =>
                setValue(
                  "phoneVerified",
                  !!answers.phone && !!answers.phoneOtp
                )
              }
              className="px-3 py-2 rounded-lg border border-[--gold-color] text-[--gold-color] hover:bg-[--gold-bg-soft]"
            >
              {answers.phoneVerified ? "Verified" : "Verify"}
            </button>
          </div>
        </div>

        <p className="mt-2 text-xs text-neutral-400">
          Full number:{" "}
          <span className="text-neutral-200">
            {answers.phone || `+${dial}`}
          </span>
        </p>
        <style>{`:root{--gold-color:${GOLD};--gold-bg-soft:${GOLD_BG_SOFT}}`}</style>
      </div>

      {/* Password */}
      <div className="rounded-xl border border-neutral-800 bg-black/30 p-4">
        <Label required>Set Password</Label>
        <input
          type="password"
          className={baseInput}
          placeholder="Minimum 8 characters"
          value={answers.password || ""}
          onChange={(e) => {
            setValue("password", e.target.value);
            if (answers.confirmPassword) setValue("passwordMatch", true);
          }}
        />

        <Label required>Confirm Password</Label>
        <input
          type="password"
          className={baseInput}
          placeholder="Re-enter password"
          value={answers.confirmPassword || ""}
          onChange={(e) => {
            setValue("confirmPassword", e.target.value);
            setValue("passwordMatch", e.target.value === answers.password);
          }}
        />

        {answers.confirmPassword &&
          answers.password &&
          !answers.passwordMatch && (
            <p className="mt-2 text-xs text-red-400">
              Passwords do not match.
            </p>
          )}

        {DEV_MODE && (
          <p className="mt-2 text-xs text-neutral-500">
            Tip: we’ll add strength checks in production.
          </p>
        )}
        <style>{`:root{--gold-color:${GOLD}}`}</style>
      </div>
    </div>
  );
}
