/* ============================================================
   THE MIND — main.js
   Babylon.js Interactive Cosmic Horror Experience
   ============================================================ */

'use strict';

/* ── Globals ─────────────────────────────────────────────── */
const canvas        = document.getElementById('renderCanvas');
const cursorCanvas  = document.getElementById('cursorCanvas');
const cCtx          = cursorCanvas.getContext('2d');

let engine, scene, camera, glowLayer, pipeline;
let audioCtx        = null;
let sanity          = 100;
let elapsed         = 0;
let mindBroken      = false;
let frameCount      = 0;
let lastFPS         = 60;
let mouseX          = 0;
let mouseY          = 0;
let prevMouseX      = 0;
let prevMouseY      = 0;
let dragonWalkFrame = 0;
let dragonFrameTick = 0;
let userName        = 'STRANGER';
let chaosOverride   = 0;
let constellationMode = false;
let constellationParticles = [];
let secretBuffer    = '';
let shapeList       = [];
let ripples         = [];
let screenShakeAmt  = 0;
let cameraBaseAlpha = -Math.PI / 2;
let cameraBaseBeta  = Math.PI / 3;

const MIND_BREAK_TIME = 120;
const SECRET_CODE     = 'VOID';

const WHISPERS = [
  'YOU ARE STILL HERE',
  'STOP LOOKING',
  'IT KNOWS YOUR NAME',
  'LEAVE NOW',
  'TOO LATE',
  'IT SEES YOU',
  'YOU CANNOT LEAVE',
  'WHY ARE YOU SMILING',
  'BLINK',
  'DO NOT BLINK',
  'IT IS BEHIND YOU',
  'YOU WERE NEVER ALONE',
  'THE WALLS ARE BREATHING',
  'SOMETHING IS LISTENING',
];

/* ── Audio Context ───────────────────────────────────────── */
function getAudioCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

/* ── Sound Synthesis ─────────────────────────────────────── */
function playScream(intensity) {
  intensity = intensity || 1.0;
  try {
    const ctx   = getAudioCtx();
    const gain  = ctx.createGain();
    const osc1  = ctx.createOscillator();
    const osc2  = ctx.createOscillator();
    const dist  = ctx.createWaveShaper();
    const curve = new Float32Array(256);
    for (let i = 0; i < 256; i++) {
      const x = (i * 2) / 256 - 1;
      curve[i] = ((Math.PI + 300) * x) / (Math.PI + 300 * Math.abs(x));
    }
    dist.curve      = curve;
    osc1.type       = 'sawtooth';
    osc2.type       = 'square';
    osc1.frequency.setValueAtTime(180 * intensity, ctx.currentTime);
    osc1.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.6);
    osc2.frequency.setValueAtTime(360 * intensity, ctx.currentTime);
    osc2.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.6);
    gain.gain.setValueAtTime(0.35, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.7);
    osc1.connect(dist); osc2.connect(dist);
    dist.connect(gain); gain.connect(ctx.destination);
    osc1.start(); osc2.start();
    osc1.stop(ctx.currentTime + 0.7);
    osc2.stop(ctx.currentTime + 0.7);
  } catch (_) {}
}

function playDrip() {
  try {
    const ctx  = getAudioCtx();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type   = 'sine';
    osc.frequency.setValueAtTime(900, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.22, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + 0.18);
  } catch (_) {}
}

function playLightning() {
  try {
    const ctx    = getAudioCtx();
    const noise  = ctx.createOscillator();
    const gain   = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    noise.type   = 'sawtooth';
    noise.frequency.setValueAtTime(60, ctx.currentTime);
    filter.type            = 'bandpass';
    filter.frequency.value = 800;
    filter.Q.value         = 0.5;
    gain.gain.setValueAtTime(0.5, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    noise.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
    noise.start(); noise.stop(ctx.currentTime + 0.4);
  } catch (_) {}
}

function playHeartbeat() {
  try {
    const ctx    = getAudioCtx();
    const filter = ctx.createBiquadFilter();
    filter.type            = 'lowpass';
    filter.frequency.value = 120;
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type   = 'sine';
    osc.frequency.setValueAtTime(55, ctx.currentTime);
    gain.gain.setValueAtTime(0.0,  ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.4,   ctx.currentTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    osc.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + 0.3);
    const osc2  = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type   = 'sine';
    osc2.frequency.setValueAtTime(45, ctx.currentTime + 0.22);
    gain2.gain.setValueAtTime(0.0,  ctx.currentTime + 0.22);
    gain2.gain.linearRampToValueAtTime(0.3,   ctx.currentTime + 0.27);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
    osc2.connect(filter); filter.connect(gain2); gain2.connect(ctx.destination);
    osc2.start(ctx.currentTime + 0.22);
    osc2.stop(ctx.currentTime + 0.5);
  } catch (_) {}
}

function playWhisper() {
  try {
    const ctx  = getAudioCtx();
    const gain = ctx.createGain();
    const osc  = ctx.createOscillator();
    const filt = ctx.createBiquadFilter();
    osc.type   = 'sine';
    filt.type  = 'highpass';
    filt.frequency.value = 2000;
    osc.frequency.setValueAtTime(3200, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(2400, ctx.currentTime + 1.2);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.setValueAtTime(0.0,  ctx.currentTime + 1.2);
    osc.connect(filt); filt.connect(gain); gain.connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + 1.3);
  } catch (_) {}
}

function playMindBreak() {
  try {
    const ctx = getAudioCtx();
    for (let i = 0; i < 5; i++) {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type   = 'sawtooth';
      osc.frequency.setValueAtTime(100 + i * 80, ctx.currentTime + i * 0.12);
      osc.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + i * 0.12 + 1.0);
      gain.gain.setValueAtTime(0.3, ctx.currentTime + i * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 1.1);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.12);
      osc.stop(ctx.currentTime + i * 0.12 + 1.2);
    }
  } catch (_) {}
}

function playRipple() {
  try {
    const ctx  = getAudioCtx();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type   = 'sine';
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.5);
    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.55);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + 0.6);
  } catch (_) {}
}

function playSecretCode() {
  try {
    const ctx = getAudioCtx();
    const notes = [200, 400, 300, 600, 100, 800];
    notes.forEach((freq, i) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type   = 'sawtooth';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.1);
      gain.gain.setValueAtTime(0.25, ctx.currentTime + i * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.1 + 0.15);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.1);
      osc.stop(ctx.currentTime + i * 0.1 + 0.2);
    });
  } catch (_) {}
}

function playSpawn() {
  try {
    const ctx  = getAudioCtx();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type   = 'triangle';
    osc.frequency.setValueAtTime(200, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + 0.4);
  } catch (_) {}
}

