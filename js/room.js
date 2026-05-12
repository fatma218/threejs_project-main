// ═══════════════════════════════════════════════════════════════
//  room.js — Chambre + meubles auto-scalés
//  Morning Tale
// ═══════════════════════════════════════════════════════════════

import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { Reflector } from "three/addons/objects/Reflector.js";
import { setInteractiveObjects } from "./core/SceneGlobals.js";

// ── Loader ────────────────────────────────────────────────────
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath(
  "https://unpkg.com/three@0.161.0/examples/jsm/libs/draco/",
);
const gltfLoader = new GLTFLoader();
gltfLoader.setDRACOLoader(dracoLoader);

// ── Objets de la chambre ──────────────────────────────────────
export const roomObjects = {
  bed: null,
  nightstand: null,
  wardrobe: null,
  desk: null,
  plant: null,
  sink: null,
  lamp: null,
  chair: null,
  door: null,
  mirror: null,
  glass: null,
  clock: null,
};

export const roomConfig = {
  wallColor: 0xf2e8d8,
  floorColor: 0xd4a96a,
  rugColor: 0xa06050,
};

// ═══════════════════════════════════════════════════════════════
//  AUTO-SCALE : ajuste le modèle à une taille cible en mètres
// ═══════════════════════════════════════════════════════════════
function autoScale(model, targetSize) {
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);
  if (maxDim > 0) model.scale.setScalar(targetSize / maxDim);

  // Recolle le bas du modèle au sol
  const box2 = new THREE.Box3().setFromObject(model);
  const minY = box2.min.y;
  model.position.y -= minY;
}

// ═══════════════════════════════════════════════════════════════
//  CHARGEMENT PRINCIPAL
// ═══════════════════════════════════════════════════════════════
export async function loadRoom(scene) {
  buildRoomShell(scene);

  // Chaque entrée : [path, posX, posZ, rotY, targetSize(hauteur max en m), key]
  const FURNITURE = [
    // Lit — contre le mur nord-ouest
    ["models/bed2.glb", -2.8, -3.5, 0, 2.0, "bed"],
    // Table de nuit — à droite du lit
    ["models/Night Stand.glb", -1.4, -3.2, 0, 0.8, "nightstand"],
    // Armoire — mur ouest
    ["models/wardrobe1.glb", -4.2, -1.0, Math.PI / 2, 2.2, "wardrobe"],
    // Bureau — coin est
    ["models/Desk.glb", 2.8, 1.5, -Math.PI / 2, 1.1, "desk"],
    // Plante — coin sud-est
    ["models/plant2.glb", 3.5, 3.5, 0, 1.3, "plant"],
    // Lavabo — mur est
    ["models/Countertop Sink.glb", 4.1, -1.8, -Math.PI / 2, 1.0, "sink"],
    // Lampe de sol — coin sud-ouest
    ["models/lamp1.glb", -3.8, 2.8, 0, 1.6, "lamp"],
    // Chaise bureau
    ["models/chair4.glb", 2.8, 2.8, Math.PI, 0.95, "chair"],
    // Verre et réveil sur la table de nuit
    ["models/Glass.glb", -1.4, -3.2, 0, 0.5, "glass"],
    ["models/clock.glb", -1.1, -3.1, 0, 0.5, "clock"],
  ];

  await Promise.all(
    FURNITURE.map(([path, x, z, rotY, size, key]) =>
      loadModel(scene, path, x, z, rotY, size, key),
    ),
  );

  buildMirror(scene);

  const interactives = Object.values(roomObjects).filter(Boolean);
  setInteractiveObjects(interactives);
  console.log("✅ room.js — Chambre chargée");
}

