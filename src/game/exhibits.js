import * as THREE from 'three';
import { ParametricGeometry } from 'three/examples/jsm/geometries/ParametricGeometry.js';
import { punchCardTexture, xrayTexture, chalkboardTexture, codeSheetTexture } from './textures.js';

// Each builder returns { group, update(time) } sized to fit in a ~0.8 m cube,
// resting on y = 0 and centred on x/z.

const brass = () => new THREE.MeshStandardMaterial({ color: 0xc9a043, metalness: 0.85, roughness: 0.3 });
const glow = (c, i = 1.4) => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: i, roughness: 0.4 });
const basic = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.6, ...o });

function gearGeometry(rOuter, rInner, teeth, depth) {
  const shape = new THREE.Shape();
  const steps = teeth * 4;
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    const r = i % 4 < 2 ? rOuter : rOuter * 0.82;
    const x = Math.cos(a) * r, y = Math.sin(a) * r;
    if (i === 0) shape.moveTo(x, y); else shape.lineTo(x, y);
  }
  const hole = new THREE.Path();
  hole.absarc(0, 0, rInner, 0, Math.PI * 2, true);
  shape.holes.push(hole);
  const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 6 });
  geo.translate(0, 0, -depth / 2);
  return geo;
}

function standBase(group, r = 0.22, color = 0x2b2140) {
  const b = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.1, 0.05, 20), basic(color, { roughness: 0.4 }));
  b.position.y = 0.025;
  group.add(b);
  return b;
}

