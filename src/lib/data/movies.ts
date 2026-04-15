import { Movie } from "@/lib/types";
import { supabase } from "@/lib/supabase/client";
import { MovieRow } from "@/lib/supabase/types";

const normalizeTitle = (title: string) => title.trim().toLowerCase().replace(/\s+/g, " ");

export async function fetchMovies(): Promise<Movie[]> {
  const { data, error } = await supabase.from("movies").select("*").order("title");
  if (error) throw error;
  return (data as MovieRow[]).map((row) => ({
    id: row.id,
    title: row.title,
    year: row.year ?? undefined,
    createdAt: row.created_at
  }));
}

export async function importMoviesByTitles(titles: string[]): Promise<void> {
  const cleaned = Array.from(new Set(titles.map((t) => t.trim()).filter(Boolean)));
  if (cleaned.length === 0) return;

  const normalized = cleaned.map(normalizeTitle);
  const { data: existing, error: selectError } = await supabase
    .from("movies")
    .select("normalized_title")
    .in("normalized_title", normalized);
  if (selectError) throw selectError;

  const existingSet = new Set((existing ?? []).map((row) => row.normalized_title));
  const toInsert = cleaned
    .filter((title) => !existingSet.has(normalizeTitle(title)))
    .map((title) => ({
      title,
      normalized_title: normalizeTitle(title)
    }));

  if (toInsert.length === 0) return;
  const { error: insertError } = await supabase.from("movies").insert(toInsert);
  if (insertError) throw insertError;
}
