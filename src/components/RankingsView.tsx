import { BUCKETS } from "@/lib/ranking";
import { Movie, RankedMovie, RatingBucket } from "@/lib/types";
import { RemovePopover } from "@/components/RemovePopover";

const bucketLabel: Record<RatingBucket, string> = { good: "Good", okay: "Okay", bad: "Bad" };

interface RankingsViewProps {
  rankings: Record<RatingBucket, string[]>;
  movieById: Map<string, Movie>;
  rankedById: Map<string, RankedMovie>;
  onInspectMovie?: (movieId: string) => void;
  onRemoveMovie?: (movieId: string) => void;
  onRemoveMovieGlobally?: (movieId: string) => void;
  currentUserId?: string;
}

export function RankingsView({
  rankings,
  movieById,
  rankedById,
  onInspectMovie,
  onRemoveMovie,
  onRemoveMovieGlobally,
  currentUserId
}: RankingsViewProps) {
  return (
    <section className="space-y-4">
      {BUCKETS.map((bucket) => (
        <article className="surface p-4" key={bucket}>
          <h2 className="mb-3 text-lg font-semibold">{bucketLabel[bucket]}</h2>
          <ol className="space-y-2">
            {rankings[bucket].length === 0 && <li className="text-sm text-zinc-500">No rated movies here yet.</li>}
            {rankings[bucket].map((movieId, i) => {
              const movie = movieById.get(movieId);
              const rank = rankedById.get(movieId);
              if (!movie || !rank) return null;
              const canRemoveGlobally =
                movie.createdBy && currentUserId && movie.createdBy === currentUserId;
              return (
                <li key={movieId} className="flex items-center justify-between rounded-lg border border-line p-3">
                  <div>
                    <p className="font-medium">
                      #{i + 1} {movie.title}
                    </p>
                    <p className="text-sm text-zinc-400">Overall #{rank.overallRank}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm">{rank.score.toFixed(1)}</p>
                    {onInspectMovie && (
                      <button className="btn" onClick={() => onInspectMovie(movieId)}>
                        Details
                      </button>
                    )}
                    {onRemoveMovie && (
                      <RemovePopover
                        triggerClassName="btn"
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
        </article>
      ))}
    </section>
  );
}
