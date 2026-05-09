import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

// =============================================================
// MAPPING: variantId / type → fichier GLB
// =============================================================
const MODEL_PATHS_BY_VARIANT = {
  // Variantes spécifiques (correspond à furniture.js du mobile)
  "bed-1": "models/bed1.glb",
  "bed-2": "models/bed2.glb",
  "bed-3": "models/bed3.glb",
  "chair-0": "models/chair.glb",
  "chair-1": "models/chair1.glb",
  "chair-4": "models/chair4.glb",
  "table-1": "models/table1.glb",
  "table-2": "models/table2.glb",
  "lamp-1": "models/lampe.glb",
  "lamp-2": "models/lamp1.glb",
  "wardrobe-0": "models/wardrobe.glb",
  "wardrobe-1": "models/wardrobe1.glb",
  "plant-1": "models/plant1.glb",
  "plant-2": "models/plant2.glb",
};

// Fallback par type si variantId absent ou inconnu
const FALLBACK_PATHS_BY_TYPE = {
  "bed-1": "models/bed1.glb",
  "bed-2": "models/bed2.glb",
  "bed-3": "models/bed3.glb",
  "chair-0": "models/chair.glb",
  "chair-1": "models/chair1.glb",
  "chair-4": "models/chair4.glb",
  "table-1": "models/table1.glb",
  "table-2": "models/table2.glb",
  "lamp-1": "models/lampe.glb",
  "lamp-2": "models/lamp1.glb",
  "wardrobe-0": "models/wardrobe.glb",
  "wardrobe-1": "models/wardrobe1.glb",
  "plant-1": "models/plant1.glb",
  "plant-2": "models/plant2.glb",
};

const HEIGHT_BY_TYPE = {
  bed: 0.5,
  chair: 0.9,
  table: 0.7,
  lamp: 1.5,
  wardrobe: 2,
  plant: 1.2,
};

const ICON_BY_TYPE = {
  bed: "🛏️",
  chair: "🪑",
  table: "🪵",
  lamp: "💡",
  wardrobe: "🚪",
  plant: "🌿",
};

// =============================================================
// SETUP DE LA SCÈNE
// =============================================================
const canvas = document.getElementById("canvas");
const PANEL_WIDTH = 340;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a2e);
scene.fog = new THREE.Fog(0x1a1a2e, 15, 35);

const camera = new THREE.PerspectiveCamera(
  50,
  (window.innerWidth - PANEL_WIDTH) / window.innerHeight,
  0.1,
  100,
);
camera.position.set(8, 8, 8);

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  preserveDrawingBuffer: true, // pour les screenshots
});
renderer.setSize(window.innerWidth - PANEL_WIDTH, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// =============================================================
// LUMIÈRES
// =============================================================
const ambient = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambient);

const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
dirLight.position.set(8, 12, 6);
dirLight.castShadow = true;
dirLight.shadow.mapSize.set(2048, 2048);
dirLight.shadow.camera.left = -10;
dirLight.shadow.camera.right = 10;
dirLight.shadow.camera.top = 10;
dirLight.shadow.camera.bottom = -10;
dirLight.shadow.bias = -0.001;
scene.add(dirLight);

// =============================================================
// CHAMBRE
// =============================================================
const ROOM_SIZE_DEFAULT = 5;
const WALL_HEIGHT = 3;
const WALL_THICKNESS = 0.1;

const roomGroup = new THREE.Group();
scene.add(roomGroup);

function buildRoom(size = ROOM_SIZE_DEFAULT) {
  while (roomGroup.children.length) {
    const child = roomGroup.children[0];
    roomGroup.remove(child);
    if (child.geometry) child.geometry.dispose();
    if (child.material) child.material.dispose();
  }

  const floorMat = new THREE.MeshStandardMaterial({
    color: 0xf5e8d0,
    roughness: 0.85,
  });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(size, size), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(size / 2, 0, size / 2);
  floor.receiveShadow = true;
  roomGroup.add(floor);

  const wallMat = new THREE.MeshStandardMaterial({
    color: 0xe0d4ba,
    roughness: 0.95,
  });
  const northWall = new THREE.Mesh(
    new THREE.BoxGeometry(size, WALL_HEIGHT, WALL_THICKNESS),
    wallMat,
  );
  northWall.position.set(size / 2, WALL_HEIGHT / 2, 0);
  northWall.receiveShadow = true;
  roomGroup.add(northWall);

  const westWall = new THREE.Mesh(
    new THREE.BoxGeometry(WALL_THICKNESS, WALL_HEIGHT, size),
    wallMat,
  );
  westWall.position.set(0, WALL_HEIGHT / 2, size / 2);
  westWall.receiveShadow = true;
  roomGroup.add(westWall);

  const eastWall = new THREE.Mesh(
    new THREE.BoxGeometry(WALL_THICKNESS, WALL_HEIGHT, size),
    wallMat,
  );
  eastWall.position.set(size, WALL_HEIGHT / 2, size / 2);
  eastWall.receiveShadow = true;
  roomGroup.add(eastWall);
}