function playConstellation() {
  try {
    const ctx = getAudioCtx();
    for (let i = 0; i < 3; i++) {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type   = 'sine';
      osc.frequency.setValueAtTime(300 + i * 200, ctx.currentTime + i * 0.15);
      osc.frequency.linearRampToValueAtTime(800 + i * 100, ctx.currentTime + i * 0.15 + 0.4);
      gain.gain.setValueAtTime(0.15, ctx.currentTime + i * 0.15);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.15 + 0.5);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.15);
      osc.stop(ctx.currentTime + i * 0.15 + 0.6);
    }
  } catch (_) {}
}

/* ── Cursor Canvas Resize ────────────────────────────────── */
function resizeCursorCanvas() {
  cursorCanvas.width  = window.innerWidth;
  cursorCanvas.height = window.innerHeight;
}
resizeCursorCanvas();
window.addEventListener('resize', resizeCursorCanvas);

/* ── Dragon Cursor ───────────────────────────────────────── */
const DRAGON_FRAMES = [
  (x, y, col, scale) => {
    cCtx.save();
    cCtx.translate(x, y);
    cCtx.scale(scale, scale);
    cCtx.strokeStyle = col;
    cCtx.lineWidth   = 1.5;
    cCtx.shadowColor = col;
    cCtx.shadowBlur  = 8;
    // body
    cCtx.beginPath();
    cCtx.moveTo(0, -6); cCtx.lineTo(14, -2); cCtx.lineTo(18, 2);
    cCtx.lineTo(10, 6); cCtx.lineTo(0, 4);   cCtx.lineTo(-4, -2);
    cCtx.closePath(); cCtx.stroke();
    // head
    cCtx.beginPath();
    cCtx.moveTo(14, -2); cCtx.lineTo(24, -6); cCtx.lineTo(28, -2);
    cCtx.lineTo(24, 2);  cCtx.lineTo(18, 2);  cCtx.stroke();
    // eye
    cCtx.beginPath(); cCtx.arc(23, -3, 1.5, 0, Math.PI * 2); cCtx.stroke();
    // jaw
    cCtx.beginPath(); cCtx.moveTo(24, -2); cCtx.lineTo(30, 0); cCtx.stroke();
    // wing
    cCtx.beginPath();
    cCtx.moveTo(6, -4); cCtx.lineTo(4, -16); cCtx.lineTo(14, -10);
    cCtx.lineTo(10, -2); cCtx.stroke();
    // legs down
    cCtx.beginPath();
    cCtx.moveTo(4,  4); cCtx.lineTo(2,  12); cCtx.lineTo(0,  14);
    cCtx.moveTo(10, 5); cCtx.lineTo(10, 13); cCtx.lineTo(8,  16);
    cCtx.stroke();
    // tail
    cCtx.beginPath();
    cCtx.moveTo(-4, -2); cCtx.lineTo(-12, -4);
    cCtx.lineTo(-18, 0); cCtx.lineTo(-22, -2); cCtx.stroke();
    cCtx.restore();
  },
  (x, y, col, scale) => {
    cCtx.save();
    cCtx.translate(x, y);
    cCtx.scale(scale, scale);
    cCtx.strokeStyle = col;
    cCtx.lineWidth   = 1.5;
    cCtx.shadowColor = col;
    cCtx.shadowBlur  = 8;
    cCtx.beginPath();
    cCtx.moveTo(0, -6); cCtx.lineTo(14, -2); cCtx.lineTo(18, 2);
    cCtx.lineTo(10, 6); cCtx.lineTo(0, 4);   cCtx.lineTo(-4, -2);
    cCtx.closePath(); cCtx.stroke();
    cCtx.beginPath();
    cCtx.moveTo(14, -2); cCtx.lineTo(24, -6); cCtx.lineTo(28, -2);
    cCtx.lineTo(24, 2);  cCtx.lineTo(18, 2);  cCtx.stroke();
    cCtx.beginPath(); cCtx.arc(23, -3, 1.5, 0, Math.PI * 2); cCtx.stroke();
    cCtx.beginPath(); cCtx.moveTo(24, -2); cCtx.lineTo(30, 0); cCtx.stroke();
    // wing up
    cCtx.beginPath();
    cCtx.moveTo(6, -4); cCtx.lineTo(2, -18); cCtx.lineTo(14, -12);
    cCtx.lineTo(10, -2); cCtx.stroke();
    // legs up
    cCtx.beginPath();
    cCtx.moveTo(4,  4); cCtx.lineTo(4,  8);  cCtx.lineTo(6,  6);
    cCtx.moveTo(10, 5); cCtx.lineTo(12, 9);  cCtx.lineTo(14, 8);
    cCtx.stroke();
    cCtx.beginPath();
    cCtx.moveTo(-4, -2); cCtx.lineTo(-12, 0);
    cCtx.lineTo(-18, -4); cCtx.lineTo(-22, 0); cCtx.stroke();
    cCtx.restore();
  },
];

function dragonColor() {
  const t = Date.now() / 1000;
  const r = Math.floor(128 + 127 * Math.sin(t * 0.7));
  const g = Math.floor(80  + 80  * Math.sin(t * 0.4 + 2));
  const b = Math.floor(200 + 55  * Math.sin(t * 0.9 + 4));
  return `rgb(${r},${g},${b})`;
}

function drawDragon() {
  cCtx.clearRect(0, 0, cursorCanvas.width, cursorCanvas.height);
  const dx    = mouseX - prevMouseX;
  const speed = Math.abs(dx) + Math.abs(mouseY - prevMouseY);
  const flipX = dx < -1 ? -1 : 1;

  dragonFrameTick++;
  if (dragonFrameTick > (speed > 3 ? 6 : 12)) {
    dragonWalkFrame = (dragonWalkFrame + 1) % 2;
    dragonFrameTick = 0;
  }

  const col = dragonColor();

  cCtx.save();
  if (flipX === -1) {
    cCtx.translate(mouseX * 2, 0);
    cCtx.scale(-1, 1);
  }
  DRAGON_FRAMES[dragonWalkFrame](
    flipX === -1 ? cursorCanvas.width - mouseX : mouseX,
    mouseY, col, 1.1
  );
  cCtx.restore();

  // draw ripples on cursor canvas
  drawRipples();
}

/* ── Squiggle Path ───────────────────────────────────────── */
function squigglePath(x1, y1, x2, y2, amp, freq, t) {
  t = t || 0;
  const dx    = x2 - x1;
  const dy    = y2 - y1;
  const len   = Math.sqrt(dx * dx + dy * dy);
  const steps = Math.max(8, Math.floor(len / 8));
  let d = 'M ' + x1 + ' ' + y1;
  for (let i = 1; i <= steps; i++) {
    const p    = i / steps;
    const ox   = x1 + dx * p;
    const oy   = y1 + dy * p;
    const wave = Math.sin(p * freq * Math.PI * 2 + t) * amp;
    const px   = ox - (dy / len) * wave;
    const py   = oy + (dx / len) * wave;
    d += ' L ' + px.toFixed(2) + ' ' + py.toFixed(2);
  }
  return d;
}

