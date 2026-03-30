/**
 * Public origin for redirects behind Vercel (x-forwarded-*).
 * request.url can disagree with the browser URL in some edge cases.
 */
export function getRequestOrigin(request: Request): string {
  const url = new URL(request.url);
  const host =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? url.host;
  let proto = request.headers.get("x-forwarded-proto");
  if (!proto) proto = url.protocol.replace(":", "");
  if (!proto) proto = "https";
  return `${proto}://${host}`;
}
