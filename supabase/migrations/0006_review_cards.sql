-- Feature 1: Spaced repetition for mistake flashcards.
-- One review card per mistake instance, scheduled with an SM-2 style algorithm.
-- Cards are created by the correction pipeline (analyze) and the production
-- practice pipeline (produce); the `source` column records which.
create table public.review_cards (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users (id) on delete cascade,
  mistake_id       uuid references public.mistakes (id) on delete set null,
  category         text not null references public.mistake_categories (slug),
  source           text not null default 'correction'
                     check (source in ('correction', 'production_practice')),
  -- Snapshot of what to review, so a card is self-contained even if the entry
  -- or mistake is later deleted.
  original_text    text not null, -- the full sentence for context
  original_snippet text not null, -- the exact wrong part (blanked out during review)
  correction       text not null, -- the expected fix
  explanation      text not null,
  -- SM-2 scheduling state.
  last_reviewed_at timestamptz,
  next_review_at   timestamptz not null default (now() + interval '1 day'),
  interval         int  not null default 1,        -- days until next review
  ease_factor      real not null default 2.5,      -- grows/shrinks the interval
  review_count     int  not null default 0,
  created_at       timestamptz not null default now()
);

-- The hot query: "which of my cards are due now", weakest-first handled in app.
create index review_cards_due_idx on public.review_cards (user_id, next_review_at);
create index review_cards_category_idx on public.review_cards (user_id, category);

alter table public.review_cards enable row level security;
create policy "users read own review cards"   on public.review_cards for select using (auth.uid() = user_id);
create policy "users insert own review cards" on public.review_cards for insert with check (auth.uid() = user_id);
create policy "users update own review cards" on public.review_cards for update using (auth.uid() = user_id);
create policy "users delete own review cards" on public.review_cards for delete using (auth.uid() = user_id);
