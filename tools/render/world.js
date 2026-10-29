// Aethel Network — procedural low-poly "trade world" rendered frame-by-frame.
// window.renderAt(T) draws the film at global time T (seconds) and returns a JPEG data URL.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const q = new URLSearchParams(location.search);
const W = +q.get('w') || 1920, H = +q.get('h') || 1080;
const PORTRAIT = H > W;

// ---------- film timing (shared with render.mjs via window.FILM) ----------
const DIVE = 7, CONN = 4, FPS = 30;
const N = 7;
const SEGS = [];
let tAcc = 0;
for (let i = 0; i < N; i++) {
  SEGS.push({ kind: 'dive', i, t0: tAcc, t1: tAcc + DIVE }); tAcc += DIVE;
  if (i < N - 1) { SEGS.push({ kind: 'conn', i, t0: tAcc, t1: tAcc + CONN }); tAcc += CONN; }
}
window.FILM = { SEGS, FPS, TOTAL: tAcc };

// ---------- renderer ----------
const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(W, H);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
document.body.appendChild(renderer.domElement);

const BG = 0x0A1222;
const scene = new THREE.Scene();
scene.background = new THREE.Color(BG);
scene.fog = new THREE.Fog(BG, 70, 210);

const camera = new THREE.PerspectiveCamera(PORTRAIT ? 58 : 34, W / H, 0.5, 900);
// Push the subject away from the copy: right of centre on desktop, upper third on phones.
if (PORTRAIT) camera.setViewOffset(W, H * 1.32, 0, H * 0.32, W, H);
else camera.setViewOffset(W * 1.26, H, 0, 0, W, H);

const rt = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 });
const composer = new EffectComposer(renderer, rt);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new UnrealBloomPass(new THREE.Vector2(W, H), 0.7, 0.5, 0.85));
composer.addPass(new OutputPass());

// ---------- lights ----------
scene.add(new THREE.HemisphereLight(0xA9C1FF, 0x0B1426, 1.15));
const sun = new THREE.DirectionalLight(0xFFF2E0, 2.0);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -24, right: 24, top: 24, bottom: -24, near: 1, far: 140 });
sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.03; sun.shadow.radius = 3;
scene.add(sun, sun.target);
const rimLight = new THREE.DirectionalLight(0x5B8CFF, 0.9);
scene.add(rimLight, rimLight.target);

// ---------- helpers ----------
const anims = [];
const M = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.86, metalness: 0.04, flatShading: true, ...o });
const E = (c, i = 2.2) => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: i, roughness: 0.4 });
const GLOW = (c, o = 0.35) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: o, blending: THREE.AdditiveBlending, depthWrite: false });
function add(geo, mat, x = 0, y = 0, z = 0, parent = scene, shadow = true) {
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z);
  m.castShadow = shadow; m.receiveShadow = shadow; parent.add(m); return m;
}
let seed = 1337;
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const hexCyl = (r, h) => new THREE.CylinderGeometry(r, r, h, 6);
const box = (x, y, z) => new THREE.BoxGeometry(x, y, z);

function tree(g, x, z, s = 1) {
  add(new THREE.CylinderGeometry(0.12 * s, 0.16 * s, 0.6 * s, 5), M(0x4A3B33), x, 0.3 * s, z, g);
  add(new THREE.ConeGeometry(0.7 * s, 1.7 * s, 6), M(0x2E7D74), x, 1.35 * s, z, g);
}
function block(g, x, z, w, h, d, col = 0xCBD5E1, win = null) {
  const b = add(box(w, h, d), M(col), x, h / 2, z, g);
  if (win) add(box(w + 0.04, 0.16, d + 0.04), E(win, 1.4), x, h * 0.62, z, g, false);
  return b;
}

function makeIsland(C, r, accent) {
  const g = new THREE.Group(); g.position.copy(C); scene.add(g);
  const side = M(0x1C2943), top = M(0xC9D3E1);
  const slab = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.97, 1.6, 6), [side, top, side]);
  slab.position.y = -0.8; slab.receiveShadow = true; slab.castShadow = true; g.add(slab);
  add(new THREE.CylinderGeometry(r * 0.88, r * 0.88, 0.06, 6), M(0xC5D0DF), 0, 0.03, 0, g).castShadow = false;
  add(new THREE.CylinderGeometry(r + 0.06, r + 0.06, 0.16, 6, 1, true), E(accent, 2.6), 0, -0.06, 0, g, false);
  add(new THREE.CylinderGeometry(r * 0.97 + 0.04, r * 0.97 + 0.04, 0.08, 6, 1, true), E(accent, 1.2), 0, -1.5, 0, g, false);
  const rock = add(new THREE.ConeGeometry(r * 0.9, r * 1.15, 6, 2), M(0x131D31), 0, -1.6 - r * 0.575, 0, g, false);
  rock.rotation.x = Math.PI;
  for (let k = 0; k < 5; k++) {
    const a = k * 1.3 + 0.4, rr = r * (0.45 + 0.25 * rnd());
    const s = add(new THREE.DodecahedronGeometry(0.6 + rnd() * 0.9, 0), M(0x182540), Math.cos(a) * rr, -3 - rnd() * 4, Math.sin(a) * rr, g, false);
    s.rotation.set(rnd() * 3, rnd() * 3, 0);
  }
  return g;
}

