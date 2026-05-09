// ═══════════════════════════════════════════════════════════════
//  designer.js — Room Designer Libre (placement interactif)
//  Morning Tale — v4 FREE MODE
// ═══════════════════════════════════════════════════════════════

import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { TransformControls } from "three/addons/controls/TransformControls.js";
import { walkTo } from "./models.js";
import { roomObjects } from "./room.js";
import { scene as mainScene, renderer, camera as mainCamera } from "./main.js";

// ═══════════════════════════════════════════════════════════════
//  CATALOGUE DE MEUBLES
// ═══════════════════════════════════════════════════════════════
const FURNITURE_CATALOG = {
  bed: {
    label: "Lit",
    emoji: "🛏️",
    targetSize: 2.0,
    variants: [
      { id: "bed1", label: "Lit simple", path: "models/bed1.glb", emoji: "🛏️" },
      { id: "bed2", label: "Lit double", path: "models/bed2.glb", emoji: "🛏️" },
      { id: "bed3", label: "Lit king", path: "models/bed3.glb", emoji: "🛏️" },
    ],
    colors: ["#ffffff", "#c8a06a", "#4a3020", "#e8d0b0", "#2a3a5a", "#6a4050"],
  },
  nighttable: {
    label: "Table de Nuit",
    emoji: "🪵",
    targetSize: 0.7,
    variants: [
      {
        id: "table1",
        label: "Table ronde",
        path: "models/table1.glb",
        emoji: "🪵",
      },
      {
        id: "table2",
        label: "Table carrée",
        path: "models/table2.glb",
        emoji: "🪵",
      },
    ],
    colors: ["#9e7c5a", "#4a3020", "#c8b090", "#606060", "#2a4a3a"],
  },
  wardrobe: {
    label: "Armoire",
    emoji: "🚪",
    targetSize: 2.2,
    variants: [
      {
        id: "wardrobe",
        label: "Armoire simple",
        path: "models/wardrobe.glb",
        emoji: "🚪",
      },
      {
        id: "wardrobe1",
        label: "Grande armoire",
        path: "models/wardrobe1.glb",
        emoji: "🚪",
      },
    ],
    colors: ["#9e7c5a", "#4a3020", "#c8c0b0", "#3a3a3a", "#5a4a7a"],
  },
  desk: {
    label: "Bureau",
    emoji: "🖥️",
    targetSize: 1.1,
    variants: [
      {
        id: "desk",
        label: "Bureau standard",
        path: "models/Desk.glb",
        emoji: "🖥️",
      },
      {
        id: "tabledesk",
        label: "Grand bureau",
        path: "models/tabledesk.glb",
        emoji: "🖥️",
      },
    ],
    colors: ["#9e7c5a", "#4a3020", "#c8c0b0", "#3a3a3a", "#6a8090"],
  },
  chair: {
    label: "Chaise",
    emoji: "🪑",
    targetSize: 0.95,
    variants: [
      {
        id: "chair",
        label: "Chaise classique",
        path: "models/chair.glb",
        emoji: "🪑",
      },
      {
        id: "chair1",
        label: "Chaise moderne",
        path: "models/chair1.glb",
        emoji: "🪑",
      },
      {
        id: "chair4",
        label: "Fauteuil gaming",
        path: "models/chair4.glb",
        emoji: "🪑",
      },
    ],
    colors: ["#4a3020", "#9e7c5a", "#3a3a3a", "#2a3a5a", "#6a2a2a"],
  },
  lamp: {
    label: "Lampe",
    emoji: "💡",
    targetSize: 1.6,
    variants: [
      {
        id: "lamp1",
        label: "Lampe arc",
        path: "models/lamp1.glb",
        emoji: "💡",
      },
      {
        id: "lampe",
        label: "Lampe classique",
        path: "models/lampe.glb",
        emoji: "💡",
      },
    ],
    colors: ["#c8b060", "#c0c0c0", "#4a3020", "#3a3a3a", "#d0d0d0"],
  },
  plant: {
    label: "Plante",
    emoji: "🪴",
    targetSize: 1.3,
    variants: [
      { id: "plant", label: "Palmier", path: "models/plant.glb", emoji: "🌴" },
      {
        id: "plant1",
        label: "Plante bureau",
        path: "models/plant1.glb",
        emoji: "🪴",
      },
      { id: "plant2", label: "Cactus", path: "models/plant2.glb", emoji: "🌵" },
    ],
    colors: ["#3a7a30", "#2a5a20", "#4a8a40", "#8a6a30", "#606060"],
  },
  sink: {
    label: "Lavabo",
    emoji: "🚿",
    targetSize: 1.0,
    variants: [
      {
        id: "sink",
        label: "Lavabo standard",
        path: "models/Countertop Sink.glb",
        emoji: "🚿",
      },
    ],
    colors: ["#e0e0e0", "#c0c0c0", "#a0b0c0", "#d0c8b0", "#3a3a3a"],
  },
};

const WALL_PRESETS = [
  { label: "Beige chaud", v: "#f2e8d8" },
  { label: "Bleu nuit", v: "#c8d4e8" },
  { label: "Rose poudré", v: "#f0d8d0" },
  { label: "Vert sauge", v: "#c8d8c0" },
  { label: "Blanc crème", v: "#faf6f0" },
  { label: "Lilas", v: "#dcd0ec" },
  { label: "Jaune doux", v: "#f0e8c0" },
  { label: "Gris perle", v: "#e0e0e8" },
];
const FLOOR_PRESETS = [
  { label: "Parquet chêne", v: "#d4a96a" },
  { label: "Parquet wengé", v: "#6a4a2a" },
  { label: "Carrelage", v: "#f0f0f0" },
  { label: "Béton", v: "#b0b0b0" },
  { label: "Teck", v: "#a06830" },
  { label: "Marbre crème", v: "#e8e0d8" },
];
const RUG_PRESETS = [
  { label: "Bordeaux", v: "#a06050" },
  { label: "Bleu marine", v: "#2a3a6a" },
  { label: "Crème", v: "#e8dcc8" },
  { label: "Vert forêt", v: "#3a6040" },
  { label: "Gris", v: "#808090" },
  { label: "Or", v: "#c0a040" },
];