// ═══════════════════════════════════════════════════════════════
//  COQUE DE LA CHAMBRE  (10 × 10 × 3.8 m)
// ═══════════════════════════════════════════════════════════════
function buildRoomShell(scene) {
  const W = 10,
    H = 3.8,
    D = 10;

  const wallMat = new THREE.MeshStandardMaterial({
    color: roomConfig.wallColor,
    roughness: 0.9,
  });
  const floorMat = new THREE.MeshStandardMaterial({
    color: roomConfig.floorColor,
    roughness: 0.72,
  });
  const ceilMat = new THREE.MeshStandardMaterial({
    color: 0xf8f0e4,
    roughness: 1,
  });
  const rugMat = new THREE.MeshStandardMaterial({
    color: roomConfig.rugColor,
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
    scene.add(m);
    return m;
  }

  mk(new THREE.PlaneGeometry(W, D), floorMat, 0, 0, 0, -Math.PI / 2);
  mk(new THREE.PlaneGeometry(W, D), ceilMat, 0, H, 0, Math.PI / 2);
  mk(new THREE.PlaneGeometry(W, H), wallMat, 0, H / 2, -D / 2); // nord
  mk(new THREE.PlaneGeometry(D, H), wallMat, -W / 2, H / 2, 0, 0, Math.PI / 2); // ouest
  mk(new THREE.PlaneGeometry(D, H), wallMat, W / 2, H / 2, 0, 0, -Math.PI / 2); // est
  mk(new THREE.PlaneGeometry(W, H), wallMat, 0, H / 2, D / 2, 0, Math.PI); // sud

  // Tapis central
  mk(new THREE.BoxGeometry(5.5, 0.02, 4.5), rugMat, 0, 0.01, 0.5);

  // Plinthes
  mk(new THREE.BoxGeometry(W, 0.1, 0.04), moldMat, 0, 0.05, -D / 2 + 0.04);
  mk(new THREE.BoxGeometry(W, 0.1, 0.04), moldMat, 0, 0.05, D / 2 - 0.04);
  mk(new THREE.BoxGeometry(0.04, 0.1, D), moldMat, -W / 2 + 0.04, 0.05, 0);
  mk(new THREE.BoxGeometry(0.04, 0.1, D), moldMat, W / 2 - 0.04, 0.05, 0);

  buildWindow(scene, W, H, D);
  buildDoor(scene, D, W);

  scene._wallMat = wallMat;
  scene._floorMat = floorMat;
  scene._rugMat = rugMat;
}

// ── Fenêtre (mur nord, côté droit) ───────────────────────────
function buildWindow(scene, W, H, D) {
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

  // Rebord
  const ledge = new THREE.Mesh(
    new THREE.BoxGeometry(2.4, 0.06, 0.22),
    new THREE.MeshStandardMaterial({ color: 0xf5ede0, roughness: 0.5 }),
  );
  ledge.position.set(1.5, 1.02, -D / 2 + 0.13);
  scene.add(ledge);
}

// ── Porte (mur sud, côté gauche) ─────────────────────────────
function buildDoor(scene, D, W) {
  const wood = new THREE.MeshStandardMaterial({
    color: 0x9e7c5a,
    roughness: 0.65,
  });
  const metal = new THREE.MeshStandardMaterial({
    color: 0xc8a060,
    roughness: 0.25,
    metalness: 0.85,
  });

  const frame = new THREE.Group();
  frame.position.set(-1.5, 0, D / 2 - 0.02);
  scene.add(frame);

  [
    [new THREE.BoxGeometry(1.1, 0.1, 0.14), 0, 2.15],
    [new THREE.BoxGeometry(0.1, 2.2, 0.14), -0.55, 1.05],
    [new THREE.BoxGeometry(0.1, 2.2, 0.14), 0.55, 1.05],
  ].forEach(([geo, x, y]) => {
    const m = new THREE.Mesh(geo, wood);
    m.position.set(x, y, 0);
    frame.add(m);
  });

  const pivot = new THREE.Group();
  pivot.position.set(-1.5 - 0.5, 0, D / 2 - 0.02);
  scene.add(pivot);

  const panel = new THREE.Mesh(
    new THREE.BoxGeometry(1.0, 2.1, 0.07),
    new THREE.MeshStandardMaterial({ color: 0xb89070, roughness: 0.65 }),
  );
  panel.position.set(0.5, 1.05, 0);
  panel.castShadow = true;
  pivot.add(panel);

  [1.38, 0.55].forEach((py) => {
    const deco = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.88, 0.03),
      new THREE.MeshStandardMaterial({ color: 0xc8a07a, roughness: 0.6 }),
    );
    deco.position.set(0.5, py, -0.04);
    pivot.add(deco);
  });

  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 12), metal);
  knob.position.set(0.88, 1.05, -0.07);
  pivot.add(knob);

  pivot.userData.interactable = true;
  pivot.userData.name = "door";
  pivot.userData.onInteract = () =>
    window.dispatchEvent(new CustomEvent("story:interact", { detail: "door" }));

  roomObjects.door = pivot;
}