// ---------- world layout ----------
const C = [
  new THREE.Vector3(0, 0, 0), new THREE.Vector3(48, 5, -16), new THREE.Vector3(96, -2, 6),
  new THREE.Vector3(144, 4, -14), new THREE.Vector3(192, 0, 8), new THREE.Vector3(240, 6, -12),
  new THREE.Vector3(288, 1, 4),
];
const ACC = [0x3B82F6, 0xF59E0B, 0x22D3EE, 0x818CF8, 0x60A5FA, 0xA78BFA, 0x34D399];
const R = [12, 12.5, 11.5, 12, 12.5, 11.5, 12.5];
const FOCAL_Y = [5.5, 3, 3, 3, 2.2, 5.5, 3.5];
const isl = C.map((c, i) => makeIsland(c, R[i], ACC[i]));

// ===== 0 · HQ tower =====
{
  const g = isl[0];
  const levels = [[3.4, 3.2], [2.8, 3.0], [2.2, 2.8], [1.7, 2.4]];
  let y = 0;
  levels.forEach(([r, h], k) => {
    add(hexCyl(r, h), M(k % 2 ? 0xE6ECF4 : 0xD2DBE7), 0, y + h / 2, 0, g);
    add(new THREE.CylinderGeometry(r + 0.05, r + 0.05, 0.22, 6, 1, true), E(0x60A5FA, 1.8), 0, y + h * 0.55, 0, g, false);
    y += h;
  });
  const crown = add(new THREE.ConeGeometry(1.5, 2.8, 3), E(0x3B82F6, 2.4), 0, y + 1.5, 0, g);
  anims.push(T => { crown.rotation.y = T * 0.5; });
  add(new THREE.CylinderGeometry(0.12, 0.3, 60, 8, 1, true), GLOW(0x60A5FA, 0.22), 0, y + 32, 0, g, false);
  const ring = add(new THREE.TorusGeometry(6.2, 0.05, 6, 64), E(0x93C5FD, 1.6), 0, 7.5, 0, g, false);
  ring.rotation.x = Math.PI / 2;
  const nodes = [];
  for (let k = 0; k < 6; k++) nodes.push(add(new THREE.IcosahedronGeometry(0.42, 0), E(0x7DD3FC, 2.2), 0, 7.5, 0, g, false));
  anims.push(T => nodes.forEach((n, k) => { const a = T * 0.35 + k * Math.PI / 3; n.position.set(Math.cos(a) * 6.2, 7.5 + Math.sin(a * 2) * 0.3, Math.sin(a) * 6.2); n.rotation.y = T; }));
  const plaza = add(new THREE.TorusGeometry(4.6, 0.07, 4, 6), E(0x3B82F6, 1.5), 0, 0.08, 0, g, false);
  plaza.rotation.x = Math.PI / 2;
  const spots = [[7, 2, 2, 3.2, 2, 0xCBD5E1, 0x60A5FA], [-6.5, 3, 2.4, 2.4, 2.4, 0xE2E8F0, null], [5, -6, 2, 4.4, 2, 0xB8C4D6, 0x60A5FA],
    [-4, -7, 3, 2, 2, 0xD8E0EA, null], [-8, -2, 2, 3.6, 2, 0xC4CEDC, 0x93C5FD], [2, 7.5, 2.6, 1.6, 2, 0xE2E8F0, null], [8.5, -2.5, 1.6, 2, 1.6, 0xD2DBE7, null]];
  spots.forEach(s => block(g, s[0], s[1], s[2], s[3], s[4], s[5], s[6]));
  [[-8.5, 4], [-2, 8.5], [8.6, 4.6], [-9.5, -5], [1, -9], [6.5, 7]].forEach(([x, z]) => tree(g, x, z, 1.1));
}

