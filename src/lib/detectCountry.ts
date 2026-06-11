const TZ_COUNTRY_MAP: Record<string, string> = {
  "Asia/Dubai": "United Arab Emirates",
  "Asia/Abu_Dhabi": "United Arab Emirates",
  "Asia/Riyadh": "Saudi Arabia",
  "Asia/Kuwait": "Kuwait",
  "Asia/Bahrain": "Bahrain",
  "Asia/Qatar": "Qatar",
  "Asia/Muscat": "Oman",
  "Europe/London": "United Kingdom",
  "Europe/Paris": "France",
  "Europe/Berlin": "Germany",
  "America/New_York": "United States",
  "America/Los_Angeles": "United States",
  "Asia/Singapore": "Singapore",
  "Asia/Hong_Kong": "Hong Kong",
  "Asia/Kolkata": "India",
};

export function detectCountryFromTimezone(): string | null {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return TZ_COUNTRY_MAP[tz] ?? null;
  } catch {
    return null;
  }
}
