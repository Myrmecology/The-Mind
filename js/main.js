/* ============================================================
   THE MIND — main.js
   Babylon.js Interactive Cosmic Horror Experience
   ============================================================ */

'use strict';

/* ── Globals ─────────────────────────────────────────────── */
const canvas        = document.getElementById('renderCanvas');
const cursorCanvas  = document.getElementById('cursorCanvas');
const cCtx          = cursorCanvas.getContext('2d');

let engine, scene, camera;
let audioCtx        = null;
let sanity          = 100;          // 0–100
let elapsed         = 0;            // seconds
let mindBroken      = false;
let frameCount      = 0;
let lastFPS         = 60;
let mouseX          = 0;
let mouseY          = 0;
let prevMouseX      = 0;
let prevMouseY      = 0;
let dragonWalkFrame = 0;
let dragonFrameTick = 0;

const MIND_BREAK_TIME = 120;        // seconds until Mind Break
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

/* ── Audio Context (lazy init on first interaction) ─────── */
function getAudioCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

/* ── Sound Synthesis ────────────────────────────────────── */
function playScream(intensity = 1.0) {
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
    osc1.connect(dist);
    osc2.connect(dist);
    dist.connect(gain);
    gain.connect(ctx.destination);
    osc1.start();
    osc2.start();
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
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.18);
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
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start();
    noise.stop(ctx.currentTime + 0.4);
  } catch (_) {}
}

function playHeartbeat() {
  try {
    const ctx    = getAudioCtx();
    const osc    = ctx.createOscillator();
    const gain   = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    osc.type     = 'sine';
    filter.type            = 'lowpass';
    filter.frequency.value = 120;
    osc.frequency.setValueAtTime(55, ctx.currentTime);
    gain.gain.setValueAtTime(0.0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.4, ctx.currentTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
    // second thud
    const osc2   = ctx.createOscillator();
    const gain2  = ctx.createGain();
    osc2.type    = 'sine';
    osc2.frequency.setValueAtTime(45, ctx.currentTime + 0.22);
    gain2.gain.setValueAtTime(0.0, ctx.currentTime + 0.22);
    gain2.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.27);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
    osc2.connect(filter);
    filter.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(ctx.currentTime + 0.22);
    osc2.stop(ctx.currentTime + 0.5);
  } catch (_) {}
}

function playWhisper() {
  try {
    const ctx   = getAudioCtx();
    const gain  = ctx.createGain();
    const osc   = ctx.createOscillator();
    const filt  = ctx.createBiquadFilter();
    osc.type    = 'sine';
    filt.type   = 'highpass';
    filt.frequency.value = 2000;
    osc.frequency.setValueAtTime(3200, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(2400, ctx.currentTime + 1.2);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.setValueAtTime(0.0, ctx.currentTime + 1.2);
    osc.connect(filt);
    filt.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 1.3);
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
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.12);
      osc.stop(ctx.currentTime + i * 0.12 + 1.2);
    }
  } catch (_) {}
}

/* ── Cursor Canvas Resize ───────────────────────────────── */
function resizeCursorCanvas() {
  cursorCanvas.width  = window.innerWidth;
  cursorCanvas.height = window.innerHeight;
}
resizeCursorCanvas();
window.addEventListener('resize', resizeCursorCanvas);

