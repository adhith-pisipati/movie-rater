"use client";

import { useEffect, useState } from "react";
import { Movie, RankedMovie, RatingBucket } from "@/lib/types";
import { fetchCrowdScore, fetchFriendsScore } from "@/lib/data/ratings";

const bucketLabel: Record<RatingBucket, string> = { good: "Good", okay: "Okay", bad: "Bad" };

type ScoreState = number | null | "loading";

interface MovieScoreCardProps {
  movie: Movie;
  ranked: RankedMovie | undefined;
  friendIds: string[];
  onRate: () => void;
  onClose: () => void;
}

export function MovieScoreCard({ movie, ranked, friendIds, onRate, onClose }: MovieScoreCardProps) {
  const [crowdScore, setCrowdScore] = useState<ScoreState>("loading");
  const [friendsScore, setFriendsScore] = useState<ScoreState>("loading");

  // Fetch social scores, guarded against stale results if movie changes
  useEffect(() => {
    let cancelled = false;
    setCrowdScore("loading");
    setFriendsScore("loading");

    fetchCrowdScore(movie.id)
      .then((v) => { if (!cancelled) setCrowdScore(v); })
      .catch(() => { if (!cancelled) setCrowdScore(null); });
    fetchFriendsScore(movie.id, friendIds)
      .then((v) => { if (!cancelled) setFriendsScore(v); })
      .catch(() => { if (!cancelled) setFriendsScore(null); });

    return () => { cancelled = true; };
  }, [movie.id, friendIds]);

  // Escape key closes the modal
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  function fmt(value: ScoreState): string {
    if (value === "loading") return "…";
    if (value === null) return "—";
    return value.toFixed(1);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={movie.title}
      className="fixed inset-0 z-20 grid place-items-center bg-black/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="surface w-full max-w-sm p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {ranked && (
          <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-zinc-600">
            {bucketLabel[ranked.bucket]}
          </p>
        )}

        <h2 className="mt-1 font-display text-3xl font-light italic leading-tight text-zinc-100">
          {movie.title}
        </h2>

        <div className="mt-6 grid grid-cols-3 divide-x divide-line border-t border-line pt-5">
          <div className="pl-0 pr-2 text-center">
            <p className="font-mono text-3xl font-light text-zinc-100">
              {ranked ? ranked.score.toFixed(1) : "—"}
            </p>
            <p className="mt-2 font-mono text-[9px] tracking-[0.15em] uppercase text-zinc-600">
              Your Rating
            </p>
          </div>
          <div className="px-2 text-center">
            <p className="font-mono text-3xl font-light text-zinc-100">{fmt(friendsScore)}</p>
            <p className="mt-2 font-mono text-[9px] tracking-[0.15em] uppercase text-zinc-600">
              Friends Avg
            </p>
          </div>
          <div className="pl-2 pr-0 text-center">
            <p className="font-mono text-3xl font-light text-zinc-100">{fmt(crowdScore)}</p>
            <p className="mt-2 font-mono text-[9px] tracking-[0.15em] uppercase text-zinc-600">
              Crowd Score
            </p>
          </div>
        </div>

        <div className="mt-6 flex items-center gap-3">
          <button className="btn-primary flex-1 justify-center" onClick={onRate}>
            Rate
          </button>
          <button className="btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