buildRoom();

// =============================================================
// CHARGEMENT DES MODÈLES
// =============================================================
const gltfLoader = new GLTFLoader();
const modelCache = {};

function getModelPath(item) {
  if (item.variantId && MODEL_PATHS_BY_VARIANT[item.variantId]) {
    return MODEL_PATHS_BY_VARIANT[item.variantId];
  }
  return FALLBACK_PATHS_BY_TYPE[item.type] || null;
}

function loadModel(path) {
  return new Promise((resolve, reject) => {
    if (modelCache[path]) {
      resolve(modelCache[path].clone());
      return;
    }
    gltfLoader.load(
      path,
      (gltf) => {
        modelCache[path] = gltf.scene;
        resolve(gltf.scene.clone());
      },
      undefined,
      (err) => reject(err),
    );
  });
}

function fitModelToBounds(model, targetWidth, targetDepth) {
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());

  model.position.x = -center.x;
  model.position.y = -box.min.y;
  model.position.z = -center.z;

  const scale = Math.min(targetWidth / size.x, targetDepth / size.z);
  model.scale.setScalar(scale);
}

function enableShadows(model) {
  model.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
      // Cloner le matériau pour permettre l'effet de sélection unique par instance
      if (child.material) {
        child.material = child.material.clone();
      }
    }
  });
}

// =============================================================
// MEUBLES
// =============================================================
const itemsGroup = new THREE.Group();
scene.add(itemsGroup);

function clearItems() {
  while (itemsGroup.children.length) {
    const child = itemsGroup.children[0];
    itemsGroup.remove(child);
    child.traverse?.((c) => {
      if (c.geometry) c.geometry.dispose();
      if (c.material) {
        if (Array.isArray(c.material)) c.material.forEach((m) => m.dispose());
        else c.material.dispose();
      }
    });
  }
  hideInfoPanel();
}

function addBoxFallback(item) {
  const height = HEIGHT_BY_TYPE[item.type] || 1;
  const geom = new THREE.BoxGeometry(item.width, height, item.depth);
  const mat = new THREE.MeshStandardMaterial({ color: item.color || "#888" });
  const mesh = new THREE.Mesh(geom, mat);

  const group = new THREE.Group();
  group.add(mesh);
  group.position.set(
    item.position[0] + item.width / 2,
    height / 2,
    item.position[1] + item.depth / 2,
  );
  group.rotation.y = -THREE.MathUtils.degToRad(item.rotation || 0);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.userData = { item };
  itemsGroup.add(group);
}

async function renderItems(items) {
  clearItems();

  for (const item of items) {
    const path = getModelPath(item);
    if (!path) {
      addBoxFallback(item);
      continue;
    }

    try {
      const model = await loadModel(path);
      fitModelToBounds(model, item.width, item.depth);
      enableShadows(model);

      const group = new THREE.Group();
      group.add(model);
      group.position.set(
        item.position[0] + item.width / 2,
        0,
        item.position[1] + item.depth / 2,
      );
      group.rotation.y = -THREE.MathUtils.degToRad(item.rotation || 0);
      group.userData = { item };

      itemsGroup.add(group);
    } catch (err) {
      console.warn(`Modèle ${path} non chargé:`, err);
      addBoxFallback(item);
    }
  }
}

// =============================================================
// CONTRÔLES CAMÉRA
// =============================================================
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.target.set(ROOM_SIZE_DEFAULT / 2, 1, ROOM_SIZE_DEFAULT / 2);
controls.minDistance = 3;
controls.maxDistance = 20;
controls.maxPolarAngle = Math.PI / 2 - 0.05;
controls.update();

