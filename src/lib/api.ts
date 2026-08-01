// Thin client for the Supabase Edge Functions and data reads.
import { supabase } from './supabase';
import type {
  AnalyzeResponse,
  CategoryStat,
  Entry,
  GradeResult,
  Mistake,
  Phrase,
  PracticeItem,
  ProduceResponse,
  ReviewCard,
  SayResponse,
  Scenario,
} from './types';
import { computeSchedule, type Schedule } from './srs';
import type { ReviewRating } from './types';

// Send text to the `analyze` function. The user's session token is attached
// automatically by supabase.functions.invoke, so the function knows who it is.
export async function analyzeText(
  text: string,
  source: 'text' | 'audio' = 'text',
): Promise<AnalyzeResponse> {
  const { data, error } = await supabase.functions.invoke<AnalyzeResponse>('analyze', {
    body: { text, source },
  });
  if (error) throw error;
  if (!data) throw new Error('No response from analyze');
  return data;
}

// --- Feature 1: Spaced repetition review ---

// How many cards are due right now (for the "due today" badge).
export async function countDueReviewCards(): Promise<number> {
  const { count, error } = await supabase
    .from('review_cards')
    .select('id', { count: 'exact', head: true })
    .lte('next_review_at', new Date().toISOString());
  if (error) throw error;
  return count ?? 0;
}

// Due cards, weakest categories first so a short session hits what matters most.
export async function fetchDueReviewCards(limit = 20): Promise<ReviewCard[]> {
  const now = new Date().toISOString();
  const [{ data: due, error }, stats] = await Promise.all([
    supabase
      .from('review_cards')
      .select('*')
      .lte('next_review_at', now)
      .order('next_review_at', { ascending: true }),
    fetchCategoryStats().catch(() => [] as CategoryStat[]),
  ]);
  if (error) throw error;
  const cards = (due as ReviewCard[]) ?? [];

  // Rank categories by how often the user gets them wrong (most first).
  const weakRank = new Map<string, number>();
  stats.forEach((s, i) => weakRank.set(s.category, i));
  const rankOf = (c: ReviewCard) => weakRank.get(c.category) ?? Number.MAX_SAFE_INTEGER;

  return [...cards].sort((a, b) => rankOf(a) - rankOf(b)).slice(0, limit);
}

// Ask Claude whether the learner's answer fixes the mistake (many fixes valid).
export async function gradeReview(card: ReviewCard, answer: string): Promise<GradeResult> {
  const { data, error } = await supabase.functions.invoke<GradeResult>('grade-review', {
    body: {
      original_text: card.original_text,
      original_snippet: card.original_snippet,
      correction: card.correction,
      answer,
    },
  });
  if (error) throw error;
  if (!data) throw new Error('No grade returned');
  return data;
}

// Apply an SM-2 result to a card and persist the new schedule.
export async function applyReviewResult(
  card: ReviewCard,
  rating: ReviewRating,
): Promise<Schedule> {
  const schedule = computeSchedule(card, rating);
  const { error } = await supabase.from('review_cards').update(schedule).eq('id', card.id);
  if (error) throw error;
  return schedule;
}

// --- Feature 2: Production practice ---

export async function fetchScenarios(): Promise<Scenario[]> {
  const { data, error } = await supabase.from('scenarios').select('*');
  if (error) throw error;
  return (data as Scenario[]) ?? [];
}

// Pick a scenario, biased toward the user's weak categories when we know them.
export async function pickScenario(): Promise<Scenario | null> {
  const [scenarios, stats] = await Promise.all([
    fetchScenarios(),
    fetchCategoryStats().catch(() => [] as CategoryStat[]),
  ]);
  if (scenarios.length === 0) return null;

  const weak = new Set(stats.slice(0, 4).map((s) => s.category));
  const targeted = weak.size
    ? scenarios.filter((s) => s.target_categories.some((c) => weak.has(c)))
    : [];
  const pool = targeted.length ? targeted : scenarios;
  return pool[Math.floor(Math.random() * pool.length)];
}

