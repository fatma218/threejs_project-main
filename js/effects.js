// ═══════════════════════════════════════════════════════════════
//  effects.js — Effets visuels de la chambre
//  Poussière · Rayons · Eau · Étincelles · Papillons · Fumée
// ═══════════════════════════════════════════════════════════════

import * as THREE from "three";

let _scene = null;
const activeEffects = [];

export function initEffects(scene) {
  _scene = scene;
}

// ═══════════════════════════════════════════════════════════════
//  RAYONS DE SOLEIL — Particules de lumière dorée
// ═══════════════════════════════════════════════════════════════
export function createSunRays() {
  if (!_scene) return null;

  const count = 220;
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  const speeds = new Float32Array(count);
  const sizes = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    // Rayons entrant par la fenêtre (mur nord, x=1.5, z=-5)
    pos[i * 3] = 0.5 + Math.random() * 4.0;
    pos[i * 3 + 1] = 0.5 + Math.random() * 3.2;
    pos[i * 3 + 2] = -4.8 + Math.random() * 6;
    speeds[i] = 0.003 + Math.random() * 0.005;
    sizes[i] = 6 + Math.random() * 14;
  }

  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("size", new THREE.BufferAttribute(sizes, 1));

  const mat = new THREE.PointsMaterial({
    color: 0xffdd88,
    size: 0.04,
    transparent: true,
    opacity: 0,
    sizeAttenuation: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const pts = new THREE.Points(geo, mat);
  pts.userData = { speeds, type: "sunray", startTime: Date.now() };
  _scene.add(pts);
  activeEffects.push(pts);
  return pts;
}

// ═══════════════════════════════════════════════════════════════
//  POUSSIÈRE AMBIANTE — Particules flottantes
// ═══════════════════════════════════════════════════════════════
export function createDustParticles(count = 180) {
  if (!_scene) return null;

  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  const speeds = new Float32Array(count);
  const phases = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 9;
    pos[i * 3 + 1] = Math.random() * 3.5;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 9;
    speeds[i] = 0.001 + Math.random() * 0.003;
    phases[i] = Math.random() * Math.PI * 2;
  }

  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("phase", new THREE.BufferAttribute(phases, 1));

  const mat = new THREE.PointsMaterial({
    color: 0xffe8b0,
    size: 0.018,
    transparent: true,
    opacity: 0.22,
    sizeAttenuation: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const pts = new THREE.Points(geo, mat);
  pts.userData = { speeds, phases, type: "dust" };
  _scene.add(pts);
  activeEffects.push(pts);
  return pts;
}

// ═══════════════════════════════════════════════════════════════
//  ÉTINCELLES — Burst d'étoiles sur interaction
// ═══════════════════════════════════════════════════════════════
export function sparkBurst(position, color = 0xffdd44, count = 28) {
  if (!_scene) return;

  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  const vel = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    pos[i * 3] = position.x;
    pos[i * 3 + 1] = position.y;
    pos[i * 3 + 2] = position.z;
    // Vélocités aléatoires sphériques
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI;
    const speed = 0.8 + Math.random() * 1.8;
    vel[i * 3] = Math.sin(phi) * Math.cos(theta) * speed;
    vel[i * 3 + 1] = Math.abs(Math.cos(phi)) * speed + 0.5;
    vel[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * speed;
  }

  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));

  const mat = new THREE.PointsMaterial({
    color,
    size: 0.09,
    transparent: true,
    opacity: 1,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const pts = new THREE.Points(geo, mat);
  _scene.add(pts);

  let life = 0;
  const maxLife = 1.2;
  const gravity = -1.8;

  function update() {
    life += 0.016;
    if (life > maxLife) {
      _scene.remove(pts);
      geo.dispose();
      mat.dispose();
      return;
    }
    requestAnimationFrame(update);

    const p = geo.attributes.position.array;
    for (let i = 0; i < count; i++) {
      p[i * 3] += vel[i * 3] * 0.016;
      p[i * 3 + 1] += (vel[i * 3 + 1] + gravity * life) * 0.016;
      p[i * 3 + 2] += vel[i * 3 + 2] * 0.016;
    }
    geo.attributes.position.needsUpdate = true;
    mat.opacity = Math.max(0, 1 - life / maxLife);
  }
  update();
}

// ═══════════════════════════════════════════════════════════════
//  GOUTTES D'EAU — Animation lavabo / arrosage
// ═══════════════════════════════════════════════════════════════
export function createWaterDrips(origin, count = 16, duration = 3.0) {
  if (!_scene) return;

  const droplets = [];

  for (let i = 0; i < count; i++) {
    const geo = new THREE.SphereGeometry(0.012 + Math.random() * 0.018, 6, 6);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x88ccff,
      transparent: true,
      opacity: 0.75,
      roughness: 0.05,
      metalness: 0.3,
    });
    const drop = new THREE.Mesh(geo, mat);
    drop.position.copy(origin);
    drop.position.x += (Math.random() - 0.5) * 0.12;
    drop.position.z += (Math.random() - 0.5) * 0.12;
    drop.userData.vy = -(0.5 + Math.random() * 1.5);
    drop.userData.delay = i * 0.1 + Math.random() * 0.2;
    drop.userData.startY = drop.position.y;
    drop.visible = false;
    _scene.add(drop);
    droplets.push(drop);
  }

  let elapsed = 0;
  function animate() {
    elapsed += 0.016;
    if (elapsed > duration) {
      droplets.forEach((d) => {
        _scene.remove(d);
        d.geometry.dispose();
        d.material.dispose();
      });
      return;
    }
    requestAnimationFrame(animate);
    droplets.forEach((d) => {
      if (elapsed < d.userData.delay) return;
      d.visible = true;
      d.userData.vy -= 4.5 * 0.016;
      d.position.y += d.userData.vy * 0.016;
      d.material.opacity = Math.max(
        0,
        0.75 - (elapsed - d.userData.delay) * 0.4,
      );
      if (d.position.y < 0) {
        // Splash
        d.position.y = d.userData.startY;
        d.userData.vy = -(0.5 + Math.random() * 1.5);
      }
    });
  }
  animate();
}

