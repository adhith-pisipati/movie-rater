"use client";

import { useEffect, useMemo, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { AuthForm } from "@/components/AuthForm";
import { FriendsPanel } from "@/components/FriendsPanel";
import { ImportPanel } from "@/components/ImportPanel";
import { MovieCard } from "@/components/MovieCard";
import { MovieDetailDrawer } from "@/components/MovieDetailDrawer";
import { ProfileHeader } from "@/components/ProfileHeader";
import { RankingsView } from "@/components/RankingsView";
import { RatingModal } from "@/components/RatingModal";
import { fetchFriendships, sendFriendRequest, updateFriendRequestStatus } from "@/lib/data/friendships";
import { deleteMovieGlobally, ensureGlobalMovieCatalogSeeded, fetchMovies, importMoviesByTitles } from "@/lib/data/movies";
import { fetchMyProfile, searchProfiles } from "@/lib/data/profiles";
import { loadUserRatingState, persistFullUserRatingState } from "@/lib/data/ratings";
import {
  buildRankedMovies,
  createComparison,
  insertionIndexFromBounds,
  insertIntoBucket,
  nextBinaryStep,
  removeMovieFromRankings,
  updateBoundsForChoice
} from "@/lib/ranking";
import { createInitialState, exportRankingsCsv, parseImport } from "@/lib/storage";
import { supabase } from "@/lib/supabase/client";
import { FriendshipViewData } from "@/lib/data/friendships";
import { ProfileRow } from "@/lib/supabase/types";
import { AppState, ComparisonSession, Movie, RatingBucket } from "@/lib/types";

type Tab = "movies" | "rankings" | "import" | "friends";

interface ActiveRating {
  movieId: string;
  bucket?: RatingBucket;
  low: number;
  high: number;
  fallback?: number;
  history: Array<{ low: number; high: number; fallback?: number }>;
  sessionId: string;
  comparisons: ReturnType<typeof createComparison>[];
  baseRankings: AppState["rankings"];
}

export default function HomePage() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [state, setState] = useState<AppState>(createInitialState());
  const [tab, setTab] = useState<Tab>("movies");
  const [activeRating, setActiveRating] = useState<ActiveRating | null>(null);
  const [detailMovieId, setDetailMovieId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [friendships, setFriendships] = useState<FriendshipViewData>({ incoming: [], outgoing: [], friends: [] });
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ProfileRow[]>([]);

  async function loadDashboard(currentUser: User) {
    setLoading(true);
    setError(null);
    try {
      await ensureGlobalMovieCatalogSeeded();
      const [movies, userRatings, myProfile, social] = await Promise.all([
        fetchMovies(),
        loadUserRatingState(currentUser.id),
        fetchMyProfile(currentUser.id),
        fetchFriendships(currentUser.id)
      ]);

      setState({
        movies,
        rankings: userRatings.rankings,
        sessions: userRatings.sessions,
        comparisonHistory: userRatings.comparisonHistory,
        ratedAtByMovie: userRatings.ratedAtByMovie,
        haventWatchedAtByMovie: userRatings.haventWatchedAtByMovie,
        removedAtByMovie: userRatings.removedAtByMovie
      });
      setProfile(myProfile);
      setFriendships(social);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let isMounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) return;
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session?.user) {
        void loadDashboard(data.session.user);
      } else {
        setLoading(false);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      if (nextSession?.user) {
        void loadDashboard(nextSession.user);
      } else {
        setProfile(null);
        setState(createInitialState());
      }
    });
    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!user || !searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(() => {
      searchProfiles(searchQuery, user.id)
        .then(setSearchResults)
        .catch(() => setSearchResults([]));
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery, user]);

  const rankedMovies = useMemo(() => buildRankedMovies(state), [state]);
  const rankedById = useMemo(() => new Map(rankedMovies.map((r) => [r.movieId, r])), [rankedMovies]);
  const movieById = useMemo(() => new Map(state.movies.map((m) => [m.id, m])), [state.movies]);

  const unratedMovies = useMemo(() => {
    const pending = state.movies.filter((movie) => !rankedById.has(movie.id));
    const notWatched: Movie[] = [];
    const notRated: Movie[] = [];
    pending.forEach((movie) => {
      if (state.haventWatchedAtByMovie[movie.id]) notWatched.push(movie);
      else notRated.push(movie);
    });
    return [...notRated, ...notWatched].filter((movie) => !state.removedAtByMovie[movie.id]);
  }, [state.movies, state.haventWatchedAtByMovie, state.removedAtByMovie, rankedById]);

  function persistState(nextState: AppState) {
    if (!user) return;
    void persistFullUserRatingState(user.id, {
      movies: nextState.movies,
      rankings: nextState.rankings,
      sessions: nextState.sessions,
      ratedAtByMovie: nextState.ratedAtByMovie,
      haventWatchedAtByMovie: nextState.haventWatchedAtByMovie,
      removedAtByMovie: nextState.removedAtByMovie
    });
  }

  function startRating(movieId: string) {
    const baseRankings = removeMovieFromRankings(state.rankings, movieId);
    setState((prev) => ({
      ...prev,
      removedAtByMovie: Object.fromEntries(Object.entries(prev.removedAtByMovie).filter(([id]) => id !== movieId))
    }));
    setActiveRating({
      movieId,
      low: 0,
      high: -1,
      history: [],
      sessionId: crypto.randomUUID(),
      comparisons: [],
      baseRankings
    });
  }

  function chooseBucket(bucket: RatingBucket) {
    if (!activeRating) return;
    const bucketSize = activeRating.baseRankings[bucket].length;
    setActiveRating({ ...activeRating, bucket, low: 0, high: bucketSize - 1 });
  }

  function completeRating(insertAt: number, confidence: "high" | "medium", comparisonsOverride?: ActiveRating["comparisons"]) {
    if (!activeRating?.bucket) return;
    const movieId = activeRating.movieId;
    const bucket = activeRating.bucket;
    const comparisons = comparisonsOverride ?? activeRating.comparisons;
    const nextOrder = insertIntoBucket(activeRating.baseRankings[bucket], movieId, insertAt);
    const sessionRecord: ComparisonSession = {
      id: activeRating.sessionId,
      movieId,
      bucket,
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      comparisons,
      confidence
    };

    setState((prev) => {
      const nextState: AppState = {
        ...prev,
        rankings: { ...activeRating.baseRankings, [bucket]: nextOrder },
        sessions: { ...prev.sessions, [movieId]: sessionRecord },
        comparisonHistory: [...prev.comparisonHistory, ...comparisons],
        ratedAtByMovie: { ...prev.ratedAtByMovie, [movieId]: new Date().toISOString() },
        haventWatchedAtByMovie: Object.fromEntries(
          Object.entries(prev.haventWatchedAtByMovie).filter(([id]) => id !== movieId)
        ),
        removedAtByMovie: Object.fromEntries(Object.entries(prev.removedAtByMovie).filter(([id]) => id !== movieId))
      };
      persistState(nextState);
      return nextState;
    });
    setActiveRating(null);
  }

  function handleCompare(choice: "new" | "existing" | "skip") {
    if (!activeRating?.bucket) return;
    const bucketIds = activeRating.baseRankings[activeRating.bucket];
    const step = nextBinaryStep(bucketIds, activeRating.low, activeRating.high);
    if (!step) {
      completeRating(insertionIndexFromBounds(activeRating.low, activeRating.fallback), "high");
      return;
    }
    const existingMovieId = bucketIds[step.mid];
    const comparison = createComparison(
      activeRating.sessionId,
      activeRating.bucket,
      activeRating.movieId,
      existingMovieId,
      step.mid,
      choice
    );
    const bounds = updateBoundsForChoice(step, choice);
    const updatedComparisons = [...activeRating.comparisons, comparison];
    if (bounds.low > bounds.high) {
      completeRating(insertionIndexFromBounds(bounds.low, bounds.fallback), choice === "skip" ? "medium" : "high", updatedComparisons);
      return;
    }
    setActiveRating((prev) =>
      prev
        ? {
            ...prev,
            history: [...prev.history, { low: prev.low, high: prev.high, fallback: prev.fallback }],
            low: bounds.low,
            high: bounds.high,
            fallback: bounds.fallback ?? prev.fallback,
            comparisons: updatedComparisons
          }
        : prev
    );
  }

  function goBackInRating() {
    setActiveRating((prev) => {
      if (!prev || prev.history.length === 0) return prev;
      const last = prev.history[prev.history.length - 1];
      return {
        ...prev,
        low: last.low,
        high: last.high,
        fallback: last.fallback,
        history: prev.history.slice(0, -1),
        comparisons: prev.comparisons.slice(0, -1)
      };
    });
  }

  function markHaventWatched() {
    if (!activeRating) return;
    const movieId = activeRating.movieId;
    setState((prev) => {
      const nextState: AppState = {
        ...prev,
        rankings: removeMovieFromRankings(prev.rankings, movieId),
        sessions: Object.fromEntries(Object.entries(prev.sessions).filter(([id]) => id !== movieId)),
        haventWatchedAtByMovie: { ...prev.haventWatchedAtByMovie, [movieId]: new Date().toISOString() },
        removedAtByMovie: Object.fromEntries(Object.entries(prev.removedAtByMovie).filter(([id]) => id !== movieId))
      };
      persistState(nextState);
      return nextState;
    });
    setActiveRating(null);
  }

  async function handleImport(raw: string) {
    await importMoviesByTitles(parseImport(raw), user?.id);
    const movies = await fetchMovies();
    setState((prev) => ({ ...prev, movies }));
    setTab("movies");
  }

  function removeMovieForCurrentUser(movieId: string) {
    if (activeRating?.movieId === movieId) setActiveRating(null);
    if (detailMovieId === movieId) setDetailMovieId(null);

    setState((prev) => {
      const nextState: AppState = {
        ...prev,
        rankings: removeMovieFromRankings(prev.rankings, movieId),
        sessions: Object.fromEntries(Object.entries(prev.sessions).filter(([id]) => id !== movieId)),
        ratedAtByMovie: Object.fromEntries(Object.entries(prev.ratedAtByMovie).filter(([id]) => id !== movieId)),
        haventWatchedAtByMovie: Object.fromEntries(
          Object.entries(prev.haventWatchedAtByMovie).filter(([id]) => id !== movieId)
        ),
        removedAtByMovie: { ...prev.removedAtByMovie, [movieId]: new Date().toISOString() }
      };
      persistState(nextState);
      return nextState;
    });
  }

  async function handleRemoveMovieGlobally(movieId: string) {
    if (activeRating?.movieId === movieId) setActiveRating(null);
    if (detailMovieId === movieId) setDetailMovieId(null);
    try {
      await deleteMovieGlobally(movieId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove movie globally");
      return;
    }
    setState((prev) => {
      const nextState: AppState = {
        ...prev,
        movies: prev.movies.filter((m) => m.id !== movieId),
        rankings: removeMovieFromRankings(prev.rankings, movieId),
        sessions: Object.fromEntries(Object.entries(prev.sessions).filter(([id]) => id !== movieId)),
        ratedAtByMovie: Object.fromEntries(Object.entries(prev.ratedAtByMovie).filter(([id]) => id !== movieId)),
        haventWatchedAtByMovie: Object.fromEntries(
          Object.entries(prev.haventWatchedAtByMovie).filter(([id]) => id !== movieId)
        ),
        removedAtByMovie: Object.fromEntries(
          Object.entries(prev.removedAtByMovie).filter(([id]) => id !== movieId)
        )
      };
      persistState(nextState);
      return nextState;
    });
  }

  function handleExport() {
    const csv = exportRankingsCsv(state);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "movie-rankings.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function refreshFriends() {
    if (!user) return;
    setFriendships(await fetchFriendships(user.id));
  }

  async function handleSendRequest(targetUserId: string) {
    if (!user) return;
    await sendFriendRequest(user.id, targetUserId);
    await refreshFriends();
  }

  async function handleAccept(requestId: string) {
    await updateFriendRequestStatus(requestId, "accepted");
    await refreshFriends();
  }

  async function handleReject(requestId: string) {
    await updateFriendRequestStatus(requestId, "rejected");
    await refreshFriends();
  }

  async function handleCancel(requestId: string) {
    await updateFriendRequestStatus(requestId, "canceled");
    await refreshFriends();
  }

  const comparisonBucketIds = activeRating?.bucket ? activeRating.baseRankings[activeRating.bucket] : [];
  const activeStep = activeRating?.bucket ? nextBinaryStep(comparisonBucketIds, activeRating.low, activeRating.high) : null;
  const comparisonMovie = activeStep ? movieById.get(comparisonBucketIds[activeStep.mid]) ?? null : null;
  const activeMovie = activeRating ? movieById.get(activeRating.movieId) ?? null : null;

  const detailMovie = detailMovieId ? movieById.get(detailMovieId) : null;
  const detailRanking = detailMovieId ? rankedById.get(detailMovieId) : null;
  const detailSession = detailMovieId ? state.sessions[detailMovieId] : null;

  if (loading) {
    return <main className="mx-auto max-w-6xl p-6 text-zinc-300">Loading dashboard...</main>;
  }

  if (!session || !user) {
    return <AuthForm onAuthSuccess={() => void supabase.auth.getSession()} />;
  }

  return (
    <main className="mx-auto min-h-screen max-w-6xl p-4 sm:p-6">
      <ProfileHeader profile={profile} onProfileUpdated={() => loadDashboard(user)} />
      {error && <p className="mb-3 rounded border border-red-400/40 bg-red-500/10 p-2 text-sm text-red-200">{error}</p>}

      <div className="mb-4 flex flex-wrap gap-2">
        <button className="btn" onClick={handleExport}>
          Export CSV (Excel-friendly)
        </button>
        {(["movies", "rankings", "import", "friends"] as Tab[]).map((t) => (
          <button key={t} className={tab === t ? "btn-primary" : "btn"} onClick={() => setTab(t)}>
            {t[0].toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === "movies" && (
        <section className="space-y-3">
          {unratedMovies.length === 0 && (
            <article className="surface p-4 text-sm text-zinc-400">All movies are rated. Add more in Import.</article>
          )}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {unratedMovies.map((movie) => (
              <MovieCard
                key={movie.id}
                movie={movie}
                bucketLabel={state.haventWatchedAtByMovie[movie.id] ? "Haven't watched" : "Not rated"}
                onRate={() => startRating(movie.id)}
                onRemove={() => removeMovieForCurrentUser(movie.id)}
                currentUserId={user?.id}
                onRemoveGlobally={() => handleRemoveMovieGlobally(movie.id)}
              />
            ))}
          </div>
        </section>
      )}

      {tab === "rankings" && (
        <RankingsView
          rankings={state.rankings}
          movieById={movieById}
          rankedById={rankedById}
          onInspectMovie={setDetailMovieId}
          onRemoveMovie={removeMovieForCurrentUser}
          onRemoveMovieGlobally={handleRemoveMovieGlobally}
          currentUserId={user?.id}
        />
      )}
      {tab === "import" && <ImportPanel onImport={handleImport} />}
      {tab === "friends" && (
        <FriendsPanel
          friendships={friendships}
          searchResults={searchResults}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onSendRequest={handleSendRequest}
          onAccept={handleAccept}
          onReject={handleReject}
          onCancel={handleCancel}
        />
      )}

      {activeRating && activeMovie && (
        <RatingModal
          movie={activeMovie}
          bucket={activeRating.bucket}
          activeStep={activeStep}
          comparisonMovie={comparisonMovie}
          onChooseBucket={chooseBucket}
          onCompare={handleCompare}
          onGoBack={goBackInRating}
          onHaventWatched={markHaventWatched}
          onClose={() => setActiveRating(null)}
        />
      )}

      {detailMovie && detailRanking && (
        <MovieDetailDrawer
          movie={detailMovie}
          rank={detailRanking}
          session={detailSession ?? undefined}
          movieById={movieById}
          onClose={() => setDetailMovieId(null)}
          onRerate={() => {
            setDetailMovieId(null);
            startRating(detailMovie.id);
          }}
        />
      )}
    </main>
  );
}
