# Movie Detail Overlay Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every movie in the app clickable, opening a full-screen overlay showing OMDB metadata (poster, plot, director, cast, genre, IMDb rating) alongside the three social scores (Your Rating, Friends Avg, Crowd Score) and comparison history.

**Architecture:** A new `MovieDetailOverlay` component replaces both `MovieScoreCard` and `MovieDetailDrawer`, consolidating two separate state variables (`detailMovieId` + `scoreCardMovieId`) into one (`overlayMovieId`). OMDB data is fetched on-demand by movie title using a new `fetchOmdbData` function. `MovieCard` and `RankingsView` each get an `onViewDetails` prop; the search bar reuses the same state.

**Tech Stack:** Next.js 14, React, Supabase JS client, TypeScript, Tailwind CSS, OMDB API (free tier, `https://www.omdbapi.com`)

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `src/lib/data/omdb.ts` | Create | `fetchOmdbData(title)` — calls OMDB API, returns typed result or null |
| `src/components/MovieDetailOverlay.tsx` | Create | Full-screen overlay: poster + metadata + scores + comparison history |
| `src/components/MovieCard.tsx` | Modify | Add `onViewDetails` prop; make card body clickable |
| `src/components/RankingsView.tsx` | Modify | Replace `onInspectMovie` with `onViewDetails`; make rows clickable; remove Details button |
| `src/app/page.tsx` | Modify | Consolidate to `overlayMovieId` state; wire overlay; update search bar; delete old imports |
| `src/components/MovieDetailDrawer.tsx` | Delete | Superseded by `MovieDetailOverlay` |
| `src/components/MovieScoreCard.tsx` | Delete | Superseded by `MovieDetailOverlay` |

---

## Task 1: Create OMDB data fetcher

**Files:**
- Create: `src/lib/data/omdb.ts`

- [ ] **Step 1: Add your OMDB API key to `.env.local`**

Get a free key at `https://www.omdbapi.com/apikey.aspx` (select Free tier, 1000 requests/day).

Add to `.env.local` in the project root:
```
NEXT_PUBLIC_OMDB_API_KEY=your_key_here
```

- [ ] **Step 2: Create `src/lib/data/omdb.ts`**

```typescript
export interface OmdbData {
  title: string;
  year: string;
  plot: string;
  poster: string | null;
  director: string;
  actors: string;
  genre: string;
  imdbRating: string;
}

export async function fetchOmdbData(title: string): Promise<OmdbData | null> {
  const apiKey = process.env.NEXT_PUBLIC_OMDB_API_KEY;
  if (!apiKey) return null;

  const url = `https://www.omdbapi.com/?t=${encodeURIComponent(title)}&plot=full&apikey=${apiKey}`;

  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json() as Record<string, string>;
    if (data["Response"] === "False") return null;

    return {
      title: data["Title"] ?? title,
      year: data["Year"] ?? "",
      plot: data["Plot"] ?? "",
      poster: data["Poster"] && data["Poster"] !== "N/A" ? data["Poster"] : null,
      director: data["Director"] ?? "",
      actors: data["Actors"] ?? "",
      genre: data["Genre"] ?? "",
      imdbRating: data["imdbRating"] ?? "N/A"
    };
  } catch {
    return null;
  }
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
~/.nvm/versions/node/v24.14.1/bin/node node_modules/.bin/tsc --noEmit 2>&1 | grep -v node_modules
```

Expected: only the pre-existing `@supabase/supabase-js` errors, nothing new.

- [ ] **Step 4: Commit**

```bash
git add src/lib/data/omdb.ts .env.local
git commit -m "feat: add OMDB data fetcher"
```

> **Note:** If `.env.local` is in `.gitignore` (it should be), only `omdb.ts` will be staged. That is correct — never commit API keys.

---

## Task 2: Create MovieDetailOverlay component

**Files:**
- Create: `src/components/MovieDetailOverlay.tsx`

This component replaces both `MovieScoreCard` and `MovieDetailDrawer`. It fetches OMDB data, crowd score, and friends score in parallel on mount with a stale-fetch cancellation guard.

- [ ] **Step 1: Create `src/components/MovieDetailOverlay.tsx`**

```typescript
"use client";

