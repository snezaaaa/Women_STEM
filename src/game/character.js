import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';

/*
 * Procedurally built, rigged & animated young researcher.
 * - A bone hierarchy (hips → spine → chest → neck → head, shoulders → arms → hands,
 *   thighs → shins → feet) with meshes attached to each bone.
 * - Idle + walk AnimationClips generated as keyframe tracks, played by an AnimationMixer.
 * - Realistic proportions (≈ 1.65 m, ≈ 7.3 heads tall).
 * Optional: a GLB model (e.g. Quaternius / Mixamo) can replace it — see content.json "model".
 */

const BONE_NAMES = [
  'hips', 'spine', 'chest', 'neck', 'head', 'hairTail',
  'shoulderL', 'upperArmL', 'foreArmL', 'handL',
  'shoulderR', 'upperArmR', 'foreArmR', 'handR',
  'thighL', 'shinL', 'footL', 'thighR', 'shinR', 'footR',
];

function mat(color, opts = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.75, metalness: 0, ...opts });
}

function bone(name, parent, x = 0, y = 0, z = 0) {
  const b = new THREE.Object3D();
  b.name = name;
  b.position.set(x, y, z);
  parent.add(b);
  return b;
}

function mesh(geo, material, parent, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.castShadow = true;
  parent.add(m);
  return m;
}

/** Cylinder hanging down from the joint (top at y = 0). */
function limb(rTop, rBot, len, material, parent, seg = 12) {
  const g = new THREE.CylinderGeometry(rTop, rBot, len, seg);
  g.translate(0, -len / 2, 0);
  return mesh(g, material, parent);
}

function lathe(points, material, parent, { y = 0, zScale = 0.74, phiStart = 0, phiLength = Math.PI * 2, seg = 24 } = {}) {
  const g = new THREE.LatheGeometry(points.map(([r, h]) => new THREE.Vector2(r, h)), seg, phiStart, phiLength);
  g.scale(1, 1, zScale);
  const m = mesh(g, material, parent, 0, y, 0);
  return m;
}

