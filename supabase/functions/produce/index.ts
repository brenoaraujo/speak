// Edge Function: produce
// Production practice. The user answered a scenario cold (spoken or typed). We
// run their response through the same correction pipeline as `analyze`, plus a
// note on whether they addressed the scenario, save the entry + mistakes, and
// feed every mistake into the spaced-repetition deck tagged production_practice.

import Anthropic from "npm:@anthropic-ai/sdk@0.68.0";
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  PRODUCE_SCHEMA,
  PRODUCE_SYSTEM_PROMPT,
  type ProduceResult,
} from "../_shared/produce_prompt.ts";
import { buildReviewRows } from "../_shared/review.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function stripDashPunctuation(text: string): string {
  return text.replace(/\s*—\s*/g, ", ").replace(/\s+-\s+/g, ", ");
}

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
    const userId = userData.user.id;

    const body = await req.json().catch(() => ({}));
    const text: string = (body.text ?? "").trim();
    const scenarioId: string | null = body.scenario_id ?? null;
    const source: "text" | "audio" = body.source === "audio" ? "audio" : "text";
    if (!text) return json({ error: "No response provided" }, 400);

    // Look up the scenario so grading can judge whether it was addressed.
    let scenarioPrompt = "";
    if (scenarioId) {
      const { data: scenario } = await supabase
        .from("scenarios")
        .select("prompt_text")
        .eq("id", scenarioId)
        .single();
      scenarioPrompt = scenario?.prompt_text ?? "";
    }

    const userPrompt = `Scenario the learner was asked to respond to:
"${scenarioPrompt || "(none provided)"}"

Their response:
"${text}"`;

    const anthropic = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY")! });
    const message = await anthropic.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 2048,
      system: PRODUCE_SYSTEM_PROMPT,
      output_config: { format: { type: "json_schema", schema: PRODUCE_SCHEMA } },
      messages: [{ role: "user", content: userPrompt }],
    });

    const textBlock = message.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return json({ error: "No analysis returned" }, 502);
    }
    const analysis = JSON.parse(textBlock.text) as ProduceResult;

    const correctedText = stripDashPunctuation(analysis.corrected_text);
    const alternativeText = stripDashPunctuation(analysis.alternative_text);
    const assessment = stripDashPunctuation(analysis.assessment ?? "");
    const coverage = stripDashPunctuation(analysis.coverage ?? "");
    const score = Math.max(0, Math.min(100, Math.round(analysis.score ?? 0)));

    const { data: entry, error: entryErr } = await supabase
      .from("entries")
      .insert({
        user_id: userId,
        source,
        original_text: text,
        corrected_text: correctedText,
        alternative_text: alternativeText,
        score,
        assessment,
        scenario_id: scenarioId,
        coverage,
      })
      .select()
      .single();
    if (entryErr) return json({ error: entryErr.message }, 500);

    if (analysis.mistakes.length > 0) {
      const rows = analysis.mistakes.map((m) => ({
        entry_id: entry.id,
        user_id: userId,
        category: m.category,
        original_snippet: m.original_snippet,
        correction: m.correction,
        explanation: stripDashPunctuation(m.explanation),
        severity: m.severity,
      }));
      const { data: insertedMistakes, error: mErr } = await supabase
        .from("mistakes")
        .insert(rows)
        .select("id,category,original_snippet,correction,explanation");
      if (mErr) return json({ error: mErr.message }, 500);

      const reviewRows = buildReviewRows({
        userId,
        entryOriginalText: text,
        mistakes: insertedMistakes ?? [],
        source: "production_practice",
      });
      if (reviewRows.length > 0) {
        const { error: rErr } = await supabase.from("review_cards").insert(reviewRows);
        if (rErr) return json({ error: rErr.message }, 500);
      }
    }

    return json({
      entry: { ...entry, corrected_text: correctedText, alternative_text: alternativeText },
      mistakes: analysis.mistakes,
      coverage,
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
