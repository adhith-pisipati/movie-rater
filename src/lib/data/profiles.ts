import { supabase } from "@/lib/supabase/client";
import { ProfileRow } from "@/lib/supabase/types";

export async function fetchMyProfile(userId: string): Promise<ProfileRow | null> {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  if (error) throw error;
  return (data as ProfileRow | null) ?? null;
}

export async function updateMyProfile(userId: string, patch: Partial<Pick<ProfileRow, "username" | "full_name" | "avatar_url">>) {
  const { error } = await supabase.from("profiles").update(patch).eq("id", userId);
  if (error) throw error;
}

export async function searchProfiles(query: string, currentUserId: string): Promise<ProfileRow[]> {
  const q = query.trim();
  if (!q) return [];
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .neq("id", currentUserId)
    .ilike("username", `%${q}%`)
    .limit(20);
  if (error) throw error;
  return (data as ProfileRow[]) ?? [];
}

export async function fetchProfileByUsername(username: string): Promise<ProfileRow | null> {
  const { data, error } = await supabase.from("profiles").select("*").eq("username", username).maybeSingle();
  if (error) throw error;
  return (data as ProfileRow | null) ?? null;
}
