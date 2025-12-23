// src/lib/normalizeCompanyDoc.ts
//
// Company document normaliser (v2)
// Goals:
// - Works for UAE and non-UAE companies (registry/regime-aware)
// - More robust KV selection (confidence + format heuristics)
// - Safer field inference (avoid "nationality" contaminating country of incorporation)
// - Backward compatible with v1 outputs (authority/authorityCode still populated)

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

export type AuthorityCode =
  | "ADGM"
  | "AJMAN"
  | "DWC"
  | "DMCC"
  | "DIFC"
  | "DED"
  | "JAFZA"
  | "RAKEZ"
  | "UK_CH"
  | "US_STATE"
  | "OTHER";

export type RegistrationRegime =
  | "UAE_ADGM"
  | "UAE_AJMAN"
  | "UAE_DWC"
  | "UAE_DMCC"
  | "UAE_DIFC"
  | "UAE_DED"
  | "UAE_JAFZA"
  | "UAE_RAKEZ"
  | "UK_COMPANIES_HOUSE"
  | "US_STATE_REGISTRY"
  | "OTHER";

export type CompanyDocNormalized = {
  // Display / descriptive
  authority?: string;
  // Backward compatible classification bucket (expanded)
  authorityCode?: AuthorityCode;
  // New: logic-driving classification bucket
  registrationRegime?: RegistrationRegime;

  // IDs / names
  licenseNumber?: string;
  registrationNumber?: string;

  // Prefer explicitly captured legal entity name; keep tradeName for UI/legacy
  legalEntityName?: string;
  tradeName?: string;

  legalForm?: string;

  // Jurisdiction
  countryOfIncorporation?: string;

  // Dates
  firstIssueDate?: string;
  currentIssueDate?: string;
  expiryDate?: string;

  // People (only if explicitly present)
  managerName?: string;
  managerNationality?: string;

  // Ownership (optional; do not imply "none" when unextracted)
  shareholders?: Shareholder[];
  shareholdersExtracted?: boolean;

  // Debug
  authorityEvidence?: string[];
  _raw?: KeyValuePair[];
  _normalizedPairs?: Array<{
    key?: string;
    value?: string;
    confidence?: number;
  }>;
};

/* ---------- helpers ---------- */

const normalizeString = (input?: string | null): string | undefined => {
  if (!input) return undefined;
  const trimmed = input.trim();
  return trimmed.length ? trimmed : undefined;
};

const normalizeKey = (s?: string | null) =>
  normalizeString(s)?.toLowerCase();

const normalizeValue = (s?: string | null) => normalizeString(s);

const compact = (s: string) => s.replace(/\s+/g, " ").trim();

const safeConfidence = (c?: number) =>
  typeof c === "number" && Number.isFinite(c) ? c : 0;

/**
 * Extract a "token" from a candidate value, based on common registry/ID patterns.
 * Intended for license/registration numbers.
 */
const extractIdToken = (value?: string): string | undefined => {
  const v = normalizeValue(value);
  if (!v) return undefined;

  // Common patterns:
  // - Alnum with separators: "CN-12345", "12345/2023", "DMCC-123456", "No. 123456"
  // - Long digit strings: "1234567"
  // - Mix with letters: "A123456"
  // Prefer tokens 4+ chars to avoid noise.
  const candidates: string[] = [];

  // Capture after "No", "No.", "Number", ":" etc.
  const afterLabel = v.match(
    /\b(?:no\.?|number|ref\.?|reference|reg\.?|registration|licen[cs]e)\b\s*[:\-]?\s*([A-Z0-9][A-Z0-9\-\/]{3,})/i
  );
  if (afterLabel?.[1]) candidates.push(afterLabel[1]);

  // Generic token
  const generic = v.match(/\b([A-Z0-9][A-Z0-9\-\/]{3,})\b/i);
  if (generic?.[1]) candidates.push(generic[1]);

  // Long digits
  const digits = v.match(/\b(\d{4,})\b/);
  if (digits?.[1]) candidates.push(digits[1]);

  const best = candidates
    .map((t) => t.replace(/[.,;)]$/g, "").trim())
    .filter((t) => t.length >= 4)
    // avoid capturing obvious dates as ID tokens
    .filter((t) => !/^\d{4}[-\/]\d{1,2}[-\/]\d{1,2}$/.test(t))
    .filter((t) => !/^\d{1,2}[-\/]\d{1,2}[-\/]\d{4}$/.test(t))[0];

  return normalizeString(best);
};