function buildProcedural(def) {
  const root = new THREE.Group();
  root.name = 'characterRoot';
  const skin = mat(def.skin || '#c99872', { roughness: 0.6 });
  const hairCol = (def.hair && def.hair.color) || '#2a1a12';
  const hair = mat(hairCol, { roughness: 0.85 });
  const outfit = def.outfit || {};
  const top = mat(outfit.top || '#e0e0e0');
  const bottom = mat(outfit.bottom || '#33415f', { roughness: 0.9 });
  const shoes = mat(outfit.shoes || '#ffffff', { roughness: 0.5 });
  const isCoat = outfit.style === 'labcoat';
  const isJacket = outfit.style === 'jacket';
  const coat = mat(isCoat ? '#f7f7f5' : outfit.jacket || '#555', { roughness: 0.8, side: THREE.DoubleSide });
  const sleeve = isCoat || isJacket ? coat : top;

  // ---- skeleton ----
  const hips = bone('hips', root, 0, 0.9, 0);
  const spine = bone('spine', hips, 0, 0.1, 0);
  const chest = bone('chest', spine, 0, 0.2, 0);
  const neck = bone('neck', chest, 0, 0.22, 0);
  const head = bone('head', neck, 0, 0.08, 0);
  const shoulderL = bone('shoulderL', chest, 0.163, 0.125, -0.01);
  const shoulderR = bone('shoulderR', chest, -0.163, 0.125, -0.01);
  const upperArmL = bone('upperArmL', shoulderL);
  const upperArmR = bone('upperArmR', shoulderR);
  const foreArmL = bone('foreArmL', upperArmL, 0, -0.28, 0);
  const foreArmR = bone('foreArmR', upperArmR, 0, -0.28, 0);
  const handL = bone('handL', foreArmL, 0, -0.25, 0);
  const handR = bone('handR', foreArmR, 0, -0.25, 0);
  const thighL = bone('thighL', hips, 0.088, -0.04, 0);
  const thighR = bone('thighR', hips, -0.088, -0.04, 0);
  const shinL = bone('shinL', thighL, 0, -0.42, 0);
  const shinR = bone('shinR', thighR, 0, -0.42, 0);
  const footL = bone('footL', shinL, 0, -0.39, 0);
  const footR = bone('footR', shinR, 0, -0.39, 0);

  // ---- body ----
  // pelvis (trousers)
  lathe([[0, -0.12], [0.1, -0.115], [0.162, -0.05], [0.168, 0.03], [0.142, 0.13], [0, 0.14]], bottom, hips);
  // torso (shirt): waist → bust → shoulders
  lathe(
    [[0, -0.02], [0.138, -0.02], [0.125, 0.07], [0.142, 0.19], [0.158, 0.27], [0.168, 0.34], [0.15, 0.4], [0.07, 0.44], [0, 0.445]],
    top, spine
  );
  // neck + head
  limb(0.043, 0.05, 0.12, skin, neck).position.y = 0.1;
  const headGeo = new THREE.SphereGeometry(0.1, 24, 18);
  const p = headGeo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    if (y < 0) { const k = 1 - 0.32 * (-y / 0.1); x *= k; z *= 1 - 0.12 * (-y / 0.1); }
    if (z > 0 && y < 0.02) z *= 1.04;
    p.setXYZ(i, x, y, z);
  }
  headGeo.computeVertexNormals();
  const headMesh = mesh(headGeo, skin, head, 0, 0.085, 0);
  headMesh.scale.set(0.93, 1.13, 1);
  head.scale.setScalar(1.07);
  // ears
  if (!def.hijab) for (const s of [1, -1]) mesh(new THREE.SphereGeometry(0.022, 8, 6), skin, head, s * 0.092, 0.08, -0.005).scale.set(0.5, 1, 0.8);
  // face
  const eyeWhite = mat('#ffffff', { roughness: 0.3 });
  const iris = mat('#2a1b12', { roughness: 0.2 });
  for (const s of [1, -1]) {
    mesh(new THREE.SphereGeometry(0.016, 10, 8), eyeWhite, head, s * 0.036, 0.095, 0.083).scale.set(1, 0.75, 0.5);
    mesh(new THREE.SphereGeometry(0.0095, 8, 6), iris, head, s * 0.036, 0.095, 0.09);
    const brow = mesh(new THREE.BoxGeometry(0.034, 0.006, 0.01), mat(hairCol), head, s * 0.037, 0.122, 0.088);
    brow.rotation.z = s * -0.12;
  }
  mesh(new THREE.SphereGeometry(0.013, 8, 6), mat(def.skin, { roughness: 0.55 }), head, 0, 0.068, 0.1).scale.set(1, 1.2, 1);
  const lips = mesh(new THREE.TorusGeometry(0.018, 0.0045, 4, 12, Math.PI), mat('#a5545a'), head, 0, 0.045, 0.087);
  lips.rotation.z = Math.PI;
  lips.scale.set(1, 0.6, 1);

  // arms
  const armZ = isCoat ? 0.13 : 0.1;
  upperArmL.rotation.z = armZ;
  upperArmR.rotation.z = -armZ;
  for (const [ua, fa, h] of [[upperArmL, foreArmL, handL], [upperArmR, foreArmR, handR]]) {
    mesh(new THREE.SphereGeometry(0.047, 12, 8), sleeve, ua, 0, -0.01, 0);
    limb(0.046, 0.038, 0.28, sleeve, ua);
    mesh(new THREE.SphereGeometry(0.038, 10, 8), sleeve, fa);
    limb(0.037, isCoat || isJacket ? 0.034 : 0.029, isCoat || isJacket ? 0.22 : 0.25, isCoat || isJacket ? sleeve : skin, fa);
    if (isCoat || isJacket) limb(0.029, 0.027, 0.04, skin, fa).position.y = -0.21;
    const hand = mesh(new THREE.SphereGeometry(0.038, 10, 8), skin, h, 0, -0.04, 0);
    hand.scale.set(0.7, 1.25, 0.45);
    if (!isCoat && !isJacket) {
      // short sleeve: forearm upper part is skin
    }
  }

  // legs
  for (const [th, sh, ft] of [[thighL, shinL, footL], [thighR, shinR, footR]]) {
    mesh(new THREE.SphereGeometry(0.085, 12, 8), bottom, th);
    limb(0.086, 0.056, 0.42, bottom, th);
    mesh(new THREE.SphereGeometry(0.056, 10, 8), bottom, sh);
    limb(0.055, 0.042, 0.36, bottom, sh);
    const shoe = mesh(new THREE.CapsuleGeometry(0.045, 0.11, 4, 10), shoes, ft, 0, -0.02, 0.045);
    shoe.rotation.x = Math.PI / 2;
    shoe.scale.set(1, 1, 0.75);
    const sole = mesh(new THREE.BoxGeometry(0.09, 0.015, 0.2), mat('#3a3340'), ft, 0, -0.055, 0.045);
    sole.castShadow = false;
  }

  // ---- outfit layers ----
  const gap = isCoat ? 0.42 : 0.5;
  if (isCoat || isJacket) {
    lathe(
      isCoat
        ? [[0.162, -0.07], [0.15, 0.0], [0.138, 0.07], [0.152, 0.19], [0.168, 0.27], [0.178, 0.34], [0.16, 0.405], [0.085, 0.44], [0.07, 0.45]]
        : [[0.185, -0.13], [0.178, -0.06], [0.15, 0.03], [0.14, 0.08], [0.152, 0.19], [0.168, 0.27], [0.178, 0.34], [0.16, 0.405], [0.085, 0.44], [0.07, 0.45]],
      coat, spine, { phiStart: gap / 2, phiLength: Math.PI * 2 - gap, zScale: 0.78 }
    );
    // collar
    const collar = mesh(new THREE.TorusGeometry(0.072, 0.016, 6, 16, Math.PI * 1.5), coat, chest, 0, 0.22, -0.005);
    collar.rotation.x = Math.PI / 2;
    collar.rotation.z = Math.PI * 1.75;
    collar.scale.set(1, 0.85, 1);
    if (isCoat) {
      // coat skirt down to mid-thigh
      lathe([[0.152, 0.06], [0.188, 0.0], [0.205, -0.12], [0.225, -0.3], [0.24, -0.42]], coat, hips, { phiStart: gap / 2, phiLength: Math.PI * 2 - gap, zScale: 0.86 });
      // pockets + pen
      for (const s of [1, -1]) mesh(new THREE.BoxGeometry(0.07, 0.06, 0.01), mat('#e6e6e2'), hips, s * 0.12, -0.2, 0.177).rotation.y = s * 0.45;
      mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.07), mat('#3b6fd8'), spine, 0.09, 0.3, 0.12);
      mesh(new THREE.BoxGeometry(0.04, 0.05, 0.005), mat('#8e5bd1'), spine, -0.09, 0.29, 0.123); // badge
    }
  }

  // ---- hair / hijab ----
  const style = def.hijab ? 'none' : (def.hair && def.hair.style) || 'bob';
  const hairCap = () => {
    const capGeo = new THREE.SphereGeometry(0.108, 22, 14, 0, Math.PI * 2, 0, Math.PI * 0.56);
    const cap = mesh(capGeo, hair, head, 0, 0.092, -0.006);
    cap.scale.set(0.98, 1.12, 1.04);
    cap.rotation.x = -0.42;
    return cap;
  };
  let tailBone = null;
  switch (style) {
    case 'bob': {
      hairCap();
      const g = new THREE.CylinderGeometry(0.112, 0.124, 0.15, 22, 1, true, Math.PI * 0.27, Math.PI * 1.46);
      const sides = mesh(g, mat(hairCol, { roughness: 0.85, side: THREE.DoubleSide }), head, 0, 0.065, -0.01);
      sides.scale.set(1, 1, 1.02);
      // fringe
      const fr = mesh(new THREE.SphereGeometry(0.1, 16, 8, Math.PI * 0.15, Math.PI * 0.7, 0, Math.PI * 0.3), hair, head, 0, 0.1, 0.01);
      fr.rotation.y = Math.PI * 0.0;
      fr.scale.set(1, 1, 1.05);
      break;
    }
    case 'ponytail': {
      hairCap();
      mesh(new THREE.SphereGeometry(0.03, 10, 8), hair, head, 0, 0.13, -0.1);
      tailBone = bone('hairTail', head, 0, 0.13, -0.11);
      const tail = new THREE.CapsuleGeometry(0.035, 0.18, 4, 10);
      tail.translate(0, -0.11, 0);
      const t = mesh(tail, hair, tailBone);
      t.scale.set(1, 1, 0.8);
      tailBone.rotation.x = 0.25;
      break;
    }
    case 'braid': {
      hairCap();
      tailBone = bone('hairTail', head, 0, 0.06, -0.1);
      for (let i = 0; i < 7; i++) {
        const s = mesh(new THREE.SphereGeometry(0.034 - i * 0.0025, 10, 8), hair, tailBone, 0, -i * 0.045, -0.01);
        s.scale.set(1, 0.9, 0.8);
      }
      mesh(new THREE.SphereGeometry(0.014, 8, 6), mat('#f2c14e'), tailBone, 0, -0.31, -0.01);
      tailBone.rotation.x = 0.18;
      break;
    }
    case 'puff': {
      hairCap().scale.set(1.04, 1.16, 1.08);
      const puff = mesh(new THREE.IcosahedronGeometry(0.13, 2), hair, head, 0, 0.19, -0.05);
      puff.scale.set(1.05, 0.9, 1);
      const band = mesh(new THREE.TorusGeometry(0.07, 0.012, 6, 16), mat('#f2c14e'), head, 0, 0.14, -0.03);
      band.rotation.x = Math.PI / 2 - 0.4;
      break;
    }
    case 'curls': {
      hairCap().scale.set(1.08, 1.18, 1.1);
      for (let i = 0; i < 26; i++) {
        const a = (i / 26) * Math.PI * 2 * 1.6;
        const yy = 0.2 - (i / 26) * 0.2;
        const ang = Math.PI * 0.62 + (i / 26) * Math.PI * 0.0 + a;
        const x = Math.sin(ang) * 0.12, z = Math.cos(ang) * 0.12;
        if (z > 0.05 && yy < 0.16) continue; // keep the face clear
        mesh(new THREE.IcosahedronGeometry(0.048, 1), hair, head, x, yy, z - 0.02);
      }
      break;
    }
    case 'none':
      break;
    default:
      hairCap();
  }
  if (def.hijab) {
    const hj = mat(def.hijab, { roughness: 0.9, side: THREE.DoubleSide });
    const capTop = mesh(new THREE.SphereGeometry(0.122, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.4), hj, head, 0, 0.085, -0.005);
    capTop.scale.set(0.97, 1.13, 1.02);
    capTop.rotation.x = -0.12;
    const open = 1.25; // face opening (radians)
    const ring = mesh(
      new THREE.SphereGeometry(0.122, 24, 12, Math.PI / 2 + open / 2, Math.PI * 2 - open, Math.PI * 0.38, Math.PI * 0.5),
      hj, head, 0, 0.085, -0.005
    );
    ring.scale.set(0.97, 1.13, 1.02);
    ring.rotation.x = -0.12;
    // chin wrap
    const chinWrap = mesh(new THREE.TorusGeometry(0.085, 0.022, 8, 20, Math.PI), hj, head, 0, -0.005, 0.0);
    chinWrap.rotation.x = Math.PI / 2 + 0.3;
    chinWrap.rotation.z = Math.PI;
    // drape over neck & shoulders
    const drape = new THREE.CylinderGeometry(0.07, 0.215, 0.27, 24, 1, true);
    const d = mesh(drape, hj, chest, 0, 0.2, 0.0);
    d.scale.set(1, 1, 0.82);
  }
  if (def.glasses) {
    const frame = mat('#1f1a24', { roughness: 0.3, metalness: 0.4 });
    for (const s of [1, -1]) {
      mesh(new THREE.TorusGeometry(0.024, 0.0042, 6, 18), frame, head, s * 0.037, 0.093, 0.1);
      const arm = mesh(new THREE.BoxGeometry(0.004, 0.004, 0.1), frame, head, s * 0.07, 0.097, 0.05);
      arm.rotation.y = s * 0.12;
    }
    mesh(new THREE.BoxGeometry(0.024, 0.004, 0.004), frame, head, 0, 0.098, 0.103);
  }

  if (!tailBone) bone('hairTail', head);
  return root;
}

