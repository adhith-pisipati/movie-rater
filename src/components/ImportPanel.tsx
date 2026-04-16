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