const parseDateToISO = (value?: string): string | undefined => {
  const v = normalizeValue(value);
  if (!v) return undefined;

  const raw = v.trim();

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

  // Try JS Date parse (handles "01 Jan 2025", etc.)
  const d = new Date(raw);
  if (!Number.isNaN(d.getTime())) {
    return d.toISOString().slice(0, 10);
  }

  // If we can't parse, do NOT return raw into a normalized date field
  return undefined;
};

/**
 * Choose the best KV match for a given key pattern, using confidence + value sanity.
 */
const pickBestByKey = (
  pairs: Array<{ key?: string; value?: string; confidence?: number }>,
  keyPattern: RegExp,
  opts?: {
    // If true, attempt to extract an ID token from the value
    extractId?: boolean;
    // If provided, prefer values matching pattern (after optional token extraction)
    preferValuePattern?: RegExp;
    // Minimum length for returned value
    minLen?: number;
  }
): string | undefined => {
  const candidates = pairs
    .filter((kv) => kv.key && keyPattern.test(kv.key))
    .map((kv) => {
      const rawVal = normalizeValue(kv.value);
      const val = opts?.extractId ? extractIdToken(rawVal) : rawVal;

      const len = val?.length ?? 0;
      const conf = safeConfidence(kv.confidence);

      const matchesPrefer = opts?.preferValuePattern
        ? !!(val && opts.preferValuePattern.test(val))
        : false;

      // Heuristics: favor values that look like IDs when requested
      const idLike =
        opts?.extractId && val
          ? /^[A-Z0-9][A-Z0-9\-\/]{3,}$/i.test(val) || /^\d{4,}$/.test(val)
          : false;

      const minLen = opts?.minLen ?? 1;
      const lengthOk = len >= minLen;

      // Composite score
      const score =
        conf * 10 +
        (matchesPrefer ? 5 : 0) +
        (idLike ? 3 : 0) +
        (lengthOk ? 1 : -5) +
        Math.min(len, 40) / 40; // small tie-break

      return { score, val };
    })
    .filter((x) => !!x.val)
    .sort((a, b) => b.score - a.score);

  return candidates[0]?.val;
};

/**
 * Fallback: search for an ID token in values when key labels are unreliable.
 * (Use sparingly; risk of false positives.)
 */
const pickBestIdFromValues = (
  pairs: Array<{ key?: string; value?: string; confidence?: number }>,
  valueHintPattern: RegExp
): string | undefined => {
  const candidates = pairs
    .filter((kv) => kv.value && valueHintPattern.test(kv.value.toLowerCase()))
    .map((kv) => {
      const token = extractIdToken(kv.value);
      const conf = safeConfidence(kv.confidence);
      const score = conf * 10 + (token ? 2 : -10);
      return { score, token };
    })
    .filter((x) => !!x.token)
    .sort((a, b) => b.score - a.score);

  return candidates[0]?.token;
};

/* ---------- detection (jurisdiction + registry/regime) ---------- */

type DetectionResult = {
  authorityCode: AuthorityCode;
  registrationRegime: RegistrationRegime;
  authorityLabel: string;
  evidence: string[];
};