/* ── Dragon Cursor ──────────────────────────────────────── */
const DRAGON_FRAMES = [
  // frame 0 — legs down
  (x, y, col, scale) => {
    cCtx.save();
    cCtx.translate(x, y);
    cCtx.scale(scale, scale);
    cCtx.strokeStyle = col;
    cCtx.lineWidth   = 1.5;
    cCtx.shadowColor = col;
    cCtx.shadowBlur  = 8;
    cCtx.beginPath();
    // body
    cCtx.moveTo(0, -6);
    cCtx.lineTo(14, -2);
    cCtx.lineTo(18, 2);
    cCtx.lineTo(10, 6);
    cCtx.lineTo(0, 4);
    cCtx.lineTo(-4, -2);
    cCtx.closePath();
    cCtx.stroke();
    // head
    cCtx.beginPath();
    cCtx.moveTo(14, -2);
    cCtx.lineTo(24, -6);
    cCtx.lineTo(28, -2);
    cCtx.lineTo(24, 2);
    cCtx.lineTo(18, 2);
    cCtx.stroke();
    // eye
    cCtx.beginPath();
    cCtx.arc(23, -3, 1.5, 0, Math.PI * 2);
    cCtx.stroke();
    // jaw
    cCtx.beginPath();
    cCtx.moveTo(24, -2);
    cCtx.lineTo(30, 0);
    cCtx.stroke();
    // wing
    cCtx.beginPath();
    cCtx.moveTo(6, -4);
    cCtx.lineTo(4, -16);
    cCtx.lineTo(14, -10);
    cCtx.lineTo(10, -2);
    cCtx.stroke();
    // legs down
    cCtx.beginPath();
    cCtx.moveTo(4, 4);  cCtx.lineTo(2, 12);  cCtx.lineTo(0, 14);
    cCtx.moveTo(10, 5); cCtx.lineTo(10, 13); cCtx.lineTo(8, 16);
    cCtx.stroke();
    // tail
    cCtx.beginPath();
    cCtx.moveTo(-4, -2);
    cCtx.lineTo(-12, -4);
    cCtx.lineTo(-18, 0);
    cCtx.lineTo(-22, -2);
    cCtx.stroke();
    cCtx.restore();
  },
  // frame 1 — legs up
  (x, y, col, scale) => {
    cCtx.save();
    cCtx.translate(x, y);
    cCtx.scale(scale, scale);
    cCtx.strokeStyle = col;
    cCtx.lineWidth   = 1.5;
    cCtx.shadowColor = col;
    cCtx.shadowBlur  = 8;
    cCtx.beginPath();
    cCtx.moveTo(0, -6);
    cCtx.lineTo(14, -2);
    cCtx.lineTo(18, 2);
    cCtx.lineTo(10, 6);
    cCtx.lineTo(0, 4);
    cCtx.lineTo(-4, -2);
    cCtx.closePath();
    cCtx.stroke();
    cCtx.beginPath();
    cCtx.moveTo(14, -2);
    cCtx.lineTo(24, -6);
    cCtx.lineTo(28, -2);
    cCtx.lineTo(24, 2);
    cCtx.lineTo(18, 2);
    cCtx.stroke();
    cCtx.beginPath();
    cCtx.arc(23, -3, 1.5, 0, Math.PI * 2);
    cCtx.stroke();
    cCtx.beginPath();
    cCtx.moveTo(24, -2);
    cCtx.lineTo(30, 0);
    cCtx.stroke();
    // wing up
    cCtx.beginPath();
    cCtx.moveTo(6, -4);
    cCtx.lineTo(2, -18);
    cCtx.lineTo(14, -12);
    cCtx.lineTo(10, -2);
    cCtx.stroke();
    // legs up
    cCtx.beginPath();
    cCtx.moveTo(4, 4);  cCtx.lineTo(4, 8);   cCtx.lineTo(6, 6);
    cCtx.moveTo(10, 5); cCtx.lineTo(12, 9);  cCtx.lineTo(14, 8);
    cCtx.stroke();
    cCtx.beginPath();
    cCtx.moveTo(-4, -2);
    cCtx.lineTo(-12, 0);
    cCtx.lineTo(-18, -4);
    cCtx.lineTo(-22, 0);
    cCtx.stroke();
    cCtx.restore();
  },
];

function dragonColor() {
  const t   = Date.now() / 1000;
  const r   = Math.floor(128 + 127 * Math.sin(t * 0.7));
  const g   = Math.floor(80  + 80  * Math.sin(t * 0.4 + 2));
  const b   = Math.floor(200 + 55  * Math.sin(t * 0.9 + 4));
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

  const col   = dragonColor();
  const scale = 1.1;

  cCtx.save();
  if (flipX === -1) {
    cCtx.translate(mouseX * 2, 0);
    cCtx.scale(-1, 1);
  }
  DRAGON_FRAMES[dragonWalkFrame](flipX === -1 ? cursorCanvas.width - mouseX : mouseX, mouseY, col, scale);
  cCtx.restore();
}

