// js/modes/DesignMode.js
import * as THREE from "three";
import {
  initDesigner,
  openDesigner,
  notifyFurnitureClick,
} from "../designer.js";
import { EventBus } from "../core/EventBus.js";

export class DesignMode {
  constructor(scene) {
    this.scene = scene;
    this._highlightedObj = null;
    this.onObjectClicked = this.onObjectClicked.bind(this);
    this.onObjectHovered = this.onObjectHovered.bind(this);
    this.onObjectUnhovered = this.onObjectUnhovered.bind(this);
  }

  enter() {
    initDesigner();
    openDesigner();
    const fcb = document.getElementById("freeCamBtn");
    if (fcb) fcb.style.display = "none";
    const dmb = document.getElementById("designModeBtn");
    if (dmb) dmb.style.display = "none";
    EventBus.on("object:clicked", this.onObjectClicked);
    EventBus.on("object:hovered", this.onObjectHovered);
    EventBus.on("object:unhovered", this.onObjectUnhovered);
    console.log("[DesignMode] entré");
  }

  exit() {
    if (this._highlightedObj) {
      this._removeGlow(this._highlightedObj);
      this._highlightedObj = null;
    }
    const dmb = document.getElementById("designModeBtn");
    if (dmb) dmb.style.display = "block";
    EventBus.off("object:clicked", this.onObjectClicked);
    EventBus.off("object:hovered", this.onObjectHovered);
    EventBus.off("object:unhovered", this.onObjectUnhovered);
    console.log("[DesignMode] sorti");
  }

  update(_delta) {}

  onObjectClicked({ name, object }) {
    const furnitureName = name || object?.userData?.name || object?.name;
    if (!furnitureName) return;
    notifyFurnitureClick(furnitureName);
  }

  onObjectHovered({ object }) {
    if (this._highlightedObj && this._highlightedObj !== object) {
      this._removeGlow(this._highlightedObj);
    }
    this._highlightedObj = object;
    this._applyGlow(object);
  }

  onObjectUnhovered({ object }) {
    if (this._highlightedObj === object) {
      this._highlightedObj = null;
      this._removeGlow(object);
    }
  }

  _applyGlow(object) {
    object.traverse((child) => {
      if (!child.isMesh || !child.material) return;
      const mats = Array.isArray(child.material)
        ? child.material
        : [child.material];
      mats.forEach((mat) => {
        // MeshBasicMaterial et autres n'ont pas d'emissive — on les ignore
        if (mat.emissive === undefined) return;
        if (mat._savedEmissive === undefined) {
          mat._savedEmissive = mat.emissive.clone();
          mat._savedEmissiveIntensity = mat.emissiveIntensity ?? 0;
        }
        // .set() modifie la Color existante en place (ne casse pas la ref uniforme)
        mat.emissive.set(0xf0a030);
        mat.emissiveIntensity = 0.4;
      });
    });
  }

  _removeGlow(object) {
    object.traverse((child) => {
      if (!child.isMesh || !child.material) return;
      const mats = Array.isArray(child.material)
        ? child.material
        : [child.material];
      mats.forEach((mat) => {
        if (mat._savedEmissive !== undefined) {
          // .copy() restaure la Color en place
          mat.emissive.copy(mat._savedEmissive);
          mat.emissiveIntensity = mat._savedEmissiveIntensity;
          delete mat._savedEmissive;
          delete mat._savedEmissiveIntensity;
        }
      });
    });
  }
}
