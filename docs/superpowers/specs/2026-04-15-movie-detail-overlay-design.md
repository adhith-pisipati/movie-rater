# Movie Detail Overlay — Design Spec

**Date:** 2026-04-15

## Problem

Movies in the Movies tab and Rankings tab are not clickable. There is no way to see rich metadata (description, poster, cast, director) alongside your personal score and social scores in one view.

## Goal

Make every movie in the app clickable. Clicking opens a full-screen overlay showing: OMDB-sourced metadata (poster, plot, director, cast, genre, IMDb rating) plus the three social scores (Your Rating, Friends Avg, Crowd Score) already built in this project. The overlay also replaces the existing `MovieDetailDrawer` (comparison history side panel).

## Triggering the Overlay

### MovieCard (Movies tab)
- The entire card becomes clickable and opens the overlay
- The Rate button continues to work independently — clicking Rate does not open the overlay, it opens the rating flow directly
- The remove popover (×) continues to work independently

### RankingsView (Rankings tab)
- Each list row becomes clickable and opens the overlay
- The existing "Details" button is removed — the row click replaces it
- The RemovePopover (×) still appears on hover and works independently

### MovieDetailDrawer (deprecated)
- `MovieDetailDrawer` is removed from use in `page.tsx`
- Comparison history moves inside the new overlay as a collapsible section at the bottom

## The Overlay

A full-screen modal overlay using the existing `z-20 bg-black/80 backdrop-blur-sm` pattern. Layout is two-column on desktop, single-column stacked on mobile.

**Left column:**
- Movie poster image from OMDB (`Poster` field), displayed at a fixed height
- Fallback: a placeholder rectangle with the movie title if no poster is available or OMDB returns no data

**Right column (top to bottom):**
- Movie title — `font-display` large italic
- Genre · Director · Year — `font-mono` small caps, separated by `·`
- Plot description — body text
- Cast — `font-mono` small, comma-separated list of top actors
- IMDb rating — amber accent with `⭐` or `IMDb` label

**Divider**

- Three score columns: **Your Rating** · **Friends Avg** · **Crowd Score** — reuses the exact layout from `MovieScoreCard`
- Scores show `…` while loading, `—` if no data

**Footer actions:**
- Rate button — triggers existing `startRating(movieId)` flow and closes overlay
- Close button — dismisses overlay
- Comparison history — collapsible section below footer, shows comparison history for ranked movies (previously in `MovieDetailDrawer`)

**Loading behaviour:**
- OMDB data and social scores both load on-demand when the overlay opens
- Each section shows `…` until its data resolves
- If OMDB returns `Response: "False"`, the poster/metadata area shows a subtle "No details found" message in mono text; scores still load and display normally

**Keyboard:** Escape closes the overlay (same pattern as other modals)

## Data Layer

### New file: `src/lib/data/omdb.ts`

Exports one function:

```typescript
export interface OmdbData {
  title: string;
  year: string;
  plot: string;
  poster: string | null;   // URL or null if "N/A"
  director: string;
  actors: string;
  genre: string;
  imdbRating: string;      // e.g. "8.8" or "N/A"
}

export async function fetchOmdbData(title: string): Promise<OmdbData | null>
```

Calls `https://www.omdbapi.com/?t={encodeURIComponent(title)}&plot=full&apikey={process.env.NEXT_PUBLIC_OMDB_API_KEY}`.

Returns `null` if `Response === "False"` or on network error.

### Reused from existing data layer
- `fetchCrowdScore(movieId)` — `src/lib/data/ratings.ts`
- `fetchFriendsScore(movieId, friendIds)` — `src/lib/data/ratings.ts`

### API key
Stored as `NEXT_PUBLIC_OMDB_API_KEY` in `.env.local`. Free key obtained from https://www.omdbapi.com/apikey.aspx.

## New / Modified Files

| File | Action | Purpose |
|------|--------|---------|
| `src/lib/data/omdb.ts` | Create | OMDB fetch function + types |
| `src/components/MovieDetailOverlay.tsx` | Create | Full-screen detail overlay |
| `src/components/MovieCard.tsx` | Modify | Make card clickable, add `onViewDetails` prop |
| `src/components/RankingsView.tsx` | Modify | Make rows clickable, remove Details button, add `onViewDetails` prop |
| `src/app/page.tsx` | Modify | Replace `detailMovieId`/`MovieDetailDrawer` with `overlayMovieId`/`MovieDetailOverlay`; replace `scoreCardMovieId`/`MovieScoreCard` with the same state |
| `src/components/MovieDetailDrawer.tsx` | Delete | Superseded by `MovieDetailOverlay` |
| `src/components/MovieScoreCard.tsx` | Delete | Superseded by `MovieDetailOverlay` |

## Out of Scope

- Caching OMDB data in the database
- Searching OMDB (search vs exact title match)
- Showing trailer links or external links
- Editing or correcting movie metadata
