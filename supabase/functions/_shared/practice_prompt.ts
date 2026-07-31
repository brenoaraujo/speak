// Prompt + schema for generating a personalized practice set from the user's
// real mistakes. Reuses the same category taxonomy as the analyzer.
import { CATEGORY_SLUGS } from "./prompt.ts";

export const PRACTICE_SYSTEM_PROMPT = `You are an English coach creating a short, personalized practice set for a learner, based on the mistakes they actually make. You will be told which grammar categories they struggle with most and shown examples of their real mistakes. Create practice items that target those weaknesses.

Create a mix of two kinds:
- "flashcard": a quick prompt on the front (a question, or a short sentence to fix) and the answer on the back. Set "options" to an empty array.
- "multiple_choice": a question with 3 or 4 answer options where exactly one is correct. Put all the options in "options", and put the exact text of the correct option in "back".

For every item, set "category" to the category it practices (from the allowed list) and write a short "explanation" of why the answer is right.

Rules:
- Focus on the learner's weak categories and the kinds of mistakes they make. If no history is provided, cover common everyday-English trouble spots.
- Keep everything everyday and conversational, not academic.
- Never use dashes as punctuation. Use commas or periods instead.
- Make each item clear and self-contained. For multiple_choice, make the wrong options plausible but clearly wrong to a careful reader.
- Vary the items. Do not reuse the same sentence twice.`;

export const PRACTICE_SCHEMA = {
  type: "object",
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          kind: { type: "string", enum: ["flashcard", "multiple_choice"] },
          category: { type: "string", enum: [...CATEGORY_SLUGS] },
          front: { type: "string" },
          back: { type: "string" },
          options: { type: "array", items: { type: "string" } },
          explanation: { type: "string" },
        },
        required: ["kind", "category", "front", "back", "options", "explanation"],
        additionalProperties: false,
      },
    },
  },
  required: ["items"],
  additionalProperties: false,
} as const;

export type PracticeItemGen = {
  kind: "flashcard" | "multiple_choice";
  category: (typeof CATEGORY_SLUGS)[number];
  front: string;
  back: string;
  options: string[];
  explanation: string;
};
