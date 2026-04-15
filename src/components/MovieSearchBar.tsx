"use client";

import { useEffect, useRef, useState } from "react";
import { Movie, RankedMovie, RatingBucket } from "@/lib/types";

const bucketLabel: Record<RatingBucket, string> = { good: "Good", okay: "Okay", bad: "Bad" };

interface MovieSearchBarProps {
  movies: Movie[];
  rankedById: Map<string, RankedMovie>;
  haventWatchedAtByMovie: Record<string, string>;
  removedAtByMovie: Record<string, string>;
  onSelectMovie: (movie: Movie) => void;
}

export function MovieSearchBar({
  movies,
  rankedById,
  haventWatchedAtByMovie,
  removedAtByMovie,
  onSelectMovie
}: MovieSearchBarProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const results =
    query.trim().length === 0
      ? []
      : movies
          .filter((m) => m.title.toLowerCase().includes(query.toLowerCase()))
          .slice(0, 8);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  function getStatusLabel(movie: Movie): string {
    const rank = rankedById.get(movie.id);
    if (rank) return bucketLabel[rank.bucket];
    if (haventWatchedAtByMovie[movie.id]) return "Haven't watched";
    if (removedAtByMovie[movie.id]) return "Removed";
    return "Not rated";
  }

  return (
    <div ref={ref} className="relative mb-6">
      <input
        className="w-full rounded border border-line bg-transparent px-4 py-2.5 text-sm text-zinc-200 outline-none transition-colors placeholder:text-zinc-700 focus:border-accent/60"
        placeholder="Search any film…"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => { if (query.trim().length > 0) setOpen(true); }}
      />
      {open && results.length > 0 && (
        <ul className="absolute left-0 right-0 top-full z-10 mt-1 overflow-hidden rounded border border-line bg-cardBg shadow-xl shadow-black/40">
          {results.map((movie) => (
            <li key={movie.id} className="border-b border-line/30 last:border-0">
              <button
                className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-zinc-800/50"
                onClick={() => {
                  onSelectMovie(movie);
                  setOpen(false);
                  setQuery("");
                }}
              >
                <span className="font-display text-base text-zinc-100">{movie.title}</span>
                <span className="ml-4 shrink-0 font-mono text-[10px] tracking-[0.15em] uppercase text-zinc-600">
                  {getStatusLabel(movie)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