export function detectCompanyRegistry(kvPairs: KeyValuePair[]): DetectionResult {
  const blobs = kvPairs
    .map((kv) => `${kv.key ?? ""} ${kv.value ?? ""}`.toLowerCase())
    .join(" ");

  const evidence: string[] = [];

  const has = (...needles: string[]) => needles.some((n) => blobs.includes(n));

  // --- UK (Companies House) ---
  if (has("companies house", "company number", "incorporated on", "wales")) {
    evidence.push("companies house / company number / incorporated on");
    return {
      authorityCode: "UK_CH",
      registrationRegime: "UK_COMPANIES_HOUSE",
      authorityLabel: "UK Companies House",
      evidence,
    };
  }

  // --- US (State registries) ---
  if (
    has("secretary of state", "state of", "delaware", "llc", "incorporation")
  ) {
    evidence.push("secretary of state / state registry indicators");
    return {
      authorityCode: "US_STATE",
      registrationRegime: "US_STATE_REGISTRY",
      authorityLabel: "US State Registry",
      evidence,
    };
  }

  // --- UAE: ADGM ---
  if (
    has(
      "abu dhabi global market",
      "adgm",
      "registration authority",
      "adgm registration authority"
    )
  ) {
    evidence.push("adgm / abu dhabi global market / registration authority");
    return {
      authorityCode: "ADGM",
      registrationRegime: "UAE_ADGM",
      authorityLabel: "ADGM",
      evidence,
    };
  }

  // --- UAE: DMCC ---
  if (has("dmcc", "dubai multi commodities centre", "dmcc authority")) {
    evidence.push("dmcc / dubai multi commodities centre");
    return {
      authorityCode: "DMCC",
      registrationRegime: "UAE_DMCC",
      authorityLabel: "DMCC",
      evidence,
    };
  }

  // --- UAE: DIFC ---
  if (has("difc", "dubai international financial centre")) {
    evidence.push("difc / dubai international financial centre");
    return {
      authorityCode: "DIFC",
      registrationRegime: "UAE_DIFC",
      authorityLabel: "DIFC",
      evidence,
    };
  }

  // --- UAE: DED/DET (Mainland Dubai) ---
  if (
    has(
      "department of economy and tourism",
      "dubai economy and tourism",
      "ded",
      "det"
    )
  ) {
    evidence.push("ded/det / department of economy and tourism");
    return {
      authorityCode: "DED",
      registrationRegime: "UAE_DED",
      authorityLabel: "Dubai Economy & Tourism (DED/DET)",
      evidence,
    };
  }

  // --- UAE: Ajman Free Zone ---
  if (has("ajman free zone", "ajman free zone authority")) {
    evidence.push("ajman free zone / afza");
    return {
      authorityCode: "AJMAN",
      registrationRegime: "UAE_AJMAN",
      authorityLabel: "Ajman Free Zone",
      evidence,
    };
  }

  // --- UAE: Dubai South / DWC ---
  if (
    has(
      "dubai aviation city corporation",
      "dubai world central",
      "dubai south",
      "dwc-llc"
    )
  ) {
    evidence.push("dubai south / dwc / dubai world central");
    return {
      authorityCode: "DWC",
      registrationRegime: "UAE_DWC",
      authorityLabel: "Dubai South / DWC",
      evidence,
    };
  }

  // --- UAE: JAFZA ---
  if (has("jafza", "jebel ali free zone")) {
    evidence.push("jafza / jebel ali free zone");
    return {
      authorityCode: "JAFZA",
      registrationRegime: "UAE_JAFZA",
      authorityLabel: "JAFZA",
      evidence,
    };
  }

  // --- UAE: RAKEZ ---
  if (has("rakez", "ras al khaimah economic zone")) {
    evidence.push("rakez / ras al khaimah economic zone");
    return {
      authorityCode: "RAKEZ",
      registrationRegime: "UAE_RAKEZ",
      authorityLabel: "RAKEZ",
      evidence,
    };
  }

  evidence.push("no strong registry indicators");
  return {
    authorityCode: "OTHER",
    registrationRegime: "OTHER",
    authorityLabel: "Other",
    evidence,
  };
}

/* ---------- generic normalizer ---------- */

