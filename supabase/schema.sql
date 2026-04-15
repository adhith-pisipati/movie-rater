-- Movie Rater Supabase schema
-- Run in Supabase SQL Editor.

create extension if not exists pgcrypto;

-- -------------------------------------------------------------------
-- Profiles
-- -------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

create unique index if not exists profiles_username_lower_idx on public.profiles (lower(username));

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  email_prefix text;
  generated_username text;
begin
  email_prefix := split_part(new.email, '@', 1);
  generated_username := coalesce(nullif(new.raw_user_meta_data ->> 'username_hint', ''), email_prefix);
  generated_username := regexp_replace(lower(generated_username), '[^a-z0-9_]', '', 'g');
  if generated_username = '' then
    generated_username := 'user';
  end if;
  generated_username := generated_username || '_' || substr(new.id::text, 1, 8);

  insert into public.profiles (id, username)
  values (new.id, generated_username)
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user_profile();

-- -------------------------------------------------------------------
-- Movie catalog (shared)
-- -------------------------------------------------------------------
create table if not exists public.movies (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  year int,
  normalized_title text not null unique,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

create index if not exists movies_title_idx on public.movies (title);
create index if not exists movies_year_idx on public.movies (year);

-- -------------------------------------------------------------------
-- User ratings (private write, public read to signed-in users)
-- -------------------------------------------------------------------
do $$ begin
  create type public.rating_bucket as enum ('good', 'okay', 'bad');
exception when duplicate_object then null;
end $$;

create table if not exists public.ratings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  movie_id uuid not null references public.movies(id) on delete cascade,
  bucket public.rating_bucket not null,
  rank_in_bucket int not null check (rank_in_bucket > 0),
  score numeric(4, 1) not null check (score >= 0 and score <= 10),
  comparison_history jsonb not null default '[]'::jsonb,
  rated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, movie_id),
  unique (user_id, bucket, rank_in_bucket)
);

create index if not exists ratings_user_idx on public.ratings (user_id);
create index if not exists ratings_user_bucket_idx on public.ratings (user_id, bucket, rank_in_bucket);
create index if not exists ratings_movie_idx on public.ratings (movie_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists ratings_set_updated_at on public.ratings;
create trigger ratings_set_updated_at
before update on public.ratings
for each row execute function public.set_updated_at();

-- -------------------------------------------------------------------
-- User movie states (for "Haven't watched" and per-user removed movies)
-- -------------------------------------------------------------------
do $$ begin
  create type public.user_movie_status as enum ('havent_watched');
exception when duplicate_object then null;
end $$;
do $$ begin
  alter type public.user_movie_status add value if not exists 'removed';
exception when others then null;
end $$;

create table if not exists public.user_movie_states (
  user_id uuid not null references auth.users(id) on delete cascade,
  movie_id uuid not null references public.movies(id) on delete cascade,
  status public.user_movie_status not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, movie_id)
);

create index if not exists user_movie_states_user_idx on public.user_movie_states (user_id);

-- -------------------------------------------------------------------
-- Friend requests / friendships
-- -------------------------------------------------------------------
do $$ begin
  create type public.friendship_status as enum ('pending', 'accepted', 'rejected', 'canceled');
exception when duplicate_object then null;
end $$;

create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users(id) on delete cascade,
  addressee_id uuid not null references auth.users(id) on delete cascade,
  status public.friendship_status not null default 'pending',
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  lower_user_id uuid generated always as (least(requester_id, addressee_id)) stored,
  higher_user_id uuid generated always as (greatest(requester_id, addressee_id)) stored,
  check (requester_id <> addressee_id)
);

create unique index if not exists friendships_unique_pair_idx
  on public.friendships (lower_user_id, higher_user_id);

create index if not exists friendships_requester_idx on public.friendships (requester_id, status);
create index if not exists friendships_addressee_idx on public.friendships (addressee_id, status);

-- -------------------------------------------------------------------
-- RLS
-- -------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.movies enable row level security;
alter table public.ratings enable row level security;
alter table public.user_movie_states enable row level security;
alter table public.friendships enable row level security;

