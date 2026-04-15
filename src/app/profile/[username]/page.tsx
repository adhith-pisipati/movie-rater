"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { fetchProfileByUsername } from "@/lib/data/profiles";
import { loadPublicRankings } from "@/lib/data/ratings";
import { ProfileRow } from "@/lib/supabase/types";

type Bucket = "good" | "okay" | "bad";

interface PublicRatingItem {
  id: string;
  bucket: Bucket;
  rank_in_bucket: number;
  score: number;
  movies: { id: string; title: string; year: number | null } | null;
}

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

  if (loading) return <main className="mx-auto max-w-4xl p-6">Loading profile...</main>;

  return (
    <main className="mx-auto max-w-4xl p-6">
      <Link href="/" className="text-sm text-accent hover:underline">
        Back to app
      </Link>
      {error && <p className="mt-4 text-sm text-red-300">{error}</p>}
      {profile && (
        <section className="mt-4">
          <h1 className="text-2xl font-semibold">@{profile.username}</h1>
          <p className="text-sm text-zinc-400">{profile.full_name ?? "Movie Rater user"}</p>
          <p className="mt-1 text-sm text-zinc-300">Rated movies: {ratings.length}</p>
        </section>
      )}
      {(["good", "okay", "bad"] as Bucket[]).map((bucket) => (
        <section key={bucket} className="surface mt-4 p-4">
          <h2 className="mb-2 text-lg font-semibold">{bucket[0].toUpperCase() + bucket.slice(1)}</h2>
          <ol className="space-y-2">
            {grouped[bucket].length === 0 && <li className="text-sm text-zinc-500">No ratings yet.</li>}
            {grouped[bucket]
              .sort((a, b) => a.rank_in_bucket - b.rank_in_bucket)
              .map((rating) => (
                <li key={rating.id} className="flex items-center justify-between rounded border border-line p-2">
                  <p>
                    #{rating.rank_in_bucket} {rating.movies?.title ?? "Unknown movie"}
                  </p>
                  <p className="text-sm text-zinc-300">{rating.score.toFixed(1)}</p>
                </li>
              ))}
          </ol>
        </section>
      ))}
    </main>
  );
}
