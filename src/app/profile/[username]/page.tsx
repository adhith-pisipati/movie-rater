"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { fetchProfileByUsername } from "@/lib/data/profiles";
import { loadPublicRankings } from "@/lib/data/ratings";
import { scoreByBucketPosition } from "@/lib/ranking";
import { ProfileRow } from "@/lib/supabase/types";

type Bucket = "good" | "okay" | "bad";

interface PublicRatingItem {
  id: string;
  bucket: Bucket;
  rank_in_bucket: number;
  score: number;
  movies: { id: string; title: string; year: number | null } | null;
}

const bucketDot: Record<Bucket, string> = { good: "bg-good", okay: "bg-okay", bad: "bg-bad" };
const bucketLabel: Record<Bucket, string> = { good: "Good", okay: "Okay", bad: "Bad" };

export default function PublicProfilePage({ params }: { params: { username: string } }) {
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [ratings, setRatings] = useState<PublicRatingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const found = await fetchProfileByUsername(params.username);
        if (!found) {
          setError("Profile not found");
          setProfile(null);
          return;
        }
        setProfile(found);
        const publicRatings = (await loadPublicRankings(found.id)) as unknown as PublicRatingItem[];
        setRatings(publicRatings);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load profile");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [params.username]);

  const grouped = useMemo(() => {
    const initial: Record<Bucket, PublicRatingItem[]> = { good: [], okay: [], bad: [] };
    ratings.forEach((rating) => {
      initial[rating.bucket].push(rating);
    });
    return initial;
  }, [ratings]);

  const bucketCounts = useMemo(() => {
    return {
      good: grouped.good.length,
      okay: grouped.okay.length,
      bad: grouped.bad.length
    };
  }, [grouped]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="font-mono text-xs tracking-[0.2em] uppercase text-zinc-700">Loading…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-4 py-10 sm:px-8">
      <Link href="/" className="font-mono text-[10px] tracking-[0.18em] uppercase text-zinc-600 transition-colors hover:text-accent">
        ← Back
      </Link>

      {error && <p className="mt-6 font-mono text-xs text-red-400">{error}</p>}

      {profile && (
        <header className="mt-6 border-b border-line pb-6">
          <h1 className="font-display text-4xl font-light italic text-zinc-100">
            @{profile.username}
          </h1>
          {profile.full_name && (
            <p className="mt-1 text-sm text-zinc-500">{profile.full_name}</p>
          )}
          <p className="mt-3 font-mono text-[10px] tracking-[0.18em] uppercase text-zinc-700">
            {ratings.length} films rated
          </p>
        </header>
      )}

      <div className="mt-8 space-y-10">
        {(["good", "okay", "bad"] as Bucket[]).map((bucket) => (
          <section key={bucket}>
            <div className="mb-2 flex items-center gap-3">
              <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${bucketDot[bucket]}`} />
              <h2 className="font-mono text-[11px] tracking-[0.2em] uppercase text-zinc-500">
                {bucketLabel[bucket]}
              </h2>
              <div className="h-px flex-1 bg-line" />
            </div>
            <ol>
              {grouped[bucket].length === 0 && (
                <li className="py-3 font-mono text-xs text-zinc-700">Nothing here yet.</li>
              )}
              {grouped[bucket]
                .sort((a, b) => a.rank_in_bucket - b.rank_in_bucket)
                .map((rating) => (
                  <li
                    key={rating.id}
                    className="flex items-center gap-4 border-b border-line/30 py-3 last:border-0"
                  >
                    <span className="w-7 shrink-0 font-mono text-xs text-zinc-700">
                      {String(rating.rank_in_bucket).padStart(2, "0")}
                    </span>
                    <span className="flex-1 font-display text-base text-zinc-100">
                      {rating.movies?.title ?? "Unknown"}
                    </span>
                    <span className="font-mono text-xs text-zinc-600">
                      {scoreByBucketPosition(rating.bucket, rating.rank_in_bucket, bucketCounts[rating.bucket]).toFixed(1)}
                    </span>
                  </li>
                ))}
            </ol>
          </section>
        ))}
      </div>
    </main>
  );
}