// ---------- animation clips ----------
const _e = new THREE.Euler();
const _q = new THREE.Quaternion();

function buildClip(name, duration, samples, poseFn) {
  const times = [];
  const values = {}; // boneName -> quaternion array
  const hipPos = [];
  for (let i = 0; i <= samples; i++) {
    const t = (i / samples) * duration;
    times.push(t);
    const pose = poseFn((i / samples) * Math.PI * 2);
    for (const b of BONE_NAMES) {
      const r = pose[b] || [0, 0, 0];
      _e.set(r[0], r[1], r[2]);
      _q.setFromEuler(_e);
      (values[b] ||= []).push(_q.x, _q.y, _q.z, _q.w);
    }
    hipPos.push(0, pose.hipY ?? 0.9, 0);
  }
  const tracks = BONE_NAMES.map((b) => new THREE.QuaternionKeyframeTrack(`${b}.quaternion`, times, values[b]));
  tracks.push(new THREE.VectorKeyframeTrack('hips.position', times, hipPos));
  return new THREE.AnimationClip(name, duration, tracks);
}

function armRest(isCoat) {
  return isCoat ? 0.13 : 0.1;
}

export function makeClips(def) {
  const az = armRest(def.outfit && def.outfit.style === 'labcoat');
  const walk = buildClip('walk', 0.9, 24, (ph) => {
    const s = Math.sin(ph), c = Math.cos(ph);
    const kneeL = 0.12 + 0.75 * Math.max(0, c) ** 1.5;
    const kneeR = 0.12 + 0.75 * Math.max(0, -c) ** 1.5;
    return {
      hipY: 0.885 + 0.022 * Math.cos(2 * ph),
      hips: [0, 0.09 * s, 0.03 * s],
      spine: [0.05, -0.12 * s, -0.02 * s],
      chest: [0.02, -0.05 * s, 0],
      neck: [-0.04, 0.08 * s, 0],
      head: [0.02, 0.06 * s, 0],
      hairTail: [0.3 + 0.12 * Math.cos(2 * ph), 0.12 * s, 0.08 * c],
      thighL: [-0.48 * s - 0.05, 0, 0.02],
      thighR: [0.48 * s - 0.05, 0, -0.02],
      shinL: [kneeL, 0, 0],
      shinR: [kneeR, 0, 0],
      footL: [0.25 * s - kneeL * 0.25 - 0.05, 0, 0],
      footR: [-0.25 * s - kneeR * 0.25 - 0.05, 0, 0],
      upperArmL: [0.42 * s, 0, az],
      upperArmR: [-0.42 * s, 0, -az],
      foreArmL: [-0.28 - 0.18 * Math.max(0, -s), 0, 0],
      foreArmR: [-0.28 - 0.18 * Math.max(0, s), 0, 0],
      handL: [0, 0.3, 0],
      handR: [0, -0.3, 0],
    };
  });
  const idle = buildClip('idle', 4, 32, (ph) => {
    const s = Math.sin(ph), c = Math.cos(ph);
    return {
      hipY: 0.9 + 0.004 * Math.sin(2 * ph),
      hips: [0, 0.03 * s, 0.015 * s],
      spine: [0.01 * Math.sin(2 * ph), -0.02 * s, -0.01 * s],
      chest: [-0.02 * Math.sin(2 * ph), 0, 0],
      neck: [0.02, 0.1 * Math.sin(ph), 0.02 * c],
      head: [0.03 * Math.sin(2 * ph), 0.12 * Math.sin(ph + 0.6), 0.03 * s],
      hairTail: [0.25 + 0.03 * Math.sin(2 * ph), 0.04 * s, 0],
      thighL: [-0.02, 0, 0.03],
      thighR: [0.02, 0, -0.03],
      shinL: [0.04, 0, 0],
      shinR: [0.02, 0, 0],
      footL: [-0.02, 0.15, 0],
      footR: [-0.02, -0.15, 0],
      upperArmL: [0.03 * s, 0, az + 0.02 * Math.sin(2 * ph)],
      upperArmR: [-0.03 * s, 0, -az - 0.02 * Math.sin(2 * ph)],
      foreArmL: [-0.18 - 0.03 * Math.sin(2 * ph), 0, 0],
      foreArmR: [-0.18 - 0.03 * Math.sin(2 * ph), 0, 0],
      handL: [0, 0.4, 0],
      handR: [0, -0.4, 0],
    };
  });
  const cheer = buildClip('cheer', 1.2, 24, (ph) => {
    const s = Math.sin(ph);
    return {
      hipY: 0.9 + 0.04 * Math.max(0, Math.sin(2 * ph)),
      spine: [-0.08, 0, 0],
      chest: [-0.05, 0, 0],
      head: [-0.15, 0, 0],
      hairTail: [0.3, 0, 0],
      upperArmL: [0, 0, 2.6 + 0.2 * s],
      upperArmR: [0, 0, -2.6 - 0.2 * s],
      foreArmL: [-0.2, 0, 0.3],
      foreArmR: [-0.2, 0, -0.3],
      thighL: [0, 0, 0.03],
      thighR: [0, 0, -0.03],
      shinL: [0.05, 0, 0],
      shinR: [0.05, 0, 0],
    };
  });
  return { idle, walk, cheer };
}