/* ── Ripples ─────────────────────────────────────────────── */
function spawnRipple(x, y) {
  const hue = Math.random() * 360;
  ripples.push({ x, y, r: 0, maxR: 120 + Math.random() * 80, alpha: 1.0, hue });
  playRipple();
}

function drawRipples() {
  ripples = ripples.filter(rp => rp.alpha > 0.01);
  ripples.forEach(rp => {
    rp.r     += 3.5;
    rp.alpha -= 0.018;
    const a = Math.max(0, rp.alpha);
    cCtx.beginPath();
    cCtx.arc(rp.x, rp.y, rp.r, 0, Math.PI * 2);
    cCtx.strokeStyle = `hsla(${rp.hue}, 100%, 65%, ${a})`;
    cCtx.lineWidth   = 2.5;
    cCtx.shadowColor = `hsla(${rp.hue}, 100%, 65%, ${a})`;
    cCtx.shadowBlur  = 12;
    cCtx.stroke();
    // second inner ring
    if (rp.r > 20) {
      cCtx.beginPath();
      cCtx.arc(rp.x, rp.y, rp.r * 0.6, 0, Math.PI * 2);
      cCtx.strokeStyle = `hsla(${(rp.hue + 60) % 360}, 100%, 65%, ${a * 0.5})`;
      cCtx.lineWidth   = 1.5;
      cCtx.stroke();
    }
  });
}

/* ── UI Update ───────────────────────────────────────────── */
let whisperTimeout = null;
let heartbeatTimer = 0;
let whisperTimer   = 0;
let dripTimer      = 0;
let lightningTimer = 0;
let uiT            = 0;

function updateUI(dt) {
  uiT += dt;

  // chaos override from slider
  const sliderEl = document.getElementById('chaos-slider');
  if (sliderEl) {
    chaosOverride = parseInt(sliderEl.value, 10) / 100;
  }

  if (!mindBroken) {
    sanity   = Math.max(0, sanity - dt * (100 / MIND_BREAK_TIME));
    elapsed += dt;
  }

  // effective insanity = max of timer-driven and manual chaos
  const insanity = Math.max(1 - sanity / 100, chaosOverride);

  // heartbeat
  heartbeatTimer -= dt;
  if (heartbeatTimer <= 0) {
    playHeartbeat();
    const bpm      = 60 + insanity * 80;
    heartbeatTimer = 60 / bpm;
  }

  // whisper
  whisperTimer -= dt;
  if (whisperTimer <= 0) {
    whisperTimer = 8 + Math.random() * 10 - insanity * 6;
    whisperTimer = Math.max(2, whisperTimer);
    triggerWhisper(insanity);
  }

  // drip
  dripTimer -= dt;
  if (dripTimer <= 0) {
    dripTimer = 3 + Math.random() * 4 - insanity * 2;
    dripTimer = Math.max(0.5, dripTimer);
    playDrip();
  }

  // lightning sound
  lightningTimer -= dt;
  if (lightningTimer <= 0) {
    lightningTimer = 5 + Math.random() * 8 - insanity * 4;
    lightningTimer = Math.max(0.4, lightningTimer);
    playLightning();
  }

  // screen shake decay
  if (screenShakeAmt > 0) {
    screenShakeAmt = Math.max(0, screenShakeAmt - dt * 4);
  }

  // random screen shake events
  if (Math.random() < dt * (0.1 + insanity * 0.4)) {
    screenShakeAmt = 0.3 + insanity * 1.2;
  }

  // sanity meter
  const sRatio  = sanity / 100;
  const trackEl = document.getElementById('sanity-track');
  const fillEl  = document.getElementById('sanity-fill');
  const sqEl    = document.getElementById('sanity-squiggle');
  if (trackEl && fillEl && sqEl) {
    trackEl.setAttribute('d', squigglePath(10, 20, 210, 20, 3, 6, uiT * 1.5));
    fillEl.setAttribute('d',  squigglePath(10, 20, 10 + 200 * sRatio, 20, 4 + (1 - sRatio) * 6, 8, uiT * 2.5));
    sqEl.setAttribute('d',    squigglePath(10, 20, 210, 20, 6, 12, uiT * 3));
    const col = sRatio > 0.6
      ? '#00ffaa'
      : sRatio > 0.3 ? '#ffaa00' : '#ff003c';
    fillEl.setAttribute('stroke', col);
    sqEl.setAttribute('stroke',   col);
  }

  // title squiggles
  const tTop = document.getElementById('title-squiggle-top');
  const tBot = document.getElementById('title-squiggle-bot');
  if (tTop) tTop.setAttribute('d', squigglePath(0, 8,  400, 8,  4, 7, uiT * 1.2));
  if (tBot) tBot.setAttribute('d', squigglePath(0, 72, 400, 72, 4, 7, uiT * 1.8));

  // timer
  const timerText = document.getElementById('timer-text');
  const timerSq   = document.getElementById('timer-squiggle');
  if (timerText) {
    const m = String(Math.floor(elapsed / 60)).padStart(2, '0');
    const s = String(Math.floor(elapsed % 60)).padStart(2, '0');
    timerText.textContent = m + ':' + s;
  }
  if (timerSq) timerSq.setAttribute('d', squigglePath(0, 32, 180, 32, 3, 6, uiT * 2));

  // chaos squiggle
  const chaosSq = document.getElementById('chaos-squiggle');
  if (chaosSq) chaosSq.setAttribute('d', squigglePath(0, 8, 220, 8, 5 + chaosOverride * 10, 8, uiT * 3));

  // mind break
  if (sanity <= 0 && !mindBroken) triggerMindBreak();
}

function triggerWhisper(insanity) {
  insanity = insanity || 0;
  const el = document.getElementById('whisper-text');
  if (!el) return;
  el.classList.remove('visible');
  void el.offsetWidth;

  // personalised whispers when name is known
  let pool = WHISPERS.slice();
  if (userName && userName !== 'STRANGER') {
    pool.push(userName.toUpperCase() + ' CAN YOU HEAR IT');
    pool.push('WHY ARE YOU HERE ' + userName.toUpperCase());
    pool.push(userName.toUpperCase() + ' LOOK AWAY');
    pool.push('IT KNOWS YOU ' + userName.toUpperCase());
  }

  el.textContent    = pool[Math.floor(Math.random() * pool.length)];
  el.style.top      = (25 + Math.random() * 50) + '%';
  el.style.left     = (15 + Math.random() * 70) + '%';
  el.style.transform = 'translate(-50%,-50%) rotate(' + ((Math.random() - 0.5) * 10) + 'deg)';

  // scale size with insanity
  el.style.fontSize  = (16 + insanity * 18) + 'px';
  el.classList.add('visible');
  playWhisper();
  clearTimeout(whisperTimeout);
  whisperTimeout = setTimeout(() => el.classList.remove('visible'), 4000);
}

