// Edge Function: practice
// Looks at the caller's weak categories and recent mistakes, asks Claude to
// generate a personalized set of flashcards + multiple-choice exercises, saves
// them, and returns them.

import Anthropic from "npm:@anthropic-ai/sdk@0.68.0";
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  PRACTICE_SCHEMA,
  PRACTICE_SYSTEM_PROMPT,
  type PracticeItemGen,
} from "../_shared/practice_prompt.ts";

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
    const count = Math.max(6, Math.min(15, Number(body.count) || 12));

    // Pull the learner's weak categories and a few recent example mistakes.
    const [{ data: stats }, { data: mistakes }] = await Promise.all([
      supabase
        .from("category_stats")
        .select("label,total,major,moderate,minor")
        .order("total", { ascending: false })
        .limit(5),
      supabase
        .from("mistakes")
        .select("category,original_snippet,correction")
        .order("created_at", { ascending: false })
        .limit(12),
    ]);

    const weakList =
      stats && stats.length
        ? stats.map((s) => `${s.label} (${s.total} times)`).join(", ")
        : "no history yet";
    const exampleList =
      mistakes && mistakes.length
        ? mistakes
            .map((m) => `- [${m.category}] "${m.original_snippet}" should be "${m.correction}"`)
            .join("\n")
        : "none";

    const userPrompt = `The learner's weakest categories, most frequent first: ${weakList}.

Recent real mistakes they made:
${exampleList}

Generate about ${count} practice items. Group them into clusters of about 3 that each drill one of these weak patterns: one item close to their real mistake, then more of the same rule in different everyday contexts. Mix flashcards and multiple_choice.`;

    const anthropic = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY")! });
    const message = await anthropic.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 5000,
      system: PRACTICE_SYSTEM_PROMPT,
      output_config: { format: { type: "json_schema", schema: PRACTICE_SCHEMA } },
      messages: [{ role: "user", content: userPrompt }],
    });

    const textBlock = message.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return json({ error: "No practice returned" }, 502);
    }
    const generated = JSON.parse(textBlock.text) as { items: PracticeItemGen[] };

    const rows = generated.items.map((it) => ({
      user_id: userId,
      category: it.category,
      kind: it.kind,
      context: it.context ?? null,
      based_on: it.based_on ? stripDashPunctuation(it.based_on) : null,
      front: stripDashPunctuation(it.front),
      back: stripDashPunctuation(it.back),
      options: (it.options ?? []).map(stripDashPunctuation),
      explanation: stripDashPunctuation(it.explanation),
    }));

    const { data: inserted, error: insErr } = await supabase
      .from("practice_items")
      .insert(rows)
      .select();
    if (insErr) return json({ error: insErr.message }, 500);

    return json({ items: inserted });
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