-- Profiles: authenticated users can view all profiles, edit only their own.
drop policy if exists profiles_select_authenticated on public.profiles;
create policy profiles_select_authenticated on public.profiles
for select to authenticated
using (true);

drop policy if exists profiles_insert_self on public.profiles;
create policy profiles_insert_self on public.profiles
for insert to authenticated
with check (auth.uid() = id);

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
for update to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

-- Movies: authenticated users can read all; authenticated users can insert.
drop policy if exists movies_select_authenticated on public.movies;
create policy movies_select_authenticated on public.movies
for select to authenticated
using (true);

drop policy if exists movies_insert_authenticated on public.movies;
create policy movies_insert_authenticated on public.movies
for insert to authenticated
with check (true);

drop policy if exists movies_delete_creator on public.movies;
create policy movies_delete_creator on public.movies
for delete to authenticated
using (auth.uid() = created_by);

-- Ratings: authenticated users can read rankings; users write only their own rows.
drop policy if exists ratings_select_authenticated on public.ratings;
create policy ratings_select_authenticated on public.ratings
for select to authenticated
using (true);

drop policy if exists ratings_insert_own on public.ratings;
create policy ratings_insert_own on public.ratings
for insert to authenticated
with check (auth.uid() = user_id);

drop policy if exists ratings_update_own on public.ratings;
create policy ratings_update_own on public.ratings
for update to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists ratings_delete_own on public.ratings;
create policy ratings_delete_own on public.ratings
for delete to authenticated
using (auth.uid() = user_id);

-- User movie states: users can only manage their own rows.
drop policy if exists user_movie_states_select_own on public.user_movie_states;
create policy user_movie_states_select_own on public.user_movie_states
for select to authenticated
using (auth.uid() = user_id);

drop policy if exists user_movie_states_insert_own on public.user_movie_states;
create policy user_movie_states_insert_own on public.user_movie_states
for insert to authenticated
with check (auth.uid() = user_id);

drop policy if exists user_movie_states_update_own on public.user_movie_states;
create policy user_movie_states_update_own on public.user_movie_states
for update to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists user_movie_states_delete_own on public.user_movie_states;
create policy user_movie_states_delete_own on public.user_movie_states
for delete to authenticated
using (auth.uid() = user_id);

-- Friendships: both parties can view; requester creates; both parties can update relevant statuses.
drop policy if exists friendships_select_participants on public.friendships;
create policy friendships_select_participants on public.friendships
for select to authenticated
using (auth.uid() = requester_id or auth.uid() = addressee_id);

drop policy if exists friendships_insert_requester on public.friendships;
create policy friendships_insert_requester on public.friendships
for insert to authenticated
with check (auth.uid() = requester_id and requester_id <> addressee_id and status = 'pending');

drop policy if exists friendships_update_addressee on public.friendships;
create policy friendships_update_addressee on public.friendships
for update to authenticated
using (auth.uid() = addressee_id and status = 'pending')
with check (auth.uid() = addressee_id and status in ('accepted', 'rejected'));

drop policy if exists friendships_update_requester_cancel on public.friendships;
create policy friendships_update_requester_cancel on public.friendships
for update to authenticated
using (auth.uid() = requester_id and status = 'pending')
with check (auth.uid() = requester_id and status = 'canceled');

-- -------------------------------------------------------------------
-- Seed movie catalog (safe upserts)
-- -------------------------------------------------------------------
insert into public.movies (title, normalized_title)
values
  ('The Dark Knight', 'the dark knight'),
  ('Interstellar', 'interstellar'),
  ('Parasite', 'parasite'),
  ('Whiplash', 'whiplash'),
  ('The Social Network', 'the social network'),
  ('No Country for Old Men', 'no country for old men'),
  ('La La Land', 'la la land'),
  ('Arrival', 'arrival'),
  ('The Godfather', 'the godfather'),
  ('Goodfellas', 'goodfellas')
on conflict (normalized_title) do nothing;
