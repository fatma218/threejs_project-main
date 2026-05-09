// ═══════════════════════════════════════════════════════════════
//  vr.js — Mode Réalité Virtuelle (WebXR)
// ═══════════════════════════════════════════════════════════════

export function initVR(renderer) {
  const btn = document.getElementById("vrBtn");
  if (!btn) return;

  btn.addEventListener("click", async () => {
    if (!navigator.xr) {
      btn.textContent = "❌ XR non supporté";
      btn.classList.add("dim");
      return;
    }

    const supported = await navigator.xr
      .isSessionSupported("immersive-vr")
      .catch(() => false);
    if (!supported) {
      btn.textContent = "❌ VR non dispo";
      btn.classList.add("dim");
      return;
    }

    try {
      const session = await navigator.xr.requestSession("immersive-vr", {
        optionalFeatures: ["local-floor", "bounded-floor", "hand-tracking"],
      });

      renderer.xr.setSession(session);
      btn.classList.add("active");
      btn.textContent = "⏹ Quitter VR";

      session.addEventListener("end", () => {
        btn.classList.remove("active");
        btn.textContent = "🥽 VR";
      });
    } catch (err) {
      console.warn("VR session error:", err);
    }
  });
}
