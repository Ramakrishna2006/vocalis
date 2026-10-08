/* Vocalis front-end */
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

const editor = $("#editor");
const micBtn = $("#micBtn");
const micStatus = $("#micStatus");
const interimEl = $("#interim");
const timerEl = $("#timer");

const state = { format: "pdf", align: "left", recording: false };

/* ---------- toast ---------- */
let toastTimer;
function toast(msg, isError = false) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.toggle("error", isError);
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 2800);
}

/* ---------- theme ---------- */
const savedTheme = localStorage.getItem("vocalis-theme");
if (savedTheme === "light") document.body.classList.add("light");
$("#themeToggle").onclick = () => {
  document.body.classList.toggle("light");
  localStorage.setItem("vocalis-theme", document.body.classList.contains("light") ? "light" : "dark");
};

/* ---------- tabs ---------- */
$$(".tab").forEach((tab) =>
  tab.addEventListener("click", () => {
    $$(".tab").forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    const textMode = tab.dataset.mode === "text";
    $(".tabs").classList.toggle("text-mode", textMode);
    $("#voicePanel").classList.toggle("hidden", textMode);
    if (textMode) { stopRecording(); editor.focus(); }
  })
);

/* ---------- stats & autosave ---------- */
function updateStats() {
  const txt = editor.value;
  const words = (txt.trim().match(/\S+/g) || []).length;
  $("#stats").textContent = `${words} word${words === 1 ? "" : "s"} · ${txt.length} characters`;
  localStorage.setItem("vocalis-draft", txt);
  localStorage.setItem("vocalis-title", $("#docTitle").value);
}
editor.addEventListener("input", updateStats);
$("#docTitle").addEventListener("input", updateStats);
editor.value = localStorage.getItem("vocalis-draft") || "";
$("#docTitle").value = localStorage.getItem("vocalis-title") || "My Document";
updateStats();

/* ---------- speech recognition ---------- */
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;
let startTime = 0, timerInt = null;

const COMMANDS = [
  [/\s*\bnew paragraph\b\s*/gi, "\n\n"],
  [/\s*\bnew line\b\s*/gi, "\n"],
  [/\s*\b(full stop|period)\b/gi, "."],
  [/\s*\bcomma\b/gi, ","],
  [/\s*\bquestion mark\b/gi, "?"],
  [/\s*\bexclamation (mark|point)\b/gi, "!"],
  [/\s*\bcolon\b/gi, ":"],
  [/\s*\bsemicolon\b/gi, ";"],
];

function applyCommands(text) {
  if (!$("#autoPunct").checked) return text;
  COMMANDS.forEach(([re, rep]) => (text = text.replace(re, rep)));
  // capitalise after sentence ends / new lines
  return text.replace(/(^|[.!?]\s+|\n\s*)([a-z])/g, (m, p, c) => p + c.toUpperCase());
}

function appendText(chunk) {
  chunk = applyCommands(chunk.trim());
  if (!chunk) return;
  const cur = editor.value;
  const needsSpace = cur && !/[\s\n]$/.test(cur) && !/^[.,!?;:\n]/.test(chunk);
  if (!cur || /[.!?]\s*$/.test(cur) || /\n$/.test(cur)) chunk = chunk.charAt(0).toUpperCase() + chunk.slice(1);
  editor.value = cur + (needsSpace ? " " : "") + chunk;
  editor.scrollTop = editor.scrollHeight;
  updateStats();
}

function initRecognition() {
  recognition = new SR();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = $("#lang").value;

  recognition.onresult = (e) => {
    let interim = "";
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const r = e.results[i];
      if (r.isFinal) appendText(r[0].transcript);
      else interim += r[0].transcript;
    }
    interimEl.textContent = interim;
  };
  recognition.onerror = (e) => {
    const msgs = {
      "not-allowed": "Microphone permission denied. Allow mic access in your browser.",
      "no-speech": "Didn't hear anything — try speaking a little louder.",
      "network": "Speech service needs an internet connection.",
      "audio-capture": "No microphone found.",
    };
    if (e.error !== "aborted") toast(msgs[e.error] || `Speech error: ${e.error}`, true);
    if (e.error === "not-allowed" || e.error === "audio-capture") stopRecording();
  };
  // Chrome stops after silence; restart while user still wants to record
  recognition.onend = () => { if (state.recording) { try { recognition.start(); } catch (_) {} } };
}

