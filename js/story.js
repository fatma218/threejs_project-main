// ═══════════════════════════════════════════════════════════════
//  story.js — Logique des 10 étapes + interactions enrichies
//  Morning Tale — Version Animations Avancées
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
  lampLight,
} from "./core/SceneGlobals.js";
import { roomObjects } from "./room.js";
import {
  walkTo,
  doWakeUp,
  doStandUp,
  doPickup,
  doSit,
  doHold,
  lookAt,
  character,
  playAnimation,
  initSleepingPose,
} from "./models.js";
import { EventBus } from "./core/EventBus.js";
import {
  cameraShake,
  tweenFOV,
  lightFlash,
  chromaFlash,
  setVignette,
  setLetterbox,
  cinemaOrbit,
} from "./camera.js";
import {
  createSunRays,
  createDustParticles,
  sparkBurst,
  createWaterDrips,
  createFireflies,
  lightRingPulse,
  createSteam,
  updateEffects,
} from "./effects.js";

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
let curtainWaveT = 0;
let wardrobeColorIndex = -1;
let clothingPaletteEl = null;
const clothingColorOptions = [
  "#ffb6c1",
  "#88ccff",
  "#9ae85a",
  "#ffdd66",
  "#d4a6f5",
  "#f4a261",
  "#9c89b8",
];

// Effets persistants
let sunRays = null;
let dustParticles = null;
let fireflies = null;

// Horloge
let clockTick = 0;
const clockEl = createClockOverlay();

// ═══════════════════════════════════════════════════════════════
//  CLOCK OVERLAY — Réveil animé
// ═══════════════════════════════════════════════════════════════
function createClockOverlay() {
  const el = document.createElement("div");
  el.id = "storyClockOverlay";
  el.style.cssText = `
    position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) scale(0.8);
    pointer-events:none;z-index:51;opacity:0;transition:all 0.5s ease;
    font-family:'Cormorant Garamond',serif;font-size:clamp(60px,12vw,110px);
    color:#ffd080;text-shadow:0 0 40px rgba(240,168,80,0.8),0 0 80px rgba(240,168,80,0.4);
    letter-spacing:8px;font-weight:300;
  `;
  el.textContent = "07:00";
  document.body.appendChild(el);
  return el;
}

function showClock(time = "07:00") {
  clockEl.textContent = time;
  clockEl.style.opacity = "1";
  clockEl.style.transform = "translate(-50%,-50%) scale(1)";
}
function hideClock() {
  clockEl.style.opacity = "0";
  clockEl.style.transform = "translate(-50%,-50%) scale(1.1)";
}

// ═══════════════════════════════════════════════════════════════
//  TOAST NOTIFICATION
// ═══════════════════════════════════════════════════════════════
function showToast(emoji, text, duration = 2800) {
  const existing = document.getElementById("storyToast");
  if (existing) existing.remove();

  const toast = document.createElement("div");
  toast.id = "storyToast";
  toast.innerHTML = `<span style="font-size:22px">${emoji}</span><span>${text}</span>`;
  toast.style.cssText = `
    position:fixed;bottom:160px;left:50%;transform:translateX(-50%) translateY(20px);
    background:rgba(10,8,24,0.9);border:1px solid rgba(240,168,80,0.4);
    border-radius:24px;padding:12px 24px;color:#ffd080;
    font-family:'DM Sans',sans-serif;font-size:14px;font-weight:500;
    display:flex;align-items:center;gap:10px;
    backdrop-filter:blur(16px);z-index:55;
    opacity:0;transition:all 0.35s cubic-bezier(0.16,1,0.3,1);
    pointer-events:none;
  `;
  document.body.appendChild(toast);
  requestAnimationFrame(() => {
    toast.style.opacity = "1";
    toast.style.transform = "translateX(-50%) translateY(0)";
  });
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(-50%) translateY(-12px)";
    setTimeout(() => toast.remove(), 400);
  }, duration);
}

