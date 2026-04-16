# Movie Import Verifier — Design Spec

**Date:** 2026-04-16

## Problem

The current import panel accepts multiple titles at once via a textarea and does silent verification after the fact. Users have no real-time feedback on whether a title is recognised before it's added, and there's no way to correct a near-miss before import.

## Goal

Replace the multi-movie textarea with a single-movie input that verifies the title against OMDB before adding it to the catalog. Exact matches are auto-added with a confirmation message. Near-misses surface a "Did you mean X?" prompt. Not-found titles show a clear error.

## User Flow

1. User types a single movie title into a text input and clicks **"Verify & Add"**
2. App calls `/api/omdb?title={title}` (existing server-side route)
3. Three outcomes:

### Outcome A — Exact match
OMDB canonical title matches what the user typed (case-insensitive, trimmed).
- Movie is imported immediately using the canonical title
- Input clears
- Inline confirmation: **"✓ [Canonical Title] added"**

### Outcome B — Close match
OMDB returns a result but the canonical title differs from what was typed (e.g. user typed "dark knight" → OMDB returns "The Dark Knight").
- Movie is NOT imported yet
- Inline prompt: **"Did you mean [Canonical Title]?"** with two buttons:
  - **Add** — imports using canonical title, clears input, shows confirmation
  - **Cancel** — dismisses prompt, leaves input filled so user can edit

### Outcome C — Not found
OMDB returns no result.
- Inline message: **"No movie found for that title"**
- Input stays filled so user can correct the spelling

## Component State Machine

```
idle → verifying → [exact | suggestion | not_found] → idle (on clear/confirm/cancel)
```

State object in `ImportPanel`:
- `idle` — waiting for input
- `verifying` — OMDB request in flight (button shows "Checking…")
- `exact` — auto-imported, showing confirmation
- `suggestion` — showing "Did you mean X?" prompt with canonical title
- `not_found` — showing error message
- `error` — API/network failure

## UI Changes

- `<textarea>` → `<input type="text">` (single line)
- Button label: **"Verify & Add"** (was "Add to catalog")
- Button disabled while `verifying`
- Inline status area below input shows the current state message

## Data Layer

No backend changes required. The existing pieces are reused as-is:

| Function | Used for |
|----------|---------|
| `/api/omdb?title=` (existing route) | Verify the title and get canonical OMDB data |
| `importMoviesByTitles(titles, userId)` (existing) | Insert the verified canonical title into the catalog |

`verifyAndImportMoviesByTitles` is **not** used — its batch logic is not needed for single-title import. The `ImportPanel` calls `/api/omdb` directly and then calls `importMoviesByTitles` on confirm.

The `onImport` prop on `ImportPanel` is replaced with two new props:
- `onVerify: (title: string) => Promise<{ ok: boolean; canonicalTitle?: string }>` — calls `/api/omdb`
- `onAdd: (canonicalTitle: string) => Promise<void>` — calls `importMoviesByTitles` and re-fetches movies

## Out of Scope

- Bulk/batch import (removed)
- JSON array import format (removed)
- Showing poster or other OMDB metadata in the import panel
