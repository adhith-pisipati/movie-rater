import { Movie, RankedMovie, ComparisonSession, RatingBucket } from "@/lib/types";

const bucketLabel: Record<RatingBucket, string> = { good: "Good", okay: "Okay", bad: "Bad" };

interface MovieDetailDrawerProps {
  movie: Movie;
  rank: RankedMovie;
  session?: ComparisonSession;
  movieById: Map<string, Movie>;
  onClose: () => void;
  onRerate: () => void;
}

export function MovieDetailDrawer({ movie, rank, session, movieById, onClose, onRerate }: MovieDetailDrawerProps) {
  return (
    <div className="fixed inset-0 z-20 flex justify-end bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <aside
        className="flex h-full w-full max-w-sm flex-col border-l border-line bg-cardBg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="border-b border-line p-5">
          <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-zinc-600">
            {bucketLabel[rank.bucket]}
          </p>
          <h2 className="mt-1.5 font-display text-2xl font-light italic leading-tight text-zinc-100">
            {movie.title}
          </h2>
        </div>

        {/* Stats */}
        <div className="border-b border-line p-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="font-mono text-[9px] tracking-[0.15em] uppercase text-zinc-700">Rank in bucket</p>
              <p className="mt-1 font-mono text-xl text-zinc-200">#{rank.rankInBucket}</p>
            </div>
            <div>
              <p className="font-mono text-[9px] tracking-[0.15em] uppercase text-zinc-700">Overall rank</p>
              <p className="mt-1 font-mono text-xl text-zinc-200">#{rank.overallRank}</p>
            </div>
            <div>
              <p className="font-mono text-[9px] tracking-[0.15em] uppercase text-zinc-700">Score</p>
              <p className="mt-1 font-mono text-xl text-zinc-200">{rank.score.toFixed(1)}</p>
            </div>
            <div>
              <p className="font-mono text-[9px] tracking-[0.15em] uppercase text-zinc-700">Rated</p>
              <p className="mt-1 font-mono text-xs text-zinc-400">
                {new Date(rank.ratedAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        {/* Comparison history */}
        <div className="flex-1 overflow-y-auto p-5">
          <p className="mb-3 font-mono text-[10px] tracking-[0.2em] uppercase text-zinc-600">
            Comparison history
          </p>
          <ul className="space-y-2">
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
        </div>

        {/* Actions */}
        <div className="border-t border-line p-5">
          <div className="flex gap-2">
            <button className="btn-primary" onClick={onRerate}>
              Re-rate
            </button>
            <button className="btn" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}
