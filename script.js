let recognition;
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const transcriptEl = document.getElementById("transcript");
const responseEl = document.getElementById("response");
const speakBtn = document.getElementById("speakBtn");
const copyBtn = document.getElementById("copyBtn");

// NEW: Conversation history container
let historyContainer = document.createElement("div");
historyContainer.style.marginTop = "20px";
document.querySelector(".container").appendChild(historyContainer);

if (!SpeechRecognition) {
  alert("Speech Recognition not supported. Use Chrome.");
}

recognition = new SpeechRecognition();
recognition.lang = "en-IN";
recognition.interimResults = false;

/* ---------------- BUTTON BEHAVIOR ---------------- */

startBtn.onclick = () => {
  recognition.start();
  transcriptEl.textContent = "Listening...";
  responseEl.textContent = "—";

  startBtn.disabled = true;
  stopBtn.disabled = false;
};

stopBtn.onclick = () => {
  recognition.stop();

  startBtn.disabled = false;
  stopBtn.disabled = true;
};

/* ---------------- SPEECH RESULT ---------------- */

recognition.onresult = async (event) => {
  const userText = event.results[0][0].transcript;
  transcriptEl.textContent = userText;

  await askGemini(userText);
};

recognition.onerror = (e) => {
  transcriptEl.textContent = "Error: " + e.error;
  startBtn.disabled = false;
  stopBtn.disabled = true;
};

/* ---------------- GEMINI CALL ---------------- */

async function askGemini(userText) {
  responseEl.textContent = "Thinking...";
  speakBtn.disabled = true;
  copyBtn.disabled = true;

  try {
    const r = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: userText })
    });

    const data = await r.json();
    const botReply = data.reply || "No reply.";

    responseEl.textContent = botReply;

    // Enable buttons
    speakBtn.disabled = false;
    copyBtn.disabled = false;

    // Fix UI glitch: reset Start/Stop buttons
    startBtn.disabled = false;
    stopBtn.disabled = true;

    // Add to conversation history
    appendToHistory(userText, botReply);

  } catch (err) {
    responseEl.textContent = "Error: " + err.toString();

    startBtn.disabled = false;
    stopBtn.disabled = true;
  }
}

/* ---------------- (NEW) CONVERSATION HISTORY ---------------- */

function appendToHistory(question, answer) {
  const block = document.createElement("div");
  block.style.marginBottom = "16px";
  block.style.padding = "12px";
  block.style.border = "1px solid #ddd";
  block.style.borderRadius = "8px";
  block.style.background = "#fafafa";

  block.innerHTML = `
    <div><strong>Q:</strong> ${question}</div>
    <div style="margin-top:6px;"><strong>A:</strong> ${answer}</div>
  `;

  historyContainer.appendChild(block);
}

/* ---------------- SPEAK RESPONSE ---------------- */

speakBtn.onclick = () => {
  const t = responseEl.textContent;
  const u = new SpeechSynthesisUtterance(t);
  u.lang = "en-US";
  speechSynthesis.speak(u);
};

/* ---------------- COPY ---------------- */

copyBtn.onclick = async () => {
  await navigator.clipboard.writeText(responseEl.textContent);
  copyBtn.textContent = "Copied";
  setTimeout(() => (copyBtn.textContent = "📄 Copy"), 1200);
};
