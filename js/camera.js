// ═══════════════════════════════════════════════════════════════
//  camera.js — Système cinématique avancé
//  Morning Tale — Shake · Dolly · Focus · Rack
// ═══════════════════════════════════════════════════════════════

import * as THREE from "three";

// ── Références injectées depuis main.js ───────────────────────
let _camera = null;
let _controls = null;
let _renderer = null;

export function initCamera(camera, controls, renderer) {
  _camera = camera;
  _controls = controls;
  _renderer = renderer;
}

// ═══════════════════════════════════════════════════════════════
//  SHAKE — Tremblement de caméra
// ═══════════════════════════════════════════════════════════════
const shakeState = {
  active: false,
  intensity: 0,
  duration: 0,
  elapsed: 0,
  decay: true,
};

export function cameraShake(intensity = 0.05, duration = 0.5, decay = true) {
  shakeState.active = true;
  shakeState.intensity = intensity;
  shakeState.duration = duration;
  shakeState.elapsed = 0;
  shakeState.decay = decay;
}

// ═══════════════════════════════════════════════════════════════
//  RACK FOCUS — Profondeur de champ simulée via FOV
// ═══════════════════════════════════════════════════════════════
const fovTween = {
  active: false,
  from: 55,
  to: 55,
  duration: 1.0,
  t: 1,
};

export function tweenFOV(targetFOV, duration = 1.2) {
  if (!_camera) return;
  fovTween.from = _camera.fov;
  fovTween.to = targetFOV;
  fovTween.duration = duration;
  fovTween.t = 0;
  fovTween.active = true;
}

// ═══════════════════════════════════════════════════════════════
//  VIGNETTE + LETTERBOX — Post-process CSS
// ═══════════════════════════════════════════════════════════════
let vignetteEl = null;
let letterboxTop = null;
let letterboxBot = null;

export function initCinematicOverlays() {
  // Vignette
  vignetteEl = document.createElement("div");
  vignetteEl.id = "camVignette";
  vignetteEl.style.cssText = `
    position:fixed;inset:0;pointer-events:none;z-index:45;
    background:radial-gradient(ellipse at center,transparent 55%,rgba(0,0,0,0.75) 100%);
    opacity:0;transition:opacity 1.2s ease;
  `;
  document.body.appendChild(vignetteEl);

  // Letterbox (barres cinéma)
  const barStyle = `
    position:fixed;left:0;right:0;height:0;
    background:#000;z-index:44;
    transition:height 0.8s cubic-bezier(0.4,0,0.2,1);
  `;
  letterboxTop = document.createElement("div");
  letterboxTop.id = "lbTop";
  letterboxTop.style.cssText = barStyle + "top:0;";
  letterboxBot = document.createElement("div");
  letterboxBot.id = "lbBot";
  letterboxBot.style.cssText = barStyle + "bottom:0;";
  document.body.appendChild(letterboxTop);
  document.body.appendChild(letterboxBot);
}

export function setVignette(intensity = 1) {
  if (vignetteEl) vignetteEl.style.opacity = intensity;
}

export function setLetterbox(on = true) {
  const h = on ? "60px" : "0";
  if (letterboxTop) letterboxTop.style.height = h;
  if (letterboxBot) letterboxBot.style.height = h;
}

// ═══════════════════════════════════════════════════════════════
//  CHROMATIC ABERRATION — Aberration chromatique CSS
// ═══════════════════════════════════════════════════════════════
let chromaEl = null;

export function chromaFlash(duration = 0.4) {
  if (!chromaEl) {
    chromaEl = document.createElement("div");
    chromaEl.style.cssText = `
      position:fixed;inset:0;pointer-events:none;z-index:46;
      mix-blend-mode:screen;opacity:0;
      background:linear-gradient(90deg,rgba(255,0,0,0.08),transparent 30%,transparent 70%,rgba(0,100,255,0.08));
    `;
    document.body.appendChild(chromaEl);
  }
  chromaEl.style.opacity = "1";
  setTimeout(() => {
    chromaEl.style.transition = `opacity ${duration}s ease`;
    chromaEl.style.opacity = "0";
  }, 50);
}

// ═══════════════════════════════════════════════════════════════
//  FLASH — Éclair lumineux (blanc ou doré)
// ═══════════════════════════════════════════════════════════════
export function lightFlash(color = "#fff", duration = 0.35, intensity = 0.6) {
  const el = document.createElement("div");
  el.style.cssText = `
    position:fixed;inset:0;pointer-events:none;z-index:47;
    background:${color};opacity:${intensity};
    transition:opacity ${duration}s ease;
  `;
  document.body.appendChild(el);
  requestAnimationFrame(() => {
    el.style.opacity = "0";
    setTimeout(() => el.remove(), duration * 1000 + 50);
  });
}

// ═══════════════════════════════════════════════════════════════
//  DOLLY ZOOM — Effet Hitchcock (zoom FOV + recul caméra)
// ═══════════════════════════════════════════════════════════════
let dollyState = {
  active: false,
  t: 0,
  duration: 2.0,
  startFOV: 55,
  endFOV: 85,
  startDist: 0,
  endDist: 0,
  center: new THREE.Vector3(),
};

export function dollyZoom(centerPoint, fovStart, fovEnd, duration = 2.0) {
  if (!_camera) return;
  dollyState.active = true;
  dollyState.t = 0;
  dollyState.duration = duration;
  dollyState.startFOV = fovStart || _camera.fov;
  dollyState.endFOV = fovEnd;
  dollyState.center.set(...centerPoint);
  dollyState.startDist = _camera.position.distanceTo(dollyState.center);
  // Maintenir la taille apparente du sujet
  const ratio =
    Math.tan((fovStart / 2) * (Math.PI / 180)) /
    Math.tan((fovEnd / 2) * (Math.PI / 180));
  dollyState.endDist = dollyState.startDist * ratio;
}

