export type RatingBucket = "good" | "okay" | "bad";

export interface Movie {
  id: string;
  title: string;
  year?: number;
  createdAt: string;
}

export type ComparisonChoice = "new" | "existing" | "skip";

export interface ComparisonResult {
  id: string;
  sessionId: string;
  timestamp: string;
  bucket: RatingBucket;
  newMovieId: string;
  existingMovieId: string;
  choice: ComparisonChoice;
  midpointIndex: number;
}

export interface ComparisonSession {
  id: string;
  movieId: string;
  bucket: RatingBucket;
  startedAt: string;
  completedAt?: string;
  comparisons: ComparisonResult[];
  confidence: "high" | "medium";
}

export interface RankedMovie {
  movieId: string;
  bucket: RatingBucket;
  rankInBucket: number;
  overallRank: number;
  score: number;
  ratedAt: string;
  confidence: "high" | "medium";
}

export interface AppState {
  movies: Movie[];
  rankings: Record<RatingBucket, string[]>;
  sessions: Record<string, ComparisonSession>;
  comparisonHistory: ComparisonResult[];
  ratedAtByMovie: Record<string, string>;
  haventWatchedAtByMovie: Record<string, string>;
}
