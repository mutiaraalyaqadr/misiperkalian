const lessons = [
  {
    a: 16,
    b: 4,
    p: 10,
    r: 6,
    intro: "Kita hitung 16 × 4 dengan memecah 16 menjadi 10 + 6.",
  },
  {
    a: 11,
    b: 12,
    p: 10,
    r: 1,
    intro: "Kita hitung 11 × 12 dengan memecah 11 menjadi 10 + 1.",
  },
  {
    a: 23,
    b: 3,
    p: 20,
    r: 3,
    intro: "Kita hitung 23 × 3 dengan memecah 23 menjadi 20 + 3.",
  },
];
const sets = [
  [
    { a: 13, b: 3 },
    { a: 17, b: 4 },
    { a: 18, b: 5 },
    { a: 14, b: 6 },
    { a: 16, b: 4 },
  ],
  [
    { a: 11, b: 12 },
    { a: 12, b: 13 },
    { a: 14, b: 11 },
    { a: 15, b: 12 },
    { a: 16, b: 11 },
  ],
  [
    { a: 24, b: 3 },
    { a: 17, b: 6 },
    { a: 12, b: 14 },
    { a: 19, b: 4 },
    { a: 23, b: 5 },
    { a: 13, b: 12 },
    { a: 18, b: 7 },
    { a: 15, b: 15 },
    { a: 26, b: 3 },
    { a: 14, b: 16 },
  ],
];
const $ = (id) => document.getElementById(id);
let mode = "learn",
  level = 0,
  idx = 0,
  q = null,
  coins = +(localStorage.getItem("mqCoins") || 0),
  streak = 0,
  correct = 0,
  earned = 0,
  hintUsed = false,
  answered = false,
  unlocked = +(localStorage.getItem("mqUnlocked") || 0);

// Sound effects dibuat dengan Web Audio API, jadi tidak perlu file audio tambahan.
let soundOn = localStorage.getItem("mqSound") !== "off";
let audioCtx = null,
  bgmTimer = null,
  bgmStep = 0;
function getAudio() {
  if (!audioCtx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) audioCtx = new AC();
  }
  if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}
function tone(freq, duration = 0.12, type = "sine", volume = 0.035, delay = 0) {
  if (!soundOn) return;
  const ctx = getAudio();
  if (!ctx) return;
  const osc = ctx.createOscillator(),
    gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
  gain.gain.setValueAtTime(0.0001, ctx.currentTime + delay);
  gain.gain.exponentialRampToValueAtTime(
    volume,
    ctx.currentTime + delay + 0.015,
  );
  gain.gain.exponentialRampToValueAtTime(
    0.0001,
    ctx.currentTime + delay + duration,
  );
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(ctx.currentTime + delay);
  osc.stop(ctx.currentTime + delay + duration + 0.02);
}
function sfx(name) {
  if (!soundOn) return;
  if (name === "click") {
    tone(520, 0.055, "square", 0.018);
  }
  if (name === "correct") {
    tone(523, 0.12, "triangle", 0.045);
    tone(659, 0.12, "triangle", 0.045, 0.1);
    tone(784, 0.2, "triangle", 0.05, 0.2);
  }
  if (name === "wrong") {
    tone(220, 0.17, "sawtooth", 0.025);
    tone(165, 0.22, "sawtooth", 0.022, 0.12);
  }
  if (name === "hint") {
    tone(660, 0.1, "sine", 0.03);
    tone(880, 0.14, "sine", 0.03, 0.09);
  }
  if (name === "level") {
    tone(523, 0.12, "triangle", 0.035);
    tone(659, 0.12, "triangle", 0.035, 0.1);
    tone(784, 0.12, "triangle", 0.035, 0.2);
    tone(1046, 0.28, "triangle", 0.04, 0.3);
  }
}
const bgmNotes = [
  261.63, 329.63, 392, 329.63, 293.66, 349.23, 440, 349.23, 261.63, 329.63, 392,
  523.25, 440, 392, 329.63, 293.66,
];
function startBgm() {
  if (!soundOn || bgmTimer) return;
  const playNote = () => {
    if (!soundOn) return;
    const f = bgmNotes[bgmStep % bgmNotes.length];
    bgmStep++;
    tone(f, 0.27, "triangle", 0.05);
    if (bgmStep % 4 === 0) tone(f / 2, 0.32, "sine", 0.035);
  };
  playNote();
  bgmTimer = setInterval(playNote, 360);
}
function stopBgm() {
  if (bgmTimer) {
    clearInterval(bgmTimer);
    bgmTimer = null;
  }
}
function updateSoundButton() {
  const btn = $("soundToggle");
  if (!btn) return;
  btn.textContent = soundOn ? "🔊 SOUND ON" : "🔇 SOUND OFF";
  btn.setAttribute("aria-pressed", String(soundOn));
}
$("soundToggle").addEventListener("click", () => {
  soundOn = !soundOn;
  localStorage.setItem("mqSound", soundOn ? "on" : "off");
  if (soundOn) {
    getAudio();
    sfx("click");
    startBgm();
  } else stopBgm();
  updateSoundButton();
});
// Audio begins after the first user interaction because browsers block autoplay.
document.addEventListener(
  "pointerdown",
  () => {
    if (soundOn) {
      getAudio();
      startBgm();
    }
  },
  { once: true },
);

