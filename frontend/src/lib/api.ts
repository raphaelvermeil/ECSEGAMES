import axios from "axios";

// Shared axios instance. Base URL points at the Go backend.
// A token getter can be attached per-request by callers that have a Clerk
// session; kept minimal here (no interceptor wired to Clerk yet).
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8082",
  withCredentials: true,
});

export default api;
