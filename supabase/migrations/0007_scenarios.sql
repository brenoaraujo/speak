-- Feature 2: Production practice. A shared bank of everyday scenarios the app
-- prompts the user to respond to cold (speaking or typing), then runs the
-- response through the same correction pipeline.
create table public.scenarios (
  id                uuid primary key default gen_random_uuid(),
  prompt_text       text not null,           -- the situation shown to the learner
  target_categories text[] not null default '{}', -- mistake categories this tends to surface
  difficulty        text not null default 'everyday'
                      check (difficulty in ('basic', 'everyday', 'professional')),
  created_at        timestamptz not null default now()
);

-- Reference data: any signed-in user can read the bank; nobody writes to it.
alter table public.scenarios enable row level security;
create policy "scenarios are readable by everyone"
  on public.scenarios for select using (true);

insert into public.scenarios (prompt_text, target_categories, difficulty) values
  ('Text a friend to say you are running about 15 minutes late to dinner.', '{verb_tense,prepositions}', 'basic'),
  ('Order a coffee and a pastry at a cafe, and ask if they have oat milk.', '{articles,plurals_countability}', 'basic'),
  ('Introduce yourself to a new neighbor you just met in the hallway.', '{verb_tense,naturalness}', 'basic'),
  ('Ask a coworker if they can give you feedback on a document by tomorrow.', '{prepositions,verb_tense,word_choice}', 'everyday'),
  ('Text your landlord that the kitchen sink has been leaking since yesterday.', '{verb_tense,prepositions}', 'everyday'),
  ('Politely decline an invitation to a party because you already have plans.', '{word_choice,naturalness,conjunctions}', 'everyday'),
  ('Explain to a doctor that you have had a headache for three days.', '{verb_tense,prepositions}', 'everyday'),
  ('Ask a store to refund something you bought last week that stopped working.', '{verb_tense,articles}', 'everyday'),
  ('Leave a short voicemail canceling a dentist appointment and asking to reschedule.', '{verb_tense,word_order}', 'everyday'),
  ('Tell a friend about a movie you watched over the weekend and whether you liked it.', '{verb_tense,pronouns}', 'everyday'),
  ('Ask your child''s teacher how your child is doing in class this term.', '{subject_verb_agreement,prepositions}', 'everyday'),
  ('Give a stranger directions from the bus stop to the nearest pharmacy.', '{prepositions,word_order}', 'everyday'),
  ('Write a message to reschedule a meeting because something urgent came up.', '{verb_tense,word_choice,naturalness}', 'professional'),
  ('Disagree politely with a colleague''s suggestion in a team discussion.', '{conjunctions,word_choice,naturalness}', 'professional'),
  ('Ask your manager for a day off next Friday and explain why briefly.', '{prepositions,verb_tense}', 'professional'),
  ('Apologize to a client for a delay and explain what you are doing to fix it.', '{verb_tense,word_choice}', 'professional'),
  ('Summarize what you did last week for a quick standup update.', '{verb_tense,subject_verb_agreement}', 'professional'),
  ('Negotiate a later deadline with a client without sounding unreliable.', '{conjunctions,naturalness,word_choice}', 'professional');

-- Link an entry to the scenario it answered. A non-null scenario_id marks an
-- entry as coming from production practice. `coverage` stores Claude's note on
-- whether the response actually addressed the scenario.
alter table public.entries
  add column scenario_id uuid references public.scenarios (id) on delete set null,
  add column coverage    text;
