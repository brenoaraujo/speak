-- Learning area: personalized practice items generated from the user's mistakes.
-- One table holds both flashcards and multiple-choice exercises.
create table public.practice_items (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  category      text not null references public.mistake_categories (slug),
  kind          text not null check (kind in ('flashcard', 'multiple_choice')),
  front         text not null,               -- question / prompt
  back          text not null,               -- correct answer
  options       jsonb not null default '[]', -- choices for multiple_choice; [] for flashcards
  explanation   text not null,
  status        text not null default 'new' check (status in ('new', 'learning', 'mastered')),
  times_seen    int not null default 0,
  times_correct int not null default 0,
  created_at    timestamptz not null default now()
);

create index practice_items_user_status_idx on public.practice_items (user_id, status);

alter table public.practice_items enable row level security;
create policy "users read own practice"   on public.practice_items for select using (auth.uid() = user_id);
create policy "users insert own practice" on public.practice_items for insert with check (auth.uid() = user_id);
create policy "users update own practice" on public.practice_items for update using (auth.uid() = user_id);
create policy "users delete own practice" on public.practice_items for delete using (auth.uid() = user_id);
