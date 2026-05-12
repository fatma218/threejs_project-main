// ═══════════════════════════════════════════════════════════════
//  ar.js — Mode Réalité Augmentée (WebXR hit-test + placement)
//  Morning Tale
// ═══════════════════════════════════════════════════════════════

import * as THREE from "three";

// Échelle du monde en AR : 0.3 → chambre 10 unités = 3 m réels
const AR_SCALE = 0.3;

// État interne
let _scene = null;
let arActive = false;
let placed = false;

let hitTestSource = null;
let hitTestRequested = false;
let hasHitTest = false;
const reticleWorldPos = new THREE.Vector3();

let reticle = null;
let savedBg = null;
let savedFog = null;

// ───────────────────────────────────────────────────────────────
//  INIT — appelez une seule fois au démarrage
// ───────────────────────────────────────────────────────────────
export function initAR(renderer, scene) {
  _scene = scene;

  // ── Réticule de placement (anneau doré sur le sol) ──────────
  const ringGeo = new THREE.RingGeometry(0.05, 0.085, 48).rotateX(-Math.PI / 2);
  reticle = new THREE.Mesh(
    ringGeo,
    new THREE.MeshBasicMaterial({
      color: 0xffd080,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
    }),
  );

  // Point central
  const dot = new THREE.Mesh(
    new THREE.CircleGeometry(0.022, 32).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({
      color: 0xffeebb,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
    }),
  );
  reticle.add(dot);

  // Compensate parent (scene) scale so the ring appears at real-world size
  reticle.scale.setScalar(1 / AR_SCALE);
  reticle.visible = false;
  scene.add(reticle);

  // ── Bouton AR ───────────────────────────────────────────────
  const btn = document.getElementById("arBtn");
  if (!btn) return;

  btn.addEventListener("click", () => {
    window.location.href = "ar-marker.html";
  });
}

// ───────────────────────────────────────────────────────────────
//  CLIC SUR LE BOUTON AR
// ───────────────────────────────────────────────────────────────
async function _onARButtonClick(renderer, scene) {
  const btn = document.getElementById("arBtn");

  // Arrêter la session si déjà active
  if (arActive) {
    renderer.xr.getSession()?.end();
    return;
  }

  // Vérifier le support WebXR
  if (!navigator.xr) {
    _arToast("❌ WebXR non supporté sur cet appareil");
    if (btn) { btn.textContent = "❌ Non supporté"; btn.classList.add("dim"); }
    return;
  }

  const ok = await navigator.xr.isSessionSupported("immersive-ar").catch(() => false);
  if (!ok) {
    _arToast("❌ AR non disponible\n(Android + Chrome requis)");
    if (btn) { btn.textContent = "❌ AR indispo"; btn.classList.add("dim"); }
    return;
  }

  // Essai 1 : avec hit-test (placement précis sur le sol)
  // Essai 2 : sans hit-test (placement manuel à distance fixe)
  let session = null;
  hasHitTest = false;

  try {
    session = await navigator.xr.requestSession("immersive-ar", {
      requiredFeatures: ["hit-test"],
      optionalFeatures: ["dom-overlay", "local-floor"],
      domOverlay: { root: document.body },
    });
    hasHitTest = true;
  } catch (_) {
    // hit-test non supporté → on retente sans
    try {
      session = await navigator.xr.requestSession("immersive-ar", {
        requiredFeatures: [],
        optionalFeatures: ["dom-overlay", "local-floor"],
        domOverlay: { root: document.body },
      });
      hasHitTest = false;
    } catch (err2) {
      arActive = false;
      _arToast("❌ AR non disponible sur cet appareil\n(" + (err2.message?.slice(0, 60) ?? "non supporté") + ")");
      return;
    }
  }

  try {
    // Connecte la session au renderer
    renderer.xr.setReferenceSpaceType("local");
    await renderer.xr.setSession(session);

    // ── Mode AR activé ──────────────────────────────────────
    arActive = true;
    placed = false;
    hitTestSource = null;
    hitTestRequested = false;

    renderer.setClearColor(0x000000, 0); // fond transparent → caméra réelle
    savedBg = scene.background;
    savedFog = scene.fog;
    scene.background = null;
    scene.fog = null;

    // Mise à l'échelle effet "maquette" (dollhouse)
    scene.scale.setScalar(AR_SCALE);
    scene.position.set(0, 0, 0);

    if (btn) { btn.textContent = "⏹ Quitter AR"; btn.classList.add("active"); }

    // Réduire l'opacité de l'UI histoire (toujours lisible via dom-overlay)
    document.getElementById("storyUI")?.style.setProperty("opacity", "0.5");
    document.getElementById("storyUI")?.style.setProperty("pointer-events", "none");

    if (hasHitTest) {
      _arToast("📱 Pointez votre caméra vers le sol\npuis appuyez pour placer la chambre");
    } else {
      _arToast("📱 Appuyez n'importe où\npour placer la chambre devant vous");
    }

    // Gestion fin de session
    session.addEventListener("end", () => _onARSessionEnd(renderer, scene));

    // Gestion du tap pour placer la scène
    session.addEventListener("select", _onARSelect);

  } catch (err) {
    arActive = false;
    console.warn("AR session error:", err);
    _arToast("❌ Impossible de démarrer l'AR\n" + (err.message?.slice(0, 50) ?? ""));
  }
}