// =============================================================
// SÉLECTION AU CLIC + RAYCASTING
// =============================================================
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let selectedGroup = null;

function getCanvasMouse(event) {
  const rect = canvas.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
}

function findItemGroup(object) {
  // Remonte la hiérarchie pour trouver le group qui contient userData.item
  let current = object;
  while (current && !current.userData?.item) {
    current = current.parent;
  }
  return current;
}

function applySelectionGlow(group, on = true) {
  group.traverse((child) => {
    if (child.isMesh && child.material) {
      if (on) {
        child.material.emissive = new THREE.Color(0xe94560);
        child.material.emissiveIntensity = 0.4;
      } else {
        child.material.emissive = new THREE.Color(0x000000);
        child.material.emissiveIntensity = 0;
      }
    }
  });
}

function selectItem(group) {
  if (selectedGroup === group) return;
  if (selectedGroup) applySelectionGlow(selectedGroup, false);
  selectedGroup = group;
  applySelectionGlow(group, true);
  showInfoPanel(group.userData.item);
}

function deselectItem() {
  if (selectedGroup) {
    applySelectionGlow(selectedGroup, false);
    selectedGroup = null;
  }
  hideInfoPanel();
}

// Hover: change cursor when over an item
canvas.addEventListener("mousemove", (event) => {
  getCanvasMouse(event);
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(itemsGroup.children, true);
  if (intersects.length > 0) {
    canvas.classList.add("hovering");
  } else {
    canvas.classList.remove("hovering");
  }
});

// Click: select item
canvas.addEventListener("click", (event) => {
  // Ne pas sélectionner si on a draggé la caméra
  if (controls.isDragging) return;

  getCanvasMouse(event);
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(itemsGroup.children, true);

  if (intersects.length > 0) {
    const group = findItemGroup(intersects[0].object);
    if (group) {
      selectItem(group);
    }
  } else {
    deselectItem();
  }
});

// ESC pour désélectionner
window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") deselectItem();
});

// =============================================================
// PANNEAU D'INFO
// =============================================================
const infoPanel = document.getElementById("infoPanel");
const infoClose = document.getElementById("infoClose");
const infoIcon = document.getElementById("infoIcon");
const infoName = document.getElementById("infoName");
const infoType = document.getElementById("infoType");
const infoVariant = document.getElementById("infoVariant");
const infoPosition = document.getElementById("infoPosition");
const infoSize = document.getElementById("infoSize");
const infoRotation = document.getElementById("infoRotation");
const infoColor = document.getElementById("infoColor");
const focusBtn = document.getElementById("focusBtn");

function showInfoPanel(item) {
  infoIcon.textContent = ICON_BY_TYPE[item.type] || "📦";
  infoName.textContent = capitalize(item.type);
  infoType.textContent = item.type;
  infoVariant.textContent = item.variantId || "—";
  infoPosition.textContent = `(${item.position[0]}, ${item.position[1]})`;
  infoSize.textContent = `${item.width} × ${item.depth} m`;
  infoRotation.textContent = `${item.rotation || 0}°`;
  infoColor.innerHTML = `<span class="color-dot" style="background:${item.color}"></span> ${item.color}`;

  infoPanel.classList.remove("hidden");
}

function hideInfoPanel() {
  infoPanel.classList.add("hidden");
}

function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : "";
}

infoClose.addEventListener("click", deselectItem);

// Focus caméra sur le meuble sélectionné (animation smooth)
focusBtn.addEventListener("click", () => {
  if (!selectedGroup) return;
  const item = selectedGroup.userData.item;
  const targetPos = new THREE.Vector3(
    item.position[0] + item.width / 2,
    0.5,
    item.position[1] + item.depth / 2,
  );

  // Anim caméra: 60 frames (~1 sec)
  const startCamPos = camera.position.clone();
  const startTarget = controls.target.clone();
  const endTarget = targetPos.clone();
  // Position caméra: à 3m de distance, légèrement en hauteur
  const offset = new THREE.Vector3(2, 2, 2);
  const endCamPos = targetPos.clone().add(offset);

  let frame = 0;
  const totalFrames = 60;
  function step() {
    frame++;
    const t = frame / totalFrames;
    // Easing easeInOutQuad
    const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    camera.position.lerpVectors(startCamPos, endCamPos, eased);
    controls.target.lerpVectors(startTarget, endTarget, eased);
    controls.update();
    if (frame < totalFrames) requestAnimationFrame(step);
  }
  step();
});

