import { Movie } from "@/lib/types";
import { RemovePopover } from "@/components/RemovePopover";

interface MovieCardProps {
  movie: Movie;
  bucketLabel: string;
  onRate: () => void;
  onRemove: () => void;
  currentUserId?: string;
  onRemoveGlobally?: () => void;
}

export function MovieCard({ movie, bucketLabel, onRate, onRemove, currentUserId, onRemoveGlobally }: MovieCardProps) {
  const canRemoveGlobally = !!movie.createdBy && !!currentUserId && movie.createdBy === currentUserId;

  return (
    <article className="surface relative p-4">
      <div className="absolute right-2 top-2">
        <RemovePopover
          triggerLabel={`Remove ${movie.title}`}
          onRemove={onRemove}
          onRemoveGlobally={canRemoveGlobally ? onRemoveGlobally : undefined}
        />
      </div>
      <h3 className="font-medium">{movie.title}</h3>
      <div className="mt-2 space-y-1 text-sm text-zinc-300">
        <p>Bucket: {bucketLabel}</p>
        <p>Rank: -</p>
        <p>Score: -</p>
      </div>
      <div className="mt-4">
        <button className="btn-primary" onClick={onRate}>
          Rate
        </button>
      </div>
    </article>
  );
}
