import { supabase } from "./supabase";

const TOKEN_KEY = "aim_token";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export async function apiFetch(path, options = {}) {
  // Get token from Supabase session (primary) or localStorage (fallback)
  let token = null;
  try {
    const { data: { session } } = await supabase.auth.getSession();
    token = session?.access_token;
  } catch { /* fall through */ }
  if (!token) token = getToken();

  const headers = { "Content-Type": "application/json", ...options.headers };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`/api${path}`, { ...options, headers });
  const data = await res.json();

  if (!res.ok) {
    const err = new Error(data.error || "Request failed");
    err.status = res.status;
    throw err;
  }

  return data;
}
