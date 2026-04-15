# Movie Search + Social Scores — Design Spec

**Date:** 2026-04-15

## Problem

There is no way to quickly look up a specific movie regardless of which tab it lives in, and no way to see how friends or the broader user base have rated a film.

## Goal

Add a global search bar above the tab navigation that lets users find any movie in the catalog. Clicking a result opens a detail card showing three scores: the user's own rating, an average of friends' ratings, and an average across all users (crowd score).

## Feature Overview

### Search Bar

- Positioned above the tab navigation, full-width
- Client-side filtering of `state.movies` (already fully loaded in memory — no query needed)
- Dropdown appears as user types, showing matching movies with a status tag per result:
  - Bucket label ("Good" / "Okay" / "Bad") if the user has rated it
  - "Not rated" if unrated
  - "Haven't watched" if marked as such
- Clicking a result closes the dropdown and opens the Movie Detail Card
- Pressing Escape or clicking outside dismisses the dropdown with no action
- Empty query hides the dropdown

### Movie Detail Card

A centered modal overlay (consistent with existing `RatingModal` style) showing:

- Movie title in large display font (Cormorant italic)
- Three score columns side by side:
  - **Your Rating** — user's computed score from `rankedById` (e.g. `8.4`), or `—` if unrated
  - **Friends Avg** — average score across accepted friends who have rated this movie, or `—` if none have
  - **Crowd Score** — average score across all users who have rated this movie, or `—`
- Small label beneath each score identifying it
- **Rate** button — triggers the existing `startRating(movieId)` flow, closes the modal
- **Close** button / clicking backdrop closes the modal

### Loading State

When a result is clicked, the modal opens immediately with the title and your own rating (available instantly from memory). Friends Avg and Crowd Score show a loading indicator until the two queries resolve.

## Data Layer

### New functions in `src/lib/data/ratings.ts`

**`fetchCrowdScore(movieId: string): Promise<number | null>`**
```sql
SELECT AVG(score) FROM ratings WHERE movie_id = $1
```
Returns `null` if no ratings exist.

**`fetchFriendsScore(movieId: string, friendIds: string[]): Promise<number | null>`**
```sql
SELECT AVG(score) FROM ratings WHERE movie_id = $1 AND user_id IN (friendIds)
```
Returns `null` if `friendIds` is empty or no friends have rated the movie.

### Data already in memory (no new queries)

| Data | Source |
|------|--------|
| All movies for search | `state.movies` |
| User's own score | `rankedById.get(movieId)?.score` |
| User's bucket/status | `state.rankings`, `state.haventWatchedAtByMovie`, `state.removedAtByMovie` |
| Friend user IDs | `friendships.friends.map(f => f.friendProfile.id)` |

## New Files

| File | Purpose |
|------|---------|
| `src/components/MovieSearchBar.tsx` | Search input + dropdown |
| `src/components/MovieScoreCard.tsx` | Detail modal with three scores |

## Modified Files

| File | Change |
|------|--------|
| `src/lib/data/ratings.ts` | Add `fetchCrowdScore` and `fetchFriendsScore` |
| `src/app/page.tsx` | Render `MovieSearchBar` above nav; handle `onSelectMovie` to open `MovieScoreCard`; pass `friendIds` |

## Out of Scope

- Searching for users (separate feature)
- Sorting/filtering search results
- Showing individual friends' ratings (not an aggregate)
- Caching social scores between searches