// ═══════════════════════════════════════════════════════════════
//  ÉTAT GLOBAL
// ═══════════════════════════════════════════════════════════════
let designerActive = false;
let isoRenderer = null;
let isoScene = null;
let isoCamera = null;
let isoOrbit = null;
let isoTransform = null;
let isoModel = null;
let isoLight = null;
let isoAnimId = null;
let currentSelectedFurniture = null;
let pendingFurnitureSelection = null;
let modelCache = {};
const previewRenderers = new Map();

// Meubles placés dans la chambre — PERSIST entre ouvertures/fermetures du designer
let placedFurniture = {};

// Loaders
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath(
  "https://unpkg.com/three@0.161.0/examples/jsm/libs/draco/",
);
const gltfLoader = new GLTFLoader();
gltfLoader.setDRACOLoader(dracoLoader);

// ═══════════════════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════════════════

/**
 * Sauvegarde l'état du modèle courant dans placedFurniture
 * SANS le retirer de la scène ISO.
 */
function saveCurrentModelState() {
  if (!isoModel || !currentSelectedFurniture) return;
  if (!placedFurniture[currentSelectedFurniture]) {
    placedFurniture[currentSelectedFurniture] = {
      type: currentSelectedFurniture,
    };
  }
  placedFurniture[currentSelectedFurniture].model = isoModel;
  placedFurniture[currentSelectedFurniture].data = {
    scale: isoModel.scale.clone(),
    rotation: isoModel.rotation.clone(),
    position: isoModel.position.clone(),
  };
}

/**
 * Vérifie si `child` est un descendant (fils) de `parent` dans la hiérarchie Three.js.
 */
function isDescendant(parent, child) {
  let found = false;
  parent.traverse((node) => {
    if (node === child) found = true;
  });
  return found;
}

// ═══════════════════════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════════════════════
export function initDesigner() {
  injectHTML();
  injectStyles();
  attachListeners();
}

// ═══════════════════════════════════════════════════════════════
//  LISTENERS
// ═══════════════════════════════════════════════════════════════
function attachListeners() {
  document
    .getElementById("designerOpenBtn")
    ?.addEventListener("click", openDesigner);
  document
    .getElementById("designerCloseBtn")
    ?.addEventListener("click", closeDesigner);
  document
    .getElementById("designerFinishBtn")
    ?.addEventListener("click", finishDesigner);
  document
    .getElementById("designerExpandBtn")
    ?.addEventListener("click", toggleDesignerExpand);

  window.addEventListener("story:interact", handleMainSceneFurnitureClick);

  document.getElementById("isoScaleSlider")?.addEventListener("input", (e) => {
    if (!isoModel) return;
    const s = parseFloat(e.target.value);
    isoModel.scale.set(s, s, s);
    document.getElementById("isoScaleVal").textContent = s.toFixed(2) + "×";
  });

  document.getElementById("isoRotSlider")?.addEventListener("input", (e) => {
    if (!isoModel) return;
    const deg = parseFloat(e.target.value);
    isoModel.rotation.y = THREE.MathUtils.degToRad(deg);
    document.getElementById("isoRotVal").textContent = deg.toFixed(0) + "°";
  });

  document.querySelectorAll(".gizmo-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document
        .querySelectorAll(".gizmo-btn")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      if (isoTransform) isoTransform.setMode(btn.dataset.mode);
    });
  });
}

function handleMainSceneFurnitureClick(event) {
  const furnitureType = event.detail;
  if (!FURNITURE_CATALOG[furnitureType]) return;

  if (!designerActive) {
    pendingFurnitureSelection = furnitureType;
    openDesigner();
    return;
  }

  selectFurniture(furnitureType);
}

// ═══════════════════════════════════════════════════════════════
//  OUVRIR / FERMER
// ═══════════════════════════════════════════════════════════════
function openDesigner() {
  designerActive = true;
  document.getElementById("designerOverlay").classList.add("show");
  document.getElementById("designerOpenBtn").style.display = "none";

  adjustMainCanvasForSplit();

  setTimeout(() => {
    startIsoScene();
    setTimeout(() => {
      createFurnitureSelectables();
      if (pendingFurnitureSelection) {
        selectFurniture(pendingFurnitureSelection);
        pendingFurnitureSelection = null;
      }
    }, 150);
  }, 300);
}

function closeDesigner() {
  // Sauvegarder le meuble courant avant fermeture
  if (isoModel && currentSelectedFurniture) {
    saveCurrentModelState();
  }

  designerActive = false;
  stopIsoScene();
  const overlay = document.getElementById("designerOverlay");
  overlay.classList.remove("show");
  overlay.classList.remove("designer-expanded");
  document.getElementById("designerExpandBtn").textContent = "⤢ Agrandir";
  document.getElementById("designerOpenBtn").style.display = "";
  restoreMainCanvasFullWidth();
}

function toggleDesignerExpand() {
  const overlay = document.getElementById("designerOverlay");
  const btn = document.getElementById("designerExpandBtn");
  const expanded = overlay.classList.toggle("designer-expanded");
  btn.textContent = expanded ? "↙ Réduire" : "⤢ Agrandir";
  resizeIso();
}

// ═══════════════════════════════════════════════════════════════
//  SPLIT-SCREEN
// ═══════════════════════════════════════════════════════════════
function adjustMainCanvasForSplit() {
  const canvas = renderer.domElement;
  if (!canvas) return;
  canvas.style.position = "fixed";
  canvas.style.left = "0";
  canvas.style.top = "0";
  canvas.style.width = "50%";
  canvas.style.height = "100vh";
  const w = window.innerWidth / 2;
  const h = window.innerHeight;
  renderer.setSize(w, h);
  if (mainCamera) {
    mainCamera.aspect = w / h;
    mainCamera.updateProjectionMatrix();
  }
}

