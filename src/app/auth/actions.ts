"use server";

import { enrichProfileWithAi, generateProfileEmbedding } from "@/lib/ai/client";
import { createClient } from "@/lib/supabase/server";
import { isAiProfileCoachConfigured, isSupabaseConfigured } from "@/lib/env";
import { getSiteOrigin } from "@/lib/site-url";
import { trackServerEvent } from "@/lib/analytics";
import { redirect } from "next/navigation";
import {
  hasDuplicatePromptQuestions,
  isCompletePrompt,
  normalizePromptValue,
} from "@/lib/profile-prompts";

function safeNext(path: string | null): string {
  if (!path || !path.startsWith("/") || path.startsWith("//")) {
    return "/explore";
  }
  return path;
}

export async function signIn(formData: FormData) {
  if (!isSupabaseConfigured()) {
    redirect("/login?error=not_configured");
  }

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = safeNext(String(formData.get("next") ?? ""));

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    await trackServerEvent({
      event: "auth_signin_failed",
      path: "/login",
      metadata: { reason: "supabase_error" },
    });
    redirect(
      `/login?error=${encodeURIComponent(error.message)}&next=${encodeURIComponent(next)}`,
    );
  }

  await trackServerEvent({ event: "auth_signin_success", path: "/login" });
  redirect(next);
}

export async function signUp(formData: FormData) {
  if (!isSupabaseConfigured()) {
    redirect("/signup?error=not_configured");
  }

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = safeNext(String(formData.get("next") ?? "/onboarding"));

  const origin = getSiteOrigin();

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (error) {
    const msg = error.message ?? "";
    const lower = msg.toLowerCase();

    const accountExists =
      /user already registered/i.test(msg) ||
      /already registered/i.test(msg) ||
      /email.*already.*(exists|registered)/i.test(lower) ||
      /duplicate key/i.test(lower) ||
      /already been registered/i.test(lower);

    if (accountExists) {
      await trackServerEvent({
        event: "auth_signup_blocked_existing",
        path: "/signup",
      });
      redirect(
        `/signup?error=account_exists&next=${encodeURIComponent(next)}`,
      );
    }

    redirect(
      `/signup?error=${encodeURIComponent(error.message)}&next=${encodeURIComponent(next)}`,
    );
  }

  await trackServerEvent({ event: "auth_signup_submitted", path: "/signup" });
  redirect(
    `/signup?notice=${encodeURIComponent("Check your email to confirm your account. We sent a confirmation link that will sign you in and continue to onboarding.")}`,
  );
}

export async function resendSignupConfirmation(formData: FormData) {
  if (!isSupabaseConfigured()) {
    redirect("/signup?error=not_configured");
  }

  const email = String(formData.get("email") ?? "").trim();
  if (!email) {
    redirect(`/signup?error=${encodeURIComponent("Enter your email to resend the confirmation link.")}`);
  }

  const next = safeNext(String(formData.get("next") ?? "/onboarding"));
  const origin = getSiteOrigin();

  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (error) {
    redirect(`/signup?error=${encodeURIComponent(error.message)}`);
  }

  redirect(
    `/signup?notice=${encodeURIComponent("If that address can receive mail, we sent a fresh confirmation link.")}`,
  );
}

export async function signOut() {
  if (!isSupabaseConfigured()) {
    redirect("/");
  }

  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function requestPasswordReset(formData: FormData) {
  if (!isSupabaseConfigured()) {
    redirect("/forgot-password?error=not_configured");
  }

  const email = String(formData.get("email") ?? "").trim();
  if (!email) {
    redirect("/forgot-password?error=missing_email");
  }

  const origin = getSiteOrigin();
  const callback = new URL("/auth/callback", origin);
  callback.searchParams.set("next", "/update-password");

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: callback.toString(),
  });

  if (error) {
    redirect(
      `/forgot-password?error=${encodeURIComponent(error.message)}`,
    );
  }

  redirect(
    `/forgot-password?notice=${encodeURIComponent("If that email has an account, we sent a reset link.")}`,
  );
}

export async function updatePassword(formData: FormData) {
  if (!isSupabaseConfigured()) {
    redirect("/update-password?error=not_configured");
  }

  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (password.length < 8) {
    redirect("/update-password?error=short");
  }
  if (password !== confirm) {
    redirect("/update-password?error=mismatch");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(
      `/forgot-password?error=${encodeURIComponent("Session expired — request a new reset link.")}`,
    );
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    redirect(
      `/update-password?error=${encodeURIComponent(error.message)}`,
    );
  }

  redirect(
    `/explore?notice=${encodeURIComponent("Password updated — you’re signed in.")}`,
  );
}

export type OnboardingPayload = {
  display_name: string;
  role: string;
  niche: string;
  goal: string;
  city?: string;
  neighborhood?: string;
  latitude?: number | null;
  longitude?: number | null;
  looking_for: string;
  prompt_1_question: string;
  prompt_1_answer: string;
  prompt_2_question?: string;
  prompt_2_answer?: string;
};

