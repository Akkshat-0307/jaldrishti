/**
 * JalDrishti API client helper.
 * Resolves API paths against NEXT_PUBLIC_API_URL when set,
 * or falls back to relative /api proxy routes.
 */
export const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ? process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, "")
  : "";

export function getApiUrl(path: string): string {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  if (API_BASE) {
    // If cleanPath starts with /api, strip it since backend routes are mounted at root
    if (cleanPath.startsWith("/api/")) {
      return `${API_BASE}${cleanPath.replace(/^\/api/, "")}`;
    }
    return `${API_BASE}${cleanPath}`;
  }
  return cleanPath.startsWith("/api") ? cleanPath : `/api${cleanPath}`;
}
