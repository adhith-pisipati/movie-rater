import { AppState, ComparisonResult, RankedMovie, RatingBucket } from "./types";

export const BUCKETS: RatingBucket[] = ["good", "okay", "bad"];

const BUCKET_SCORE_RANGES: Record<RatingBucket, { min: number; max: number }> = {
  good: { min: 7, max: 10 },
  okay: { min: 4, max: 6.9 },
  bad: { min: 0, max: 3.9 }
};

export interface BinaryStep {
  low: number;
  high: number;
  mid: number;
}

export function nextBinaryStep(rankedIds: string[], low: number, high: number): BinaryStep | null {
  if (low > high || rankedIds.length === 0) {
    return null;
  }
  const mid = Math.floor((low + high) / 2);
  return { low, high, mid };
}

export function updateBoundsForChoice(
  step: BinaryStep,
  choice: "new" | "existing" | "skip"
): { low: number; high: number; fallback?: number } {
  if (choice === "new") {
    return { low: step.low, high: step.mid - 1 };
  }
  if (choice === "existing") {
    return { low: step.mid + 1, high: step.high };
  }
  return { low: step.mid + 1, high: step.mid, fallback: step.mid };
}

export function insertionIndexFromBounds(low: number, fallback?: number): number {
  return fallback ?? low;
}

export function insertIntoBucket(bucketOrder: string[], movieId: string, index: number): string[] {
  const copy = [...bucketOrder];
  copy.splice(index, 0, movieId);
  return copy;
}

export function removeMovieFromRankings(rankings: AppState["rankings"], movieId: string): AppState["rankings"] {
  return {
    good: rankings.good.filter((id) => id !== movieId),
    okay: rankings.okay.filter((id) => id !== movieId),
    bad: rankings.bad.filter((id) => id !== movieId)
  };
}

function scoreByBucketPosition(bucket: RatingBucket, rankInBucket: number, bucketCount: number): number {
  // This is an adjustable display approximation inspired by comparative-ranking apps.
  // It is intentionally not a claim of Beli's proprietary internal scoring formula.
  const { min, max } = BUCKET_SCORE_RANGES[bucket];
  if (bucketCount <= 1) {
    return Number(max.toFixed(1));
  }
  const percentile = (bucketCount - rankInBucket) / (bucketCount - 1);
  return Number((min + (max - min) * percentile).toFixed(1));
}

export function buildRankedMovies(state: AppState): RankedMovie[] {
  const results: RankedMovie[] = [];
  let overall = 1;

  BUCKETS.forEach((bucket) => {
    const bucketIds = state.rankings[bucket];
    bucketIds.forEach((movieId, i) => {
      const rankInBucket = i + 1;
      results.push({
        movieId,
        bucket,
        rankInBucket,
        overallRank: overall,
        score: scoreByBucketPosition(bucket, rankInBucket, bucketIds.length),
        ratedAt: state.ratedAtByMovie[movieId] ?? new Date().toISOString(),
        confidence: state.sessions[movieId]?.confidence ?? "high"
      });
      overall += 1;
    });
  });

  return results;
}

export function createComparison(
  sessionId: string,
  bucket: RatingBucket,
  newMovieId: string,
  existingMovieId: string,
  midpointIndex: number,
  choice: ComparisonResult["choice"]
): ComparisonResult {
  return {
    id: crypto.randomUUID(),
    sessionId,
    timestamp: new Date().toISOString(),
    bucket,
    newMovieId,
    existingMovieId,
    midpointIndex,
    choice
  };
}
