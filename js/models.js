// ═══════════════════════════════════════════════════════════════
//  models.js — Personnage FBX + Animations Mixamo
//  Morning Tale
// ═══════════════════════════════════════════════════════════════

import * as THREE from "three";
import { FBXLoader } from "three/addons/loaders/FBXLoader.js";
import { roomObjects } from "./room.js";

const fbxLoader = new FBXLoader();

// ── État du personnage ────────────────────────────────────────
export let character = null;
let mixer = null;

const actions = {}; // { 'walk': AnimationAction, ... }
let currentAction = null;

// Position cible pour le walk
const walkState = {
  from: new THREE.Vector3(),
  to: new THREE.Vector3(),
  t: 1,
  duration: 2.0,
  active: false,
  onDone: null,
};

const manualControl = {
  enabled: false,
  keys: {
    forward: false,
    backward: false,
    left: false,
    right: false,
  },
  speed: 2.2,
  radius: 0.4,
  sphere: new THREE.Sphere(new THREE.Vector3(), 0.4),
};

const worldBounds = new THREE.Box3(
  new THREE.Vector3(-4.4, 0, -4.4),
  new THREE.Vector3(4.4, 2.4, 4.4),
);

// ═══════════════════════════════════════════════════════════════
//  CHARGEMENT PERSONNAGE + ANIMATIONS
// ═══════════════════════════════════════════════════════════════
export async function loadCharacter(scene) {
  // 1. Charger le mesh du personnage
  character = await loadFBX("models/caracter3D/idle.fbx");
  if (!character) return;

  character.scale.setScalar(0.012);
  character.position.set(-2.2, 0, -1.0);
  character.rotation.y = Math.PI * 0.3;
  character.castShadow = true;
  character.traverse((c) => {
    if (c.isMesh) c.castShadow = true;
  });

  mixer = new THREE.AnimationMixer(character);

  // Animer les clips inclus dans le fichier principal
  if (character.animations?.length) {
    const base = mixer.clipAction(character.animations[0]);
    actions["idle"] = base;
    currentAction = null;
  }

  scene.add(character);

  // 2. Charger les animations Mixamo séparées
  await Promise.all([
    loadAnimation("models/caracter3D/Walk.fbx", "walk"),
    loadAnimation("models/caracter3D/Stand Up.fbx", "standup"),
    loadAnimation("models/caracter3D/Sitting Idle.fbx", "sit"),
    loadAnimation("models/caracter3D/Picking Up Object.fbx", "pickup"),
    loadAnimation("models/caracter3D/Standing Torch Light Torch.fbx", "hold"),
    loadAnimation("models/caracter3D/Stroke Shaking Head.fbx", "sleep"),
    loadAnimation("models/caracter3D/Situps.fbx", "situp"),
  ]);

  // Mesure le rayon de collision du personnage
  updateCharacterCollisionRadius();

  // Poser le personnage sur le lit en pose couchée pour le début de l'histoire
  initSleepingPose();

  console.log(
    "✅ models.js — Personnage + animations chargés",
    Object.keys(actions),
  );
}

// ── Helper charger FBX ────────────────────────────────────────
function loadFBX(path) {
  return new Promise((resolve) => {
    fbxLoader.load(path, resolve, undefined, (err) => {
      console.warn(`⚠️ FBX manquant: ${path}`, err);
      resolve(null);
    });
  });
}

// ── Charger une animation séparée ────────────────────────────

async function loadAnimation(path, key) {
  const anim = await loadFBX(path);
  if (!anim || !anim.animations?.length) return;
  console.log(`Animation ${key} tracks:`, anim.animations[0].tracks[0].name); // Vérifie le préfixe
  const clip = anim.animations[0];

  const action = mixer.clipAction(clip);
  action.clampWhenFinished = true;
  actions[key] = action;
}

// ═══════════════════════════════════════════════════════════════
//  JOUER UNE ANIMATION
// ═══════════════════════════════════════════════════════════════
export function playAnimation(key, loop = true, fadeTime = 0.4) {
  const next = actions[key];
  if (!next) return;

  // On force la sortie de pause au cas où
  next.paused = false;

  if (next === currentAction && next.isRunning()) return;

  next.reset();
  next.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 1);
  next.fadeIn(fadeTime);

  if (currentAction && currentAction !== next) currentAction.fadeOut(fadeTime);
  next.play();
  currentAction = next;
}

