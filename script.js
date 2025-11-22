/* ============================================================
   Voice Interview Bot — Full script.js
   Includes: Chat bubbles, TTS, Stop Speaking, Suggestions,
   Typing Indicator, Auto-scroll, Clear History, Avatars
   ============================================================ */

let recognition;
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

// DOM Elements
const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const transcriptEl = document.getElementById("transcript");
const responseEl = document.getElementById("response");
const speakBtn = document.getElementById("speakBtn");
const stopSpeakBtn = document.getElementById("stopSpeakBtn");
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

// Avatars (PDF shows initials SKB)
const BOT_AVATAR = "/mnt/data/Sanjai Kanna B C.pdf";
const USER_AVATAR =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='44' height='44'><rect width='44' height='44' fill='%23e6eef6' rx='8'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-size='18' fill='%23112'>You</text></svg>";

/* ======================
      Start / Stop STT
   ====================== */

startBtn.onclick = () => {
    try {
        recognition.start();
        transcriptEl.textContent = "Listening...";
        responseEl.textContent = "—";
        startBtn.disabled = true;
        stopBtn.disabled = false;
    } catch {}
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

/* ======================
      Suggested Questions
   ====================== */

suggestions.addEventListener("click", async (ev) => {
    if (!ev.target.classList.contains("suggestion")) return;

    const q = ev.target.textContent.trim();
    transcriptEl.textContent = q;
    await askGemini(q);
});

/* ======================
        Clear History
   ====================== */

clearBtn.addEventListener("click", () => {
    historyContainer.innerHTML = "";
    responseEl.textContent = "—";
    lastBotReply = "";
    speakBtn.disabled = true;
    stopSpeakBtn.disabled = true;
    copyBtn.disabled = true;
});

/* ======================
        Ask Gemini
   ====================== */

async function askGemini(userText) {
    if (isThinking) return;
    isThinking = true;

    responseEl.textContent = "Thinking...";
    speakBtn.disabled = true;
    stopSpeakBtn.disabled = true;
    copyBtn.disabled = true;

    startBtn.disabled = false;
    stopBtn.disabled = true;

    appendUserBubble(userText);

    const typingId = showTypingIndicator();

    try {
        const r = await fetch("/api/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: userText }),
        });

        const data = await r.json();
        const botReply = data.reply || "No reply received.";

        lastBotReply = botReply;

        removeTypingIndicator(typingId);
        appendBotBubble(botReply);

        responseEl.textContent = botReply;

        speakBtn.disabled = false;
        copyBtn.disabled = false;

        stopSpeakBtn.disabled = true;

        isThinking = false;
    } catch (err) {
        removeTypingIndicator(typingId);
        responseEl.textContent = "Error: " + err.toString();
        isThinking = false;
    }
}

/* ======================
      Chat Bubbles
   ====================== */

function createAvatar(src, textFallback = "SKB") {
    const d = document.createElement("div");
    d.className = "avatar";

    if (src.endsWith(".pdf")) {
        d.textContent = textFallback;
        d.style.background = "#d5ebf8";
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
    const div = document.createElement("div");
    div.className = "chat-item chat-user";

    const avatar = createAvatar(USER_AVATAR, "YOU");

    const bubble = document.createElement("div");
    bubble.className = "bubble";
    bubble.innerHTML = `<span class="chat-label">You</span>${escapeHtml(text)}`;

    const spacer = document.createElement("div");

    div.appendChild(spacer);
    div.appendChild(bubble);
    div.appendChild(avatar);

    historyContainer.appendChild(div);
    autoScroll();
}

function appendBotBubble(text) {
    const div = document.createElement("div");
    div.className = "chat-item chat-bot";

    const avatar = createAvatar(BOT_AVATAR, "SKB");

    const bubble = document.createElement("div");
    bubble.className = "bubble";
    bubble.innerHTML = `<span class="chat-label">Sanjai</span>${escapeHtml(text)}`;

    div.appendChild(avatar);
    div.appendChild(bubble);

    historyContainer.appendChild(div);
    autoScroll();
}

/* ======================
      Typing Indicator
   ====================== */

let typingCounter = 0;

function showTypingIndicator() {
    const id = `typing-${++typingCounter}`;

    const item = document.createElement("div");
    item.className = "chat-item chat-bot";
    item.id = id;

    const avatar = createAvatar(BOT_AVATAR, "SKB");

    const bubble = document.createElement("div");
    bubble.className = "bubble";
    bubble.innerHTML = `
        <span class="chat-label">Sanjai</span>
        <div class="typing">Sanjai is typing<span class="dots">...</span></div>
    `;

    item.appendChild(avatar);
    item.appendChild(bubble);

    historyContainer.appendChild(item);
    autoScroll();

    return id;
}

function removeTypingIndicator(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
}

/* ======================
         Auto Scroll
   ====================== */

function autoScroll() {
    historyContainer.scrollTop = historyContainer.scrollHeight;
}

/* ======================
   Speak / Stop Speaking
   ====================== */

let utterance;

speakBtn.onclick = () => {
    if (!lastBotReply) return;

    speechSynthesis.cancel();

    utterance = new SpeechSynthesisUtterance(lastBotReply);
    utterance.lang = "en-US";

    speechSynthesis.speak(utterance);

    stopSpeakBtn.disabled = false;

    utterance.onend = () => {
        stopSpeakBtn.disabled = true;
    };
};

stopSpeakBtn.onclick = () => {
    speechSynthesis.cancel();
    stopSpeakBtn.disabled = true;
};

/* ======================
         Copy Text
   ====================== */

copyBtn.onclick = async () => {
    if (!lastBotReply) return;

    await navigator.clipboard.writeText(lastBotReply);

    copyBtn.textContent = "Copied!";
    setTimeout(() => (copyBtn.textContent = "📄 Copy"), 1200);
};

/* ======================
     HTML Escape Utility
   ====================== */

function escapeHtml(str) {
    return String(str)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;");
}
