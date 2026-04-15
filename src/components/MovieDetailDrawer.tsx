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
    <div className="fixed inset-0 z-20 grid place-items-end bg-black/70" onClick={onClose}>
      <aside
        className="h-full w-full max-w-md border-l border-line bg-cardBg p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-semibold">{movie.title}</h2>
        <div className="mt-3 space-y-1 text-sm text-zinc-300">
          <p>Bucket: {bucketLabel[rank.bucket]}</p>
          <p>Rank in bucket: #{rank.rankInBucket}</p>
          <p>Overall rank: #{rank.overallRank}</p>
          <p>Score: {rank.score.toFixed(1)}</p>
          <p>Rated at: {new Date(rank.ratedAt).toLocaleString()}</p>
        </div>
        <h3 className="mt-4 font-medium">Comparison history</h3>
        <ul className="mt-2 max-h-[50vh] space-y-2 overflow-auto text-sm">
          {session?.comparisons.length ? (
            session.comparisons.map((c) => (
              <li key={c.id} className="rounded border border-line p-2">
                Compared against {movieById.get(c.existingMovieId)?.title ?? "Unknown"} - choice: {c.choice}
              </li>
            ))
          ) : (
            <li className="text-zinc-500">No comparisons were required.</li>
          )}
        </ul>
        <div className="mt-4 flex gap-2">
          <button className="btn-primary" onClick={onRerate}>
            Re-rate from scratch
          </button>
          <button className="btn" onClick={onClose}>
            Close
          </button>
        </div>
      </aside>
    </div>
  );
}