/* ── Squiggle Path Generator ────────────────────────────── */
function squigglePath(x1, y1, x2, y2, amp, freq, t = 0) {
  const dx   = x2 - x1;
  const dy   = y2 - y1;
  const len  = Math.sqrt(dx * dx + dy * dy);
  const steps = Math.max(8, Math.floor(len / 8));
  let d = `M ${x1} ${y1}`;
  for (let i = 1; i <= steps; i++) {
    const p  = i / steps;
    const ox = x1 + dx * p;
    const oy = y1 + dy * p;
    const wave = Math.sin(p * freq * Math.PI * 2 + t) * amp;
    const px = ox - (dy / len) * wave;
    const py = oy + (dx / len) * wave;
    d += ` L ${px.toFixed(2)} ${py.toFixed(2)}`;
  }
  return d;
}

/* ── UI Update Loop ─────────────────────────────────────── */
let whisperTimeout  = null;
let heartbeatTimer  = 0;
let whisperTimer    = 0;
let dripTimer       = 0;
let lightningTimer  = 0;
let uiT             = 0;

function updateUI(dt) {
  uiT += dt;

  // --- sanity drain
  if (!mindBroken) {
    sanity = Math.max(0, sanity - dt * (100 / MIND_BREAK_TIME));
    elapsed += dt;
  }

  // --- heartbeat
  heartbeatTimer -= dt;
  if (heartbeatTimer <= 0) {
    playHeartbeat();
    const bpm     = 60 + (1 - sanity / 100) * 80;
    heartbeatTimer = 60 / bpm;
  }

  // --- whisper
  whisperTimer -= dt;
  if (whisperTimer <= 0) {
    whisperTimer = 8 + Math.random() * 10 - (1 - sanity / 100) * 6;
    triggerWhisper();
  }

  // --- drip sound
  dripTimer -= dt;
  if (dripTimer <= 0) {
    dripTimer = 3 + Math.random() * 4;
    playDrip();
  }

  // --- lightning sound
  lightningTimer -= dt;
  if (lightningTimer <= 0) {
    lightningTimer = 5 + Math.random() * 8 - (1 - sanity / 100) * 4;
    playLightning();
  }

  // --- sanity meter squiggle
  const sRatio  = sanity / 100;
  const trackEl = document.getElementById('sanity-track');
  const fillEl  = document.getElementById('sanity-fill');
  const sqEl    = document.getElementById('sanity-squiggle');
  if (trackEl && fillEl && sqEl) {
    const trackPath = squigglePath(10, 20, 210, 20, 3, 6, uiT * 1.5);
    const fillPath  = squigglePath(10, 20, 10 + 200 * sRatio, 20, 4 + (1 - sRatio) * 6, 8, uiT * 2.5);
    const sqPath    = squigglePath(10, 20, 210, 20, 6, 12, uiT * 3);
    trackEl.setAttribute('d', trackPath);
    fillEl.setAttribute('d', fillPath);
    sqEl.setAttribute('d', sqPath);
    const col = sRatio > 0.6
      ? getComputedStyle(document.documentElement).getPropertyValue('--color-sanity-full').trim()
      : sRatio > 0.3
        ? getComputedStyle(document.documentElement).getPropertyValue('--color-sanity-mid').trim()
        : getComputedStyle(document.documentElement).getPropertyValue('--color-sanity-low').trim();
    fillEl.setAttribute('stroke', col);
    sqEl.setAttribute('stroke', col);
  }

  // --- title squiggles
  const tTop = document.getElementById('title-squiggle-top');
  const tBot = document.getElementById('title-squiggle-bot');
  if (tTop && tBot) {
    tTop.setAttribute('d', squigglePath(0, 8,  400, 8,  4, 7, uiT * 1.2));
    tBot.setAttribute('d', squigglePath(0, 72, 400, 72, 4, 7, uiT * 1.8));
  }

  // --- timer
  const timerText = document.getElementById('timer-text');
  const timerSq   = document.getElementById('timer-squiggle');
  if (timerText) {
    const m = String(Math.floor(elapsed / 60)).padStart(2, '0');
    const s = String(Math.floor(elapsed % 60)).padStart(2, '0');
    timerText.textContent = `${m}:${s}`;
  }
  if (timerSq) {
    timerSq.setAttribute('d', squigglePath(0, 32, 180, 32, 3, 6, uiT * 2));
  }

  // --- mind break trigger
  if (sanity <= 0 && !mindBroken) {
    triggerMindBreak();
  }
}