function restoreMainCanvasFullWidth() {
  const canvas = renderer.domElement;
  if (!canvas) return;
  canvas.style.position = "";
  canvas.style.left = "";
  canvas.style.top = "";
  canvas.style.width = "";
  canvas.style.height = "";
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h);
  if (mainCamera) {
    mainCamera.aspect = w / h;
    mainCamera.updateProjectionMatrix();
  }
}

// ═══════════════════════════════════════════════════════════════
//  SCÈNE ISO
// ═══════════════════════════════════════════════════════════════
function startIsoScene() {
  const canvas = document.getElementById("isoCanvas");

  isoRenderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
  });
  isoRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  isoRenderer.shadowMap.enabled = true;
  isoRenderer.shadowMap.type = THREE.PCFSoftShadowMap;
  isoRenderer.outputColorSpace = THREE.SRGBColorSpace;
  isoRenderer.toneMapping = THREE.ACESFilmicToneMapping;
  isoRenderer.toneMappingExposure = 1.3;
  resizeIso();

  isoScene = new THREE.Scene();
  isoScene.background = new THREE.Color(0x1a1528);
  isoScene.fog = new THREE.FogExp2(0x1a1528, 0.04);

  buildEmptyRoom(isoScene);

  isoCamera = new THREE.PerspectiveCamera(45, 1, 0.1, 50);
  isoCamera.position.set(8, 6, 8);
  isoCamera.lookAt(0, 1.5, 0);

  isoOrbit = new OrbitControls(isoCamera, canvas);
  isoOrbit.target.set(0, 1.5, 0);
  isoOrbit.enableDamping = true;
  isoOrbit.dampingFactor = 0.08;
  isoOrbit.enableZoom = true;
  isoOrbit.zoomSpeed = 0.7;
  isoOrbit.screenSpacePanning = false;
  isoOrbit.minDistance = 2;
  isoOrbit.maxDistance = 30;
  isoOrbit.maxPolarAngle = Math.PI * 0.85;

  isoTransform = new TransformControls(isoCamera, canvas);
  isoTransform.setMode("translate");
  isoTransform.setSize(0.7);
  isoScene.add(isoTransform);
  isoTransform.addEventListener("dragging-changed", (e) => {
    isoOrbit.enabled = !e.value;
  });
  isoTransform.addEventListener("objectChange", syncSlidersFromModel);

  // ── RESTAURER les meubles déjà placés lors des réouvertures ──
  // La première fois, placedFurniture est vide → chambre vide (comportement voulu)
  // Ensuite, on recrée chaque meuble dans la nouvelle scène ISO
  for (const key in placedFurniture) {
    const furData = placedFurniture[key];
    if (!furData.model || !furData.data) continue;

    const clone = furData.model.clone();
    clone.scale.copy(furData.data.scale);
    clone.rotation.copy(furData.data.rotation);
    clone.position.copy(furData.data.position);
    clone.traverse((c) => {
      if (c.isMesh) {
        c.castShadow = true;
        c.receiveShadow = true;
      }
    });
    isoScene.add(clone);
    // Mettre à jour la référence pour pointer vers le clone dans la nouvelle scène
    placedFurniture[key].model = clone;
  }

  // Raycaster — clic sur un meuble déjà placé dans la scène ISO
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();

  canvas.addEventListener("click", (event) => {
    if (isoTransform.dragging) return;

    const rect = canvas.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, isoCamera);

    const selectables = Object.values(placedFurniture)
      .map((f) => f.model)
      .filter(Boolean);

    const intersects = raycaster.intersectObjects(selectables, true);
    if (intersects.length > 0) {
      const hit = intersects[0].object;
      for (const key in placedFurniture) {
        const m = placedFurniture[key].model;
        if (m && (m === hit || isDescendant(m, hit))) {
          selectFurniture(key);
          break;
        }
      }
    }
  });

  window.addEventListener("resize", resizeIso);

  function loop() {
    isoAnimId = requestAnimationFrame(loop);
    isoOrbit.update();
    updateDesignerScreenInfo();
    if (isoRenderer) isoRenderer.render(isoScene, isoCamera);
  }
  loop();
}

// ── Chambre vide ──
function buildEmptyRoom(scene) {
  const W = 10,
    H = 3.8,
    D = 10;

  const wallMat = new THREE.MeshStandardMaterial({
    color: 0xf2e8d8,
    roughness: 0.9,
  });
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0xd4a96a,
    roughness: 0.72,
  });
  const ceilMat = new THREE.MeshStandardMaterial({
    color: 0xf8f0e4,
    roughness: 1,
  });
  const rugMat = new THREE.MeshStandardMaterial({
    color: 0xa06050,
    roughness: 1,
  });
  const moldMat = new THREE.MeshStandardMaterial({
    color: 0xefe0cc,
    roughness: 0.5,
  });

  function mk(geo, mat, x, y, z, rx = 0, ry = 0) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.rotation.set(rx, ry, 0);
    m.receiveShadow = true;
    m.castShadow = true;
    scene.add(m);
    return m;
  }

  mk(new THREE.PlaneGeometry(W, D), floorMat, 0, 0, 0, -Math.PI / 2);
  mk(new THREE.PlaneGeometry(W, D), ceilMat, 0, H, 0, Math.PI / 2);
  mk(new THREE.PlaneGeometry(W, H), wallMat, 0, H / 2, -D / 2);
  mk(new THREE.PlaneGeometry(D, H), wallMat, -W / 2, H / 2, 0, 0, Math.PI / 2);
  mk(new THREE.PlaneGeometry(D, H), wallMat, W / 2, H / 2, 0, 0, -Math.PI / 2);
  mk(new THREE.PlaneGeometry(W, H), wallMat, 0, H / 2, D / 2, 0, Math.PI);
  mk(new THREE.BoxGeometry(5.5, 0.02, 4.5), rugMat, 0, 0.01, 0.5);

  mk(new THREE.BoxGeometry(W, 0.1, 0.04), moldMat, 0, 0.05, -D / 2 + 0.04);
  mk(new THREE.BoxGeometry(W, 0.1, 0.04), moldMat, 0, 0.05, D / 2 - 0.04);
  mk(new THREE.BoxGeometry(0.04, 0.1, D), moldMat, -W / 2 + 0.04, 0.05, 0);
  mk(new THREE.BoxGeometry(0.04, 0.1, D), moldMat, W / 2 - 0.04, 0.05, 0);

  buildEmptyWindow(scene, W, H, D);
  buildEmptyDoor(scene, D, W);

  scene._wallMat = wallMat;
  scene._floorMat = floorMat;
  scene._rugMat = rugMat;

  scene.add(new THREE.AmbientLight(0xfff8ec, 1.4));
  scene.add(new THREE.HemisphereLight(0xf8f4d9, 0x606080, 1.0));
  const key = new THREE.DirectionalLight(0xfff0e0, 2.2);
  key.position.set(4, 8, 5);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.bias = -0.001;
  scene.add(key);
  isoLight = key;
  const fill = new THREE.DirectionalLight(0x8899cc, 0.75);
  fill.position.set(-4, 4, -3);
  scene.add(fill);
}