// ===== 1 · legacy port (the problem) =====
{
  const g = isl[1];
  add(box(13, 0.12, 5.2), M(0x1D4E7A, { roughness: 0.25, metalness: 0.3, flatShading: false }), 2, 0.07, 6.2, g, false);
  const ship = new THREE.Group(); ship.position.set(2.5, 0.1, 6.2); g.add(ship);
  add(box(8.5, 1.3, 2.4), M(0xA4483F), 0, 0.65, 0, ship);
  add(new THREE.ConeGeometry(1.24, 1.8, 4, 1), M(0xA4483F), 4.9, 0.65, 0, ship).rotation.set(0, Math.PI / 4, -Math.PI / 2);
  add(box(1.6, 1.8, 2.0), M(0xF1F5F9), -3.2, 2.2, 0, ship);
  const cc = [0xC0574F, 0x3D6A9E, 0xD08B3E, 0x4E8F86, 0x8D99AE];
  for (let a = 0; a < 4; a++) for (let b = 0; b < 2; b++) add(box(1.3, 0.75, 1.0), M(cc[(a + b) % 5]), -1.5 + a * 1.4, 1.7 + b * 0.78, 0, ship);
  anims.push(T => { ship.position.y = 0.1 + Math.sin(T * 1.3) * 0.06; ship.rotation.z = Math.sin(T * 0.9) * 0.012; });
  for (let k = 0; k < 2; k++) {
    const x = -1.5 + k * 6, cr = M(0xE2A33B);
    add(box(0.35, 6, 0.35), cr, x, 3, 3.2, g); add(box(0.35, 6, 0.35), cr, x + 2.2, 3, 3.2, g);
    add(box(0.35, 6, 0.35), cr, x, 3, 1.4, g); add(box(0.35, 6, 0.35), cr, x + 2.2, 3, 1.4, g);
    add(box(2.9, 0.45, 7.2), cr, x + 1.1, 6.2, 5.0, g);
    add(new THREE.CylinderGeometry(0.03, 0.03, 3, 4), M(0x334155), x + 1.1, 4.5, 6.3, g, false);
  }
  for (let a = 0; a < 4; a++) for (let b = 0; b < 3; b++) {
    const h = 1 + ((a * 7 + b * 3) % 3);
    for (let c = 0; c < h; c++) add(box(2.2, 0.9, 1.0), M(cc[(a * 3 + b + c) % 5]), 3.2 + b * 2.4, 0.45 + c * 0.92, -2.8 - a * 1.15, g);
  }
  // legacy bank
  const bank = new THREE.Group(); bank.position.set(-6.5, 0, -2.5); g.add(bank);
  const stone = M(0xE7E1D6);
  add(box(6, 0.4, 4.6), stone, 0, 0.2, 0, bank); add(box(5.4, 0.4, 4.0), stone, 0, 0.6, 0, bank);
  for (let k = 0; k < 5; k++) add(new THREE.CylinderGeometry(0.28, 0.3, 3, 8), stone, -2.2 + k * 1.1, 2.3, 1.6, bank);
  add(box(5, 3, 2.6), M(0xD9D2C4), 0, 2.3, -0.4, bank);
  add(box(5.6, 0.35, 4.0), stone, 0, 3.95, 0, bank);
  const ped = add(new THREE.CylinderGeometry(1.6, 1.6, 5.6, 3), stone, 0, 4.9, 0, bank);
  ped.rotation.set(0, 0, Math.PI / 2); ped.scale.set(0.55, 1, 1.25);
  // hourglass (3–5 day settlement)
  const hg = new THREE.Group(); hg.position.set(-6.5, 10.2, -2.5); g.add(hg);
  const glass = new THREE.MeshStandardMaterial({ color: 0xFDE68A, transparent: true, opacity: 0.28, roughness: 0.1 });
  add(new THREE.ConeGeometry(1.3, 1.9, 8), glass, 0, 0.95, 0, hg, false).rotation.x = Math.PI;
  add(new THREE.ConeGeometry(1.3, 1.9, 8), glass, 0, -0.95, 0, hg, false);
  add(new THREE.ConeGeometry(0.85, 0.9, 8), E(0xF59E0B, 1.6), 0, -1.45, 0, hg, false);
  add(new THREE.ConeGeometry(0.6, 0.6, 8), E(0xF59E0B, 1.6), 0, 0.7, 0, hg, false).rotation.x = Math.PI;
  add(hexCyl(1.5, 0.22), M(0x8B6B3E), 0, 1.95, 0, hg); add(hexCyl(1.5, 0.22), M(0x8B6B3E), 0, -1.95, 0, hg);
  anims.push(T => { hg.rotation.y = T * 0.4; hg.position.y = 10.2 + Math.sin(T * 1.1) * 0.25; });
  const beacons = [[-1.5, 6.6, 3.2], [4.5, 6.6, 3.2], [-9, 4.5, -0.4], [-4, 4.5, -0.4]].map(p => add(new THREE.SphereGeometry(0.22, 8, 6), E(0xF59E0B, 3), ...p, g, false));
  anims.push(T => beacons.forEach((b, k) => { b.material.emissiveIntensity = 0.6 + 2.6 * (0.5 + 0.5 * Math.sin(T * 3 + k * 1.7)); }));
  for (let k = 0; k < 3; k++) for (let s = 0; s < 4 + k; s++) add(box(0.9, 0.1, 1.2), M(0xF8FAFC), -2.5 + k * 1.2, 0.05 + s * 0.12, -6.5, g, false);
  [[-10, 3], [-9, -6.5], [9.5, -7]].forEach(([x, z]) => tree(g, x, z));
}

