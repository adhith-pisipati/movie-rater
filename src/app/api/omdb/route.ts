import { NextResponse } from "next/server";

type OmdbRaw = Record<string, string>;

function sanitizeTitle(title: string): string {
  return title
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/\([^)]*\)/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchJson(url: string): Promise<OmdbRaw> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`OMDb request failed: ${res.status}`);
  }
  return (await res.json()) as OmdbRaw;
}

export async function GET(req: Request) {
  const apiKey = process.env.OMDB_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ ok: false, reason: "missing_key" }, { status: 500 });
  }

  const { searchParams } = new URL(req.url);
  const rawTitle = (searchParams.get("title") ?? "").trim();
  if (!rawTitle) {
    return NextResponse.json({ ok: false, reason: "missing_title" }, { status: 400 });
  }

  const title = sanitizeTitle(rawTitle);
  const base = "https://www.omdbapi.com/";

  // Attempt 1: exact title lookup
  const exactUrl = `${base}?t=${encodeURIComponent(title)}&plot=full&apikey=${apiKey}`;
  const exact = await fetchJson(exactUrl);
  if (exact["Response"] !== "False") {
    return NextResponse.json({ ok: true, data: exact });
  }

  // Attempt 2: search for closest result, then fetch by imdbID
  const searchUrl = `${base}?s=${encodeURIComponent(title)}&type=movie&apikey=${apiKey}`;
  const search = await fetchJson(searchUrl);
  if (search["Response"] === "False") {
    return NextResponse.json({ ok: false, reason: "not_found", debug: { title } }, { status: 200 });
  }

  // OMDb returns Search array; keep this lightweight: choose first result.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const first = (search as any).Search?.[0];
  const imdbID = first?.imdbID;
  if (!imdbID) {
    return NextResponse.json({ ok: false, reason: "not_found", debug: { title } }, { status: 200 });
  }

  const byIdUrl = `${base}?i=${encodeURIComponent(imdbID)}&plot=full&apikey=${apiKey}`;
  const byId = await fetchJson(byIdUrl);
  if (byId["Response"] === "False") {
    return NextResponse.json({ ok: false, reason: "not_found", debug: { title } }, { status: 200 });
  }

  return NextResponse.json({ ok: true, data: byId });
}