function buildEmptyWindow(scene, W, H, D) {
  const wood = new THREE.MeshStandardMaterial({
    color: 0x8b6340,
    roughness: 0.6,
  });
  const glass = new THREE.MeshStandardMaterial({
    color: 0xaaddff,
    roughness: 0.04,
    metalness: 0.1,
    transparent: true,
    opacity: 0.38,
  });
  const g = new THREE.Group();
  g.position.set(1.5, 2.0, -D / 2 + 0.02);
  scene.add(g);
  const add = (geo, mat, x = 0, y = 0) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, 0);
    g.add(m);
  };
  add(new THREE.BoxGeometry(2.2, 0.1, 0.12), wood, 0, 1.0);
  add(new THREE.BoxGeometry(2.2, 0.1, 0.12), wood, 0, -1.0);
  add(new THREE.BoxGeometry(0.1, 2.1, 0.12), wood, -1.05, 0);
  add(new THREE.BoxGeometry(0.1, 2.1, 0.12), wood, 1.05, 0);
  add(new THREE.BoxGeometry(0.06, 1.95, 0.06), wood, 0, 0);
  add(new THREE.BoxGeometry(2.0, 0.06, 0.06), wood, 0, 0);
  add(new THREE.BoxGeometry(2.0, 1.95, 0.03), glass, 0, 0);
  const ledge = new THREE.Mesh(
    new THREE.BoxGeometry(2.4, 0.06, 0.22),
    new THREE.MeshStandardMaterial({ color: 0xf5ede0, roughness: 0.5 }),
  );
  ledge.position.set(1.5, 1.02, -D / 2 + 0.13);
  scene.add(ledge);
}

function buildEmptyDoor(scene, D, W) {
  const wood = new THREE.MeshStandardMaterial({
    color: 0x8b6340,
    roughness: 0.6,
  });
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.9, 2.1, 0.08), wood);
  door.position.set(-3.5, 1.05, D / 2 - 0.04);
  scene.add(door);
}

function resizeIso() {
  const container = document.getElementById("isoViewport");
  if (!container || !isoRenderer || !isoCamera) return;
  const w = container.clientWidth;
  const h = container.clientHeight;
  isoRenderer.setSize(w, h);
  isoCamera.aspect = w / h;
  isoCamera.updateProjectionMatrix();
}

function updateDesignerScreenInfo() {
  const info = document.getElementById("designerScreenInfo");
  if (!info || !isoCamera || !isoOrbit) return;
  const dist = isoCamera.position.distanceTo(isoOrbit.target);
  const zoom = Math.round(
    THREE.MathUtils.clamp(
      (1 -
        (dist - isoOrbit.minDistance) /
          (isoOrbit.maxDistance - isoOrbit.minDistance)) *
        100,
      0,
      100,
    ),
  );
  const scale = isoModel?.scale?.x ? isoModel.scale.x.toFixed(2) : "1.00";
  const furName = currentSelectedFurniture
    ? FURNITURE_CATALOG[currentSelectedFurniture]?.label
    : "Sélectionnez un meuble";
  info.textContent = `${furName} • Zoom: ${zoom}% • Scale: ${scale}×`;
}

function stopIsoScene() {
  if (isoAnimId) cancelAnimationFrame(isoAnimId);
  if (isoTransform) isoTransform.detach();
  if (isoRenderer) isoRenderer.dispose();
  isoRenderer =
    isoScene =
    isoCamera =
    isoOrbit =
    isoTransform =
    isoModel =
      null;
  window.removeEventListener("resize", resizeIso);
}

// ═══════════════════════════════════════════════════════════════
//  SÉLECTION ET INVENTAIRE
// ═══════════════════════════════════════════════════════════════
function createFurnitureSelectables() {
  // Les boîtes invisibles ne sont plus nécessaires pour la sélection
  // car on clique directement sur les modèles placés.
  // On les garde au cas où la scène est vide (première ouverture).
  const furniturePositions = {
    bed: { pos: [-2.2, 1.0, -1.8] },
    nighttable: { pos: [-3.7, 0.35, 0.8] },
    wardrobe: { pos: [-3.3, 1.1, -3.4] },
    desk: { pos: [2.4, 0.55, 1.6] },
    chair: { pos: [2.2, 0.5, 2.8] },
    lamp: { pos: [-3.6, 0.8, 0.6] },
    plant: { pos: [3.3, 0.65, -3.1] },
    sink: { pos: [3.5, 0.5, -1.0] },
  };

  for (const [key, data] of Object.entries(furniturePositions)) {
    // Ne créer la boîte que si le meuble n'est pas déjà dans la scène
    if (placedFurniture[key]?.model) continue;

    const selectBox = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0,
      }),
    );
    selectBox.position.set(...data.pos);
    selectBox.userData.furnitureType = key;
    isoScene.add(selectBox);
  }
}