const builders = {
  punchcard() {
    const group = new THREE.Group();
    standBase(group, 0.28);
    const card = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.3, 0.01), [
      basic(0xe7d8b0), basic(0xe7d8b0), basic(0xe7d8b0), basic(0xe7d8b0),
      new THREE.MeshStandardMaterial({ map: punchCardTexture(), roughness: 0.8 }), basic(0xe7d8b0),
    ]);
    card.position.set(-0.05, 0.36, 0.05);
    card.rotation.x = -0.15;
    group.add(card);
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.2), basic(0x333333));
    stick.position.set(-0.05, 0.13, 0.04);
    group.add(stick);
    const gear = new THREE.Mesh(gearGeometry(0.17, 0.04, 12, 0.05), brass());
    gear.position.set(0.18, 0.56, -0.08);
    group.add(gear);
    const gear2 = new THREE.Mesh(gearGeometry(0.1, 0.025, 8, 0.05), brass());
    gear2.position.set(-0.1, 0.62, -0.1);
    group.add(gear2);
    return { group, update(t) { gear.rotation.z = t * 0.6; gear2.rotation.z = -t * 1.0 + 0.2; } };
  },

  vial() {
    const group = new THREE.Group();
    standBase(group, 0.2);
    const glass = new THREE.Mesh(
      new THREE.CylinderGeometry(0.11, 0.11, 0.5, 20, 1, true),
      new THREE.MeshStandardMaterial({ color: 0xddffee, transparent: true, opacity: 0.25, roughness: 0.05, side: THREE.DoubleSide })
    );
    glass.position.y = 0.32;
    group.add(glass);
    const bottom = new THREE.Mesh(new THREE.SphereGeometry(0.11, 20, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), glass.material);
    bottom.position.y = 0.07;
    group.add(bottom);
    const liquidMat = glow(0x5dff7a, 1.6);
    liquidMat.transparent = true;
    liquidMat.opacity = 0.9;
    const liquid = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.095, 0.3, 20), liquidMat);
    liquid.position.y = 0.22;
    group.add(liquid);
    const lb = new THREE.Mesh(new THREE.SphereGeometry(0.095, 16, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), liquidMat);
    lb.position.y = 0.07;
    group.add(lb);
    const cork = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.08, 0.07, 12), basic(0x9b6b3d));
    cork.position.y = 0.6;
    group.add(cork);
    const bubbles = [];
    for (let i = 0; i < 6; i++) {
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.015, 8, 6), glow(0xc8ffcf, 2));
      group.add(b);
      bubbles.push(b);
    }
    const halo = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 12), new THREE.MeshBasicMaterial({ color: 0x5dff7a, transparent: true, opacity: 0.12, depthWrite: false }));
    halo.position.y = 0.25;
    group.add(halo);
    return {
      group,
      update(t) {
        bubbles.forEach((b, i) => {
          const p = (t * 0.25 + i / 6) % 1;
          b.position.set(Math.sin(i * 2.1) * 0.05, 0.08 + p * 0.28, Math.cos(i * 1.7) * 0.05);
        });
        liquidMat.emissiveIntensity = 1.3 + Math.sin(t * 2.5) * 0.4;
        halo.material.opacity = 0.1 + Math.sin(t * 2.5) * 0.04;
      },
    };
  },

  atom() {
    const group = new THREE.Group();
    standBase(group);
    const core = new THREE.Group();
    core.position.y = 0.42;
    group.add(core);
    const nucleus = new THREE.Group();
    for (let i = 0; i < 7; i++) {
      const s = new THREE.Mesh(new THREE.SphereGeometry(0.045, 14, 10), basic(i % 2 ? 0xe2584f : 0x5b8fe0, { roughness: 0.3 }));
      s.position.set(Math.sin(i * 2.4) * 0.04, Math.cos(i * 1.3) * 0.04, Math.sin(i * 3.1) * 0.04);
      nucleus.add(s);
    }
    core.add(nucleus);
    const rings = [];
    const ringMat = new THREE.MeshStandardMaterial({ color: 0xffd36e, metalness: 0.6, roughness: 0.3, emissive: 0x553b00 });
    for (let i = 0; i < 3; i++) {
      const pivot = new THREE.Group();
      pivot.rotation.set(Math.PI / 2, (i * Math.PI) / 3, 0);
      pivot.rotateX(0.0);
      const ringHolder = new THREE.Group();
      ringHolder.rotation.y = (i * Math.PI) / 3;
      ringHolder.rotation.x = Math.PI / 2 + (i - 1) * 0.9;
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.008, 6, 64), ringMat);
      ringHolder.add(ring);
      const e = new THREE.Mesh(new THREE.SphereGeometry(0.03, 12, 8), glow(0x9fe8ff, 2));
      ringHolder.add(e);
      core.add(ringHolder);
      rings.push({ e, phase: i * 2.1 });
    }
    return {
      group,
      update(t) {
        core.rotation.y = t * 0.3;
        rings.forEach((r, i) => {
          const a = t * (1.6 + i * 0.3) + r.phase;
          r.e.position.set(Math.cos(a) * 0.3, Math.sin(a) * 0.3, 0);
        });
      },
    };
  },

  xray() {
    const group = new THREE.Group();
    standBase(group);
    const frameMat = basic(0x22202a, { metalness: 0.4 });
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.62, 0.03), frameMat);
    frame.position.set(0, 0.42, 0);
    group.add(frame);
    const film = new THREE.Mesh(
      new THREE.PlaneGeometry(0.44, 0.56),
      new THREE.MeshStandardMaterial({ map: xrayTexture(), emissive: 0xffffff, emissiveMap: xrayTexture(), emissiveIntensity: 0.9 })
    );
    film.position.set(0, 0.42, 0.017);
    group.add(film);
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.12), frameMat);
    leg.position.y = 0.08;
    group.add(leg);
    group.rotation.x = -0.05;
    return { group, update(t) { film.material.emissiveIntensity = 0.75 + Math.sin(t * 1.5) * 0.15; } };
  },

  fission() {
    const group = new THREE.Group();
    standBase(group);
    const a = new THREE.Mesh(new THREE.SphereGeometry(0.12, 20, 14), glow(0xff8a3d, 1.1));
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.1, 20, 14), glow(0xffc94d, 1.1));
    const n = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), glow(0x9fe8ff, 2));
    const n2 = n.clone();
    group.add(a, b, n, n2);
    const flash = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 10), new THREE.MeshBasicMaterial({ color: 0xffe2a8, transparent: true, opacity: 0, depthWrite: false }));
    flash.position.y = 0.42;
    group.add(flash);
    return {
      group,
      update(t) {
        const p = (t * 0.35) % 1; // 0..1 cycle
        const sep = p < 0.3 ? 0.02 : Math.min(0.24, (p - 0.3) * 0.5);
        a.position.set(-sep - 0.06, 0.42, 0);
        b.position.set(sep + 0.06, 0.42, 0);
        a.scale.setScalar(p < 0.3 ? 1 + Math.sin(t * 20) * 0.03 : 1);
        n.position.set(0, 0.42 + Math.max(0, p - 0.3) * 0.6, Math.max(0, p - 0.3) * 0.4);
        n2.position.set(0, 0.42 - Math.max(0, p - 0.3) * 0.5, -Math.max(0, p - 0.3) * 0.4);
        n.visible = n2.visible = p > 0.3;
        flash.material.opacity = p > 0.28 && p < 0.42 ? 0.5 * (1 - (p - 0.28) / 0.14) : 0;
      },
    };
  },

  piano() {
    const group = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.1, 0.26), basic(0x1b1420, { roughness: 0.3 }));
    body.position.y = 0.1;
    group.add(body);
    const keys = [];
    const white = basic(0xfaf8f2, { roughness: 0.3 });
    const black = basic(0x111111, { roughness: 0.3 });
    for (let i = 0; i < 10; i++) {
      const k = new THREE.Mesh(new THREE.BoxGeometry(0.058, 0.03, 0.18), white);
      k.position.set(-0.29 + i * 0.064, 0.165, 0.03);
      group.add(k);
      keys.push(k);
      if ([0, 1, 3, 4, 5, 7, 8].includes(i) && i < 9) {
        const bk = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.03, 0.1), black);
        bk.position.set(-0.29 + i * 0.064 + 0.032, 0.19, -0.01);
        group.add(bk);
      }
    }
    const waves = [];
    const waveMat = new THREE.MeshBasicMaterial({ color: 0x9fd4ff, transparent: true, opacity: 0.8, depthWrite: false });
    for (let i = 0; i < 3; i++) {
      const w = new THREE.Mesh(new THREE.TorusGeometry(0.1 + i * 0.08, 0.008, 6, 40, Math.PI * 0.7), waveMat.clone());
      w.rotation.z = Math.PI * 0.15;
      w.position.set(0.0, 0.32, 0);
      group.add(w);
      waves.push(w);
    }
    const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.18), basic(0xc0c0c0, { metalness: 0.8 }));
    antenna.position.set(0, 0.24, -0.08);
    group.add(antenna);
    return {
      group,
      update(t) {
        keys.forEach((k, i) => {
          const hop = Math.floor(t * 3) % keys.length;
          k.position.y = i === (hop * 7) % keys.length ? 0.155 : 0.165;
        });
        waves.forEach((w, i) => {
          const p = (t * 0.6 + i / 3) % 1;
          w.scale.setScalar(0.6 + p * 1.2);
          w.material.opacity = 0.9 * (1 - p);
          w.position.y = 0.3 + p * 0.1;
        });
      },
    };
  },

  chalkboard() {
    const group = new THREE.Group();
    const wood = basic(0x7a5230);
    const board = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.5, 0.03), wood);
    board.position.y = 0.42;
    group.add(board);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.44), new THREE.MeshStandardMaterial({ map: chalkboardTexture(), roughness: 0.9 }));
    face.position.set(0, 0.42, 0.016);
    group.add(face);
    for (const x of [-0.25, 0.25]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.2, 0.03), wood);
      leg.position.set(x, 0.1, 0);
      group.add(leg);
    }
    const chalk = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.06), basic(0xffffff));
    chalk.rotation.z = Math.PI / 2;
    chalk.position.set(0.15, 0.18, 0.03);
    group.add(chalk);
    const sat = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), glow(0xfff2b0, 2));
    group.add(sat);
    return {
      group,
      update(t) {
        const a = t * 0.8;
        // follow the drawn ellipse (approx, rotated -0.25 in canvas space)
        const ex = Math.cos(a) * 0.2, ey = Math.sin(a) * 0.105;
        const r = 0.25;
        sat.position.set(-0.04 + ex * Math.cos(r) + ey * Math.sin(r), 0.42 + 0.005 + (-ex * Math.sin(r) + ey * Math.cos(r)) * 1, 0.03);
      },
    };
  },

  capsule() {
    const group = new THREE.Group();
    standBase(group);
    const ship = new THREE.Group();
    ship.position.y = 0.42;
    group.add(ship);
    const hull = new THREE.Mesh(new THREE.SphereGeometry(0.15, 20, 14), basic(0xd9d6cf, { metalness: 0.5, roughness: 0.35 }));
    ship.add(hull);
    const module = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.17, 0.2, 16), basic(0x9aa0a6, { metalness: 0.6, roughness: 0.4 }));
    module.position.y = -0.2;
    ship.add(module);
    const win = new THREE.Mesh(new THREE.CircleGeometry(0.045, 16), glow(0x7fd0ff, 1.2));
    win.position.set(0, 0.03, 0.149);
    ship.add(win);
    const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.16), basic(0xcccccc));
    ant.position.set(0.05, 0.19, 0);
    ant.rotation.z = -0.3;
    ship.add(ant);
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.15, 12), new THREE.MeshBasicMaterial({ color: 0xffa24a, transparent: true, opacity: 0.8 }));
    flame.rotation.x = Math.PI;
    flame.position.y = -0.37;
    ship.add(flame);
    const stars = new THREE.Group();
    for (let i = 0; i < 14; i++) {
      const s = new THREE.Mesh(new THREE.SphereGeometry(0.008, 6, 4), glow(0xffffff, 2));
      s.position.set(Math.sin(i * 7.1) * 0.35, 0.2 + ((i * 0.37) % 0.6), Math.cos(i * 3.3) * 0.3);
      stars.add(s);
    }
    group.add(stars);
    return {
      group,
      update(t) {
        ship.position.y = 0.46 + Math.sin(t * 1.4) * 0.03;
        ship.rotation.z = Math.sin(t * 0.7) * 0.12;
        flame.scale.y = 0.8 + Math.sin(t * 18) * 0.2;
        stars.rotation.y = t * 0.1;
      },
    };
  },

  codestack() {
    const group = new THREE.Group();
    const tex = codeSheetTexture();
    const sheet = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 });
    const sheet2 = basic(0xefeee6, { roughness: 0.9 });
    const tops = [];
    const n = 16;
    for (let i = 0; i < n; i++) {
      const h = 0.04;
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.34, h, 0.26), i % 2 ? sheet : sheet2);
      m.position.set(Math.sin(i * 1.7) * 0.012, 0.02 + i * h, Math.cos(i * 2.3) * 0.012);
      m.rotation.y = Math.sin(i * 3.1) * 0.05;
      group.add(m);
      tops.push(m);
    }
    const tiny = new THREE.Group(); // a tiny "person" for scale (silhouette)
    const mat = basic(0x8e5bd1);
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.025, 0.1, 4, 8), mat);
    body.position.y = 0.09;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.025, 10, 8), mat);
    head.position.y = 0.19;
    tiny.add(body, head);
    tiny.position.set(0.24, 0, 0.05);
    group.add(tiny);
    return { group, update(t) { tops[n - 1].rotation.y = Math.sin(t * 0.8) * 0.15; } };
  },

  spool() {
    const group = new THREE.Group();
    const spool = new THREE.Group();
    spool.position.y = 0.34;
    spool.rotation.z = Math.PI / 2;
    group.add(spool);
    const wood = basic(0x6b4a2a);
    for (const y of [-0.17, 0.17]) {
      const f = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.03, 24), wood);
      f.position.y = y;
      spool.add(f);
    }
    const core = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.32, 24), new THREE.MeshStandardMaterial({ color: 0xf1c232, metalness: 0.7, roughness: 0.25, emissive: 0x3a2800 }));
    spool.add(core);
    const fiberMat = new THREE.MeshStandardMaterial({ color: 0xffd34d, metalness: 0.6, roughness: 0.3 });
    for (let i = 0; i < 7; i++) {
      const tr = new THREE.Mesh(new THREE.TorusGeometry(0.152, 0.006, 4, 32), fiberMat);
      tr.rotation.x = Math.PI / 2;
      tr.position.y = -0.15 + i * 0.05;
      spool.add(tr);
    }
    const pts = [];
    for (let i = 0; i <= 20; i++) pts.push(new THREE.Vector3(0.15 - i * 0.01, 0.34 - i * 0.015 + Math.sin(i * 0.6) * 0.02, 0.15 + i * 0.006));
    const thread = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 20, 0.005, 4), fiberMat);
    group.add(thread);
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.05, 0.3), basic(0x2b2140));
    base.position.y = 0.025;
    group.add(base);
    for (const x of [-0.2, 0.2]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.32, 0.05), basic(0x2b2140));
      leg.position.set(x, 0.18, 0);
      group.add(leg);
    }
    return { group, update(t) { spool.rotation.x = t * 0.5; } };
  },

  crispr() {
    const group = new THREE.Group();
    standBase(group);
    const helix = new THREE.Group();
    helix.position.y = 0.1;
    group.add(helix);
    const a = basic(0xe05a9a, { roughness: 0.3 });
    const b = basic(0x5ab0e0, { roughness: 0.3 });
    const rung = basic(0xf3f0ff);
    const sg = new THREE.SphereGeometry(0.024, 10, 8);
    const steps = 14;
    for (let i = 0; i < steps; i++) {
      const y = i * 0.045;
      const ang = i * 0.55;
      const r = 0.11;
      const p1 = new THREE.Mesh(sg, a);
      p1.position.set(Math.cos(ang) * r, y, Math.sin(ang) * r);
      const p2 = new THREE.Mesh(sg, b);
      p2.position.set(-Math.cos(ang) * r, y, -Math.sin(ang) * r);
      helix.add(p1, p2);
      if (i === 7) continue; // the "cut"
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, r * 2, 6), rung);
      bar.position.set(0, y, 0);
      bar.rotation.z = Math.PI / 2;
      bar.rotation.y = -ang;
      helix.add(bar);
    }
    // scissors
    const sc = new THREE.Group();
    const steel = new THREE.MeshStandardMaterial({ color: 0xdfe4ea, metalness: 0.9, roughness: 0.2 });
    const handle = new THREE.MeshStandardMaterial({ color: 0x8e5bd1, roughness: 0.4 });
    const bladeA = new THREE.Group();
    const bladeB = new THREE.Group();
    for (const [blade, s] of [[bladeA, 1], [bladeB, -1]]) {
      const bl = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.012, 0.02), steel);
      bl.position.x = 0.08;
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.008, 6, 16), handle);
      ring.position.set(-0.05, s * 0.025, 0);
      blade.add(bl, ring);
      sc.add(blade);
    }
    const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.04, 8), steel);
    pin.rotation.x = Math.PI / 2;
    sc.add(pin);
    sc.position.set(-0.26, 0.42, 0.04);
    group.add(sc);
    return {
      group,
      update(t) {
        helix.rotation.y = t * 0.5;
        const o = 0.15 + Math.abs(Math.sin(t * 2)) * 0.25;
        bladeA.rotation.z = o;
        bladeB.rotation.z = -o;
      },
    };
  },

  saddle() {
    const group = new THREE.Group();
    standBase(group);
    const fn = (u, v, target) => {
      const x = (u - 0.5) * 0.6, z = (v - 0.5) * 0.6;
      target.set(x, (x * x - z * z) * 1.4, z);
    };
    const geo = new ParametricGeometry(fn, 24, 24);
    const surf = new THREE.Mesh(
      geo,
      new THREE.MeshStandardMaterial({ color: 0x8e5bd1, roughness: 0.35, metalness: 0.2, side: THREE.DoubleSide, transparent: true, opacity: 0.9 })
    );
    const lines = new THREE.LineSegments(
      new THREE.WireframeGeometry(new ParametricGeometry(fn, 8, 8)),
      new THREE.LineBasicMaterial({ color: 0xffe08a })
    );
    const holder = new THREE.Group();
    holder.position.y = 0.42;
    holder.add(surf, lines);
    // a geodesic-like curve drawn on the surface
    const pts = [];
    for (let i = 0; i <= 40; i++) {
      const u = i / 40;
      const v = 0.5 + Math.sin(u * Math.PI * 2) * 0.3;
      const p = new THREE.Vector3();
      fn(u, v, p);
      p.y += 0.006;
      pts.push(p);
    }
    holder.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.006, 4), glow(0xffffff, 1.5)));
    group.add(holder);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.4), basic(0x2b2140));
    post.position.y = 0.22;
    group.add(post);
    return { group, update(t) { holder.rotation.y = t * 0.35; } };
  },
};

export function buildExhibitObject(kind) {
  const b = builders[kind] || builders.atom;
  return b();
}

export const EXHIBIT_KINDS = Object.keys(builders);
