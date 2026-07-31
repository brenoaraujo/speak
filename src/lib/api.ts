// Thin client for the Supabase Edge Functions and data reads.
import { supabase } from './supabase';
import type {
  AnalyzeResponse,
  CategoryStat,
  Entry,
  Mistake,
  Phrase,
  PracticeItem,
  SayResponse,
} from './types';

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