// ═══════════════════════════════════════════════════════════════
//  MARCHER VERS UNE POSITION
// ═══════════════════════════════════════════════════════════════
export function walkTo(pos, duration = 2.0, onDone = null) {
  if (!character) return;
  walkState.from.copy(character.position);
  walkState.to.set(...pos);
  walkState.t = 0;
  walkState.duration = duration;
  walkState.active = true;
  walkState.onDone = onDone;

  playAnimation("walk", true, 0.3, 0.5);

  // Orienter vers la destination
  const dir = new THREE.Vector3(...pos).sub(character.position);
  if (dir.length() > 0.1) {
    character.rotation.y = Math.atan2(dir.x, dir.z);
  }
}

// ═══════════════════════════════════════════════════════════════
//  UPDATE (appelé chaque frame depuis main.js)
// ═══════════════════════════════════════════════════════════════
function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

export function updateCharacter(dt) {
  if (!character) return;

  // 1. Toujours mettre à jour le mixer (indispensable pour voir le mouvement)
  mixer?.update(dt);

  // 2. PRIORITÉ 1 : Si une marche automatique (walkTo) est en cours
  if (walkState.active) {
    updateWalkTween(dt);
    return; // On s'arrête ici, on ne laisse pas le clavier interférer
  }

  // 3. PRIORITÉ 2 : Si une animation "OneTime" est en cours (ex: réveil, ramasser)
  // On vérifie si l'animation actuelle n'est pas en boucle (LoopRepeat)
  // et si elle est toujours en train de jouer.
  const isPlayingSpecial =
    currentAction &&
    currentAction.loop === THREE.LoopOnce &&
    currentAction.isRunning();

  if (isPlayingSpecial) {
    return; // On laisse l'animation spéciale finir sans forcer le "Idle"
  }

  // 4. PRIORITÉ 3 : Si rien d'autre ne se passe, on active le contrôle manuel
  updateCharacterManualMovement(dt);
}

// Petit helper pour garder le code propre (logique que tu avais déjà)
function updateWalkTween(dt) {
  walkState.t += dt / walkState.duration;
  const e = easeInOut(Math.min(walkState.t, 1));

  character.position.lerpVectors(walkState.from, walkState.to, e);
  character.position.y =
    THREE.MathUtils.lerp(walkState.from.y, walkState.to.y, e) +
    Math.sin(walkState.t * walkState.duration * 5) *
      0.04 *
      Math.sin(Math.PI * Math.min(walkState.t, 1));

  if (walkState.t >= 1) {
    walkState.active = false;
    character.position.y = walkState.to.y;
    playAnimation("idle", true, 0.4);
    walkState.onDone?.();
  }
}

// ═══════════════════════════════════════════════════════════════
//  ACTIONS SPÉCIALES (déclenchées par story.js)
// ═══════════════════════════════════════════════════════════════

function computeBedSleepingTransform(character) {
  const bed = roomObjects.bed;
  if (!bed || !character) return null;

  const bedBox = new THREE.Box3().setFromObject(bed);
  if (bedBox.isEmpty()) return null;

  const charBox = new THREE.Box3().setFromObject(character);
  if (charBox.isEmpty()) return null;

  const bedSize = bedBox.getSize(new THREE.Vector3());
  const mattressTopY = bedBox.min.y + bedSize.y * 0.22;

  const bedQuat = new THREE.Quaternion();
  bed.getWorldQuaternion(bedQuat);
  const bedRight = new THREE.Vector3(1, 0, 0)
    .applyQuaternion(bedQuat)
    .normalize();
  const bedForward = new THREE.Vector3(0, 0, 1)
    .applyQuaternion(bedQuat)
    .normalize();

  const position = new THREE.Vector3(
    (bedBox.min.x + bedBox.max.x) * 0.5,
    mattressTopY,
    (bedBox.min.z + bedBox.max.z) * 0.5,
  )
    .addScaledVector(bedRight, bedSize.x * 0.08)
    .addScaledVector(bedForward, bedSize.z * 0.05);

  const charBottomOffset = character.position.y - charBox.min.y;
  position.y += charBottomOffset - Math.max(0.02, bedSize.y * 0.03);

  const lyingAlongX = bedSize.x > bedSize.z;
  const rotationY = bed.rotation.y + (lyingAlongX ? Math.PI / 2 : 0);

  return { position, rotationY };
}

