// src/lib/normalizeCompanyDoc.ts

export type KeyValuePair = {
  key?: string | null;
  value?: string | null;
  confidence?: number;
};

export type Shareholder = {
  name?: string;
  nationality?: string;
  ownershipPercent?: number;
};

export type AuthorityCode = "ADGM" | "AJMAN" | "DWC" | "OTHER";

export type CompanyDocNormalized = {
  authority?: string;
  authorityCode?: AuthorityCode;

  licenseNumber?: string;
  registrationNumber?: string;
  tradeName?: string;
  legalForm?: string;
  countryOfIncorporation?: string;

  firstIssueDate?: string;
  currentIssueDate?: string;
  expiryDate?: string;

  managerName?: string;
  managerNationality?: string;

  shareholders?: Shareholder[];

  _raw?: KeyValuePair[];
};

/* ---------- helpers ---------- */

const normalizeString = (input?: string | null): string | undefined => {
  if (!input) return undefined;
  const trimmed = input.trim();
  return trimmed.length ? trimmed : undefined;
};

const get = (pairs: KeyValuePair[], pattern: RegExp): string | undefined => {
  const match = pairs.find(
    (kv) => kv.key && pattern.test(kv.key.toString().toLowerCase())
  );
  return normalizeString(match?.value ?? undefined);
};

const getFromKeyOrValue = (
  pairs: KeyValuePair[],
  keyPattern: RegExp,
  valuePattern?: RegExp
): string | undefined => {
  const byKey = get(pairs, keyPattern);
  if (byKey) return byKey;

  if (!valuePattern) return undefined;

  const match = pairs.find(
    (kv) =>
      kv.value &&
      valuePattern.test(kv.value.toString().toLowerCase())
  );
  return normalizeString(match?.value ?? undefined);
};

const parseDateToISO = (value?: string): string | undefined => {
  if (!value) return undefined;
  const raw = value.trim();

  const ddMmYyyy = raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (ddMmYyyy) {
    const [, dd, mm, yyyy] = ddMmYyyy;
    return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
  }

  const yyyyMmDd = raw.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (yyyyMmDd) {
    const [, yyyy, mm, dd] = yyyyMmDd;
    return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
  }

  const d = new Date(raw);
  if (!Number.isNaN(d.getTime())) {
    return d.toISOString().slice(0, 10);
  }

  return raw;
};

/* ---------- 1. Authority detection (tuned) ---------- */

export function detectAuthority(kvPairs: KeyValuePair[]): AuthorityCode {
  const all = kvPairs
    .map((kv) => `${kv.key ?? ""} ${kv.value ?? ""}`.toLowerCase())
    .join(" ");

  // ADGM
  if (
    all.includes("abu dhabi global market") ||
    all.includes("adgm") ||
    all.includes("registration authority")
  ) {
    return "ADGM";
  }

  // Ajman Free Zone
  if (
    all.includes("ajman free zone") ||
    all.includes("ajman free zone authority")
  ) {
    return "AJMAN";
  }

  // Dubai South / DWC
  if (
    all.includes("dubai aviation city corporation") ||
    all.includes("dubai world central") ||
    all.includes("dubai south") ||
    all.includes("dwc-llc")
  ) {
    return "DWC";
  }

  return "OTHER";
}

/* ---------- 2. Generic normalizer (slightly smarter) ---------- */

export function genericNormalizeCompanyDoc(
  kvPairs: KeyValuePair[]
): CompanyDocNormalized {
  const lowerPairs = kvPairs.map((kv) => ({
    key: kv.key?.toString().toLowerCase() ?? undefined,
    value: kv.value ?? undefined,
    confidence: kv.confidence,
  }));

  // Registration / CR / Commercial Registration
  const registrationNumber =
    get(
      lowerPairs,
      /(reg(istration)?|cr|commercial\s+registration)\s*(no|number)?/i
    ) ??
    get(lowerPairs, /registration\s*no\./i); // Ajman-style label

  // Licence / Licence Number
  const licenseNumber =
    get(
      lowerPairs,
      /(licen[cs]e|licence)\s*(no|number)?/i
    ) ??
    get(lowerPairs, /commercial\s+licen[cs]e\s*(no|number)?/i);

  const tradeName = get(
    lowerPairs,
    /(trade\s*name|company\s*name|commercial\s*name|entity\s*name)/i
  );

  const legalForm = get(
    lowerPairs,
    /(legal\s*form|legal\s*status|entity\s*type|company\s*type)/i
  );

  const countryOfIncorporation =
    get(
      lowerPairs,
      /(country\s*of\s*incorporation|incorporated\s*in)/i
    ) ??
    get(lowerPairs, /(country|nationality)/i);

  const firstIssueDateRaw = get(lowerPairs, /first\s*issue/i);
  const currentIssueDateRaw = get(
    lowerPairs,
    /(current|latest)\s*issue/i
  );
  const expiryDateRaw = get(
    lowerPairs,
    /(expir(y|ation)|valid\s*until|expiry\s*date|licen[cs]e\s*end)/i
  );

  const managerName = get(
    lowerPairs,
    /(manager|general\s*manager|authorised\s*signatory|director\s*in\s*charge|manager\s*name)/i
  );

  return {
    licenseNumber,
    registrationNumber,
    tradeName,
    legalForm,
    countryOfIncorporation,
    firstIssueDate: parseDateToISO(firstIssueDateRaw),
    currentIssueDate: parseDateToISO(currentIssueDateRaw),
    expiryDate: parseDateToISO(expiryDateRaw),
    managerName,
    shareholders: [],
    _raw: kvPairs,
  };
}