// Grade a cold response to a scenario; feeds mistakes into the review deck.
export async function produceResponse(
  scenarioId: string,
  text: string,
  source: 'text' | 'audio' = 'text',
): Promise<ProduceResponse> {
  const { data, error } = await supabase.functions.invoke<ProduceResponse>('produce', {
    body: { scenario_id: scenarioId, text, source },
  });
  if (error) throw error;
  if (!data) throw new Error('No response from produce');
  return data;
}

// --- Voice: speech to text and text to speech ---

// Send a recorded clip (base64) to Whisper and get the transcription back.
export async function transcribeAudio(audioBase64: string, mime: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke<{ text: string }>('transcribe', {
    body: { audio: audioBase64, mime },
  });
  if (error) throw error;
  if (!data) throw new Error('No transcription returned');
  return data.text ?? '';
}

// Ask the `speak` function to read a sentence aloud; returns base64 mp3.
export async function synthesizeSpeech(
  text: string,
): Promise<{ audio: string; mime: string }> {
  const { data, error } = await supabase.functions.invoke<{ audio: string; mime: string }>(
    'speak',
    { body: { text } },
  );
  if (error) throw error;
  if (!data) throw new Error('No audio returned');
  return data;
}

// --- "How can I say" ---

// Describe what you want to say; get back the best natural sentence plus tone
// variations and tips. The result is saved so it shows up in History.
export async function sayPhrase(intent: string): Promise<Phrase> {
  const { data, error } = await supabase.functions.invoke<SayResponse>('phrase', {
    body: { intent },
  });
  if (error) throw error;
  if (!data) throw new Error('No response from phrase');
  return data.phrase;
}

// Saved phrases, newest first.
export async function fetchPhrases(): Promise<Phrase[]> {
  const { data, error } = await supabase
    .from('phrases')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as Phrase[]) ?? [];
}

// A single saved phrase, for the detail screen.
export async function fetchPhrase(phraseId: string): Promise<Phrase> {
  const { data, error } = await supabase
    .from('phrases')
    .select('*')
    .eq('id', phraseId)
    .single();
  if (error) throw error;
  return data as Phrase;
}

// History list, newest first.
export async function fetchEntries(): Promise<Entry[]> {
  const { data, error } = await supabase
    .from('entries')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

// A single entry plus its mistakes, for the detail screen.
export async function fetchEntryWithMistakes(
  entryId: string,
): Promise<{ entry: Entry; mistakes: Mistake[] }> {
  const [{ data: entry, error: e1 }, { data: mistakes, error: e2 }] = await Promise.all([
    supabase.from('entries').select('*').eq('id', entryId).single(),
    supabase.from('mistakes').select('*').eq('entry_id', entryId),
  ]);
  if (e1) throw e1;
  if (e2) throw e2;
  return { entry: entry as Entry, mistakes: (mistakes as Mistake[]) ?? [] };
}

// Aggregated mistake counts per category, for the Profile screen.
export async function fetchCategoryStats(): Promise<CategoryStat[]> {
  const { data, error } = await supabase
    .from('category_stats')
    .select('*')
    .order('total', { ascending: false });
  if (error) throw error;
  return (data as CategoryStat[]) ?? [];
}

// --- Learning area ---

// Ask the `practice` function to generate a fresh set from the user's mistakes.
export async function generatePractice(count = 8): Promise<PracticeItem[]> {
  const { data, error } = await supabase.functions.invoke<{ items: PracticeItem[] }>(
    'practice',
    { body: { count } },
  );
  if (error) throw error;
  if (!data) throw new Error('No practice returned');
  return data.items;
}

export async function fetchPracticeItems(): Promise<PracticeItem[]> {
  const { data, error } = await supabase
    .from('practice_items')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as PracticeItem[]) ?? [];
}

// Record the result of practicing one item and advance its status.
export async function recordPracticeResult(
  item: PracticeItem,
  correct: boolean,
): Promise<void> {
  const times_seen = item.times_seen + 1;
  const times_correct = item.times_correct + (correct ? 1 : 0);
  // Mastered after two correct answers; otherwise it stays in "learning".
  const status = correct && times_correct >= 2 ? 'mastered' : 'learning';
  const { error } = await supabase
    .from('practice_items')
    .update({ times_seen, times_correct, status })
    .eq('id', item.id);
  if (error) throw error;
}
