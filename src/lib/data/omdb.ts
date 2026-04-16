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

export type OmdbFailureReason = "missing_key" | "missing_title" | "not_found" | "request_failed";

export async function fetchOmdbData(
  title: string
): Promise<{ data: OmdbData | null; reason?: OmdbFailureReason }> {
  try {
    const res = await fetch(`/api/omdb?title=${encodeURIComponent(title)}`);
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { reason?: OmdbFailureReason } | null;
      return { data: null, reason: body?.reason ?? "request_failed" };
    }
    const body = (await res.json()) as { ok: boolean; data?: Record<string, string>; reason?: OmdbFailureReason };
    if (!body.ok || !body.data) {
      return { data: null, reason: body.reason ?? "not_found" };
    }

    const data = body.data;
    return {
      data: {
        title: data["Title"] ?? title,
        year: data["Year"] ?? "",
        plot: data["Plot"] ?? "",
        poster: data["Poster"] && data["Poster"] !== "N/A" ? data["Poster"] : null,
        director: data["Director"] ?? "",
        actors: data["Actors"] ?? "",
        genre: data["Genre"] ?? "",
        imdbRating: data["imdbRating"] ?? "N/A"
      }
    };
  } catch {
    return { data: null, reason: "request_failed" };
  }
}
