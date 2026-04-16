"use client";

import { useEffect, useState } from "react";
import { Movie, RankedMovie, ComparisonSession, RatingBucket } from "@/lib/types";
import { fetchCrowdScore, fetchFriendsScore } from "@/lib/data/ratings";
import { fetchOmdbData, OmdbData, OmdbFailureReason } from "@/lib/data/omdb";

const bucketLabel: Record<RatingBucket, string> = { good: "Good", okay: "Okay", bad: "Bad" };

type ScoreState = number | null | "loading";
type OmdbState = OmdbData | null | "loading";
type OmdbErrorState = { reason: OmdbFailureReason } | null;

interface MovieDetailOverlayProps {
  movie: Movie;
  ranked: RankedMovie | undefined;
  session: ComparisonSession | undefined;
  movieById: Map<string, Movie>;
  friendIds: string[];
  onRate: () => void;
  onClose: () => void;
}

export function MovieDetailOverlay({
  movie,
  ranked,
  session,
  movieById,
  friendIds,
  onRate,
  onClose
}: MovieDetailOverlayProps) {
  const [crowdScore, setCrowdScore] = useState<ScoreState>("loading");
  const [friendsScore, setFriendsScore] = useState<ScoreState>("loading");
  const [omdbData, setOmdbData] = useState<OmdbState>("loading");
  const [omdbError, setOmdbError] = useState<OmdbErrorState>(null);
  const [showHistory, setShowHistory] = useState(false);

  // Serialize friendIds to avoid re-firing when parent re-renders with a new array reference
  const friendIdsKey = friendIds.join(",");

  useEffect(() => {
    let cancelled = false;
    setCrowdScore("loading");
    setFriendsScore("loading");
    setOmdbData("loading");
    setOmdbError(null);
    setShowHistory(false);

    fetchCrowdScore(movie.id)
      .then((v) => { if (!cancelled) setCrowdScore(v); })
      .catch(() => { if (!cancelled) setCrowdScore(null); });

    fetchFriendsScore(movie.id, friendIds)
      .then((v) => { if (!cancelled) setFriendsScore(v); })
      .catch(() => { if (!cancelled) setFriendsScore(null); });

    fetchOmdbData(movie.title)
      .then(({ data, reason }) => {
        if (cancelled) return;
        setOmdbData(data);
        setOmdbError(data ? null : reason ? { reason } : null);
      })
      .catch(() => { if (!cancelled) setOmdbData(null); });

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [movie.id, movie.title, friendIdsKey]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Lock body scroll while overlay is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  function fmtScore(value: ScoreState): string {
    if (value === "loading") return "…";
    if (value === null) return "—";
    return value.toFixed(1);
  }

  // Typed shorthand: null when loading or not found, OmdbData when resolved
  const omdb: OmdbData | null = omdbData !== "loading" ? omdbData : null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="overlay-title"
      className="fixed inset-0 z-20 overflow-y-auto bg-black/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="mx-auto my-8 w-full max-w-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="surface overflow-hidden">
          {/* Poster + info row */}
          <div className="flex flex-col sm:flex-row">
            {/* Poster */}
            <div className="relative h-64 w-full shrink-0 bg-zinc-900/60 sm:h-auto sm:w-48">
              {omdbData === "loading" && (
                <div className="flex h-full min-h-[12rem] items-center justify-center">
                  <span className="font-mono text-xs text-zinc-700">…</span>
                </div>
              )}
              {omdbData !== "loading" && omdb?.poster && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={omdb.poster}
                  alt={movie.title}
                  className="h-full w-full object-cover"
                />
              )}
              {omdbData !== "loading" && !omdb?.poster && (
                <div className="flex h-full min-h-[12rem] items-center justify-center p-4">
                  <span className="font-display text-sm italic text-zinc-600">{movie.title}</span>
                </div>
              )}
            </div>

            {/* Metadata + scores */}
            <div className="flex flex-1 flex-col p-5">
              {ranked && (
                <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-zinc-600">
                  {bucketLabel[ranked.bucket]}
                </p>
              )}

              <h2 id="overlay-title" className="mt-1 font-display text-2xl font-light italic leading-tight text-zinc-100">
                {movie.title}
              </h2>

              {omdb && (
                <p className="mt-1 font-mono text-[10px] tracking-[0.15em] uppercase text-zinc-600">
                  {[omdb.genre, omdb.director, omdb.year].filter(Boolean).join(" · ")}
                </p>
              )}

              {omdbData === "loading" && (
                <p className="mt-3 font-mono text-xs text-zinc-700">Loading details…</p>
              )}

              {omdbData === null && (
                <p className="mt-3 font-mono text-xs text-zinc-700">
                  {omdbError?.reason === "missing_key"
                    ? "OMDb is not configured (missing OMDB_API_KEY)."
                    : omdbError?.reason === "invalid_key"
                      ? "OMDb API key is invalid."
                      : omdbError?.reason === "rate_limited"
                        ? "OMDb rate limit reached. Try again later."
                    : omdbError?.reason === "request_failed"
                      ? "Could not reach OMDb right now."
                      : "No details found."}
                </p>
              )}

              {omdb?.plot && (
                <p className="mt-3 text-sm leading-relaxed text-zinc-400">{omdb.plot}</p>
              )}

              {omdb?.actors && (
                <p className="mt-3 font-mono text-xs text-zinc-600">
                  <span className="text-zinc-700">Cast · </span>
                  {omdb.actors}
                </p>
              )}

              {omdb && omdb.imdbRating !== "N/A" && (
                <p className="mt-2 font-mono text-xs text-accent">
                  IMDb {omdb.imdbRating}
                </p>
              )}

              {/* Three score columns */}
              <div className="mt-5 grid grid-cols-3 divide-x divide-line border-t border-line pt-4">
                <div className="pl-0 pr-2 text-center">
                  <p className="font-mono text-2xl font-light text-zinc-100">
                    {ranked ? ranked.score.toFixed(1) : "—"}
                  </p>
                  <p className="mt-1 font-mono text-[9px] tracking-[0.15em] uppercase text-zinc-600">
                    Your Rating
                  </p>
                </div>
                <div className="px-2 text-center">
                  <p className="font-mono text-2xl font-light text-zinc-100">{fmtScore(friendsScore)}</p>
                  <p className="mt-1 font-mono text-[9px] tracking-[0.15em] uppercase text-zinc-600">
                    Friends Avg
                  </p>
                </div>
                <div className="pl-2 pr-0 text-center">
                  <p className="font-mono text-2xl font-light text-zinc-100">{fmtScore(crowdScore)}</p>
                  <p className="mt-1 font-mono text-[9px] tracking-[0.15em] uppercase text-zinc-600">
                    Crowd Score
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-5 flex items-center gap-3">
                <button className="btn-primary" onClick={onRate}>
                  Rate
                </button>
                <button className="btn" onClick={onClose}>
                  Close
                </button>
              </div>
            </div>
          </div>

          {/* Comparison history — collapsible, only for ranked movies */}
          {ranked && (
            <div className="border-t border-line">
              <button
                className="flex w-full items-center justify-between px-5 py-3 text-left transition-colors hover:bg-zinc-900/30"
                onClick={() => setShowHistory((h) => !h)}
              >
                <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-zinc-600">
                  Comparison history
                </span>
                <span className="font-mono text-xs text-zinc-700">{showHistory ? "▲" : "▼"}</span>
              </button>
              {showHistory && (
                <ul className="max-h-48 space-y-1.5 overflow-y-auto px-5 pb-4">
                  {session?.comparisons.length ? (
                    session.comparisons.map((c) => (
                      <li key={c.id} className="rounded border border-line/50 px-3 py-2 text-sm">
                        <span className="text-zinc-400">vs. </span>
                        <span className="font-display text-zinc-200">
                          {movieById.get(c.existingMovieId)?.title ?? "Unknown"}
                        </span>
                        <span className="ml-2 font-mono text-[10px] uppercase tracking-wider text-zinc-600">
                          → {c.choice}
                        </span>
                      </li>
                    ))
                  ) : (
                    <li className="font-mono text-xs text-zinc-700">No comparisons required.</li>
                  )}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