// ── Miroir (mur est) ─────────────────────────────────────────
function buildMirror(scene) {
  const wood = new THREE.MeshStandardMaterial({
    color: 0x9e7c5a,
    roughness: 0.35,
    metalness: 0.3,
  });
  const mirror = new THREE.MeshStandardMaterial({
    color: 0xddeeff,
    roughness: 0.01,
    metalness: 0.98,
  });

  const g = new THREE.Group();
  g.position.set(4.94, 1.9, -1.0);
  g.rotation.y = -Math.PI / 2;

  const frame = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.5, 0.08), wood);
  frame.castShadow = true;
  g.add(frame);

  const mirrorPlane = new Reflector(new THREE.PlaneGeometry(0.98, 1.36), {
    clipBias: 0.003,
    textureWidth: 512,
    textureHeight: 512,
    color: 0xddeeff,
  });
  mirrorPlane.position.z = 0.045;
  mirrorPlane.receiveShadow = true;
  g.add(mirrorPlane);

  scene.add(g);
  roomObjects.mirror = g;
  g.userData.interactable = true;
  g.userData.name = "mirror";
  g.userData.onInteract = () =>
    window.dispatchEvent(
      new CustomEvent("story:interact", { detail: "mirror" }),
    );
}

// ── Verre d'eau (sur table de nuit) ──────────────────────────

// ═══════════════════════════════════════════════════════════════
//  HELPER — Charger un GLB avec autoScale
// ═══════════════════════════════════════════════════════════════
function loadModel(scene, path, x, z, rotY, targetSize, key) {
  return new Promise((resolve) => {
    gltfLoader.load(
      path,
      (gltf) => {
        const model = gltf.scene;

        // 1. Scale auto
        autoScale(model, targetSize);

        // 2. Position APRÈS le scale
        model.position.x = x;
        model.position.z = z;
        model.rotation.y = rotY;

        model.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            if (child.material) child.material.envMapIntensity = 0.5;
          }
        });

        model.userData.interactable = true;
        model.name = key;
        model.userData.name = key;
        model.userData.onInteract = () =>
          window.dispatchEvent(
            new CustomEvent("story:interact", { detail: key }),
          );

        scene.add(model);
        roomObjects[key] = model;
        resolve(model);
      },
      undefined,
      (err) => {
        console.warn(`⚠️ ${path} manquant:`, err);
        buildFallbackBox(scene, x, z, targetSize, key);
        resolve(null);
      },
    );
  });
}

// ── Fallback box colorée si GLB absent ───────────────────────
function buildFallbackBox(scene, x, z, size, key) {
  const colors = {
    bed: "#c08060",
    nightstand: "#a07050",
    wardrobe: "#806040",
    desk: "#907050",
    plant: "#4a8040",
    sink: "#8090a0",
    lamp: "#c0b060",
    chair: "#a08060",
  };
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(size * 0.6, size, size * 0.6),
    new THREE.MeshStandardMaterial({
      color: colors[key] || "#888",
      roughness: 0.8,
    }),
  );
  mesh.position.set(x, size / 2, z);
  mesh.castShadow = true;
  mesh.userData.interactable = true;
  mesh.userData.name = key;
  mesh.userData.onInteract = () =>
    window.dispatchEvent(new CustomEvent("story:interact", { detail: key }));
  scene.add(mesh);
  roomObjects[key] = mesh;
}

// ═══════════════════════════════════════════════════════════════
//  DESIGNER API
// ═══════════════════════════════════════════════════════════════
export function setWallColor(color, scene) {
  if (scene._wallMat) scene._wallMat.color.set(color);
}
export function setFloorColor(color, scene) {
  if (scene._floorMat) scene._floorMat.color.set(color);
}
export function setRugColor(color, scene) {
  if (scene._rugMat) scene._rugMat.color.set(color);
}