// ═══════════════════════════════════════════════════════════════
//  ORBIT CINÉMATIQUE — Rotation automatique autour d'un point
// ═══════════════════════════════════════════════════════════════
const orbitCam = {
  active: false,
  center: new THREE.Vector3(),
  radius: 5,
  height: 3,
  speed: 0.4,
  angle: 0,
  duration: 0,
  elapsed: 0,
  onDone: null,
};

export function cinemaOrbit(center, radius, height, speed, duration, onDone) {
  orbitCam.active = true;
  orbitCam.center.set(...center);
  orbitCam.radius = radius;
  orbitCam.height = height;
  orbitCam.speed = speed;
  orbitCam.duration = duration;
  orbitCam.elapsed = 0;
  orbitCam.angle = 0;
  orbitCam.onDone = onDone;
}

// ═══════════════════════════════════════════════════════════════
//  PRESETS CINÉMATIQUES
// ═══════════════════════════════════════════════════════════════
export const CameraPresets = {
  wakeUp: {
    pos: [-1.5, 0.6, 0.5],
    look: [-2.5, 0.3, -1.5],
    fov: 75,
    label: "Réveil · vue subjective",
  },
  overShoulder: {
    pos: [-1.8, 1.8, 0.8],
    look: [-0.5, 1.5, -0.5],
    fov: 65,
    label: "Over shoulder",
  },
  windowGaze: {
    pos: [0.5, 1.8, -1.5],
    look: [2.0, 2.2, -4.8],
    fov: 50,
    label: "Regard fenêtre",
  },
  mirrorPOV: {
    pos: [2.8, 1.7, -2.0],
    look: [4.9, 1.8, -2.2],
    fov: 58,
    label: "Regard miroir",
  },
  birdEye: {
    pos: [0, 9, 0.01],
    look: [0, 0, 0],
    fov: 70,
    label: "Vue plongeante",
  },
  doorway: {
    pos: [-1.5, 1.4, 4.5],
    look: [0, 1.2, 0],
    fov: 62,
    label: "Depuis la porte",
  },
};

// ═══════════════════════════════════════════════════════════════
//  UPDATE — Appelé chaque frame depuis main.js
// ═══════════════════════════════════════════════════════════════
const _shakeOffset = new THREE.Vector3();

export function updateCamera(dt) {
  if (!_camera) return;

  // ── Shake ─────────────────────────────────────────────────
  if (shakeState.active) {
    shakeState.elapsed += dt;
    const progress = shakeState.elapsed / shakeState.duration;
    const intensity = shakeState.decay
      ? shakeState.intensity * (1 - progress)
      : shakeState.intensity;

    _shakeOffset.set(
      (Math.random() - 0.5) * intensity,
      (Math.random() - 0.5) * intensity,
      (Math.random() - 0.5) * intensity * 0.5,
    );
    _camera.position.add(_shakeOffset);

    if (shakeState.elapsed >= shakeState.duration) {
      shakeState.active = false;
    }
  }

  // ── FOV Tween ─────────────────────────────────────────────
  if (fovTween.active) {
    fovTween.t += dt / fovTween.duration;
    const e = easeInOut(Math.min(fovTween.t, 1));
    _camera.fov = THREE.MathUtils.lerp(fovTween.from, fovTween.to, e);
    _camera.updateProjectionMatrix();
    if (fovTween.t >= 1) fovTween.active = false;
  }

  // ── Dolly Zoom ────────────────────────────────────────────
  if (dollyState.active) {
    dollyState.t += dt / dollyState.duration;
    const e = easeInOut(Math.min(dollyState.t, 1));
    const fov = THREE.MathUtils.lerp(dollyState.startFOV, dollyState.endFOV, e);
    _camera.fov = fov;
    _camera.updateProjectionMatrix();

    // Ajuster la distance pour maintenir l'apparence du sujet
    const dist = THREE.MathUtils.lerp(
      dollyState.startDist,
      dollyState.endDist,
      e,
    );
    const dir = _camera.position.clone().sub(dollyState.center).normalize();
    _camera.position.copy(dollyState.center).addScaledVector(dir, dist);

    if (dollyState.t >= 1) dollyState.active = false;
  }

  // ── Orbit cinématique ─────────────────────────────────────
  if (orbitCam.active) {
    orbitCam.elapsed += dt;
    orbitCam.angle += dt * orbitCam.speed;
    _camera.position.set(
      orbitCam.center.x + Math.sin(orbitCam.angle) * orbitCam.radius,
      orbitCam.center.y + orbitCam.height,
      orbitCam.center.z + Math.cos(orbitCam.angle) * orbitCam.radius,
    );
    _camera.lookAt(orbitCam.center);

    if (orbitCam.elapsed >= orbitCam.duration) {
      orbitCam.active = false;
      orbitCam.onDone?.();
    }
  }
}

// ═══════════════════════════════════════════════════════════════
//  SCREENSHOT CINÉMATIQUE
// ═══════════════════════════════════════════════════════════════
export function cinematicScreenshot(
  filename = `morning-tale-${Date.now()}.png`,
) {
  if (!_renderer || !_camera) return;
  setLetterbox(true);
  setVignette(0.7);
  setTimeout(() => {
    _renderer.render(_renderer._scene, _camera);
    const url = _renderer.domElement.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => {
      setLetterbox(false);
      setVignette(0);
    }, 800);
  }, 900);
}

function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}