// ═══════════════════════════════════════════════════════════════
//  DÉFINITION DES ÉTAPES — 10 étapes enrichies
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
      initSleepingPose();
      fadeFromBlack();
      startAmbientSound();
      setVignette(0.8);
      // Lucioles nocturnes
      fireflies = createFireflies(8);
      // Poussière ambiante
      dustParticles = createDustParticles(200);
      // Lampe de chevet pulsante
      animateLampPulse();
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
      // Rayons de soleil
      setTimeout(() => {
        sunRays = createSunRays();
        setVignette(0.3);
      }, 1500);
      // Supprimer les lucioles
      if (fireflies && fireflies.parent) scene.remove(fireflies);
      // Aberration chromatique au lever
      setTimeout(() => chromaFlash(1.5), 800);
      // Son de réveil (oiseaux)
      playSunriseSound();
      tweenFOV(52, 3.0);
    },
  },

  // ── 2. SE LEVER DU LIT ───────────────────────────────────────
  {
    emoji: "🛏️",
    title: "Le réveil sonne !",
    sub: "Clique sur le réveil pour arrêter l'alarme !",
    cam: { pos: [-0.8, 1.8, 2.0], look: [-2.2, 1.0, -1.0] },
    dur: 2.2,
    hint: "👆 Clique sur le réveil",
    onEnter() {
      // Afficher l'heure
      showClock("07:00");
      // Animation réveil (horloge sonne)
      animateAlarmClock();
      // Sonnerie
      playAlarmSound();

      registerInteract("clock", () => {
        hideClock();
        cameraShake(0.04, 0.6);
        lightFlash("rgba(255,220,180,0.3)", 0.4);

        doWakeUp(() => {
          playWakeUpSound();
          walkTo([-1.8, 0, -2.7], 3.0, () => {
            sparkBurst(
              roomObjects.bed?.position || new THREE.Vector3(-2.8, 1, -3.5),
              0xffd080,
              20,
            );
            showToast("🌅", "Debout ! Une nouvelle journée commence !");
            setTimeout(() => enableNext(), 1400);
          });
        });
      });
    },
  },

  // ── 3. BOIRE DE L'EAU ────────────────────────────────────────
  {
    emoji: "💧",
    title: "Un verre d'eau frais",
    sub: "Clique sur le verre pour t'hydrater !",
    cam: { pos: [-2.4, 1.6, 2.8], look: [-3.75, 1.1, 1.4] },
    dur: 2.0,
    hint: "👆 Clique sur le verre",
    onEnter() {
      tweenFOV(65, 1.5);
      const glassPos =
        roomObjects.glass?.position || new THREE.Vector3(-0.8, 0.1, -3.2);
      this.cam.look = [glassPos.x, glassPos.y + 0.1, glassPos.z];
      lightRingPulse(glassPos);
      registerInteract("glass", () => {
        // Marcher jusqu'au verre, puis boire à l'arrivée
        const glassPos =
          roomObjects.glass?.position || new THREE.Vector3(-0.8, 0, -3.2);
        walkTo([glassPos.x + 0.4, 0, glassPos.z + 0.5], 1.2, () => {
          lookAt([glassPos.x, glassPos.y, glassPos.z]);
          doPickup(() => {
            playWaterDrinkSound();
            animateGlassDrink();
            createWaterDrips(
              glassPos.clone().add(new THREE.Vector3(0, -0.1, 0)),
              10,
              1.5,
            );
            showToast("💧", "Aaah ! L'eau fraîche du matin !");
            sparkBurst(
              glassPos.clone().add(new THREE.Vector3(0, 0.2, 0)),
              0x88ccff,
              16,
            );
            setTimeout(() => enableNext(), 2500);
          });
        });
      });
    },
  },
  {
    emoji: "🪴",
    title: "Arroser la plante",
    sub: "Clique sur la plante pour l'arroser 🌿",
    cam: { pos: [1.4, 1.8, -1.2], look: [3.2, 1.0, -3.2] },
    dur: 2.4,
    hint: "👆 Clique sur la plante",
    onEnter() {
      tweenFOV(60, 1.8);
      const plantPos =
        roomObjects.plant?.position || new THREE.Vector3(3.5, 0, 3.5);
      this.cam.look = [plantPos.x, plantPos.y + 0.1, plantPos.z];
      lightRingPulse(plantPos);
      registerInteract("plant", () => {
        const target = plantPos.clone();
        walkTo([target.x - 0.6, 0, target.z + 0.6], 1.0, () => {
          lookAt([target.x, target.y, target.z]);
          doPickup(() => {
            playWateringSound();
            animatePlantWater();
            sparkBurst(
              target.clone().add(new THREE.Vector3(0, 1.3, 0)),
              0x66cc44,
              20,
            );
            createWaterDrips(
              target.clone().add(new THREE.Vector3(0, 0.5, 0)),
              8,
              1.5,
            );
            animatePlantGrow();
            showToast("🌿", "La plante est heureuse ! Elle va pousser !");
            setTimeout(() => enableNext(), 2800);
          });
        });
      });
    },
  },

  {
    emoji: "🚿",
    title: "Se laver le visage",
    sub: "Clique sur le lavabo pour te laver",
    cam: { pos: [1.6, 1.6, 0.2], look: [3.6, 1.4, -1.2] },
    dur: 2.0,
    hint: "👆 Clique sur le lavabo",
    onEnter() {
      tweenFOV(68, 1.5);
      const sinkPos =
        roomObjects.sink?.position || new THREE.Vector3(4.1, 0, -1.8);
      this.cam.look = [sinkPos.x, sinkPos.y + 0.1, sinkPos.z];
      lightRingPulse(sinkPos);
      registerInteract("sink", () => {
        walkTo([sinkPos.x - 0.8, 0, sinkPos.z + 0.4], 1.8, () => {
          lookAt([sinkPos.x, sinkPos.y + 0.8, sinkPos.z]);
          doHold();
          playFaucetSound();
          animateWaterFlow();
          createSteam(sinkPos.clone().add(new THREE.Vector3(0, 1.0, 0)), 3.0);
          createWaterDrips(
            sinkPos.clone().add(new THREE.Vector3(0, 0.8, 0)),
            14,
            3.0,
          );
          animateWaterLight();
          showToast("🚿", "L'eau fraîche réveille les sens !");
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
      tweenFOV(55, 1.5);
      const mirrorPos =
        roomObjects.mirror?.position || new THREE.Vector3(4.94, 0, -1.0);
      this.cam.look = [mirrorPos.x, mirrorPos.y + 0.1, mirrorPos.z];
      lightRingPulse(mirrorPos);
      registerInteract("mirror", () => {
        walkTo([3.4, 0, -2.0], 1.6, () => {
          lookAt([mirrorPos.x, mirrorPos.y + 1.8, mirrorPos.z]);
          mirrorActive = true;
          mirrorT = 0;
          playMirrorSound();
          sparkBurst(
            mirrorPos.clone().add(new THREE.Vector3(0, 1.9, 0)),
            0xeeeeff,
            30,
          );
          lightFlash("rgba(200,220,255,0.4)", 0.6);
          chromaFlash(0.8);
          tweenFOV(48, 1.5);
          showToast("✨", "Tu es magnifique ! Prêt(e) pour cette journée !");
          showMessage("Tu es prêt(e) pour cette belle journée ! ✨");
          setTimeout(() => {
            tweenFOV(55, 1.0);
            enableNext();
          }, 2500);
        });
      });
    },
  },

  // ── 7. BUREAU / ORDINATEUR ───────────────────────────────────
  {
    emoji: "💻",
    title: "L'agenda du jour",
    sub: "Clique sur la chaise pour t'asseoir et vérifier le planning",
    cam: { pos: [0.4, 1.6, 3.5], look: [2.2, 1.4, 1.8] },
    dur: 2.2,
    hint: "👆 Clique sur la chaise",
    onEnter() {
      tweenFOV(58, 1.5);
      const chairPos =
        roomObjects.chair?.position || new THREE.Vector3(2.8, 0, 1.5);
      this.cam.look = [chairPos.x, chairPos.y + 0.1, chairPos.z];
      lightRingPulse(chairPos);
      registerInteract("chair", () => {
        walkTo([chairPos.x, 0, chairPos.z], 2.0, () => {
          lookAt([chairPos.x, chairPos.y + 0.5, chairPos.z]);
          doSit();
          screenOnActive = true;
          screenT = 0;
          lightFlash("rgba(80,140,255,0.3)", 0.4);
          chromaFlash(0.5);
          sparkBurst(
            chairPos.clone().add(new THREE.Vector3(0, 1.1, 0)),
            0x4488ff,
            22,
          );
          tweenFOV(62, 1.0);
          showTypingAnimation();
          playKeyboardSound();
          showToast(
            "📅",
            "Planning du jour chargé — journée productive en vue !",
          );
          setTimeout(() => {
            tweenFOV(58, 1.0);
            enableNext();
          }, 3000);
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
      tweenFOV(60, 1.5);
      const wardrobePos =
        roomObjects.wardrobe?.position || new THREE.Vector3(-4.2, 0, -1.0);
      this.cam.look = [wardrobePos.x, wardrobePos.y + 0.1, wardrobePos.z];
      lightRingPulse(wardrobePos);
      registerInteract("wardrobe", () => {
        walkTo([wardrobePos.x + 1.0, 0, wardrobePos.z + 0.6], 2.2, () => {
          lookAt([wardrobePos.x, wardrobePos.y + 1.0, wardrobePos.z]);
          playWardrobeSound();
          showClothingColorPalette();
        });
      });
    },
  },

  // ── 9. SORTIR ────────────────────────────────────────────────
  {
    emoji: "🚪",
    title: "✨ Good Morning!",
    sub: "Clique sur la porte pour commencer la journée !",
    cam: { pos: [-2.0, 1.8, 2.8], look: [-1.5, 1.5, 4.5] },
    dur: 2.2,
    hint: "👆 Clique sur la porte",
    onEnter() {
      tweenFOV(65, 1.5);
      setLetterbox(true);
      const doorPos = roomObjects.door?.position || new THREE.Vector3(-2.0, 0, 4.98);
      const doorX = doorPos.x + 0.5; // centre de l'ouverture de la porte
      const doorZ = doorPos.z;

      // Marcher exactement devant la porte, puis se tourner vers elle
      walkTo([doorX, 0, doorZ - 0.7], 2.2, () => {
        lookAt([doorX, 1.05, doorZ]);
        lightRingPulse(new THREE.Vector3(doorX, 0, doorZ));
        registerInteract("door", () => {
          doorOpenActive = true;
          doorT = 0;
          playDoorOpenSound();
          // Lumière dorée inondante
          lightFlash("rgba(255,220,120,0.6)", 1.2, 0.7);
          // Grand flash blanc — sortie
          setTimeout(() => {
            lightFlash("#ffffff", 0.8, 0.9);
            sparkBurst(new THREE.Vector3(doorX, 1.2, doorZ + 0.3), 0xffd080, 50);
            cameraShake(0.02, 0.5);
          }, 600);
          walkTo([doorX, 0, doorZ + 0.6], 2.0, showFinalScreen);
        });
      });
    },
  },
];

// ═══════════════════════════════════════════════════════════════
//  ANIMATIONS D'OBJETS — enrichies
// ═══════════════════════════════════════════════════════════════

// Réveil qui sonne
function animateAlarmClock() {
  // Shake du réveil
  const clk = roomObjects.clock || scene.getObjectByName?.("clock");
  let baseY = clk?.position?.y ?? 0;
  let t = 0;
  const iv = setInterval(() => {
    t += 0.1;
    if (t > 4) {
      if (clk) {
        clk.rotation.z = 0;
        clk.position.y = baseY;
      }
      clearInterval(iv);
      return;
    }

    if (clk) {
      clk.rotation.z = Math.sin(t * 20) * 0.06;
      clk.position.y = baseY + Math.abs(Math.sin(t * 25)) * 0.02;
    }

    // Son simulation visuelle
    const intensity = Math.sin(t * 20) > 0 ? 1 : 0.3;
    // Flash doré de la lampe de chevet
    if (lampLight) lampLight.intensity = 1.6 + Math.sin(t * 25) * 0.8;
  }, 16);
}

// Lampe qui pulse doucement la nuit
function animateLampPulse() {
  let t = 0;
  const iv = setInterval(() => {
    t += 0.02;
    if (!lampLight) return;
    // Flame flicker effect
    lampLight.intensity =
      1.6 + Math.sin(t * 1.1) * 0.08 + Math.sin(t * 7.3) * 0.04;
    lampLight.color.setHSL(0.07 + Math.sin(t * 0.3) * 0.02, 0.9, 0.55);
  }, 16);
}

// Verre d'eau animé avec rebond
function animateGlassDrink() {
  if (!roomObjects.glass) return;
  const g = roomObjects.glass;
  let t = 0;
  const iv = setInterval(() => {
    t += 0.05;
    g.rotation.x = Math.sin(t * 3) * 0.5 * Math.max(0, 1 - t / 2);
    g.position.y = 0.68 + Math.sin(t * 3) * 0.15 * Math.max(0, 1 - t / 2);
    // Fade out the water level
    const waterChild = g.children[1];
    if (waterChild) {
      waterChild.scale.y = Math.max(0.1, 1 - t * 0.3);
    }
    if (t > 2.5) {
      clearInterval(iv);
      g.rotation.x = 0;
      g.position.y = 0.68;
    }
  }, 16);
}

// Plante arrosée — vibration + flash vert
function animatePlantWater() {
  if (!roomObjects.plant) return;
  const p = roomObjects.plant;
  let t = 0;
  const iv = setInterval(() => {
    t += 0.05;
    p.rotation.z = Math.sin(t * 8) * 0.04 * Math.max(0, 1 - t / 2);
    p.rotation.x = Math.sin(t * 6 + 1) * 0.02 * Math.max(0, 1 - t / 2);
    if (t > 2.0) {
      clearInterval(iv);
      p.rotation.z = 0;
      p.rotation.x = 0;
    }
  }, 16);
}

// Plante qui grandit légèrement
function animatePlantGrow() {
  if (!roomObjects.plant) return;
  const p = roomObjects.plant;
  const startScale = p.scale.clone();
  let t = 0;
  const iv = setInterval(() => {
    t += 0.02;
    const boost = 1 + Math.sin(t * Math.PI) * 0.08;
    p.scale.copy(startScale).multiplyScalar(boost);
    if (t >= 1) {
      clearInterval(iv);
      p.scale.copy(startScale);
    }
  }, 16);
}

// Flux d'eau — lumière animée
function animateWaterFlow() {
  const light = new THREE.PointLight(0x66ccff, 3, 2.0);
  const sinkPos = roomObjects.sink?.position || new THREE.Vector3(4.1, 0, -1.8);
  light.position.copy(sinkPos).add(new THREE.Vector3(0, 1.2, 0));
  scene.add(light);
  let t = 0;
  const iv = setInterval(() => {
    t += 0.05;
    light.intensity = 2.5 + Math.sin(t * 12) * 1.5 + Math.sin(t * 7) * 0.5;
    light.color.setHSL(0.57 + Math.sin(t * 2) * 0.04, 0.9, 0.65);
    if (t > 3.0) {
      clearInterval(iv);
      scene.remove(light);
    }
  }, 16);
}

// Lumière eau animée sur le mur
function animateWaterLight() {
  const caustic = new THREE.PointLight(0x88ddff, 0, 3);
  caustic.position.set(4.5, 2.0, -1.5);
  scene.add(caustic);
  let t = 0;
  const iv = setInterval(() => {
    t += 0.04;
    caustic.intensity = Math.abs(Math.sin(t * 8)) * 1.5;
    caustic.position.x = 4.5 + Math.sin(t * 5) * 0.3;
    caustic.position.z = -1.5 + Math.cos(t * 4) * 0.2;
    if (t > 3.0) {
      clearInterval(iv);
      scene.remove(caustic);
    }
  }, 16);
}

// Armoire qui s'ouvre avec effet élastique
function animateWardrobeOpen() {
  if (!roomObjects.wardrobe) return;
  const w = roomObjects.wardrobe;
  let t = 0;
  const startY = w.rotation.y;
  const iv = setInterval(() => {
    t += 0.018;
    // Elastic easing
    const e = elasticOut(Math.min(t, 1));
    w.rotation.y = startY + e * 0.9;
    if (t >= 1.2) {
      clearInterval(iv);
    }
  }, 16);
}

function setCharacterClothingColor(hex) {
  if (!character) return;
  character.traverse((child) => {
    if (!child.isMesh || !child.material) return;
    const mats = Array.isArray(child.material)
      ? child.material
      : [child.material];
    mats.forEach((mat) => {
      if (!mat.color) return;
      const name = (mat.name || "").toLowerCase();
      if (
        /(skin|hair|eye|teeth|face|mouth|lens|sole|shoe|metal|glass)/.test(name)
      )
        return;
      mat.color.set(hex);
    });
  });
}

function showClothingColorPalette() {
  hideClothingColorPalette();
  clothingPaletteEl = document.createElement("div");
  clothingPaletteEl.id = "storyClothingPalette";
  clothingPaletteEl.style.cssText = `
    position:fixed;left:50%;top:22%;transform:translateX(-50%);
    background:rgba(10,10,20,0.96);border:1px solid rgba(255,255,255,0.08);
    border-radius:22px;padding:16px 18px;display:flex;flex-wrap:wrap;
    gap:12px;align-items:center;justify-content:center;z-index:60;
    box-shadow:0 24px 80px rgba(0,0,0,0.35);
    max-width:86vw;backdrop-filter:blur(18px);
  `;

  const label = document.createElement("div");
  label.textContent = "Choisis la couleur de ta tenue";
  label.style.cssText = `
    width:100%;color:#f0d080;font-size:14px;font-weight:600;
    text-align:center;margin-bottom:10px;font-family:Arial, sans-serif;
  `;
  clothingPaletteEl.appendChild(label);

  clothingColorOptions.forEach((color) => {
    const sw = document.createElement("button");
    sw.type = "button";
    sw.style.cssText = `
      width:42px;height:42px;border-radius:50%;border:2px solid #fff;
      background:${color};cursor:pointer;transition:transform 0.15s ease;
    `;
    sw.addEventListener(
      "mouseenter",
      () => (sw.style.transform = "scale(1.08)"),
    );
    sw.addEventListener("mouseleave", () => (sw.style.transform = "scale(1)"));
    sw.addEventListener("click", () => {
      setCharacterClothingColor(color);
      hideClothingColorPalette();
      showToast("👗", "Couleur de tenue appliquée !");
      enableNext();
    });
    clothingPaletteEl.appendChild(sw);
  });

  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.textContent = "Annuler";
  closeBtn.style.cssText = `
    width:100%;margin-top:12px;padding:10px 12px;border:none;
    border-radius:14px;background:rgba(255,255,255,0.08);
    color:#f5f5f5;font-size:13px;cursor:pointer;
  `;
  closeBtn.addEventListener("click", hideClothingColorPalette);
  clothingPaletteEl.appendChild(closeBtn);

  document.body.appendChild(clothingPaletteEl);
  showToast("🎨", "Choisis une couleur pour ta tenue");
}

function hideClothingColorPalette() {
  if (!clothingPaletteEl) return;
  clothingPaletteEl.remove();
  clothingPaletteEl = null;
  if (
    currentStep === 8 &&
    ui.nextBtn()?.hasAttribute("disabled") &&
    !pendingInteract
  ) {
    registerInteract("wardrobe", showClothingColorPalette);
  }
}

function cycleCharacterClothingColor() {
  wardrobeColorIndex = (wardrobeColorIndex + 1) % wardrobeColors.length;
  setCharacterClothingColor(wardrobeColors[wardrobeColorIndex]);
}

// Animation de frappe — indicateur visuel
function showTypingAnimation() {
  const el = document.createElement("div");
  el.id = "typingAnim";
  el.innerHTML = `
    <div style="
      position:fixed;bottom:200px;right:40px;
      background:rgba(40,60,140,0.85);border:1px solid rgba(80,140,255,0.5);
      border-radius:16px;padding:14px 20px;color:#aaccff;
      font-family:'DM Sans',sans-serif;font-size:13px;
      backdrop-filter:blur(12px);z-index:55;
      animation:fadeInUp 0.3s ease;
    ">
      <div style="margin-bottom:6px;opacity:0.7;font-size:11px;letter-spacing:1px">AGENDA DU JOUR</div>
      <div style="display:flex;flex-direction:column;gap:4px">
        <div>✅ 09h00 — Réunion équipe</div>
        <div>📝 11h00 — Rapport mensuel</div>
        <div>🌮 13h00 — Déjeuner</div>
        <div>🎯 15h00 — Objectifs Q2</div>
      </div>
    </div>
  `;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

// ═══════════════════════════════════════════════════════════════
//  INTERACTION — Système d'écoute (corrigé — une seule écoute)
// ═══════════════════════════════════════════════════════════════
let pendingInteract = null;

function registerInteract(key, callback) {
  pendingInteract = { key, callback };
  showHint(STEPS[currentStep]?.hint);
}

export function suspendStoryInteraction() {
  pendingInteract = null;
  hideHint();
}

window.addEventListener("story:interact", (e) => {
  if (!pendingInteract) return;
  if (e.detail !== pendingInteract.key) return;
  const cb = pendingInteract.callback;
  pendingInteract = null;
  hideHint();
  ui.nextBtn()?.setAttribute("disabled", "true");
  // Anneau de lumière + shake léger à chaque interaction
  cameraShake(0.015, 0.3);
  cb?.();
});

// Reset story when a new design is applied so positions are re-read from roomObjects
EventBus.on("design:applied", () => {
  currentStep = -1;
  pendingInteract = null;
  hideHint();
  hideClothingColorPalette();
});

// ═══════════════════════════════════════════════════════════════
//  NAVIGATION
// ═══════════════════════════════════════════════════════════════
let _nextBtnBound = false;

export function initStory() {
  if (!_nextBtnBound) {
    ui.nextBtn()?.addEventListener("click", () => {
      if (currentStep < STEPS.length - 1) goToStep(currentStep + 1);
    });
    _nextBtnBound = true;
  }
  // First launch only — subsequent entries (from Design Mode) resume the current step
  if (currentStep === -1) goToStep(0);
}

function goToStep(i) {
  if (i >= STEPS.length) return;
  currentStep = i;
  pendingInteract = null;

  const s = STEPS[i];
  // Transition UI
  animateUITransition(() => {
    if (ui.emoji()) ui.emoji().textContent = s.emoji;
    if (ui.title()) ui.title().textContent = s.title;
    if (ui.sub()) ui.sub().textContent = s.sub;
  });
  if (ui.counter()) ui.counter().textContent = `${i} / ${STEPS.length - 1}`;
  if (ui.progress())
    ui.progress().style.width = `${(i / (STEPS.length - 1)) * 100}%`;

  ui.nextBtn()?.setAttribute("disabled", "true");

  s.onEnter?.();

  // Tween caméra
  tweenCamera(s.cam.pos, s.cam.look, s.dur, () => {
    if (!s.hint) enableNext();
  });
}

function animateUITransition(updateContent) {
  const sub = document.getElementById("subtitle");
  if (!sub) {
    updateContent();
    return;
  }
  sub.style.transition = "opacity 0.25s ease, transform 0.25s ease";
  sub.style.opacity = "0";
  sub.style.transform = "translateY(8px)";
  setTimeout(() => {
    updateContent();
    sub.style.opacity = "1";
    sub.style.transform = "translateY(0)";
  }, 260);
}

export function enableNext() {
  if (currentStep >= STEPS.length - 1) return;
  ui.nextBtn()?.removeAttribute("disabled");
}

// ═══════════════════════════════════════════════════════════════
//  UPDATE — appelé chaque frame depuis main.js
// ═══════════════════════════════════════════════════════════════
export function updateStory(dt, t) {
  // ── Mise à jour des effets ──────────────────────────────────
  updateEffects(dt, t);

  // ── Rideaux (ondulation) ────────────────────────────────────
  curtainWaveT += dt;

  // ── Lever du soleil ─────────────────────────────────────────
  if (sunRiseActive) {
    sunT += dt * 0.15;
    const e = easeInOut(Math.min(sunT, 1));
    sunLight.intensity = e * 2.0;
    winGlow.intensity = e * 4.0;
    ambientLight.intensity = 2.2 + e * 1.8;
    ambientLight.color.setHSL(0.1, 0.3 * e, 0.04 + e * 0.28);
    moonLight.color.setHSL(0.62 - e * 0.5, 0.6, 0.3 + e * 0.2);
    const bg = new THREE.Color().setHSL(0.08 * e, 0.3 * e, 0.02 + e * 0.28);
    scene.background = bg;
    scene.fog.color = bg;
    if (sunT >= 1) sunRiseActive = false;
  }

  // ── Rayons de soleil — oscillation ─────────────────────────
  if (sunRays && sunRays.parent) {
    const s = Math.sin(t * 0.5) * 0.015 + 0.985;
    sunRays.scale.set(s, 1, s);
  }

  // ── Écran ordinateur ────────────────────────────────────────
  if (screenOnActive) {
    screenT += dt * 0.9;
    const e = easeInOut(Math.min(screenT, 1));
    screenLight.intensity = e * 1.4;
    if (screenT >= 1) screenOnActive = false;
  }
  if (!screenOnActive && screenT >= 1) {
    screenLight.intensity = 1.2 + Math.sin(t * 1.8) * 0.18;
  }

  // ── Miroir shimmer ──────────────────────────────────────────
  if (mirrorActive) {
    mirrorT += dt * 2.2;
    mirrorLight.intensity = Math.abs(Math.sin(mirrorT)) * 2.5;
    if (mirrorT > Math.PI * 2) {
      mirrorActive = false;
      mirrorLight.intensity = 0;
    }
  }

  // ── Porte qui s'ouvre ───────────────────────────────────────
  if (doorOpenActive && roomObjects.door) {
    doorT += dt * 1.0;
    const e = elasticOut(Math.min(doorT, 1));
    roomObjects.door.rotation.y = -e * (Math.PI * 0.75);
    // Lumière externe inonde
    winGlow.intensity = doorT > 0.5 ? (doorT - 0.5) * 20 : winGlow.intensity;
    if (doorT >= 1) doorOpenActive = false;
  }

  // ── Horloge tick ────────────────────────────────────────────
  clockTick += dt;
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
    el.style.opacity = "0";
    setTimeout(() => {
      el.textContent = msg;
      el.style.opacity = "1";
    }, 300);
  }
}
function showFinalScreen() {
  setLetterbox(false);
  setVignette(0);
  lightFlash("#fff", 1.2, 1.0);
  setTimeout(() => {
    ui.final()?.classList.add("show");
  }, 600);
}
function fadeFromBlack() {
  const el = ui.blackout();
  if (el)
    setTimeout(() => {
      el.style.opacity = "0";
    }, 300);
}

// ═══════════════════════════════════════════════════════════════
//  SONS
// ═══════════════════════════════════════════════════════════════
function startAmbientSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
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
    function chirp() {
      const o = ctx.createOscillator(),
        g = ctx.createGain();
      o.frequency.value = 1600 + Math.random() * 900;
      g.gain.value = 0.04;
      o.connect(g);
      g.connect(ctx.destination);
      o.start();
      o.stop(ctx.currentTime + 0.07);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.07);
      setTimeout(chirp, 1200 + Math.random() * 3000);
    }
    setTimeout(chirp, 5000);
  } catch (e) {}
}

function playAlarmSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    let beat = 0;
    function beep() {
      if (beat >= 6) return;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "square";
      o.frequency.value = beat % 2 === 0 ? 880 : 660;
      g.gain.value = 0.08;
      o.connect(g);
      g.connect(ctx.destination);
      o.start();
      o.stop(ctx.currentTime + 0.12);
      beat++;
      setTimeout(beep, 220);
    }
    beep();
  } catch (e) {}
}

function playSunriseSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    // Accord doux montant
    [
      [261, 0.02],
      [329, 0.015],
      [392, 0.012],
      [523, 0.008],
    ].forEach(([f, g], i) => {
      const o = ctx.createOscillator();
      const gn = ctx.createGain();
      o.type = "sine";
      o.frequency.value = f;
      gn.gain.value = 0;
      o.connect(gn);
      gn.connect(ctx.destination);
      o.start(ctx.currentTime + i * 0.3);
      gn.gain.linearRampToValueAtTime(g, ctx.currentTime + i * 0.3 + 0.5);
      gn.gain.linearRampToValueAtTime(0, ctx.currentTime + i * 0.3 + 3.0);
    });
  } catch (e) {}
}

