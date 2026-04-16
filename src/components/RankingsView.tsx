import { BUCKETS } from "@/lib/ranking";
import { Movie, RankedMovie, RatingBucket } from "@/lib/types";
import { RemovePopover } from "@/components/RemovePopover";

const bucketLabel: Record<RatingBucket, string> = { good: "Good", okay: "Okay", bad: "Bad" };
const bucketDot: Record<RatingBucket, string> = {
  good: "bg-good",
  okay: "bg-okay",
  bad: "bg-bad"
};

interface RankingsViewProps {
  rankings: Record<RatingBucket, string[]>;
  movieById: Map<string, Movie>;
  rankedById: Map<string, RankedMovie>;
  onViewDetails?: (movieId: string) => void;
  onRemoveMovie?: (movieId: string) => void;
  onRemoveMovieGlobally?: (movieId: string) => void;
  currentUserId?: string;
}

export function RankingsView({
  rankings,
  movieById,
  rankedById,
  onViewDetails,
  onRemoveMovie,
  onRemoveMovieGlobally,
  currentUserId
}: RankingsViewProps) {
  return (
    <div className="space-y-10">
      {BUCKETS.map((bucket) => (
        <section key={bucket}>
          <div className="mb-1 flex items-center gap-3">
            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${bucketDot[bucket]}`} />
            <h2 className="font-mono text-[11px] tracking-[0.2em] uppercase text-zinc-500">
              {bucketLabel[bucket]}
            </h2>
            <div className="h-px flex-1 bg-line" />
          </div>

          <ol>
            {rankings[bucket].length === 0 && (
              <li className="py-4 font-mono text-xs text-zinc-700">Nothing here yet.</li>
            )}
            {rankings[bucket].map((movieId, i) => {
              const movie = movieById.get(movieId);
              const rank = rankedById.get(movieId);
              if (!movie || !rank) return null;
              const canRemoveGlobally =
                !!movie.createdBy && !!currentUserId && movie.createdBy === currentUserId;
              return (
                <li
                  key={movieId}
                  className="group flex cursor-pointer items-center gap-4 rounded border-b border-line/30 py-3 last:border-0 hover:bg-zinc-900/30 transition-colors duration-150"
                  onClick={() => onViewDetails?.(movieId)}
                >
                  <span className="w-7 shrink-0 font-mono text-xs text-zinc-700">
                    {String(i + 1).padStart(2, "0")}
                  </span>

                  <span className="min-w-0 flex-1 truncate font-display text-base leading-snug text-zinc-100">
                    {movie.title}
                  </span>

                  <span className="shrink-0 font-mono text-xs text-zinc-600">
                    {rank.score.toFixed(1)}
                  </span>

                  <div
                    className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {onRemoveMovie && (
                      <RemovePopover
                        triggerClassName="flex h-6 w-6 items-center justify-center rounded border border-line text-zinc-500 text-sm transition-colors hover:border-accent/50 hover:text-accent"
                        triggerLabel={`Remove ${movie.title}`}
                        onRemove={() => onRemoveMovie(movieId)}
                        onRemoveGlobally={
                          canRemoveGlobally && onRemoveMovieGlobally
                            ? () => onRemoveMovieGlobally(movieId)
                            : undefined
                        }
                      />
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      ))}
    </div>
  );
}
