-- Reinforcement clusters: each practice item now records the everyday situation
-- it is set in and the underlying mistake/rule it reinforces, so the learner
-- can see the same lesson show up across different contexts.
alter table public.practice_items
  add column context  text, -- short situation label, e.g. "At work", "Texting a friend"
  add column based_on text; -- the underlying mistake/rule this item reinforces, in plain language
