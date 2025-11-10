export type FakeUser = { id: string; email: string };
const KEY = "sitara_fake_user";

export function getUser(): FakeUser | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(KEY);
  return raw ? JSON.parse(raw) : null;
}

export function login(email: string): FakeUser {
  const u = { id: crypto.randomUUID(), email };
  localStorage.setItem(KEY, JSON.stringify(u));
  return u;
}

export function logout() {
  if (typeof window !== "undefined") localStorage.removeItem(KEY);
}
