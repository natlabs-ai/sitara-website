// src/data/countryGuidance.ts

// One place to keep country-specific document guidance
// used by the Business step (Country of Incorporation + Documents).

export type CountryGuidanceEntry = {
  label: string;

  // Core company docs
  businessLicenseExamples: string[];
  registrationDocsExamples?: string[];

  // Precious metals / gold-industry specific approvals
  preciousMetalsExamples?: string[];

  // Tax registration guidance
  taxRegistrationExamples?: string[];

  // Address evidence
  businessAddressExamples?: string[];

  // Optional free-form notes (shown as fine print or tooltips)
  notes?: string;
};

// Map of ISO country code -> guidance entry
export const countryGuidance: Record<string, CountryGuidanceEntry> = {
  // ---------------------------------------------------------------
  // GCC / MENA
  // ---------------------------------------------------------------
  AE: {
    label: "United Arab Emirates",
    businessLicenseExamples: [
      "Trade License (DED, Free Zone, or Offshore)",
      "Commercial Registration Certificate",
    ],
    registrationDocsExamples: [
      "Memorandum & Articles of Association (MOA/AOA)",
      "Shareholder certificates or register",
      "Company registry or Free Zone portal extract",
    ],
    preciousMetalsExamples: [
      "DMCC precious metals / gold trading licence",
      "Refinery licence or approval from relevant authority",
      "Customs / central bank registration for bullion import/export",
    ],
    taxRegistrationExamples: [
      "VAT Registration Certificate (TRN)",
    ],
    businessAddressExamples: [
      "Ejari / tenancy contract",
      "Utility bill showing company name and address",
      "Bank statement with registered address",
    ],
    notes:
      "TRN is required only if the business meets UAE VAT thresholds. If not registered, obtain a signed explanation.",
  },

  SA: {
    label: "Saudi Arabia",
    businessLicenseExamples: [
      "Commercial Registration (CR) Certificate",
    ],
    registrationDocsExamples: [
      "Articles of Association",
      "Company registry extract from Ministry of Commerce",
    ],
    preciousMetalsExamples: [
      "Gold and jewellery trading licence (if applicable)",
      "Ministry of Industry and Mineral Resources approvals",
    ],
    taxRegistrationExamples: [
      "ZATCA VAT Registration Certificate",
      "Tax ID certificate",
    ],
    businessAddressExamples: [
      "Lease contract",
      "Utility bill for business premises",
    ],
    notes:
      "For gold trading, ensure the CR explicitly covers jewellery/precious metals activities where possible.",
  },

  QA: {
    label: "Qatar",
    businessLicenseExamples: [
      "Commercial Registration (CR)",
      "Trade License",
    ],
    registrationDocsExamples: [
      "Articles of Association",
      "Commercial registry extract",
    ],
    preciousMetalsExamples: [
      "Gold and jewellery trading approval (if applicable)",
    ],
    taxRegistrationExamples: [
      "Tax card / Tax Registration Certificate",
    ],
    businessAddressExamples: [
      "Lease agreement",
      "Utility bill",
    ],
    notes:
      "Check that CR/Trade License covers bullion or jewellery trading where relevant.",
  },

  KW: {
    label: "Kuwait",
    businessLicenseExamples: [
      "Commercial Licence",
      "Commercial Registration extract",
    ],
    registrationDocsExamples: [
      "Articles of Association",
      "Company registry extract",
    ],
    preciousMetalsExamples: [
      "Gold and jewellery trading licence (if applicable)",
    ],
    taxRegistrationExamples: [
      "Tax registration / VAT certificate (if applicable)",
    ],
    businessAddressExamples: [
      "Lease agreement",
      "Utility or telephone bill",
    ],
  },

  OM: {
    label: "Oman",
    businessLicenseExamples: [
      "Commercial Registration Certificate",
      "Municipality / Trade Licence",
    ],
    registrationDocsExamples: [
      "Articles of Association",
      "Commercial registry extract",
    ],
    preciousMetalsExamples: [
      "Jewellery / precious metals trading licence (if applicable)",
    ],
    taxRegistrationExamples: [
      "VAT registration certificate (if applicable)",
    ],
    businessAddressExamples: [
      "Lease agreement",
      "Utility bill",
    ],
  },

  BH: {
    label: "Bahrain",
    businessLicenseExamples: [
      "Commercial Registration (CR) Certificate",
    ],
    registrationDocsExamples: [
      "Articles of Association",
      "Commercial registry profile / extract",
    ],
    preciousMetalsExamples: [
      "Gold and jewellery trading licence (if applicable)",
    ],
    taxRegistrationExamples: [
      "VAT registration certificate (if applicable)",
    ],
    businessAddressExamples: [
      "Lease contract",
      "Utility bill",
    ],
  },

  // ---------------------------------------------------------------
  // AFRICA (gold-producing jurisdictions, etc.)
  // ---------------------------------------------------------------
  GH: {
    label: "Ghana",
    businessLicenseExamples: [
      "Registrar General Certificate(s)",
      "Company Profile / Incorporation Certificate",
    ],
    registrationDocsExamples: [
      "Beneficial Ownership Register extract",
      "Company regulations or constitution",
    ],
    preciousMetalsExamples: [
      "Minerals Commission Dealer/Exporter Licence",
      "Small-scale or large-scale mining licence (if applicable)",
      "Export permits or assay/export documents",
    ],
    taxRegistrationExamples: [
      "GRA TIN certificate",
      "VAT registration certificate (if applicable)",
    ],
    businessAddressExamples: [
      "Lease agreement or tenancy",
      "Utility bill for registered office",
    ],
    notes:
      "For exporters and aggregators, Minerals Commission documentation is critical and should normally be required.",
  },

  ZA: {
    label: "South Africa",
    businessLicenseExamples: [
      "CIPC Certificate of Incorporation",
    ],
    registrationDocsExamples: [
      "CIPC company registration printout",
      "Memorandum of Incorporation (MOI)",
    ],
    preciousMetalsExamples: [
      "Refinery or beneficiation licence",
      "Jewellery or precious metals licence",
      "Export permits from SARS / customs",
    ],
    taxRegistrationExamples: [
      "SARS income tax reference confirmation",
      "VAT registration certificate (if applicable)",
    ],
    businessAddressExamples: [
      "Lease agreement",
      "Municipal bill",
      "Bank statement with company address",
    ],
  },

  KE: {
    label: "Kenya",
    businessLicenseExamples: [
      "Certificate of Incorporation",
      "Business Registration Service (BRS) extract",
    ],
    registrationDocsExamples: [
      "CR12 or equivalent shareholding document",
      "Company constitution",
    ],
    preciousMetalsExamples: [
      "Gold dealer licence or mining licence",
      "Export permits for minerals (if applicable)",
    ],
    taxRegistrationExamples: [
      "KRA PIN certificate",
      "VAT registration certificate (if applicable)",
    ],
    businessAddressExamples: [
      "Lease agreement",
      "Utility bill",
    ],
  },

  TZ: {
    label: "Tanzania",
    businessLicenseExamples: [
      "Business Registration and Licensing Agency (BRELA) certificate",
      "Business Licence",
    ],
    registrationDocsExamples: [
      "Memorandum & Articles of Association",
      "BRELA online registry extract",
    ],
    preciousMetalsExamples: [
      "Mining or dealer licences",
      "Export permits for minerals",
    ],
    taxRegistrationExamples: [
      "TIN certificate",
      "VAT registration (if applicable)",
    ],
    businessAddressExamples: [
      "Lease agreement",
      "Utility bill",
    ],
  },

  UG: {
    label: "Uganda",
    businessLicenseExamples: [
      "Certificate of Incorporation",
      "Trading Licence (if applicable)",
    ],
    registrationDocsExamples: [
      "Company form / constitution",
      "Registry extract from URSB",
    ],
    preciousMetalsExamples: [
      "Gold refinery or dealer licence",
      "Export permits (if applicable)",
    ],
    taxRegistrationExamples: [
      "URSB / URA TIN certificate",
      "VAT registration certificate (if applicable)",
    ],
    businessAddressExamples: [
      "Lease agreement",
      "Utility bill",
    ],
  },

  // ---------------------------------------------------------------
  // EUROPE / UK / SWITZERLAND
  // ---------------------------------------------------------------
  GB: {
    label: "United Kingdom",
    businessLicenseExamples: [
      "Certificate of Incorporation (Companies House)",
    ],
    registrationDocsExamples: [
      "Companies House current appointments / PSC register extract",
      "Memorandum & Articles of Association",
    ],
    preciousMetalsExamples: [
      "FCA registration/licence if regulated activity applies",
      "Assay Office registrations (for jewellery businesses)",
    ],
    taxRegistrationExamples: [
      "HMRC VAT registration certificate (if applicable)",
      "UTR / Corporation Tax reference",
    ],
    businessAddressExamples: [
      "Recent utility bill",
      "Business bank statement",
      "Business rates bill",
    ],
    notes:
      "Many small companies may not be VAT-registered; request an explanation if trading volumes appear high but no VAT registration is provided.",
  },

  CH: {
    label: "Switzerland",
    businessLicenseExamples: [
      "Commercial Register Extract (Handelsregisterauszug)",
    ],
    registrationDocsExamples: [
      "Articles of Association",
      "Share register (if available)",
    ],
    preciousMetalsExamples: [
      "Precious metals trading or refining licences, where applicable",
      "FINMA registration if carrying out regulated financial activities",
    ],
    taxRegistrationExamples: [
      "VAT registration confirmation (MWST) if applicable",
      "Tax identification correspondence",
    ],
    businessAddressExamples: [
      "Lease agreement",
      "Utility bill",
      "Bank statement",
    ],
  },

  DE: {
    label: "Germany",
    businessLicenseExamples: [
      "Commercial Register Extract (Handelsregisterauszug)",
      "Trade Licence (Gewerbeanmeldung) where relevant",
    ],
    registrationDocsExamples: [
      "Articles of Association (Gesellschaftsvertrag / Satzung)",
    ],
    preciousMetalsExamples: [
      "Any required special trade permits for precious metals/jewellery",
    ],
    taxRegistrationExamples: [
      "USt-IdNr / VAT registration confirmation",
      "Tax ID assignment letter",
    ],
    businessAddressExamples: [
      "Utility bill",
      "Lease agreement",
    ],
  },

  // ---------------------------------------------------------------
  // ASIA (Singapore, HK, India, etc.)
  // ---------------------------------------------------------------
  SG: {
    label: "Singapore",
    businessLicenseExamples: [
      "ACRA BizFile company profile",
    ],
    registrationDocsExamples: [
      "Constitution / Memorandum & Articles (if issued)",
    ],
    preciousMetalsExamples: [
      "Specific licences if refinery or vault operations are regulated",
    ],
    taxRegistrationExamples: [
      "GST registration confirmation (if applicable)",
      "UEN also doubles as business identifier",
    ],
    businessAddressExamples: [
      "ACRA-registered address (if not clear, provide lease or utility)",
    ],
  },

  HK: {
    label: "Hong Kong",
    businessLicenseExamples: [
      "Business Registration Certificate",
      "Certificate of Incorporation",
    ],
    registrationDocsExamples: [
      "NAR1 / annual return or equivalent",
      "Articles of Association",
    ],
    preciousMetalsExamples: [
      "Jewellery or precious metals trading licences (if applicable)",
    ],
    taxRegistrationExamples: [
      "Business Registration Certificate also serves as tax ID indicator",
    ],
    businessAddressExamples: [
      "Lease agreement",
      "Utility bill",
    ],
  },

  IN: {
    label: "India",
    businessLicenseExamples: [
      "Certificate of Incorporation (MCA)",
      "Partnership or proprietor registration where relevant",
    ],
    registrationDocsExamples: [
      "MOA/AOA",
      "MCA master data printout",
    ],
    preciousMetalsExamples: [
      "BIS registration / hallmarking licence (for jewellery)",
      "Import/export licences (DGFT) as applicable",
    ],
    taxRegistrationExamples: [
      "PAN card (Company PAN)",
      "GST registration certificate (if applicable)",
    ],
    businessAddressExamples: [
      "Lease agreement",
      "Utility bill",
      "Bank statement with address",
    ],
  },

  TR: {
    label: "Turkey",
    businessLicenseExamples: [
      "Trade Registry Gazette extract",
      "Certificate of Incorporation",
    ],
    registrationDocsExamples: [
      "Articles of Association",
      "Trade registry printout",
    ],
    preciousMetalsExamples: [
      "Borsa Istanbul precious metals market membership (if applicable)",
      "Jewellery trading licence",
    ],
    taxRegistrationExamples: [
      "Tax plate / tax registration certificate",
    ],
    businessAddressExamples: [
      "Lease agreement",
      "Utility bill",
    ],
  },

  // ---------------------------------------------------------------
  // AMERICAS & OTHERS
  // ---------------------------------------------------------------
  US: {
    label: "United States",
    businessLicenseExamples: [
      "Articles of Organization / Incorporation",
      "State business registration certificate",
    ],
    registrationDocsExamples: [
      "Operating agreement or bylaws (if available)",
      "Good Standing Certificate (where obtainable)",
    ],
    preciousMetalsExamples: [
      "Money Services Business (MSB) registration for certain activities",
      "State precious metals dealer licences (if applicable)",
    ],
    taxRegistrationExamples: [
      "IRS EIN confirmation letter",
      "State sales tax registration (if applicable)",
    ],
    businessAddressExamples: [
      "Lease agreement",
      "Utility bill",
      "Bank statement",
    ],
    notes:
      "Licensing is highly state-specific; review precious metals dealer rules where the business is physically located.",
  },

  CA: {
    label: "Canada",
    businessLicenseExamples: [
      "Federal or provincial incorporation documents",
      "Business registration certificate",
    ],
    registrationDocsExamples: [
      "Articles of Incorporation",
      "Corporate registry summary",
    ],
    preciousMetalsExamples: [
      "Money Services Business registration (FINTRAC) if applicable",
      "Provincial licences where required",
    ],
    taxRegistrationExamples: [
      "CRA Business Number (BN) confirmation",
      "GST/HST registration certificate (if applicable)",
    ],
    businessAddressExamples: [
      "Lease agreement",
      "Utility bill",
    ],
  },

  AU: {
    label: "Australia",
    businessLicenseExamples: [
      "ASIC certificate of registration",
      "ABN registration summary",
    ],
    registrationDocsExamples: [
      "Constitution / Articles (if applicable)",
    ],
    preciousMetalsExamples: [
      "AUSTRAC registration for certain bullion-related activities",
    ],
    taxRegistrationExamples: [
      "ABN / TFN registration confirmation",
      "GST registration (if applicable)",
    ],
    businessAddressExamples: [
      "Lease agreement",
      "Utility bill",
    ],
  },
};

// Convenience helper – safe lookup
export const getCountryGuidance = (
  country?: string | null,
): CountryGuidanceEntry | null => {
  if (!country) return null;

  const trimmed = country.trim();
  if (!trimmed) return null;

  // 1) Try direct ISO code match (AE, GB, US, etc.)
  const byCode = countryGuidance[trimmed.toUpperCase()];
  if (byCode) return byCode;

  // 2) Try matching by the label (full country name)
  const lower = trimmed.toLowerCase();
  for (const entry of Object.values(countryGuidance)) {
    if (entry.label.toLowerCase() === lower) {
      return entry;
    }
  }

  // No match found
  return null;
};

