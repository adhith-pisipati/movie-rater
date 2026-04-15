# Movie Removal Options Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a user clicks 'x' on a movie, show a popover with "Remove for me" and (if they created it) "Remove globally".

**Architecture:** Add `createdBy` to the `Movie` type and fetch it from Supabase. Create a shared `RemovePopover` component used by both `MovieCard` and `RankingsView`. Add a `deleteMovieGlobally` DB function. Wire up a new `handleRemoveMovieGlobally` handler in `page.tsx`.

**Tech Stack:** Next.js 14, React, Supabase JS client, TypeScript, Tailwind CSS

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `src/lib/supabase/types.ts` | Modify | Add `created_by` to `MovieRow` |
| `src/lib/types.ts` | Modify | Add `createdBy` to `Movie` |
| `src/lib/data/movies.ts` | Modify | Map `createdBy` in `fetchMovies`; add `deleteMovieGlobally` |
| `src/components/RemovePopover.tsx` | Create | Reusable popover with "Remove for me" / "Remove globally" |
| `src/components/MovieCard.tsx` | Modify | Use `RemovePopover`, accept `currentUserId` + `onRemoveGlobally` |
| `src/components/RankingsView.tsx` | Modify | Use `RemovePopover`, accept `currentUserId` + `onRemoveGlobally` |
| `src/app/page.tsx` | Modify | Add `handleRemoveMovieGlobally`, pass new props to cards |

---

## Task 1: Extend Movie type to include createdBy

**Files:**
- Modify: `src/lib/supabase/types.ts`
- Modify: `src/lib/types.ts`
- Modify: `src/lib/data/movies.ts`

- [ ] **Step 1: Add `created_by` to MovieRow**

In `src/lib/supabase/types.ts`, update `MovieRow`:

```typescript
export interface MovieRow {
  id: string;
  title: string;
  year: number | null;
  normalized_title: string;
  created_at: string;
  created_by: string | null;
}
```

- [ ] **Step 2: Add `createdBy` to Movie**

In `src/lib/types.ts`, update `Movie`:

```typescript
export interface Movie {
  id: string;
  title: string;
  year?: number;
  createdAt: string;
  createdBy?: string;
}
```

- [ ] **Step 3: Map createdBy in fetchMovies**

In `src/lib/data/movies.ts`, update the `fetchMovies` return mapping:

```typescript
export async function fetchMovies(): Promise<Movie[]> {
  const { data, error } = await supabase.from("movies").select("*").order("title");
  if (error) throw error;
  return (data as MovieRow[]).map((row) => ({
    id: row.id,
    title: row.title,
    year: row.year ?? undefined,
    createdAt: row.created_at,
    createdBy: row.created_by ?? undefined
  }));
}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors related to `Movie` or `MovieRow`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/supabase/types.ts src/lib/types.ts src/lib/data/movies.ts
git commit -m "feat: add createdBy field to Movie type and fetchMovies"
```

---

## Task 2: Add deleteMovieGlobally function

**Files:**
- Modify: `src/lib/data/movies.ts`

- [ ] **Step 1: Add the function**

Append to the bottom of `src/lib/data/movies.ts`:

```typescript
export async function deleteMovieGlobally(movieId: string): Promise<void> {
  const { error } = await supabase.from("movies").delete().eq("id", movieId);
  if (error) throw error;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/data/movies.ts
git commit -m "feat: add deleteMovieGlobally function"
```

---

## Task 3: Create RemovePopover component

**Files:**
- Create: `src/components/RemovePopover.tsx`

This component encapsulates the popover open/close state and click-outside logic. It is used by both `MovieCard` and `RankingsView`.

- [ ] **Step 1: Create the file**

```typescript
"use client";

import { useEffect, useRef, useState } from "react";

interface RemovePopoverProps {
  /** Label for the trigger button (e.g. "X") */
  triggerClassName?: string;
  /** Called when user picks "Remove for me" */
  onRemove: () => void;
  /** Called when user picks "Remove globally". If undefined, option is hidden. */
  onRemoveGlobally?: () => void;
}

export function RemovePopover({ triggerClassName, onRemove, onRemoveGlobally }: RemovePopoverProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        className={triggerClassName ?? "rounded px-2 py-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"}
        onClick={() => setOpen((o) => !o)}
      >
        X
      </button>
      {open && (
        <div className="absolute right-0 top-full z-10 mt-1 w-44 rounded border border-line bg-zinc-900 shadow-lg">
          <button
            className="w-full px-3 py-2 text-left text-sm hover:bg-zinc-800"
            onClick={() => {
              setOpen(false);
              onRemove();
            }}
          >
            Remove for me
          </button>
          {onRemoveGlobally && (
            <button
              className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-zinc-800"
              onClick={() => {
                setOpen(false);
                onRemoveGlobally();
              }}
            >
              Remove globally
            </button>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/RemovePopover.tsx
git commit -m "feat: add RemovePopover component"
```

