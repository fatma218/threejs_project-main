// ═══════════════════════════════════════════════════════════════
//  main.js — Scene · Renderer · Camera · Lights · Loop
//  Morning Tale — Version Animations Avancées
// ═══════════════════════════════════════════════════════════════

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { loadRoom, roomObjects } from "./room.js";
import { loadCharacter, updateCharacter } from "./models.js";
import { initDesigner } from "./designer.js";
import { initStory, updateStory } from "./story.js";
import { initAR } from "./ar.js";
import { initVR } from "./vr.js";
import { initInteraction } from "./interaction.js";
import {
  initCamera,
  updateCamera,
  initCinematicOverlays,
  setVignette,
} from "./camera.js";
import { initEffects } from "./effects.js";

// ── Exports ───────────────────────────────────────────────────
export let scene, camera, renderer, controls, clock;
export let ambientLight, sunLight, winGlow, lampLight;

// ═══════════════════════════════════════════════════════════════
//  1. RENDERER
// ═══════════════════════════════════════════════════════════════
renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.8;
renderer.xr.enabled = true;
renderer.setClearColor(0x0a0818, 1);
document.body.appendChild(renderer.domElement);

// ═══════════════════════════════════════════════════════════════
//  2. SCENE + FOG
// ═══════════════════════════════════════════════════════════════
scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x0a0818, 0.035);
scene.background = new THREE.Color(0x0a0818);

// ═══════════════════════════════════════════════════════════════
//  3. CAMERA
// ═══════════════════════════════════════════════════════════════
camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.01, 60);
camera.position.set(0, 5, 9);
clock = new THREE.Clock();

window.addEventListener("resize", () => {
  const designerOverlay = document.getElementById("designerOverlay");
  const isDesignerOpen = designerOverlay?.classList.contains("show");
  const w = isDesignerOpen ? window.innerWidth / 2 : window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
});

// ═══════════════════════════════════════════════════════════════
//  4. ORBIT CONTROLS
// ═══════════════════════════════════════════════════════════════
controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 1.2, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.minDistance = 1;
controls.maxDistance = 18;
controls.maxPolarAngle = Math.PI * 0.82;
controls.enabled = false;

// ═══════════════════════════════════════════════════════════════
//  5. LUMIÈRES
// ═══════════════════════════════════════════════════════════════
ambientLight = new THREE.AmbientLight(0x1a1035, 2.2);
scene.add(ambientLight);

const moonLight = new THREE.DirectionalLight(0x4466dd, 0.9);
moonLight.position.set(-4, 9, 5);
moonLight.castShadow = true;
moonLight.shadow.mapSize.set(2048, 2048);
moonLight.shadow.camera.left = -10;
moonLight.shadow.camera.right = 10;
moonLight.shadow.camera.top = 10;
moonLight.shadow.camera.bottom = -10;
moonLight.shadow.bias = -0.001;
moonLight.shadow.normalBias = 0.02;
scene.add(moonLight);
export { moonLight };

sunLight = new THREE.DirectionalLight(0xffcc66, 0);
sunLight.position.set(0, 7, -6);
sunLight.castShadow = false;
scene.add(sunLight);

winGlow = new THREE.PointLight(0xffaa44, 0, 9);
winGlow.position.set(0, 2.4, -4.8);
scene.add(winGlow);

lampLight = new THREE.PointLight(0xff9944, 1.6, 5);
lampLight.position.set(-3.6, 1.5, 1.4);
lampLight.castShadow = false;
scene.add(lampLight);

export const screenLight = new THREE.PointLight(0x4488ff, 0, 3);
screenLight.position.set(2.4, 1.6, 2.2);
scene.add(screenLight);

export const mirrorLight = new THREE.PointLight(0xeeeeff, 0, 2.5);
mirrorLight.position.set(3.4, 1.8, -2.2);
scene.add(mirrorLight);

const floorGlow = new THREE.PointLight(0x6633aa, 0.5, 4);
floorGlow.position.set(1.5, 0.08, 1.5);
scene.add(floorGlow);

// Lumière de remplissage douce
const fillLight = new THREE.DirectionalLight(0x334466, 0.4);
fillLight.position.set(5, 3, 5);
scene.add(fillLight);

export function tweenCamera(pos, look, duration = 2.2, onDone = null) {
  if (controls.enabled) return;
  camState.fromPos.copy(camera.position);
  camState.fromLook.copy(controls.target);
  camState.toPos.set(...pos);
  camState.toLook.set(...look);
  camState.duration = duration;
  camState.t = 0;
  camState.active = true;
  camState.onDone = onDone;
}

function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

// ═══════════════════════════════════════════════════════════════
//  7. RAYCASTER — Interaction click
// ═══════════════════════════════════════════════════════════════
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let interactiveObjects = [];