function triggerWhisper() {
  const el = document.getElementById('whisper-text');
  if (!el) return;
  el.classList.remove('visible');
  void el.offsetWidth;
  el.textContent = WHISPERS[Math.floor(Math.random() * WHISPERS.length)];
  el.style.top  = (30 + Math.random() * 40) + '%';
  el.style.left = (20 + Math.random() * 60) + '%';
  el.style.transform = `translate(-50%, -50%) rotate(${(Math.random() - 0.5) * 10}deg)`;
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
  if (bSqA) bSqA.setAttribute('d', squigglePath(0, 60, 600, 60, 12, 10, uiT));
  if (bSqB) bSqB.setAttribute('d', squigglePath(0, 150, 600, 150, 12, 10, uiT + 2));
}

/* ── Babylon Scene ──────────────────────────────────────── */
function initBabylon() {
  engine = new BABYLON.Engine(canvas, true, {
    preserveDrawingBuffer: true,
    stencil: true,
    antialias: true,
  });

  scene  = new BABYLON.Scene(engine);
  scene.clearColor = new BABYLON.Color4(0.02, 0.0, 0.03, 1.0);
  scene.ambientColor = new BABYLON.Color3(0.05, 0.0, 0.08);

  // Camera
  camera = new BABYLON.ArcRotateCamera('cam', -Math.PI / 2, Math.PI / 3, 28, BABYLON.Vector3.Zero(), scene);
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

  const point1 = new BABYLON.PointLight('pt1', new BABYLON.Vector3(0, 8, 0), scene);
  point1.diffuse    = new BABYLON.Color3(0.8, 0.0, 1.0);
  point1.intensity  = 1.4;
  point1.range      = 40;

  const point2 = new BABYLON.PointLight('pt2', new BABYLON.Vector3(-10, 4, 6), scene);
  point2.diffuse   = new BABYLON.Color3(0.0, 1.0, 0.6);
  point2.intensity = 0.9;
  point2.range     = 30;

  const point3 = new BABYLON.PointLight('pt3', new BABYLON.Vector3(10, -4, -6), scene);
  point3.diffuse   = new BABYLON.Color3(1.0, 0.1, 0.2);
  point3.intensity = 0.8;
  point3.range     = 28;

  // Ground plane (boiling lava shader)
  buildGround(scene);

  // Shapes
  const shapes = buildShapes(scene);

  // Lightning bolts (instanced lines)
  const bolts = buildLightningBolts(scene);

  // Droplets (upward dripping particles)
  buildDroplets(scene);

  // Floating eyes
  const eyes = buildEyes(scene);

  // Glow layer
  const glow        = new BABYLON.GlowLayer('glow', scene);
  glow.intensity    = 0.7;
  glow.blurKernelSize = 32;

  // Post processing
  const pipeline = new BABYLON.DefaultRenderingPipeline('pp', true, scene, [camera]);
  pipeline.bloomEnabled      = true;
  pipeline.bloomThreshold    = 0.3;
  pipeline.bloomWeight       = 0.5;
  pipeline.bloomKernel       = 64;
  pipeline.chromaticAberrationEnabled = true;
  pipeline.chromaticAberration.aberrationAmount = 2.0;
  pipeline.grainEnabled      = true;
  pipeline.grain.intensity   = 10;
  pipeline.grain.animated    = true;

  let sceneT     = 0;
  let boltTimer  = 0;

  // Render loop
  engine.runRenderLoop(() => {
    const dt = engine.getDeltaTime() / 1000;
    sceneT  += dt;
    frameCount++;

    // adaptive quality guard
    lastFPS = engine.getFps();

    const insanity = 1 - sanity / 100;

    // --- breathe camera
    camera.radius = 28 + Math.sin(sceneT * 0.4) * 3 + insanity * 6;
    camera.beta   = Math.PI / 3 + Math.sin(sceneT * 0.27) * 0.15;
    camera.alpha += 0.0008 + insanity * 0.0012;

    // --- light pulse
    point1.intensity = 1.4 + Math.sin(sceneT * 1.8) * 0.6 + insanity * 1.2;
    point2.intensity = 0.9 + Math.sin(sceneT * 2.3 + 1) * 0.4;
    point3.intensity = 0.8 + Math.sin(sceneT * 1.5 + 2) * 0.5 + insanity * 0.8;

    const c1h = (sceneT * 20) % 360;
    const c2h = (sceneT * 15 + 120) % 360;
    point1.diffuse = BABYLON.Color3.FromHSV(c1h, 1, 1);
    point2.diffuse = BABYLON.Color3.FromHSV(c2h, 1, 1);

    // glow intensity rises with insanity
    glow.intensity = 0.7 + insanity * 1.4;

    // --- animate shapes
    animateShapes(shapes, sceneT, insanity);

    // --- lightning
    boltTimer -= dt;
    if (boltTimer <= 0) {
      boltTimer = 2 + Math.random() * 4 - insanity * 1.5;
      boltTimer = Math.max(0.4, boltTimer);
      flashBolt(bolts, scene, sceneT);
    }

    // --- animate eyes
    animateEyes(eyes, sceneT, insanity);

    // --- ui
    updateUI(dt);

    // --- dragon cursor
    drawDragon();
    prevMouseX = mouseX;
    prevMouseY = mouseY;

    // --- chromatic aberration creep
    if (pipeline.chromaticAberrationEnabled) {
      pipeline.chromaticAberration.aberrationAmount = 2 + insanity * 14;
    }

    scene.render();
  });

  window.addEventListener('resize', () => engine.resize());
}

