import { useState } from "react";
import { VerifiedImportSummary } from "@/lib/data/movies";

interface ImportPanelProps {
  onImport: (raw: string) => Promise<VerifiedImportSummary>;
}

export function ImportPanel({ onImport }: ImportPanelProps) {
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setMessage(null);
    try {
      const summary = await onImport(input);
      setInput("");
      const skipped =
        summary.skippedNotFound.length > 0 ? ` Skipped not found: ${summary.skippedNotFound.slice(0, 5).join(", ")}.` : "";
      setMessage(
        `Submitted ${summary.submitted}. Verified ${summary.verified}. Added ${summary.inserted}.${skipped}`
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Import failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="surface p-6">
      <div className="mb-5 flex items-center gap-3">
        <h2 className="font-mono text-[11px] tracking-[0.2em] uppercase text-zinc-500">Import Movies</h2>
        <div className="h-px flex-1 bg-line" />
      </div>
      <p className="mb-4 text-sm text-zinc-500">
        Paste one title per line, or a JSON array of strings.
      </p>
      <textarea
        className="h-48 w-full rounded border border-line bg-transparent p-3 text-sm text-zinc-200 outline-none transition-colors placeholder:text-zinc-700 focus:border-accent/60 resize-none"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder={`The Godfather\nChinatown\nTaxi Driver`}
      />
      <div className="mt-4 flex items-center gap-3">
        <button className="btn-primary" onClick={submit} disabled={busy}>
          {busy ? "Importing…" : "Add to catalog"}
        </button>
        {message && <p className="font-mono text-xs text-zinc-600">{message}</p>}
      </div>
    </section>
  );
}