// Mélodie douce de réveil — 3 notes montantes
function playWakeUpSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [[440, 0], [550, 0.28], [660, 0.56]].forEach(([freq, delay]) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = freq;
      g.gain.setValueAtTime(0, ctx.currentTime + delay);
      g.gain.linearRampToValueAtTime(0.07, ctx.currentTime + delay + 0.05);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.65);
      o.connect(g); g.connect(ctx.destination);
      o.start(ctx.currentTime + delay);
      o.stop(ctx.currentTime + delay + 0.7);
    });
  } catch (e) {}
}

// Gorgées d'eau + bruit de fond aquatique
function playWaterDrinkSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    for (let i = 0; i < 4; i++) {
      setTimeout(() => {
        const o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
        f.type = "bandpass"; f.frequency.value = 500; f.Q.value = 6;
        o.type = "sine";
        o.frequency.setValueAtTime(350, ctx.currentTime);
        o.frequency.exponentialRampToValueAtTime(180, ctx.currentTime + 0.12);
        g.gain.setValueAtTime(0.13, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
        o.connect(f); f.connect(g); g.connect(ctx.destination);
        o.start(); o.stop(ctx.currentTime + 0.2);
      }, i * 190);
    }
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.9, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource(), flt = ctx.createBiquadFilter(), gn = ctx.createGain();
    flt.type = "bandpass"; flt.frequency.value = 1200; flt.Q.value = 2;
    gn.gain.setValueAtTime(0.04, ctx.currentTime);
    gn.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.9);
    src.buffer = buf; src.connect(flt); flt.connect(gn); gn.connect(ctx.destination);
    src.start(); src.stop(ctx.currentTime + 0.9);
  } catch (e) {}
}