function selectFurniture(furnitureType) {
  if (!FURNITURE_CATALOG[furnitureType]) return;

  // Sauvegarder l'état du meuble précédemment sélectionné
  if (
    isoModel &&
    currentSelectedFurniture &&
    currentSelectedFurniture !== furnitureType
  ) {
    saveCurrentModelState();
    isoTransform.detach();
    isoModel = null;
  }

  currentSelectedFurniture = furnitureType;
  const catalog = FURNITURE_CATALOG[furnitureType];

  // Mettre à jour l'UI
  document.getElementById("isoStepEmoji").textContent = catalog.emoji;
  document.getElementById("isoStepTitle").textContent = catalog.label;
  document.getElementById("isoStepGuide").textContent =
    `Personnalisez votre ${catalog.label.toLowerCase()}`;

  buildInventoryGrid(furnitureType);

  // Si ce meuble est déjà placé, ré-attacher le gizmo directement
  const existing = placedFurniture[furnitureType];
  if (existing?.model?.parent === isoScene) {
    isoModel = existing.model;
    isoTransform.attach(isoModel);
    syncSlidersFromModel();
    return;
  }

  // Sinon charger le modèle par défaut
  const defaultVariant = catalog.variants[0];
  loadFurnitureIntoIso(furnitureType, defaultVariant.path);
}

function disposePreviewRenderers() {
  previewRenderers.forEach((renderer, canvas) => {
    if (renderer) {
      renderer.forceContextLoss();
      renderer.dispose();
    }
  });
  previewRenderers.clear();
}

function buildInventoryGrid(furnitureType) {
  disposePreviewRenderers();
  const grid = document.getElementById("inventoryGrid");
  grid.innerHTML = "";
  const catalog = FURNITURE_CATALOG[furnitureType];
  if (!catalog) return;

  catalog.variants.forEach((v) => {
    const btn = document.createElement("button");
    btn.className = "variant-btn";
    btn.dataset.path = v.path;

    const previewWrapper = document.createElement("div");
    previewWrapper.className = "variant-preview";
    const previewCanvas = document.createElement("canvas");
    previewCanvas.className = "variant-preview-canvas";
    previewWrapper.appendChild(previewCanvas);

    const info = document.createElement("div");
    info.className = "variant-label";
    info.innerHTML = `<span class="vb-emoji">${v.emoji}</span><span>${v.label}</span>`;

    btn.appendChild(previewWrapper);
    btn.appendChild(info);
    grid.appendChild(btn);

    btn.addEventListener("click", async () => {
      await loadFurnitureIntoIso(furnitureType, v.path);
    });

    createVariantPreview(v, previewCanvas);
  });

  buildColorPalette(furnitureType);
}

// ═══════════════════════════════════════════════════════════════
//  CHARGEMENT MEUBLE — logique principale corrigée
// ═══════════════════════════════════════════════════════════════
async function loadFurnitureIntoIso(furnitureType, path) {
  if (!isoScene || !isoTransform) return;
  const catalog = FURNITURE_CATALOG[furnitureType];
  if (!catalog) return;

  // 1. Sauvegarder l'état du meuble courant SANS le retirer de la scène
  if (isoModel && currentSelectedFurniture) {
    saveCurrentModelState();
    isoTransform.detach();
    isoModel = null;
  }

  // 2. Si ce type de meuble est déjà dans la scène ISO, ré-attacher le gizmo
  const existing = placedFurniture[furnitureType];
  if (existing?.model?.parent === isoScene) {
    isoModel = existing.model;
    isoTransform.attach(isoModel);
    syncSlidersFromModel();
    return;
  }

  // 3. Charger un nouveau modèle et l'ajouter à la scène (il y reste)
  showIsoLoading(true);
  try {
    let model;
    if (modelCache[path]) {
      model = modelCache[path].clone();
    } else {
      const gltf = await new Promise((res, rej) =>
        gltfLoader.load(path, res, undefined, rej),
      );
      modelCache[path] = gltf.scene;
      model = gltf.scene.clone();
    }

    // Auto-scale
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    if (maxDim > 0) model.scale.setScalar(catalog.targetSize / maxDim);

    // Poser sur le sol
    const box2 = new THREE.Box3().setFromObject(model);
    model.position.y = -box2.min.y;

    model.traverse((c) => {
      if (c.isMesh) {
        c.castShadow = true;
        c.receiveShadow = true;
      }
    });

    isoScene.add(model);
    isoModel = model;
    isoTransform.attach(model);

    // Enregistrer immédiatement dans placedFurniture
    placedFurniture[furnitureType] = {
      type: furnitureType,
      model: model,
      data: {
        scale: model.scale.clone(),
        rotation: model.rotation.clone(),
        position: model.position.clone(),
      },
    };

    // Ajuster caméra sur le meuble
    const box3 = new THREE.Box3().setFromObject(model);
    const center = box3.getCenter(new THREE.Vector3());
    if (isoOrbit) {
      isoOrbit.target.copy(center);
      isoOrbit.target.y += 0.5;
      isoOrbit.update();
    }

    if (isoLight) {
      isoLight.intensity = 3;
      setTimeout(() => {
        if (isoLight) isoLight.intensity = 2.2;
      }, 400);
    }

    resetSliders();
  } catch (err) {
    console.warn("⚠️ Modèle non trouvé:", path, err);
  }
  showIsoLoading(false);
}

async function createVariantPreview(variant, canvas) {
  const previewScene = new THREE.Scene();
  previewScene.background = new THREE.Color(0x0f121f);

  const hemi = new THREE.HemisphereLight(0xf8f4d9, 0x444766, 0.8);
  previewScene.add(hemi);
  const key = new THREE.DirectionalLight(0xffffff, 1.2);
  key.position.set(2, 4, 2);
  previewScene.add(key);

  const previewCamera = new THREE.PerspectiveCamera(40, 240 / 140, 0.1, 50);
  previewCamera.position.set(0, 1.2, 2.2);
  previewCamera.lookAt(0, 0.7, 0);

  const previewRenderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
  });
  previewRenderer.setPixelRatio(1);
  previewRenderer.setSize(240, 140);
  previewRenderers.set(canvas, previewRenderer);

  try {
    const model = await loadPreviewModel(variant.path);
    if (!model) return;

    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    model.position.sub(center);
    model.position.y -= box.min.y;
    const maxDim = Math.max(size.x, size.y, size.z);
    const distance = Math.max(maxDim * 2.2, 1.8);
    previewCamera.position.set(distance, distance * 0.85, distance);
    previewCamera.lookAt(0, Math.max(size.y, 1) * 0.4, 0);
    previewCamera.updateProjectionMatrix();

    previewScene.add(model);
    previewRenderer.render(previewScene, previewCamera);
  } catch (err) {
    console.warn("⚠️ Préview échouée:", err);
  }
}

