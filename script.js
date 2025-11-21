let recognition;
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const transcriptEl = document.getElementById("transcript");
const responseEl = document.getElementById("response");
const speakBtn = document.getElementById("speakBtn");
const copyBtn = document.getElementById("copyBtn");

if (!SpeechRecognition) {
  alert("Speech Recognition not supported. Use Chrome.");
}

recognition = new SpeechRecognition();
recognition.lang = "en-IN";
recognition.interimResults = false;

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
  const text = event.results[0][0].transcript;
  transcriptEl.textContent = text;
  askGemini(text);
};

recognition.onerror = (e) => {
  transcriptEl.textContent = "Error: " + e.error;
};

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

    responseEl.textContent = data.reply || "No reply.";
    speakBtn.disabled = false;
    copyBtn.disabled = false;

  } catch (err) {
    responseEl.textContent = "Error: " + err.toString();
  }
}

speakBtn.onclick = () => {
  const t = responseEl.textContent;
  const u = new SpeechSynthesisUtterance(t);
  u.lang = "en-US";
  speechSynthesis.speak(u);
};

copyBtn.onclick = async () => {
  await navigator.clipboard.writeText(responseEl.textContent);
  copyBtn.textContent = "Copied";
  setTimeout(() => (copyBtn.textContent = "📄 Copy"), 1200);
};