function triggerMindBreak() {
  mindBroken = true;
  playMindBreak();
  const overlay = document.getElementById('mind-break-overlay');
  if (overlay) overlay.classList.add('active');
  const bSqA = document.getElementById('break-squiggle-a');
  const bSqB = document.getElementById('break-squiggle-b');
  if (bSqA) bSqA.setAttribute('d', squigglePath(0, 40,  600, 40,  16, 10, uiT));
  if (bSqB) bSqB.setAttribute('d', squigglePath(0, 220, 600, 220, 16, 10, uiT + 2));
}

/* ── Reset ───────────────────────────────────────────────── */
function resetMind() {
  sanity        = 100;
  elapsed       = 0;
  mindBroken    = false;
  chaosOverride = 0;
  screenShakeAmt = 0;
  secretBuffer  = '';
  constellationMode = false;
  ripples       = [];
  whisperTimer  = 8;
  dripTimer     = 3;
  lightningTimer = 5;
  heartbeatTimer = 1;

  // reset slider
  const sliderEl = document.getElementById('chaos-slider');
  if (sliderEl) sliderEl.value = 0;

  // reset secret display
  const secEl = document.getElementById('secret-code-display');
  if (secEl) secEl.textContent = '';

  // hide overlay
  const overlay = document.getElementById('mind-break-overlay');
  if (overlay) overlay.classList.remove('active');

  // restore constellation shapes if needed
  if (constellationParticles.length > 0) {
    constellationParticles.forEach(p => { if (p && !p.isDisposed()) p.dispose(); });
    constellationParticles = [];
  }

  // re-show all shapes
  shapeList.forEach(s => {
    if (s.mesh) {
      s.mesh.isVisible = true;
      s.mesh.scaling.setAll(1);
      if (s.mat) s.mat.alpha = 1;
    }
  });

  // camera reset
  if (camera) {
    camera.radius = 28;
    camera.beta   = Math.PI / 3;
  }
}

/* ── Secret Code ─────────────────────────────────────────── */
function handleSecretKey(key) {
  if (mindBroken) return;
  secretBuffer += key.toUpperCase();
  if (secretBuffer.length > SECRET_CODE.length) {
    secretBuffer = secretBuffer.slice(-SECRET_CODE.length);
  }
  const secEl = document.getElementById('secret-code-display');
  if (secEl) secEl.textContent = secretBuffer;

  if (secretBuffer === SECRET_CODE) {
    secretBuffer = '';
    if (secEl) secEl.textContent = '*** VOID ACTIVATED ***';
    setTimeout(() => { if (secEl) secEl.textContent = ''; }, 3000);
    triggerVoidEvent();
  }
}

function triggerVoidEvent() {
  playSecretCode();
  // invert colours briefly
  document.body.style.filter = 'invert(1) hue-rotate(180deg)';
  setTimeout(() => { document.body.style.filter = ''; }, 8000);

  // go wild on shapes
  shapeList.forEach(s => {
    if (!s.mesh) return;
    s.voidMode = true;
    setTimeout(() => { s.voidMode = false; }, 8000);
  });

  // massive screen shake
  screenShakeAmt = 3.0;

  // flood whispers
  for (let i = 0; i < 5; i++) {
    setTimeout(() => triggerWhisper(1), i * 600);
  }
}

/* ── Constellation Mode ──────────────────────────────────── */
function toggleConstellation() {
  if (mindBroken) return;
  constellationMode = !constellationMode;
  playConstellation();

  if (constellationMode) {
    // hide shapes, spawn particles
    shapeList.forEach(s => { if (s.mesh) s.mesh.isVisible = false; });
    spawnConstellationParticles();
  } else {
    // show shapes, clear particles
    shapeList.forEach(s => { if (s.mesh) s.mesh.isVisible = true; });
    constellationParticles.forEach(p => { if (p && !p.isDisposed()) p.dispose(); });
    constellationParticles = [];
  }
}

function spawnConstellationParticles() {
  if (!scene) return;
  constellationParticles.forEach(p => { if (p && !p.isDisposed()) p.dispose(); });
  constellationParticles = [];

  for (let i = 0; i < 180; i++) {
    const star = BABYLON.MeshBuilder.CreateSphere('star' + i, { diameter: 0.12 + Math.random() * 0.2, segments: 4 }, scene);
    star.position = new BABYLON.Vector3(
      (Math.random() - 0.5) * 50,
      (Math.random() - 0.5) * 30,
      (Math.random() - 0.5) * 50
    );
    const mat         = new BABYLON.StandardMaterial('starMat' + i, scene);
    const h           = Math.random() * 360;
    mat.emissiveColor = BABYLON.Color3.FromHSV(h, 1, 1);
    star.material     = mat;
    star.isPickable   = false;
    constellationParticles.push(star);
  }

  // draw lines between nearby stars
  for (let i = 0; i < constellationParticles.length; i++) {
    for (let j = i + 1; j < constellationParticles.length; j++) {
      const a    = constellationParticles[i];
      const b    = constellationParticles[j];
      const dist = BABYLON.Vector3.Distance(a.position, b.position);
      if (dist < 8) {
        const line = BABYLON.MeshBuilder.CreateLines('line_' + i + '_' + j, {
          points: [a.position, b.position]
        }, scene);
        const h    = Math.random() * 360;
        line.color = BABYLON.Color3.FromHSV(h, 1, 1);
        line.alpha = 0.3 + Math.random() * 0.4;
        line.isPickable = false;
        constellationParticles.push(line);
      }
    }
  }
}