async function loadPreviewModel(path) {
  if (modelCache[path]) return modelCache[path].clone();
  try {
    const gltf = await new Promise((res, rej) =>
      gltfLoader.load(path, res, undefined, rej),
    );
    if (!gltf || !gltf.scene) return null;
    modelCache[path] = gltf.scene;
    return gltf.scene.clone();
  } catch (err) {
    return null;
  }
}

function buildColorPalette(furnitureType) {
  const palette = document.getElementById("colorPalette");
  palette.innerHTML = "";
  const catalog = FURNITURE_CATALOG[furnitureType];
  if (!catalog) return;

  catalog.colors.forEach((hex) => {
    const sw = document.createElement("button");
    sw.className = "color-sw";
    sw.style.background = hex;
    sw.title = hex;
    sw.onclick = () => {
      palette
        .querySelectorAll(".color-sw")
        .forEach((s) => s.classList.remove("active"));
      sw.classList.add("active");
      applyColorToModel(hex);
    };
    palette.appendChild(sw);
  });

  const picker = document.createElement("input");
  picker.type = "color";
  picker.className = "color-sw color-picker-btn";
  picker.title = "Couleur personnalisée";
  picker.oninput = (e) => {
    palette
      .querySelectorAll(".color-sw")
      .forEach((s) => s.classList.remove("active"));
    applyColorToModel(e.target.value);
  };
  palette.appendChild(picker);
}

function applyColorToModel(hex) {
  if (!isoModel) return;
  const color = new THREE.Color(hex);
  isoModel.traverse((c) => {
    if (c.isMesh && c.material) {
      const mats = Array.isArray(c.material) ? c.material : [c.material];
      mats.forEach((m) => {
        m.color = color.clone();
      });
    }
  });
  // Sauvegarder la couleur dans les données du meuble
  if (currentSelectedFurniture && placedFurniture[currentSelectedFurniture]) {
    placedFurniture[currentSelectedFurniture].data =
      placedFurniture[currentSelectedFurniture].data || {};
    placedFurniture[currentSelectedFurniture].data.color = hex;
  }
}

// ═══════════════════════════════════════════════════════════════
//  SLIDERS
// ═══════════════════════════════════════════════════════════════
function resetSliders() {
  document.getElementById("isoScaleSlider").value = 1;
  document.getElementById("isoRotSlider").value = 0;
  syncSlidersUI();
}

function syncSlidersUI() {
  const s = document.getElementById("isoScaleSlider").value;
  const r = document.getElementById("isoRotSlider").value;
  document.getElementById("isoScaleVal").textContent =
    parseFloat(s).toFixed(2) + "×";
  document.getElementById("isoRotVal").textContent =
    parseFloat(r).toFixed(0) + "°";
}

function syncSlidersFromModel() {
  if (!isoModel) return;
  document.getElementById("isoScaleSlider").value = isoModel.scale.x;
  document.getElementById("isoRotSlider").value = THREE.MathUtils.radToDeg(
    isoModel.rotation.y,
  );
  syncSlidersUI();
  // Auto-save à chaque déplacement via gizmo
  if (currentSelectedFurniture) saveCurrentModelState();
}

// ═══════════════════════════════════════════════════════════════
//  TERMINER — Appliquer tous les meubles dans la scène principale
// ═══════════════════════════════════════════════════════════════
async function finishDesigner() {
  // Sauvegarder l'état du meuble courant avant d'appliquer
  if (isoModel && currentSelectedFurniture) saveCurrentModelState();

  showIsoLoading(true, "Application à ta chambre…");

  for (const furnitureType in placedFurniture) {
    const furData = placedFurniture[furnitureType];
    if (!furData.model || !furData.data) continue;

    try {
      const model = furData.model.clone();
      model.scale.copy(furData.data.scale);
      model.rotation.copy(furData.data.rotation);
      model.position.copy(furData.data.position);

      // Réappliquer la couleur si définie
      if (furData.data.color) {
        const color = new THREE.Color(furData.data.color);
        model.traverse((c) => {
          if (c.isMesh && c.material) {
            const mats = Array.isArray(c.material) ? c.material : [c.material];
            mats.forEach((m) => {
              m.color = color.clone();
            });
          }
        });
      }

      model.traverse((c) => {
        if (c.isMesh) {
          c.castShadow = true;
          c.receiveShadow = true;
        }
      });

      // Remplacer dans la scène principale
      const existing = roomObjects[furnitureType];
      if (existing) mainScene.remove(existing);
      mainScene.add(model);
      roomObjects[furnitureType] = model;
    } catch (err) {
      console.warn("⚠️ Erreur application", furnitureType, err);
    }
  }

  showIsoLoading(false);
  closeDesigner();
  showFinalMessage();
}

function showFinalMessage() {
  const msg = document.createElement("div");
  msg.id = "designerFinalMsg";
  msg.innerHTML = `✨ Ta chambre est prête !<br><span>Good morning style 🌅</span>`;
  document.body.appendChild(msg);
  setTimeout(() => msg.classList.add("show"), 100);
  setTimeout(() => {
    msg.classList.remove("show");
    setTimeout(() => msg.remove(), 600);
  }, 3000);
}

function showIsoLoading(visible, msg = "Chargement…") {
  const el = document.getElementById("isoLoading");
  if (!el) return;
  el.style.opacity = visible ? "1" : "0";
  el.style.pointerEvents = visible ? "all" : "none";
  el.querySelector("span").textContent = msg;
}