/* ── Ground ─────────────────────────────────────────────── */
function buildGround(scene) {
  const ground = BABYLON.MeshBuilder.CreateGround('ground', { width: 60, height: 60, subdivisions: 40 }, scene);
  const mat    = new BABYLON.StandardMaterial('groundMat', scene);
  mat.emissiveColor = new BABYLON.Color3(0.04, 0.0, 0.08);
  mat.wireframe     = false;

  const groundShader = new BABYLON.ShaderMaterial('groundShader', scene, {
    vertexElement:   'groundVert',
    fragmentElement: 'groundFrag',
  }, {
    needAlphaBlending: false,
    attributes: ['position', 'uv'],
    uniforms:   ['worldViewProjection', 'uTime'],
  });

  // fallback to standard if shader fails
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
    scene.registerBeforeRender(() => {
      sm.setFloat('uTime', performance.now() / 1000);
    });
  } catch (_) {
    ground.material = mat;
  }

  ground.position.y = -7;
  ground.receiveShadows = true;
  return ground;
}

/* ── Shapes ─────────────────────────────────────────────── */
function buildShapes(scene) {
  const shapes = [];

  const matA = makeMat(scene, 'matA', new BABYLON.Color3(0.6, 0.0, 1.0));
  const matB = makeMat(scene, 'matB', new BABYLON.Color3(0.0, 1.0, 0.5));
  const matC = makeMat(scene, 'matC', new BABYLON.Color3(1.0, 0.1, 0.3));
  const matD = makeMat(scene, 'matD', new BABYLON.Color3(1.0, 0.8, 0.0));
  const matE = makeMat(scene, 'matE', new BABYLON.Color3(0.0, 0.8, 1.0));

  // Torus — main centrepiece
  const torus = BABYLON.MeshBuilder.CreateTorus('torus', { diameter: 7, thickness: 1.8, tessellation: 48 }, scene);
  torus.material  = matA;
  torus.position  = new BABYLON.Vector3(0, 2, 0);
  shapes.push({ mesh: torus, type: 'torus', mat: matA, phase: 0 });

  // Icosphere
  const ico = BABYLON.MeshBuilder.CreateIcoSphere('ico', { radius: 2.2, subdivisions: 3 }, scene);
  ico.material  = matB;
  ico.position  = new BABYLON.Vector3(-6, 1, -4);
  shapes.push({ mesh: ico, type: 'ico', mat: matB, phase: 1.2 });

  // Fractured box (subdivided)
  const box = BABYLON.MeshBuilder.CreateBox('box', { size: 3, faceColors: [
    new BABYLON.Color4(1,0,0.3,1), new BABYLON.Color4(0,1,0.5,1),
    new BABYLON.Color4(0.5,0,1,1), new BABYLON.Color4(1,0.8,0,1),
    new BABYLON.Color4(0,0.8,1,1), new BABYLON.Color4(1,0.2,0.8,1),
  ]}, scene);
  box.material  = matC;
  box.position  = new BABYLON.Vector3(6, 0, -3);
  shapes.push({ mesh: box, type: 'box', mat: matC, phase: 2.4 });

  // Knot / pretzel torus
  const knot = BABYLON.MeshBuilder.CreateTorusKnot('knot', { radius: 2, tube: 0.5, radialSegments: 128, tubularSegments: 16, p: 2, q: 3 }, scene);
  knot.material = matD;
  knot.position = new BABYLON.Vector3(5, 3, 5);
  shapes.push({ mesh: knot, type: 'knot', mat: matD, phase: 0.7 });

  // Cylinder (weird thin)
  const cyl = BABYLON.MeshBuilder.CreateCylinder('cyl', { height: 5, diameterTop: 0.2, diameterBottom: 3, tessellation: 16 }, scene);
  cyl.material  = matE;
  cyl.position  = new BABYLON.Vector3(-5, 1, 4);
  shapes.push({ mesh: cyl, type: 'cyl', mat: matE, phase: 1.8 });

  // Second torus (tilted)
  const torus2 = BABYLON.MeshBuilder.CreateTorus('torus2', { diameter: 4.5, thickness: 0.9, tessellation: 32 }, scene);
  torus2.material  = matB;
  torus2.position  = new BABYLON.Vector3(-3, 4, 3);
  torus2.rotation  = new BABYLON.Vector3(Math.PI / 3, 0, Math.PI / 4);
  shapes.push({ mesh: torus2, type: 'torus', mat: matB, phase: 3.1 });

  // Sphere (boiling)
  const sphere = BABYLON.MeshBuilder.CreateSphere('sphere', { diameter: 3, segments: 16 }, scene);
  sphere.material = matA;
  sphere.position = new BABYLON.Vector3(0, -2, 6);
  shapes.push({ mesh: sphere, type: 'sphere', mat: matA, phase: 0.4 });

  // make all pickable
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
  const m          = new BABYLON.StandardMaterial(name, scene);
  m.emissiveColor  = emissive;
  m.diffuseColor   = emissive.scale(0.5);
  m.specularColor  = new BABYLON.Color3(1, 1, 1);
  m.specularPower  = 32;
  m.backFaceCulling = false;
  return m;
}

