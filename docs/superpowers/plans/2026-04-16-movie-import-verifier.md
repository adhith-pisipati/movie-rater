# Movie Import Verifier Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the multi-title textarea import with a single-title input that verifies against OMDB before adding — exact matches auto-add, close matches prompt "Did you mean X?", and not-found titles show an error.

**Architecture:** `ImportPanel` is rewritten with an internal state machine (`idle | verifying | adding | added | suggestion | not_found | error`). It receives two props — `onVerify` (calls `/api/omdb`) and `onAdd` (calls `importMoviesByTitles`) — wired in `page.tsx`. No backend changes are needed; the existing `/api/omdb` route and `importMoviesByTitles` function are reused as-is.

**Tech Stack:** Next.js 14, React, TypeScript, Tailwind CSS

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `src/components/ImportPanel.tsx` | Rewrite | Single-input import with verify state machine |
| `src/app/page.tsx` | Modify | Replace `handleImport` with `handleVerifyMovie` + `handleAddMovie`; update props |

---

## Task 1: Rewrite ImportPanel

**Files:**
- Modify: `src/components/ImportPanel.tsx`

- [ ] **Step 1: Replace the entire contents of `src/components/ImportPanel.tsx`**

```typescript
"use client";

import { useState } from "react";

type VerifyState =
  | { type: "idle" }
  | { type: "verifying" }
  | { type: "adding" }
  | { type: "added"; canonicalTitle: string }
  | { type: "suggestion"; canonicalTitle: string }
  | { type: "not_found" }
  | { type: "error"; message: string };

interface ImportPanelProps {
  onVerify: (title: string) => Promise<{ ok: boolean; canonicalTitle?: string }>;
  onAdd: (canonicalTitle: string) => Promise<void>;
}

function normalizeTitle(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

export function ImportPanel({ onVerify, onAdd }: ImportPanelProps) {
  const [input, setInput] = useState("");
  const [verifyState, setVerifyState] = useState<VerifyState>({ type: "idle" });

  const isBusy = verifyState.type === "verifying" || verifyState.type === "adding";

  async function handleSubmit() {
    const title = input.trim();
    if (!title || isBusy) return;

    setVerifyState({ type: "verifying" });
    try {
      const result = await onVerify(title);

      if (!result.ok || !result.canonicalTitle) {
        setVerifyState({ type: "not_found" });
        return;
      }

      const isExact = normalizeTitle(title) === normalizeTitle(result.canonicalTitle);

      if (isExact) {
        setVerifyState({ type: "adding" });
        await onAdd(result.canonicalTitle);
        setVerifyState({ type: "added", canonicalTitle: result.canonicalTitle });
        setInput("");
      } else {
        setVerifyState({ type: "suggestion", canonicalTitle: result.canonicalTitle });
      }
    } catch (err) {
      setVerifyState({
        type: "error",
        message: err instanceof Error ? err.message : "Verification failed"
      });
    }
  }

  async function handleConfirmSuggestion(canonicalTitle: string) {
    setVerifyState({ type: "adding" });
    try {
      await onAdd(canonicalTitle);
      setVerifyState({ type: "added", canonicalTitle });
      setInput("");
    } catch (err) {
      setVerifyState({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to add movie"
      });
    }
  }

  return (
    <section className="surface p-6">
      <div className="mb-5 flex items-center gap-3">
        <h2 className="font-mono text-[11px] tracking-[0.2em] uppercase text-zinc-500">Add a Film</h2>
        <div className="h-px flex-1 bg-line" />
      </div>

      <div className="flex gap-3">
        <input
          className="flex-1 rounded border border-line bg-transparent px-4 py-2.5 text-sm text-zinc-200 outline-none transition-colors placeholder:text-zinc-700 focus:border-accent/60"
          placeholder="Enter a movie title…"
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            // Clear status when user edits input
            if (
              verifyState.type !== "idle" &&
              verifyState.type !== "verifying" &&
              verifyState.type !== "adding"
            ) {
              setVerifyState({ type: "idle" });
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") void handleSubmit();
          }}
          disabled={isBusy}
        />
        <button
          className="btn-primary"
          onClick={() => void handleSubmit()}
          disabled={isBusy || !input.trim()}
        >
          {verifyState.type === "verifying"
            ? "Checking…"
            : verifyState.type === "adding"
            ? "Adding…"
            : "Verify & Add"}
        </button>
      </div>

      {/* Status area */}
      <div className="mt-3 min-h-[1.5rem]">
        {verifyState.type === "added" && (
          <p className="font-mono text-xs text-good">✓ {verifyState.canonicalTitle} added</p>
        )}

        {verifyState.type === "suggestion" && (
          <div className="flex items-center gap-3">
            <p className="font-mono text-xs text-zinc-400">
              Did you mean{" "}
              <span className="text-zinc-200">{verifyState.canonicalTitle}</span>?
            </p>
            <button
              className="rounded bg-accent px-2 py-1 font-sans text-xs font-medium text-black transition-opacity hover:opacity-85"
              onClick={() => void handleConfirmSuggestion(verifyState.canonicalTitle)}
            >
              Add
            </button>
            <button
              className="btn py-1 text-xs"
              onClick={() => setVerifyState({ type: "idle" })}
            >
              Cancel
            </button>
          </div>
        )}

        {verifyState.type === "not_found" && (
          <p className="font-mono text-xs text-zinc-600">No movie found for that title.</p>
        )}

        {verifyState.type === "error" && (
          <p className="font-mono text-xs text-red-400">{verifyState.message}</p>
        )}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
~/.nvm/versions/node/v24.14.1/bin/node node_modules/.bin/tsc --noEmit 2>&1 | grep -v node_modules
```