export function genericNormalizeCompanyDoc(
  kvPairs: KeyValuePair[]
): CompanyDocNormalized {
  const normalizedPairs = kvPairs.map((kv) => ({
    key: normalizeKey(kv.key),
    value: normalizeValue(kv.value),
    confidence: kv.confidence,
  }));

  // Registration / CR / Commercial Registration / Company Number
  const registrationNumber =
    pickBestByKey(
      normalizedPairs,
      /(reg(istration)?|cr|commercial\s+registration|company\s+number)\s*(no|number)?/i,
      { extractId: true, minLen: 4 }
    ) ??
    pickBestByKey(normalizedPairs, /registered\s*number/i, {
      extractId: true,
      minLen: 4,
    });

  // Licence / Licence Number (optional globally)
  const licenseNumber =
    pickBestByKey(normalizedPairs, /(licen[cs]e|licence)\s*(no|number)?/i, {
      extractId: true,
      minLen: 4,
    }) ??
    pickBestByKey(
      normalizedPairs,
      /commercial\s+licen[cs]e\s*(no|number)?/i,
      { extractId: true, minLen: 4 }
    );

  // Entity Name(s)
  const legalEntityName =
    pickBestByKey(
      normalizedPairs,
      /(legal\s*name|registered\s*name|company\s*legal\s*name|name\s*of\s*company|entity\s*name)/i,
      { minLen: 2 }
    ) ??
    pickBestByKey(normalizedPairs, /(company\s*name|business\s*name)/i, {
      minLen: 2,
    });

  const tradeName = pickBestByKey(
    normalizedPairs,
    /(trade\s*name|commercial\s*name)/i,
    { minLen: 2 }
  );

  const legalForm = pickBestByKey(
    normalizedPairs,
    /(legal\s*form|legal\s*status|entity\s*type|company\s*type)/i,
    { minLen: 2 }
  );

  // Country of incorporation: strict only (do NOT fallback to "nationality")
  const countryOfIncorporation = pickBestByKey(
    normalizedPairs,
    /(country\s*of\s*incorporation|incorporated\s*in|jurisdiction\s*of\s*incorporation|place\s*of\s*incorporation)/i,
    { minLen: 2 }
  );

  // Dates
  const firstIssueDateRaw = pickBestByKey(normalizedPairs, /first\s*issue/i);
  const currentIssueDateRaw = pickBestByKey(
    normalizedPairs,
    /(current|latest)\s*issue/i
  );
  const expiryDateRaw = pickBestByKey(
    normalizedPairs,
    /(expir(y|ation)|valid\s*until|expiry\s*date|licen[cs]e\s*end)/i
  );

  // Manager / signatory (name)
  const managerName = pickBestByKey(
    normalizedPairs,
    /(manager|general\s*manager|director\s*in\s*charge|manager\s*name)/i,
    { minLen: 2 }
  );

  const managerNationality = pickBestByKey(
    normalizedPairs,
    /(manager\s*nationality|nationality\s*of\s*manager)/i,
    { minLen: 2 }
  );

  return {
    licenseNumber,
    registrationNumber,
    legalEntityName,
    tradeName,
    legalForm,
    countryOfIncorporation,
    firstIssueDate: parseDateToISO(firstIssueDateRaw),
    currentIssueDate: parseDateToISO(currentIssueDateRaw),
    expiryDate: parseDateToISO(expiryDateRaw),
    managerName,
    managerNationality,
    shareholders: undefined,
    shareholdersExtracted: false,
    _raw: kvPairs,
    _normalizedPairs: normalizedPairs,
  };
}

/* ---------- registry-specific tweaks ---------- */

function applyAdgmTweaks(
  base: CompanyDocNormalized,
  pairs: Array<{ key?: string; value?: string; confidence?: number }>
): CompanyDocNormalized {
  const commercialLicence = pickBestByKey(
    pairs,
    /(commercial\s+licen[cs]e\s*(no|number)?)/i,
    { extractId: true, minLen: 4 }
  );

  const registeredNumber =
    base.registrationNumber ??
    pickBestByKey(pairs, /registered\s*number/i, { extractId: true, minLen: 4 });

  return {
    ...base,
    authority: "ADGM",
    licenseNumber: base.licenseNumber ?? commercialLicence,
    registrationNumber: registeredNumber,
  };
}

function applyAjmanTweaks(
  base: CompanyDocNormalized,
  pairs: Array<{ key?: string; value?: string; confidence?: number }>
): CompanyDocNormalized {
  const registrationNo =
    base.registrationNumber ??
    pickBestByKey(pairs, /registration\s*no\./i, {
      extractId: true,
      minLen: 4,
    });

  // Ajman docs sometimes bury license number in values
  const licenseFallback =
    base.licenseNumber ??
    pickBestByKey(pairs, /licen[cs]e/i, { extractId: true, minLen: 4 }) ??
    pickBestIdFromValues(pairs, /\blicen[cs]e\b/i);

  return {
    ...base,
    authority: "Ajman Free Zone",
    registrationNumber: registrationNo,
    licenseNumber: licenseFallback,
  };
}

