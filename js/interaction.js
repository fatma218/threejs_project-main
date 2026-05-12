// ═══════════════════════════════════════════════════════════════
//  interaction.js — Système de Smart Objects & Interactions
// ═══════════════════════════════════════════════════════════════

import * as THREE from "three";
import {
  walkTo,
  lookAt,
  doSit,
  doPickup,
  doHold,
  character,
} from "./models.js";
import {
  createWaterDrips,
  sparkBurst,
  lightRingPulse,
  createSteam,
} from "./effects.js";

let _camera, _scene;
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// ── CONFIGURATION DES SMART OBJECTS ───────────────────────────
// Ici, on définit comment le personnage doit réagir avec chaque meuble.
const INTERACTIVE_CONFIG = {
  lit: {
    action: "sit",
    approachPos: { x: -1.2, y: 0, z: -1.0 },
    lookAtPos: { x: -2.0, y: 0.5, z: -1.0 },
    color: 0x88ccff,
    label: "Se reposer",
  },
  lavabo: {
    action: "wash",
    approachPos: { x: 2.2, y: 0, z: -0.6 },
    lookAtPos: { x: 2.8, y: 1.1, z: -0.6 },
    color: 0x44ffff,
    label: "Se laver les mains",
  },
  lampe: {
    action: "hold",
    approachPos: { x: 0, y: 0, z: -1.8 },
    lookAtPos: { x: 0, y: 1.4, z: -2.3 },
    color: 0xffdd44,
    label: "Allumer la lampe",
  },
};

export function initInteraction(scene, camera) {
  _scene = scene;
  _camera = camera;
  window.addEventListener("click", onDocumentClick);
  console.log("🎯 Système d'interaction initialisé");
}

async function onDocumentClick(event) {
  // 1. Calcul de la position de la souris
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, _camera);

  // 2. On teste l'intersection avec tous les objets de la scène
  const intersects = raycaster.intersectObjects(_scene.children, true);

  if (intersects.length > 0) {
    let targetKey = null;
    let hitPoint = intersects[0].point;

    // 3. On cherche si l'objet cliqué (ou ses parents) est interactif
    intersects[0].object.traverseAncestors((parent) => {
      if (parent.name && INTERACTIVE_CONFIG[parent.name.toLowerCase()]) {
        targetKey = parent.name.toLowerCase();
      }
      // Support aussi via userData si le nom est stocké là
      if (
        parent.userData &&
        parent.userData.name &&
        INTERACTIVE_CONFIG[parent.userData.name.toLowerCase()]
      ) {
        targetKey = parent.userData.name.toLowerCase();
      }
    });

    // 4. Si c'est un objet interactif, on lance l'action
    if (targetKey) {
      handleInteraction(targetKey, hitPoint);
    }
  }
}

async function handleInteraction(key, hitPoint) {
  const config = INTERACTIVE_CONFIG[key];

  // Feedback visuel immédiat
  lightRingPulse(hitPoint, config.color);
  sparkBurst(hitPoint, config.color);

  // Déplacement du personnage
  walkTo(
    [config.approachPos.x, config.approachPos.y, config.approachPos.z],
    2.5, // Durée de la marche
    () => {
      // Actions une fois arrivé
      lookAt([config.lookAtPos.x, config.lookAtPos.y, config.lookAtPos.z]);
      executeAction(config.action, config.lookAtPos);
    },
  );
}

function executeAction(actionType, targetPos) {
  const targetVec = new THREE.Vector3(targetPos.x, targetPos.y, targetPos.z);

  switch (actionType) {
    case "sit":
      doSit(); // L'animation de models.js
      break;
    case "wash":
      doPickup(() => {
        // Effets combinés : eau + vapeur
        createWaterDrips(targetVec, 40, 3.0);
        createSteam(targetVec, 3.0);
      });
      break;
    case "hold":
      doHold();
      break;
  }
}