Expected: TypeScript will error that `onImport` is no longer a valid prop on `ImportPanel` in `page.tsx` — this is expected and will be fixed in Task 2.

- [ ] **Step 3: Commit**

```bash
git add src/components/ImportPanel.tsx
git commit -m "feat: rewrite ImportPanel with single-input verify state machine"
```

---

## Task 2: Wire up page.tsx

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Update the movies import — swap `verifyAndImportMoviesByTitles` for `importMoviesByTitles`**

Find:
```typescript
import {
  deleteMovieGlobally,
  ensureGlobalMovieCatalogSeeded,
  fetchMovies,
  verifyAndImportMoviesByTitles
} from "@/lib/data/movies";
```

Replace with:
```typescript
import {
  deleteMovieGlobally,
  ensureGlobalMovieCatalogSeeded,
  fetchMovies,
  importMoviesByTitles
} from "@/lib/data/movies";
```

- [ ] **Step 2: Remove `parseImport` from the storage import**

Find:
```typescript
import { createInitialState, exportRankingsCsv, parseImport } from "@/lib/storage";
```

Replace with:
```typescript
import { createInitialState, exportRankingsCsv } from "@/lib/storage";
```

- [ ] **Step 3: Replace `handleImport` with `handleVerifyMovie` and `handleAddMovie`**

Find and delete the existing `handleImport` function:
```typescript
async function handleImport(raw: string) {
  const summary = await verifyAndImportMoviesByTitles(parseImport(raw), user?.id);
  const movies = await fetchMovies();
  setState((prev) => ({ ...prev, movies }));
  setTab("movies");
  return summary;
}
```

Add these two functions in its place:

```typescript
async function handleVerifyMovie(
  title: string
): Promise<{ ok: boolean; canonicalTitle?: string }> {
  const res = await fetch(`/api/omdb?title=${encodeURIComponent(title)}`);
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { reason?: string } | null;
    const reason = body?.reason ?? "request_failed";
    throw new Error(`Movie verification failed: ${reason}`);
  }
  const body = (await res.json()) as { ok: boolean; data?: Record<string, string> };
  if (!body.ok || !body.data) {
    return { ok: false };
  }
  return {
    ok: true,
    canonicalTitle: (body.data["Title"] ?? title).trim()
  };
}

async function handleAddMovie(canonicalTitle: string): Promise<void> {
  await importMoviesByTitles([canonicalTitle], user?.id);
  const movies = await fetchMovies();
  setState((prev) => ({ ...prev, movies }));
  setTab("movies");
}
```

- [ ] **Step 4: Update the ImportPanel JSX**

Find:
```typescript
{tab === "import" && <ImportPanel onImport={handleImport} />}
```

Replace with:
```typescript
{tab === "import" && <ImportPanel onVerify={handleVerifyMovie} onAdd={handleAddMovie} />}
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
~/.nvm/versions/node/v24.14.1/bin/node node_modules/.bin/tsc --noEmit 2>&1 | grep -v node_modules
```

Expected: only the pre-existing `@supabase/supabase-js` errors. No errors about `onImport`, `parseImport`, or `verifyAndImportMoviesByTitles`.

- [ ] **Step 6: Run the dev server and manually test**

```bash
~/.nvm/versions/node/v24.14.1/bin/npm run dev
```

Open `http://localhost:3000`, go to the Import tab, and verify:

1. There is a single text input, not a textarea
2. Button says "Verify & Add"
3. Type "Inception" (exact match) → click Verify & Add → button shows "Checking…" briefly → "✓ Inception added" appears, input clears, Movies tab opens
4. Type "dark knight" (close match) → "Did you mean The Dark Knight?" appears with Add/Cancel buttons → click Add → "✓ The Dark Knight added"
5. Type "dark knight" again → "Did you mean The Dark Knight?" → click Cancel → input stays filled, status clears
6. Type "asjdfkasjdfk" (not found) → "No movie found for that title." appears
7. Editing the input after any result clears the status message
8. Pressing Enter submits the form

- [ ] **Step 7: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: wire up handleVerifyMovie and handleAddMovie in page.tsx"
```