// Filet d'eau d'arrosage + gouttes
function playWateringSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource(), flt = ctx.createBiquadFilter(), gn = ctx.createGain();
    flt.type = "bandpass"; flt.frequency.value = 1800; flt.Q.value = 1.5;
    gn.gain.setValueAtTime(0, ctx.currentTime);
    gn.gain.linearRampToValueAtTime(0.06, ctx.currentTime + 0.3);
    gn.gain.setValueAtTime(0.06, ctx.currentTime + 1.6);
    gn.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2.0);
    src.buffer = buf; src.connect(flt); flt.connect(gn); gn.connect(ctx.destination);
    src.start(); src.stop(ctx.currentTime + 2.0);
    for (let i = 0; i < 7; i++) {
      setTimeout(() => {
        const o = ctx.createOscillator(), g2 = ctx.createGain();
        o.type = "sine";
        o.frequency.setValueAtTime(1200 + Math.random() * 400, ctx.currentTime);
        o.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.08);
        g2.gain.setValueAtTime(0.04, ctx.currentTime);
        g2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
        o.connect(g2); g2.connect(ctx.destination);
        o.start(); o.stop(ctx.currentTime + 0.12);
      }, i * 240 + Math.random() * 80);
    }
  } catch (e) {}
}

// Robinet — bruit d'eau qui coule
function playFaucetSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const buf = ctx.createBuffer(1, ctx.sampleRate * 3.5, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    const f1 = ctx.createBiquadFilter(), f2 = ctx.createBiquadFilter(), gn = ctx.createGain();
    f1.type = "bandpass"; f1.frequency.value = 2200; f1.Q.value = 0.8;
    f2.type = "bandpass"; f2.frequency.value = 800;  f2.Q.value = 1.2;
    gn.gain.setValueAtTime(0, ctx.currentTime);
    gn.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 0.4);
    gn.gain.setValueAtTime(0.08, ctx.currentTime + 2.8);
    gn.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 3.5);
    src.buffer = buf; src.connect(f1); src.connect(f2);
    f1.connect(gn); f2.connect(gn); gn.connect(ctx.destination);
    src.start(); src.stop(ctx.currentTime + 3.5);
  } catch (e) {}
}

