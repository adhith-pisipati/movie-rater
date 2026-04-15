import { buildRankedMovies } from "@/lib/ranking";
import { supabase } from "@/lib/supabase/client";
import { AppState, ComparisonSession } from "@/lib/types";
import { RatingRow, UserMovieStateRow } from "@/lib/supabase/types";

export async function loadUserRatingState(userId: string): Promise<Pick<AppState, "rankings" | "sessions" | "comparisonHistory" | "ratedAtByMovie" | "haventWatchedAtByMovie">> {
  const [ratingsResult, statesResult] = await Promise.all([
    supabase.from("ratings").select("*").eq("user_id", userId).order("rank_in_bucket", { ascending: true }),
    supabase.from("user_movie_states").select("*").eq("user_id", userId).eq("status", "havent_watched")
  ]);

  if (ratingsResult.error) throw ratingsResult.error;
  if (statesResult.error) throw statesResult.error;

  const ratings = (ratingsResult.data ?? []) as RatingRow[];
  const movieStates = (statesResult.data ?? []) as UserMovieStateRow[];

  const rankings = { good: [] as string[], okay: [] as string[], bad: [] as string[] };
  const sessions: Record<string, ComparisonSession> = {};
  const comparisonHistory: AppState["comparisonHistory"] = [];
  const ratedAtByMovie: Record<string, string> = {};
  const haventWatchedAtByMovie: Record<string, string> = {};

  ratings.forEach((rating) => {
    rankings[rating.bucket].push(rating.movie_id);
    ratedAtByMovie[rating.movie_id] = rating.rated_at;
    const session: ComparisonSession = {
      id: `persisted-${rating.id}`,
      movieId: rating.movie_id,
      bucket: rating.bucket,
      startedAt: rating.created_at,
      completedAt: rating.updated_at,
      comparisons: rating.comparison_history ?? [],
      confidence: (rating.comparison_history ?? []).some((c) => c.choice === "skip") ? "medium" : "high"
    };
    sessions[rating.movie_id] = session;
    comparisonHistory.push(...session.comparisons);
  });

  movieStates.forEach((state) => {
    haventWatchedAtByMovie[state.movie_id] = state.updated_at;
  });

  return { rankings, sessions, comparisonHistory, ratedAtByMovie, haventWatchedAtByMovie };
}

export async function persistFullUserRatingState(
  userId: string,
  state: Pick<AppState, "movies" | "rankings" | "sessions" | "ratedAtByMovie" | "haventWatchedAtByMovie">
): Promise<void> {
  const ranked = buildRankedMovies({
    ...state,
    comparisonHistory: [],
    movies: state.movies
  } as AppState);

  const rows = ranked.map((entry) => ({
    user_id: userId,
    movie_id: entry.movieId,
    bucket: entry.bucket,
    rank_in_bucket: entry.rankInBucket,
    score: entry.score,
    comparison_history: state.sessions[entry.movieId]?.comparisons ?? [],
    rated_at: state.ratedAtByMovie[entry.movieId] ?? new Date().toISOString()
  }));

  const watchedRows = Object.entries(state.haventWatchedAtByMovie).map(([movieId, updatedAt]) => ({
    user_id: userId,
    movie_id: movieId,
    status: "havent_watched" as const,
    updated_at: updatedAt
  }));

  const [{ error: deleteRatingsError }, { error: deleteStatesError }] = await Promise.all([
    supabase.from("ratings").delete().eq("user_id", userId),
    supabase.from("user_movie_states").delete().eq("user_id", userId)
  ]);

  if (deleteRatingsError) throw deleteRatingsError;
  if (deleteStatesError) throw deleteStatesError;

  if (rows.length > 0) {
    const { error } = await supabase.from("ratings").insert(rows);
    if (error) throw error;
  }

  if (watchedRows.length > 0) {
    const { error } = await supabase.from("user_movie_states").insert(watchedRows);
    if (error) throw error;
  }
}

export async function loadPublicRankings(userId: string): Promise<RatingRow[]> {
  const { data, error } = await supabase
    .from("ratings")
    .select("*, movies(id, title, year)")
    .eq("user_id", userId)
    .order("bucket")
    .order("rank_in_bucket");
  if (error) throw error;
  return (data ?? []) as unknown as RatingRow[];
}
