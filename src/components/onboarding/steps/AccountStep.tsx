// src\app\onboarding\steps\AccountStep.tsx

"use client";

import React from "react";
import {
  GOLD,
  GOLD_BG_SOFT,
  DEV_MODE,
} from "../onboardingShared";
import { Section, Button, Input, Alert } from "@/components/ui";
import { checkEmailAvailability } from "@/lib/koraClient";

export function AccountStep({
  answers,
  setValue,
  globalError,
  setGlobalError,
  showValidationErrors = false,
}: {
  answers: Record<string, any>;
  setValue: (id: string, val: any) => void;
  globalError?: string | null;
  setGlobalError?: (error: string | null) => void;
  showValidationErrors?: boolean;
}) {
  // Add mode state for login vs signup
  const [mode, setMode] = React.useState<'login' | 'signup'>(
    answers.authMode || 'signup'
  );

  // Update mode in answers when changed and clear errors
  React.useEffect(() => {
    setValue('authMode', mode);
    // Clear any errors when switching modes
    if (setGlobalError) {
      setGlobalError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // Check email availability with debouncing (only in signup mode)
  React.useEffect(() => {
    // Only check in signup mode
    if (mode !== 'signup') return;

    // Need a valid email to check
    const email = answers.email;
    if (!email || !email.includes('@')) return;

    // Clear any existing error when user starts typing
    if (setGlobalError) {
      setGlobalError(null);
    }

    // Debounce the check
    const timeoutId = setTimeout(async () => {
      try {
        const result = await checkEmailAvailability('sitara-core', email);

        if (!result.available && setGlobalError) {
          setGlobalError(
            "This email is already registered. Please use the 'Log In' option above."
          );
        }
      } catch (error) {
        console.log("Email check error:", error);
        // Don't show error for network issues during availability check
      }
    }, 500); // Wait 500ms after user stops typing

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answers.email, mode]);

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
    "focus:outline-none focus:ring-1 focus:border-[--gold-color] focus:ring-[--gold-color] transition " +
    "autofill-fix";

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
    if (DEV_MODE) setValue("phoneOtp", "000000");
    // TODO: call POST /api/auth/otp/phone to send a real OTP in production
  }

  const baseBtn =
    "px-3 py-2 rounded-lg border border-neutral-800 bg-neutral-900 text-neutral-100 hover:bg-neutral-800";

  return (
    <div className="space-y-5">
      <style>{`
        .autofill-fix:-webkit-autofill,
        .autofill-fix:-webkit-autofill:hover,
        .autofill-fix:-webkit-autofill:focus,
        .autofill-fix:-webkit-autofill:active {
          -webkit-background-clip: text;
          -webkit-text-fill-color: rgb(229, 229, 229);
          transition: background-color 5000s ease-in-out 0s;
          box-shadow: inset 0 0 20px 20px rgba(0, 0, 0, 0.4);
        }
      `}</style>

      {/* Error Message */}
      {globalError && (
        <Alert variant="error" className="mb-6">
          <div className="flex-1">
            <p className="text-sm text-red-200 font-medium">{globalError}</p>
            {globalError.includes('already registered') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMode('login')}
                className="mt-2 underline"
              >
                Switch to Log In
              </Button>
            )}
          </div>
        </Alert>
      )}

      {/* Login/Signup Toggle */}
      <div className="mb-6">
        <div className="flex gap-3">
          <Button
            variant={mode === 'signup' ? 'primary' : 'secondary'}
            onClick={() => setMode('signup')}
            fullWidth
            size="lg"
          >
            Create Account
          </Button>
          <Button
            variant={mode === 'login' ? 'primary' : 'secondary'}
            onClick={() => setMode('login')}
            fullWidth
            size="lg"
          >
            Log In
          </Button>
        </div>
        <p className="mt-3 text-sm text-neutral-400 text-center">
          {mode === 'signup'
            ? 'New to Sitara? Create your account to get started.'
            : 'Already have an account? Log in to continue.'}
        </p>
      </div>

      {/* Email */}
      <Section>
        <div className="mb-2 text-sm font-semibold text-neutral-100">
          Email{showValidationErrors && !answers.email && <span className="text-red-400"> *</span>}
        </div>
        {mode === 'login' ? (
          <input
            type="email"
            className={baseInput}
            placeholder="name@example.com"
            value={answers.email || ""}
            onChange={(e) => setValue("email", e.target.value)}
          />
        ) : (
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
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  if (!answers.email) return;
                  if (DEV_MODE) setValue("emailOtp", "000000");
                  // TODO: call POST /api/auth/otp/email to send a real OTP in production
                }}
              >
                Send
              </Button>
              <Button
                variant={answers.emailVerified ? "primary" : "secondary"}
                size="sm"
                onClick={() =>
                  setValue("emailVerified", !!answers.email && !!answers.emailOtp)
                }
              >
                {answers.emailVerified ? "Verified" : "Verify"}
              </Button>
            </div>
          </div>
        )}
      </Section>

      {/* Mobile - Only show in signup mode */}
      {mode === 'signup' && (
        <Section>
          <div className="mb-2 text-sm font-semibold text-neutral-100">
            Mobile{showValidationErrors && !answers.phone && <span className="text-red-400"> *</span>}
          </div>
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
              <Button variant="secondary" size="sm" onClick={sendSmsOtp}>
                Send
              </Button>
              <Button
                variant={answers.phoneVerified ? "primary" : "secondary"}
                size="sm"
                onClick={() =>
                  setValue(
                    "phoneVerified",
                    !!answers.phone && !!answers.phoneOtp
                  )
                }
              >
                {answers.phoneVerified ? "Verified" : "Verify"}
              </Button>
            </div>
          </div>

          <p className="mt-2 text-xs text-neutral-400">
            Full number:{" "}
            <span className="text-neutral-200">
              {answers.phone || `+${dial}`}
            </span>
          </p>
        </Section>
      )}

      {/* Password */}
      <Section>
        <div className="mb-2 text-sm font-semibold text-neutral-100">
          {mode === 'login' ? 'Password' : 'Set Password'}{showValidationErrors && !answers.password && <span className="text-red-400"> *</span>}
        </div>
        <input
          type="password"
          className={baseInput}
          placeholder={mode === 'login' ? 'Enter your password' : 'Minimum 8 characters'}
          value={answers.password || ""}
          onChange={(e) => {
            setValue("password", e.target.value);
            if (answers.confirmPassword) setValue("passwordMatch", true);
          }}
        />

        {mode === 'signup' && (
          <>
            <div className="mt-4 mb-2 text-sm font-semibold text-neutral-100">
              Confirm Password{showValidationErrors && !answers.confirmPassword && <span className="text-red-400"> *</span>}
            </div>
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
          </>
        )}

        {DEV_MODE && (
          <p className="mt-2 text-xs text-neutral-500">
            Tip: we'll add strength checks in production.
          </p>
        )}
      </Section>
    </div>
  );
}
