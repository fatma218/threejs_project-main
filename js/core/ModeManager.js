// js/core/ModeManager.js
import { EventBus } from "./EventBus.js";

class ModeManager {
  constructor() {
    this.current = null;
    this.modes = {};
  }

  register(name, mode) {
    this.modes[name] = mode;
  }

  async switchTo(name) {
    if (this.current === this.modes[name]) return;
    await this.current?.exit();
    this.current = this.modes[name];
    await this.current.enter();
    EventBus.emit("mode:changed", name);
    console.log(`[Mode] → ${name}`);
  }

  update(delta, elapsed) {
    this.current?.update(delta, elapsed);
  }
}

export const modeManager = new ModeManager();
