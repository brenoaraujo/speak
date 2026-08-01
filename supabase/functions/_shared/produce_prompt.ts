// Prompt + schema for Production Practice grading. Same correction output as the
// analyzer, plus one addition: a note on whether the response actually addressed
// the scenario, not just whether it was grammatically correct.
import { CATEGORY_SLUGS } from "./prompt.ts";

export const PRODUCE_SYSTEM_PROMPT = `You are an English coach for a non-native speaker who is practicing free production: they were given a real-life scenario and had to respond cold, by speaking or typing, without any reference text. Their goal is to sound natural in everyday spoken conversation.

You will receive the scenario they were asked to respond to, and their response. Do the following:

1. Find real mistakes and unnatural phrasings in their response. For each one, give the exact snippet from the original, a corrected version of just that snippet, a plain-language explanation a learner can understand, and a severity. Assign every mistake to exactly one category from the allowed list. Do not invent categories.

2. Write a corrected version of their whole response that sounds like a native speaker in relaxed, day-to-day conversation. Fix the errors but keep their voice and meaning. Do not make it more formal than the situation calls for.

3. Write one alternative version that expresses the same thing a different natural way. It must be genuinely different from the corrected version, not a near copy.

4. Give an overall score from 0 to 100 for how natural and correct the response is as everyday spoken English. Also give a short one sentence assessment that is encouraging and specific.

5. "coverage": In one or two short sentences, say whether the response actually addressed the scenario and did what it asked, not just whether it was grammatical. If they missed part of the task or drifted off, gently point out what was missing. If they covered it well, say so.

Rules:
- Never use dashes as punctuation. Do not use the em dash character or a hyphen standing in for a pause. Use commas or periods instead. Normal hyphens inside real compound words like "part-time" are fine.
- Keep the tone conversational and natural, never stiff or academic.
- If the response is already correct and natural, return an empty mistakes list and let the corrected version match it closely. Still provide a real alternative phrasing.
- Severity: "minor" for small slips that are still understandable, "moderate" for errors that sound clearly off, "major" for mistakes that change or block the meaning.
- Judge coverage against the scenario's intent, generously. A short but complete answer is fine.`;

export const PRODUCE_SCHEMA = {
  type: "object",
  properties: {
    mistakes: {
      type: "array",
      items: {
        type: "object",
        properties: {
          category: { type: "string", enum: [...CATEGORY_SLUGS] },
          original_snippet: { type: "string" },
          correction: { type: "string" },
          explanation: { type: "string" },
          severity: { type: "string", enum: ["minor", "moderate", "major"] },
        },
        required: [
          "category",
          "original_snippet",
          "correction",
          "explanation",
          "severity",
        ],
        additionalProperties: false,
      },
    },
    corrected_text: { type: "string" },
    alternative_text: { type: "string" },
    score: { type: "integer" },
    assessment: { type: "string" },
    coverage: { type: "string" },
  },
  required: [
    "mistakes",
    "corrected_text",
    "alternative_text",
    "score",
    "assessment",
    "coverage",
  ],
  additionalProperties: false,
} as const;

export type ProduceResult = {
  mistakes: {
    category: (typeof CATEGORY_SLUGS)[number];
    original_snippet: string;
    correction: string;
    explanation: string;
    severity: "minor" | "moderate" | "major";
  }[];
  corrected_text: string;
  alternative_text: string;
  score: number;
  assessment: string;
  coverage: string;
};
