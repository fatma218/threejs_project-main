// ═══════════════════════════════════════════════════════════════
//  story.js — Logique des 10 étapes + interactions réelles
//  Morning Tale
// ═══════════════════════════════════════════════════════════════

import * as THREE from "three";
import {
  tweenCamera,
  scene,
  sunLight,
  winGlow,
  ambientLight,
  screenLight,
  mirrorLight,
  moonLight,
} from "./main.js";
import { roomObjects } from "./room.js";
import {
  walkTo,
  doStandUp,
  doPickup,
  doSit,
  doHold,
  lookAt,
  character,
} from "./models.js";

// ── UI Elements ───────────────────────────────────────────────
const ui = {
  emoji: () => document.getElementById("storyEmoji"),
  title: () => document.getElementById("storyTitle"),
  sub: () => document.getElementById("storySub"),
  counter: () => document.getElementById("stepCounter"),
  progress: () => document.getElementById("progressFill"),
  nextBtn: () => document.getElementById("nextBtn"),
  blackout: () => document.getElementById("blackout"),
  final: () => document.getElementById("finalScreen"),
  hint: () => document.getElementById("interactHint"),
};

// ── État global ───────────────────────────────────────────────
let currentStep = -1;
let sunRiseActive = false,
  sunT = 0;
let screenOnActive = false,
  screenT = 0;
let mirrorActive = false,
  mirrorT = 0;
let doorOpenActive = false,
  doorT = 0;

// Référence au matériau écran (injecté depuis room.js si besoin)
export let screenMat = null;
export function setScreenMat(mat) {
  screenMat = mat;
}

