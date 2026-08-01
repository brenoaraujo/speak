// Simplified SM-2 spaced-repetition scheduling.
//
// Given a card's current state and how the review went, compute the next
// schedule. Kept as a pure function so the logic is obvious and easy to change.
import type { ReviewCard, ReviewRating } from './types';

const DAY_MS = 24 * 60 * 60 * 1000;
const MIN_EASE = 1.3;

export type Schedule = {
  interval: number;
  ease_factor: number;
  review_count: number;
  last_reviewed_at: string;
  next_review_at: string;
};

// The subset of a card the scheduler reads.
type CardState = Pick<ReviewCard, 'interval' | 'ease_factor' | 'review_count'>;

export function computeSchedule(card: CardState, rating: ReviewRating, now = new Date()): Schedule {
  let ease = card.ease_factor || 2.5;
  let interval: number;

  if (rating === 'failed') {
    // Reset: see it again tomorrow, and make the card a little harder to "ease".
    ease = Math.max(MIN_EASE, ease - 0.2);
    interval = 1;
  } else if (rating === 'hard') {
    // Correct but shaky: grow modestly, nudge ease down slightly.
    ease = Math.max(MIN_EASE, ease - 0.15);
    interval = card.review_count === 0 ? 1 : Math.max(1, Math.round(card.interval * 1.2));
  } else {
    // Easy: grow by the ease factor and reward with a higher ease.
    ease = ease + 0.15;
    interval = card.review_count === 0 ? 3 : Math.max(1, Math.round(card.interval * ease));
  }

  const last = now;
  const next = new Date(now.getTime() + interval * DAY_MS);
  return {
    interval,
    ease_factor: Math.round(ease * 100) / 100,
    review_count: card.review_count + 1,
    last_reviewed_at: last.toISOString(),
    next_review_at: next.toISOString(),
  };
}
