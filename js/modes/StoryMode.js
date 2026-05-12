// js/modes/StoryMode.js
import { initStory, updateStory, suspendStoryInteraction } from "../story.js";
import { EventBus } from "../core/EventBus.js";

export class StoryMode {
  constructor() {
    this.onObjectClicked = this.onObjectClicked.bind(this);
  }

  enter() {
    document.getElementById("storyUI").style.display = "block";
    const fcb = document.getElementById("freeCamBtn");
    if (fcb) fcb.style.display = "block";

    // Écoute les clics seulement quand ce mode est actif
    EventBus.on("object:clicked", this.onObjectClicked);

    initStory();
    console.log("[StoryMode] entré");
  }

  exit() {
    suspendStoryInteraction();
    document.getElementById("storyUI").style.display = "none";
    const fcb = document.getElementById("freeCamBtn");
    if (fcb) fcb.style.display = "none";

    EventBus.off("object:clicked", this.onObjectClicked);
    console.log("[StoryMode] sorti");
  }

  update(delta, elapsed) {
    updateStory(delta, elapsed);
  }

  onObjectClicked({ name, point }) {
    // Ici tu connecteras la logique du Story (personnage marche, etc.)
    console.log(`[Story] cliqué sur : ${name}`);
  }
}