function computeBedExitTransform(character) {
  const bed = roomObjects.bed;
  if (!bed || !character) return null;

  const bedBox = new THREE.Box3().setFromObject(bed);
  if (bedBox.isEmpty()) return null;

  const charBox = new THREE.Box3().setFromObject(character);
  if (charBox.isEmpty()) return null;

  const bedSize = bedBox.getSize(new THREE.Vector3());
  const bedCenter = new THREE.Vector3(
    (bedBox.min.x + bedBox.max.x) * 0.5,
    bedBox.min.y,
    (bedBox.min.z + bedBox.max.z) * 0.5,
  );

  const bedQuat = new THREE.Quaternion();
  bed.getWorldQuaternion(bedQuat);
  const bedForward = new THREE.Vector3(0, 0, 1)
    .applyQuaternion(bedQuat)
    .normalize();

  const exitDirection = new THREE.Vector3();
  const roomCenter = new THREE.Vector3(0, 0, 0);
  const towardCenter = roomCenter.sub(bedCenter);
  const forwardSign = towardCenter.dot(bedForward) >= 0 ? 1 : -1;
  exitDirection.copy(bedForward).multiplyScalar(forwardSign);

  const margin = Math.max(manualControl.radius, 0.2);
  const offsetDistance = bedSize.z * 0.75 + margin;

  const position = new THREE.Vector3(
    (bedBox.min.x + bedBox.max.x) * 0.5,
    bedBox.max.y + (charBox.max.y - charBox.min.y) * 0.02,
    (bedBox.min.z + bedBox.max.z) * 0.5,
  ).addScaledVector(exitDirection, offsetDistance);

  position.y =
    bedBox.min.y +
    bedSize.y * 0.2 +
    Math.max(0.02, charBox.max.y - charBox.min.y) * 0.02;

  return { position, rotationY: character.rotation.y };
}

// ── Pose initiale — couché sur le lit ────────────────────────
export function initSleepingPose() {
  if (!character) return;

  const transform = computeBedSleepingTransform(character);
  if (transform) {
    character.position.copy(transform.position);
    character.rotation.y = transform.rotationY;
  } else {
    const bedPos = roomObjects.bed?.position;
    character.position.set(
      bedPos ? bedPos.x + 0.2 : -2.6,
      bedPos ? bedPos.y + 0.5 : 0.5,
      bedPos ? bedPos.z + 0.1 : -3.3,
    );
    character.rotation.y = Math.PI * 0.15;
  }

  const sleepAction = actions["sleep"];
  if (sleepAction) {
    sleepAction.reset();
    sleepAction.setLoop(THREE.LoopRepeat, Infinity);
    sleepAction.clampWhenFinished = false;
    if (currentAction && currentAction !== sleepAction)
      currentAction.fadeOut(0.05);
    sleepAction.fadeIn(0.3);
    sleepAction.play();
    currentAction = sleepAction;
  }
}

// Réveille le personnage depuis la pose couchée
export function doWakeUp(onDone) {
  if (!character) return;

  // 1. On monte le mesh au niveau du matelas pour le début du réveil
  character.position.y = 0.6;

  playAnimation("situp", false, 0.3);
  const duration = actions["situp"]
    ? actions["situp"].getClip().duration * 1000
    : 2500;

  setTimeout(() => {
    // 2. On téléporte le mesh là où l'animation visuelle s'est terminée
    // Cela évite le "glissement" vers l'arrière
    const forwardOffset = new THREE.Vector3(0, 0, 0.8); // Ajuste la valeur 0.8 selon l'anim
    forwardOffset.applyQuaternion(character.quaternion);
    character.position.add(forwardOffset);

    // 3. On pose le personnage au sol
    character.position.y = 0;

    playAnimation("idle", true, 0.5);
    onDone?.();
  }, duration);
}

export function doStandUp(onDone) {
  playAnimation("standup", false, 0.3);
  setTimeout(() => {
    playAnimation("idle", true, 0.4);
    onDone?.();
  }, 2000);
}

export function doPickup(onDone) {
  playAnimation("pickup", false, 0.3);
  setTimeout(() => {
    playAnimation("idle", true, 0.4);
    onDone?.();
  }, 2200);
}

export function doSit() {
  playAnimation("sit", true, 0.4);
}

export function doHold() {
  playAnimation("hold", true, 0.4);
}

// Tourner le personnage vers un point
export function lookAt(target) {
  if (!character) return;
  const dir = new THREE.Vector3(...target).sub(character.position);
  if (dir.length() > 0.05) {
    character.rotation.y = Math.atan2(dir.x, dir.z);
  }
}

