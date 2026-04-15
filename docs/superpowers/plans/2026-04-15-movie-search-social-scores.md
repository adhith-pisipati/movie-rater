# Movie Search + Social Scores Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a global search bar above the tab nav that lets users find any movie and see their rating, friends' average, and crowd average in a detail card.

**Architecture:** Client-side search filters `state.movies` (already in memory). Clicking a result opens a `MovieScoreCard` modal that fires two on-demand Supabase queries — `fetchCrowdScore` and `fetchFriendsScore` — for the selected movie. Friend IDs come from the existing `friendships` state. No schema changes required.

**Tech Stack:** Next.js 14, React, Supabase JS client, TypeScript, Tailwind CSS, Cormorant Garamond / DM Mono fonts (existing design system)

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `src/lib/data/ratings.ts` | Modify | Add `fetchCrowdScore` and `fetchFriendsScore` |
| `src/components/MovieSearchBar.tsx` | Create | Search input + dropdown of matching movies |
| `src/components/MovieScoreCard.tsx` | Create | Modal showing Your Rating / Friends Avg / Crowd Score |
| `src/app/page.tsx` | Modify | Add `scoreCardMovieId` state, `friendIds` memo, render search bar and score card |

---

## Task 1: Add fetchCrowdScore and fetchFriendsScore

**Files:**
- Modify: `src/lib/data/ratings.ts`

- [ ] **Step 1: Append the two new functions to the bottom of `src/lib/data/ratings.ts`**

```typescript
export async function fetchCrowdScore(movieId: string): Promise<number | null> {
  const { data, error } = await supabase
    .from("ratings")
    .select("score")
    .eq("movie_id", movieId);
  if (error) throw error;
  if (!data || data.length === 0) return null;
  const scores = data.map((row: { score: number }) => row.score);
  const avg = scores.reduce((sum, s) => sum + s, 0) / scores.length;
  return Math.round(avg * 10) / 10;
}

export async function fetchFriendsScore(movieId: string, friendIds: string[]): Promise<number | null> {
  if (friendIds.length === 0) return null;
  const { data, error } = await supabase
    .from("ratings")
    .select("score")
    .eq("movie_id", movieId)
    .in("user_id", friendIds);
  if (error) throw error;
  if (!data || data.length === 0) return null;
  const scores = data.map((row: { score: number }) => row.score);
  const avg = scores.reduce((sum, s) => sum + s, 0) / scores.length;
  return Math.round(avg * 10) / 10;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
~/.nvm/versions/node/v24.14.1/bin/node node_modules/.bin/tsc --noEmit 2>&1 | grep -v node_modules
```

Expected: only the pre-existing `@supabase/supabase-js` errors, nothing new.

- [ ] **Step 3: Commit**

```bash
git add src/lib/data/ratings.ts
git commit -m "feat: add fetchCrowdScore and fetchFriendsScore to ratings data layer"
```

---

## Task 2: Create MovieSearchBar component

**Files:**
- Create: `src/components/MovieSearchBar.tsx`

- [ ] **Step 1: Create the file**

```typescript
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
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
~/.nvm/versions/node/v24.14.1/bin/node node_modules/.bin/tsc --noEmit 2>&1 | grep -v node_modules
```

Expected: only pre-existing errors, nothing new.

- [ ] **Step 3: Commit**

```bash
git add src/components/MovieSearchBar.tsx
git commit -m "feat: add MovieSearchBar component"
```

---

## Task 3: Create MovieScoreCard component

**Files:**
- Create: `src/components/MovieScoreCard.tsx`

This modal opens when a search result is clicked. It immediately shows the user's own score (from memory), then fetches crowd and friends scores on mount.

- [ ] **Step 1: Create the file**

```typescript
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

  useEffect(() => {
    void fetchCrowdScore(movie.id)
      .then(setCrowdScore)
      .catch(() => setCrowdScore(null));
    void fetchFriendsScore(movie.id, friendIds)
      .then(setFriendsScore)
      .catch(() => setFriendsScore(null));
  }, [movie.id, friendIds]);

  function fmt(value: ScoreState): string {
    if (value === "loading") return "…";
    if (value === null) return "—";
    return value.toFixed(1);
  }

  return (
    <div
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
          <div className="px-2 text-center first:pl-0 last:pr-0">
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
          <div className="px-2 text-center first:pl-0 last:pr-0">
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
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
~/.nvm/versions/node/v24.14.1/bin/node node_modules/.bin/tsc --noEmit 2>&1 | grep -v node_modules
```

Expected: only pre-existing errors, nothing new.

- [ ] **Step 3: Commit**

```bash
git add src/components/MovieScoreCard.tsx
git commit -m "feat: add MovieScoreCard modal component"
```

---

## Task 4: Wire up page.tsx

**Files:**
- Modify: `src/app/page.tsx`

Four changes: add imports, add state + memo, render search bar above nav, render score card modal.

- [ ] **Step 1: Add imports**

Find the existing component import block (lines 8–12 in current file). Add the two new imports:

```typescript
import { MovieScoreCard } from "@/components/MovieScoreCard";
import { MovieSearchBar } from "@/components/MovieSearchBar";
```

- [ ] **Step 2: Add scoreCardMovieId state and friendIds memo**

After the existing `const [detailMovieId, setDetailMovieId] = useState<string | null>(null);` line, add:

```typescript
const [scoreCardMovieId, setScoreCardMovieId] = useState<string | null>(null);
```

After the existing `const movieById = useMemo(...)` line, add:

```typescript
const friendIds = useMemo(
  () => friendships.friends.map((f) => f.friendProfile.id),
  [friendships.friends]
);
```

- [ ] **Step 3: Render MovieSearchBar above the nav**

Find the `{/* Navigation */}` comment in the return block. Directly above it, add:

```typescript
<MovieSearchBar
  movies={state.movies}
  rankedById={rankedById}
  haventWatchedAtByMovie={state.haventWatchedAtByMovie}
  removedAtByMovie={state.removedAtByMovie}
  onSelectMovie={(movie) => setScoreCardMovieId(movie.id)}
/>
```

- [ ] **Step 4: Render MovieScoreCard modal**

Find the block that renders `{detailMovie && detailRanking && <MovieDetailDrawer ... />}`. Directly after its closing brace, add:

```typescript
{scoreCardMovieId && movieById.get(scoreCardMovieId) && (
  <MovieScoreCard
    movie={movieById.get(scoreCardMovieId)!}
    ranked={rankedById.get(scoreCardMovieId)}
    friendIds={friendIds}
    onRate={() => {
      setScoreCardMovieId(null);
      startRating(scoreCardMovieId);
    }}
    onClose={() => setScoreCardMovieId(null)}
  />
)}
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
~/.nvm/versions/node/v24.14.1/bin/node node_modules/.bin/tsc --noEmit 2>&1 | grep -v node_modules
```

Expected: only pre-existing errors, nothing new.

- [ ] **Step 6: Run the dev server and manually test**

```bash
~/.nvm/versions/node/v24.14.1/bin/npm run dev
```

Open `http://localhost:3000` and verify:

1. A search input appears above the tab navigation
2. Typing a movie title shows a dropdown with matching results and their status labels
3. Clicking a result opens the score card modal with the movie title
4. Your Rating shows your score if you've rated it, or `—` if not
5. Friends Avg and Crowd Score show `…` briefly then resolve to a number or `—`
6. The Rate button closes the modal and opens the rating flow
7. Clicking outside the modal closes it
8. Pressing Escape while the dropdown is open closes it

- [ ] **Step 7: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: wire up global movie search and score card in page.tsx"
```
