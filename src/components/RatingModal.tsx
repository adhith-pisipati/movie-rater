import { BUCKETS, BinaryStep } from "@/lib/ranking";
import { Movie, RatingBucket } from "@/lib/types";

const bucketLabel: Record<RatingBucket, string> = { good: "Good", okay: "Okay", bad: "Bad" };

interface RatingModalProps {
  movie: Movie;
  bucket?: RatingBucket;
  activeStep: BinaryStep | null;
  comparisonMovie: Movie | null;
  onChooseBucket: (bucket: RatingBucket) => void;
  onCompare: (choice: "new" | "existing" | "skip") => void;
  onGoBack: () => void;
  onHaventWatched: () => void;
  onClose: () => void;
}

export function RatingModal({
  movie,
  bucket,
  activeStep,
  comparisonMovie,
  onChooseBucket,
  onCompare,
  onGoBack,
  onHaventWatched,
  onClose
}: RatingModalProps) {
  return (
    <div className="fixed inset-0 z-20 grid place-items-center bg-black/70 p-4">
      <div className="surface w-full max-w-3xl p-4">
        {!bucket ? (
          <>
            <h2 className="text-xl font-semibold">Rate: {movie.title}</h2>
            <p className="mt-1 text-center text-lg font-medium text-zinc-200">How was it?</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {BUCKETS.map((candidate) => (
                <button
                  key={candidate}
                  className="rounded-xl border border-line bg-zinc-900 p-3 text-center transition hover:border-accent"
                  onClick={() => onChooseBucket(candidate)}
                >
                  <div
                    className={`mx-auto mb-2 h-12 w-12 rounded-full ${
                      candidate === "good" ? "bg-good/80" : candidate === "okay" ? "bg-okay/80" : "bg-bad/80"
                    }`}
                  />
                  <p className="text-sm font-medium">{bucketLabel[candidate]}</p>
                </button>
              ))}
            </div>
          </>
        ) : !activeStep || !comparisonMovie ? (
          <>
            <h2 className="text-xl font-semibold">Ready to insert</h2>
            <p className="mt-1 text-sm text-zinc-400">No comparisons needed for this bucket right now.</p>
            <div className="mt-4">
              <button className="btn-primary" onClick={() => onCompare("new")}>
                Confirm placement
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-xl font-semibold">Which did you like more?</h2>
            <p className="mt-1 text-sm text-zinc-400">
              Step 2: Binary insertion in {bucketLabel[bucket]} to minimize comparisons.
            </p>
            <div className="relative mt-4 grid gap-3 sm:grid-cols-2">
              <button
                className="rounded-lg border border-accent p-3 text-left transition hover:bg-zinc-900/40"
                onClick={() => onCompare("new")}
              >
                <p className="text-xs uppercase tracking-wide text-zinc-400">New movie</p>
                <h3 className="mt-1 text-lg font-medium">{movie.title}</h3>
              </button>
              <button
                className="rounded-lg border border-line p-3 text-left transition hover:border-accent hover:bg-zinc-900/40"
                onClick={() => onCompare("existing")}
              >
                <p className="text-xs uppercase tracking-wide text-zinc-400">Comparison movie</p>
                <h3 className="mt-1 text-lg font-medium">{comparisonMovie.title}</h3>
              </button>
              <div className="pointer-events-none hidden sm:grid sm:absolute sm:inset-0 sm:place-items-center">
                <span className="rounded-full border border-line bg-zinc-900 px-2 py-1 text-xs font-semibold text-zinc-200">
                  OR
                </span>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between gap-2">
              <button className="btn" onClick={onGoBack}>
                Undo
              </button>
              <button className="btn" onClick={() => onCompare("skip")}>
                Skip
              </button>
            </div>
          </>
        )}
        <div className="mt-4 flex flex-col items-center gap-2">
          <button className="btn" onClick={onHaventWatched}>
            Haven&apos;t watched
          </button>
          <button className="btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