// ===== 2 · smart escrow vault =====
{
  const g = isl[2];
  add(box(5.4, 4.2, 5), M(0xE2E8F0), -1, 2.1, -1.5, g);
  add(box(5.8, 0.4, 5.4), M(0xB8C4D6), -1, 4.4, -1.5, g);
  const door = new THREE.Group(); door.position.set(-1, 2.1, 1.05); g.add(door);
  add(new THREE.CylinderGeometry(1.55, 1.55, 0.3, 28), M(0x94A3B8, { metalness: 0.6, roughness: 0.35 }), 0, 0, 0, door).rotation.x = Math.PI / 2;
  add(new THREE.TorusGeometry(1.62, 0.09, 8, 40), E(0x22D3EE, 2.4), 0, 0, 0.1, door, false);
  const spokes = new THREE.Group(); spokes.position.z = 0.22; door.add(spokes);
  for (let k = 0; k < 3; k++) add(box(2.2, 0.14, 0.12), M(0x475569, { metalness: 0.5 }), 0, 0, 0, spokes).rotation.z = k * Math.PI / 3;
  anims.push(T => { spokes.rotation.z = T * 0.6; });
  const dome = new THREE.IcosahedronGeometry(7.4, 1);
  add(dome, new THREE.MeshStandardMaterial({ color: 0x22D3EE, transparent: true, opacity: 0.06, depthWrite: false, side: THREE.DoubleSide }), -1, 0.5, -1.5, g, false);
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(dome), new THREE.LineBasicMaterial({ color: 0x67E8F9, transparent: true, opacity: 0.55 }));
  edges.position.set(-1, 0.5, -1.5); g.add(edges);
  anims.push(T => { edges.rotation.y = T * 0.08; });
  // conveyor + scan gate
  add(box(22, 0.35, 1.8), M(0x334155), 0, 0.18, 6.8, g);
  add(box(22, 0.05, 0.12), E(0x22D3EE, 1.4), 0, 0.38, 5.95, g, false);
  const gm = M(0xCBD5E1);
  add(box(0.5, 4, 0.5), gm, 4, 2, 5.6, g); add(box(0.5, 4, 0.5), gm, 4, 2, 8.0, g); add(box(0.6, 0.5, 3.0), gm, 4, 4.2, 6.8, g);
  const scan = add(box(0.08, 3.5, 2.2), GLOW(0x22D3EE, 0.35), 4, 2, 6.8, g, false);
  const ok = add(new THREE.SphereGeometry(0.3, 10, 8), E(0x34D399, 3), 4, 4.8, 6.8, g, false);
  const cc = [0xC0574F, 0x3D6A9E, 0xD08B3E, 0x4E8F86];
  const conts = cc.map(c => add(box(2.6, 1.2, 1.3), M(c), 0, 1.0, 6.8, g));
  anims.push(T => {
    conts.forEach((m, k) => { const u = ((T * 0.09 + k / conts.length) % 1); m.position.x = -10 + u * 20; const e = Math.min(1, Math.min(u, 1 - u) * 12); m.scale.setScalar(e); });
    scan.material.opacity = 0.2 + 0.25 * (0.5 + 0.5 * Math.sin(T * 4));
    ok.material.emissiveIntensity = 1 + 2.5 * (0.5 + 0.5 * Math.sin(T * 2.2));
  });
  for (let s = 0; s < 3; s++) for (let k = 0; k < 4 + s * 2; k++) add(new THREE.CylinderGeometry(0.55, 0.55, 0.18, 18), M(0x26A17B, { metalness: 0.3, roughness: 0.5, flatShading: false }), 5.5 + s * 1.5, 0.1 + k * 0.2, -4 + s * 0.8, g);
  [[-9, -3], [-8, 3], [8.5, -7], [-4, -8.5]].forEach(([x, z]) => tree(g, x, z));
}

// ===== 3 · three defence layers =====
{
  const g = isl[3];
  const cols = [0x60A5FA, 0x818CF8, 0x2DD4BF];
  [[10, 1.3], [7, 2.4], [4.2, 3.6]].forEach(([r, h], k) => {
    add(new THREE.CylinderGeometry(r, r, h, 6, 1, true), M([0xD7DFEA, 0xCAD3E1, 0xBCC7D8][k], { side: THREE.DoubleSide }), 0, h / 2, 0, g);
    add(new THREE.CylinderGeometry(r - 0.45, r - 0.45, h, 6, 1, true), M(0xAEBACE, { side: THREE.DoubleSide }), 0, h / 2, 0, g);
    add(new THREE.CylinderGeometry(r - 0.2, r - 0.2, 0.14, 6, 1, true), E(cols[k], 2.5), 0, h + 0.02, 0, g, false);
    const ring = add(new THREE.RingGeometry(r - 0.45, r, 6), M(0xE2E8F0, { side: THREE.DoubleSide }), 0, h, 0, g);
    ring.rotation.x = -Math.PI / 2;
    for (let c = 0; c < 6; c++) {
      const a = c * Math.PI / 3;
      add(new THREE.SphereGeometry(0.22, 8, 6), E(cols[k], 2.6), Math.cos(a) * (r - 0.22), h + 0.35, Math.sin(a) * (r - 0.22), g, false);
    }
  });
  add(hexCyl(1.6, 4.5), M(0xE6ECF4), 0, 2.25, 0, g);
  const core = add(new THREE.OctahedronGeometry(1.2, 0), E(0xA5B4FC, 1.4), 0, 6.2, 0, g, false);
  anims.push(T => { core.rotation.y = T * 0.8; core.position.y = 6.2 + Math.sin(T * 1.5) * 0.25; });
  const sweep = add(new THREE.CircleGeometry(9.6, 32, 0, 0.7), GLOW(0x818CF8, 0.28), 0, 1.35, 0, g, false);
  sweep.rotation.x = -Math.PI / 2;
  anims.push(T => { sweep.rotation.z = -T * 0.9; });
  [[10.6, 3], [-10.8, -2], [3, -10.6], [-2, 10.8]].forEach(([x, z]) => tree(g, x * 0.98, z * 0.98, 0.8));
}

