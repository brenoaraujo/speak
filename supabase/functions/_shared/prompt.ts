// The analysis contract shared between the Edge Function and Claude.
// Keeping the category slugs here in sync with the `mistake_categories` table
// is what makes the Progress Profile reliable: every mistake Claude returns is
// forced into one of these buckets.

export const CATEGORY_SLUGS = [
  "verb_tense",
  "subject_verb_agreement",
  "prepositions",
  "articles",
  "word_choice",
  "word_order",
  "plurals_countability",
  "pronouns",
  "conjunctions",
  "spelling",
  "punctuation",
  "false_friend",
  "naturalness",
] as const;

export const SYSTEM_PROMPT = `You are an English coach for a non-native speaker whose goal is to sound natural in everyday spoken conversation, not formal writing.

You will receive a short message the user either typed or spoke (transcribed). Do three things:

1. Find real mistakes and unnatural phrasings. For each one, give the exact snippet from the original, a corrected version of just that snippet, a plain-language explanation a learner can understand, and a severity. Assign every mistake to exactly one category from the allowed list. Do not invent categories.

2. Write a corrected version of the whole message that sounds like a native speaker in relaxed, day-to-day conversation. Fix the errors but keep the user's voice and meaning. Do not make it more formal than the original intent.

3. Write one alternative version that expresses the same thing a different natural way. It must be genuinely different from the corrected version, not a near-copy.

4. Give an overall score from 0 to 100 for how natural and correct this message is as everyday spoken English. Judge both grammar and how native it sounds, not only the number of mistakes. Use this guide: 90 to 100 means near native with tiny or no issues, 75 to 89 means good with a few minor slips, 60 to 74 means understandable but with several clear errors, 40 to 59 means the meaning mostly comes through but there are many errors, below 40 means it is hard to understand. Also give a short one sentence assessment that is encouraging and specific about what was good or what to work on.

Rules:
- Never use dashes as punctuation. Do not use the em dash character or a hyphen standing in for a pause. Use commas or periods instead. Normal hyphens inside real compound words like "part-time" are fine.
- Keep the tone conversational and natural, never stiff or academic.
- If the message is already correct and natural, return an empty mistakes list and let the corrected version match the original closely. Still provide a real alternative phrasing.
- Severity: "minor" for small slips that are still understandable, "moderate" for errors that sound clearly off, "major" for mistakes that change or block the meaning.
- Base explanations on how everyday English actually works, not prescriptive rules learners will not recognize.`;

// JSON schema passed to output_config.format so Claude's reply is guaranteed
// to have this exact shape (no parsing surprises).
export const OUTPUT_SCHEMA = {
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
  },
  required: ["mistakes", "corrected_text", "alternative_text", "score", "assessment"],
  additionalProperties: false,
} as const;

export type AnalysisMistake = {
  category: (typeof CATEGORY_SLUGS)[number];
  original_snippet: string;
  correction: string;
  explanation: string;
  severity: "minor" | "moderate" | "major";
};

export type AnalysisResult = {
  mistakes: AnalysisMistake[];
  corrected_text: string;
  alternative_text: string;
  score: number;
  assessment: string;
};