// ═══════════════════════════════════════════════════════════════
//  LUCIOLES / PAPILLONS — Ambiance magique
// ═══════════════════════════════════════════════════════════════
export function createFireflies(count = 12) {
  if (!_scene) return null;

  const group = new THREE.Group();
  const flies = [];

  for (let i = 0; i < count; i++) {
    const geo = new THREE.SphereGeometry(0.025, 6, 6);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xaaff88,
      emissive: new THREE.Color(0x44ff22),
      emissiveIntensity: 2.0,
      transparent: true,
      opacity: 0.8,
    });
    const fly = new THREE.Mesh(geo, mat);
    fly.position.set(
      (Math.random() - 0.5) * 8,
      0.3 + Math.random() * 2.5,
      (Math.random() - 0.5) * 8,
    );
    fly.userData = {
      speed: 0.4 + Math.random() * 0.6,
      angle: Math.random() * Math.PI * 2,
      radius: 0.5 + Math.random() * 1.5,
      ySpeed: 0.2 + Math.random() * 0.4,
      phase: Math.random() * Math.PI * 2,
      baseY: fly.position.y,
    };

    // Halo lumineux
    const light = new THREE.PointLight(0x88ff44, 0.4, 1.2);
    fly.add(light);
    group.add(fly);
    flies.push(fly);
  }

  _scene.add(group);
  group.userData = { flies, type: "firefly" };
  activeEffects.push(group);
  return group;
}