// ===== 4 · four-step escrow workflow =====
{
  const g = isl[4];
  const P = [new THREE.Vector3(-7.5, 0, 3.5), new THREE.Vector3(-2.6, 0, -3.2), new THREE.Vector3(2.6, 0, 3.2), new THREE.Vector3(7.5, 0, -3.5)];
  P.forEach(p => {
    add(hexCyl(2.0, 0.9), M(0xE2E8F0), p.x, 0.45, p.z, g);
    add(new THREE.CylinderGeometry(2.05, 2.05, 0.12, 6, 1, true), E(0x60A5FA, 2.2), p.x, 0.86, p.z, g, false);
  });
  const path = new THREE.CatmullRomCurve3(P.map(p => new THREE.Vector3(p.x, 1.05, p.z)), false, 'catmullrom', 0.5);
  add(new THREE.TubeGeometry(path, 120, 0.13, 6, false), E(0x60A5FA, 1.8), 0, 0, 0, g, false);
  // 1 deposit: USDT stacks
  for (let k = 0; k < 6; k++) add(new THREE.CylinderGeometry(0.6, 0.6, 0.2, 18), M(0x26A17B, { metalness: 0.3, roughness: 0.5, flatShading: false }), P[0].x - 0.5, 1.0 + k * 0.21, P[0].z - 0.3, g);
  for (let k = 0; k < 4; k++) add(new THREE.CylinderGeometry(0.6, 0.6, 0.2, 18), M(0x26A17B, { metalness: 0.3, roughness: 0.5, flatShading: false }), P[0].x + 0.8, 1.0 + k * 0.21, P[0].z + 0.4, g);
  // 2 validation: container + bill of lading + scan ring
  add(box(2.2, 1.1, 1.1), M(0x3D6A9E), P[1].x, 1.45, P[1].z - 0.4, g);
  const doc = add(box(1.0, 1.35, 0.06), M(0xF8FAFC), P[1].x + 0.6, 2.9, P[1].z + 0.6, g);
  for (let k = 0; k < 4; k++) add(box(0.7, 0.06, 0.02), M(0x94A3B8), P[1].x + 0.6, 3.25 - k * 0.22, P[1].z + 0.64, g, false);
  const sr = add(new THREE.TorusGeometry(1.5, 0.05, 6, 6), E(0x22D3EE, 2.2), P[1].x, 1.4, P[1].z, g, false);
  sr.rotation.x = Math.PI / 2;
  anims.push(T => { sr.position.y = 1.2 + (0.5 + 0.5 * Math.sin(T * 2)) * 1.4; doc.rotation.y = Math.sin(T * 0.8) * 0.3; });
  // 3 smart settlement: rotating contract cube
  const cube = add(box(1.5, 1.5, 1.5), M(0x1E3A8A, { metalness: 0.3, roughness: 0.4 }), P[2].x, 2.6, P[2].z, g, false);
  const ce = new THREE.LineSegments(new THREE.EdgesGeometry(box(1.56, 1.56, 1.56)), new THREE.LineBasicMaterial({ color: 0x93C5FD }));
  cube.add(ce);
  anims.push(T => { cube.rotation.set(T * 0.5, T * 0.7, 0); });
  // 4 liquidation: mini bank + fiat
  const bk = new THREE.Group(); bk.position.set(P[3].x, 0.9, P[3].z); g.add(bk);
  add(box(2.6, 0.25, 1.9), M(0xF1F5F9), 0, 0.12, 0, bk);
  for (let k = 0; k < 4; k++) add(new THREE.CylinderGeometry(0.13, 0.13, 1.3, 6), M(0xF1F5F9), -0.9 + k * 0.6, 0.9, 0.7, bk);
  add(box(2.2, 1.3, 1.1), M(0xE2E8F0), 0, 0.9, -0.2, bk);
  const roof = add(new THREE.CylinderGeometry(1, 1, 2.6, 3), M(0xF1F5F9), 0, 1.95, 0, bk); roof.rotation.z = Math.PI / 2; roof.scale.set(0.55, 1, 1.1);
  const okk = add(new THREE.SphereGeometry(0.28, 10, 8), E(0x34D399, 3), 0, 3.2, 0, bk, false);
  // the token travelling the workflow
  const tok = add(new THREE.CylinderGeometry(0.55, 0.55, 0.16, 24), E(0x7DD3FC, 3), 0, 0, 0, g, false);
  const halo = add(new THREE.SphereGeometry(0.9, 12, 10), GLOW(0x60A5FA, 0.22), 0, 0, 0, g, false);
  anims.push(T => {
    const u = (T * 0.16) % 1, p = path.getPointAt(u);
    tok.position.set(p.x, p.y + 0.55, p.z); halo.position.copy(tok.position);
    tok.rotation.set(Math.PI / 2, 0, T * 3);
    okk.material.emissiveIntensity = u > 0.9 ? 4 : 1.2;
  });
  [[-9.5, -5], [9.8, 4.5], [0.5, -9.5], [-1, 9.5], [-10.5, 1]].forEach(([x, z]) => tree(g, x, z));
}