// =============================================================
// BOUCLE DE RENDU
// =============================================================
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();

// =============================================================
// REDIMENSIONNEMENT
// =============================================================
window.addEventListener("resize", () => {
  const w = window.innerWidth - PANEL_WIDTH;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
});

// =============================================================
// UI PRINCIPAL
// =============================================================
const jsonInput = document.getElementById("jsonInput");
const renderBtn = document.getElementById("renderBtn");
const loadDemoBtn = document.getElementById("loadDemoBtn");
const resetBtn = document.getElementById("resetBtn");
const statusEl = document.getElementById("status");

function setStatus(msg, isError = false) {
  statusEl.textContent = msg;
  statusEl.style.color = isError ? "#e94560" : "#a0e0a0";
}

renderBtn.addEventListener("click", async () => {
  try {
    const input = jsonInput.value.trim();
    if (!input) throw new Error('Colle un JSON ou clique "Demo".');
    const json = JSON.parse(input);
    if (!Array.isArray(json.items))
      throw new Error('JSON invalide: champ "items" manquant.');

    const roomSize = json.roomSize?.width || ROOM_SIZE_DEFAULT;
    currentRoomSize = roomSize; // pour les presets caméra
    buildRoom(roomSize);
    controls.target.set(roomSize / 2, 1, roomSize / 2);

    showLoading(`Chargement de ${json.items.length} modèle(s)...`);
    setStatus(`⏳ Chargement de ${json.items.length} modèle(s)...`);

    await renderItems(json.items);

    hideLoading();
    setStatus(
      `✅ ${json.items.length} meuble(s) rendus · clique sur un meuble pour info`,
    );
  } catch (err) {
    hideLoading();
    setStatus(`❌ ${err.message}`, true);
    console.error(err);
  }
});

loadDemoBtn.addEventListener("click", () => {
  const demo = {
    room: "bedroom",
    roomSize: { width: 5, depth: 5, unit: "meters" },
    items: [
      {
        type: "bed",
        variantId: "bed-1",
        position: [0.5, 0.5],
        rotation: 0,
        color: "#e94560",
        width: 2,
        depth: 2,
      },
      {
        type: "table",
        variantId: "table-1",
        position: [3, 1],
        rotation: 0,
        color: "#A0522D",
        width: 1.5,
        depth: 1.5,
      },
      {
        type: "lamp",
        variantId: "lamp-1",
        position: [3.7, 3.7],
        rotation: 0,
        color: "#FFD700",
        width: 0.5,
        depth: 0.5,
      },
      {
        type: "plant",
        variantId: "plant-1",
        position: [0.3, 4],
        rotation: 0,
        color: "#228B22",
        width: 0.5,
        depth: 0.5,
      },
      {
        type: "wardrobe",
        variantId: "wardrobe-1",
        position: [0.3, 2.5],
        rotation: 0,
        color: "#654321",
        width: 1.5,
        depth: 0.8,
      },
    ],
  };
  jsonInput.value = JSON.stringify(demo, null, 2);
  renderBtn.click();
});

resetBtn.addEventListener("click", () => {
  jsonInput.value = "";
  clearItems();
  buildRoom();
  controls.target.set(ROOM_SIZE_DEFAULT / 2, 1, ROOM_SIZE_DEFAULT / 2);
  setStatus("Reset effectué.");
});

setStatus('Prêt. Colle un JSON ou clique "Demo".');
// =============================================================
// CAMERA PRESETS (vues prédéfinies)
// =============================================================
function getCameraPreset(name, roomSize) {
  const center = roomSize / 2;
  switch (name) {
    case "iso":
      return {
        pos: [roomSize + 3, roomSize + 3, roomSize + 3],
        target: [center, 1, center],
      };
    case "top":
      return {
        pos: [center, roomSize * 2.2, center + 0.01],
        target: [center, 0, center],
      };
    case "front":
      return {
        pos: [center, 1.5, roomSize + 4],
        target: [center, 1, center],
      };
    default:
      return null;
  }
}