async function refreshAiAfterOnboarding(userId: string, payload: OnboardingPayload) {
  if (!isAiProfileCoachConfigured()) return;

  try {
    const profileInput = {
      displayName: payload.display_name,
      role: payload.role,
      niche: payload.niche,
      goal: payload.goal,
      city: payload.city ?? "",
      lookingFor: payload.looking_for,
      prompt1Question: payload.prompt_1_question,
      prompt1Answer: payload.prompt_1_answer,
      prompt2Question: payload.prompt_2_question ?? "",
      prompt2Answer: payload.prompt_2_answer ?? "",
    };
    const ai = await enrichProfileWithAi(profileInput);
    const embedding = await generateProfileEmbedding(profileInput);
    const supabase = await createClient();
    await supabase
      .from("profiles")
      .update({
        ai_summary: ai.summary || null,
        ai_tags: ai.tags,
        ai_profile_score: ai.score,
        ai_updated_at: new Date().toISOString(),
      })
      .eq("id", userId);
    await supabase.rpc("set_profile_embedding", {
      p_user_id: userId,
      p_source_text: embedding.sourceText,
      p_embedding_text: embedding.embeddingText,
    });
  } catch {
    // Best-effort only.
  }
}

export async function completeOnboarding(payload: OnboardingPayload) {
  if (!isSupabaseConfigured()) {
    redirect("/onboarding?error=not_configured");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/onboarding");
  }

  const displayName =
    payload.display_name.trim() ||
    (user.email?.split("@")[0] ?? "Member");

  const city = payload.city?.trim() ?? "";
  const neighborhood = payload.neighborhood?.trim() ?? "";
  const lat = payload.latitude;
  const lng = payload.longitude;
  const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);
  const lookingFor = payload.looking_for.trim();
  const prompt1Question = normalizePromptValue(payload.prompt_1_question);
  const prompt1Answer = normalizePromptValue(payload.prompt_1_answer);
  const prompt2Question = normalizePromptValue(payload.prompt_2_question);
  const prompt2Answer = normalizePromptValue(payload.prompt_2_answer);

  if (!lookingFor) {
    redirect(`/onboarding?error=${encodeURIComponent("Add who or what you are looking for.")}`);
  }

  if (!isCompletePrompt(prompt1Question, prompt1Answer)) {
    redirect(`/onboarding?error=${encodeURIComponent("Add at least one prompt question and answer.")}`);
  }
  if (
    (prompt2Question && !isCompletePrompt(prompt2Question, prompt2Answer)) ||
    (prompt2Answer && !isCompletePrompt(prompt2Question, prompt2Answer))
  ) {
    redirect(`/onboarding?error=${encodeURIComponent("Your second prompt needs both a question and an answer.")}`);
  }
  if (hasDuplicatePromptQuestions({ prompt1Question, prompt2Question })) {
    redirect(`/onboarding?error=${encodeURIComponent("Choose two different prompt questions.")}`);
  }

  const baseUpsert = {
    id: user.id,
    display_name: displayName,
    role: payload.role,
    niche: payload.niche,
    goal: payload.goal,
    looking_for: lookingFor,
    prompt_1_question: prompt1Question,
    prompt_1_answer: prompt1Answer,
    prompt_2_question: prompt2Question || null,
    prompt_2_answer: prompt2Answer || null,
    onboarding_completed_at: new Date().toISOString(),
    neighborhood: neighborhood || null,
    latitude: hasCoords ? lat : null,
    longitude: hasCoords ? lng : null,
  };

  // If the DB hasn't run migration `005_profiles_city.sql` yet, `city` may
  // not exist. In that case, retry without city so onboarding still works.
  const { error: upsertError } = await supabase.from("profiles").upsert(
    {
      ...baseUpsert,
      ...(city ? { city } : {}),
    },
    { onConflict: "id" },
  );

  if (upsertError) {
    const msg = upsertError.message ?? "";
    const cityMissing =
      /column\\s+\"?city\"?/i.test(msg) && /does not exist/i.test(msg);
    if (cityMissing && city) {
      const { error: retryError } = await supabase
        .from("profiles")
        .upsert(baseUpsert, { onConflict: "id" });
      if (retryError) {
        await trackServerEvent({
          event: "onboarding_failed",
          path: "/onboarding",
          metadata: { reason: "retry_error" },
        });
        redirect(`/onboarding?error=${encodeURIComponent(retryError.message)}`);
      }
    } else {
      await trackServerEvent({
        event: "onboarding_failed",
        path: "/onboarding",
        metadata: { reason: "upsert_error" },
      });
      redirect(`/onboarding?error=${encodeURIComponent(upsertError.message)}`);
    }
  }

  await trackServerEvent({
    event: "onboarding_completed",
    path: "/onboarding",
    metadata: { role: payload.role },
  });
  await refreshAiAfterOnboarding(user.id, {
    ...payload,
    display_name: displayName,
    city,
  });
  redirect("/explore");
}
