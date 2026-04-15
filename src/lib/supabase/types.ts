import { ComparisonResult, RatingBucket } from "@/lib/types";

export interface ProfileRow {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface MovieRow {
  id: string;
  title: string;
  year: number | null;
  normalized_title: string;
  created_at: string;
}

export interface RatingRow {
  id: string;
  user_id: string;
  movie_id: string;
  bucket: RatingBucket;
  rank_in_bucket: number;
  score: number;
  comparison_history: ComparisonResult[];
  created_at: string;
  updated_at: string;
  rated_at: string;
}

export interface UserMovieStateRow {
  user_id: string;
  movie_id: string;
  status: "havent_watched";
  updated_at: string;
}

export type FriendshipStatus = "pending" | "accepted" | "rejected" | "canceled";

export interface FriendshipRow {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: FriendshipStatus;
  created_at: string;
  responded_at: string | null;
}
