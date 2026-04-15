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
    <article className="surface group relative flex flex-col justify-between p-4 transition-colors duration-150 hover:border-line/70">
      <div className="absolute right-2 top-2 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
        <RemovePopover
          triggerLabel={`Remove ${movie.title}`}
          onRemove={onRemove}
          onRemoveGlobally={canRemoveGlobally ? onRemoveGlobally : undefined}
        />
      </div>

      <div className="pr-6">
        <h3 className="font-display text-lg font-normal leading-snug text-zinc-100">{movie.title}</h3>
        <p className="mt-1.5 font-mono text-[10px] tracking-[0.15em] uppercase text-zinc-600">{bucketLabel}</p>
      </div>

      <div className="mt-5">
        <button className="btn-primary text-xs" onClick={onRate}>
          Rate
        </button>
      </div>
    </article>
  );
}
