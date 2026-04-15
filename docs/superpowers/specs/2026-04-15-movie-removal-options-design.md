# Movie Removal Options — Design Spec

**Date:** 2026-04-15

## Problem

Currently, clicking 'x' on a movie immediately removes it for the current user only (sets `user_movie_states.status = 'removed'`). There is no way to remove a movie from the global catalog. Users who accidentally add a wrong title to the global `movies` table have no way to undo it.

## Goal

When a user clicks 'x' on a movie, present a popover with two options:
- **Remove for me** — existing behavior, user-scoped removal
- **Remove globally** — deletes the movie from the global `movies` table (only available to the user who created the movie)

## UI Behavior

- Clicking 'x' opens a small popover anchored to the button
- Popover contains two buttons: "Remove for me" and (conditionally) "Remove globally"
- "Remove globally" is only shown when `movie.created_by === currentUserId`
- Clicking outside the popover dismisses it with no action
- Popover open/closed state is local to each card component (no global state)
- Both `MovieCard.tsx` and `RankingsView.tsx` get this treatment

## Data Flow

### Remove for me
Calls existing `removeMovieForCurrentUser(movieId)` — no change to current behavior. Sets `user_movie_states.status = 'removed'` for the user.

### Remove globally
1. Calls new `deleteMovieGlobally(movieId)` in `src/lib/data/movies.ts`
   - Deletes the row from `public.movies` where `id = movieId`
   - Cascade on `movies` table handles deletion of related `ratings` and `user_movie_states` rows for all users
2. Calls `removeMovieForCurrentUser(movieId)` to update local client state

Other users who had rated the deleted movie will silently lose those ratings via cascade — acceptable given the small user base (5 friends).

## Files Changed

| File | Change |
|------|--------|
| `src/components/MovieCard.tsx` | Add popover state, two-button UI, accept `creatorId` + `currentUserId` props, accept `onRemoveGlobally` prop |
| `src/components/RankingsView.tsx` | Same popover treatment, pass through new props |
| `src/lib/data/movies.ts` | Add `deleteMovieGlobally(movieId: string)` function |
| `src/app/page.tsx` | Add `handleRemoveMovieGlobally` handler, pass `creatorId`/`currentUserId` down to card components |

## Out of Scope

- Admin roles or permission systems
- Notifications to other users when a movie is removed globally
- Undo functionality