function updateCharacterCollisionRadius() {
  if (!character) return;
  const box = new THREE.Box3().setFromObject(character);
  const size = box.getSize(new THREE.Vector3());
  manualControl.radius = Math.max(size.x, size.z) * 0.5;
  manualControl.sphere.radius = manualControl.radius;
}

function getCharacterSphere(position) {
  const sphere = manualControl.sphere;
  sphere.center.copy(position);
  sphere.center.y = manualControl.radius;
  return sphere;
}

function buildObstacleBoxes() {
  const boxes = [];
  for (const key of Object.keys(roomObjects)) {
    const obj = roomObjects[key];
    if (!obj || obj === character) continue;
    const box = new THREE.Box3().setFromObject(obj);
    if (!box.isEmpty()) boxes.push(box);
  }
  return boxes;
}

function sphereHitsObstacle(centerSphere) {
  const boxes = buildObstacleBoxes();
  for (const box of boxes) {
    if (box.intersectsSphere(centerSphere)) return true;
  }
  return false;
}

function clampToWorldBounds(position) {
  const sphere = getCharacterSphere(position);
  const innerBounds = worldBounds.clone().expandByScalar(-manualControl.radius);
  return innerBounds.containsPoint(sphere.center);
}

function updateCharacterManualMovement(dt) {
  if (!manualControl.enabled || walkState.active) return false;

  const dir = new THREE.Vector3();
  if (manualControl.keys.forward) dir.z -= 1;
  if (manualControl.keys.backward) dir.z += 1;
  if (manualControl.keys.left) dir.x -= 1;
  if (manualControl.keys.right) dir.x += 1;

  if (dir.lengthSq() === 0) {
    // Ne pas forcer idle si le personnage est encore en animation de sommeil ou en animation spéciale
    if (currentAction === actions["idle"] || currentAction === null) {
      playAnimation("idle", true, 0.2);
    }
    return false;
  }

  dir.normalize();
  const moveDistance = manualControl.speed * dt;

  const currentPos = character.position.clone();
  const targetPos = currentPos.clone().addScaledVector(dir, moveDistance);

  const xTest = currentPos.clone();
  xTest.x = targetPos.x;
  const zTest = currentPos.clone();
  zTest.z = targetPos.z;

  let moved = false;
  const xSphere = getCharacterSphere(xTest);
  if (clampToWorldBounds(xTest) && !sphereHitsObstacle(xSphere)) {
    character.position.x = xTest.x;
    moved = true;
  }

  const zSphere = getCharacterSphere(zTest);
  if (clampToWorldBounds(zTest) && !sphereHitsObstacle(zSphere)) {
    character.position.z = zTest.z;
    moved = true;
  }

  // If diagonal movement was blocked by a corner, try small single-axis corrections
  if (!moved) {
    const diagTest = currentPos.clone().addScaledVector(dir, moveDistance);
    const diagSphere = getCharacterSphere(diagTest);
    if (clampToWorldBounds(diagTest) && !sphereHitsObstacle(diagSphere)) {
      character.position.copy(diagTest);
      moved = true;
    }
  }

  if (moved) {
    character.rotation.y = Math.atan2(dir.x, dir.z);
    playAnimation("walk", true, 0.2);
  } else {
    playAnimation("idle", true, 0.2);
  }

  return moved;
}

export function initCharacterKeyboardControl() {
  if (manualControl.enabled) return;
  manualControl.enabled = true;

  window.addEventListener("keydown", onCharacterKeyDown);
  window.addEventListener("keyup", onCharacterKeyUp);
}

function onCharacterKeyDown(event) {
  const key = event.key.toLowerCase();
  if (event.repeat) return;
  switch (key) {
    case "z":
    case "arrowup":
      manualControl.keys.forward = true;
      break;
    case "s":
    case "arrowdown":
      manualControl.keys.backward = true;
      break;
    case "q":
    case "arrowleft":
      manualControl.keys.left = true;
      break;
    case "d":
    case "arrowright":
      manualControl.keys.right = true;
      break;
    default:
      return;
  }
  event.preventDefault();
}

function onCharacterKeyUp(event) {
  const key = event.key.toLowerCase();
  switch (key) {
    case "z":
    case "arrowup":
      manualControl.keys.forward = false;
      break;
    case "s":
    case "arrowdown":
      manualControl.keys.backward = false;
      break;
    case "q":
    case "arrowleft":
      manualControl.keys.left = false;
      break;
    case "d":
    case "arrowright":
      manualControl.keys.right = false;
      break;
    default:
      return;
  }
  event.preventDefault();
}
