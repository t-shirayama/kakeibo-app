import { HttpResponse } from "msw";

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export function apiUrl(path: string) {
  return `${API_BASE_URL}${path}`;
}

export function jsonError(message: string, status = 500) {
  return HttpResponse.json({ error: { message } }, { status });
}