/* ── Shape Spawner ───────────────────────────────────────── */
function spawnShapeAt(pickInfo) {
  if (!scene || !pickInfo || !pickInfo.hit) return;
  if (constellationMode) return;

  const pos   = pickInfo.pickedPoint || BABYLON.Vector3.Zero();
  const types = ['sphere', 'box', 'torus', 'ico', 'knot'];
  const type  = types[Math.floor(Math.random() * types.length)];
  let mesh;

  switch (type) {
    case 'sphere':
      mesh = BABYLON.MeshBuilder.CreateSphere('spawned_s_' + Date.now(), { diameter: 1.5 + Math.random() * 2, segments: 10 }, scene);
      break;
    case 'box':
      mesh = BABYLON.MeshBuilder.CreateBox('spawned_b_' + Date.now(), { size: 1.5 + Math.random() * 2 }, scene);
      break;
    case 'torus':
      mesh = BABYLON.MeshBuilder.CreateTorus('spawned_t_' + Date.now(), { diameter: 2 + Math.random() * 2, thickness: 0.5, tessellation: 24 }, scene);
      break;
    case 'ico':
      mesh = BABYLON.MeshBuilder.CreateIcoSphere('spawned_i_' + Date.now(), { radius: 1 + Math.random(), subdivisions: 2 }, scene);
      break;
    case 'knot':
      mesh = BABYLON.MeshBuilder.CreateTorusKnot('spawned_k_' + Date.now(), { radius: 1.2, tube: 0.3, radialSegments: 64, tubularSegments: 10, p: 2, q: 3 }, scene);
      break;
    default:
      mesh = BABYLON.MeshBuilder.CreateSphere('spawned_d_' + Date.now(), { diameter: 1.5 }, scene);
  }

  mesh.position = pos.clone();
  mesh.position.y = Math.max(pos.y + 1, -4);

  const h           = Math.random() * 360;
  const mat         = new BABYLON.StandardMaterial('spawnedMat_' + Date.now(), scene);
  mat.emissiveColor = BABYLON.Color3.FromHSV(h, 1, 1);
  mat.diffuseColor  = BABYLON.Color3.FromHSV(h, 1, 1).scale(0.4);
  mat.backFaceCulling = false;
  mesh.material     = mat;
  mesh.isPickable   = true;

  // birth flash
  mesh.scaling.setAll(0.01);
  let growT = 0;
  const growId = setInterval(() => {
    growT += 0.08;
    const sc = Math.min(1, growT * growT * 3);
    mesh.scaling.setAll(sc);
    if (growT >= 1) clearInterval(growId);
  }, 16);

  // spawn flash light
  const fl = new BABYLON.PointLight('fl_' + Date.now(), pos.clone(), scene);
  fl.diffuse   = BABYLON.Color3.FromHSV(h, 1, 1);
  fl.intensity = 8;
  fl.range     = 15;
  setTimeout(() => fl.dispose(), 500);

  const entry = { mesh, type, mat, phase: Math.random() * Math.PI * 2, hovered: false, lastBob: 0 };

  mesh.actionManager = new BABYLON.ActionManager(scene);
  mesh.actionManager.registerAction(new BABYLON.ExecuteCodeAction(
    BABYLON.ActionManager.OnPickTrigger,
    () => { playScream(0.8 + Math.random() * 0.4); shatterShape(entry); }
  ));
  mesh.actionManager.registerAction(new BABYLON.ExecuteCodeAction(
    BABYLON.ActionManager.OnPointerOverTrigger,
    () => { entry.hovered = true; }
  ));
  mesh.actionManager.registerAction(new BABYLON.ExecuteCodeAction(
    BABYLON.ActionManager.OnPointerOutTrigger,
    () => { entry.hovered = false; }
  ));

  shapeList.push(entry);
  playSpawn();
}

/* ── Babylon Scene ───────────────────────────────────────── */
function initBabylon() {
  engine = new BABYLON.Engine(canvas, true, {
    preserveDrawingBuffer: true,
    stencil: true,
    antialias: true,
  });

  scene = new BABYLON.Scene(engine);
  scene.clearColor   = new BABYLON.Color4(0.02, 0.0, 0.03, 1.0);
  scene.ambientColor = new BABYLON.Color3(0.05, 0.0, 0.08);

  // Camera
  camera = new BABYLON.ArcRotateCamera('cam', cameraBaseAlpha, cameraBaseBeta, 28, BABYLON.Vector3.Zero(), scene);
  camera.lowerRadiusLimit = 12;
  camera.upperRadiusLimit = 45;
  camera.attachControl(canvas, true);

  // Fog
  scene.fogMode    = BABYLON.Scene.FOGMODE_EXP2;
  scene.fogDensity = 0.018;
  scene.fogColor   = new BABYLON.Color3(0.02, 0.0, 0.05);

  // Lights
  const ambient = new BABYLON.HemisphericLight('amb', new BABYLON.Vector3(0, 1, 0), scene);
  ambient.intensity   = 0.25;
  ambient.diffuse     = new BABYLON.Color3(0.3, 0.0, 0.5);
  ambient.groundColor = new BABYLON.Color3(0.0, 0.1, 0.2);

  const point1 = new BABYLON.PointLight('pt1', new BABYLON.Vector3(0,   8,  0), scene);
  point1.diffuse   = new BABYLON.Color3(0.8, 0.0, 1.0);
  point1.intensity = 1.4;
  point1.range     = 40;

  const point2 = new BABYLON.PointLight('pt2', new BABYLON.Vector3(-10, 4,  6), scene);
  point2.diffuse   = new BABYLON.Color3(0.0, 1.0, 0.6);
  point2.intensity = 0.9;
  point2.range     = 30;

  const point3 = new BABYLON.PointLight('pt3', new BABYLON.Vector3(10, -4, -6), scene);
  point3.diffuse   = new BABYLON.Color3(1.0, 0.1, 0.2);
  point3.intensity = 0.8;
  point3.range     = 28;

  buildGround(scene);
  shapeList = buildShapes(scene);
  const bolts = buildLightningBolts(scene);
  buildDroplets(scene);
  const eyes = buildEyes(scene);

  glowLayer = new BABYLON.GlowLayer('glow', scene);
  glowLayer.intensity    = 0.7;
  glowLayer.blurKernelSize = 32;

  pipeline = new BABYLON.DefaultRenderingPipeline('pp', true, scene, [camera]);
  pipeline.bloomEnabled      = true;
  pipeline.bloomThreshold    = 0.3;
  pipeline.bloomWeight       = 0.5;
  pipeline.bloomKernel       = 64;
  pipeline.chromaticAberrationEnabled = true;
  pipeline.chromaticAberration.aberrationAmount = 2.0;
  pipeline.grainEnabled = true;
  pipeline.grain.intensity = 10;
  pipeline.grain.animated  = true;

  let sceneT    = 0;
  let boltTimer = 0;

  engine.runRenderLoop(() => {
    const dt = engine.getDeltaTime() / 1000;
    sceneT  += dt;
    frameCount++;
    lastFPS  = engine.getFps();

    const insanity = Math.max(1 - sanity / 100, chaosOverride);

    // breathe + shake camera
    const shakeX = screenShakeAmt > 0 ? (Math.random() - 0.5) * screenShakeAmt : 0;
    const shakeY = screenShakeAmt > 0 ? (Math.random() - 0.5) * screenShakeAmt : 0;
    camera.radius = 28 + Math.sin(sceneT * 0.4) * 3 + insanity * 6;
    camera.beta   = cameraBaseBeta + Math.sin(sceneT * 0.27) * 0.15 + shakeY * 0.05;
    camera.alpha  = camera.alpha + 0.0008 + insanity * 0.0012 + shakeX * 0.02;

    // light pulse
    point1.intensity = 1.4 + Math.sin(sceneT * 1.8) * 0.6 + insanity * 1.2;
    point2.intensity = 0.9 + Math.sin(sceneT * 2.3 + 1) * 0.4;
    point3.intensity = 0.8 + Math.sin(sceneT * 1.5 + 2) * 0.5 + insanity * 0.8;

    const c1h = (sceneT * 20) % 360;
    const c2h = (sceneT * 15 + 120) % 360;
    point1.diffuse = BABYLON.Color3.FromHSV(c1h, 1, 1);
    point2.diffuse = BABYLON.Color3.FromHSV(c2h, 1, 1);

    glowLayer.intensity = 0.7 + insanity * 1.4;

    // animate shapes
    animateShapes(shapeList, sceneT, insanity);

    // constellation drift
    if (constellationMode) {
      constellationParticles.forEach((p, i) => {
        if (p && !p.isDisposed() && p.position) {
          p.position.y += Math.sin(sceneT * 0.5 + i * 0.3) * 0.01;
          p.position.x += Math.sin(sceneT * 0.3 + i * 0.2) * 0.005;
        }
      });
    }

    // lightning
    boltTimer -= dt;
    if (boltTimer <= 0) {
      boltTimer = Math.max(0.4, 2 + Math.random() * 4 - insanity * 1.5);
      flashBolt(bolts, scene, sceneT);
    }

    animateEyes(eyes, sceneT, insanity);
    updateUI(dt);
    drawDragon();
    prevMouseX = mouseX;
    prevMouseY = mouseY;

    if (pipeline.chromaticAberrationEnabled) {
      pipeline.chromaticAberration.aberrationAmount = 2 + insanity * 14 + screenShakeAmt * 4;
    }

    scene.render();
  });

  // right-click spawns shape
  canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    getAudioCtx();
    const pickInfo = scene.pick(e.clientX, e.clientY);
    spawnShapeAt(pickInfo);
  });

  // left click on ground spawns ripple
  scene.onPointerDown = (evt, pickInfo) => {
    getAudioCtx();
    if (evt.button === 0 && pickInfo && pickInfo.hit) {
      const name = pickInfo.pickedMesh ? pickInfo.pickedMesh.name : '';
      if (name === 'ground' || name === '') {
        spawnRipple(evt.clientX, evt.clientY);
      }
    }
  };

  window.addEventListener('resize', () => engine.resize());
}

