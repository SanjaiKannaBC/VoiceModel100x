export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  const userText = (req.body.text || "").toString().trim();
  if (!userText) {
    return res.status(400).json({ error: "Missing text" });
  }

  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Missing GOOGLE_API_KEY" });
  }

  const endpoint =
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=" +
    apiKey;

  // -------------------------------
  // AUTO VOICE MODE DETECTION
  // -------------------------------
  function detectMode(q) {
    q = q.toLowerCase();
    if (q.includes("slow") || q.includes("calm")) return "slow";
    if (q.includes("energetic") || q.includes("excited")) return "energetic";
    if (q.includes("relax")) return "relaxed";

    // Personal or soft questions → relaxed
    if (q.includes("how are you") || q.includes("your background")) return "relaxed";

    // Long questions → slow
    if (q.split(" ").length > 25) return "slow";

    return "warm"; // default
  }

  const mode = detectMode(userText);

  // -------------------------------
  // VERIFIED PROFESSIONAL PROFILE
  // (FROM YOUR PDF)
  // -------------------------------
  const resumePath = "/mnt/data/Sanjai Kanna B C.pdf";

  const verifiedProfile = `
You are Sanjai Kanna B C.
Speak like a warm, natural, human voice agent. Use short spoken sentences. Avoid long paragraphs.
Add small pauses using line breaks or ellipses. Always sound friendly and conversational.

VOICE MODE: ${mode}
- warm: friendly and natural
- slow: calm and clear
- energetic: upbeat and lively
- relaxed: soft and easygoing

If the answer is long → give a short voice-friendly summary first, then ask if the user wants details.

Use ONLY the verified details below. NEVER invent information.

=== VERIFIED PROFESSIONAL PROFILE ===

Name: Sanjai Kanna B C  
Location: Chennai, India (Open to relocation / remote)  

Summary:
Result-driven Data Analyst & Python Developer skilled in Power BI, SQL, Python, and Excel.  
Experienced in financial analytics, business reporting, automation, and transforming raw data 
into actionable insights. Proven ability to streamline workflows, optimize reports, and support 
strategic decision-making.

Core Skills:
Data Cleaning, Visualization, EDA  
Financial Analytics (Ratio Analysis, Annual Report Analysis)  
Dashboard Development (Power BI, Excel)  
Trend Analysis & Forecasting  
Python (Pandas, NumPy, Matplotlib), SQL, MySQL  
Tableau, GitHub  
HTML, CSS, JavaScript  
Tally ERP, Invoice Processing  
KYC & Compliance basics  

Internship Experience:
1) Equity Research & Operations Intern — Absolute Broking Pvt Ltd (May 2025)  
- Conducted financial analysis using annual reports and ratios like ROA, EPS, Profit Margin.  
- Handled KYC verification and client onboarding processes.  
- Built financial dashboards and market insights content.

2) Data Operations & Analysis Intern — Antontech Pvt Ltd (May 2024)  
- Processed and verified vendor invoices using Tally ERP.  
- Built Power BI dashboards for stock analytics and sports data analysis.  
- Automated repetitive tasks to reduce manual workload.

Projects:
- Mobile Usage vs Sleep Patterns (Regression + SVM)  
  Collected dataset, built ML models, and visualized trends using Power BI.

- Task Manager API (FastAPI)  
  Implemented CRUD endpoints, JSON storage, and input validation.  
  Tested using Postman.

Education:
- BS in Data Science and Applications — IIT Madras (Expected 2028)  
  Completed Foundation Level; 100% in Python exam.  
- B.Com Computer Applications — Loyola College, Chennai (CGPA 9.0)  
  Editor — LIAC Magazine  
  Organizing Committee — Matrix Tech Fest

Certifications:
SQL, Power BI, Intermediate Python, NumPy, Data Visualization, ChatGPT usage.

Soft Skills:
Problem solving, Data interpretation, Communication, Team collaboration, Attention to detail.

Availability:
Immediate — open to internships, full-time, remote or on-site roles.

Resume file reference: ${resumePath}

=== END OF VERIFIED PROFILE ===
`;

  // -------------------------------
  // VOICE RULES (ALWAYS APPLIED)
  // -------------------------------
  const voiceRules = `
VOICE-FIRST RULES:
- Speak in short sentences suitable for listening, not reading.
- Use small natural fillers ("so", "let me think", "you know", "well").
- Insert natural pauses using ellipses (...) or line breaks.
- Never output robotic bullet points unless user explicitly asks.
- If listing items, speak them naturally: "First…, then…, and finally…"
- Always sound human, warm, and confident.
- Avoid jargon-heavy explanations unless needed.
- If a question is broad, provide a brief summary then ask if the user wants details.
- Use first-person "I" always.

Now answer the user’s question:
"${userText}"
`;

  // -------------------------------
  // VALID GEMINI FLASH-LITE BODY
  // -------------------------------
  const requestBody = {
    contents: [
      {
        parts: [
          { text: verifiedProfile },
          { text: voiceRules }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.35,
      maxOutputTokens: 300
    }
  };

  // -------------------------------
  // CALL GEMINI
  // -------------------------------
  try {
    const r = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody)
    });

    const data = await r.json();

    const output =
      data?.candidates?.[0]?.content?.parts
        ?.map((p) => p.text)
        .join(" ")
        .trim() || "I didn’t catch that. Could you repeat it?";

    return res.status(200).json({
      reply: output,
      modeDetected: mode
    });

  } catch (err) {
    return res.status(500).json({
      error: "Gemini request failed",
      details: err.toString()
    });
  }
}
