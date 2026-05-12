// js/app.js — Point d'entrée unique
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { modeManager }  from "./core/ModeManager.js";
import { EventBus }     from "./core/EventBus.js";
import {
  initSceneGlobals,
  getCamState,
  bindSetInteractiveObjects,
} from "./core/SceneGlobals.js";
import { initInteraction, registerObjects } from "./systems/InteractionSystem.js";
import { loadRoom }        from "./room.js";
import { loadCharacter, updateCharacter } from "./models.js";
import { StoryMode }       from "./modes/StoryMode.js";
import { DesignMode }      from "./modes/DesignMode.js";
import { initCamera, updateCamera, initCinematicOverlays } from "./camera.js";
import { initEffects }     from "./effects.js";
import { initAR, updateAR } from "./ar.js";

// ═══════════════════════════════════════════════════════════════
//  1. RENDERER
// ═══════════════════════════════════════════════════════════════
// alpha:true requis pour le fond transparent en mode AR
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.8;
renderer.xr.enabled = true;
renderer.setClearColor(0x0a0818, 1); // opaque en mode normal
document.body.appendChild(renderer.domElement);

// ═══════════════════════════════════════════════════════════════
//  2. SCENE + FOG
// ═══════════════════════════════════════════════════════════════
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x0a0818, 0.035);
scene.background = new THREE.Color(0x0a0818);

// ═══════════════════════════════════════════════════════════════
//  3. CAMÉRA + HORLOGE
// ═══════════════════════════════════════════════════════════════
const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.01, 60);
camera.position.set(0, 5, 9);
const clock = new THREE.Clock();

window.addEventListener("resize", () => {
  const overlay = document.getElementById("designerOverlay");
  const half = overlay?.classList.contains("show");
  const w = half ? window.innerWidth / 2 : window.innerWidth;
  camera.aspect = w / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(w, window.innerHeight);
});

// ═══════════════════════════════════════════════════════════════
//  4. ORBIT CONTROLS
// ═══════════════════════════════════════════════════════════════
const controls = new OrbitControls(camera, renderer.domElement);
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
const ambientLight = new THREE.AmbientLight(0x1a1035, 2.2);
scene.add(ambientLight);

const moonLight = new THREE.DirectionalLight(0x4466dd, 0.9);
moonLight.position.set(-4, 9, 5);
moonLight.castShadow = true;
moonLight.shadow.mapSize.set(2048, 2048);
moonLight.shadow.camera.left   = -10;
moonLight.shadow.camera.right  =  10;
moonLight.shadow.camera.top    =  10;
moonLight.shadow.camera.bottom = -10;
moonLight.shadow.bias       = -0.001;
moonLight.shadow.normalBias =  0.02;
scene.add(moonLight);

const sunLight = new THREE.DirectionalLight(0xffcc66, 0);
sunLight.position.set(0, 7, -6);
sunLight.castShadow = false;
scene.add(sunLight);

const winGlow = new THREE.PointLight(0xffaa44, 0, 9);
winGlow.position.set(0, 2.4, -4.8);
scene.add(winGlow);

const lampLight = new THREE.PointLight(0xff9944, 1.6, 5);
lampLight.position.set(-3.6, 1.5, 1.4);
lampLight.castShadow = false;
scene.add(lampLight);

const screenLight = new THREE.PointLight(0x4488ff, 0, 3);
screenLight.position.set(2.4, 1.6, 2.2);
scene.add(screenLight);

const mirrorLight = new THREE.PointLight(0xeeeeff, 0, 2.5);
mirrorLight.position.set(3.4, 1.8, -2.2);
scene.add(mirrorLight);

const floorGlow = new THREE.PointLight(0x6633aa, 0.5, 4);
floorGlow.position.set(1.5, 0.08, 1.5);
scene.add(floorGlow);

const fillLight = new THREE.DirectionalLight(0x334466, 0.4);
fillLight.position.set(5, 3, 5);
scene.add(fillLight);

// ═══════════════════════════════════════════════════════════════
//  6. PARTICULES AMBIANTES
// ═══════════════════════════════════════════════════════════════
const PART_COUNT = 160;
const pPositions = new Float32Array(PART_COUNT * 3);
const pSpeeds    = new Float32Array(PART_COUNT);
const PW = 9, PH = 4, PD = 9;
for (let i = 0; i < PART_COUNT; i++) {
  pPositions[i * 3]     = (Math.random() - 0.5) * PW;
  pPositions[i * 3 + 1] = Math.random() * PH;
  pPositions[i * 3 + 2] = (Math.random() - 0.5) * PD;
  pSpeeds[i] = 0.002 + Math.random() * 0.003;
}
const pGeo = new THREE.BufferGeometry();
pGeo.setAttribute("position", new THREE.BufferAttribute(pPositions, 3));
const particles = new THREE.Points(
  pGeo,
  new THREE.PointsMaterial({
    color: 0xffd080, size: 0.012, transparent: true, opacity: 0.25,
    sizeAttenuation: true, blending: THREE.AdditiveBlending, depthWrite: false,
  }),
);
scene.add(particles);