function animateShapes(shapes, t, insanity) {
  shapes.forEach((s, i) => {
    const ph    = s.phase;
    const speed = 0.4 + insanity * 1.2;
    const bob   = Math.sin(t * speed + ph) * (0.5 + insanity * 1.5);

    s.mesh.position.y += (bob - (s.lastBob || 0)) * 0.6;
    s.lastBob = bob;

    s.mesh.rotation.x += 0.005 + insanity * 0.025 + (s.hovered ? 0.04 : 0);
    s.mesh.rotation.y += 0.008 + insanity * 0.030 + (s.hovered ? 0.06 : 0);
    s.mesh.rotation.z += 0.003 + insanity * 0.015;

    // breathing scale
    const breathe = 1 + Math.sin(t * 1.2 + ph) * (0.06 + insanity * 0.18);
    s.mesh.scaling.setAll(breathe + (s.hovered ? 0.12 : 0));

    // color shift
    const h     = ((t * 25 + i * 50) % 360);
    const col   = BABYLON.Color3.FromHSV(h, 1, 1);
    s.mat.emissiveColor = col;
    s.mat.diffuseColor  = col.scale(0.4);

    // tear distort at low sanity
    if (insanity > 0.5 && Math.random() < 0.02) {
      s.mesh.scaling.x *= 0.9 + Math.random() * 0.2;
      s.mesh.scaling.z *= 0.9 + Math.random() * 0.2;
    }
  });
}