// ===== 5 · $AETH token, staking + burn & buyback =====
{
  const g = isl[5];
  const coin = new THREE.Group(); coin.position.set(0, 7, 0); g.add(coin);
  add(new THREE.CylinderGeometry(3, 3, 0.6, 6), M(0x6D5AE6, { metalness: 0.45, roughness: 0.35 }), 0, 0, 0, coin, false).rotation.x = Math.PI / 2;
  add(new THREE.TorusGeometry(3.02, 0.12, 6, 6), E(0xC4B5FD, 1.3), 0, 0, 0, coin, false).rotation.z = Math.PI / 6;
  for (const s of [1, -1]) {
    const tri = add(new THREE.CylinderGeometry(1.5, 1.5, 0.12, 3), E(0xDDD6FE, 0.9), 0, -0.1, s * 0.33, coin, false);
    tri.rotation.set(Math.PI / 2, Math.PI, 0);
  }
  anims.push(T => { coin.rotation.y = T * 0.6; coin.position.y = 7 + Math.sin(T * 1.2) * 0.35; });
  add(hexCyl(1.2, 2.4), M(0xE2E8F0), 0, 1.2, 0, g);
  add(new THREE.CylinderGeometry(0.04, 0.04, 4, 4), GLOW(0xC4B5FD, 0.5), 0, 4.4, 0, g, false);
  // staking validator nodes
  for (let k = 0; k < 6; k++) {
    const a = k * Math.PI / 3 + Math.PI / 6, x = Math.cos(a) * 7.5, z = Math.sin(a) * 7.5;
    add(hexCyl(0.6, 2.2), M(0xCBD5E1), x, 1.1, z, g);
    const lt = add(new THREE.OctahedronGeometry(0.45, 0), E(0xA78BFA, 2.4), x, 2.8, z, g, false);
    anims.push(T => { lt.rotation.y = T + k; });
    const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(x, 2.8, z), new THREE.Vector3(0, 7, 0)]), new THREE.LineBasicMaterial({ color: 0xA78BFA, transparent: true, opacity: 0.45 }));
    g.add(l);
  }
  // burn furnace (15% of fees → buyback & burn)
  const fx = 6.5, fz = 5.5;
  add(hexCyl(1.6, 1.4), M(0x334155), fx, 0.7, fz, g);
  add(new THREE.CylinderGeometry(1.25, 1.25, 0.1, 6), E(0xF97316, 2.4), fx, 1.42, fz, g, false);
  const flames = [[0, 1.0, 0xF97316], [0.35, 0.75, 0xFBBF24], [-0.35, 0.7, 0xFB923C]].map(([dx, s, c]) => add(new THREE.ConeGeometry(0.5 * s, 2.2 * s, 6), E(c, 3), fx + dx, 2.3, fz, g, false));
  const embers = [];
  for (let k = 0; k < 10; k++) embers.push(add(new THREE.TetrahedronGeometry(0.12, 0), E(0xFBBF24, 3), fx, 2, fz, g, false));
  anims.push(T => {
    flames.forEach((f, k) => { const s = 1 + 0.18 * Math.sin(T * 7 + k * 2); f.scale.set(1, s, 1); f.rotation.y = T * 2 + k; });
    embers.forEach((e, k) => { const u = (T * 0.35 + k / 10) % 1; e.position.set(fx + Math.sin(k * 2.3 + T) * 0.6 * u, 2.4 + u * 6, fz + Math.cos(k * 1.7 + T) * 0.6 * u); e.scale.setScalar(1 - u); });
  });
  // buyback arc from the market district to the furnace
  const arc = new THREE.QuadraticBezierCurve3(new THREE.Vector3(-6.5, 1.5, 5.5), new THREE.Vector3(0, 6, 8), new THREE.Vector3(fx, 3, fz));
  add(new THREE.TubeGeometry(arc, 60, 0.07, 5, false), E(0x2DD4BF, 1.6), 0, 0, 0, g, false);
  const pulses = [0, 1, 2].map(() => add(new THREE.SphereGeometry(0.2, 8, 6), E(0x5EEAD4, 3), 0, 0, 0, g, false));
  anims.push(T => pulses.forEach((p, k) => p.position.copy(arc.getPointAt((T * 0.25 + k / 3) % 1))));
  [[-6.5, 5.5, 2, 2.6, 2], [-8.5, 2.4, 1.6, 1.8, 1.6], [-4.4, 7.6, 1.6, 1.5, 1.6]].forEach(s => block(g, s[0], s[1], s[2], s[3], s[4], 0xD8E0EA, 0x2DD4BF));
  [[-9, -5], [3, -9.5], [9.6, -2], [-3, -9]].forEach(([x, z]) => tree(g, x, z));
}

