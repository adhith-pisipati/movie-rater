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
  console.log("[OMDB] key present:", !!apiKey, "title:", title);
  if (!apiKey) {
    console.warn("[fetchOmdbData] NEXT_PUBLIC_OMDB_API_KEY is not set — add it to .env.local");
    return null;
  }

  const url = `https://www.omdbapi.com/?t=${encodeURIComponent(title)}&plot=full&apikey=${apiKey}`;
  console.log("[OMDB] fetching:", url);

  try {
    const res = await fetch(url);
    console.log("[OMDB] status:", res.status, res.ok);
    if (!res.ok) return null;
    const data = await res.json() as Record<string, string>;
    console.log("[OMDB response]", data);
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
