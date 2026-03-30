/** Matches /profile “incomplete” — finished onboarding questionnaire. */
export function isProfileQuestionnaireComplete(
  row:
    | {
        onboarding_completed_at: string | null;
        niche: string | null;
        role: string | null;
      }
    | null
    | undefined,
): boolean {
  return Boolean(
    row?.onboarding_completed_at &&
      row?.niche?.trim() &&
      row?.role?.trim(),
  );
}