// ---------- public API ----------
export class Character {
  constructor(def) {
    this.def = def;
    this.object = new THREE.Group();
    this.object.name = 'character-' + def.id;
    this.speed = 0;
    this.state = 'idle';
    this._useProcedural();
    if (def.model) this._tryLoadModel(def);
  }

  _useProcedural() {
    if (this.body) this.object.remove(this.body);
    this.body = buildProcedural(this.def);
    this.object.add(this.body);
    this.mixer = new THREE.AnimationMixer(this.body);
    const clips = makeClips(this.def);
    this.actions = {
      idle: this.mixer.clipAction(clips.idle),
      walk: this.mixer.clipAction(clips.walk),
      cheer: this.mixer.clipAction(clips.cheer),
    };
    this.walkBaseSpeed = 1.55; // m/s at timeScale 1
    this.actions.idle.play();
    this.current = this.actions.idle;
  }

  async _tryLoadModel(def) {
    try {
      const url = def.model.startsWith('http') ? def.model : import.meta.env.BASE_URL + def.model.replace(/^\//, '');
      const gltf = await new GLTFLoader().loadAsync(url);
      const scene = SkeletonUtils.clone(gltf.scene);
      scene.scale.setScalar(def.modelScale || 1);
      scene.traverse((o) => { if (o.isMesh) { o.castShadow = true; } });
      const names = def.animations || {};
      const find = (n) => gltf.animations.find((a) => a.name === n) || gltf.animations.find((a) => a.name.toLowerCase().includes(String(n).toLowerCase()));
      const idleClip = find(names.idle || 'Idle');
      const walkClip = find(names.walk || 'Walk');
      if (!idleClip || !walkClip) throw new Error('Model needs idle + walk animations: ' + gltf.animations.map((a) => a.name).join(', '));
      this.object.remove(this.body);
      this.body = scene;
      this.object.add(scene);
      this.mixer = new THREE.AnimationMixer(scene);
      const cheerClip = find(names.cheer || 'Wave') || idleClip;
      this.actions = { idle: this.mixer.clipAction(idleClip), walk: this.mixer.clipAction(walkClip), cheer: this.mixer.clipAction(cheerClip) };
      this.walkBaseSpeed = def.walkSpeed || 1.6;
      this.current = null;
      this.state = '';
      this.setState('idle');
    } catch (err) {
      console.warn(`[character] Could not load model "${def.model}" – using the built-in character.`, err);
    }
  }

  setState(state) {
    if (this.state === state) return;
    this.state = state;
    const next = this.actions[state];
    if (!next) return;
    next.reset();
    next.setEffectiveWeight(1);
    next.play();
    if (this.current && this.current !== next) next.crossFadeFrom(this.current, 0.22, false);
    this.current = next;
  }

  setMoving(speed) {
    this.speed = speed;
    if (speed > 0.05) {
      this.setState('walk');
      this.actions.walk.timeScale = THREE.MathUtils.clamp(speed / this.walkBaseSpeed, 0.6, 2.2);
    } else if (this.state === 'walk') {
      this.setState('idle');
    }
  }

  update(dt) {
    this.mixer.update(dt);
  }

  dispose() {
    this.object.traverse((o) => {
      if (o.isMesh) {
        o.geometry.dispose();
        (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose());
      }
    });
  }
}
