-- "How can I say" feature: the user describes what they want to say and gets a
-- natural sentence back, with tone variations and tips. One row per request.
create table public.phrases (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  intent       text not null,               -- what the user wants to say / the situation
  best         text not null,               -- the recommended natural sentence
  alternatives jsonb not null default '[]', -- [{ "text": ..., "tone": ... }]
  tips         jsonb not null default '[]', -- ["short practical tip", ...]
  note         text,                        -- one line of context, optional
  created_at   timestamptz not null default now()
);

create index phrases_user_created_idx on public.phrases (user_id, created_at desc);

alter table public.phrases enable row level security;
create policy "users read own phrases"   on public.phrases for select using (auth.uid() = user_id);
create policy "users insert own phrases" on public.phrases for insert with check (auth.uid() = user_id);
create policy "users delete own phrases" on public.phrases for delete using (auth.uid() = user_id);
