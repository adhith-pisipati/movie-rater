import { Movie } from "@/lib/types";

interface MovieCardProps {
  movie: Movie;
  bucketLabel: string;
  onRate: () => void;
  onRemove: () => void;
}

export function MovieCard({ movie, bucketLabel, onRate, onRemove }: MovieCardProps) {
  return (
    <article className="surface relative p-4">
      <button
        aria-label={`Remove ${movie.title}`}
        className="absolute right-2 top-2 rounded px-2 py-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
        onClick={onRemove}
      >
        X
      </button>
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
