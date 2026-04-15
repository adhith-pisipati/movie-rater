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

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="mb-3 flex items-center gap-3">
      <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-zinc-500">{label}</p>
      <div className="h-px flex-1 bg-line" />
    </div>
  );
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
    <div className="space-y-8">
      {/* Search */}
      <section className="surface p-5">
        <SectionHeader label="Find people" />
        <input
          className="w-full rounded border border-line bg-transparent px-3 py-2 text-sm text-zinc-200 outline-none transition-colors placeholder:text-zinc-700 focus:border-accent/60"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by username…"
        />
        {searchResults.length > 0 && (
          <ul className="mt-3 space-y-1.5">
            {searchResults.map((profile) => (
              <li
                key={profile.id}
                className="flex items-center justify-between rounded border border-line/50 px-3 py-2"
              >
                <Link
                  href={`/profile/${profile.username}`}
                  className="font-mono text-sm text-zinc-400 transition-colors hover:text-accent"
                >
                  @{profile.username}
                </Link>
                <button className="btn text-xs" onClick={() => onSendRequest(profile.id)}>
                  Add
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Incoming requests */}
      {friendships.incoming.length > 0 && (
        <section className="surface p-5">
          <SectionHeader label="Incoming requests" />
          <ul className="space-y-2">
            {friendships.incoming.map(({ request, fromProfile }) => (
              <li
                key={request.id}
                className="flex items-center justify-between rounded border border-line/50 px-3 py-2"
              >
                <span className="font-mono text-sm text-zinc-400">
                  @{fromProfile?.username ?? "unknown"}
                </span>
                <div className="flex gap-2">
                  <button className="btn-primary text-xs" onClick={() => onAccept(request.id)}>
                    Accept
                  </button>
                  <button className="btn text-xs" onClick={() => onReject(request.id)}>
                    Decline
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Outgoing requests */}
      {friendships.outgoing.length > 0 && (
        <section className="surface p-5">
          <SectionHeader label="Sent requests" />
          <ul className="space-y-2">
            {friendships.outgoing.map(({ request, toProfile }) => (
              <li
                key={request.id}
                className="flex items-center justify-between rounded border border-line/50 px-3 py-2"
              >
                <span className="font-mono text-sm text-zinc-400">
                  @{toProfile?.username ?? "unknown"}
                </span>
                <button className="btn text-xs" onClick={() => onCancel(request.id)}>
                  Cancel
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Friends list */}
      <section className="surface p-5">
        <SectionHeader label="Friends" />
        {friendships.friends.length === 0 ? (
          <p className="font-mono text-xs text-zinc-700">No friends yet. Search above to connect.</p>
        ) : (
          <ul className="space-y-1.5">
            {friendships.friends.map(({ friendProfile }) => (
              <li key={friendProfile.id}>
                <Link
                  href={`/profile/${friendProfile.username}`}
                  className="font-mono text-sm text-zinc-400 transition-colors hover:text-accent"
                >
                  @{friendProfile.username}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