async function startRecording() {
  if (!SR) {
    toast("Speech recognition isn't supported here. Use Chrome or Edge.", true);
    return;
  }
  initRecognition();
  try { recognition.start(); } catch (_) {}
  state.recording = true;
  micBtn.classList.add("recording");
  micStatus.textContent = "Listening… tap to stop";
  timerEl.classList.add("live");
  startTime = Date.now();
  timerInt = setInterval(() => {
    const s = Math.floor((Date.now() - startTime) / 1000);
    timerEl.textContent = `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  }, 500);
  startVisualizer();
}

function stopRecording() {
  if (!state.recording) return;
  state.recording = false;
  try { recognition && recognition.stop(); } catch (_) {}
  micBtn.classList.remove("recording");
  micStatus.textContent = "Tap the mic and start speaking";
  timerEl.classList.remove("live");
  interimEl.textContent = "";
  clearInterval(timerInt);
  stopVisualizer();
}

micBtn.onclick = () => (state.recording ? stopRecording() : startRecording());
$("#lang").onchange = () => { if (state.recording) { stopRecording(); startRecording(); } };

/* ---------- waveform visualizer ---------- */
const canvas = $("#wave");
const ctx = canvas.getContext("2d");
let audioCtx, analyser, micStream, rafId;

function drawIdle() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const bars = 48, w = canvas.width / bars;
  for (let i = 0; i < bars; i++) {
    const h = 4 + Math.sin(i / 3) * 2;
    ctx.fillStyle = "rgba(150,150,150,.35)";
    ctx.fillRect(i * w + w * 0.25, (canvas.height - h) / 2, w * 0.5, h);
  }
}
drawIdle();

async function startVisualizer() {
  try {
    micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 128;
    audioCtx.createMediaStreamSource(micStream).connect(analyser);
    const data = new Uint8Array(analyser.frequencyBinCount);
    const bars = 48, w = canvas.width / bars;
    const grad = ctx.createLinearGradient(0, 0, canvas.width, 0);
    const cs = getComputedStyle(document.body);
    const c = (v) => cs.getPropertyValue(v).trim();
    grad.addColorStop(0, c("--accent")); grad.addColorStop(0.5, c("--accent2")); grad.addColorStop(1, c("--accent3"));
    const loop = () => {
      analyser.getByteFrequencyData(data);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = grad;
      for (let i = 0; i < bars; i++) {
        const v = data[i % data.length] / 255;
        const h = Math.max(4, v * canvas.height);
        const x = i * w + w * 0.2;
        ctx.beginPath();
        ctx.roundRect ? ctx.roundRect(x, (canvas.height - h) / 2, w * 0.6, h, 3)
                      : ctx.rect(x, (canvas.height - h) / 2, w * 0.6, h);
        ctx.fill();
      }
      rafId = requestAnimationFrame(loop);
    };
    loop();
  } catch (_) { /* visualizer is optional */ }
}

function stopVisualizer() {
  cancelAnimationFrame(rafId);
  micStream && micStream.getTracks().forEach((t) => t.stop());
  audioCtx && audioCtx.close();
  micStream = audioCtx = null;
  drawIdle();
}

/* ---------- toolbar ---------- */
$("#btnCopy").onclick = async () => {
  if (!editor.value) return toast("Nothing to copy", true);
  await navigator.clipboard.writeText(editor.value);
  toast("Copied to clipboard ✓");
};
$("#btnClear").onclick = () => {
  if (!editor.value || confirm("Clear all text?")) { editor.value = ""; updateStats(); }
};
$("#btnClean").onclick = () => {
  editor.value = editor.value
    .replace(/[ \t]+/g, " ")
    .replace(/ +([.,!?;:])/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/(^|[.!?]\s+)([a-z])/g, (m, p, c) => p + c.toUpperCase())
    .trim();
  updateStats();
  toast("Text tidied ✨");
};
$("#btnUpload").onclick = () => $("#fileInput").click();
$("#fileInput").onchange = async (e) => {
  const f = e.target.files[0];
  if (!f) return;
  editor.value += (editor.value ? "\n\n" : "") + (await f.text());
  if ($("#docTitle").value === "My Document") $("#docTitle").value = f.name.replace(/\.\w+$/, "");
  updateStats();
  toast(`Imported ${f.name}`);
  e.target.value = "";
};

/* ---------- export options ---------- */
$$(".fmt").forEach((b) =>
  b.addEventListener("click", () => {
    $$(".fmt").forEach((x) => x.classList.remove("active"));
    b.classList.add("active");
    state.format = b.dataset.fmt;
    $("#fmtLabel").textContent = state.format.toUpperCase();
  })
);
$$("#align button").forEach((b) =>
  b.addEventListener("click", () => {
    $$("#align button").forEach((x) => x.classList.remove("active"));
    b.classList.add("active");
    state.align = b.dataset.al;
  })
);
$("#fontSize").oninput = (e) => ($("#fsOut").textContent = `${e.target.value} pt`);

/* ---------- convert ---------- */
const history = JSON.parse(localStorage.getItem("vocalis-history") || "[]");
function renderHistory() {
  const ul = $("#historyList");
  ul.innerHTML = history.length
    ? history.map((h) => `<li><span>${h.name.replace(/</g, "&lt;")}</span><span class="tag">${h.fmt}</span></li>`).join("")
    : '<li class="empty">Nothing yet</li>';
}
renderHistory();

$("#convertBtn").onclick = async () => {
  if (state.recording) stopRecording();
  const text = editor.value.trim();
  if (!text) return toast("Write or dictate something first", true);

  const btn = $("#convertBtn");
  btn.classList.add("loading");
  btn.querySelector(".btn-label").textContent = "Creating…";
  try {
    const res = await fetch("/convert", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        title: $("#docTitle").value,
        author: $("#author").value,
        format: state.format,
        fontSize: +$("#fontSize").value,
        align: state.align,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Conversion failed");
    }
    const blob = await res.blob();
    const cd = res.headers.get("Content-Disposition") || "";
    const name = (cd.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i) || [])[1] || `document.${state.format}`;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = decodeURIComponent(name);
    a.click();
    URL.revokeObjectURL(a.href);

    history.unshift({ name: decodeURIComponent(name), fmt: state.format.toUpperCase() });
    history.splice(8);
    localStorage.setItem("vocalis-history", JSON.stringify(history));
    renderHistory();
    toast(`Downloaded ${decodeURIComponent(name)} 🎉`);
  } catch (e) {
    toast(e.message, true);
  } finally {
    btn.classList.remove("loading");
    btn.querySelector(".btn-label").innerHTML = `Download <span id="fmtLabel">${state.format.toUpperCase()}</span>`;
  }
};

/* keyboard shortcut: Ctrl/Cmd + S downloads */
document.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") { e.preventDefault(); $("#convertBtn").click(); }
});
