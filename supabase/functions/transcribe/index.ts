// Edge Function: transcribe
// Speech to text. Receives a short audio clip (base64) and returns the
// transcription from OpenAI Whisper. Auth is required so the OpenAI key is
// never exposed and only signed-in users can spend it.
//
// Secrets (set with `supabase secrets set`):
//   OPENAI_API_KEY   your OpenAI API key

import OpenAI, { toFile } from "npm:openai@4";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// Whisper wants a filename with a real extension to sniff the container.
function extForMime(mime: string): string {
  if (mime.includes("webm")) return "webm";
  if (mime.includes("mp4") || mime.includes("m4a")) return "m4a";
  if (mime.includes("ogg")) return "ogg";
  if (mime.includes("wav")) return "wav";
  if (mime.includes("mpeg") || mime.includes("mp3")) return "mp3";
  return "webm";
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
    const audioB64: string = body.audio ?? "";
    const mime: string = body.mime ?? "audio/webm";
    if (!audioB64) return json({ error: "No audio provided" }, 400);

    const bytes = base64ToBytes(audioB64);
    const openai = new OpenAI({ apiKey: Deno.env.get("OPENAI_API_KEY")! });
    const file = await toFile(bytes, `speech.${extForMime(mime)}`, { type: mime });

    const result = await openai.audio.transcriptions.create({
      file,
      model: "whisper-1",
    });

    return json({ text: result.text ?? "" });
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
