export async function apiFetch(url: string, options: RequestInit = {}) {
  const BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
  const token = localStorage.getItem("token");
  const isAuthRoute = url === "/login" || url === "/signup";

  const headers = new Headers(options.headers || {});

  if (token && !isAuthRoute) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return fetch(`${BASE_URL}${url}`, {
    ...options,
    headers,
  });
}
