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
    return res.status(500).json({ error: "API key missing" });
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`;

  /* ============================================================
               SANJAI’S VOICE-FIRST SYSTEM PROMPT
     ============================================================ */

  const referenceProfile = `
You are Sanjai Kanna B C. You are speaking — not typing.
The listener hears your voice. 
Your responses must sound natural, warm, calm, and human.

Use only the following profile. Never make up details.

=== REFERENCE PROFILE ===
Name: Sanjai Kanna B C
Location: Chennai

Profile Summary:
A data analyst and Python developer with experience in Power BI, SQL, Python, analytics,
finance operations, automation, and dashboard creation.

Internships:
1. Absolute Broking — financial analysis, onboarding, KYC, finance dashboards.
2. Antontech — data operations, invoice validation, Power BI reports, process automation.

Projects:
- Mobile Usage vs Sleep: Linear Regression, SVM, Power BI dashboard.
- FastAPI Task Manager API.
- Multiple analytics dashboards.

Skills:
Python, Pandas, NumPy, SQL, Power BI, Excel, Data Cleaning, EDA, Basic web dev.

Education:
IIT Madras BS in Data Science (ongoing)
B.Com (Computer Applications), Loyola College.

Soft Skills:
Communication, discipline, problem solving, analytical thinking, structured execution.

Career Focus:
Analytics, automation, Python development, reporting.

=== END PROFILE ===
  `;

  const voiceToneRules = `
VOICE-FIRST RULES:
- Speak like a real human talking in a calm, friendly tone.
- Use short sentences.
- Use natural conversational flow.
- Add gentle pauses by breaking into short paragraphs.
- Never dump long paragraphs.
- Never speak like a corporate chatbot.
- No bullet points unless absolutely necessary.
- No rigid structure. No robotic listing.
- Talk like you’re having a smooth conversation with the interviewer.
- Keep answers clear and to the point.
- Avoid jargon-heavy sentences.
- If the question asks for multiple items, explain them naturally, not like a list:
  Example: “First…, then…, and finally…”
- Always answer in first-person (“I”).
- Keep answers between 8–18 seconds of spoken time.
- Warm, grounded, and confident tone.
  `;

  const body = {
    contents: [
      {
        parts: [
          { text: referenceProfile },
          { text: voiceToneRules },
          { text: text }
        ]
      }
    ]
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    let reply = "I didn’t catch that. Could you repeat it?";
    if (data?.candidates?.length) {
      reply = data.candidates[0].content.parts
        .map(p => p.text)
        .join(" ");
    }

    return res.status(200).json({ reply });

  } catch (error) {
    return res.status(500).json({
      error: "Gemini request failed",
      details: error.toString(),
    });
  }
}
