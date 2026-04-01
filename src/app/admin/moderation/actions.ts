"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail, isSupabaseConfigured } from "@/lib/env";

async function requireAdmin() {
  if (!isSupabaseConfigured()) redirect("/?error=supabase");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/admin/moderation");
  if (!isAdminEmail(user.email)) redirect("/explore?notice=Admin%20access%20required");
  return { supabase, user };
}

export async function resolveReport(reportId: number, status: "open" | "resolved") {
  const { supabase, user } = await requireAdmin();
  const patch =
    status === "resolved"
      ? {
          status,
          resolved_at: new Date().toISOString(),
          resolved_by: user.id,
        }
      : {
          status,
          resolved_at: null,
          resolved_by: null,
        };
  const { error } = await supabase.from("match_message_reports").update(patch).eq("id", reportId);
  if (error) {
    redirect(`/admin/moderation?notice=${encodeURIComponent(`Could not update report #${reportId}.`)}`);
  }
  revalidatePath("/admin/moderation");
}

export async function unblockProfile(blockerId: string, blockedId: string) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase
    .from("profile_blocks")
    .delete()
    .eq("blocker_id", blockerId)
    .eq("blocked_id", blockedId);
  if (error) {
    redirect("/admin/moderation?notice=Could%20not%20unblock%20that%20pair.");
  }
  revalidatePath("/admin/moderation");
}