function animateCamera(targetPos, targetLookAt, duration = 60) {
  const startCamPos = camera.position.clone();
  const startTarget = controls.target.clone();
  const endCamPos = new THREE.Vector3(...targetPos);
  const endTarget = new THREE.Vector3(...targetLookAt);

  let frame = 0;
  function step() {
    frame++;
    const t = frame / duration;
    const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    camera.position.lerpVectors(startCamPos, endCamPos, eased);
    controls.target.lerpVectors(startTarget, endTarget, eased);
    controls.update();
    if (frame < duration) requestAnimationFrame(step);
  }
  step();
}

// Stocke la taille de chambre actuelle pour les presets
let currentRoomSize = ROOM_SIZE_DEFAULT;

document.querySelectorAll(".tool-btn[data-preset]").forEach((btn) => {
  btn.addEventListener("click", () => {
    document
      .querySelectorAll(".tool-btn[data-preset]")
      .forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");

    const preset = getCameraPreset(btn.dataset.preset, currentRoomSize);
    if (preset) animateCamera(preset.pos, preset.target);
  });
});

// =============================================================
// AUTO-ROTATION
// =============================================================
const autoRotateBtn = document.getElementById("autoRotateBtn");
autoRotateBtn.addEventListener("click", () => {
  controls.autoRotate = !controls.autoRotate;
  controls.autoRotateSpeed = 1.2;
  autoRotateBtn.classList.toggle("active", controls.autoRotate);
});

// =============================================================
// SCREENSHOT
// =============================================================
const screenshotBtn = document.getElementById("screenshotBtn");
screenshotBtn.addEventListener("click", () => {
  // Force un rendu avant de capturer
  renderer.render(scene, camera);
  const dataURL = renderer.domElement.toDataURL("image/png");

  const link = document.createElement("a");
  link.href = dataURL;
  link.download = `room-design-${Date.now()}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Feedback visuel
  screenshotBtn.classList.add("active");
  setTimeout(() => screenshotBtn.classList.remove("active"), 600);
});

// =============================================================
// LOADING OVERLAY
// =============================================================
const loadingOverlay = document.getElementById("loadingOverlay");
const loadingText = document.getElementById("loadingText");

function showLoading(msg = "Chargement...") {
  loadingText.textContent = msg;
  loadingOverlay.classList.remove("hidden");
}
function hideLoading() {
  loadingOverlay.classList.add("hidden");
}
// =============================================================
// CLOUD LOAD (depuis JSONBin)
// =============================================================
const codeInput = document.getElementById("codeInput");
const loadCodeBtn = document.getElementById("loadCodeBtn");
const codeStatus = document.getElementById("codeStatus");

function setCodeStatus(msg, isError = false) {
  codeStatus.textContent = msg;
  codeStatus.style.color = isError ? "#e94560" : "#a0e0a0";
}

async function loadFromCloud(binId) {
  const url = `https://api.jsonbin.io/v3/b/${binId}/latest`;
  const response = await fetch(url);

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error("Code introuvable. Vérifie qu'il est correct.");
    }
    if (response.status === 401 || response.status === 403) {
      throw new Error("Bin privé — non accessible.");
    }
    throw new Error(`Erreur ${response.status}`);
  }

  const data = await response.json();
  if (!data.record) {
    throw new Error("Pas de données dans ce bin.");
  }
  return data.record;
}

loadCodeBtn.addEventListener("click", async () => {
  const code = codeInput.value.trim();
  if (!code) {
    setCodeStatus("❌ Entre un code.", true);
    return;
  }

  // Validation basique de format (JSONBin = 24 char hex)
  if (code.length < 20) {
    setCodeStatus("❌ Code trop court (24 caractères attendus).", true);
    return;
  }

  try {
    setCodeStatus("⏳ Récupération du design...");
    const json = await loadFromCloud(code);

    // Met dans le textarea (pour transparence)
    jsonInput.value = JSON.stringify(json, null, 2);

    setCodeStatus("✅ Design récupéré, rendu en cours...");

    // Déclenche le render automatiquement
    renderBtn.click();
  } catch (err) {
    setCodeStatus(`❌ ${err.message}`, true);
    console.error("[loadFromCloud]", err);
  }
});

// Permet de charger en appuyant sur Entrée dans l'input
codeInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") loadCodeBtn.click();
});
