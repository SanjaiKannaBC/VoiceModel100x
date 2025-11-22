/* ------------------------------------------------------------------
   DOM ELEMENTS
------------------------------------------------------------------ */
const micButton = document.getElementById("micButton");
const waveform = document.getElementById("waveform");
const speakBtn = document.getElementById("speakBtn");
const stopSpeakBtn = document.getElementById("stopSpeakBtn");
const userTextDisplay = document.getElementById("userTextDisplay");
const botResponse = document.getElementById("botResponse");
const historyContainer = document.getElementById("historyContainer");
const clearHistoryBtn = document.getElementById("clearHistory");

const chimeToggle = document.getElementById("chimeToggle");
const autoSpeakToggle = document.getElementById("autoSpeakToggle");

const suggestedBtns = document.querySelectorAll(".suggested-btn");
const voiceModeEl = document.getElementById("voiceMode");

/* ------------------------------------------------------------------
   GLOBAL STATE
------------------------------------------------------------------ */
let isListening = false;
let recognition;
let synth = window.speechSynthesis;
let currentUtterance = null;

let chimeEnabled = true;
let autoSpeakEnabled = true;

/* ------------------------------------------------------------------
   INITIALIZE SPEECH RECOGNITION
------------------------------------------------------------------ */
function initSpeechRecognition() {
  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    alert("Speech Recognition not supported in this browser.");
    return;
  }

  recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = "en-US";

  recognition.onresult = (event) => {
    const text = event.results[0][0].transcript;
    userTextDisplay.textContent = "You said: " + text;
    stopListening();
    sendTextToBackend(text);
  };

  recognition.onerror = () => stopListening();
}

/* ------------------------------------------------------------------
   START / STOP LISTENING
------------------------------------------------------------------ */
function startListening() {
  if (!recognition) initSpeechRecognition();

  isListening = true;
  micButton.style.background = "#0a8f4a";
  waveform.style.opacity = 1;

  recognition.start();
}

function stopListening() {
  if (!recognition) return;

  isListening = false;
  micButton.style.background = "#13b05c";
  waveform.style.opacity = 0.3;

  try {
    recognition.stop();
  } catch {}
}

/* ------------------------------------------------------------------
   MIC BUTTON CLICK
------------------------------------------------------------------ */
micButton.addEventListener("click", () => {
  if (!isListening) startListening();
  else stopListening();
});

/* ------------------------------------------------------------------
   SEND TEXT TO BACKEND /api/generate
------------------------------------------------------------------ */
async function sendTextToBackend(text) {
  botResponse.value = "Thinking...";

  try {
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text })
    });

    const data = await res.json();
    const reply = data.reply || "Sorry, I didn't understand that.";

    botResponse.value = reply;
    voiceModeEl.textContent = data.modeDetected || "warm";

    addToHistory(text, reply);

    if (autoSpeakEnabled) speakResponse(reply);

  } catch (err) {
    botResponse.value = "Error connecting to server.";
  }
}

/* ------------------------------------------------------------------
   TTS — SPEAK BOT RESPONSE
------------------------------------------------------------------ */
function speakResponse(text) {
  if (!text) return;

  if (chimeEnabled) {
    const chime = new Audio("/chime.mp3");
    chime.play();
  }

  if (synth.speaking) synth.cancel();

  const utter = new SpeechSynthesisUtterance(text);
  currentUtterance = utter;

  stopSpeakBtn.disabled = false;

  utter.onend = () => {
    stopSpeakBtn.disabled = true;
  };

  synth.speak(utter);
}

/* Stop Speaking */
stopSpeakBtn.addEventListener("click", () => {
  if (synth.speaking) synth.cancel();
  stopSpeakBtn.disabled = true;
});

/* Manual Speak */
speakBtn.addEventListener("click", () => {
  speakResponse(botResponse.value);
});

/* ------------------------------------------------------------------
   CONVERSATION HISTORY
------------------------------------------------------------------ */
function addToHistory(userText, botText) {
  const userBubble = document.createElement("div");
  userBubble.className = "bubble-user";
  userBubble.textContent = userText;

  const botBubble = document.createElement("div");
  botBubble.className = "bubble-bot";
  botBubble.textContent = botText;

  historyContainer.appendChild(userBubble);
  historyContainer.appendChild(botBubble);

  historyContainer.scrollTop = historyContainer.scrollHeight;
}

/* Clear history */
clearHistoryBtn.addEventListener("click", () => {
  historyContainer.innerHTML = "";
});

/* ------------------------------------------------------------------
   SUGGESTED QUESTIONS
------------------------------------------------------------------ */
suggestedBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    const text = btn.textContent.trim();
    userTextDisplay.textContent = "You said: " + text;
    sendTextToBackend(text);
  });
});

/* ------------------------------------------------------------------
   TOGGLES — CHIME + AUTO-SPEAK
------------------------------------------------------------------ */
chimeToggle.addEventListener("click", () => {
  chimeEnabled = !chimeEnabled;
  chimeToggle.textContent = "🔔 Chime: " + (chimeEnabled ? "On" : "Off");
});

autoSpeakToggle.addEventListener("click", () => {
  autoSpeakEnabled = !autoSpeakEnabled;
  autoSpeakToggle.textContent =
    "🔊 Auto-speak: " + (autoSpeakEnabled ? "On" : "Off");
});

/* ------------------------------------------------------------------
   INITIAL SETUP
------------------------------------------------------------------ */
initSpeechRecognition();
waveform.style.opacity = 0.3;
stopSpeakBtn.disabled = true;
