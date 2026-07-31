-- Speak: initial schema
-- Multi-user grammar coach. Every table is protected by Row Level Security (RLS)
-- so each signed-in user can only read and write their own rows.

-- ---------------------------------------------------------------------------
-- 1. Canonical mistake categories (reference table)
-- ---------------------------------------------------------------------------
-- This fixed taxonomy is the backbone of the Progress Profile. Claude must tag
-- every mistake with one of these slugs, which lets us aggregate reliably
-- ("you make prepositions mistakes 3x more than anything else").
create table public.mistake_categories (
  slug        text primary key,
  label       text not null,
  description text not null,
  sort_order  int  not null default 0
);

insert into public.mistake_categories (slug, label, description, sort_order) values
  ('verb_tense',              'Verb tense',              'Wrong or inconsistent tense (past, present, future, perfect).', 1),
  ('subject_verb_agreement',  'Subject-verb agreement',  'Verb does not agree with the subject in number or person.', 2),
  ('prepositions',            'Prepositions',            'Wrong or missing preposition (in, on, at, for, to).', 3),
  ('articles',                'Articles',                'Wrong or missing article (a, an, the).', 4),
  ('word_choice',             'Word choice',             'Unnatural or incorrect vocabulary for the meaning.', 5),
  ('word_order',              'Word order',              'Words arranged in an order a native speaker would not use.', 6),
  ('plurals_countability',    'Plurals and countability','Singular/plural errors or treating uncountable nouns as countable.', 7),
  ('pronouns',                'Pronouns',                'Wrong or unclear pronoun.', 8),
  ('conjunctions',            'Linking words',           'Wrong or missing conjunction / connector between ideas.', 9),
  ('spelling',                'Spelling',                'Misspelled word.', 10),
  ('punctuation',             'Punctuation',             'Incorrect punctuation that changes clarity or meaning.', 11),
  ('false_friend',            'Direct translation',      'A word or phrase translated literally from another language (false friend).', 12),
  ('naturalness',             'Naturalness',             'Grammatically valid but not how a native speaker would say it.', 13);

-- Reference data is world-readable; no per-user rows here.
alter table public.mistake_categories enable row level security;
create policy "categories are readable by everyone"
  on public.mistake_categories for select using (true);

-- ---------------------------------------------------------------------------
-- 2. Profiles (one row per auth user)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id              uuid primary key references auth.users (id) on delete cascade,
  display_name    text,
  native_language text,
  created_at      timestamptz not null default now()
);

alter table public.profiles enable row level security;
create policy "users read own profile"   on public.profiles for select using (auth.uid() = id);
create policy "users insert own profile" on public.profiles for insert with check (auth.uid() = id);
create policy "users update own profile" on public.profiles for update using (auth.uid() = id);

-- Auto-create a profile row whenever a new auth user signs up.
create function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, new.raw_user_meta_data ->> 'display_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- 3. Entries (one row per submitted message)
-- ---------------------------------------------------------------------------
create table public.entries (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users (id) on delete cascade,
  source           text not null default 'text' check (source in ('text', 'audio')),
  original_text    text not null,          -- what the user typed, or the transcript
  corrected_text   text,                   -- Claude's natural, corrected version
  alternative_text text,                   -- a different natural phrasing
  audio_path       text,                   -- storage path when source = 'audio'
  created_at       timestamptz not null default now()
);

create index entries_user_created_idx on public.entries (user_id, created_at desc);

alter table public.entries enable row level security;
create policy "users read own entries"   on public.entries for select using (auth.uid() = user_id);
create policy "users insert own entries" on public.entries for insert with check (auth.uid() = user_id);
create policy "users update own entries" on public.entries for update using (auth.uid() = user_id);
create policy "users delete own entries" on public.entries for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 4. Mistakes (many per entry) — the data the Profile aggregates
-- ---------------------------------------------------------------------------
create table public.mistakes (
  id               uuid primary key default gen_random_uuid(),
  entry_id         uuid not null references public.entries (id) on delete cascade,
  user_id          uuid not null references auth.users (id) on delete cascade,
  category         text not null references public.mistake_categories (slug),
  original_snippet text not null,          -- the exact wrong text
  correction       text not null,          -- the fixed version of that snippet
  explanation      text not null,          -- why it was wrong, in plain language
  severity         text not null default 'minor' check (severity in ('minor', 'moderate', 'major')),
  created_at       timestamptz not null default now()
);

create index mistakes_user_category_idx on public.mistakes (user_id, category);
create index mistakes_entry_idx         on public.mistakes (entry_id);

alter table public.mistakes enable row level security;
create policy "users read own mistakes"   on public.mistakes for select using (auth.uid() = user_id);
create policy "users insert own mistakes" on public.mistakes for insert with check (auth.uid() = user_id);
create policy "users delete own mistakes" on public.mistakes for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 5. Profile aggregation view — powers the "areas to study" screen
-- ---------------------------------------------------------------------------
-- Counts each user's mistakes per category. RLS on the underlying tables means
-- a user only ever sees their own totals through this view.
create view public.category_stats
with (security_invoker = true) as
select
  m.user_id,
  m.category,
  c.label,
  count(*)                                          as total,
  count(*) filter (where m.severity = 'major')      as major,
  count(*) filter (where m.severity = 'moderate')   as moderate,
  count(*) filter (where m.severity = 'minor')      as minor,
  max(m.created_at)                                 as last_seen
from public.mistakes m
join public.mistake_categories c on c.slug = m.category
group by m.user_id, m.category, c.label;