import { useEffect, useState } from "react";
import { Movie, RankedMovie, ComparisonSession, RatingBucket } from "@/lib/types";
import { fetchCrowdScore, fetchFriendsScore } from "@/lib/data/ratings";
import { fetchOmdbData, OmdbData } from "@/lib/data/omdb";

const bucketLabel: Record<RatingBucket, string> = { good: "Good", okay: "Okay", bad: "Bad" };

type ScoreState = number | null | "loading";
type OmdbState = OmdbData | null | "loading";

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
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setCrowdScore("loading");
    setFriendsScore("loading");
    setOmdbData("loading");

    fetchCrowdScore(movie.id)
      .then((v) => { if (!cancelled) setCrowdScore(v); })
      .catch(() => { if (!cancelled) setCrowdScore(null); });

    fetchFriendsScore(movie.id, friendIds)
      .then((v) => { if (!cancelled) setFriendsScore(v); })
      .catch(() => { if (!cancelled) setFriendsScore(null); });

    fetchOmdbData(movie.title)
      .then((v) => { if (!cancelled) setOmdbData(v); })
      .catch(() => { if (!cancelled) setOmdbData(null); });

    return () => { cancelled = true; };
  }, [movie.id, movie.title, friendIds]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

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
      aria-label={movie.title}
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

              <h2 className="mt-1 font-display text-2xl font-light italic leading-tight text-zinc-100">
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
                <p className="mt-3 font-mono text-xs text-zinc-700">No details found.</p>
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
```

> **Note on the poster:** A plain `<img>` tag is used instead of Next.js `<Image>` to avoid adding OMDB's CDN domain to `next.config.js`. This is correct for an external image URL.

- [ ] **Step 2: Verify TypeScript compiles**

```bash
~/.nvm/versions/node/v24.14.1/bin/node node_modules/.bin/tsc --noEmit 2>&1 | grep -v node_modules
```

Expected: only pre-existing errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/MovieDetailOverlay.tsx
git commit -m "feat: add MovieDetailOverlay component"
```

---

## Task 3: Update MovieCard to be clickable

**Files:**
- Modify: `src/components/MovieCard.tsx`

Add `onViewDetails?: () => void` prop. The card body becomes a click target for the overlay. Rate button and RemovePopover stop propagation so they don't also trigger the overlay.

- [ ] **Step 1: Replace the entire contents of `src/components/MovieCard.tsx`**

```typescript
import { Movie } from "@/lib/types";
import { RemovePopover } from "@/components/RemovePopover";

interface MovieCardProps {
  movie: Movie;
  bucketLabel: string;
  onRate: () => void;
  onRemove: () => void;
  onViewDetails?: () => void;
  currentUserId?: string;
  onRemoveGlobally?: () => void;
}

export function MovieCard({
  movie,
  bucketLabel,
  onRate,
  onRemove,
  onViewDetails,
  currentUserId,
  onRemoveGlobally
}: MovieCardProps) {
  const canRemoveGlobally = !!movie.createdBy && !!currentUserId && movie.createdBy === currentUserId;

  return (
    <article
      className="surface group relative flex cursor-pointer flex-col justify-between p-4 transition-colors duration-150 hover:border-line/70"
      onClick={onViewDetails}
    >
      <div
        className="absolute right-2 top-2 opacity-0 transition-opacity duration-150 group-hover:opacity-100"
        onClick={(e) => e.stopPropagation()}
      >
        <RemovePopover
          triggerLabel={`Remove ${movie.title}`}
          onRemove={onRemove}
          onRemoveGlobally={canRemoveGlobally ? onRemoveGlobally : undefined}
        />
      </div>

      <div className="pr-6">
        <h3 className="font-display text-lg font-normal leading-snug text-zinc-100">{movie.title}</h3>
        <p className="mt-1.5 font-mono text-[10px] tracking-[0.15em] uppercase text-zinc-600">{bucketLabel}</p>
      </div>

      <div className="mt-5" onClick={(e) => e.stopPropagation()}>
        <button className="btn-primary text-xs" onClick={onRate}>
          Rate
        </button>
      </div>
    </article>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
~/.nvm/versions/node/v24.14.1/bin/node node_modules/.bin/tsc --noEmit 2>&1 | grep -v node_modules
```

