let recognition;
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const transcriptEl = document.getElementById("transcript");
const responseEl = document.getElementById("response");
const speakBtn = document.getElementById("speakBtn");
const copyBtn = document.getElementById("copyBtn");

// NEW: Container for conversation history
const historyContainer = document.getElementById("history");
let lastBotReply = "";  // NEW: Store ONLY the latest reply for TTS

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
      body: JSON.stringify({ text: userText }),
    });

    const data = await r.json();
    const botReply = data.reply || "No reply.";

    responseEl.textContent = botReply;
    lastBotReply = botReply; // NEW: Store ONLY this

    speakBtn.disabled = false;
    copyBtn.disabled = false;

    startBtn.disabled = false;
    stopBtn.disabled = true;

    appendToHistory(userText, botReply);

  } catch (err) {
    responseEl.textContent = "Error: " + err.toString();
    startBtn.disabled = false;
    stopBtn.disabled = true;
  }
}

/* ---------------- (NEW) CONVERSATION HISTORY ---------------- */

function appendToHistory(question, answer) {
  const userBubble = document.createElement("div");
  userBubble.className = "chat-user";
  userBubble.innerHTML = `<span class="chat-label">You:</span><br>${question}`;

  const botBubble = document.createElement("div");
  botBubble.className = "chat-bot";
  botBubble.innerHTML = `<span class="chat-label">Sanjai:</span><br>${answer}`;

  historyContainer.appendChild(userBubble);
  historyContainer.appendChild(botBubble);

  // Auto-scroll to bottom
  historyContainer.scrollTop = historyContainer.scrollHeight;
}

/* ---------------- FIXED TTS — SPEAK ONLY LATEST BOT REPLY ---------------- */

speakBtn.onclick = () => {
  const u = new SpeechSynthesisUtterance(lastBotReply);
  u.lang = "en-US";
  speechSynthesis.speak(u);
};

/* ---------------- COPY ---------------- */

copyBtn.onclick = async () => {
  await navigator.clipboard.writeText(lastBotReply);
  copyBtn.textContent = "Copied";
  setTimeout(() => (copyBtn.textContent = "📄 Copy"), 1200);
};
