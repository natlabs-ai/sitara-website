export function isNonEmpty(s: string): boolean {
  return s.trim().length > 0;
}

export function minLength(s: string, n: number): boolean {
  return s.trim().length >= n;
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isAtLeast18(dob: string): boolean {
  if (!dob) return false;
  const dobDate = new Date(dob);
  if (isNaN(dobDate.getTime())) return false;
  const now = new Date();
  const cutoff = new Date(now.getFullYear() - 18, now.getMonth(), now.getDate());
  return dobDate <= cutoff;
}
