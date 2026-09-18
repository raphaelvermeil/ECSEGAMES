import axios from "axios";

// Where the Go backend lives. Shared by the axios instance and by the
// server components that call fetch directly, so nothing else spells the
// fallback out — or forgets it and dials "undefined/api/me".
export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8082";

// How long a server-side fetch to the backend may take before the page
// gives up and renders without it. A hung backend would otherwise hang the
// render itself.
export const API_TIMEOUT_MS = 10_000;

// Shared axios instance. Callers attach the Clerk token per request; there
// is no cookie auth, so no credentials on the CORS exchange.
const api = axios.create({
  baseURL: API_URL,
  timeout: 15_000,
});

export default api;