---

## Task 4: Update MovieCard to use RemovePopover

**Files:**
- Modify: `src/components/MovieCard.tsx`

- [ ] **Step 1: Replace MovieCard with popover version**

Replace the entire contents of `src/components/MovieCard.tsx`:

```typescript
import { Movie } from "@/lib/types";
import { RemovePopover } from "@/components/RemovePopover";

interface MovieCardProps {
  movie: Movie;
  bucketLabel: string;
  onRate: () => void;
  onRemove: () => void;
  currentUserId?: string;
  onRemoveGlobally?: () => void;
}

export function MovieCard({ movie, bucketLabel, onRate, onRemove, currentUserId, onRemoveGlobally }: MovieCardProps) {
  const canRemoveGlobally = movie.createdBy && currentUserId && movie.createdBy === currentUserId;

  return (
    <article className="surface relative p-4">
      <div className="absolute right-2 top-2">
        <RemovePopover
          onRemove={onRemove}
          onRemoveGlobally={canRemoveGlobally ? onRemoveGlobally : undefined}
        />
      </div>
      <h3 className="font-medium">{movie.title}</h3>
      <div className="mt-2 space-y-1 text-sm text-zinc-300">
        <p>Bucket: {bucketLabel}</p>
        <p>Rank: -</p>
        <p>Score: -</p>
      </div>
      <div className="mt-4">
        <button className="btn-primary" onClick={onRate}>
          Rate
        </button>
      </div>
    </article>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/MovieCard.tsx
git commit -m "feat: update MovieCard to use RemovePopover"
```

---

## Task 5: Update RankingsView to use RemovePopover

**Files:**
- Modify: `src/components/RankingsView.tsx`

- [ ] **Step 1: Replace RankingsView with popover version**

Replace the entire contents of `src/components/RankingsView.tsx`:

```typescript
import { BUCKETS } from "@/lib/ranking";
import { Movie, RankedMovie, RatingBucket } from "@/lib/types";
import { RemovePopover } from "@/components/RemovePopover";

const bucketLabel: Record<RatingBucket, string> = { good: "Good", okay: "Okay", bad: "Bad" };

interface RankingsViewProps {
  rankings: Record<RatingBucket, string[]>;
  movieById: Map<string, Movie>;
  rankedById: Map<string, RankedMovie>;
  onInspectMovie?: (movieId: string) => void;
  onRemoveMovie?: (movieId: string) => void;
  onRemoveMovieGlobally?: (movieId: string) => void;
  currentUserId?: string;
}

export function RankingsView({
  rankings,
  movieById,
  rankedById,
  onInspectMovie,
  onRemoveMovie,
  onRemoveMovieGlobally,
  currentUserId
}: RankingsViewProps) {
  return (
    <section className="space-y-4">
      {BUCKETS.map((bucket) => (
        <article className="surface p-4" key={bucket}>
          <h2 className="mb-3 text-lg font-semibold">{bucketLabel[bucket]}</h2>
          <ol className="space-y-2">
            {rankings[bucket].length === 0 && <li className="text-sm text-zinc-500">No rated movies here yet.</li>}
            {rankings[bucket].map((movieId, i) => {
              const movie = movieById.get(movieId);
              const rank = rankedById.get(movieId);
              if (!movie || !rank) return null;
              const canRemoveGlobally =
                movie.createdBy && currentUserId && movie.createdBy === currentUserId;
              return (
                <li key={movieId} className="flex items-center justify-between rounded-lg border border-line p-3">
                  <div>
                    <p className="font-medium">
                      #{i + 1} {movie.title}
                    </p>
                    <p className="text-sm text-zinc-400">Overall #{rank.overallRank}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm">{rank.score.toFixed(1)}</p>
                    {onInspectMovie && (
                      <button className="btn" onClick={() => onInspectMovie(movieId)}>
                        Details
                      </button>
                    )}
                    {onRemoveMovie && (
                      <RemovePopover
                        triggerClassName="btn"
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
        </article>
      ))}
    </section>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/RankingsView.tsx
git commit -m "feat: update RankingsView to use RemovePopover"
```

