"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { isUuid } from "@/lib/uuid";

export type LeadOutreachStatus = "draft" | "sent" | "follow_up";

export async function saveLeadOutreachDraft(
  targetId: string,
  draft: string,
  pathToRevalidate: string,
): Promise<{ ok: boolean }> {
  if (!isSupabaseConfigured() || !isUuid(targetId)) return { ok: false };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  const message = draft.trim().slice(0, 1200);
  const { error } = await supabase.from("lead_outreach").upsert(
    {
      viewer_id: user.id,
      target_id: targetId,
      message_draft: message || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "viewer_id,target_id" },
  );
  if (error) {
    console.error("saveLeadOutreachDraft", error.message);
    return { ok: false };
  }
  revalidatePath(pathToRevalidate);
  return { ok: true };
}

export async function setLeadOutreachStatus(
  targetId: string,
  status: LeadOutreachStatus,
  pathToRevalidate: string,
): Promise<{ ok: boolean }> {
  if (!isSupabaseConfigured() || !isUuid(targetId)) return { ok: false };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  const payload: {
    viewer_id: string;
    target_id: string;
    status: LeadOutreachStatus;
    updated_at: string;
    last_contacted_at?: string;
  } = {
    viewer_id: user.id,
    target_id: targetId,
    status,
    updated_at: new Date().toISOString(),
  };
  if (status === "sent" || status === "follow_up") {
    payload.last_contacted_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from("lead_outreach")
    .upsert(payload, { onConflict: "viewer_id,target_id" });
  if (error) {
    console.error("setLeadOutreachStatus", error.message);
    return { ok: false };
  }

  revalidatePath(pathToRevalidate);
  return { ok: true };
}