/* ── Ground ──────────────────────────────────────────────── */
function buildGround(scene) {
  const ground = BABYLON.MeshBuilder.CreateGround('ground', { width: 60, height: 60, subdivisions: 40 }, scene);
  const mat    = new BABYLON.StandardMaterial('groundMat', scene);
  mat.emissiveColor = new BABYLON.Color3(0.04, 0.0, 0.08);

  try {
    BABYLON.Effect.ShadersStore['groundVertVertexShader'] = `
      precision highp float;
      attribute vec3 position;
      attribute vec2 uv;
      uniform mat4 worldViewProjection;
      uniform float uTime;
      varying vec2 vUv;
      varying float vDisplace;
      void main(void){
        vUv = uv;
        float d = sin(position.x * 0.5 + uTime) * cos(position.z * 0.5 + uTime * 0.7) * 0.5;
        vDisplace = d;
        vec3 pos = position + vec3(0.0, d, 0.0);
        gl_Position = worldViewProjection * vec4(pos, 1.0);
      }
    `;
    BABYLON.Effect.ShadersStore['groundVertFragmentShader'] = `
      precision highp float;
      varying vec2 vUv;
      varying float vDisplace;
      uniform float uTime;
      void main(void){
        float wave = sin(vUv.x * 10.0 + uTime * 2.0) * cos(vUv.y * 10.0 + uTime * 1.5);
        float r = 0.15 + wave * 0.08 + vDisplace * 0.3;
        float g = 0.0  + wave * 0.04;
        float b = 0.25 + wave * 0.12 + vDisplace * 0.2;
        gl_FragColor = vec4(r, g, b, 1.0);
      }
    `;
    const sm = new BABYLON.ShaderMaterial('groundVert', scene, { vertex: 'groundVert', fragment: 'groundVert' }, {
      attributes: ['position', 'uv'],
      uniforms:   ['worldViewProjection', 'uTime'],
    });
    sm.setFloat('uTime', 0);
    ground.material = sm;
    scene.registerBeforeRender(() => { sm.setFloat('uTime', performance.now() / 1000); });
  } catch (_) {
    ground.material = mat;
  }

  ground.position.y    = -7;
  ground.receiveShadows = true;
  return ground;
}

/* ── Shapes ──────────────────────────────────────────────── */
function buildShapes(scene) {
  const shapes = [];

  const matA = makeMat(scene, 'matA', new BABYLON.Color3(0.6, 0.0, 1.0));
  const matB = makeMat(scene, 'matB', new BABYLON.Color3(0.0, 1.0, 0.5));
  const matC = makeMat(scene, 'matC', new BABYLON.Color3(1.0, 0.1, 0.3));
  const matD = makeMat(scene, 'matD', new BABYLON.Color3(1.0, 0.8, 0.0));
  const matE = makeMat(scene, 'matE', new BABYLON.Color3(0.0, 0.8, 1.0));

  const torus = BABYLON.MeshBuilder.CreateTorus('torus', { diameter: 7, thickness: 1.8, tessellation: 48 }, scene);
  torus.material = matA; torus.position = new BABYLON.Vector3(0, 2, 0);
  shapes.push({ mesh: torus, type: 'torus', mat: matA, phase: 0, hovered: false, lastBob: 0 });

  const ico = BABYLON.MeshBuilder.CreateIcoSphere('ico', { radius: 2.2, subdivisions: 3 }, scene);
  ico.material = matB; ico.position = new BABYLON.Vector3(-6, 1, -4);
  shapes.push({ mesh: ico, type: 'ico', mat: matB, phase: 1.2, hovered: false, lastBob: 0 });

  const box = BABYLON.MeshBuilder.CreateBox('box', { size: 3, faceColors: [
    new BABYLON.Color4(1,0,0.3,1), new BABYLON.Color4(0,1,0.5,1),
    new BABYLON.Color4(0.5,0,1,1), new BABYLON.Color4(1,0.8,0,1),
    new BABYLON.Color4(0,0.8,1,1), new BABYLON.Color4(1,0.2,0.8,1),
  ]}, scene);
  box.material = matC; box.position = new BABYLON.Vector3(6, 0, -3);
  shapes.push({ mesh: box, type: 'box', mat: matC, phase: 2.4, hovered: false, lastBob: 0 });

  const knot = BABYLON.MeshBuilder.CreateTorusKnot('knot', { radius: 2, tube: 0.5, radialSegments: 128, tubularSegments: 16, p: 2, q: 3 }, scene);
  knot.material = matD; knot.position = new BABYLON.Vector3(5, 3, 5);
  shapes.push({ mesh: knot, type: 'knot', mat: matD, phase: 0.7, hovered: false, lastBob: 0 });

  const cyl = BABYLON.MeshBuilder.CreateCylinder('cyl', { height: 5, diameterTop: 0.2, diameterBottom: 3, tessellation: 16 }, scene);
  cyl.material = matE; cyl.position = new BABYLON.Vector3(-5, 1, 4);
  shapes.push({ mesh: cyl, type: 'cyl', mat: matE, phase: 1.8, hovered: false, lastBob: 0 });

  const torus2 = BABYLON.MeshBuilder.CreateTorus('torus2', { diameter: 4.5, thickness: 0.9, tessellation: 32 }, scene);
  torus2.material = matB; torus2.position = new BABYLON.Vector3(-3, 4, 3);
  torus2.rotation = new BABYLON.Vector3(Math.PI / 3, 0, Math.PI / 4);
  shapes.push({ mesh: torus2, type: 'torus', mat: matB, phase: 3.1, hovered: false, lastBob: 0 });

  const sphere = BABYLON.MeshBuilder.CreateSphere('sphere', { diameter: 3, segments: 16 }, scene);
  sphere.material = matA; sphere.position = new BABYLON.Vector3(0, -2, 6);
  shapes.push({ mesh: sphere, type: 'sphere', mat: matA, phase: 0.4, hovered: false, lastBob: 0 });

  shapes.forEach(s => {
    s.mesh.isPickable = true;
    s.mesh.actionManager = new BABYLON.ActionManager(scene);
    s.mesh.actionManager.registerAction(new BABYLON.ExecuteCodeAction(
      BABYLON.ActionManager.OnPickTrigger,
      () => { playScream(0.8 + Math.random() * 0.4); shatterShape(s); }
    ));
    s.mesh.actionManager.registerAction(new BABYLON.ExecuteCodeAction(
      BABYLON.ActionManager.OnPointerOverTrigger,
      () => { s.hovered = true; }
    ));
    s.mesh.actionManager.registerAction(new BABYLON.ExecuteCodeAction(
      BABYLON.ActionManager.OnPointerOutTrigger,
      () => { s.hovered = false; }
    ));
  });

  return shapes;
}

