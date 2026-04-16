import { Movie } from "@/lib/types";
import { globalMovieSeedTitles } from "@/data/globalMovieSeed";
import { supabase } from "@/lib/supabase/client";
import { MovieRow } from "@/lib/supabase/types";

const normalizeTitle = (title: string) => title.trim().toLowerCase().replace(/\s+/g, " ");
let seededGlobalCatalog = false;

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

export async function fetchMovies(): Promise<Movie[]> {
  const { data, error } = await supabase.from("movies").select("*").order("title");
  if (error) throw error;
  return (data as MovieRow[]).map((row) => ({
    id: row.id,
    title: row.title,
    year: row.year ?? undefined,
    createdAt: row.created_at,
    createdBy: row.created_by ?? undefined
  }));
}

export async function importMoviesByTitles(titles: string[], userId?: string): Promise<void> {
  const cleaned = Array.from(new Set(titles.map((t) => t.trim()).filter(Boolean)));
  if (cleaned.length === 0) return;

  const normalizedByTitle = new Map(cleaned.map((title) => [title, normalizeTitle(title)]));
  const normalized = Array.from(new Set(normalizedByTitle.values()));
  const existingSet = new Set<string>();

  for (const slice of chunk(normalized, 200)) {
    const { data: existing, error: selectError } = await supabase
      .from("movies")
      .select("normalized_title")
      .in("normalized_title", slice);
    if (selectError) throw selectError;
    (existing ?? []).forEach((row: { normalized_title: string }) => existingSet.add(row.normalized_title));
  }

  const toInsert = cleaned
    .filter((title) => !existingSet.has(normalizedByTitle.get(title) ?? ""))
    .map((title) => ({
      title,
      normalized_title: normalizedByTitle.get(title) ?? normalizeTitle(title),
      ...(userId ? { created_by: userId } : {})
    }));

  if (toInsert.length === 0) return;

  for (const slice of chunk(toInsert, 200)) {
    const { error: insertError } = await supabase.from("movies").insert(slice);
    if (insertError) throw insertError;
  }
}

export async function ensureGlobalMovieCatalogSeeded(): Promise<void> {
  if (seededGlobalCatalog) return;
  await importMoviesByTitles(globalMovieSeedTitles);
  seededGlobalCatalog = true;
}

export async function deleteMovieGlobally(movieId: string): Promise<void> {
  const { data, error } = await supabase.from("movies").delete().eq("id", movieId).select("id");
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error("Movie could not be deleted (not found or permission denied).");
  }
}
