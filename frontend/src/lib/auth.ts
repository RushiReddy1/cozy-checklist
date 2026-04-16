export type AuthUser = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
};

export type AuthPayload = {
  token: string;
  user: AuthUser;
};

type AuthEntryKind = "signup" | "login";

const TOKEN_KEY = "token";
const USER_KEY = "auth_user";
const ENTRY_KEY = "auth_entry_kind";

export function isAuthenticated() {
  return Boolean(localStorage.getItem(TOKEN_KEY));
}

export function storeAuthSession(payload: AuthPayload, entryKind: AuthEntryKind) {
  localStorage.setItem(TOKEN_KEY, payload.token);
  localStorage.setItem(USER_KEY, JSON.stringify(payload.user));
  sessionStorage.setItem(ENTRY_KEY, entryKind);
}

export function clearAuthSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  sessionStorage.removeItem(ENTRY_KEY);
}

export function getStoredUser(): AuthUser | null {
  const rawUser = localStorage.getItem(USER_KEY);
  if (!rawUser) {
    return null;
  }

  try {
    return JSON.parse(rawUser) as AuthUser;
  } catch {
    return null;
  }
}

export function getEntryKind(): AuthEntryKind | null {
  const entryKind = sessionStorage.getItem(ENTRY_KEY);
  if (entryKind === "signup" || entryKind === "login") {
    return entryKind;
  }

  return null;
}

export function getDisplayName(user: AuthUser | null) {
  if (!user) {
    return "there";
  }

  const fullName = `${user.firstName} ${user.lastName}`.trim();
  return fullName || user.firstName || user.email || "there";
}
