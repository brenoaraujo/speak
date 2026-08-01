// Shared helper: turn the mistakes just saved for an entry into spaced-repetition
// review cards. Used by both the `analyze` (correction) and `produce`
// (production practice) functions so every mistake feeds the review deck.

type InsertedMistake = {
  id: string;
  category: string;
  original_snippet: string;
  correction: string;
  explanation: string;
};

export function buildReviewRows(params: {
  userId: string;
  entryOriginalText: string;
  mistakes: InsertedMistake[];
  source: "correction" | "production_practice";
}) {
  // First review is scheduled for tomorrow.
  const nextReview = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  return params.mistakes.map((m) => ({
    user_id: params.userId,
    mistake_id: m.id,
    category: m.category,
    source: params.source,
    original_text: params.entryOriginalText,
    original_snippet: m.original_snippet,
    correction: m.correction,
    explanation: m.explanation,
    next_review_at: nextReview,
    interval: 1,
    ease_factor: 2.5,
    review_count: 0,
  }));
}
