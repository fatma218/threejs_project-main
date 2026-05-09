// ═══════════════════════════════════════════════════════════════
//  ar.js — Mode Réalité Augmentée (WebXR)
// ═══════════════════════════════════════════════════════════════

export function initAR(renderer) {
  const btn = document.getElementById("arBtn");
  if (!btn) return;

  btn.addEventListener("click", async () => {
    if (!navigator.xr) {
      btn.textContent = "❌ XR non supporté";
      btn.classList.add("dim");
      return;
    }

    const supported = await navigator.xr
      .isSessionSupported("immersive-ar")
      .catch(() => false);
    if (!supported) {
      btn.textContent = "❌ AR non dispo";
      btn.classList.add("dim");
      return;
    }

    try {
      const session = await navigator.xr.requestSession("immersive-ar", {
        requiredFeatures: ["hit-test"],
        optionalFeatures: ["dom-overlay", "light-estimation"],
        domOverlay: { root: document.body },
      });

      renderer.xr.setSession(session);
      renderer.setClearAlpha(0); // fond transparent pour AR

      btn.classList.add("active");
      btn.textContent = "⏹ Quitter AR";

      session.addEventListener("end", () => {
        renderer.setClearAlpha(1);
        btn.classList.remove("active");
        btn.textContent = "📱 AR";
      });
    } catch (err) {
      console.warn("AR session error:", err);
    }
  });
}