Expected: only pre-existing errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/MovieCard.tsx
git commit -m "feat: make MovieCard clickable for detail overlay"
```

---

## Task 4: Update RankingsView to be clickable

**Files:**
- Modify: `src/components/RankingsView.tsx`

Replace `onInspectMovie` with `onViewDetails`. Make each list row clickable. Remove the Details button. RemovePopover stops propagation.

- [ ] **Step 1: Replace the entire contents of `src/components/RankingsView.tsx`**

```typescript
import { BUCKETS } from "@/lib/ranking";
import { Movie, RankedMovie, RatingBucket } from "@/lib/types";
import { RemovePopover } from "@/components/RemovePopover";

const bucketLabel: Record<RatingBucket, string> = { good: "Good", okay: "Okay", bad: "Bad" };
const bucketDot: Record<RatingBucket, string> = {
  good: "bg-good",
  okay: "bg-okay",
  bad: "bg-bad"
};

interface RankingsViewProps {
  rankings: Record<RatingBucket, string[]>;
  movieById: Map<string, Movie>;
  rankedById: Map<string, RankedMovie>;
  onViewDetails?: (movieId: string) => void;
  onRemoveMovie?: (movieId: string) => void;
  onRemoveMovieGlobally?: (movieId: string) => void;
  currentUserId?: string;
}