// ═══════════════════════════════════════════════════════════════
//  HTML
// ═══════════════════════════════════════════════════════════════
function injectHTML() {
  const fade = document.createElement("div");
  fade.id = "mainCanvasFade";
  document.body.appendChild(fade);

  const openBtn = document.createElement("button");
  openBtn.id = "designerOpenBtn";
  openBtn.innerHTML = `🎨 Designer ta chambre`;
  document.body.appendChild(openBtn);

  const overlay = document.createElement("div");
  overlay.id = "designerOverlay";
  overlay.innerHTML = `
    <div id="designerHeader">
      <div id="designerHeaderLeft">
        <span id="designerTitle">🏠 Room Designer</span>
        <div id="designerProgressBar"><div id="designerProgressFill"></div></div>
      </div>
      <div id="designerHeaderRight">
        <button id="designerExpandBtn">⤢ Agrandir</button>
        <button id="designerCloseBtn">✕ Fermer</button>
      </div>
    </div>

    <div id="designerBody">
      <div id="designerLeft">
        <div id="stepInfoCard">
          <div id="isoStepEmoji">🛏️</div>
          <div id="isoStepTitle">Sélectionnez un meuble</div>
          <div id="isoStepGuide">Cliquez sur un meuble dans la scène pour le personnaliser</div>
        </div>

        <div class="ctrl-section">
          <div class="ctrl-label">🔄 Modèles</div>
          <div id="inventoryGrid"></div>
        </div>

        <div class="ctrl-section">
          <div class="ctrl-label">🎨 Couleur</div>
          <div id="colorPalette"></div>
        </div>

        <div class="ctrl-section">
          <div class="ctrl-label">⇲ Taille &nbsp;<span id="isoScaleVal">1.00×</span></div>
          <input type="range" id="isoScaleSlider" min="0.3" max="3" step="0.05" value="1">
        </div>

        <div class="ctrl-section">
          <div class="ctrl-label">↻ Rotation &nbsp;<span id="isoRotVal">0°</span></div>
          <input type="range" id="isoRotSlider" min="-180" max="180" step="5" value="0">
        </div>

        <div class="ctrl-section">
          <div class="ctrl-label">🕹️ Mode gizmo</div>
          <div class="gizmo-modes">
            <button class="gizmo-btn active" data-mode="translate">↔ Déplacer</button>
            <button class="gizmo-btn" data-mode="rotate">↻ Tourner</button>
            <button class="gizmo-btn" data-mode="scale">⇲ Redimensionner</button>
          </div>
        </div>
      </div>

      <div id="designerRight">
        <div id="isoViewport">
          <canvas id="isoCanvas"></canvas>
          <div id="isoLoading">
            <div class="iso-ring"></div>
            <span>Chargement…</span>
          </div>
          <div id="isoCamHint">🖱️ Glisser pour tourner · Scroll pour zoomer · Cliquez sur un meuble</div>
        </div>
      </div>
    </div>

    <div id="designerFooter">
      <div id="designerScreenInfo">Sélectionnez un meuble • Zoom: 100%</div>
      <button id="designerFinishBtn">✨ Terminer & Appliquer</button>
    </div>
  `;

  document.body.appendChild(overlay);
}

