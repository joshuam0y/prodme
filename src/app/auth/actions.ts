"use server";

import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { getSiteOrigin } from "@/lib/site-url";
import { redirect } from "next/navigation";

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
    redirect(
      `/login?error=${encodeURIComponent(error.message)}&next=${encodeURIComponent(next)}`,
    );
  }

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
    redirect(
      `/signup?error=${encodeURIComponent(error.message)}&next=${encodeURIComponent(next)}`,
    );
  }

  redirect(
    `/signup?notice=${encodeURIComponent("Check your email to confirm your account, then sign in.")}`,
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
};

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

  const { error } = await supabase.from("profiles").upsert(
    {
      id: user.id,
      display_name: displayName,
      role: payload.role,
      niche: payload.niche,
      goal: payload.goal,
      ...(city ? { city } : {}),
      onboarding_completed_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );

  if (error) {
    redirect(
      `/onboarding?error=${encodeURIComponent(error.message)}`,
    );
  }

  redirect("/explore");
}
