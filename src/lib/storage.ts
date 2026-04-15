import { seedMovies } from "@/data/seedMovies";
import { buildRankedMovies } from "./ranking";
import { AppState, Movie } from "./types";

function createMovie(title: string): Movie {
  return { id: crypto.randomUUID(), title, createdAt: new Date().toISOString() };
}

export function createInitialState(): AppState {
  return {
    movies: seedMovies.map(createMovie),
    rankings: { good: [], okay: [], bad: [] },
    sessions: {},
    comparisonHistory: [],
    ratedAtByMovie: {},
    haventWatchedAtByMovie: {},
    removedAtByMovie: {}
  };
}

export function parseImport(input: string): string[] {
  const trimmed = input.trim();
  if (!trimmed) return [];
  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed) && parsed.every((v) => typeof v === "string")) {
      return parsed.map((v) => v.trim()).filter(Boolean);
    }
  } catch {
    // Falls through to line parsing.
  }
  return trimmed
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export function exportRankingsCsv(state: AppState): string {
  const ranked = buildRankedMovies(state);
  const byMovieId = new Map(ranked.map((entry) => [entry.movieId, entry]));
  const rows = [["Title", "Bucket", "Rank In Bucket", "Overall Rank", "Score", "Rated At"]];
  const order = ["good", "okay", "bad"] as const;
  let overall = 1;

  order.forEach((bucket) => {
    const ids = state.rankings[bucket];
    ids.forEach((movieId, i) => {
      const movie = state.movies.find((m) => m.id === movieId);
      if (!movie) return;
      const computed = byMovieId.get(movieId);
      rows.push([
        movie.title,
        bucket,
        String(computed?.rankInBucket ?? i + 1),
        String(computed?.overallRank ?? overall),
        String(computed?.score ?? ""),
        state.ratedAtByMovie[movieId] ?? ""
      ]);
      overall += 1;
    });
  });

  return rows
    .map((row) =>
      row
        .map((cell) => `"${String(cell).replaceAll('"', '""')}"`)
        .join(",")
    )
    .join("\n");
}
