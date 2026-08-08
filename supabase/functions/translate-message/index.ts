import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const jsonHeaders = {
  ...corsHeaders,
  "Content-Type": "application/json",
};

const targetMap: Record<string, string> = {
  pt: "PT-BR",
  "pt-br": "PT-BR",
  "pt-pt": "PT-PT",
  pl: "PL",
  es: "ES",
  fr: "FR",
  en: "EN-US",
  "en-us": "EN-US",
  "en-gb": "EN-GB",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "TL-TR-003", detail: "Method not allowed" }), {
      status: 405,
      headers: jsonHeaders,
    });
  }

  try {
    const { text, target } = await req.json();
    const cleanText = String(text ?? "").trim();
    if (!cleanText) {
      return new Response(JSON.stringify({ error: "TL-TR-004", detail: "Empty text" }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    const key = Deno.env.get("DEEPL_API_KEY");
    if (!key) {
      return new Response(JSON.stringify({ error: "TL-TR-001" }), {
        status: 503,
        headers: jsonHeaders,
      });
    }

    const requestedTarget = String(target || "pt").toLowerCase();
    const targetLang = targetMap[requestedTarget] || requestedTarget.toUpperCase();
    const params = new URLSearchParams({ text: cleanText, target_lang: targetLang });

    const response = await fetch("https://api-free.deepl.com/v2/translate", {
      method: "POST",
      headers: {
        Authorization: `DeepL-Auth-Key ${key}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    });

    const payload = await response.json();
    if (!response.ok) {
      throw new Error(JSON.stringify(payload));
    }

    const translation = payload.translations?.[0];
    return new Response(JSON.stringify({
      translatedText: translation?.text || cleanText,
      detectedSourceLanguage: translation?.detected_source_language || null,
      targetLanguage: targetLang,
    }), { status: 200, headers: jsonHeaders });
  } catch (error) {
    return new Response(JSON.stringify({
      error: "TL-TR-002",
      detail: error instanceof Error ? error.message : String(error),
    }), { status: 500, headers: jsonHeaders });
  }
});
