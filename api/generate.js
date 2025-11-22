// /api/generate.js
// Voice-first, adaptive-mode Gemini proxy (Option C: default warm; auto-switching modes)
// - Auto-detects voice mode from user input and question complexity
// - Enforces voice-first style, short conversational sentences, gentle pauses
// - Adds filler-phrases where appropriate for realism
// - Auto-summary behavior requested in-prompt (if answer is long, produce short spoken summary + offer to expand)
// - Uses the reference profile and includes a resume URL (local path provided in project)
// - Requires environment variable: GOOGLE_API_KEY
//
// Paste this file to /api/generate.js in your project root (Vercel serverless).
// Do NOT include your API key here; set GOOGLE_API_KEY in Vercel project settings.

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  const bodyReq = req.body || {};
  const userText = (bodyReq.text || "").toString().trim();

  if (!userText) {
    return res.status(400).json({ error: "Missing text" });
  }

  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "API key missing in environment (GOOGLE_API_KEY)" });
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${encodeURIComponent(apiKey)}`;

  // Local resume file path (project asset). Per project instructions this will be transformed to a URL.
  // Keep as-is here so frontend or reviewer can map it to an asset URL if needed.
  const resumePath = "/mnt/data/Sanjai Kanna B C.pdf";

  // -------------------------
  // Helper: detect voice mode
  // Option C: default "warm", but auto-switch by heuristics
  // -------------------------
  function detectMode(text) {
    const lower = text.toLowerCase();
    // explicit mode keywords
    if (/\bslow\b/.test(lower) || /\bcalm\b/.test(lower) || /\bspeak slowly\b/.test(lower)) return "slow";
    if (/\bwarm\b/.test(lower) || /\bfriendly\b/.test(lower)) return "warm";
    if (/\benergi|\benergize|\bexcite|\bmotivat/.test(lower)) return "energetic";
    if (/\brelax|\brelaxed|\bsoft\b/.test(lower)) return "relaxed";

    // complexity-based heuristics
    const tokenGuess = text.split(/\s+/).length;
    if (tokenGuess > 25) {
      // long question, use slow to ensure clarity
      return "slow";
    }

    // personal / soft queries -> relaxed
    if (/\bhow are you\b|\bpersonal\b|\bbackground\b|\blife story\b|\bfamily\b/.test(lower)) return "relaxed";

    // default
    return "warm";
  }

  const mode = detectMode(userText);

  // -------------------------
  // Voice-first system prompt + mode-specific adjustments
  // -------------------------
  // The prompts are intentionally conservative: they instruct the model to speak
  // in short sentences, to include natural filler and small pauses, and to produce
  // a short spoken summary if the full answer would be long.
  //
  // The frontend TTS can still control rate/pitch, but the model will include
  // ellipses/newlines and natural small fillers to create natural pauses.

  const referenceProfile = `
You are Sanjai Kanna B C. Use ONLY the facts below. NEVER invent or hallucinate details.
If you must say you don't know, say: "I don't have that information from my profile."
Resume (local asset): ${resumePath}

=== SANJAI REFERENCE PROFILE ===
Name: Sanjai Kanna B C
Location: Chennai, India (open to relocation / remote)

Profile Summary:
Result-driven Data Analyst & Python Developer skilled in Power BI, SQL, Python, and Excel.
Experienced in financial analytics, data cleaning, business reporting, automation, and dashboard creation.

Internships:
- Absolute Broking (Equity Research & Operations) — financial analysis, KYC/onboarding, dashboards.
- Antontech (Data Operations & Analysis) — invoice processing in Tally, Power BI dashboards, automation.

Projects:
- Impact of Mobile Usage on Sleep Patterns — Data collection, Linear Regression & SVM, Power BI dashboard.
- Task Manager API (FastAPI) — CRUD endpoints, validation, Postman-tested.

Skills:
Python (Pandas, NumPy), SQL, Power BI, Excel, Tableau, basic web (HTML/CSS/JS), GitHub, Tally ERP.

Education:
B.S. in Data Science & Applications — IIT Madras (ongoing)
B.Com (Computer Applications) — Loyola College, CGPA 9.0

Soft skills & focus:
Communication, discipline, problem solving, analytical thinking.
Career: Data analytics, Python development, BI/automation.