// ═══════════════════════════════════════════════════════════════
//  7. BOUTON CAMÉRA LIBRE
// ═══════════════════════════════════════════════════════════════
document.getElementById("freeCamBtn")?.addEventListener("click", () => {
  controls.enabled = !controls.enabled;
  const btn = document.getElementById("freeCamBtn");
  if (btn) {
    btn.classList.toggle("on", controls.enabled);
    btn.textContent = controls.enabled ? "📖 Mode histoire" : "🎬 Caméra libre";
  }
});

// Resize depuis les modes via EventBus
EventBus.on("renderer:resize", ({ half }) => {
  const w = half ? window.innerWidth / 2 : window.innerWidth;
  renderer.setSize(w, window.innerHeight);
  camera.aspect = w / window.innerHeight;
  camera.updateProjectionMatrix();
});

// ═══════════════════════════════════════════════════════════════
//  8. INIT
// ═══════════════════════════════════════════════════════════════
async function init() {
  try {
    initCamera(camera, controls, renderer);
    initCinematicOverlays();
    initEffects(scene);
    initInteraction(camera, renderer);

    // Connecte setInteractiveObjects (room.js) → registerObjects (InteractionSystem)
    bindSetInteractiveObjects(registerObjects);

    // Peuple le state partagé AVANT de charger les modes
    initSceneGlobals({
      scene, camera, renderer, controls,
      ambientLight, sunLight, winGlow, lampLight,
      moonLight, screenLight, mirrorLight,
    });

    await Promise.all([loadRoom(scene), loadCharacter(scene)]);

    // Initialiser le mode AR (doit être après le chargement de la scène)
    initAR(renderer, scene);

    modeManager.register("story",  new StoryMode());
    modeManager.register("design", new DesignMode(scene));

    await modeManager.switchTo("story");

    document.getElementById("designModeBtn")?.addEventListener("click", () => {
      modeManager.switchTo("design");
    });

    // designerOpenBtn est créé dynamiquement — on l'intercepte en phase capture
    // pour qu'il passe aussi par le ModeManager (sinon l'histoire casse au retour)
    document.addEventListener("click", (e) => {
      if (e.target?.closest("#designerOpenBtn")) {
        e.stopImmediatePropagation();
        modeManager.switchTo("design");
      }
    }, true);

    // Retour automatique en mode Story quand le designer se ferme.
    // Si le designer a été ouvert sans passer par le ModeManager (bouton direct),
    // on force un exit/enter pour relancer initStory().
    EventBus.on("design:closed", () => {
      if (modeManager.current === modeManager.modes["story"]) {
        modeManager.modes["story"].exit();
        modeManager.modes["story"].enter();
      } else {
        modeManager.switchTo("story");
      }
    });

    const loading = document.getElementById("loading");
    if (loading) {
      loading.style.opacity = "0";
      setTimeout(() => (loading.style.display = "none"), 700);
    }

    console.log("✅ App — Tout chargé !");
  } catch (err) {
    console.error("❌ Erreur chargement:", err);
  }
}

// ═══════════════════════════════════════════════════════════════
//  9. BOUCLE D'ANIMATION
// ═══════════════════════════════════════════════════════════════
function easeInOut(t) { return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; }

// frame est fourni par WebXR quand une session AR/VR est active
renderer.setAnimationLoop((time, frame) => {
  const delta   = clock.getDelta();
  const elapsed = clock.getElapsedTime();

  // En mode XR, la caméra est gérée par le casque/téléphone — on skip les tweens
  if (!renderer.xr.isPresenting) {
    controls.update();

    // Caméra tween (story mode)
    const cs = getCamState();
    if (cs?.active && !controls.enabled) {
      cs.t += delta / cs.duration;
      const e = easeInOut(Math.min(cs.t, 1));
      camera.position.lerpVectors(cs.fromPos, cs.toPos, e);
      controls.target.lerpVectors(cs.fromLook, cs.toLook, e);
      camera.lookAt(controls.target);
      if (cs.t >= 1) { cs.active = false; cs.onDone?.(); }
    }
  }

  updateCamera(delta);
  updateCharacter(delta);
  modeManager.update(delta, elapsed);

  // Hit-test AR (frame non-null uniquement en session WebXR active)
  updateAR(renderer, frame);

  // Particules ambiantes
  const pa = pGeo.attributes.position.array;
  for (let i = 0; i < PART_COUNT; i++) {
    pa[i * 3 + 1] += pSpeeds[i];
    if (pa[i * 3 + 1] > PH) pa[i * 3 + 1] = 0;
    pa[i * 3]     += Math.sin(elapsed * 0.3 + i) * 0.0003;
    pa[i * 3 + 2] += Math.cos(elapsed * 0.25 + i * 0.7) * 0.0003;
  }
  pGeo.attributes.position.needsUpdate = true;

  lampLight.intensity = 1.6 + Math.sin(elapsed * 1.1) * 0.08;

  renderer.render(scene, camera);
});

init();