// ═══════════════════════════════════════════════════════════════
//  STYLES
// ═══════════════════════════════════════════════════════════════
function injectStyles() {
  const s = document.createElement("style");
  s.textContent = `
#mainCanvasFade { display: none; }
#designerOpenBtn {
  position: fixed; bottom: 180px; right: 18px;
  padding: 11px 20px; border-radius: 24px;
  border: 1px solid rgba(240,168,80,0.5);
  background: rgba(10,8,24,0.88);
  color: #f0d080; font-family: var(--font-body,sans-serif);
  font-size: 13px; font-weight: 600; cursor: pointer;
  z-index: 70; backdrop-filter: blur(14px);
  transition: all 0.2s; box-shadow: 0 4px 20px rgba(240,168,80,0.15);
}
#designerOpenBtn:hover { transform: translateY(-2px); box-shadow: 0 8px 28px rgba(240,168,80,0.3); }

#designerOverlay {
  position: fixed; right: 0; top: 0; width: 50%; height: 100vh; z-index: 100;
  display: flex; flex-direction: column;
  background: rgba(8,6,20,0.97); backdrop-filter: blur(20px);
  border-left: 1px solid rgba(240,168,80,0.15);
  opacity: 0; pointer-events: none; transform: translateX(100%);
  transition: opacity 0.4s, transform 0.4s;
}
#designerOverlay.show { opacity: 1; pointer-events: all; transform: translateX(0); }

#designerHeader {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 24px; border-bottom: 1px solid rgba(240,168,80,0.15);
  background: rgba(255,255,255,0.02); flex-shrink: 0;
}
#designerHeaderLeft { display: flex; align-items: center; gap: 16px; }
#designerTitle { color: #f0d080; font-family: var(--font-display,serif); font-size: 18px; letter-spacing: 1px; }
#designerProgressBar { width: 180px; height: 3px; background: rgba(255,255,255,0.08); border-radius: 4px; overflow: hidden; }
#designerProgressFill { height: 100%; background: linear-gradient(90deg,#c06030,#f0d080); border-radius: 4px; transition: width 0.5s; }
#designerCloseBtn, #designerExpandBtn {
  padding: 7px 16px; border-radius: 16px;
  border: 1px solid rgba(255,255,255,0.15); background: rgba(255,255,255,0.06);
  color: rgba(255,255,255,0.75); cursor: pointer; font-size: 12px;
  font-family: var(--font-body,sans-serif); transition: all 0.2s;
}
#designerCloseBtn:hover { background: rgba(255,100,100,0.15); color: #ff8888; }
#designerExpandBtn:hover { background: rgba(255,255,255,0.12); color: #ffffff; }
#designerHeaderRight { display: flex; align-items: center; gap: 10px; }

#designerBody { display: flex; flex: 1; overflow: hidden; min-height: 0; }

#designerOverlay.designer-expanded { left: 0; right: auto; width: 100%; }
#designerOverlay.designer-expanded #designerLeft { display: none; }
#designerOverlay.designer-expanded #designerRight { flex: 1; }

#designerLeft {
  width: 280px; flex-shrink: 0; overflow-y: auto; overflow-x: hidden;
  padding: 20px 16px; border-right: 1px solid rgba(255,255,255,0.06);
  display: flex; flex-direction: column; gap: 14px;
}
#designerLeft::-webkit-scrollbar { width: 4px; }
#designerLeft::-webkit-scrollbar-thumb { background: rgba(240,168,80,0.25); border-radius: 4px; }

#designerRight { flex: 1; display: flex; flex-direction: column; gap: 12px; overflow: hidden; }

#isoViewport {
  flex: 1; position: relative; background: rgba(26,21,40,0.5); border-radius: 12px; margin: 14px;
  overflow: hidden;
}
#isoCanvas { width: 100%; height: 100%; display: block; }

#isoCamHint {
  position: absolute; bottom: 12px; left: 12px;
  color: rgba(255,255,255,0.5); font-size: 11px; pointer-events: none;
}

#stepInfoCard {
  text-align: center; padding: 16px 12px;
  background: rgba(240,168,80,0.06);
  border: 1px solid rgba(240,168,80,0.15); border-radius: 16px;
}
#isoStepEmoji { font-size: 40px; line-height: 1; margin-bottom: 6px; }
#isoStepTitle { color: #fff; font-family: var(--font-display,serif); font-size: 20px; margin-bottom: 4px; }
#isoStepGuide { color: rgba(255,220,160,0.65); font-size: 12px; line-height: 1.5; }

.ctrl-section { display: flex; flex-direction: column; gap: 8px; }
.ctrl-label { font-size: 10px; text-transform: uppercase; letter-spacing: 1.5px; color: rgba(240,168,80,0.55); }

#inventoryGrid { display: grid; grid-template-columns: repeat(auto-fill,minmax(120px,1fr)); gap: 12px; }
.variant-btn {
  display: flex; flex-direction: column; align-items: stretch; gap: 8px;
  padding: 8px; border-radius: 18px;
  border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.04);
  color: rgba(255,255,255,0.75); cursor: pointer;
  font-family: var(--font-body,sans-serif); transition: all 0.18s;
}
.variant-btn:hover { transform: translateY(-1px); background: rgba(240,168,80,0.1); border-color: rgba(240,168,80,0.3); }
.variant-btn.active { background: rgba(240,168,80,0.18); border-color: rgba(240,168,80,0.6); color: #f0d080; }
.variant-preview { width: 100%; aspect-ratio: 16/9; border-radius: 16px; overflow: hidden; background: rgba(10,12,24,0.96); }
.variant-preview-canvas { width: 100%; height: 100%; display: block; }
.variant-label { display: flex; flex-direction: column; gap: 6px; align-items: center; justify-content: center; font-size: 11px; text-align: center; }
.vb-emoji { font-size: 18px; }

#colorPalette { display: flex; flex-wrap: wrap; gap: 7px; }
.color-sw {
  width: 30px; height: 30px; border-radius: 8px; border: 2px solid transparent;
  cursor: pointer; transition: all 0.15s; box-shadow: 0 2px 8px rgba(0,0,0,0.5);
}
.color-sw:hover { transform: scale(1.15); }
.color-sw.active { border-color: #f0d080; transform: scale(1.18); box-shadow: 0 0 10px rgba(240,168,80,0.4); }
.color-picker-btn { padding: 0; overflow: hidden; }

input[type=range] {
  -webkit-appearance: none; width: 100%; height: 4px;
  border-radius: 4px; background: rgba(255,255,255,0.12); outline: none; cursor: pointer;
}
input[type=range]::-webkit-slider-thumb {
  -webkit-appearance: none; width: 16px; height: 16px;
  border-radius: 50%; background: #f0a850;
  box-shadow: 0 0 8px rgba(240,168,80,0.5); cursor: pointer;
}

.gizmo-modes { display: flex; gap: 6px; flex-wrap: wrap; }
.gizmo-btn {
  flex: 1; min-width: 100px; padding: 8px 10px; border-radius: 12px;
  border: 1px solid rgba(255,255,255,0.15); background: rgba(255,255,255,0.04);
  color: rgba(255,255,255,0.7); cursor: pointer; font-size: 11px; font-weight: 500;
  transition: all 0.2s;
}
.gizmo-btn:hover { background: rgba(240,168,80,0.1); }
.gizmo-btn.active { background: rgba(240,168,80,0.2); border-color: rgba(240,168,80,0.5); color: #f0d080; }

#designerFooter {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 24px; border-top: 1px solid rgba(240,168,80,0.15);
  background: rgba(255,255,255,0.02); flex-shrink: 0; gap: 16px;
}
#designerScreenInfo { flex: 1; color: rgba(255,255,255,0.75); font-size: 12px; text-align: center; }
#designerFinishBtn {
  padding: 10px 20px; border-radius: 20px;
  border: 1px solid rgba(240,168,80,0.6); background: rgba(240,168,80,0.15);
  color: #f0d080; cursor: pointer; font-family: var(--font-body,sans-serif);
  font-size: 13px; font-weight: 600; transition: all 0.2s;
}
#designerFinishBtn:hover { background: rgba(240,168,80,0.25); box-shadow: 0 4px 16px rgba(240,168,80,0.2); }

#isoLoading {
  position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
  display: flex; flex-direction: column; align-items: center; gap: 12px;
  opacity: 0; pointer-events: none; transition: opacity 0.3s;
  z-index: 50;
}
#isoLoading.show { opacity: 1; }
.iso-ring {
  width: 32px; height: 32px; border: 3px solid rgba(240,168,80,0.3);
  border-top-color: #f0a850; border-radius: 50%;
  animation: spin 1s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
#isoLoading span { color: rgba(240,168,80,0.8); font-size: 12px; }

#designerFinalMsg {
  position: fixed; bottom: 100px; right: 20px;
  padding: 16px 24px; border-radius: 20px;
  background: rgba(240,168,80,0.15); border: 1px solid rgba(240,168,80,0.4);
  color: #f0d080; font-size: 14px; text-align: center;
  z-index: 1000; backdrop-filter: blur(10px);
  opacity: 0; transform: translateY(20px);
  transition: all 0.3s;
}
#designerFinalMsg.show { opacity: 1; transform: translateY(0); }
`;
  document.head.appendChild(s);
}