// ===== 6 · use of funds + roadmap =====
{
  const g = isl[6];
  const bars = [[8.0, 0x3B82F6], [5.0, 0x818CF8], [4.0, 0x22D3EE], [3.0, 0x34D399]];
  bars.forEach(([h, c], k) => {
    const x = -8 + k * 3.2, z = -4.5;
    add(hexCyl(1.35, h), M(0xDCE3ED), x, h / 2, z, g);
    add(hexCyl(1.4, 0.35), E(c, 2.2), x, h + 0.18, z, g, false);
    add(new THREE.CylinderGeometry(1.38, 1.38, 0.12, 6, 1, true), E(c, 1.6), x, h * 0.5, z, g, false);
  });
  const road = new THREE.CatmullRomCurve3([new THREE.Vector3(-9, 0.1, 6), new THREE.Vector3(-4, 0.1, 2.5), new THREE.Vector3(0, 0.1, 6), new THREE.Vector3(3.6, 0.1, 3.6)]);
  add(new THREE.TubeGeometry(road, 80, 0.45, 4, false), M(0x334155), 0, 0, 0, g, false).scale.y = 0.2;
  add(new THREE.TubeGeometry(road, 80, 0.08, 4, false), E(0x34D399, 1.4), 0, 0.14, 0, g, false);
  [0.18, 0.5, 0.8].forEach((u, k) => {
    const p = road.getPointAt(u);
    add(new THREE.CylinderGeometry(0.07, 0.07, 2.6, 5), M(0xE2E8F0), p.x, 1.3, p.z, g);
    const flag = add(new THREE.CylinderGeometry(0.55, 0.55, 0.06, 3), E([0x60A5FA, 0x22D3EE, 0x34D399][k], 2.4), p.x + 0.45, 2.3, p.z, g, false);
    flag.rotation.x = Math.PI / 2;
    anims.push(T => { flag.rotation.y = Math.PI / 2 + Math.sin(T * 2 + k) * 0.25; });
  });
  // global expansion: low-poly globe on a launch pad
  add(hexCyl(2.0, 0.8), M(0xCBD5E1), 5.0, 0.4, 1.0, g);
  const globe = add(new THREE.IcosahedronGeometry(1.9, 1), M(0x2563EB, { roughness: 0.6 }), 5.0, 3.4, 1.0, g);
  const land = add(new THREE.IcosahedronGeometry(1.93, 1), M(0x34D399, { transparent: true, opacity: 0.0 }), 0, 0, 0, globe, false);
  land.visible = false;
  const cont = new THREE.Group(); globe.add(cont);
  for (let k = 0; k < 7; k++) {
    const v = new THREE.Vector3(Math.cos(k * 2.1) * Math.cos(k), Math.sin(k * 1.3) * 0.8, Math.sin(k * 2.1) * Math.cos(k)).normalize().multiplyScalar(1.85);
    const c = add(new THREE.DodecahedronGeometry(0.55, 0), M(0x34D399), v.x, v.y, v.z, cont, false); c.scale.set(1, 0.5, 1); c.lookAt(0, 0, 0);
  }
  const orbit = add(new THREE.TorusGeometry(3, 0.04, 4, 48), E(0x6EE7B7, 1.8), 5.0, 3.4, 1.0, g, false);
  const sat = add(new THREE.OctahedronGeometry(0.3, 0), E(0xA7F3D0, 1.6), 0, 0, 0, g, false);
  anims.push(T => {
    globe.rotation.y = T * 0.35; orbit.rotation.set(1.2, 0, 0.4);
    const a = T * 0.9; const v = new THREE.Vector3(Math.cos(a) * 3, Math.sin(a) * 3, 0).applyEuler(orbit.rotation);
    sat.position.set(5.0 + v.x, 3.4 + v.y, 1.0 + v.z);
  });
  [[-10, -1], [-8.5, 4.5], [10, -4], [4, -9.5], [-3, 9]].forEach(([x, z]) => tree(g, x, z));
}