// ───────────────────────────────────────────────────────────────
//  FIN DE SESSION
// ───────────────────────────────────────────────────────────────
function _onARSessionEnd(renderer, scene) {
  arActive = false;
  hitTestSource = null;
  hitTestRequested = false;
  placed = false;
  if (reticle) reticle.visible = false;

  // Restaurer le rendu standard
  renderer.setClearColor(0x0a0818, 1);
  scene.background = savedBg;
  scene.fog = savedFog;
  scene.scale.setScalar(1);
  scene.position.set(0, 0, 0);
  scene.rotation.set(0, 0, 0);

  // Restaurer l'UI
  const btn = document.getElementById("arBtn");
  if (btn) { btn.textContent = "📱 AR"; btn.classList.remove("active"); }
  const ui = document.getElementById("storyUI");
  if (ui) { ui.style.removeProperty("opacity"); ui.style.removeProperty("pointer-events"); }
}

// ───────────────────────────────────────────────────────────────
//  TAP → PLACER LA CHAMBRE
// ───────────────────────────────────────────────────────────────
function _onARSelect() {
  if (placed || !_scene) return;

  if (hasHitTest) {
    // Placement précis : utilise la position détectée sur le sol
    if (!reticle?.visible) return;
    _scene.position.copy(reticleWorldPos);
  } else {
    // Fallback : place la chambre 1.5 m devant l'utilisateur
    // La caméra XR démarre à l'origine, donc (0, -0.6, -1.5) = ~1.5 m en face
    _scene.position.set(0, -0.6, -1.5);
  }

  placed = true;
  if (reticle) reticle.visible = false;
  _arToast("✅ Chambre placée !\nMarchez autour pour explorer 🏠");
}

// ───────────────────────────────────────────────────────────────
//  UPDATE — appelé chaque frame depuis app.js
// ───────────────────────────────────────────────────────────────
export function updateAR(renderer, frame) {
  if (!arActive || !frame || !_scene) return;

  const session = renderer.xr.getSession();
  const refSpace = renderer.xr.getReferenceSpace();
  if (!session || !refSpace) return;

  // Sans hit-test : le tap seul suffit, rien à calculer par frame
  if (!hasHitTest) {
    if (!placed && reticle) reticle.visible = false;
    return;
  }

  // Initialisation du hit-test (une seule fois)
  if (!hitTestRequested) {
    session
      .requestReferenceSpace("viewer")
      .then((vs) => session.requestHitTestSource({ space: vs }))
      .then((src) => {
        hitTestSource = src;
      })
      .catch(() => {});
    // Nettoyer à la fin de session
    session.addEventListener("end", () => {
      hitTestSource = null;
      hitTestRequested = false;
    });
    hitTestRequested = true;
  }

  // Si déjà placé, rien à faire
  if (placed || !hitTestSource) return;

  // Récupérer les résultats du hit-test
  const hits = frame.getHitTestResults(hitTestSource);

  if (hits.length > 0) {
    const pose = hits[0].getPose(refSpace);
    if (!pose) return;

    // Position du sol en coordonnées monde réel
    reticleWorldPos.setFromMatrixPosition(
      new THREE.Matrix4().fromArray(pose.transform.matrix),
    );

    // Convertir en coordonnées locales de la scène (compense l'échelle AR)
    const s = _scene;
    reticle.position.set(
      (reticleWorldPos.x - s.position.x) / AR_SCALE,
      (reticleWorldPos.y - s.position.y) / AR_SCALE,
      (reticleWorldPos.z - s.position.z) / AR_SCALE,
    );

    // Animation de pulsation
    const pulse = 1 + Math.sin(performance.now() * 0.005) * 0.12;
    reticle.scale.setScalar(pulse / AR_SCALE);
    reticle.visible = true;
  } else {
    reticle.visible = false;
  }
}

// ───────────────────────────────────────────────────────────────
//  HELPERS
// ───────────────────────────────────────────────────────────────
export function isARActive() {
  return arActive;
}

let _toastEl = null;
function _arToast(text, duration = 4500) {
  _toastEl?.remove();
  _toastEl = document.createElement("div");
  _toastEl.style.cssText = `
    position:fixed;bottom:130px;left:50%;transform:translateX(-50%);
    background:rgba(10,8,24,0.94);
    border:1px solid rgba(255,208,128,0.4);
    border-radius:18px;padding:13px 22px;
    color:#ffd080;font-family:'DM Sans',sans-serif;
    font-size:14px;font-weight:500;line-height:1.55;
    backdrop-filter:blur(18px);z-index:400;
    pointer-events:none;text-align:center;
    max-width:82vw;white-space:pre-line;
    box-shadow:0 8px 32px rgba(0,0,0,0.4);
  `;
  _toastEl.textContent = text;
  document.body.appendChild(_toastEl);
  if (duration > 0)
    setTimeout(() => {
      _toastEl?.remove();
      _toastEl = null;
    }, duration);
}
