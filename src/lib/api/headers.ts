/**
 * Standard response headers for public API routes.
 */
export const API_HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "X-Powered-By": "BlitzQuote",
} as const;

/**
 * CORS preflight handler for API routes.
 */
export function handleCors(): Response {
  return new Response(null, {
    status: 204,
    headers: API_HEADERS,
  });
}
