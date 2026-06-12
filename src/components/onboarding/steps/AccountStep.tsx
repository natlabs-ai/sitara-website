// src\app\onboarding\steps\AccountStep.tsx
/* eslint-disable @typescript-eslint/no-explicit-any */

"use client";

import React from "react";
import { useRouter } from "next/navigation";
import {
  DEV_MODE,
} from "../onboardingShared";
import { Section, Button, Alert, FormField } from "@/components/ui";
import { checkEmailAvailability, sendEmailOtp, verifyEmailOtp, sendPhoneOtp, verifyPhoneOtp } from "@/lib/koraClient";
import { countries as allCountries } from "@/data/countries";

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
  const router = useRouter();
  // Add mode state for login vs signup
  const [mode, setMode] = React.useState<'login' | 'signup'>(
    answers.authMode || 'signup'
  );

  const [emailOtpLoading, setEmailOtpLoading] = React.useState(false);
  const [emailOtpError, setEmailOtpError] = React.useState<string | null>(null);
  const [phoneOtpLoading, setPhoneOtpLoading] = React.useState(false);
  const [phoneOtpError, setPhoneOtpError] = React.useState<string | null>(null);
  const [emailOtpSent, setEmailOtpSent] = React.useState(false);
  const [phoneOtpSent, setPhoneOtpSent] = React.useState(false);

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
        const result = await checkEmailAvailability(process.env.NEXT_PUBLIC_KORA_TENANT_CODE!, email);

        if (!result.available && setGlobalError) {
          setGlobalError(
            "This email is already registered."
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
      allCountries
        .filter((c) => c?.name && c?.code && c?.dial)
        .map((c) => ({
          name: c.name,
          iso2: c.code.toUpperCase(),
          dial: c.dial,
        }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    []
  );

  const currentIso = answers.phoneCountry || "AE";
  const current = countries.find((c) => c.iso2 === currentIso) || countries[0];
  const dial = answers.phoneDial || current.dial;
  const national = answers.phoneNational || "";

  const baseInput =
    "w-full rounded-lg border border-neutral-800 bg-black/60 text-neutral-100 placeholder:text-neutral-500 px-3 py-2 " +
    "focus:outline-none focus:ring-1 focus:border-[#bfa76f] focus:ring-[#bfa76f] transition " +
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

  async function sendSmsOtp() {
    if (!answers.phone) return;
    setPhoneOtpLoading(true);
    setPhoneOtpError(null);
    try {
      const result = await sendPhoneOtp(answers.phone);
      if (result.dev_code) setValue("phoneOtp", result.dev_code);
      setPhoneOtpSent(true);
      setTimeout(() => setPhoneOtpSent(false), 5000);
    } catch (e: any) {
      setPhoneOtpError(e.message || "Failed to send code. Try again.");
    } finally {
      setPhoneOtpLoading(false);
    }
  }

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
        <Alert variant="error" className="mb-2">
          <p className="text-sm text-red-200 font-medium">{globalError}</p>
        </Alert>
      )}

      {/* Email */}
      <Section>
        <FormField
          label="Email"
          required
          showError={showValidationErrors && !answers.email}
          error="Email is required."
        >
        {mode === 'login' ? (
          <input
            type="email"
            className={baseInput}
            placeholder="name@example.com"
            value={answers.email || ""}
            onChange={(e) => setValue("email", e.target.value)}
            data-testid="account-email"
          />
        ) : (
          <>
          {/* Full-width email input */}
          <input
            type="email"
            className={baseInput}
            placeholder="name@example.com"
            value={answers.email || ""}
            onChange={(e) => {
              setValue("email", e.target.value);
              setValue("emailVerified", false);
            }}
            data-testid="account-email"
          />
          {/* OTP row below */}
          <div className="mt-3 flex gap-2 items-center">
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              className={`${baseInput} flex-1`}
              placeholder="Email OTP"
              value={answers.emailOtp || ""}
              onChange={(e) => setValue("emailOtp", e.target.value)}
              data-testid="email-otp-input"
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={async () => {
                if (!answers.email) return;
                setEmailOtpLoading(true);
                setEmailOtpError(null);
                try {
                  const result = await sendEmailOtp(answers.email);
                  if (result.dev_code) setValue("emailOtp", result.dev_code);
                  setEmailOtpSent(true);
                  setTimeout(() => setEmailOtpSent(false), 5000);
                } catch (e: any) {
                  setEmailOtpError(e.message || "Failed to send code. Try again.");
                } finally {
                  setEmailOtpLoading(false);
                }
              }}
              disabled={emailOtpLoading || !answers.email}
              data-testid="email-otp-send"
            >
              {emailOtpLoading ? "Sending…" : "Send"}
            </Button>
            <Button
              variant={answers.emailVerified ? "primary" : "secondary"}
              size="sm"
              onClick={async () => {
                if (!answers.email || !answers.emailOtp) return;
                setEmailOtpLoading(true);
                setEmailOtpError(null);
                try {
                  await verifyEmailOtp(answers.email, answers.emailOtp);
                  setValue("emailVerified", true);
                } catch (e: any) {
                  setEmailOtpError(e.message || "Invalid code.");
                  setValue("emailVerified", false);
                } finally {
                  setEmailOtpLoading(false);
                }
              }}
              disabled={emailOtpLoading || !answers.email || !answers.emailOtp}
              data-testid="email-verify"
            >
              {answers.emailVerified ? "Verified" : "Verify"}
            </Button>
          </div>
          </>
        )}
        </FormField>
      </Section>
      {emailOtpError && (
        <p className="text-xs text-red-400 -mt-3">{emailOtpError}</p>
      )}
      {emailOtpSent && !emailOtpError && (
        <p className="text-xs text-emerald-400 -mt-3">Code sent to {answers.email}</p>
      )}

      {/* Mobile - Only show in signup mode */}
      {mode === 'signup' && (
        <Section>
          <FormField
            label="Mobile"
            required
            showError={showValidationErrors && !answers.phone}
            error="Mobile number is required."
          >
          <div className="space-y-3">
            {/* Row 1: country selector + dial+number */}
            <div className="grid grid-cols-[1fr_2fr] gap-3">
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
                  data-testid="phone-national-input"
                />
              </div>
            </div>
            {/* Row 2: OTP + Send + Verify */}
            <div className="flex gap-2 items-center">
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                className={`${baseInput} flex-1`}
                placeholder="SMS OTP"
                value={answers.phoneOtp || ""}
                onChange={(e) => setValue("phoneOtp", e.target.value)}
                data-testid="phone-otp-input"
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={sendSmsOtp}
                disabled={phoneOtpLoading || !answers.phone}
                data-testid="phone-otp-send"
              >
                {phoneOtpLoading ? "Sending…" : "Send"}
              </Button>
              <Button
                variant={answers.phoneVerified ? "primary" : "secondary"}
                size="sm"
                onClick={async () => {
                  if (!answers.phone || !answers.phoneOtp) return;
                  setPhoneOtpLoading(true);
                  setPhoneOtpError(null);
                  try {
                    await verifyPhoneOtp(answers.phone, answers.phoneOtp);
                    setValue("phoneVerified", true);
                  } catch (e: any) {
                    setPhoneOtpError(e.message || "Invalid code.");
                    setValue("phoneVerified", false);
                  } finally {
                    setPhoneOtpLoading(false);
                  }
                }}
                disabled={phoneOtpLoading || !answers.phone || !answers.phoneOtp}
                data-testid="phone-verify"
              >
                {answers.phoneVerified ? "Verified" : "Verify"}
              </Button>
            </div>
          </div>
          </FormField>

          <p className="mt-2 text-xs text-neutral-400">
            Full number:{" "}
            <span className="text-neutral-200">
              {answers.phone || `+${dial}`}
            </span>
          </p>
        </Section>
      )}
      {phoneOtpError && (
        <p className="text-xs text-red-400 -mt-3">{phoneOtpError}</p>
      )}
      {phoneOtpSent && !phoneOtpError && (
        <p className="text-xs text-emerald-400">Code sent to +{dial} {national}</p>
      )}

      {/* Password */}
      <Section>
        <FormField
          label={mode === 'login' ? 'Password' : 'Set Password'}
          required
          showError={showValidationErrors && !answers.password}
          error="Password is required."
        >
          <input
            type="password"
            className={baseInput}
            placeholder={mode === 'login' ? 'Enter your password' : 'Minimum 8 characters'}
            value={answers.password || ""}
            onChange={(e) => {
              setValue("password", e.target.value);
              if (answers.confirmPassword) setValue("passwordMatch", true);
            }}
            data-testid="account-password"
          />
        </FormField>

        {mode === 'signup' && (
          <>
            <div className="mt-4">
              <FormField
                label="Confirm Password"
                required
                showError={showValidationErrors && !answers.confirmPassword}
                error="Please confirm your password."
              >
                <input
                  type="password"
                  className={baseInput}
                  placeholder="Re-enter password"
                  value={answers.confirmPassword || ""}
                  onChange={(e) => {
                    setValue("confirmPassword", e.target.value);
                    setValue("passwordMatch", e.target.value === answers.password);
                  }}
                  data-testid="account-confirm-password"
                />
              </FormField>
            </div>

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
            Tip: we&apos;ll add strength checks in production.
          </p>
        )}
      </Section>

      <p className="text-center text-xs text-neutral-500 pt-1">
        {mode === 'signup' ? (
          <>
            Already have an account?{" "}
            <button type="button" onClick={() => router.push('/login')} className="text-[#bfa76f] hover:underline font-medium">
              Log in
            </button>
          </>
        ) : (
          <>
            New here?{" "}
            <button type="button" onClick={() => setMode('signup')} className="text-[#bfa76f] hover:underline font-medium">
              Create an account
            </button>
          </>
        )}
      </p>
    </div>
  );
}
