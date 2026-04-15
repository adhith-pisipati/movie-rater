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
      setMessage("Profile updated.");
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
    <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold">Movie Rater</h1>
        <p className="text-sm text-zinc-400">Comparative ranking with Supabase auth, profiles, and friends.</p>
        {profile && (
          <p className="mt-2 text-sm text-zinc-300">
            Signed in as{" "}
            <Link className="text-accent underline-offset-4 hover:underline" href={`/profile/${profile.username}`}>
              @{profile.username}
            </Link>
          </p>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {profile && !editing && (
          <button className="btn" onClick={() => setEditing(true)}>
            Edit profile
          </button>
        )}
        <button className="btn" onClick={logout}>
          Log out
        </button>
      </div>
      {profile && editing && (
        <div className="surface w-full p-4">
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              className="rounded-lg border border-line bg-zinc-900 px-3 py-2 text-sm"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
            />
            <input
              className="rounded-lg border border-line bg-zinc-900 px-3 py-2 text-sm"
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
          {message && <p className="mt-2 text-sm text-zinc-300">{message}</p>}
        </div>
      )}
    </header>
  );
}
