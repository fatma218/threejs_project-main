// js/systems/InteractionSystem.js
import * as THREE from "three";
import { EventBus } from "../core/EventBus.js";

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let _camera, _renderer;
let _objects = [];
let _hoveredObject = null;

export function initInteraction(camera, renderer) {
  _camera = camera;
  _renderer = renderer;

  renderer.domElement.addEventListener("pointerdown", onClick);
  renderer.domElement.addEventListener("mousemove", onHover);
}

export function registerObjects(objects) {
  _objects = objects;
}

function getPointer(event) {
  const rect = _renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  return pointer;
}

function onClick(event) {
  raycaster.setFromCamera(getPointer(event), _camera);
  const hits = raycaster.intersectObjects(_objects, true);
  if (!hits.length) return;

  // Remonte jusqu'au parent interactif
  let obj = hits[0].object;
  while (obj && !obj.userData.interactable) obj = obj.parent;

  if (obj) {
    // Appelle le callback historique (déclenche le CustomEvent "story:interact")
    obj.userData.onInteract?.();

    // Émet aussi sur EventBus avec le nom-clé du meuble
    EventBus.emit("object:clicked", {
      object: obj,
      name: obj.userData.name || obj.name || "",
      point: hits[0].point,
    });
  }
}

function onHover(event) {
  raycaster.setFromCamera(getPointer(event), _camera);
  const hits = raycaster.intersectObjects(_objects, true);

  let obj = hits.length ? hits[0].object : null;
  while (obj && !obj.userData.interactable) obj = obj.parent;

  _renderer.domElement.style.cursor = obj ? "pointer" : "default";

  if (obj !== _hoveredObject) {
    if (_hoveredObject) EventBus.emit("object:unhovered", { object: _hoveredObject });
    _hoveredObject = obj || null;
    if (_hoveredObject) EventBus.emit("object:hovered", { object: _hoveredObject });
  }
}
