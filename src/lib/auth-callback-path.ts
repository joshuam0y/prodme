/** Where to send the user after auth/callback. `hash` only exists in the browser (not on middleware). */
export function resolvePostAuthRedirect(
  searchParams: URLSearchParams,
  hashWithoutLeading = "",
): string {
  const explicit = searchParams.get("next");
  if (explicit?.startsWith("/") && !explicit.startsWith("//")) {
    return explicit;
  }

  const typeQuery = searchParams.get("type");
  if (typeQuery === "recovery") return "/update-password";
  if (typeQuery === "signup") return "/onboarding";

  if (hashWithoutLeading) {
    const h = new URLSearchParams(hashWithoutLeading);
    if (h.get("type") === "recovery") return "/update-password";
    const ht = h.get("type");
    if (
      ht === "signup" ||
      ht === "email" ||
      ht === "invite" ||
      ht === "email_change"
    ) {
      return "/onboarding";
    }
  }

  return "/explore";
}
