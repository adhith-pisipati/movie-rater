import { Movie } from "@/lib/types";

interface MovieCardProps {
  movie: Movie;
  bucketLabel: string;
  onRate: () => void;
}

export function MovieCard({ movie, bucketLabel, onRate }: MovieCardProps) {
  return (
    <article className="surface p-4">
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
