// ═══════════════════════════════════════════════════════════════
//  ar.js — Mode AR Caméra (getUserMedia + Three.js overlay)
//  La scène réelle s'affiche par-dessus le flux caméra du téléphone
// ═══════════════════════════════════════════════════════════════

import * as THREE from "three";

let _renderer = null;
let _scene    = null;
let _controls = null;
let arActive  = false;

let _videoEl      = null;
let _cameraStream = null;
let _arHintEl     = null;
let savedBg  = null;
let savedFog = null;

// ───────────────────────────────────────────────────────────────
//  INIT — appelé une seule fois depuis app.js
// ───────────────────────────────────────────────────────────────
export function initAR(renderer, scene, controls) {
  _renderer = renderer;
  _scene    = scene;
  _controls = controls;

  const btn = document.getElementById("arBtn");
  if (!btn) return;
  btn.addEventListener("click", () => arActive ? _stopAR() : _startAR());
}

// Compatibilité avec l'ancien appel depuis app.js (ne fait plus rien)
export function updateAR() {}
export function isARActive() { return arActive; }

// ───────────────────────────────────────────────────────────────
//  DÉMARRAGE AR
// ───────────────────────────────────────────────────────────────
async function _startAR() {
  if (!navigator.mediaDevices?.getUserMedia) {
    _arToast("❌ Caméra non disponible sur cet appareil");
    return;
  }

  const btn = document.getElementById("arBtn");
  if (btn) btn.textContent = "⏳…";

  try {
    // ── 1. Ouvrir la caméra arrière ────────────────────────────
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false,
    });
    _cameraStream = stream;

    // ── 2. Vidéo en fond (derrière le canvas) ──────────────────
    _videoEl = document.createElement("video");
    _videoEl.autoplay    = true;
    _videoEl.muted       = true;
    _videoEl.playsInline = true;
    _videoEl.setAttribute("playsinline", "");
    _videoEl.srcObject = stream;
    _videoEl.style.cssText =
      "position:fixed;top:0;left:0;width:100%;height:100%;" +
      "object-fit:cover;z-index:0;pointer-events:none;";
    document.body.appendChild(_videoEl);
    await _videoEl.play();

    // ── 3. Rendre le canvas Three.js transparent ───────────────
    _renderer.setClearColor(0x000000, 0);
    savedBg  = _scene.background;
    savedFog = _scene.fog;
    _scene.background = null;
    _scene.fog        = null;

    // ── 4. Activer OrbitControls (1 doigt = rotation, 2 = zoom) ─
    if (_controls) {
      _controls.enabled      = true;
      _controls.enableZoom   = true;
      _controls.enablePan    = false;
      _controls.rotateSpeed  = 0.6;
      _controls.zoomSpeed    = 0.8;
    }

    arActive = true;

    // Bouton
    if (btn) { btn.textContent = "⏹ Quitter AR"; btn.classList.add("active"); }

    // Atténuer l'UI histoire
    document.getElementById("storyUI")?.style.setProperty("opacity", "0.25");
    document.getElementById("storyUI")?.style.setProperty("pointer-events", "none");

    // Hint
    _showHint("👆 1 doigt → tourner  ·  2 doigts → zoomer");
    _arToast("📱 La vraie chambre est chargée !\nFais pivoter avec ton doigt 🏠");

  } catch (err) {
    if (btn) btn.textContent = "📱 AR";
    const msg = err.name === "NotAllowedError"
      ? "❌ Permission caméra refusée\nVa dans Paramètres → Chrome → Caméra"
      : "❌ Caméra non disponible\n" + (err.message?.slice(0, 60) ?? "");
    _arToast(msg);
  }
}

// ───────────────────────────────────────────────────────────────
//  ARRÊT AR
// ───────────────────────────────────────────────────────────────
function _stopAR() {
  // Arrêter la caméra
  _cameraStream?.getTracks().forEach(t => t.stop());
  _videoEl?.remove();
  _arHintEl?.remove();
  _cameraStream = null;
  _videoEl      = null;
  _arHintEl     = null;

  // Restaurer la scène
  _renderer.setClearColor(0x0a0818, 1);
  _scene.background = savedBg;
  _scene.fog        = savedFog;

  // Désactiver OrbitControls (mode histoire = caméra automatique)
  if (_controls) _controls.enabled = false;

  arActive = false;

  const btn = document.getElementById("arBtn");
  if (btn) { btn.textContent = "📱 AR"; btn.classList.remove("active"); }

  const storyUI = document.getElementById("storyUI");
  if (storyUI) {
    storyUI.style.removeProperty("opacity");
    storyUI.style.removeProperty("pointer-events");
  }
}

// ───────────────────────────────────────────────────────────────
//  HELPERS UI
// ───────────────────────────────────────────────────────────────
function _showHint(text) {
  _arHintEl?.remove();
  _arHintEl = document.createElement("div");
  _arHintEl.style.cssText = `
    position:fixed;bottom:76px;left:50%;transform:translateX(-50%);
    background:rgba(10,8,24,0.82);border:1px solid rgba(255,208,128,0.3);
    border-radius:28px;padding:9px 20px;
    color:rgba(255,208,128,0.75);font-family:'DM Sans',sans-serif;
    font-size:12px;pointer-events:none;z-index:50;
    white-space:nowrap;letter-spacing:0.3px;
  `;
  _arHintEl.textContent = text;
  document.body.appendChild(_arHintEl);
}

let _toastEl = null;
function _arToast(text, duration = 4500) {
  _toastEl?.remove();
  _toastEl = document.createElement("div");
  _toastEl.style.cssText = `
    position:fixed;bottom:130px;left:50%;transform:translateX(-50%);
    background:rgba(10,8,24,0.94);
    border:1px solid rgba(255,208,128,0.4);
    border-radius:18px;padding:13px 22px;
    color:#ffd080;font-family:'DM Sans',sans-serif;
    font-size:14px;font-weight:500;line-height:1.55;
    backdrop-filter:blur(18px);z-index:400;
    pointer-events:none;text-align:center;
    max-width:82vw;white-space:pre-line;
    box-shadow:0 8px 32px rgba(0,0,0,0.4);
  `;
  _toastEl.textContent = text;
  document.body.appendChild(_toastEl);
  if (duration > 0)
    setTimeout(() => { _toastEl?.remove(); _toastEl = null; }, duration);
}
