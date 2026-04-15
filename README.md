# Movie Rater (Supabase Edition)

Movie Rater is a comparative movie-ranking app inspired by Beli-style pairwise ranking UX.

> This is inspired by Beli-style comparative ranking, but it is **not an official Beli clone** and does **not** claim to replicate any proprietary Beli internal scoring formula.

## Stack

- Next.js (App Router)
- React + TypeScript
- Tailwind CSS
- Supabase Auth
- Supabase Postgres + RLS

## Core Behavior

- Bucket-first rating: `good`, `okay`, `bad`
- Pairwise insertion using binary-search-style comparisons
- Per-user editable ratings/rankings
- Public user profiles + public rankings (for authenticated users)
- Friend requests: send, accept, reject, cancel
- Shared movie catalog
- CSV export

## Supabase Setup

1. Create a Supabase project.
2. Go to `Project Settings -> API`.
3. Copy:
   - `Project URL`
   - `anon public` key
4. Create `.env.local` from `.env.example`:

```bash
cp .env.example .env.local
```

5. Fill env vars in `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

6. Open Supabase SQL Editor and run:
   - `supabase/schema.sql`

This creates all required tables, indexes, constraints, triggers, and RLS policies.

## Local Run

1. Install Node.js 18+
2. Install dependencies:

```bash
npm install
```

3. Run:

```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000)

## Deploy to Vercel

1. Push this repo to GitHub/GitLab/Bitbucket.
2. Import the repo in Vercel.
3. In Vercel Project Settings -> Environment Variables, add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy.

### Supabase Auth Production Settings

In Supabase Dashboard:

1. Go to `Authentication -> URL Configuration`.
2. Set **Site URL** to your Vercel production URL, e.g.:
   - `https://your-app.vercel.app`
3. Add **Redirect URLs** for:
   - `https://your-app.vercel.app`
   - `https://your-app-git-*.vercel.app` (optional preview deployments)
   - `http://localhost:3000` (local development)

Without these URLs, auth redirects/session restoration can fail in production.

## Auth Flow

- Email/password signup and login
- On signup, a profile row is auto-created by DB trigger
- Users can edit username/full name in-app
- Logout supported from the dashboard

## Database Tables

- `profiles`: public user profiles
- `movies`: shared movie catalog
- `ratings`: per-user ranked ratings and comparison history
- `user_movie_states`: tracks "haven't watched"
- `friendships`: requests + accepted friendships

## Friends & Public Rankings

- Search users by username
- Send friend requests
- Accept/reject incoming requests
- Cancel outgoing requests
- View friend profiles
- Public profile route:
  - `/profile/[username]`
- Public rankings are visible to authenticated users (enforced with RLS select policies)

## Ranking Algorithm

Ranking logic is preserved from the original app:

1. Choose bucket (`good`, `okay`, `bad`)
2. Compare new movie with midpoint movie in that bucket
3. Click the movie card you prefer
4. Bounds shift using binary insertion
5. Insert at final index

Skip fallback keeps flow moving when comparisons are hard.

## Important Notes

- Supabase is now the canonical source of truth for ratings/profile/social data.
- Local component state is used only for interactive UI responsiveness.
- Movie seed list is also provided in SQL and import UI.
# movie-rater