// ---------- the connected network: routes, satellites, stars ----------
function arcBetween(a, b, lift) {
  const m = a.clone().add(b).multiplyScalar(0.5); m.y += lift;
  return new THREE.QuadraticBezierCurve3(a, m, b);
}
const routeMat = E(0x3B82F6, 1.3);
const pulseGeo = new THREE.SphereGeometry(0.28, 8, 6);
function route(a, b, lift, pulses = 3, col = 0x93C5FD, rad = 0.07) {
  const curve = arcBetween(a, b, lift);
  add(new THREE.TubeGeometry(curve, 80, rad, 5, false), rad > 0.06 ? routeMat : E(0x1E40AF, 1.0), 0, 0, 0, scene, false);
  const ps = [];
  for (let k = 0; k < pulses; k++) ps.push(add(pulseGeo, E(col, 3.2), 0, 0, 0, scene, false));
  const spd = 0.05 + rnd() * 0.04, off = rnd();
  anims.push(T => ps.forEach((p, k) => p.position.copy(curve.getPointAt((T * spd + off + k / pulses) % 1))));
}
for (let i = 0; i < N - 1; i++) {
  const a = C[i].clone().add(new THREE.Vector3(R[i] * 0.8, -1.2, -4));
  const b = C[i + 1].clone().add(new THREE.Vector3(-R[i + 1] * 0.8, -1.2, -4));
  route(a, b, 9, 4);
}
// satellite islands scattered around the world
const sats = [];
for (let k = 0; k < 18; k++) {
  const x = -40 + k * 20 + rnd() * 10, side = k % 2 ? 1 : -1;
  const p = new THREE.Vector3(x, -12 + rnd() * 20, side * (36 + rnd() * 40) - 10);
  const r = 2.2 + rnd() * 2.2;
  const g = makeIsland(p, r, ACC[k % ACC.length]);
  for (let b = 0; b < 2; b++) block(g, (rnd() - 0.5) * r, (rnd() - 0.5) * r, 0.8 + rnd(), 0.8 + rnd() * 2.2, 0.8 + rnd(), 0xCBD5E1, rnd() > 0.5 ? 0x60A5FA : null);
  sats.push(p);
}
sats.forEach((p, k) => {
  let best = 0, bd = 1e9;
  C.forEach((c, i) => { const d = c.distanceTo(p); if (d < bd) { bd = d; best = i; } });
  route(p.clone().add(new THREE.Vector3(0, -0.6, 0)), C[best].clone().add(new THREE.Vector3(0, -1.2, 0)), 6 + rnd() * 6, 2, 0x7DD3FC, 0.04);
});
{
  const n = 2200, pos = new Float32Array(n * 3);
  for (let k = 0; k < n; k++) { pos[k * 3] = -160 + rnd() * 620; pos[k * 3 + 1] = -90 + rnd() * 230; pos[k * 3 + 2] = -260 + rnd() * 330; }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  scene.add(new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xBFD3FF, size: 0.45, sizeAttenuation: true, transparent: true, opacity: 0.75, fog: false })));
  const grid = new THREE.GridHelper(1400, 140, 0x1E3A8A, 0x13234A); grid.position.set(140, -48, 0); scene.add(grid);
}

// ---------- camera path ----------
const ease = x => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const easeS = x => -(Math.cos(Math.PI * x) - 1) / 2;
function orbitPose(i, d, el, az, lookY) {
  const c = C[i];
  return {
    pos: new THREE.Vector3(c.x + Math.sin(az) * d * Math.cos(el), c.y + d * Math.sin(el), c.z + Math.cos(az) * d * Math.cos(el)),
    look: new THREE.Vector3(c.x, c.y + lookY, c.z),
  };
}
const DIVE_FROM = i => (i === 0 ? { d: 62, el: 0.5, az: -0.75, ly: 3 } : { d: 47, el: 0.6, az: -0.6, ly: 1.5 });
const CLOSE_D = [27, 23, 23, 24, 23, 25, 27];
const DIVE_TO = i => ({ d: CLOSE_D[i] * (PORTRAIT ? 1.2 : 1), el: 0.3, az: 0.18, ly: FOCAL_Y[i] });
function divePose(i, u) {
  const a = DIVE_FROM(i), b = DIVE_TO(i), e = ease(u);
  const lerp = (x, y) => x + (y - x) * e;
  // altitude drops a little faster than distance: reads as a descent into the scene
  const ee = Math.min(1, e * 1.08);
  return orbitPose(i, lerp(a.d, b.d), a.el + (b.el - a.el) * ee, lerp(a.az, b.az), lerp(a.ly, b.ly));
}
function connPose(i, u) {
  const A = divePose(i, 1), B = divePose(i + 1, 0);
  const e = easeS(u);
  const outA = A.pos.clone().sub(C[i]).setY(0).normalize();
  const P1 = A.pos.clone().addScaledVector(outA, 10).add(new THREE.Vector3(6, 16, 0));
  const P2 = B.pos.clone().add(new THREE.Vector3(-14, 10, 6));
  const pos = new THREE.CubicBezierCurve3(A.pos, P1, P2, B.pos).getPoint(e);
  const look = A.look.clone().lerp(B.look, easeS(Math.min(1, u * 1.15)));
  return { pos, look };
}
function poseAt(T) {
  let s = SEGS[SEGS.length - 1];
  for (const sg of SEGS) if (T >= sg.t0 && T <= sg.t1) { s = sg; break; }
  const u = Math.min(1, Math.max(0, (T - s.t0) / (s.t1 - s.t0)));
  return s.kind === 'dive' ? divePose(s.i, u) : connPose(s.i, u);
}

window.renderAt = function (T, quality = 0.93) {
  const p = poseAt(T);
  camera.position.copy(p.pos); camera.lookAt(p.look);
  sun.target.position.copy(p.look); sun.position.copy(p.look).add(new THREE.Vector3(-22, 42, 26));
  rimLight.target.position.copy(p.look); rimLight.position.copy(p.look).add(new THREE.Vector3(30, 12, -30));
  anims.forEach(f => f(T));
  composer.render();
  return renderer.domElement.toDataURL('image/jpeg', quality);
};
window.READY = true;
