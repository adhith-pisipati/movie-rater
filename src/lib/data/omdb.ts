export interface OmdbData {
  title: string;
  year: string;
  plot: string;
  poster: string | null;
  director: string;
  actors: string;
  genre: string;
  imdbRating: string;
}

export async function fetchOmdbData(title: string): Promise<OmdbData | null> {
  const apiKey = process.env.NEXT_PUBLIC_OMDB_API_KEY;
  if (!apiKey) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[fetchOmdbData] NEXT_PUBLIC_OMDB_API_KEY is not set — add it to .env.local");
    }
    return null;
  }

  const url = `https://www.omdbapi.com/?t=${encodeURIComponent(title)}&plot=full&apikey=${apiKey}`;

  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json() as Record<string, string>;
    if (data["Response"] === "False") return null;

    return {
      title: data["Title"] ?? title,
      year: data["Year"] ?? "",
      plot: data["Plot"] ?? "",
      poster: data["Poster"] && data["Poster"] !== "N/A" ? data["Poster"] : null,
      director: data["Director"] ?? "",
      actors: data["Actors"] ?? "",
      genre: data["Genre"] ?? "",
      imdbRating: data["imdbRating"] ?? "N/A"
    };
  } catch {
    return null;
  }
}
