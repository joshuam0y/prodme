/** Where to send the user after auth/callback. `hash` only exists in the browser (not on middleware). */
export function resolvePostAuthRedirect(
  searchParams: URLSearchParams,
  hashWithoutLeading = "",
): string {
  const explicit = searchParams.get("next");
  if (explicit?.startsWith("/") && !explicit.startsWith("//")) {
    return explicit;
  }
  if (searchParams.get("type") === "recovery") {
    return "/update-password";
  }
  if (hashWithoutLeading) {
    const fromHash = new URLSearchParams(hashWithoutLeading);
    if (fromHash.get("type") === "recovery") {
      return "/update-password";
    }
  }
  return "/explore";
}
