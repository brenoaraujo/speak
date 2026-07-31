// Edge Function: speak
// Text to speech. Receives a sentence and returns natural-sounding audio
// (base64 mp3) from OpenAI's audio/speech API, so a learner can hear how the
// corrected or suggested phrase should sound. Auth required.
//
// Secrets (set with `supabase secrets set`):
//   OPENAI_API_KEY   your OpenAI API key

import OpenAI from "npm:openai@4";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ALLOWED_VOICES = ["alloy", "echo", "fable", "onyx", "nova", "shimmer"];

// Chunked base64 encode so large audio buffers don't blow the call stack.
function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
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

    const body = await req.json().catch(() => ({}));
    const text: string = (body.text ?? "").trim();
    const voice: string = ALLOWED_VOICES.includes(body.voice) ? body.voice : "alloy";
    if (!text) return json({ error: "No text provided" }, 400);
    // Guard against runaway costs from an accidental huge payload.
    const input = text.slice(0, 800);

    const openai = new OpenAI({ apiKey: Deno.env.get("OPENAI_API_KEY")! });
    const speech = await openai.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice,
      input,
    });

    const bytes = new Uint8Array(await speech.arrayBuffer());
    return json({ audio: bytesToBase64(bytes), mime: "audio/mpeg" });
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
