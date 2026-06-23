# 🧠 The Mind

> *An interactive cosmic horror experience built with Babylon.js and the Web Audio API.*

---

## What Is This?

**The Mind** is a browser-based interactive experience that descends into chaos the longer you dare to stay. Strange 3D shapes breathe and tear apart. Floating eyes track your every move. A dragon walks with your cursor. And the longer you watch — the worse it gets.

Everything you see and hear is generated entirely in code. No external assets. No audio files. No image files. Just three files and a CDN link.

---

## Features

- 🐉 **Vectrex-style dragon cursor** that walks, flips direction, and shifts color in real time
- 🔮 **Seven breathing 3D shapes** — torus, icosphere, box, torus knot, cylinder, sphere — all rotating, color-shifting, and alive
- 👁️ **Six floating wireframe eyes** that always face your cursor and blink independently
- ⚡ **Procedural lightning bolts** that arc randomly between objects
- 💧 **Upward dripping particles** that defy gravity in full color
- 🌋 **Boiling ground plane** with a custom GLSL wave displacement shader
- 🎵 **Built-in synthesized sound effects** — screams, drips, lightning cracks, heartbeats, whispers — all via the Web Audio API
- 🧠 **Sanity meter** that drains over two minutes and drives every intensity level in the scene
- 👻 **Whisper events** — unsettling phrases that materialize and dissolve on screen
- 💀 **Mind Break event** — triggered when sanity hits zero
- 🎨 **Squiggly animated UI** — nothing is a straight line, nothing is static
- 📈 **Bloom, chromatic aberration, and film grain** via Babylon.js post-processing pipeline
- ⚙️ **Adaptive performance guard** — FPS-aware rendering to keep things smooth

---

## Tech Stack

| Layer | Technology |
|---|---|
| 3D Engine | [Babylon.js](https://www.babylonjs.com/) via CDN |
| Shaders | GLSL via Babylon.js ShaderMaterial |
| Audio | Web Audio API (zero assets) |
| Cursor | HTML5 Canvas 2D API |
| UI | Inline SVG with animated squiggle paths |
| Language | Vanilla JavaScript ES2022 |
| Styling | CSS Custom Properties + Keyframe Animations |

---

## Project Structure

the-mind/

├── index.html        # Canvas setup, UI overlay, CDN imports

├── css/

│   └── style.css     # Animated squiggle UI, color system, keyframes

├── js/

│   └── main.js       # Full engine — 3D scene, audio, cursor, UI logic

└── .gitignore

---

## Getting Started

No build tools. No dependencies to install. No package manager required.

**1. Clone the repo**
```bash
git clone https://github.com/your-username/the-mind.git
cd the-mind
```

**2. Serve locally**

You need a local server because of browser security restrictions on ES modules and shaders.

Using the VS Code **Live Server** extension — right-click `index.html` and select **Open with Live Server**.

Or with Python:
```bash
python -m http.server 8080
```

Or with Node:
```bash
npx serve .
```

**3. Open your browser**
http://localhost:8080

---

## How To Interact

| Action | Result |
|---|---|
| Move your cursor | The dragon walks with you |
| Click any shape | It screams and shatters |
| Hover a shape | It speeds up and grows |
| Wait 2 minutes | Sanity hits zero — Mind Break triggers |
| Stay longer | Everything gets worse |

---

## Browser Support

| Browser | Status |
|---|---|
| Chrome 90+ | ✅ Fully supported |
| Firefox 88+ | ✅ Fully supported |
| Edge 90+ | ✅ Fully supported |
| Safari 15+ | ✅ Supported |
| Mobile | ⚠️ Desktop experience recommended |

---

## Performance Notes

- Targets **60 FPS** on modern hardware
- Chromatic aberration and bloom scale with the sanity level
- Particle count is capped to avoid GPU overload
- Shader complexity is intentionally balanced for broad compatibility

---

## License

MIT License — use it, break it, make it weirder.

---

*Built with Babylon.js · Web Audio API · Vanilla JS · Pure chaos* Happy coding 