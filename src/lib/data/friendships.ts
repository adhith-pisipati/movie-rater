import { supabase } from "@/lib/supabase/client";
import { FriendshipRow, FriendshipStatus, ProfileRow } from "@/lib/supabase/types";

export interface FriendshipViewData {
  incoming: Array<{ request: FriendshipRow; fromProfile: ProfileRow | null }>;
  outgoing: Array<{ request: FriendshipRow; toProfile: ProfileRow | null }>;
  friends: Array<{ request: FriendshipRow; friendProfile: ProfileRow }>;
}

export async function fetchFriendships(userId: string): Promise<FriendshipViewData> {
  const { data, error } = await supabase
    .from("friendships")
    .select("*")
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
    .order("created_at", { ascending: false });
  if (error) throw error;
  const rows = (data ?? []) as FriendshipRow[];

  const incomingRows = rows.filter((r) => r.status === "pending" && r.addressee_id === userId);
  const outgoingRows = rows.filter((r) => r.status === "pending" && r.requester_id === userId);
  const accepted = rows.filter((r) => r.status === "accepted");

  const otherIds = Array.from(
    new Set(
      rows.map((r) => (r.requester_id === userId ? r.addressee_id : r.requester_id))
    )
  );

  let profileMap = new Map<string, ProfileRow>();
  if (otherIds.length > 0) {
    const { data: profileData, error: profileError } = await supabase.from("profiles").select("*").in("id", otherIds);
    if (profileError) throw profileError;
    profileMap = new Map((profileData as ProfileRow[]).map((p) => [p.id, p]));
  }

  return {
    incoming: incomingRows.map((request) => ({
      request,
      fromProfile: profileMap.get(request.requester_id) ?? null
    })),
    outgoing: outgoingRows.map((request) => ({
      request,
      toProfile: profileMap.get(request.addressee_id) ?? null
    })),
    friends: accepted
      .map((request) => {
        const friendId = request.requester_id === userId ? request.addressee_id : request.requester_id;
        const friendProfile = profileMap.get(friendId);
        if (!friendProfile) return null;
        return { request, friendProfile };
      })
      .filter((v): v is { request: FriendshipRow; friendProfile: ProfileRow } => Boolean(v))
  };
}

export async function sendFriendRequest(userId: string, targetUserId: string): Promise<void> {
  if (userId === targetUserId) return;
  const { error } = await supabase.from("friendships").insert({
    requester_id: userId,
    addressee_id: targetUserId,
    status: "pending"
  });
  if (error) throw error;
}

export async function updateFriendRequestStatus(
  requestId: string,
  status: Extract<FriendshipStatus, "accepted" | "rejected" | "canceled">
): Promise<void> {
  const { error } = await supabase
    .from("friendships")
    .update({ status, responded_at: new Date().toISOString() })
    .eq("id", requestId);
  if (error) throw error;
}