// ═══════════════════════════════════════════════════════════════
//  DÉFINITION DES ÉTAPES
// ═══════════════════════════════════════════════════════════════
const STEPS = [
  // ── 0. NUIT ──────────────────────────────────────────────────
  {
    emoji: "🌙",
    title: "Bonne nuit…",
    sub: "La chambre est calme, la nuit est douce et silencieuse…",
    cam: { pos: [0, 5.5, 8.5], look: [0, 1.2, 0] },
    dur: 2.8,
    hint: null,
    onEnter() {
      fadeFromBlack();
      startAmbientSound();
    },
  },

  // ── 1. LEVER DU SOLEIL ───────────────────────────────────────
  {
    emoji: "☀️",
    title: "Le soleil se lève…",
    sub: "Une lumière dorée entre doucement par la fenêtre",
    cam: { pos: [0, 2.5, 4.0], look: [0, 2.1, -4.5] },
    dur: 3.2,
    hint: null,
    onEnter() {
      sunRiseActive = true;
      sunT = 0;
    },
  },

  // ── 2. SE LEVER DU LIT ───────────────────────────────────────
  {
    emoji: "🛏️",
    title: "Le réveil sonne !",
    sub: "Clique sur le lit pour te lever !",
    cam: { pos: [-0.8, 1.8, 2.0], look: [-2.2, 1.0, -1.0] },
    dur: 2.2,
    hint: "👆 Clique sur le lit",
    onEnter() {
      registerInteract("bed", () => {
        doStandUp(() => {
          walkTo([-2.2, 0, -0.5], 0.8);
          setTimeout(() => enableNext(), 1200);
        });
      });
    },
  },

  // ── 3. BOIRE DE L'EAU ────────────────────────────────────────
  {
    emoji: "💧",
    title: "Un verre d'eau frais",
    sub: "Clique sur le verre pour boire !",
    cam: { pos: [-2.4, 1.6, 2.8], look: [-3.75, 1.1, 1.4] },
    dur: 2.0,
    hint: "👆 Clique sur le verre",
    onEnter() {
      walkTo([-3.6, 0, 1.2], 1.8, () => {
        registerInteract("glass", () => {
          doPickup(() => {
            animateGlassDrink();
            setTimeout(() => enableNext(), 2500);
          });
        });
      });
    },
  },

  // ── 4. ARROSER LA PLANTE ─────────────────────────────────────
  {
    emoji: "🪴",
    title: "Arroser la plante",
    sub: "Clique sur la plante pour l'arroser 🌿",
    cam: { pos: [1.4, 1.8, -1.2], look: [3.2, 1.0, -3.2] },
    dur: 2.4,
    hint: "👆 Clique sur la plante",
    onEnter() {
      walkTo([3.0, 0, -3.0], 2.2, () => {
        registerInteract("plant", () => {
          doPickup(() => {
            animatePlantWater();
            setTimeout(() => enableNext(), 2800);
          });
        });
      });
    },
  },

  // ── 5. SE LAVER ──────────────────────────────────────────────
  {
    emoji: "🚿",
    title: "Se laver le visage",
    sub: "Clique sur le lavabo pour te laver",
    cam: { pos: [1.6, 1.6, 0.2], look: [3.6, 1.4, -1.2] },
    dur: 2.0,
    hint: "👆 Clique sur le lavabo",
    onEnter() {
      walkTo([3.3, 0, -1.0], 2.0, () => {
        registerInteract("sink", () => {
          doHold();
          animateWaterFlow();
          setTimeout(() => enableNext(), 3000);
        });
      });
    },
  },

  // ── 6. MIROIR ────────────────────────────────────────────────
  {
    emoji: "🪞",
    title: "Le miroir du matin",
    sub: "Clique sur le miroir pour te regarder",
    cam: { pos: [1.4, 1.6, -1.4], look: [3.94, 1.7, -2.2] },
    dur: 2.0,
    hint: "👆 Clique sur le miroir",
    onEnter() {
      walkTo([3.4, 0, -2.0], 1.6, () => {
        lookAt([3.94, 1.8, -2.2]);
        registerInteract("mirror", () => {
          mirrorActive = true;
          mirrorT = 0;
          showMessage("Tu es prêt(e) pour cette belle journée ! ✨");
          setTimeout(() => enableNext(), 2500);
        });
      });
    },
  },

  // ── 7. BUREAU / ORDINATEUR ───────────────────────────────────
  {
    emoji: "💻",
    title: "L'agenda du jour",
    sub: "Clique sur le bureau pour vérifier le planning",
    cam: { pos: [0.4, 1.6, 3.5], look: [2.2, 1.4, 1.8] },
    dur: 2.2,
    hint: "👆 Clique sur le bureau",
    onEnter() {
      walkTo([2.2, 0, 2.6], 2.0, () => {
        doSit();
        registerInteract("desk", () => {
          screenOnActive = true;
          screenT = 0;
          showMessage("Planning chargé… bonne journée productive ! 📅");
          setTimeout(() => enableNext(), 3000);
        });
      });
    },
  },

  // ── 8. ARMOIRE ───────────────────────────────────────────────
  {
    emoji: "👗",
    title: "Choisir sa tenue",
    sub: "Clique sur l'armoire pour changer de vêtements",
    cam: { pos: [-1.4, 1.6, -1.0], look: [-3.4, 1.4, -3.5] },
    dur: 2.2,
    hint: "👆 Clique sur l'armoire",
    onEnter() {
      walkTo([-3.0, 0, -3.2], 2.2, () => {
        registerInteract("wardrobe", () => {
          animateWardrobeOpen();
          doPickup(() => {
            showMessage("Belle tenue choisie ! 👗✨");
            setTimeout(() => enableNext(), 2500);
          });
        });
      });
    },
  },

  // ── 9. SORTIR ────────────────────────────────────────────────
  {
    emoji: "🚪",
    title: "✨ Good Morning!",
    sub: "Clique sur la porte pour commencer la journée !",
    cam: { pos: [-2.0, 1.8, 2.8], look: [0, 1.5, 4.5] },
    dur: 2.2,
    hint: "👆 Clique sur la porte",
    onEnter() {
      walkTo([0, 0, 3.0], 2.2, () => {
        registerInteract("door", () => {
          doorOpenActive = true;
          doorT = 0;
          walkTo([0, 0, 4.8], 2.0, showFinalScreen);
        });
      });
    },
  },
];

// ═══════════════════════════════════════════════════════════════
//  INTERACTION — Système d'écoute
// ═══════════════════════════════════════════════════════════════
let pendingInteract = null;

function registerInteract(key, callback) {
  pendingInteract = { key, callback };
  showHint(STEPS[currentStep]?.hint);
}

