import { useState } from "react";

interface ImportPanelProps {
  onImport: (raw: string) => Promise<void>;
}

export function ImportPanel({ onImport }: ImportPanelProps) {
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setMessage(null);
    try {
      await onImport(input);
      setInput("");
      setMessage("Movies imported.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Import failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="surface p-4">
      <h2 className="mb-2 text-lg font-semibold">Import Movies</h2>
      <p className="mb-2 text-sm text-zinc-400">Paste one title per line or a JSON array of strings.</p>
      <textarea
        className="h-48 w-full rounded-lg border border-line bg-zinc-900 p-3 text-sm outline-none focus:border-accent"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder='["Movie A", "Movie B"]'
      />
      <div className="mt-3">
        <button className="btn-primary" onClick={submit} disabled={busy}>
          {busy ? "Importing..." : "Parse and Add Movies"}
        </button>
      </div>
      {message && <p className="mt-2 text-sm text-zinc-300">{message}</p>}
    </section>
  );
}