function updateStats() {
  $("coins").textContent = coins;
  $("streak").textContent = streak;
  localStorage.setItem("mqCoins", coins);
}
function updateMap() {
  document.querySelectorAll(".mission-card").forEach((b, i) => {
    b.classList.toggle("chosen", i === level);
    b.disabled = i > unlocked;
    let lock = b.querySelector(".lock");
    lock.textContent = i < unlocked ? "✓" : i === unlocked ? "●" : "🔒";
    lock.classList.toggle("unlocked", i <= unlocked);
  });
  $("levelNumber").textContent = String(level + 1).padStart(2, "0");
}
function renderLesson() {
  let l = lessons[level],
    a = l.p * l.b,
    b = l.r * l.b;
  $("lessonIntro").textContent = l.intro;
  $("wholeA").textContent = l.a;
  $("wholeB").textContent = l.b;
  $("splitExplain").textContent = `${l.a} = ${l.p} + ${l.r}`;
  $("partA").textContent = $("partA2").textContent = l.p;
  $("partB").textContent = $("partB2").textContent = l.r;
  $("factorA").textContent = $("factorB").textContent = l.b;
  $("resultA").textContent = a;
  $("resultB").textContent = b;
  $("sumEquation").textContent = `${a} + ${b} = ${a + b}`;
  $("finalEquation").textContent = `${l.a} × ${l.b} = ${l.a * l.b}`;
  $("modeEyebrow").textContent = `QUEST 0${level + 1} / LEARN MODE`;
  $("panelTitle").textContent =
    level === 0
      ? "Belajar strateginya"
      : level === 1
        ? "Perkalian belasan"
        : "Tantangan perkalian";
}
function setMode(m) {
  sfx("click");
  mode = m;
  document
    .querySelectorAll(".mode-tab")
    .forEach((b) => b.classList.toggle("active", b.dataset.mode === m));
  $("learnPanel").classList.toggle("hidden", m !== "learn");
  $("questionPanel").classList.toggle("hidden", m === "learn");
  $("completePanel").classList.add("hidden");
  $("modeEyebrow").textContent =
    `QUEST 0${level + 1} / ${m.toUpperCase()} MODE`;
  if (m === "learn") {
    renderLesson();
  } else startRound();
}
function startRound() {
  idx = 0;
  correct = 0;
  earned = 0;
  streak = 0;
  $("questionPanel").classList.remove("hidden");
  $("completePanel").classList.add("hidden");
  nextQ();
}
function nextQ() {
  const arr = sets[level];
  q =
    mode === "boss"
      ? {
          a: Math.floor(Math.random() * 16) + 11,
          b: Math.floor(Math.random() * 9) + 2,
        }
      : arr[idx % arr.length];
  hintUsed = false;
  answered = false;
  $("numA").textContent = q.a;
  $("numB").textContent = q.b;
  $("feedback").className = "feedback";
  $("feedback").textContent =
    "💡 Coba pecah angka pertama menjadi puluhan dan satuan.";
  $("hintText").classList.add("hidden");
  $("workedSteps").classList.add("hidden");
  $("nextQuestion").classList.add("hidden");
  $("showSteps").classList.remove("hidden");
  $("answerInput").disabled = false;
  $("answerInput").value = "";
  $("answerInput").focus();
  $("fightLabel").textContent = mode === "boss" ? "BOSS FIGHT" : "SLIME BATTLE";
  $("fightTitle").textContent =
    mode === "boss" ? "Boss perkalian muncul!" : "Serang dengan jawaban benar!";
  $("fightSlime").textContent = mode === "boss" ? "ಠ益ಠ" : "•ᴗ•";
  $("hpBar").style.width = "100%";
  $("questionCount");
}
$("answerForm").addEventListener("submit", (e) => {
  e.preventDefault();
  if (answered || $("answerInput").value === "") return;
  if (Number($("answerInput").value) === q.a * q.b) {
    sfx("correct");
    answered = true;
    correct++;
    streak++;
    let reward = hintUsed ? 1 : 2;
    coins += reward;
    earned += reward;
    updateStats();
    $("feedback").className = "feedback good";
    $("feedback").textContent =
      `✓ Benar! +${reward} koin. Monster terkena serangan!`;
    $("fightSlime").textContent = "★ᴗ★";
    $("hpBar").style.width = "0%";
    $("answerInput").disabled = true;
    $("nextQuestion").classList.remove("hidden");
    $("showSteps").classList.add("hidden");
  } else {
    sfx("wrong");
    streak = 0;
    updateStats();
    $("feedback").className = "feedback bad";
    $("feedback").textContent =
      "Belum tepat, coba lagi ya. Pecah angka pertama menjadi puluhan dan satuan.";
    $("answerInput").select();
  }
});
$("hintButton").addEventListener("click", () => {
  sfx("hint");
  hintUsed = true;
  let p = Math.floor(q.a / 10) * 10,
    r = q.a % 10;
  $("hintText").innerHTML =
    `Pecah <b>${q.a}</b> menjadi <b>${p} + ${r}</b>.<br>${p} × ${q.b} = ${p * q.b}. Sekarang hitung ${r} × ${q.b}, lalu jumlahkan.`;
  $("hintText").classList.remove("hidden");
});
$("showSteps").addEventListener("click", () => {
  let p = Math.floor(q.a / 10) * 10,
    r = q.a % 10;
  $("workedSteps").innerHTML =
    `<b>Langkah 1:</b> ${q.a} = ${p} + ${r}<br><b>Langkah 2:</b> ${p} × ${q.b} = ${p * q.b}; ${r} × ${q.b} = ${r * q.b}<br><b>Langkah 3:</b> ${p * q.b} + ${r * q.b} = <b>${q.a * q.b}</b>`;
  $("workedSteps").classList.toggle("hidden");
});
$("nextQuestion").addEventListener("click", () => {
  idx++;
  if (idx >= (mode === "boss" ? 10 : 5)) finish();
  else nextQ();
});
function finish() {
  sfx("level");
  $("questionPanel").classList.add("hidden");
  $("completePanel").classList.remove("hidden");
  $("finalCorrect").textContent = `${correct}/${mode === "boss" ? 10 : 5}`;
  $("finalCoins").textContent = earned;
  $("completionMessage").textContent =
    correct === (mode === "boss" ? 10 : 5)
      ? "Sempurna! Semua soal kamu jawab benar."
      : "Bagus sudah mencoba! Ulangi lagi untuk meningkatkan hasilmu.";
  if (correct >= (mode === "boss" ? 7 : 3) && level < 2) {
    unlocked = Math.max(unlocked, level + 1);
    localStorage.setItem("mqUnlocked", unlocked);
  }
  updateMap();
}
document
  .querySelectorAll(".mode-tab")
  .forEach((b) => b.addEventListener("click", () => setMode(b.dataset.mode)));