// Écouter les events du raycaster (room.js dispatch des CustomEvents)
window.addEventListener("story:interact", (e) => {
  if (pendingInteract && e.detail === pendingInteract.key) {
    pendingInteract = null;
    hideHint();
    ui.nextBtn()?.setAttribute("disabled", "true");
    pendingInteract?.callback?.();
    // Appel direct
    const cb = pendingInteract; // déjà null ici, utiliser closure
  }
});

// Ré-écriture correcte :
window.addEventListener("story:interact", (e) => {
  if (!pendingInteract) return;
  if (e.detail !== pendingInteract.key) return;
  const cb = pendingInteract.callback;
  pendingInteract = null;
  hideHint();
  ui.nextBtn()?.setAttribute("disabled", "true");
  cb?.();
});

// ═══════════════════════════════════════════════════════════════
//  NAVIGATION
// ═══════════════════════════════════════════════════════════════
export function initStory() {
  ui.nextBtn()?.addEventListener("click", () => {
    if (currentStep < STEPS.length - 1) goToStep(currentStep + 1);
  });
  goToStep(0);
}

function goToStep(i) {
  if (i >= STEPS.length) return;
  currentStep = i;
  pendingInteract = null;

  const s = STEPS[i];
  // UI
  if (ui.emoji()) ui.emoji().textContent = s.emoji;
  if (ui.title()) ui.title().textContent = s.title;
  if (ui.sub()) ui.sub().textContent = s.sub;
  if (ui.counter()) ui.counter().textContent = `${i} / ${STEPS.length - 1}`;
  if (ui.progress())
    ui.progress().style.width = `${(i / (STEPS.length - 1)) * 100}%`;

  // Désactiver le bouton pendant la transition caméra
  ui.nextBtn()?.setAttribute("disabled", "true");

  // Tween caméra
  tweenCamera(s.cam.pos, s.cam.look, s.dur, () => {
    // Réactiver seulement si pas d'interaction obligatoire
    if (!s.hint) enableNext();
  });

  // Logique de l'étape
  s.onEnter?.();
}

export function enableNext() {
  if (currentStep >= STEPS.length - 1) return;
  ui.nextBtn()?.removeAttribute("disabled");
}

// ═══════════════════════════════════════════════════════════════
//  UPDATE (appelé depuis main.js chaque frame)
// ═══════════════════════════════════════════════════════════════
export function updateStory(dt, t) {
  // ── Lever du soleil ──
  if (sunRiseActive) {
    sunT += dt * 0.15;
    const e = easeInOut(Math.min(sunT, 1));

    sunLight.intensity = e * 2.0;
    winGlow.intensity = e * 4.0;
    ambientLight.intensity = 2.2 + e * 1.8;
    ambientLight.color.setHSL(0.1, 0.3 * e, 0.04 + e * 0.28);
    moonLight.color.setHSL(0.62 - e * 0.5, 0.6, 0.3 + e * 0.2);

    // Couleur fond
    const bg = new THREE.Color().setHSL(0.08 * e, 0.3 * e, 0.02 + e * 0.28);
    scene.background = bg;
    scene.fog.color = bg;

    if (sunT >= 1) sunRiseActive = false;
  }

  // ── Écran ordinateur ──
  if (screenOnActive) {
    screenT += dt * 0.9;
    const e = easeInOut(Math.min(screenT, 1));
    screenLight.intensity = e * 1.4;
    if (screenT >= 1) screenOnActive = false;
  }
  // Pulsation écran
  if (!screenOnActive && screenT >= 1) {
    screenLight.intensity = 1.2 + Math.sin(t * 1.8) * 0.18;
  }

  // ── Miroir shimmer ──
  if (mirrorActive) {
    mirrorT += dt * 2.2;
    mirrorLight.intensity = Math.abs(Math.sin(mirrorT)) * 2.0;
    if (mirrorT > Math.PI * 2) {
      mirrorActive = false;
      mirrorLight.intensity = 0;
    }
  }

  // ── Porte qui s'ouvre ──
  if (doorOpenActive && roomObjects.door) {
    doorT += dt * 1.0;
    const e = easeInOut(Math.min(doorT, 1));
    roomObjects.door.rotation.y = -e * (Math.PI * 0.75);
    if (doorT >= 1) doorOpenActive = false;
  }
}

// ═══════════════════════════════════════════════════════════════
//  ANIMATIONS D'OBJETS
// ═══════════════════════════════════════════════════════════════

