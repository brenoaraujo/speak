// Edge Function: grade-review
// During a spaced-repetition review, the learner tries to reproduce the fix for
// one of their past mistakes. Because more than one correction can be valid, we
// ask Claude to judge whether their answer fixes the mistake, rather than doing
// a string match. Returns correctness plus short feedback. The learner then
// self-rates confidence (Hard/Easy) on the client; a wrong answer is a Fail.

import Anthropic from "npm:@anthropic-ai/sdk@0.68.0";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const GRADE_SYSTEM_PROMPT = `You are grading one spaced-repetition review by a non-native English learner.

You will be given: the original sentence that contained a mistake, the exact wrong snippet, a reference correction, and the learner's attempted answer. The learner was asked to fix the mistake.

Decide whether the learner's answer correctly fixes the specific mistake, so that the result is natural, correct everyday English. There can be more than one valid fix, so do not require an exact match to the reference. Judge meaning and correctness, not punctuation or capitalization. If they fixed the target error in any natural way, they are correct, even if they phrased the rest a little differently. If they left the mistake unfixed, introduced a new error, or changed the meaning, they are not correct.

Also write one short, encouraging sentence of feedback in plain language. Never use dashes as punctuation; use commas or periods.`;

const GRADE_SCHEMA = {
  type: "object",
  properties: {
    correct: { type: "boolean" },
    feedback: { type: "string" },
  },
  required: ["correct", "feedback"],
  additionalProperties: false,
} as const;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing Authorization header" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData.user) return json({ error: "Invalid or expired session" }, 401);

    const body = await req.json().catch(() => ({}));
    const original: string = (body.original_text ?? "").trim();
    const snippet: string = (body.original_snippet ?? "").trim();
    const reference: string = (body.correction ?? "").trim();
    const answer: string = (body.answer ?? "").trim();
    if (!answer) return json({ error: "No answer provided" }, 400);

    const userPrompt = `Original sentence: "${original}"
The wrong part: "${snippet}"
A reference correction of that part: "${reference}"
The learner's answer: "${answer}"

Did the learner correctly fix the mistake?`;

    const anthropic = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY")! });
    const message = await anthropic.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 512,
      system: GRADE_SYSTEM_PROMPT,
      output_config: { format: { type: "json_schema", schema: GRADE_SCHEMA } },
      messages: [{ role: "user", content: userPrompt }],
    });

    const textBlock = message.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return json({ error: "No grade returned" }, 502);
    }
    const result = JSON.parse(textBlock.text) as { correct: boolean; feedback: string };
    return json({
      correct: !!result.correct,
      feedback: (result.feedback ?? "").replace(/\s*—\s*/g, ", ").replace(/\s+-\s+/g, ", "),
    });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
