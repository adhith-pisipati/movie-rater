import Link from "next/link";
import { FriendshipViewData } from "@/lib/data/friendships";
import { ProfileRow } from "@/lib/supabase/types";

interface FriendsPanelProps {
  friendships: FriendshipViewData;
  searchResults: ProfileRow[];
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  onSendRequest: (userId: string) => Promise<void>;
  onAccept: (requestId: string) => Promise<void>;
  onReject: (requestId: string) => Promise<void>;
  onCancel: (requestId: string) => Promise<void>;
}

export function FriendsPanel({
  friendships,
  searchResults,
  searchQuery,
  setSearchQuery,
  onSendRequest,
  onAccept,
  onReject,
  onCancel
}: FriendsPanelProps) {
  return (
    <section className="surface space-y-4 p-4">
      <h2 className="text-lg font-semibold">Friends</h2>

      <div>
        <p className="mb-2 text-sm text-zinc-400">Find users by username</p>
        <input
          className="w-full rounded-lg border border-line bg-zinc-900 px-3 py-2 text-sm"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search username"
        />
        {searchResults.length > 0 && (
          <ul className="mt-2 space-y-2">
            {searchResults.map((profile) => (
              <li key={profile.id} className="flex items-center justify-between rounded border border-line p-2 text-sm">
                <Link href={`/profile/${profile.username}`} className="hover:text-accent">
                  @{profile.username}
                </Link>
                <button className="btn" onClick={() => onSendRequest(profile.id)}>
                  Add friend
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h3 className="text-sm font-medium">Incoming requests</h3>
        <ul className="mt-2 space-y-2 text-sm">
          {friendships.incoming.length === 0 && <li className="text-zinc-500">No incoming requests.</li>}
          {friendships.incoming.map(({ request, fromProfile }) => (
            <li key={request.id} className="rounded border border-line p-2">
              <p>From: @{fromProfile?.username ?? "unknown"}</p>
              <div className="mt-2 flex gap-2">
                <button className="btn" onClick={() => onAccept(request.id)}>
                  Accept
                </button>
                <button className="btn" onClick={() => onReject(request.id)}>
                  Reject
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className="text-sm font-medium">Outgoing requests</h3>
        <ul className="mt-2 space-y-2 text-sm">
          {friendships.outgoing.length === 0 && <li className="text-zinc-500">No outgoing requests.</li>}
          {friendships.outgoing.map(({ request, toProfile }) => (
            <li key={request.id} className="rounded border border-line p-2">
              <p>To: @{toProfile?.username ?? "unknown"}</p>
              <button className="btn mt-2" onClick={() => onCancel(request.id)}>
                Cancel
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className="text-sm font-medium">Friends list</h3>
        <ul className="mt-2 space-y-2 text-sm">
          {friendships.friends.length === 0 && <li className="text-zinc-500">No friends yet.</li>}
          {friendships.friends.map(({ friendProfile }) => (
            <li key={friendProfile.id} className="rounded border border-line p-2">
              <Link href={`/profile/${friendProfile.username}`} className="hover:text-accent">
                @{friendProfile.username}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