export function setInteractiveObjects(objs) {
  interactiveObjects = objs;
}

window.addEventListener("pointerdown", (e) => {
  if (e.target !== renderer.domElement) return;
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(interactiveObjects, true);
  if (hits.length > 0) {
    let cur = hits[0].object;
    while (cur && !cur.userData.interactable) cur = cur.parent;
    if (cur?.userData?.onInteract) cur.userData.onInteract();
  }
});

// ── Curseur interactif ────────────────────────────────────────
renderer.domElement.style.cursor = "default";
window.addEventListener("mousemove", (e) => {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(interactiveObjects, true);
  renderer.domElement.style.cursor = hits.length > 0 ? "pointer" : "default";
});

// ═══════════════════════════════════════════════════════════════
//  8. FREE CAM TOGGLE
// ═══════════════════════════════════════════════════════════════
let freeCam = false;
document.getElementById("freeCamBtn")?.addEventListener("click", () => {
  freeCam = !freeCam;
  controls.enabled = freeCam;
  const btn = document.getElementById("freeCamBtn");
  if (btn) {
    btn.classList.toggle("on", freeCam);
    btn.textContent = freeCam ? "📖 Mode histoire" : "🎬 Caméra libre";
  }
});

// ═══════════════════════════════════════════════════════════════
//  9. PARTICULES FLOTTANTES
// ═══════════════════════════════════════════════════════════════
const PART_COUNT = 160;
const pPositions = new Float32Array(PART_COUNT * 3);
const pSpeeds = new Float32Array(PART_COUNT);
const W = 9,
  H = 4,
  D = 9;

for (let i = 0; i < PART_COUNT; i++) {
  pPositions[i * 3] = (Math.random() - 0.5) * W;
  pPositions[i * 3 + 1] = Math.random() * H;
  pPositions[i * 3 + 2] = (Math.random() - 0.5) * D;
  pSpeeds[i] = 0.002 + Math.random() * 0.003;
}
const pGeo = new THREE.BufferGeometry();
pGeo.setAttribute("position", new THREE.BufferAttribute(pPositions, 3));
const particles = new THREE.Points(
  pGeo,
  new THREE.PointsMaterial({
    color: 0xffd080,
    size: 0.012,
    transparent: true,
    opacity: 0.25,
    sizeAttenuation: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  }),
);
scene.add(particles);

// ═══════════════════════════════════════════════════════════════
//  10. INIT
// ═══════════════════════════════════════════════════════════════
async function init() {
  try {
    // Système caméra cinématique
    initCamera(camera, controls, renderer);
    initCinematicOverlays();

    // Effets visuels
    initEffects(scene);

    // Chargement parallèle
    await Promise.all([loadRoom(scene), loadCharacter(scene)]);

    initAR(renderer);
    initVR(renderer);
    initStory();
    initDesigner();

    const loading = document.getElementById("loading");
    if (loading) {
      loading.style.opacity = "0";
      setTimeout(() => (loading.style.display = "none"), 700);
    }

    console.log("✅ Morning Tale — Tout chargé !");
  } catch (err) {
    console.error("❌ Erreur chargement:", err);
  }
}

// ═══════════════════════════════════════════════════════════════
//  11. BOUCLE D'ANIMATION
// ═══════════════════════════════════════════════════════════════
renderer.setAnimationLoop(() => {
  const dt = clock.getDelta();
  const t = clock.getElapsedTime();

  controls.update();

  // Camera tween principal
  if (camState.active && !controls.enabled) {
    camState.t += dt / camState.duration;
    const e = easeInOut(Math.min(camState.t, 1));
    camera.position.lerpVectors(camState.fromPos, camState.toPos, e);
    controls.target.lerpVectors(camState.fromLook, camState.toLook, e);
    camera.lookAt(controls.target);
    if (camState.t >= 1) {
      camState.active = false;
      camState.onDone?.();
    }
  }

  // Système caméra avancé (shake, FOV, etc.)
  updateCamera(dt);

  // Personnage
  updateCharacter(dt);

  // Story + effets
  updateStory(dt, t);

  // Particules ambiantes
  const pa = pGeo.attributes.position.array;
  for (let i = 0; i < PART_COUNT; i++) {
    pa[i * 3 + 1] += pSpeeds[i];
    if (pa[i * 3 + 1] > H) pa[i * 3 + 1] = 0;
    pa[i * 3] += Math.sin(t * 0.3 + i) * 0.0003;
    pa[i * 3 + 2] += Math.cos(t * 0.25 + i * 0.7) * 0.0003;
  }
  pGeo.attributes.position.needsUpdate = true;

  // Lampe de chevet pulsation
  lampLight.intensity = 1.6 + Math.sin(t * 1.1) * 0.08;

  renderer.render(scene, camera);
});

init();
