// js/core/EventBus.js
const listeners = {};

export const EventBus = {
  on(event, fn) {
    (listeners[event] ??= []).push(fn);
  },
  off(event, fn) {
    listeners[event] = listeners[event]?.filter((f) => f !== fn);
  },
  emit(event, data) {
    listeners[event]?.forEach((fn) => fn(data));
  },
};