function applyDwcTweaks(
  base: CompanyDocNormalized,
  pairs: Array<{ key?: string; value?: string; confidence?: number }>
): CompanyDocNormalized {
  const licenseNo =
    base.licenseNumber ??
    pickBestByKey(pairs, /license\s*no\./i, { extractId: true, minLen: 4 });

  const registrationNo =
    base.registrationNumber ??
    pickBestByKey(pairs, /registration\s*no\./i, {
      extractId: true,
      minLen: 4,
    });

  return {
    ...base,
    authority: "Dubai South / DWC",
    licenseNumber: licenseNo,
    registrationNumber: registrationNo,
  };
}

function applyDmccTweaks(
  base: CompanyDocNormalized,
  pairs: Array<{ key?: string; value?: string; confidence?: number }>
): CompanyDocNormalized {
  // DMCC often uses "License No" and "Registration No", but also "DMCC Registration No"
  const registrationNo =
    base.registrationNumber ??
    pickBestByKey(pairs, /dmcc\s*registration/i, { extractId: true, minLen: 4 });

  return {
    ...base,
    authority: "DMCC",
    registrationNumber: registrationNo,
  };
}

function applyUkCompaniesHouseTweaks(
  base: CompanyDocNormalized,
  pairs: Array<{ key?: string; value?: string; confidence?: number }>
): CompanyDocNormalized {
  const companyNumber =
    base.registrationNumber ??
    pickBestByKey(pairs, /(company\s*number)\b/i, {
      extractId: true,
      minLen: 4,
    });

  // UK "incorporated on" resembles issue date; no "expiry"
  const incorporatedOn = pickBestByKey(pairs, /(incorporated\s*on)/i);

  return {
    ...base,
    authority: "UK Companies House",
    registrationNumber: companyNumber,
    currentIssueDate: base.currentIssueDate ?? parseDateToISO(incorporatedOn),
    expiryDate: undefined,
    licenseNumber: undefined,
  };
}

function applyUsStateRegistryTweaks(
  base: CompanyDocNormalized,
  pairs: Array<{ key?: string; value?: string; confidence?: number }>
): CompanyDocNormalized {
  const fileNumber =
    base.registrationNumber ??
    pickBestByKey(pairs, /(file\s*(no|number)|entity\s*number)\b/i, {
      extractId: true,
      minLen: 4,
    });

  return {
    ...base,
    authority: "US State Registry",
    registrationNumber: fileNumber,
  };
}

const REGISTRY_TWEAKS: Partial<
  Record<RegistrationRegime, (b: CompanyDocNormalized, p: any[]) => CompanyDocNormalized>
> = {
  UAE_ADGM: applyAdgmTweaks as any,
  UAE_AJMAN: applyAjmanTweaks as any,
  UAE_DWC: applyDwcTweaks as any,
  UAE_DMCC: applyDmccTweaks as any,
  UK_COMPANIES_HOUSE: applyUkCompaniesHouseTweaks as any,
  US_STATE_REGISTRY: applyUsStateRegistryTweaks as any,
};

/* ---------- single entrypoint ---------- */

export function normalizeCompanyDoc(kvPairs: KeyValuePair[]): CompanyDocNormalized {
  const detection = detectCompanyRegistry(kvPairs);

  const base = genericNormalizeCompanyDoc(kvPairs);

  // Use the normalizedPairs for tweaks (consistent lowercasing)
  const pairsForTweaks =
    base._normalizedPairs ??
    kvPairs.map((kv) => ({
      key: normalizeKey(kv.key),
      value: normalizeValue(kv.value),
      confidence: kv.confidence,
    }));

  const tweak = detection.registrationRegime
    ? REGISTRY_TWEAKS[detection.registrationRegime]
    : undefined;

  const tweaked = tweak ? tweak(base, pairsForTweaks) : base;

  // Ensure authority/authorityCode/registrationRegime set consistently
  return {
    ...tweaked,
    authority: tweaked.authority ?? detection.authorityLabel,
    authorityCode: detection.authorityCode,
    registrationRegime: detection.registrationRegime,
    authorityEvidence: detection.evidence,
  };
}