export function RankingsView({
  rankings,
  movieById,
  rankedById,
  onViewDetails,
  onRemoveMovie,
  onRemoveMovieGlobally,
  currentUserId
}: RankingsViewProps) {
  return (
    <div className="space-y-10">
      {BUCKETS.map((bucket) => (
        <section key={bucket}>
          <div className="mb-1 flex items-center gap-3">
            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${bucketDot[bucket]}`} />
            <h2 className="font-mono text-[11px] tracking-[0.2em] uppercase text-zinc-500">
              {bucketLabel[bucket]}
            </h2>
            <div className="h-px flex-1 bg-line" />
          </div>

          <ol>
            {rankings[bucket].length === 0 && (
              <li className="py-4 font-mono text-xs text-zinc-700">Nothing here yet.</li>
            )}
            {rankings[bucket].map((movieId, i) => {
              const movie = movieById.get(movieId);
              const rank = rankedById.get(movieId);
              if (!movie || !rank) return null;
              const canRemoveGlobally =
                !!movie.createdBy && !!currentUserId && movie.createdBy === currentUserId;
              return (
                <li
                  key={movieId}
                  className="group flex cursor-pointer items-center gap-4 rounded border-b border-line/30 py-3 last:border-0 hover:bg-zinc-900/30 transition-colors duration-150"
                  onClick={() => onViewDetails?.(movieId)}
                >
                  <span className="w-7 shrink-0 font-mono text-xs text-zinc-700">
                    {String(i + 1).padStart(2, "0")}
                  </span>

                  <span className="min-w-0 flex-1 truncate font-display text-base leading-snug text-zinc-100">
                    {movie.title}
                  </span>

                  <span className="shrink-0 font-mono text-xs text-zinc-600">
                    {rank.score.toFixed(1)}
                  </span>

                  <div
                    className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {onRemoveMovie && (
                      <RemovePopover
                        triggerClassName="flex h-6 w-6 items-center justify-center rounded border border-line text-zinc-500 text-sm transition-colors hover:border-accent/50 hover:text-accent"
                        triggerLabel={`Remove ${movie.title}`}
                        onRemove={() => onRemoveMovie(movieId)}
                        onRemoveGlobally={
                          canRemoveGlobally && onRemoveMovieGlobally
                            ? () => onRemoveMovieGlobally(movieId)
                            : undefined
                        }
                      />
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
~/.nvm/versions/node/v24.14.1/bin/node node_modules/.bin/tsc --noEmit 2>&1 | grep -v node_modules
```

Expected: TypeScript will now complain that `onInspectMovie` is passed to `RankingsView` in `page.tsx` but no longer exists in the interface. This is expected and will be fixed in Task 5.

- [ ] **Step 3: Commit**

```bash
git add src/components/RankingsView.tsx
git commit -m "feat: make RankingsView rows clickable, replace Details button with onViewDetails"
```

---

## Task 5: Wire up page.tsx and delete old components

**Files:**
- Modify: `src/app/page.tsx`
- Delete: `src/components/MovieDetailDrawer.tsx`
- Delete: `src/components/MovieScoreCard.tsx`

This task consolidates `detailMovieId` + `scoreCardMovieId` into a single `overlayMovieId`, wires the new overlay, and cleans up all references to the two deleted components.

- [ ] **Step 1: Update imports in `src/app/page.tsx`**

Remove these two import lines:
```typescript
import { MovieDetailDrawer } from "@/components/MovieDetailDrawer";
import { MovieScoreCard } from "@/components/MovieScoreCard";
```

Add this import in their place:
```typescript
import { MovieDetailOverlay } from "@/components/MovieDetailOverlay";
```

- [ ] **Step 2: Replace the two old state variables with one**

Find these two lines (around line 55–56):
```typescript
const [detailMovieId, setDetailMovieId] = useState<string | null>(null);
const [scoreCardMovieId, setScoreCardMovieId] = useState<string | null>(null);
```

Replace with:
```typescript
const [overlayMovieId, setOverlayMovieId] = useState<string | null>(null);
```

- [ ] **Step 3: Replace handleScoreCardClose with handleOverlayClose**

Find:
```typescript
const handleScoreCardClose = useCallback(() => setScoreCardMovieId(null), []);
```

Replace with:
```typescript
const handleOverlayClose = useCallback(() => setOverlayMovieId(null), []);
```

- [ ] **Step 4: Remove the three derived detail values**

Find and delete these three lines (around lines 383–385 before this change):
```typescript
const detailMovie = detailMovieId ? movieById.get(detailMovieId) : null;
const detailRanking = detailMovieId ? rankedById.get(detailMovieId) : null;
const detailSession = detailMovieId ? state.sessions[detailMovieId] : null;
```

- [ ] **Step 5: Update removeMovieForCurrentUser**

Find these two lines inside `removeMovieForCurrentUser`:
```typescript
if (detailMovieId === movieId) setDetailMovieId(null);
if (scoreCardMovieId === movieId) setScoreCardMovieId(null);
```

Replace with:
```typescript
if (overlayMovieId === movieId) setOverlayMovieId(null);
```

- [ ] **Step 6: Update handleRemoveMovieGlobally**

Find these two lines inside `handleRemoveMovieGlobally`:
```typescript
if (detailMovieId === movieId) setDetailMovieId(null);
if (scoreCardMovieId === movieId) setScoreCardMovieId(null);
```

Replace with:
```typescript
if (overlayMovieId === movieId) setOverlayMovieId(null);
```

- [ ] **Step 7: Pass onViewDetails to MovieCard**

Find the `<MovieCard>` usage. Add the new prop:
```typescript
onViewDetails={() => setOverlayMovieId(movie.id)}
```

The full `<MovieCard>` call should look like:
```typescript
<MovieCard
  key={movie.id}
  movie={movie}
  bucketLabel={state.haventWatchedAtByMovie[movie.id] ? "Haven't watched" : "Not rated"}
  onRate={() => startRating(movie.id)}
  onRemove={() => removeMovieForCurrentUser(movie.id)}
  onViewDetails={() => setOverlayMovieId(movie.id)}
  currentUserId={user?.id}
  onRemoveGlobally={() => handleRemoveMovieGlobally(movie.id)}
/>
```

- [ ] **Step 8: Update RankingsView props**

Find the `<RankingsView>` usage. Replace `onInspectMovie={setDetailMovieId}` with `onViewDetails={setOverlayMovieId}`:

```typescript
<RankingsView
  rankings={state.rankings}
  movieById={movieById}
  rankedById={rankedById}
  onViewDetails={setOverlayMovieId}
  onRemoveMovie={removeMovieForCurrentUser}
  onRemoveMovieGlobally={handleRemoveMovieGlobally}
  currentUserId={user?.id}
/>
```

- [ ] **Step 9: Update MovieSearchBar's onSelectMovie**

Find:
```typescript
onSelectMovie={(movie) => setScoreCardMovieId(movie.id)}
```

Replace with:
```typescript
onSelectMovie={(movie) => setOverlayMovieId(movie.id)}
```

- [ ] **Step 10: Replace the two old modal blocks with MovieDetailOverlay**

Find and delete the `MovieDetailDrawer` block:
```typescript
{detailMovie && detailRanking && (
  <MovieDetailDrawer
    movie={detailMovie}
    rank={detailRanking}
    session={detailSession ?? undefined}
    movieById={movieById}
    onClose={() => setDetailMovieId(null)}
    onRerate={() => {
      setDetailMovieId(null);
      startRating(detailMovie.id);
    }}
  />
)}
```

Find and delete the `MovieScoreCard` block:
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
    onClose={handleScoreCardClose}
  />
)}
```

Add the new `MovieDetailOverlay` block in their place:
```typescript
{overlayMovieId && movieById.get(overlayMovieId) && (
  <MovieDetailOverlay
    movie={movieById.get(overlayMovieId)!}
    ranked={rankedById.get(overlayMovieId)}
    session={state.sessions[overlayMovieId] ?? undefined}
    movieById={movieById}
    friendIds={friendIds}
    onRate={() => {
      setOverlayMovieId(null);
      startRating(overlayMovieId);
    }}
    onClose={handleOverlayClose}
  />
)}
```

- [ ] **Step 11: Verify TypeScript compiles cleanly**

```bash
~/.nvm/versions/node/v24.14.1/bin/node node_modules/.bin/tsc --noEmit 2>&1 | grep -v node_modules
```

Expected: only the pre-existing `@supabase/supabase-js` errors. No errors about `detailMovieId`, `scoreCardMovieId`, `onInspectMovie`, or missing components.

- [ ] **Step 12: Delete the two superseded component files**

```bash
rm src/components/MovieDetailDrawer.tsx
rm src/components/MovieScoreCard.tsx
```

- [ ] **Step 13: Verify TypeScript still compiles after deletion**

```bash
~/.nvm/versions/node/v24.14.1/bin/node node_modules/.bin/tsc --noEmit 2>&1 | grep -v node_modules
```

Expected: same pre-existing errors only.

- [ ] **Step 14: Run the dev server and manually test**

```bash
~/.nvm/versions/node/v24.14.1/bin/npm run dev
```

Open `http://localhost:3000` and verify:

1. Clicking a movie card on the Movies tab opens the overlay
2. Rate button on the card does NOT open the overlay — it opens the rating flow directly
3. Clicking a ranking row opens the overlay
4. The overlay shows: title, genre/director/year, plot, cast, IMDb rating, poster (if available)
5. If OMDB has no match, "No details found" shows instead; scores still load
6. Three score columns (Your Rating, Friends Avg, Crowd Score) show correctly
7. Ranked movies show a "Comparison history" toggle at the bottom
8. Search bar results still open the overlay
9. Escape closes the overlay
10. Clicking the backdrop closes the overlay

- [ ] **Step 15: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: wire up MovieDetailOverlay, consolidate overlay state, remove old drawer and score card"
```
