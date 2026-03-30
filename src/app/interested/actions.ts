"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { isUuid } from "@/lib/uuid";

export type InterestedStage = "new" | "contacted" | "negotiating" | "closed";

export async function setInterestedPipelineStage(
  targetId: string,
  stage: InterestedStage,
  pathToRevalidate: string,
): Promise<{ ok: boolean }> {
  if (!isSupabaseConfigured() || !isUuid(targetId)) return { ok: false };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  const { error } = await supabase.from("interested_pipeline").upsert(
    {
      viewer_id: user.id,
      target_id: targetId,
      stage,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "viewer_id,target_id" },
  );
  if (error) {
    console.error("setInterestedPipelineStage", error.message);
    return { ok: false };
  }

  revalidatePath(pathToRevalidate);
  return { ok: true };
}

export async function saveInterestedPipelineNote(
  targetId: string,
  note: string,
  pathToRevalidate: string,
): Promise<{ ok: boolean }> {
  if (!isSupabaseConfigured() || !isUuid(targetId)) return { ok: false };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  const clean = note.trim().slice(0, 500);
  const { error } = await supabase.from("interested_pipeline").upsert(
    {
      viewer_id: user.id,
      target_id: targetId,
      note: clean || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "viewer_id,target_id" },
  );
  if (error) {
    console.error("saveInterestedPipelineNote", error.message);
    return { ok: false };
  }

  revalidatePath(pathToRevalidate);
  return { ok: true };
}
