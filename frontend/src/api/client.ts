export async function apiFetch(url: string, options: RequestInit = {}) {
  const BASE_URL = "http://localhost:8080";
  const token = localStorage.getItem("token");
  const isAuthRoute = url === "/login" || url === "/signup";

  const headers = new Headers(options.headers || {});

  if (token && !isAuthRoute) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return fetch(BASE_URL + url, {
    ...options,
    headers,
  });
}