// ═══════════════════════════════════════════════════════════════
//  ANNEAU DE LUMIÈRE — Pulse sur interaction
// ═══════════════════════════════════════════════════════════════
export function lightRingPulse(position, color = 0xffdd44) {
  if (!_scene) return;

  const geo = new THREE.RingGeometry(0, 0.05, 32);
  const mat = new THREE.MeshBasicMaterial({
    color,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 1,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const ring = new THREE.Mesh(geo, mat);
  ring.position.copy(position);
  ring.position.y += 0.01;
  ring.rotation.x = -Math.PI / 2;
  _scene.add(ring);

  let t = 0;
  function expand() {
    t += 0.025;
    const r = t * 2.5;
    ring.geometry.dispose();
    ring.geometry = new THREE.RingGeometry(r * 0.7, r, 32);
    mat.opacity = Math.max(0, 1 - t);
    if (t < 1) requestAnimationFrame(expand);
    else {
      _scene.remove(ring);
      geo.dispose();
      mat.dispose();
    }
  }
  expand();
}

// ═══════════════════════════════════════════════════════════════
//  FUMÉE / VAPEUR — Lavabo chaud
// ═══════════════════════════════════════════════════════════════
export function createSteam(origin, duration = 4.0) {
  if (!_scene) return;

  const puffs = [];
  let elapsed = 0;

  function spawnPuff() {
    const geo = new THREE.SphereGeometry(0.04 + Math.random() * 0.06, 8, 8);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xddddff,
      transparent: true,
      opacity: 0.35,
      roughness: 1,
    });
    const puff = new THREE.Mesh(geo, mat);
    puff.position.copy(origin);
    puff.position.x += (Math.random() - 0.5) * 0.1;
    puff.position.z += (Math.random() - 0.5) * 0.1;
    puff.userData = { vy: 0.4 + Math.random() * 0.6, life: 0 };
    _scene.add(puff);
    puffs.push(puff);
  }

  function animate() {
    elapsed += 0.016;
    if (elapsed > duration) {
      puffs.forEach((p) => _scene.remove(p));
      return;
    }
    requestAnimationFrame(animate);

    if (Math.random() < 0.3) spawnPuff();

    for (let i = puffs.length - 1; i >= 0; i--) {
      const p = puffs[i];
      p.userData.life += 0.016;
      p.position.y += p.userData.vy * 0.016;
      p.position.x += (Math.random() - 0.5) * 0.005;
      p.scale.addScalar(0.012);
      p.material.opacity = Math.max(0, 0.35 - p.userData.life * 0.18);
      if (p.userData.life > 2 || p.material.opacity <= 0) {
        _scene.remove(p);
        puffs.splice(i, 1);
      }
    }
  }
  animate();
}

// ═══════════════════════════════════════════════════════════════
//  UPDATE GLOBAL — Appelé depuis main.js chaque frame
// ═══════════════════════════════════════════════════════════════
export function updateEffects(dt, t) {
  for (const effect of activeEffects) {
    if (!effect.parent) continue;

    const type = effect.userData?.type;

    // ── Rayons de soleil ─────────────────────────────────────
    if (type === "sunray") {
      const pa = effect.geometry.attributes.position.array;
      const speeds = effect.userData.speeds;
      const elapsed = (Date.now() - effect.userData.startTime) / 1000;
      // Fade in
      effect.material.opacity = Math.min(0.18, elapsed * 0.06);

      for (let i = 0; i < pa.length / 3; i++) {
        pa[i * 3 + 1] -= speeds[i];
        pa[i * 3] += Math.sin(t * 0.3 + i * 0.5) * 0.0008;
        // Reset en haut
        if (pa[i * 3 + 1] < 0) {
          pa[i * 3 + 1] = 3.2 + Math.random() * 0.5;
          pa[i * 3] = 0.5 + Math.random() * 4.0;
        }
      }
      effect.geometry.attributes.position.needsUpdate = true;
    }

    // ── Poussière ─────────────────────────────────────────────
    if (type === "dust") {
      const pa = effect.geometry.attributes.position.array;
      const speeds = effect.userData.speeds;
      const phases = effect.userData.phases;
      for (let i = 0; i < pa.length / 3; i++) {
        pa[i * 3 + 1] += speeds[i] * 0.5;
        pa[i * 3] += Math.sin(t * 0.2 + phases[i]) * 0.0004;
        pa[i * 3 + 2] += Math.cos(t * 0.15 + phases[i] * 1.3) * 0.0003;
        if (pa[i * 3 + 1] > 3.6) pa[i * 3 + 1] = 0.05;
      }
      effect.geometry.attributes.position.needsUpdate = true;
    }

    // ── Lucioles ──────────────────────────────────────────────
    if (type === "firefly") {
      effect.userData.flies.forEach((fly) => {
        const d = fly.userData;
        d.angle += dt * d.speed;
        fly.position.x =
          Math.sin(d.angle) * d.radius + Math.sin(d.angle * 2.3) * 0.5;
        fly.position.z =
          Math.cos(d.angle * 0.7) * d.radius + Math.cos(d.angle * 1.9) * 0.5;
        fly.position.y = d.baseY + Math.sin(t * d.ySpeed + d.phase) * 0.4;
        // Pulsation lumineuse
        const pulse = 0.5 + Math.sin(t * 3 + d.phase) * 0.5;
        fly.material.emissiveIntensity = 1.5 + pulse * 1.5;
        fly.material.opacity = 0.5 + pulse * 0.5;
        fly.children[0].intensity = 0.3 + pulse * 0.5;
      });
    }
  }
}