function shatterShape(s) {
  const orig = s.mesh.position.clone();
  let   t    = 0;
  const id   = setInterval(() => {
    t += 0.1;
    s.mesh.scaling.setAll(1 + t * 2);
    s.mesh.material.alpha = 1 - t;
    if (t >= 1) {
      clearInterval(id);
      s.mesh.scaling.setAll(1);
      s.mesh.material.alpha = 1;
      s.mesh.position = orig;
    }
  }, 30);
}

/* ── Lightning ───────────────────────────────────────────── */
function buildLightningBolts(scene) {
  const bolts = [];
  for (let i = 0; i < 4; i++) {
    const points = zigzagPoints(
      new BABYLON.Vector3(-8 + i * 4, 10, -5 + i * 3),
      new BABYLON.Vector3(-6 + i * 4, -4, -3 + i * 3),
      8
    );
    const bolt = BABYLON.MeshBuilder.CreateLines('bolt' + i, { points, updatable: true }, scene);
    bolt.color   = new BABYLON.Color3(0.6, 0.0, 1.0);
    bolt.isVisible = false;
    bolt.isPickable = false;
    bolts.push(bolt);
  }
  return bolts;
}

function zigzagPoints(from, to, segments) {
  const pts = [];
  for (let i = 0; i <= segments; i++) {
    const t  = i / segments;
    const jx = i === 0 || i === segments ? 0 : (Math.random() - 0.5) * 4;
    const jy = i === 0 || i === segments ? 0 : (Math.random() - 0.5) * 4;
    const jz = i === 0 || i === segments ? 0 : (Math.random() - 0.5) * 4;
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
  const h   = (t * 60) % 360;
  bolt.color = BABYLON.Color3.FromHSV(h, 1, 1);
  // re-randomise path
  const from = new BABYLON.Vector3(-8 + Math.random() * 16, 10, -8 + Math.random() * 16);
  const to   = new BABYLON.Vector3(-8 + Math.random() * 16, -4, -8 + Math.random() * 16);
  const pts  = zigzagPoints(from, to, 8);
  BABYLON.MeshBuilder.CreateLines(bolt.name, { points: pts, instance: bolt });
  setTimeout(() => { bolt.isVisible = false; }, 120 + Math.random() * 200);
}

/* ── Droplets ────────────────────────────────────────────── */
function buildDroplets(scene) {
  const SPS   = new BABYLON.SolidParticleSystem('drops', scene, { isPickable: false });
  const sphere = BABYLON.MeshBuilder.CreateSphere('dropTpl', { diameter: 1 }, scene);
  SPS.addShape(sphere, 60);
  sphere.dispose();
  const mesh = SPS.buildMesh();
  const mat  = new BABYLON.StandardMaterial('dropMat', scene);
  mat.emissiveColor  = new BABYLON.Color3(0.0, 1.0, 0.7);
  mat.backFaceCulling = false;
  mesh.material = mat;
  mesh.isPickable = false;

  SPS.initParticles = () => {
    for (let i = 0; i < SPS.nbParticles; i++) {
      const p = SPS.particles[i];
      resetDrop(p);
    }
  };

  function resetDrop(p) {
    p.position.x = (Math.random() - 0.5) * 40;
    p.position.y = -8 + Math.random() * 3;
    p.position.z = (Math.random() - 0.5) * 40;
    p.velocity   = new BABYLON.Vector3(
      (Math.random() - 0.5) * 0.5,
      0.04 + Math.random() * 0.12,  // upward
      (Math.random() - 0.5) * 0.5
    );
    const sc = 0.08 + Math.random() * 0.18;
    p.scaling.setAll(sc);
    const h    = Math.random() * 360;
    p.color    = new BABYLON.Color4(...BABYLON.Color3.FromHSV(h, 1, 1).asArray(), 0.9);
  }

  SPS.updateParticle = (p) => {
    p.position.addInPlace(p.velocity);
    p.velocity.y += 0.001;  // slight acceleration upward
    if (p.position.y > 14) resetDrop(p);
    return p;
  };

  SPS.initParticles();
  SPS.setParticles();

  scene.registerBeforeRender(() => {
    SPS.setParticles();
  });

  return SPS;
}

/* ── Floating Eyes ───────────────────────────────────────── */
function buildEyes(scene) {
  const eyes = [];
  for (let i = 0; i < 6; i++) {
    const eye = buildEye(scene, i);
    eyes.push(eye);
  }
  return eyes;
}

function buildEye(scene, idx) {
  const root = new BABYLON.TransformNode('eye' + idx, scene);
  root.position = new BABYLON.Vector3(
    (Math.random() - 0.5) * 24,
    2 + Math.random() * 8,
    (Math.random() - 0.5) * 24
  );

  // outer ring
  const ring = BABYLON.MeshBuilder.CreateTorus('eyeRing' + idx, { diameter: 1.4, thickness: 0.08, tessellation: 32 }, scene);
  ring.parent = root;
  const ringMat        = new BABYLON.StandardMaterial('eyeRingMat' + idx, scene);
  ringMat.emissiveColor = new BABYLON.Color3(0.9, 0.0, 0.5);
  ringMat.backFaceCulling = false;
  ring.material        = ringMat;
  ring.isPickable = false;

  // iris sphere
  const iris = BABYLON.MeshBuilder.CreateSphere('eyeIris' + idx, { diameter: 0.6, segments: 8 }, scene);
  iris.parent = root;
  const irisMat        = new BABYLON.StandardMaterial('eyeIrisMat' + idx, scene);
  irisMat.emissiveColor = new BABYLON.Color3(0.2, 1.0, 0.3);
  iris.material        = irisMat;
  iris.isPickable = false;

  // pupil
  const pupil = BABYLON.MeshBuilder.CreateSphere('eyePupil' + idx, { diameter: 0.25, segments: 6 }, scene);
  pupil.parent   = root;
  pupil.position = new BABYLON.Vector3(0, 0, 0.3);
  const pupilMat        = new BABYLON.StandardMaterial('eyePupilMat' + idx, scene);
  pupilMat.emissiveColor = new BABYLON.Color3(0.0, 0.0, 0.0);
  pupil.material        = pupilMat;
  pupil.isPickable = false;

  return { root, ring, iris, pupil, ringMat, irisMat, blinkTimer: Math.random() * 4, phase: Math.random() * Math.PI * 2 };
}

function animateEyes(eyes, t, insanity) {
  eyes.forEach((e, i) => {
    // always face cursor in 3D (billboard)
    const dx   = mouseX - window.innerWidth  / 2;
    const dy   = mouseY - window.innerHeight / 2;
    const yaw  = Math.atan2(dx, 300) * 0.6;
    const pitch = -Math.atan2(dy, 300) * 0.6;
    e.root.rotation.y = yaw  + Math.sin(t * 0.3 + e.phase) * 0.3;
    e.root.rotation.x = pitch + Math.sin(t * 0.2 + e.phase + 1) * 0.2;

    // float
    e.root.position.y += Math.sin(t * 0.5 + e.phase) * 0.008;

    // blink
    e.blinkTimer -= 0.016;
    if (e.blinkTimer <= 0) {
      e.blinkTimer = 2 + Math.random() * 5;
      e.ring.scaling.y = 0.05;
      setTimeout(() => { e.ring.scaling.y = 1; }, 120);
    }

    // color pulse
    const h       = (t * 30 + i * 60) % 360;
    e.ringMat.emissiveColor = BABYLON.Color3.FromHSV(h, 1, 1);
    e.irisMat.emissiveColor = BABYLON.Color3.FromHSV((h + 120) % 360, 1, 1);

    // scale with insanity
    const sc = 1 + insanity * 0.8 + Math.sin(t * 2 + e.phase) * 0.1;
    e.root.scaling.setAll(sc);
  });
}

/* ── Mouse Tracking ─────────────────────────────────────── */
window.addEventListener('mousemove', (e) => {
  prevMouseX = mouseX;
  prevMouseY = mouseY;
  mouseX     = e.clientX;
  mouseY     = e.clientY;
  getAudioCtx();   // resume on first move
});

/* ── Boot ────────────────────────────────────────────────── */
window.addEventListener('DOMContentLoaded', () => {
  initBabylon();
});