// Scintillement magique du miroir — arpège cristallin montant
function playMirrorSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [1047, 1319, 1568, 2093, 2637, 3136].forEach((freq, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = freq;
      g.gain.setValueAtTime(0, ctx.currentTime + i * 0.07);
      g.gain.linearRampToValueAtTime(0.055, ctx.currentTime + i * 0.07 + 0.04);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.07 + 1.4);
      o.connect(g); g.connect(ctx.destination);
      o.start(ctx.currentTime + i * 0.07);
      o.stop(ctx.currentTime + i * 0.07 + 1.5);
    });
  } catch (e) {}
}

// Clavier — clics rapides
function playKeyboardSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const total = 22 + Math.floor(Math.random() * 8);
    for (let i = 0; i < total; i++) {
      const delay = i * (0.075 + Math.random() * 0.055);
      setTimeout(() => {
        const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.035), ctx.sampleRate);
        const d = buf.getChannelData(0);
        for (let j = 0; j < d.length; j++) d[j] = (Math.random() * 2 - 1) * Math.exp(-j / (d.length * 0.25));
        const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
        f.type = "highpass"; f.frequency.value = 2800;
        g.gain.value = 0.14;
        src.buffer = buf; src.connect(f); f.connect(g); g.connect(ctx.destination);
        src.start();
      }, delay * 1000);
    }
  } catch (e) {}
}

