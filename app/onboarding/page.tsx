"use client";
import React from "react";
import OnboardingRenderer from "@/components/OnboardingRenderer";

/**
 * For now, we simulate the extraction map.
 * Later, replace with real OCR/metadata results after uploads.
 */
const mockExtracted = {
  "company.legal_name": { value: "Sitara Gold DMCC", confidence: 0.93, sourceDoc: "trade_license.pdf" },
  "company.license_number": { value: "DMCC-123456", confidence: 0.91, sourceDoc: "trade_license.pdf" },
  "tax.trn": { value: "100000000000000", confidence: 0.89, sourceDoc: "trn_certificate.pdf" },
  "company.registered_address": { value: "Office 123, Almas Tower, JLT, Dubai", confidence: 0.78, sourceDoc: "trade_license.pdf" }
};

export default function Page() {
  return <OnboardingRenderer extracted={mockExtracted} />;
}
