import fetch from "node-fetch";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  const { text } = req.body;
  if (!text) {
    return res.status(400).json({ error: "Missing text" });
  }

  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "API key missing in Vercel env" });
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`;

  const body = {
    contents: [
      {
        parts: [
          { text: "You are Sanjai answering interview questions concisely and confidently." },
          { text: text }
        ]
      }
    ]
  };

  try {
    const g = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    const data = await g.json();

    let reply = "No response generated.";

    if (data?.candidates?.length) {
      reply = data.candidates[0].content.parts
        .map(p => p.text)
        .join(" ");
    }

    return res.status(200).json({ reply });

  } catch (err) {
    return res.status(500).json({
      error: "Gemini call failed",
      details: err.toString()
    });
  }
}
