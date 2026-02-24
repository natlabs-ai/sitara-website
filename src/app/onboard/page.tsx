"use client";

import { useState } from "react";
import { FlowRenderer } from "@/components/onboarding/FlowRenderer";

type AccountType = "individual" | "business";

export default function OnboardPage() {
  const [accountType, setAccountType] = useState<AccountType | null>(null);
  const [submitted, setSubmitted]     = useState(false);

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md px-4">
          <div className="text-4xl mb-4">✓</div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">Application submitted</h1>
          <p className="text-gray-500">
            Thank you. Our team will review your application and be in touch shortly.
          </p>
        </div>
      </div>
    );
  }

  if (!accountType) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-sm px-4">
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">Open an account</h1>
          <p className="text-gray-500 mb-8">
            What type of account would you like to open?
          </p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => setAccountType("individual")}
              className="flex-1 py-3 px-6 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 text-sm font-medium transition-colors"
            >
              Personal
            </button>
            <button
              onClick={() => setAccountType("business")}
              className="flex-1 py-3 px-6 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 text-sm font-medium transition-colors"
            >
              Business
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <FlowRenderer
        accountType={accountType}
        onComplete={(_answers) => {
          // TODO: POST answers to Kora API to create application
          setSubmitted(true);
        }}
      />
    </div>
  );
}