// Grincement d'armoire + froissement de tissu
function playWardrobeSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = "sawtooth";
    o.frequency.setValueAtTime(130, ctx.currentTime);
    o.frequency.linearRampToValueAtTime(75, ctx.currentTime + 0.9);
    g.gain.setValueAtTime(0.06, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.9);
    o.connect(g); g.connect(ctx.destination);
    o.start(); o.stop(ctx.currentTime + 0.9);
    setTimeout(() => {
      const buf = ctx.createBuffer(1, ctx.sampleRate * 0.55, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), gn = ctx.createGain();
      f.type = "bandpass"; f.frequency.value = 3800; f.Q.value = 0.5;
      gn.gain.setValueAtTime(0.05, ctx.currentTime);
      gn.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.55);
      src.buffer = buf; src.connect(f); f.connect(gn); gn.connect(ctx.destination);
      src.start(); src.stop(ctx.currentTime + 0.55);
    }, 700);
  } catch (e) {}
}

// Grincement de porte + souffle extérieur + oiseaux
function playDoorOpenSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = "sawtooth";
    o.frequency.setValueAtTime(220, ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(55, ctx.currentTime + 1.3);
    g.gain.setValueAtTime(0.07, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.3);
    o.connect(g); g.connect(ctx.destination);
    o.start(); o.stop(ctx.currentTime + 1.3);
    setTimeout(() => {
      const buf = ctx.createBuffer(1, ctx.sampleRate * 2.5, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), gn = ctx.createGain();
      f.type = "lowpass"; f.frequency.value = 450;
      gn.gain.setValueAtTime(0, ctx.currentTime);
      gn.gain.linearRampToValueAtTime(0.09, ctx.currentTime + 0.5);
      gn.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2.5);
      src.buffer = buf; src.connect(f); f.connect(gn); gn.connect(ctx.destination);
      src.start(); src.stop(ctx.currentTime + 2.5);
    }, 700);
    setTimeout(() => {
      for (let i = 0; i < 5; i++) {
        setTimeout(() => {
          const o2 = ctx.createOscillator(), g2 = ctx.createGain();
          o2.type = "sine";
          const baseF = 1800 + Math.random() * 500;
          o2.frequency.setValueAtTime(baseF, ctx.currentTime);
          o2.frequency.exponentialRampToValueAtTime(baseF * 1.35, ctx.currentTime + 0.08);
          o2.frequency.exponentialRampToValueAtTime(baseF * 0.9, ctx.currentTime + 0.16);
          g2.gain.setValueAtTime(0.045, ctx.currentTime);
          g2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
          o2.connect(g2); g2.connect(ctx.destination);
          o2.start(); o2.stop(ctx.currentTime + 0.25);
        }, i * 280 + Math.random() * 150);
      }
    }, 1100);
  } catch (e) {}
}

// ═══════════════════════════════════════════════════════════════
//  EASING
// ═══════════════════════════════════════════════════════════════
function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}
function elasticOut(t) {
  if (t === 0 || t === 1) return t;
  const p = 0.3;
  return Math.pow(2, -10 * t) * Math.sin(((t - p / 4) * (2 * Math.PI)) / p) + 1;
}