/* ---------- 3. Authority-specific tweaks ---------- */

// ADGM: often uses "Commercial Licence No." for license, and may label "Registered Number"
function applyAdgmTweaks(
  base: CompanyDocNormalized,
  kvPairs: KeyValuePair[]
): CompanyDocNormalized {
  const lowerPairs = kvPairs.map((kv) => ({
    key: kv.key?.toString().toLowerCase() ?? undefined,
    value: kv.value ?? undefined,
    confidence: kv.confidence,
  }));

  const commercialLicence = get(
    lowerPairs,
    /(commercial\s+licen[cs]e\s*(no|number)?)/i
  );

  const registeredNumber =
    base.registrationNumber ??
    get(lowerPairs, /registered\s*number/i);

  return {
    ...base,
    authority: "ADGM",
    licenseNumber: base.licenseNumber ?? commercialLicence,
    registrationNumber: registeredNumber,
  };
}

// Ajman: sometimes only "Registration No." is captured; licence might be in Arabic / near it
function applyAjmanTweaks(
  base: CompanyDocNormalized,
  kvPairs: KeyValuePair[]
): CompanyDocNormalized {
  const lowerPairs = kvPairs.map((kv) => ({
    key: kv.key?.toString().toLowerCase() ?? undefined,
    value: kv.value ?? undefined,
    confidence: kv.confidence,
  }));

  const registrationFromRegNo =
    base.registrationNumber ??
    get(lowerPairs, /registration\s*no\./i);

  // Try to grab licence from any field whose key contains "license" / "licence"
  const licenceFromKeyOrValue =
    base.licenseNumber ??
    getFromKeyOrValue(
      lowerPairs,
      /licen[cs]e/i,
      /\b\d{4,}\b/i
    );

  return {
    ...base,
    authority: "Ajman Free Zone",
    registrationNumber: registrationFromRegNo,
    licenseNumber: licenceFromKeyOrValue,
  };
}

// DWC / Dubai South: often has both "License No." and "Registration No."
function applyDwcTweaks(
  base: CompanyDocNormalized,
  kvPairs: KeyValuePair[]
): CompanyDocNormalized {
  const lowerPairs = kvPairs.map((kv) => ({
    key: kv.key?.toString().toLowerCase() ?? undefined,
    value: kv.value ?? undefined,
    confidence: kv.confidence,
  }));

  const licenseNumber =
    base.licenseNumber ??
    get(lowerPairs, /license\s*no\./i);

  const registrationNumber =
    base.registrationNumber ??
    get(lowerPairs, /registration\s*no\./i);

  return {
    ...base,
    authority: "Dubai South / DWC",
    licenseNumber,
    registrationNumber,
  };
}

/* ---------- 4. Single entrypoint ---------- */

export function normalizeCompanyDoc(
  kvPairs: KeyValuePair[]
): CompanyDocNormalized {
  const authorityCode = detectAuthority(kvPairs);
  const base = genericNormalizeCompanyDoc(kvPairs);

  if (authorityCode === "ADGM") {
    return { ...applyAdgmTweaks(base, kvPairs), authorityCode };
  }
  if (authorityCode === "AJMAN") {
    return { ...applyAjmanTweaks(base, kvPairs), authorityCode };
  }
  if (authorityCode === "DWC") {
    return { ...applyDwcTweaks(base, kvPairs), authorityCode };
  }

  return {
    ...base,
    authority: "Other",
    authorityCode,
  };
}