---

## Task 6: Wire up page.tsx

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Import deleteMovieGlobally**

Find the existing import line in `src/app/page.tsx`:

```typescript
import { ensureGlobalMovieCatalogSeeded, fetchMovies, importMoviesByTitles } from "@/lib/data/movies";
```

Replace it with:

```typescript
import { deleteMovieGlobally, ensureGlobalMovieCatalogSeeded, fetchMovies, importMoviesByTitles } from "@/lib/data/movies";
```

- [ ] **Step 2: Add handleRemoveMovieGlobally**

Find `removeMovieForCurrentUser` in `page.tsx` (around line 293). Add the new handler immediately after it (after its closing brace):

```typescript
async function handleRemoveMovieGlobally(movieId: string) {
  if (activeRating?.movieId === movieId) setActiveRating(null);
  if (detailMovieId === movieId) setDetailMovieId(null);
  await deleteMovieGlobally(movieId);
  setState((prev) => {
    const nextState: AppState = {
      ...prev,
      movies: prev.movies.filter((m) => m.id !== movieId),
      rankings: removeMovieFromRankings(prev.rankings, movieId),
      sessions: Object.fromEntries(Object.entries(prev.sessions).filter(([id]) => id !== movieId)),
      ratedAtByMovie: Object.fromEntries(Object.entries(prev.ratedAtByMovie).filter(([id]) => id !== movieId)),
      haventWatchedAtByMovie: Object.fromEntries(
        Object.entries(prev.haventWatchedAtByMovie).filter(([id]) => id !== movieId)
      )
    };
    persistState(nextState);
    return nextState;
  });
}
```

> **Note:** We do NOT add to `removedAtByMovie` here. The movie no longer exists in the DB, so inserting a `user_movie_states` row for it would violate the foreign key constraint. The movie is filtered out of `state.movies` instead.

- [ ] **Step 3: Pass new props to MovieCard**

Find the `<MovieCard ... />` usage in `page.tsx` (around line 390):

```typescript
<MovieCard
  key={movie.id}
  movie={movie}
  bucketLabel={state.haventWatchedAtByMovie[movie.id] ? "Haven't watched" : "Not rated"}
  onRate={() => startRating(movie.id)}
  onRemove={() => removeMovieForCurrentUser(movie.id)}
/>
```

Replace with:

```typescript
<MovieCard
  key={movie.id}
  movie={movie}
  bucketLabel={state.haventWatchedAtByMovie[movie.id] ? "Haven't watched" : "Not rated"}
  onRate={() => startRating(movie.id)}
  onRemove={() => removeMovieForCurrentUser(movie.id)}
  currentUserId={user?.id}
  onRemoveGlobally={() => handleRemoveMovieGlobally(movie.id)}
/>
```

- [ ] **Step 4: Pass new props to RankingsView**

Find the `<RankingsView ... />` usage in `page.tsx` (around line 403):

```typescript
<RankingsView
  rankings={state.rankings}
  movieById={movieById}
  rankedById={rankedById}
  onInspectMovie={setDetailMovieId}
  onRemoveMovie={removeMovieForCurrentUser}
/>
```

Replace with:

```typescript
<RankingsView
  rankings={state.rankings}
  movieById={movieById}
  rankedById={rankedById}
  onInspectMovie={setDetailMovieId}
  onRemoveMovie={removeMovieForCurrentUser}
  onRemoveMovieGlobally={handleRemoveMovieGlobally}
  currentUserId={user?.id}
/>
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Run the dev server and manually test**

```bash
npm run dev
```

Open `http://localhost:3000` and verify:

1. Clicking 'X' on a movie opens a popover with "Remove for me"
2. If you are the creator of the movie, "Remove globally" also appears in the popover
3. If you are NOT the creator, only "Remove for me" appears
4. "Remove for me" hides the movie from your list but it remains in the global catalog
5. "Remove globally" deletes the movie entirely — it disappears for all users
6. Clicking outside the popover closes it with no action

- [ ] **Step 7: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: wire up global movie removal in page.tsx"
```
