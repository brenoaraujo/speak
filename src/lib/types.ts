// Shared data shapes. These mirror the Postgres tables and the Edge Function
// response so the UI stays type-safe end to end.

export type Severity = 'minor' | 'moderate' | 'major';

export type CategorySlug =
  | 'verb_tense'
  | 'subject_verb_agreement'
  | 'prepositions'
  | 'articles'
  | 'word_choice'
  | 'word_order'
  | 'plurals_countability'
  | 'pronouns'
  | 'conjunctions'
  | 'spelling'
  | 'punctuation'
  | 'false_friend'
  | 'naturalness';

// Human-readable labels for each category, used across History and Profile.
export const CATEGORY_LABELS: Record<CategorySlug, string> = {
  verb_tense: 'Verb tense',
  subject_verb_agreement: 'Subject-verb agreement',
  prepositions: 'Prepositions',
  articles: 'Articles',
  word_choice: 'Word choice',
  word_order: 'Word order',
  plurals_countability: 'Plurals and countability',
  pronouns: 'Pronouns',
  conjunctions: 'Linking words',
  spelling: 'Spelling',
  punctuation: 'Punctuation',
  false_friend: 'Direct translation',
  naturalness: 'Naturalness',
};

export type Entry = {
  id: string;
  user_id: string;
  source: 'text' | 'audio';
  original_text: string;
  corrected_text: string | null;
  alternative_text: string | null;
  audio_path: string | null;
  score: number | null;
  assessment: string | null;
  created_at: string;
};

export type Mistake = {
  id?: string;
  entry_id?: string;
  category: CategorySlug;
  original_snippet: string;
  correction: string;
  explanation: string;
  severity: Severity;
  created_at?: string;
};

// What the `analyze` Edge Function returns.
export type AnalyzeResponse = {
  entry: Entry;
  mistakes: Mistake[];
};

// --- "How can I say" feature ---

// One tone variation of a suggested phrase, e.g. { tone: 'More polite', text: '...' }.
export type PhraseAlternative = {
  text: string;
  tone: string;
};

export type Phrase = {
  id: string;
  user_id: string;
  intent: string; // what the user wanted to say
  best: string; // the recommended sentence
  alternatives: PhraseAlternative[];
  tips: string[];
  note: string | null;
  created_at: string;
};

// What the `phrase` Edge Function returns.
export type SayResponse = {
  phrase: Phrase;
};

export type PracticeKind = 'flashcard' | 'multiple_choice';
export type PracticeStatus = 'new' | 'learning' | 'mastered';

export type PracticeItem = {
  id: string;
  user_id: string;
  category: CategorySlug;
  kind: PracticeKind;
  context: string | null; // everyday situation the item is set in
  based_on: string | null; // the mistake/rule this item reinforces
  front: string;
  back: string;
  options: string[];
  explanation: string;
  status: PracticeStatus;
  times_seen: number;
  times_correct: number;
  created_at: string;
};

// One row of the `category_stats` view.
export type CategoryStat = {
  user_id: string;
  category: CategorySlug;
  label: string;
  total: number;
  major: number;
  moderate: number;
  minor: number;
  last_seen: string;
};
