// js/entities/Character.js
import * as THREE from "three";

export const CHAR_STATE = {
  IDLE: "idle",
  WALKING: "walking",
  SITTING: "sitting",
  LYING: "lying",
  DRINKING: "drinking",
  TYPING: "typing",
};

export class Character {
  constructor(mixer, animations) {
    this.mixer = mixer;
    this.animations = animations; // { walk, idle, sit, standup, ... }
    this.state = CHAR_STATE.LYING;
    this.mesh = null;
    this.destination = null;
    this.onArrived = null;
  }

  setState(newState) {
    if (this.state === newState) return;
    this.state = newState;
    this._playAnim(newState);
  }

  walkTo(targetPos, onArrived) {
    this.destination = new THREE.Vector3(...targetPos);
    this.onArrived = onArrived;
    this.setState(CHAR_STATE.WALKING);
  }

  update(delta) {
    this.mixer?.update(delta);

    if (this.state === CHAR_STATE.WALKING && this.destination) {
      const dist = this.mesh.position.distanceTo(this.destination);
      if (dist < 0.15) {
        this.mesh.position.copy(this.destination);
        this.onArrived?.();
        this.onArrived = null;
      } else {
        this.mesh.position.lerp(this.destination, delta * 2.5);
        this.mesh.lookAt(this.destination);
      }
    }
  }

  _playAnim(state) {
    const clip = this.animations[state];
    if (!clip) return;
    Object.values(this.animations).forEach((a) => a.fadeOut(0.3));
    clip.reset().fadeIn(0.3).play();
  }
}
