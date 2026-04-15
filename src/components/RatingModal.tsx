import { BUCKETS, BinaryStep } from "@/lib/ranking";
import { Movie, RatingBucket } from "@/lib/types";

const bucketLabel: Record<RatingBucket, string> = { good: "Good", okay: "Okay", bad: "Bad" };
const bucketColor: Record<RatingBucket, string> = {
  good: "border-good/40 hover:border-good/80 hover:bg-good/5",
  okay: "border-okay/40 hover:border-okay/80 hover:bg-okay/5",
  bad: "border-bad/40 hover:border-bad/80 hover:bg-bad/5"
};
const bucketDot: Record<RatingBucket, string> = {
  good: "bg-good",
  okay: "bg-okay",
  bad: "bg-bad"
};

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
    <div className="fixed inset-0 z-20 grid place-items-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="surface w-full max-w-xl p-6">
        {!bucket ? (
          <>
            <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-zinc-600">Now rating</p>
            <h2 className="mt-1 font-display text-2xl font-light italic text-zinc-100">{movie.title}</h2>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {BUCKETS.map((candidate) => (
                <button
                  key={candidate}
                  className={`rounded-lg border p-4 text-center transition-all duration-150 ${bucketColor[candidate]}`}
                  onClick={() => onChooseBucket(candidate)}
                >
                  <div className={`mx-auto mb-3 h-2 w-2 rounded-full ${bucketDot[candidate]}`} />
                  <p className="font-display text-xl font-light italic text-zinc-200">
                    {bucketLabel[candidate]}
                  </p>
                </button>
              ))}
            </div>
          </>
        ) : !activeStep || !comparisonMovie ? (
          <>
            <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-zinc-600">Placement</p>
            <h2 className="mt-1 font-display text-2xl font-light italic text-zinc-100">Ready to place</h2>
            <p className="mt-2 text-sm text-zinc-500">No comparisons needed for this bucket.</p>
            <div className="mt-5">
              <button className="btn-primary" onClick={() => onCompare("new")}>
                Confirm placement
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-zinc-600">
              Comparing · {bucketLabel[bucket]}
            </p>
            <h2 className="mt-1 font-display text-xl font-light italic text-zinc-100">
              Which did you prefer?
            </h2>

            <div className="relative mt-5 grid gap-3 sm:grid-cols-2">
              <button
                className="rounded-lg border border-accent/50 p-4 text-left transition-colors duration-150 hover:border-accent hover:bg-accent/5"
                onClick={() => onCompare("new")}
              >
                <p className="font-mono text-[9px] tracking-[0.18em] uppercase text-zinc-600">This film</p>
                <h3 className="mt-2 font-display text-lg font-light leading-snug text-zinc-100">
                  {movie.title}
                </h3>
              </button>
              <button
                className="rounded-lg border border-line p-4 text-left transition-colors duration-150 hover:border-zinc-500 hover:bg-zinc-800/30"
                onClick={() => onCompare("existing")}
              >
                <p className="font-mono text-[9px] tracking-[0.18em] uppercase text-zinc-600">Or this one</p>
                <h3 className="mt-2 font-display text-lg font-light leading-snug text-zinc-100">
                  {comparisonMovie.title}
                </h3>
              </button>
            </div>

            <div className="mt-4 flex items-center gap-2">
              <button className="btn" onClick={onGoBack}>
                Undo
              </button>
              <button className="btn ml-auto" onClick={() => onCompare("skip")}>
                Skip
              </button>
            </div>
          </>
        )}

        <div className="mt-6 flex items-center justify-center gap-3 border-t border-line pt-4">
          <button className="btn text-xs" onClick={onHaventWatched}>
            Haven&apos;t seen it
          </button>
          <button className="btn text-xs" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