function makeMat(scene, name, emissive) {
  const m           = new BABYLON.StandardMaterial(name, scene);
  m.emissiveColor   = emissive;
  m.diffuseColor    = emissive.scale(0.5);
  m.specularColor   = new BABYLON.Color3(1, 1, 1);
  m.specularPower   = 32;
  m.backFaceCulling = false;
  return m;
}

function animateShapes(shapes, t, insanity) {
  shapes.forEach((s, i) => {
    if (!s.mesh || !s.mesh.isVisible) return;
    const ph    = s.phase;
    const speed = 0.4 + insanity * 1.2 + (s.voidMode ? 3 : 0);
    const bob   = Math.sin(t * speed + ph) * (0.5 + insanity * 1.5);

    s.mesh.position.y += (bob - (s.lastBob || 0)) * 0.6;
    s.lastBob = bob;

    const rotSpeed = s.voidMode ? 0.15 : 0;
    s.mesh.rotation.x += 0.005 + insanity * 0.025 + (s.hovered ? 0.04 : 0) + rotSpeed;
    s.mesh.rotation.y += 0.008 + insanity * 0.030 + (s.hovered ? 0.06 : 0) + rotSpeed;
    s.mesh.rotation.z += 0.003 + insanity * 0.015 + rotSpeed;

    const breathe = 1 + Math.sin(t * 1.2 + ph) * (0.06 + insanity * 0.18) + (s.voidMode ? Math.sin(t * 8) * 0.3 : 0);
    s.mesh.scaling.setAll(breathe + (s.hovered ? 0.12 : 0));

    const h   = ((t * 25 + i * 50) % 360);
    const col = BABYLON.Color3.FromHSV(h, 1, 1);
    s.mat.emissiveColor = col;
    s.mat.diffuseColor  = col.scale(0.4);

    if (insanity > 0.5 && Math.random() < 0.02) {
      s.mesh.scaling.x *= 0.9 + Math.random() * 0.2;
      s.mesh.scaling.z *= 0.9 + Math.random() * 0.2;
    }
  });
}

function shatterShape(s) {
  const orig = s.mesh.position.clone();
  let   tick = 0;
  const id   = setInterval(() => {
    tick += 0.1;
    s.mesh.scaling.setAll(1 + tick * 2);
    s.mat.alpha = Math.max(0, 1 - tick);
    if (tick >= 1) {
      clearInterval(id);
      s.mesh.scaling.setAll(1);
      s.mat.alpha    = 1;
      s.mesh.position = orig;
    }
  }, 30);
}

/* ── Lightning ───────────────────────────────────────────── */
function buildLightningBolts(scene) {
  const bolts = [];
  for (let i = 0; i < 4; i++) {
    const pts  = zigzagPoints(
      new BABYLON.Vector3(-8 + i * 4, 10, -5 + i * 3),
      new BABYLON.Vector3(-6 + i * 4, -4, -3 + i * 3),
      8
    );
    const bolt = BABYLON.MeshBuilder.CreateLines('bolt' + i, { points: pts, updatable: true }, scene);
    bolt.color      = new BABYLON.Color3(0.6, 0.0, 1.0);
    bolt.isVisible  = false;
    bolt.isPickable = false;
    bolts.push(bolt);
  }
  return bolts;
}

function zigzagPoints(from, to, segments) {
  const pts = [];
  for (let i = 0; i <= segments; i++) {
    const t  = i / segments;
    const jx = (i === 0 || i === segments) ? 0 : (Math.random() - 0.5) * 4;
    const jy = (i === 0 || i === segments) ? 0 : (Math.random() - 0.5) * 4;
    const jz = (i === 0 || i === segments) ? 0 : (Math.random() - 0.5) * 4;
    pts.push(new BABYLON.Vector3(
      BABYLON.Scalar.Lerp(from.x, to.x, t) + jx,
      BABYLON.Scalar.Lerp(from.y, to.y, t) + jy,
      BABYLON.Scalar.Lerp(from.z, to.z, t) + jz,
    ));
  }
  return pts;
}

function flashBolt(bolts, scene, t) {
  const bolt = bolts[Math.floor(Math.random() * bolts.length)];
  bolt.isVisible = true;
  bolt.color = BABYLON.Color3.FromHSV((t * 60) % 360, 1, 1);
  const from = new BABYLON.Vector3(-8 + Math.random() * 16, 10,  -8 + Math.random() * 16);
  const to   = new BABYLON.Vector3(-8 + Math.random() * 16, -4,  -8 + Math.random() * 16);
  BABYLON.MeshBuilder.CreateLines(bolt.name, { points: zigzagPoints(from, to, 8), instance: bolt });
  setTimeout(() => { bolt.isVisible = false; }, 120 + Math.random() * 200);
}

/* ── Droplets ────────────────────────────────────────────── */
function buildDroplets(scene) {
  const SPS    = new BABYLON.SolidParticleSystem('drops', scene, { isPickable: false });
  const sphere = BABYLON.MeshBuilder.CreateSphere('dropTpl', { diameter: 1 }, scene);
  SPS.addShape(sphere, 60);
  sphere.dispose();
  const mesh = SPS.buildMesh();
  const mat  = new BABYLON.StandardMaterial('dropMat', scene);
  mat.emissiveColor   = new BABYLON.Color3(0.0, 1.0, 0.7);
  mat.backFaceCulling = false;
  mesh.material  = mat;
  mesh.isPickable = false;

  function resetDrop(p) {
    p.position.x = (Math.random() - 0.5) * 40;
    p.position.y = -8 + Math.random() * 3;
    p.position.z = (Math.random() - 0.5) * 40;
    p.velocity   = new BABYLON.Vector3(
      (Math.random() - 0.5) * 0.5,
      0.04 + Math.random() * 0.12,
      (Math.random() - 0.5) * 0.5
    );
    const sc = 0.08 + Math.random() * 0.18;
    p.scaling.setAll(sc);
    const h  = Math.random() * 360;
    p.color  = new BABYLON.Color4(...BABYLON.Color3.FromHSV(h, 1, 1).asArray(), 0.9);
  }

  SPS.initParticles = () => {
    for (let i = 0; i < SPS.nbParticles; i++) resetDrop(SPS.particles[i]);
  };

  SPS.updateParticle = (p) => {
    p.position.addInPlace(p.velocity);
    p.velocity.y += 0.001;
    if (p.position.y > 14) resetDrop(p);
    return p;
  };

  SPS.initParticles();
  SPS.setParticles();
  scene.registerBeforeRender(() => SPS.setParticles());
  return SPS;
}

