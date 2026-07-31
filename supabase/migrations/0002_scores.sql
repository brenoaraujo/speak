-- Add a per-message score and a short assessment line to each entry.
-- score is 0..100; null for entries created before this feature.
alter table public.entries
  add column if not exists score int check (score between 0 and 100),
  add column if not exists assessment text;
