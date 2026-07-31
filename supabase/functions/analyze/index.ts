// Edge Function: analyze
// Takes a piece of text, asks Claude to coach it, saves the entry + mistakes to
// Postgres (as the calling user, so RLS applies), and returns the result.
//
// Secrets (set with `supabase secrets set`):
//   ANTHROPIC_API_KEY   your Claude API key
// Supabase injects SUPABASE_URL and SUPABASE_ANON_KEY automatically.

import Anthropic from "npm:@anthropic-ai/sdk@0.68.0";
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  type AnalysisResult,
  OUTPUT_SCHEMA,
  SYSTEM_PROMPT,
} from "../_shared/prompt.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Belt-and-suspenders: strip dashes-as-punctuation in case any slip through.
// Leaves hyphens inside real compound words (letter-hyphen-letter) alone.
function stripDashPunctuation(text: string): string {
  return text
    .replace(/\s*—\s*/g, ", ") // em dash
    .replace(/\s+-\s+/g, ", ");      // " - " used as a pause
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Missing Authorization header" }, 401);
    }

    // A Supabase client bound to the caller's JWT, so inserts run as that user
    // and Row Level Security is enforced.
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData.user) {
      return json({ error: "Invalid or expired session" }, 401);
    }
    const userId = userData.user.id;

    const body = await req.json();
    const text: string = (body.text ?? "").trim();
    const source: "text" | "audio" = body.source === "audio" ? "audio" : "text";
    const audioPath: string | null = body.audio_path ?? null;

    if (!text) {
      return json({ error: "No text provided" }, 400);
    }

    // --- Ask Claude, with a schema-constrained response ---
    const anthropic = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY")! });
    const message = await anthropic.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      output_config: { format: { type: "json_schema", schema: OUTPUT_SCHEMA } },
      messages: [{ role: "user", content: text }],
    });

    const textBlock = message.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return json({ error: "No analysis returned" }, 502);
    }
    const analysis = JSON.parse(textBlock.text) as AnalysisResult;

    const correctedText = stripDashPunctuation(analysis.corrected_text);
    const alternativeText = stripDashPunctuation(analysis.alternative_text);
    const assessment = stripDashPunctuation(analysis.assessment ?? "");
    // Clamp the score into 0..100 in case the model returns something odd.
    const score = Math.max(0, Math.min(100, Math.round(analysis.score ?? 0)));

    // --- Persist: entry first, then its mistakes ---
    const { data: entry, error: entryErr } = await supabase
      .from("entries")
      .insert({
        user_id: userId,
        source,
        original_text: text,
        corrected_text: correctedText,
        alternative_text: alternativeText,
        audio_path: audioPath,
        score,
        assessment,
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
      const { error: mErr } = await supabase.from("mistakes").insert(rows);
      if (mErr) return json({ error: mErr.message }, 500);
    }

    return json({
      entry: {
        ...entry,
        corrected_text: correctedText,
        alternative_text: alternativeText,
      },
      mistakes: analysis.mistakes,
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