/* ── Eyes ────────────────────────────────────────────────── */
function buildEyes(scene) {
  const eyes = [];
  for (let i = 0; i < 6; i++) eyes.push(buildEye(scene, i));
  return eyes;
}

function buildEye(scene, idx) {
  const root = new BABYLON.TransformNode('eye' + idx, scene);
  root.position = new BABYLON.Vector3(
    (Math.random() - 0.5) * 24,
    2 + Math.random() * 8,
    (Math.random() - 0.5) * 24
  );

  const ring = BABYLON.MeshBuilder.CreateTorus('eyeRing' + idx, { diameter: 1.4, thickness: 0.08, tessellation: 32 }, scene);
  ring.parent = root;
  const ringMat         = new BABYLON.StandardMaterial('eyeRingMat' + idx, scene);
  ringMat.emissiveColor = new BABYLON.Color3(0.9, 0.0, 0.5);
  ringMat.backFaceCulling = false;
  ring.material  = ringMat;
  ring.isPickable = false;

  const iris = BABYLON.MeshBuilder.CreateSphere('eyeIris' + idx, { diameter: 0.6, segments: 8 }, scene);
  iris.parent = root;
  const irisMat         = new BABYLON.StandardMaterial('eyeIrisMat' + idx, scene);
  irisMat.emissiveColor = new BABYLON.Color3(0.2, 1.0, 0.3);
  iris.material  = irisMat;
  iris.isPickable = false;

  const pupil = BABYLON.MeshBuilder.CreateSphere('eyePupil' + idx, { diameter: 0.25, segments: 6 }, scene);
  pupil.parent   = root;
  pupil.position = new BABYLON.Vector3(0, 0, 0.3);
  const pupilMat         = new BABYLON.StandardMaterial('eyePupilMat' + idx, scene);
  pupilMat.emissiveColor = new BABYLON.Color3(0.0, 0.0, 0.0);
  pupil.material  = pupilMat;
  pupil.isPickable = false;

  return { root, ring, iris, pupil, ringMat, irisMat, blinkTimer: Math.random() * 4, phase: Math.random() * Math.PI * 2 };
}

function animateEyes(eyes, t, insanity) {
  eyes.forEach((e, i) => {
    const dx    = mouseX - window.innerWidth  / 2;
    const dy    = mouseY - window.innerHeight / 2;
    const yaw   = Math.atan2(dx, 300) * 0.6;
    const pitch = -Math.atan2(dy, 300) * 0.6;
    e.root.rotation.y = yaw   + Math.sin(t * 0.3 + e.phase) * 0.3;
    e.root.rotation.x = pitch + Math.sin(t * 0.2 + e.phase + 1) * 0.2;
    e.root.position.y += Math.sin(t * 0.5 + e.phase) * 0.008;

    e.blinkTimer -= 0.016;
    if (e.blinkTimer <= 0) {
      e.blinkTimer     = 2 + Math.random() * 5;
      e.ring.scaling.y = 0.05;
      setTimeout(() => { e.ring.scaling.y = 1; }, 120);
    }

    const h = (t * 30 + i * 60) % 360;
    e.ringMat.emissiveColor = BABYLON.Color3.FromHSV(h, 1, 1);
    e.irisMat.emissiveColor = BABYLON.Color3.FromHSV((h + 120) % 360, 1, 1);

    const sc = 1 + insanity * 0.8 + Math.sin(t * 2 + e.phase) * 0.1;
    e.root.scaling.setAll(sc);
  });
}

/* ── Name Screen ─────────────────────────────────────────── */
function initNameScreen() {
  const screen  = document.getElementById('name-screen');
  const input   = document.getElementById('name-input');
  const btn     = document.getElementById('name-enter-btn');
  const sqTop   = document.getElementById('name-squiggle-top');
  const sqBot   = document.getElementById('name-squiggle-bot');
  const sqInTop = document.getElementById('name-input-squiggle-top');
  const sqInBot = document.getElementById('name-input-squiggle-bot');

  // animate squiggles on name screen
  let nameT = 0;
  const nameAnim = setInterval(() => {
    nameT += 0.04;
    if (sqTop)   sqTop.setAttribute('d',   squigglePath(0, 15, 500, 15, 5, 6, nameT));
    if (sqBot)   sqBot.setAttribute('d',   squigglePath(0, 15, 500, 15, 5, 6, nameT + 1.5));
    if (sqInTop) sqInTop.setAttribute('d', squigglePath(0, 5,  320, 5,  3, 8, nameT * 1.5));
    if (sqInBot) sqInBot.setAttribute('d', squigglePath(0, 15, 320, 15, 3, 8, nameT * 1.5 + 1));
  }, 16);

  function enterMind() {
    const val = (input ? input.value.trim() : '') || 'STRANGER';
    userName  = val.toUpperCase().slice(0, 20) || 'STRANGER';
    clearInterval(nameAnim);
    if (screen) {
      screen.classList.add('hidden');
      setTimeout(() => { screen.style.display = 'none'; }, 1300);
    }
    getAudioCtx();
    initBabylon();
  }

  if (btn) btn.addEventListener('click', enterMind);
  if (input) {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') enterMind();
    });
    // focus input on load
    setTimeout(() => input.focus(), 300);
  }
}

/* ── Keyboard Listeners ──────────────────────────────────── */
window.addEventListener('keydown', (e) => {
  // secret code
  if (!mindBroken) handleSecretKey(e.key);
  // constellation toggle
  if (e.key.toLowerCase() === 'c' && scene) toggleConstellation();
  // reset with R key when mind broken
  if (e.key.toLowerCase() === 'r' && mindBroken) resetMind();
});

/* ── Mouse Tracking ──────────────────────────────────────── */
window.addEventListener('mousemove', (e) => {
  prevMouseX = mouseX;
  prevMouseY = mouseY;
  mouseX     = e.clientX;
  mouseY     = e.clientY;
});

/* ── Reset Button ────────────────────────────────────────── */
window.addEventListener('DOMContentLoaded', () => {
  const resetBtn = document.getElementById('reset-btn');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      getAudioCtx();
      resetMind();
    });
  }
  initNameScreen();
});