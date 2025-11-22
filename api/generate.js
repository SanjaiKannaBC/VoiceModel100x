export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  const userText = req.body.text || "";
  if (!userText.trim()) {
    return res.status(400).json({ error: "Missing text" });
  }

  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Missing GOOGLE_API_KEY" });
  }

  const endpoint =
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=" +
    apiKey;

  // ------------------------
  //  MODE DETECTION
  // ------------------------
  function detectMode(text) {
    const q = text.toLowerCase();
    if (q.includes("slow") || q.includes("calm")) return "slow";
    if (q.includes("energetic") || q.includes("excited")) return "energetic";
    if (q.includes("relax")) return "relaxed";

    // Default: warm conversational
    return "warm";
  }

  const mode = detectMode(userText);

  // ------------------------
  // SYSTEM PROMPT
  // ------------------------
  const referenceProfile = `
You are Sanjai Kanna B C. You are a warm, natural-sounding voice assistant.
Use short spoken sentences, natural pauses, gentle fillers.
Never speak like a chatbot. Never list rigid bullets unless necessary.
Always be conversational and human.

VOICE MODE: ${mode}
- warm: friendly, natural  
- slow: calm, clear  
- energetic: upbeat  
- relaxed: soft, casual  

If your answer is long, give a short summary and ask if the user wants details.

STRICT FACTS (do not invent):
- Data Analyst & Python Developer  
- Skilled in Power BI, SQL, Python, Excel  
- Internships at Absolute Broking, Antontech  
- Projects: Sleep Pattern Regression + SVM, FastAPI Task Manager  
- Studying BS Data Science at IIT Madras  
- B.Com Computer Applications at Loyola College  
`;

  // ------------------------
  // VALID GEMINI BODY
  // ------------------------
  const requestBody = {
    contents: [
      {
        parts: [
          { text: referenceProfile },
          { text: "User said: " + userText }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 256
    }
  };

  try {
    const r = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    const data = await r.json();

    const output =
      data?.candidates?.[0]?.content?.parts
        ?.map((p) => p.text)
        .join(" ") || "Sorry, I didn’t catch that.";

    return res.status(200).json({
      reply: output,
      modeDetected: mode
    });

  } catch (err) {
    return res.status(500).json({
      error: "Gemini request failed",
      details: err.toString(),
    });
  }
}
