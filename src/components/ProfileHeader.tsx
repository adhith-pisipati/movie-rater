"use client";

import Link from "next/link";
import { useState } from "react";
import { updateMyProfile } from "@/lib/data/profiles";
import { supabase } from "@/lib/supabase/client";
import { ProfileRow } from "@/lib/supabase/types";

interface ProfileHeaderProps {
  profile: ProfileRow | null;
  onProfileUpdated: () => Promise<void>;
}

export function ProfileHeader({ profile, onProfileUpdated }: ProfileHeaderProps) {
  const [editing, setEditing] = useState(false);
  const [username, setUsername] = useState(profile?.username ?? "");
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [message, setMessage] = useState<string | null>(null);

  async function save() {
    if (!profile) return;
    try {
      await updateMyProfile(profile.id, {
        username: username.trim(),
        full_name: fullName.trim() || null
      });
      setMessage("Saved.");
      setEditing(false);
      await onProfileUpdated();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to update profile");
    }
  }

  async function logout() {
    await supabase.auth.signOut();
  }

  return (
    <header className="mb-8">
      <div className="flex items-end justify-between gap-4 border-b border-line pb-5">
        <div>
          <h1 className="font-display text-[2.75rem] font-light italic leading-none tracking-tight text-zinc-100">
            Movie Rater
          </h1>
          {profile && (
            <p className="mt-2.5 font-mono text-[10px] tracking-[0.2em] uppercase text-zinc-600">
              <Link href={`/profile/${profile.username}`} className="transition-colors hover:text-accent">
                @{profile.username}
              </Link>
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2 pb-0.5">
          {profile && !editing && (
            <button className="btn" onClick={() => setEditing(true)}>
              Edit profile
            </button>
          )}
          <button className="btn" onClick={logout}>
            Sign out
          </button>
        </div>
      </div>

      {editing && (
        <div className="mt-4 surface p-4">
          <p className="mb-3 font-mono text-[10px] tracking-[0.18em] uppercase text-zinc-600">Edit profile</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              className="rounded border border-line bg-transparent px-3 py-2 text-sm text-zinc-200 outline-none transition-colors placeholder:text-zinc-700 focus:border-accent/60"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
            />
            <input
              className="rounded border border-line bg-transparent px-3 py-2 text-sm text-zinc-200 outline-none transition-colors placeholder:text-zinc-700 focus:border-accent/60"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Full name (optional)"
            />
          </div>
          <div className="mt-3 flex gap-2">
            <button className="btn-primary" onClick={save}>
              Save
            </button>
            <button className="btn" onClick={() => setEditing(false)}>
              Cancel
            </button>
          </div>
          {message && <p className="mt-2 font-mono text-xs text-zinc-600">{message}</p>}
        </div>
      )}
    </header>
  );
}
