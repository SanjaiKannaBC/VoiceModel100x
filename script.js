/* Hybrid Voice-Agent + Chat script.js
   - Hybrid UI (voice-first + chat history)
   - Auto-speak with option toggle
   - Voice-mode indicator (from backend: modeDetected)
   - Chime before speaking (toggle)
   - Pitch & rate controls
   - Stop Speaking support
   - Uses /api/generate (Gemini proxy)
*/

let recognition;
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

// DOM
const micBtn = document.getElementById("micBtn");
const listeningLabel = document.getElementById("listeningLabel");
const liveTranscript = document.getElementById("liveTranscript");
const liveReply = document.getElementById("liveReply");
const speakBtn = document.getElementById("speakBtn");
const stopSpeakBtn = document.getElementById("stopSpeakBtn");
const chimeToggle = document.getElementById("chimeToggle");
const autoSpeakToggle = document.getElementById("autoSpeakToggle");
const chimeAudio = document.getElementById("chime");
const historyEl = document.getElementById("history");
const suggestionsEl = document.getElementById("suggestions");
const clearBtn = document.getElementById("clearBtn");
const modeIndicator = document.getElementById("modeIndicator");
const rateControl = document.getElementById("rateControl");
const pitchControl = document.getElementById("pitchControl");

// state
let lastBotReply = "";
let autoSpeak = true;
let chimeOn = true;
let utterance = null;
let isListening = false;
let isThinking = false;

// avatar path (uses uploaded resume local path as requested)
const BOT_AVATAR = "/mnt/data/Sanjai Kanna B C.pdf";
const USER_AVATAR_SVG = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='44' height='44'><rect width='44' height='44' fill='%23eef2f7' rx='8'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-size='13' fill='%23112'>YOU</text></svg>";

// initialize avatar visual
document.getElementById("agentAvatar").textContent = "SKB"; // fallback initials

// Speech Recognition setup
if (!SpeechRecognition) {
  alert("SpeechRecognition not supported. Use Chrome or Edge.");
} else {
  recognition = new SpeechRecognition();
  recognition.lang = "en-IN";
  recognition.interimResults = false;
  recognition.continuous = false;
}

// mic button toggles listening
micBtn.addEventListener("click", () => {
  if (!recognition) return;
  if (isListening) {
    stopListening();
  } else {
    startListening();
  }
});

function startListening() {
  try {
    recognition.start();
    isListening = true;
    listeningLabel.textContent = "Listening…";
    micBtn.classList.add("listening");
    // stop any speech while starting to listen
    window.speechSynthesis.cancel();
  } catch (e) {
    console.warn(e);
  }
}

function stopListening() {
  if (!recognition) return;
  recognition.stop();
  isListening = false;
  listeningLabel.textContent = "Press mic or say \"Start\"";
  micBtn.classList.remove("listening");
}

// recognition events
if (recognition) {
  recognition.onresult = async (ev) => {
    const text = ev.results[0][0].transcript.trim();
    liveTranscript.textContent = text;
    stopListening();
    await askAgent(text);
  };

  recognition.onerror = (ev) => {
    liveTranscript.textContent = "Recognition error: " + ev.error;
    stopListening();
  };

  recognition.onend = () => {
    isListening = false;
    micBtn.classList.remove("listening");
    listeningLabel.textContent = "Press mic or say \"Start\"";
  };

  // If the user starts speaking while the bot is speaking: stop the TTS
  recognition.onstart = () => {
    if (speechSynthesis.speaking) {
      speechSynthesis.cancel();
      stopSpeakBtn.disabled = true;
    }
  };
}

// buttons: chime, autoSpeak
chimeToggle.addEventListener("click", () => {
  chimeOn = !chimeOn;
  chimeToggle.textContent = chimeOn ? "🔔 Chime: On" : "🔕 Chime: Off";
});

autoSpeakToggle.addEventListener("click", () => {
  autoSpeak = !autoSpeak;
  autoSpeakToggle.classList.toggle("on", autoSpeak);
  autoSpeakToggle.textContent = autoSpeak ? "🤖 Auto-speak: On" : "🤖 Auto-speak: Off";
});

// speak and stop speaking
speakBtn.addEventListener("click", () => speakLastReply());
stopSpeakBtn.addEventListener("click", () => {
  speechSynthesis.cancel();
  stopSpeakBtn.disabled = true;
});

// suggestions click
suggestionsEl.addEventListener("click", (ev) => {
  if (!ev.target.classList.contains("sugg-btn")) return;
  const q = ev.target.textContent.trim();
  liveTranscript.textContent = q;
  askAgent(q);
});