=== END PROFILE ===
`.trim();

  // Mode guidance adjustments for the model
  const modeGuidanceMap = {
    warm: `
MODE: warm conversational voice.
- Speak naturally and kindly.
- Use short sentences and gentle pauses.
- Use friendly phrases like "Sure —", "I usually...", "One thing I do is..."
- Keep answers around 8-18 seconds of spoken time when possible.
- Use mild fillers sparingly (e.g., "so", "you know", "that said") to sound human.
`,
    slow: `
MODE: slow and clear voice.
- Speak slowly, use explicit longer pauses.
- Use short, clear sentences.
- Insert small pause cues using line breaks or ellipses (e.g., "First... I would...").
- Avoid energetic words; favor clarity and calm phrasing.
`,
    energetic: `
MODE: energetic and engaging voice.
- Speak with enthusiasm and concise energy.
- Use upbeat phrasing and short dynamic sentences.
- Use exclamations sparingly for emphasis (e.g., "That's exciting!") and avoid long pauses.
`,
    relaxed: `
MODE: relaxed and friendly voice.
- Speak in a soft, conversational manner.
- Use gentle pacing, casual phrasing, and reassuring language.
- Keep the tone personable and approachable.
`
  };

  const universalVoiceRules = `
VOICE-FIRST RULES (apply always):
- Speak as a human. Use first-person "I".
- Keep sentences short (6-14 words) and use natural pauses (linebreaks or "..." sequences).
- Do NOT output dense paragraphs or rigid numbered lists unless the user explicitly asks for a list.
- If the answer would be long, FIRST provide a short spoken summary (2-3 sentences), then offer "Would you like a fuller explanation?".
- Add natural, small filler phrases occasionally (e.g., "so", "you know", "let me explain").
- Keep language simple and conversational; avoid heavy jargon.
- Use the mode-specific guidance provided above depending on the detected mode.
- Base all content strictly on the reference profile above; do not invent experiences, companies, dates, or numbers not included.
`;

  // Put it all together into the content for the model
  const systemPrompt = [
    referenceProfile,
    universalVoiceRules,
    modeGuidanceMap[mode] || modeGuidanceMap["warm"],
    `MODE_DETECTED: ${mode}`,
    `USER_QUESTION: ${userText}`
  ].join("\n\n");

  // Build request body for Gemini: keep it concise, instruct generation to respond as voice-first
  const requestBody = {
    contents: [
      {
        parts: [
          { text: systemPrompt },
          // user input as last part
          { text: userText }
        ]
      }
    ],
    // small temperature for stable, consistent responses; adjust if you want more creativity
    temperature: 0.2,
    maxOutputTokens: 512
  };

  try {
    const r = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody)
    });

    const data = await r.json();

    // Helper: extract text robustly from various shapes of Gemini response
    function extractText(resp) {
      if (!resp) return null;
      if (resp.candidates && resp.candidates.length) {
        // common shape: candidates[0].content.parts[].text
        const parts = resp.candidates[0].content?.parts || [];
        return parts.map(p => (p.text || "")).join(" ").trim();
      }
      if (resp.outputs && resp.outputs.length) {
        // outputs[0].content[].text
        const parts = resp.outputs[0].content || [];
        return parts.map(p => (p.text || "")).join(" ").trim();
      }
      if (resp.message && resp.message.content) {
        return (resp.message.content || []).map(c => c.text || "").join(" ").trim();
      }
      if (typeof resp.text === "string") {
        return resp.text.trim();
      }
      // fallback: try to JSON-stringify small snapshot
      return JSON.stringify(resp).slice(0, 2000);
    }

    const rawReply = extractText(data) || "";
    // Safety: if the model returned something that mentions missing profile info, normalize
    const normalized = rawReply.replace(/\s+/g, " ").trim();

    // Final response: ensure not empty
    const finalReply = normalized.length ? normalized : "I didn't catch that. Could you repeat or rephrase your question?";

    return res.status(200).json({ reply: finalReply, modeDetected: mode });
  } catch (err) {
    return res.status(500).json({
      error: "Gemini request failed",
      details: err?.toString ? err.toString() : String(err)
    });
  }
}
