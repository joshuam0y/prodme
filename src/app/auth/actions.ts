"use server";

import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { redirect } from "next/navigation";
import { headers } from "next/headers";

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

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  const origin =
    host != null ? `${proto}://${host}` : "http://localhost:3000";

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

export type OnboardingPayload = {
  display_name: string;
  role: string;
  niche: string;
  goal: string;
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

  const { error } = await supabase.from("profiles").upsert(
    {
      id: user.id,
      display_name: displayName,
      role: payload.role,
      niche: payload.niche,
      goal: payload.goal,
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