document.querySelectorAll(".mission-card").forEach((b) =>
  b.addEventListener("click", () => {
    sfx("click");
    let n = +b.dataset.level;
    if (n > unlocked) return;
    level = n;
    setMode("learn");
    updateMap();
  }),
);
$("toPractice").addEventListener("click", () => setMode("practice"));
$("replayButton").addEventListener("click", () =>
  setMode(mode === "learn" ? "practice" : mode),
);
$("startBtn").addEventListener("click", () => {
  $("playArea").scrollIntoView({ behavior: "smooth", block: "start" });
  setMode("learn");
});
updateStats();
updateMap();
renderLesson();
updateSoundButton();

// Whiteboard: pointer events support mouse, touch, and stylus.
(() => {
  const canvas = $("whiteboardCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const colorInput = $("penColor");
  const sizeInput = $("penSize");
  const eraserButton = $("eraserBtn");
  let drawing = false, erasing = false, previous = null;

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    const old = document.createElement("canvas");
    old.width = canvas.width; old.height = canvas.height;
    if (old.width && old.height) old.getContext("2d").drawImage(canvas, 0, 0);
    canvas.width = Math.max(1, Math.round(rect.width * ratio));
    canvas.height = Math.max(1, Math.round(rect.height * ratio));
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    if (old.width && old.height) ctx.drawImage(old, 0, 0, old.width, old.height, 0, 0, rect.width, rect.height);
  }
  function pointFromEvent(event) {
    const rect = canvas.getBoundingClientRect();
    return { x:event.clientX-rect.left, y:event.clientY-rect.top };
  }
  function beginStroke(event) {
    event.preventDefault(); drawing = true; previous = pointFromEvent(event);
    if (canvas.setPointerCapture) canvas.setPointerCapture(event.pointerId);
    ctx.beginPath(); ctx.arc(previous.x, previous.y, Math.max(1, Number(sizeInput.value)/2), 0, Math.PI*2);
    ctx.fillStyle = erasing ? "#ffffff" : colorInput.value; ctx.fill();
  }
  function drawStroke(event) {
    if (!drawing) return;
    event.preventDefault(); const current = pointFromEvent(event);
    ctx.beginPath(); ctx.moveTo(previous.x, previous.y); ctx.lineTo(current.x, current.y);
    ctx.strokeStyle = erasing ? "#ffffff" : colorInput.value;
    ctx.lineWidth = Number(sizeInput.value) * (erasing ? 3 : 1);
    ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.stroke(); previous = current;
  }
  function endStroke() { drawing = false; previous = null; }
  canvas.addEventListener("pointerdown", beginStroke);
  canvas.addEventListener("pointermove", drawStroke);
  canvas.addEventListener("pointerup", endStroke);
  canvas.addEventListener("pointercancel", endStroke);
  canvas.addEventListener("lostpointercapture", endStroke);
  eraserButton.addEventListener("click", () => {
    erasing = !erasing;
    eraserButton.setAttribute("aria-pressed", String(erasing));
    eraserButton.textContent = erasing ? "Pakai pena" : "Penghapus";
    canvas.style.cursor = erasing ? "cell" : "crosshair";
  });
  $("clearBoard").addEventListener("click", () => ctx.clearRect(0, 0, canvas.width, canvas.height));
  let resizeFrame;
  window.addEventListener("resize", () => {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(resizeCanvas);
  });
  resizeCanvas();
})();
