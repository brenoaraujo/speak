// Edge Function: phrase
// The "How can I say" feature. Takes a description of what the user wants to
// say, asks Claude for the best natural sentence plus tone variations and tips,
// saves it (as the calling user, so RLS applies), and returns the result.
//
// Secrets (set with `supabase secrets set`):
//   ANTHROPIC_API_KEY   your Claude API key
// Supabase injects SUPABASE_URL and SUPABASE_ANON_KEY automatically.

import Anthropic from "npm:@anthropic-ai/sdk@0.68.0";
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  PHRASE_SCHEMA,
  PHRASE_SYSTEM_PROMPT,
  type PhraseResult,
} from "../_shared/phrase_prompt.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Belt-and-suspenders: strip dashes-as-punctuation in case any slip through.
function stripDashPunctuation(text: string): string {
  return text.replace(/\s*—\s*/g, ", ").replace(/\s+-\s+/g, ", ");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing Authorization header" }, 401);

    // A Supabase client bound to the caller's JWT, so the insert runs as that
    // user and Row Level Security is enforced.
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData.user) return json({ error: "Invalid or expired session" }, 401);
    const userId = userData.user.id;

    const body = await req.json().catch(() => ({}));
    const intent: string = (body.intent ?? "").trim();
    if (!intent) return json({ error: "No intent provided" }, 400);

    // --- Ask Claude, with a schema-constrained response ---
    const anthropic = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY")! });
    const message = await anthropic.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 2048,
      system: PHRASE_SYSTEM_PROMPT,
      output_config: { format: { type: "json_schema", schema: PHRASE_SCHEMA } },
      messages: [{ role: "user", content: intent }],
    });

    const textBlock = message.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return json({ error: "No suggestion returned" }, 502);
    }
    const result = JSON.parse(textBlock.text) as PhraseResult;

    const best = stripDashPunctuation(result.best);
    const alternatives = (result.alternatives ?? []).map((a) => ({
      text: stripDashPunctuation(a.text),
      tone: a.tone,
    }));
    const tips = (result.tips ?? []).map(stripDashPunctuation);
    const note = stripDashPunctuation(result.note ?? "");

    // --- Persist so the user can revisit it from History ---
    const { data: phrase, error: insErr } = await supabase
      .from("phrases")
      .insert({ user_id: userId, intent, best, alternatives, tips, note: note || null })
      .select()
      .single();
    if (insErr) return json({ error: insErr.message }, 500);

    return json({ phrase });
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