function animateGlassDrink() {
  if (!roomObjects.glass) return;
  const g = roomObjects.glass;
  let t = 0;
  const interval = setInterval(() => {
    t += 0.05;
    g.rotation.x = Math.sin(t * 3) * 0.5 * Math.max(0, 1 - t / 2);
    g.position.y = 0.68 + Math.sin(t * 3) * 0.15 * Math.max(0, 1 - t / 2);
    if (t > 2.5) {
      clearInterval(interval);
      g.rotation.x = 0;
      g.position.y = 0.68;
    }
  }, 16);
}

function animatePlantWater() {
  if (!roomObjects.plant) return;
  // Légère vibration de la plante
  const p = roomObjects.plant;
  let t = 0;
  const interval = setInterval(() => {
    t += 0.05;
    p.rotation.z = Math.sin(t * 8) * 0.03 * Math.max(0, 1 - t / 2);
    if (t > 2.0) {
      clearInterval(interval);
      p.rotation.z = 0;
    }
  }, 16);
}

function animateWaterFlow() {
  if (!roomObjects.sink) return;
  // Flash bleu sur le lavabo
  const light = new THREE.PointLight(0x66ccff, 3, 1.5);
  if (roomObjects.sink) {
    light.position
      .copy(roomObjects.sink.position)
      .add(new THREE.Vector3(0, 1.2, 0));
  }
  scene.add(light);
  let t = 0;
  const interval = setInterval(() => {
    t += 0.05;
    light.intensity = 2 + Math.sin(t * 10) * 1;
    if (t > 3.0) {
      clearInterval(interval);
      scene.remove(light);
    }
  }, 16);
}

function animateWardrobeOpen() {
  if (!roomObjects.wardrobe) return;
  const w = roomObjects.wardrobe;
  let t = 0;
  const start = w.rotation.y;
  const interval = setInterval(() => {
    t += 0.02;
    const e = easeInOut(Math.min(t, 1));
    w.rotation.y = start + e * 0.8;
    if (t >= 1) clearInterval(interval);
  }, 16);
}

// ═══════════════════════════════════════════════════════════════
//  UI HELPERS
// ═══════════════════════════════════════════════════════════════

function showHint(text) {
  if (!text) return;
  const el = ui.hint();
  if (el) {
    el.textContent = text;
    el.style.opacity = "1";
  }
}

function hideHint() {
  const el = ui.hint();
  if (el) el.style.opacity = "0";
}

function showMessage(msg) {
  const el = ui.sub();
  if (el) {
    el.style.transition = "opacity 0.3s";
    el.style.opacity = "0";
    setTimeout(() => {
      el.textContent = msg;
      el.style.opacity = "1";
    }, 300);
  }
}

function showFinalScreen() {
  ui.final()?.classList.add("show");
  // Flash lumineux final
  const bl = ui.blackout();
  if (bl) {
    bl.style.background = "rgba(255,240,200,1)";
    bl.style.opacity = "0.5";
    setTimeout(() => {
      bl.style.opacity = "0";
    }, 1400);
  }
}

function fadeFromBlack() {
  const el = ui.blackout();
  if (el) {
    setTimeout(() => {
      el.style.opacity = "0";
    }, 300);
  }
}

// ── Sons ─────────────────────────────────────────────────────
function startAmbientSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    // Drone doux
    [
      [130, 0.03],
      [196, 0.015],
      [261, 0.01],
    ].forEach(([f, g]) => {
      const o = ctx.createOscillator();
      const gn = ctx.createGain();
      o.type = "sine";
      o.frequency.value = f;
      gn.gain.value = 0;
      o.connect(gn);
      gn.connect(ctx.destination);
      o.start();
      gn.gain.linearRampToValueAtTime(g, ctx.currentTime + 4);
    });
    // Oiseaux simulés
    function chirp() {
      const o = ctx.createOscillator(),
        g = ctx.createGain();
      o.frequency.value = 1600 + Math.random() * 900;
      g.gain.value = 0.05;
      o.connect(g);
      g.connect(ctx.destination);
      o.start();
      o.stop(ctx.currentTime + 0.07);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.07);
      setTimeout(chirp, 900 + Math.random() * 2500);
    }
    setTimeout(chirp, 3000);
  } catch (e) {}
}

function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}
