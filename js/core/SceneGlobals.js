// js/core/SceneGlobals.js
// État partagé sans effets de bord — remplace les imports depuis main.js.
// story.js et room.js importent d'ici au lieu de main.js.
// app.js appelle initSceneGlobals() après avoir créé la scène.

import * as THREE from "three";

// ── Live bindings — null jusqu'à initSceneGlobals() ───────────
export let scene        = null;
export let camera       = null;
export let renderer     = null;
export let ambientLight = null;
export let sunLight     = null;
export let winGlow      = null;
export let lampLight    = null;
export let moonLight    = null;
export let screenLight  = null;
export let mirrorLight  = null;

// ── Caméra tween ──────────────────────────────────────────────
const _tween = { camera: null, controls: null, state: null };

export function initSceneGlobals(refs) {
  scene        = refs.scene;
  camera       = refs.camera;
  renderer     = refs.renderer;
  ambientLight = refs.ambientLight;
  sunLight     = refs.sunLight;
  winGlow      = refs.winGlow;
  lampLight    = refs.lampLight;
  moonLight    = refs.moonLight;
  screenLight  = refs.screenLight;
  mirrorLight  = refs.mirrorLight;
  _tween.camera   = refs.camera;
  _tween.controls = refs.controls;
  _tween.state = {
    fromPos:  new THREE.Vector3(),
    fromLook: new THREE.Vector3(),
    toPos:    new THREE.Vector3(),
    toLook:   new THREE.Vector3(),
    t: 1, duration: 2.2, active: false, onDone: null,
  };
}

export function tweenCamera(pos, look, duration = 2.2, onDone = null) {
  if (!_tween.state || _tween.controls.enabled) return;
  _tween.state.fromPos.copy(_tween.camera.position);
  _tween.state.fromLook.copy(_tween.controls.target);
  _tween.state.toPos.set(...pos);
  _tween.state.toLook.set(...look);
  _tween.state.duration = duration;
  _tween.state.t        = 0;
  _tween.state.active   = true;
  _tween.state.onDone   = onDone;
}

export function getCamState() { return _tween.state; }

// ── Objets interactifs (pour room.js) ─────────────────────────
let _registerObjects = null;
export function bindSetInteractiveObjects(fn) { _registerObjects = fn; }
export function setInteractiveObjects(objs)   { _registerObjects?.(objs); }
