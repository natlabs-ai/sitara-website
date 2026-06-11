export type DocItem = { label: string; note?: string };
export type BusinessDocSet = { company: DocItem[]; signatory: DocItem[]; footer: string };

export const BUSINESS_DOCS_UAE: BusinessDocSet = {
  company: [
    { label: "Trade license" },
    { label: "Memorandum or Articles of Association" },
    { label: "Proof of registered address" },
    { label: "TRN certificate" },
    { label: "Precious metals permit", note: "if applicable" },
  ],
  signatory: [
    { label: "Passport" },
    { label: "Emirates ID", note: "if UAE resident" },
    { label: "Proof of address" },
  ],
  footer: "Depending on your ownership structure, you may also need identification for beneficial owners and additional authorised persons.",
};

export const BUSINESS_DOCS_NON_UAE: BusinessDocSet = {
  company: [
    { label: "Business registration document", note: "e.g. certificate of incorporation" },
    { label: "Memorandum or Articles of Association" },
    { label: "Proof of registered address" },
    { label: "Tax certificate" },
    { label: "Precious metals permit", note: "if applicable" },
  ],
  signatory: [
    { label: "Passport" },
    { label: "Proof of address" },
  ],
  footer: "Depending on your ownership structure, you may also need identification for beneficial owners and additional authorised persons.",
};

export function getBusinessDocs(country: string): BusinessDocSet {
  return country === "United Arab Emirates" ? BUSINESS_DOCS_UAE : BUSINESS_DOCS_NON_UAE;
}