// clear
clearBtn.addEventListener("click", () => {
  historyEl.innerHTML = "";
  liveReply.textContent = "Bot reply will appear here (auto plays by default).";
  lastBotReply = "";
  speakBtn.disabled = true;
  stopSpeakBtn.disabled = true;
});

// pitch/rate controls update nothing immediate; used at speak time

// askAgent: calls backend /api/generate
async function askAgent(text) {
  if (isThinking) return;
  isThinking = true;
  liveReply.textContent = "Thinking…";
  appendHistoryEntry({ role: "user", text });

  // show typing (small visual)
  const typingId = showTyping();

  try {
    const r = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text })
    });
    const json = await r.json();
    const reply = (json && json.reply) ? json.reply : "I didn't catch that. Could you repeat?";
    const mode = json.modeDetected || (json.mode || "warm");

    // update UI
    lastBotReply = reply;
    modeIndicator.textContent = `Mode: ${mode}`;
    liveReply.textContent = reply;
    appendHistoryEntry({ role: "bot", text: reply });

    removeTyping(typingId);
    isThinking = false;
    speakBtn.disabled = false;
    stopSpeakBtn.disabled = true;

    // play chime and auto-speak
    if (chimeOn && chimeAudio && chimeAudio.play) {
      try { chimeAudio.currentTime = 0; chimeAudio.play().catch(()=>{}); } catch(e) {}
    }
    if (autoSpeak) {
      setTimeout(() => speakLastReply(), 220); // short delay for chime/timing
    }
  } catch (err) {
    removeTyping(typingId);
    isThinking = false;
    liveReply.textContent = "Error: " + (err?.toString?.() || String(err));
  }
}

// history helpers
function appendHistoryEntry({ role, text }) {
  const item = document.createElement("div");
  item.className = "history-item " + (role === "user" ? "user" : "bot");

  const avatar = document.createElement("div");
  avatar.className = "avatar";
  if (role === "bot") {
    // if source is a PDF path, show initials
    avatar.textContent = "SKB";
  } else {
    avatar.style.backgroundImage = `url('${USER_AVATAR_SVG}')`;
  }

  const bubble = document.createElement("div");
  bubble.className = "bubble";
  const label = document.createElement("div");
  label.className = "chat-label";
  label.textContent = role === "user" ? "You" : "Sanjai";
  bubble.appendChild(label);

  const content = document.createElement("div");
  content.innerHTML = escapeHtml(text).replace(/\n/g, "<br>");
  bubble.appendChild(content);

  if (role === "user") {
    item.appendChild(document.createElement("div")); // spacer
    item.appendChild(bubble);
    item.appendChild(avatar);
  } else {
    item.appendChild(avatar);
    item.appendChild(bubble);
  }

  historyEl.appendChild(item);
  // auto-scroll
  historyEl.scrollTop = historyEl.scrollHeight;
}

// typing indicator
let typingCounter = 0;
function showTyping() {
  const id = `typing-${++typingCounter}`;
  const el = document.createElement("div");
  el.id = id;
  el.className = "history-item bot";
  const avatar = document.createElement("div");
  avatar.className = "avatar";
  avatar.textContent = "SKB";
  const bubble = document.createElement("div");
  bubble.className = "bubble";
  const label = document.createElement("div");
  label.className = "chat-label";
  label.textContent = "Sanjai";
  const typing = document.createElement("div");
  typing.className = "typing";
  typing.textContent = "Sanjai is thinking…";
  bubble.appendChild(label);
  bubble.appendChild(typing);

  el.appendChild(avatar);
  el.appendChild(bubble);
  historyEl.appendChild(el);
  historyEl.scrollTop = historyEl.scrollHeight;
  return id;
}
function removeTyping(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

// speaking
function speakLastReply() {
  if (!lastBotReply) return;
  // cancel any current
  speechSynthesis.cancel();
  utterance = new SpeechSynthesisUtterance(lastBotReply);
  utterance.lang = "en-US";
  utterance.rate = parseFloat(rateControl.value || 1);
  utterance.pitch = parseFloat(pitchControl.value || 1);
  // add small filler handling: keep text as is because backend already included natural pauses
  speechSynthesis.speak(utterance);
  stopSpeakBtn.disabled = false;

  utterance.onend = () => {
    stopSpeakBtn.disabled = true;
  };
  utterance.onerror = () => {
    stopSpeakBtn.disabled = true;
  };
}

// small utility: escape and basic formatting
function escapeHtml(s){
  return String(s || "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;");
}
