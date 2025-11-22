// script.js — Chat bubbles, avatars, typing indicator, suggestions, clear history
let recognition;
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

// DOM
const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const transcriptEl = document.getElementById("transcript");
const responseEl = document.getElementById("response");
const speakBtn = document.getElementById("speakBtn");
const copyBtn = document.getElementById("copyBtn");
const historyContainer = document.getElementById("history");
const suggestions = document.getElementById("suggestions");
const clearBtn = document.getElementById("clearBtn");

if (!SpeechRecognition) {
  alert("Speech Recognition not supported. Use Chrome or Edge.");
}

recognition = new SpeechRecognition();
recognition.lang = "en-IN";
recognition.interimResults = false;

let lastBotReply = "";
let isThinking = false;

// AVATAR SOURCE (use uploaded resume file path as placeholder, replace with image later)
const BOT_AVATAR = "/mnt/data/Sanjai Kanna B C.pdf"; // replace with image URL eventually
const USER_AVATAR = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='44' height='44'><rect width='44' height='44' fill='%23e6eef6' rx='8'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-size='18' fill='%23112'>You</text></svg>";

// Start/Stop handlers
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

recognition.onresult = async (event) => {
  const userText = event.results[0][0].transcript.trim();
  transcriptEl.textContent = userText;
  await askGemini(userText);
};

recognition.onerror = (e) => {
  transcriptEl.textContent = "Error: " + e.error;
  startBtn.disabled = false;
  stopBtn.disabled = true;
};

// Suggested questions click handler (event delegation)
suggestions.addEventListener("click", (ev) => {
  if (!ev.target.classList.contains("suggestion")) return;
  const q = ev.target.textContent.trim();
  // show in transcript field and ask
  transcriptEl.textContent = q;
  askGemini(q);
});

// Clear history
clearBtn.addEventListener("click", () => {
  historyContainer.innerHTML = "";
  // reset main response too
  responseEl.textContent = "—";
  lastBotReply = "";
  speakBtn.disabled = true;
  copyBtn.disabled = true;
});

// API call + typing indicator
async function askGemini(userText) {
  // Prevent overlapping calls
  if (isThinking) return;
  isThinking = true;

  // update UI
  responseEl.textContent = "Thinking...";
  speakBtn.disabled = true;
  copyBtn.disabled = true;
  startBtn.disabled = false;
  stopBtn.disabled = true;

  // show user bubble immediately
  appendUserBubble(userText);

  // show typing indicator bubble (bot)
  const typingId = showTypingIndicator();

  try {
    const r = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: userText })
    });

    const data = await r.json();
    const botReply = data.reply || "No reply.";
    lastBotReply = botReply;

    // remove typing indicator and append bot bubble
    removeTypingIndicator(typingId);
    appendBotBubble(botReply);

    // update top-level response area (for quick listen/copy)
    responseEl.textContent = botReply;
    speakBtn.disabled = false;
    copyBtn.disabled = false;

    // ensure start/stop button states
    startBtn.disabled = false;
    stopBtn.disabled = true;
    isThinking = false;

  } catch (err) {
    removeTypingIndicator(typingId);
    responseEl.textContent = "Error: " + err.toString();
    startBtn.disabled = false;
    stopBtn.disabled = true;
    isThinking = false;
  }
}

// TTS speak only latest bot reply
speakBtn.onclick = () => {
  if (!lastBotReply) return;
  const u = new SpeechSynthesisUtterance(lastBotReply);
  u.lang = "en-US";
  speechSynthesis.cancel();
  speechSynthesis.speak(u);
};

// Copy only latest bot reply
copyBtn.onclick = async () => {
  if (!lastBotReply) return;
  await navigator.clipboard.writeText(lastBotReply);
  copyBtn.textContent = "Copied";
  setTimeout(() => (copyBtn.textContent = "📄 Copy"), 1200);
};

/* ---------------- UI helpers ---------------- */

function createAvatarDiv(src) {
  const d = document.createElement("div");
  d.className = "avatar";
  // if PDF path used, fallback to neutral color background; modern browsers can't render PDF as image
  if (src && src.endsWith(".pdf")) {
    d.style.background = "#dbeef6";
    d.textContent = "SKB";
    d.style.display = "flex";
    d.style.alignItems = "center";
    d.style.justifyContent = "center";
    d.style.fontWeight = "700";
    d.style.color = "#0f2b3b";
    d.style.fontSize = "14px";
  } else {
    d.style.backgroundImage = `url('${src}')`;
  }
  return d;
}

function appendUserBubble(text) {
  const item = document.createElement("div");
  item.className = "chat-item chat-user";

  const avatar = createAvatarDiv(USER_AVATAR);
  const bubbleWrap = document.createElement("div");
  bubbleWrap.className = "bubble";
  bubbleWrap.innerHTML = `<span class="chat-label">You</span>${escapeHtml(text)}`;

  // user aligned right: bubble first then avatar on right
  item.appendChild(document.createElement("div")); // spacer to keep structure
  item.appendChild(bubbleWrap);
  item.appendChild(avatar);

  historyContainer.appendChild(item);
  autoScroll();
}

function appendBotBubble(text) {
  const item = document.createElement("div");
  item.className = "chat-item chat-bot";

  const avatar = createAvatarDiv(BOT_AVATAR);
  const bubbleWrap = document.createElement("div");
  bubbleWrap.className = "bubble";
  bubbleWrap.innerHTML = `<span class="chat-label">Sanjai</span>${escapeHtml(text)}`;

  item.appendChild(avatar);
  item.appendChild(bubbleWrap);

  historyContainer.appendChild(item);
  autoScroll();
}

/* Typing indicator helpers */
let typingCounter = 0;
function showTypingIndicator() {
  const id = `typing-${++typingCounter}`;
  const item = document.createElement("div");
  item.className = "chat-item chat-bot";
  item.id = id;

  const avatar = createAvatarDiv(BOT_AVATAR);
  const bubbleWrap = document.createElement("div");
  bubbleWrap.className = "bubble";
  bubbleWrap.innerHTML = `<span class="chat-label">Sanjai</span><div class="typing">Sanjai is typing<span class="dots">...</span></div>`;

  item.appendChild(avatar);
  item.appendChild(bubbleWrap);

  historyContainer.appendChild(item);
  autoScroll();
  return id;
}

function removeTypingIndicator(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

/* Auto-scroll */
function autoScroll() {
  historyContainer.scrollTop = historyContainer.scrollHeight;
}

/* Simple HTML escape to avoid breaking markup */
function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
