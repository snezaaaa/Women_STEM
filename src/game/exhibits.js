import * as THREE from 'three';
import { ParametricGeometry } from 'three/examples/jsm/geometries/ParametricGeometry.js';
import { punchCardTexture, xrayTexture, chalkboardTexture, codeSheetTexture } from './textures.js';

// Each builder returns { group, update(time) }. Objects are low-poly dioramas that fit
// inside a ~0.9 m glass case, rest on y = 0 and are centred on x/z.

const brass = () => new THREE.MeshStandardMaterial({ color: 0xc9a043, metalness: 0.85, roughness: 0.3 });
const glow = (c, i = 1.4) => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: i, roughness: 0.4 });
const basic = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.6, ...o });

function add(parent, geo, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

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

function standBase(group, r = 0.22, color = 0xe6ddcc) {
  return add(group, new THREE.CylinderGeometry(r, r * 1.1, 0.05, 20), basic(color, { roughness: 0.4 }), 0, 0.025, 0);
}

/** Periodic-table style tile: symbol + atomic number. */
function elementTile(symbol, number, color = '#8e5bd1') {
  const tex = canvasTex(128, 150, (g, w, h) => {
    g.fillStyle = '#fbf7ff';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = color;
    g.lineWidth = 10;
    g.strokeRect(5, 5, w - 10, h - 10);
    g.fillStyle = color;
    g.textAlign = 'center';
    g.font = '700 26px system-ui, sans-serif';
    g.fillText(String(number), w / 2, 40);
    g.font = '700 64px Georgia, serif';
    g.fillText(symbol, w / 2, 112);
  });
  const mats = [basic(0xe9e2f5), basic(0xe9e2f5), basic(0xe9e2f5), basic(0xe9e2f5), new THREE.MeshStandardMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.35 }), basic(0xe9e2f5)];
  return new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, 0.02), mats);
}

/** An open book whose pages show a drawing. */
function openBook(drawPages, w = 0.34, d = 0.24) {
  const g = new THREE.Group();
  const tex = canvasTex(512, 360, (c, W, H) => {
    c.fillStyle = '#f6efdc';
    c.fillRect(0, 0, W, H);
    c.fillStyle = 'rgba(0,0,0,0.12)';
    c.fillRect(W / 2 - 3, 0, 6, H);
    drawPages(c, W, H);
  });
  add(g, new THREE.BoxGeometry(w + 0.03, 0.02, d + 0.02), basic(0x5b2d1c), 0, 0.01, 0);
  for (const s of [-1, 1]) {
    const page = add(g, new THREE.BoxGeometry(w / 2, 0.02, d), basic(0xf6efdc), (s * w) / 4, 0.03, 0);
    page.rotation.z = -s * 0.08;
  }
  const top = add(g, new THREE.PlaneGeometry(w, d), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 }), 0, 0.047, 0);
  top.rotation.x = -Math.PI / 2;
  return g;
}

function helix(parent, { turns = 14, r = 0.09, step = 0.04, colA = 0xe05a9a, colB = 0x5ab0e0, cutAt = -1, sphere = 0.02 } = {}) {
  const h = new THREE.Group();
  parent.add(h);
  const a = basic(colA, { roughness: 0.3 });
  const b = basic(colB, { roughness: 0.3 });
  const rung = basic(0xf3f0ff);
  const sg = new THREE.SphereGeometry(sphere, 10, 8);
  for (let i = 0; i < turns; i++) {
    const y = i * step;
    const ang = i * 0.55;
    add(h, sg, a, Math.cos(ang) * r, y, Math.sin(ang) * r);
    add(h, sg, b, -Math.cos(ang) * r, y, -Math.sin(ang) * r);
    if (i === cutAt) continue;
    const bar = add(h, new THREE.CylinderGeometry(0.007, 0.007, r * 2, 6), rung, 0, y, 0);
    bar.rotation.z = Math.PI / 2;
    bar.rotation.y = -ang;
  }
  return h;
}

function earthTexture() {
  return canvasTex(256, 128, (g, w, h) => {
    g.fillStyle = '#2f74c9';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#4fae5b';
    const blobs = [[40, 40, 26, 18], [70, 75, 14, 26], [130, 38, 30, 16], [150, 70, 18, 22], [205, 50, 26, 20], [215, 95, 14, 10], [100, 110, 40, 6]];
    for (const [x, y, rx, ry] of blobs) { g.beginPath(); g.ellipse(x, y, rx, ry, 0.3, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = '#ffffff';
    g.fillRect(0, 0, w, 7);
    g.fillRect(0, h - 7, w, 7);
  });
}

function textPlate(text, w = 0.3, h = 0.09, color = '#3a1f63') {
  const tex = canvasTex(512, Math.round((512 * h) / w), (g, W, H) => {
    g.fillStyle = '#fbf6e8';
    g.fillRect(0, 0, W, H);
    g.strokeStyle = '#c8962e';
    g.lineWidth = 8;
    g.strokeRect(4, 4, W - 8, H - 8);
    g.fillStyle = color;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = `italic 700 ${Math.round(H * 0.55)}px Georgia, serif`;
    g.fillText(text, W / 2, H / 2 + 2);
  });
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8 }));
}

const builders = {
  // Ada Lovelace – a miniature Analytical Engine fed by a chain of punched cards
  punchcard() {
    const group = new THREE.Group();
    add(group, new THREE.BoxGeometry(0.66, 0.04, 0.4), basic(0x5b3a22), 0, 0.02, 0);
    const b = brass();
    const steel = basic(0x9aa3ad, { metalness: 0.8, roughness: 0.35 });
    const gears = [];
    const gg = gearGeometry(0.075, 0.012, 10, 0.022);
    [-0.2, -0.05, 0.1].forEach((x, ci) => {
      add(group, new THREE.CylinderGeometry(0.008, 0.008, 0.5), steel, x, 0.29, -0.08);
      for (let k = 0; k < 5; k++) {
        const g = add(group, gg, b, x, 0.1 + k * 0.09, -0.08);
        g.rotation.x = Math.PI / 2;
        gears.push({ g, dir: (ci + k) % 2 ? 1 : -1 });
      }
    });
    // frame
    for (const x of [-0.29, 0.19]) add(group, new THREE.BoxGeometry(0.02, 0.52, 0.02), steel, x, 0.3, -0.08);
    add(group, new THREE.BoxGeometry(0.5, 0.02, 0.06), steel, -0.05, 0.56, -0.08);
    // crank
    const crank = new THREE.Group();
    crank.position.set(0.25, 0.32, -0.08);
    group.add(crank);
    add(crank, new THREE.BoxGeometry(0.1, 0.015, 0.015), steel, 0.05, 0, 0);
    add(crank, new THREE.CylinderGeometry(0.012, 0.012, 0.06), basic(0x5b3a22), 0.1, 0, 0.03).rotation.x = Math.PI / 2;
    // chain of punched cards hanging in front
    const cardTex = punchCardTexture();
    const cardMat = new THREE.MeshStandardMaterial({ map: cardTex, roughness: 0.8, side: THREE.DoubleSide });
    for (let i = 0; i < 5; i++) {
      const c = add(group, new THREE.PlaneGeometry(0.26, 0.09), cardMat, -0.05, 0.43 - i * 0.075, 0.07 + (i % 2) * 0.03);
      c.rotation.x = i % 2 ? 0.45 : -0.45;
    }
    add(group, new THREE.CylinderGeometry(0.01, 0.01, 0.32), steel, -0.05, 0.47, 0.07).rotation.z = Math.PI / 2;
    // little "Note G" plate
    const note = textPlate('Note G · 1843', 0.2, 0.05);
    note.position.set(0.17, 0.05, 0.17);
    note.rotation.x = -0.6;
    group.add(note);
    return {
      group,
      update(t) {
        gears.forEach(({ g, dir }) => (g.rotation.z = t * 0.8 * dir));
        crank.rotation.x = t * 0.8;
      },
    };
  },

  // Marie Curie – glowing radium-green vial, test tubes, element tiles and her notebook
  vial() {
    const group = new THREE.Group();
    add(group, new THREE.BoxGeometry(0.62, 0.03, 0.34), basic(0x6b4a2a), 0, 0.015, 0);
    const glass = new THREE.MeshStandardMaterial({ color: 0xddffee, transparent: true, opacity: 0.25, roughness: 0.05, side: THREE.DoubleSide });
    const liquidMat = glow(0x5dff7a, 1.6);
    liquidMat.transparent = true;
    liquidMat.opacity = 0.9;
    // main vial
    const v = new THREE.Group();
    v.position.set(-0.05, 0.03, 0);
    group.add(v);
    add(v, new THREE.CylinderGeometry(0.08, 0.08, 0.4, 20, 1, true), glass, 0, 0.24, 0);
    add(v, new THREE.SphereGeometry(0.08, 16, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), glass, 0, 0.04, 0);
    add(v, new THREE.CylinderGeometry(0.07, 0.07, 0.22, 20), liquidMat, 0, 0.15, 0);
    add(v, new THREE.SphereGeometry(0.07, 14, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), liquidMat, 0, 0.04, 0);
    add(v, new THREE.CylinderGeometry(0.065, 0.06, 0.05, 12), basic(0x9b6b3d), 0, 0.46, 0);
    const halo = add(v, new THREE.SphereGeometry(0.17, 16, 12), new THREE.MeshBasicMaterial({ color: 0x5dff7a, transparent: true, opacity: 0.12, depthWrite: false }), 0, 0.18, 0);
    const bubbles = [];
    for (let i = 0; i < 6; i++) bubbles.push(add(v, new THREE.SphereGeometry(0.012, 8, 6), glow(0xc8ffcf, 2)));
    // rack with two small test tubes
    const rack = add(group, new THREE.BoxGeometry(0.2, 0.03, 0.08), basic(0x8a5d33), 0.19, 0.14, -0.04);
    void rack;
    for (const [x, col] of [[0.14, 0x7fe0ff], [0.24, 0xffd36e]]) {
      add(group, new THREE.CylinderGeometry(0.022, 0.022, 0.2, 12, 1, true), glass, x, 0.17, -0.04);
      add(group, new THREE.CylinderGeometry(0.019, 0.019, 0.09, 12), glow(col, 0.6), x, 0.11, -0.04);
    }
    for (const x of [0.1, 0.28]) add(group, new THREE.BoxGeometry(0.015, 0.13, 0.06), basic(0x8a5d33), x, 0.08, -0.04);
    // element tiles she discovered
    const ra = elementTile('Ra', 88, '#2f9e55');
    const po = elementTile('Po', 84, '#8e5bd1');
    ra.position.set(0.12, 0.5, -0.1);
    po.position.set(0.27, 0.42, -0.06);
    group.add(ra, po);
    // her notebook
    const book = openBook((g, W, H) => {
      g.fillStyle = '#4b3a2a';
      g.font = 'italic 30px Georgia, serif';
      g.fillText('Radioactivité', 30, 60);
      g.font = 'italic 24px Georgia, serif';
      for (let i = 0; i < 6; i++) g.fillRect(30, 100 + i * 38, 180 + (i % 3) * 20, 3);
      g.fillText('Po  Ra', 300, 80);
      g.strokeStyle = '#4b3a2a';
      g.lineWidth = 3;
      g.beginPath();
      for (let x = 0; x < 180; x++) g.lineTo(290 + x, 300 - Math.sqrt(x) * 13);
      g.stroke();
    }, 0.26, 0.16);
    book.position.set(0.15, 0.03, 0.1);
    book.rotation.y = -0.3;
    group.add(book);
    return {
      group,
      update(t) {
        bubbles.forEach((b, i) => {
          const p = (t * 0.25 + i / 6) % 1;
          b.position.set(Math.sin(i * 2.1) * 0.035, 0.05 + p * 0.22, Math.cos(i * 1.7) * 0.035);
        });
        liquidMat.emissiveIntensity = 1.3 + Math.sin(t * 2.5) * 0.4;
        halo.material.opacity = 0.1 + Math.sin(t * 2.5) * 0.04;
        ra.rotation.y = Math.sin(t * 0.8) * 0.4;
        po.rotation.y = Math.sin(t * 0.8 + 1) * 0.4;
        ra.position.y = 0.5 + Math.sin(t * 1.3) * 0.015;
        po.position.y = 0.42 + Math.sin(t * 1.3 + 1) * 0.015;
      },
    };
  },

  // Mileva Marić – physics notebook with E = mc², an atom and two pens (two students)
  atom() {
    const group = new THREE.Group();
    const book = openBook((g, W) => {
      g.fillStyle = '#2b2140';
      g.font = 'italic 700 60px Georgia, serif';
      g.fillText('E = mc²', 300, 120);
      g.font = 'italic 26px Georgia, serif';
      g.fillText('Zürich 1896', 30, 60);
      g.fillText('Physik', 30, 110);
      g.fillStyle = 'rgba(43,33,64,0.6)';
      for (let i = 0; i < 6; i++) g.fillRect(30, 150 + i * 32, 170 + (i % 2) * 30, 3);
      for (let i = 0; i < 4; i++) g.fillRect(290, 180 + i * 32, 180 - (i % 2) * 40, 3);
      g.strokeStyle = '#8e5bd1';
      g.lineWidth = 4;
      g.beginPath();
      g.arc(W * 0.75, 300, 30, 0, Math.PI * 2);
      g.stroke();
    }, 0.42, 0.28);
    book.position.set(0, 0.0, 0.1);
    book.rotation.x = 0.08;
    group.add(book);
    for (const [x, c] of [[-0.14, 0x8e5bd1], [-0.1, 0x3b6fd8]]) {
      const pen = add(group, new THREE.CylinderGeometry(0.007, 0.007, 0.16, 8), basic(c), x, 0.06, 0.2);
      pen.rotation.z = Math.PI / 2;
      pen.rotation.y = 0.3;
    }
    // atom floating above
    const core = new THREE.Group();
    core.position.set(0, 0.48, -0.05);
    group.add(core);
    for (let i = 0; i < 7; i++) {
      add(core, new THREE.SphereGeometry(0.035, 12, 10), basic(i % 2 ? 0xe2584f : 0x5b8fe0, { roughness: 0.3 }), Math.sin(i * 2.4) * 0.03, Math.cos(i * 1.3) * 0.03, Math.sin(i * 3.1) * 0.03);
    }
    const ringMat = new THREE.MeshStandardMaterial({ color: 0xffd36e, metalness: 0.6, roughness: 0.3, emissive: 0x553b00 });
    const rings = [];
    for (let i = 0; i < 3; i++) {
      const holder = new THREE.Group();
      holder.rotation.y = (i * Math.PI) / 3;
      holder.rotation.x = Math.PI / 2 + (i - 1) * 0.9;
      add(holder, new THREE.TorusGeometry(0.24, 0.006, 6, 56), ringMat);
      const e = add(holder, new THREE.SphereGeometry(0.025, 12, 8), glow(0x9fe8ff, 2));
      core.add(holder);
      rings.push({ e, phase: i * 2.1 });
    }
    add(group, new THREE.CylinderGeometry(0.01, 0.01, 0.2), basic(0xe6ddcc), 0, 0.17, -0.05);
    standBase(group, 0.08).position.set(0, 0.025, -0.05);
    return {
      group,
      update(t) {
        core.rotation.y = t * 0.3;
        rings.forEach((r, i) => {
          const a = t * (1.6 + i * 0.3) + r.phase;
          r.e.position.set(Math.cos(a) * 0.24, Math.sin(a) * 0.24, 0);
        });
      },
    };
  },

  // Rosalind Franklin – X-ray tube shining on Photo 51, beside the double helix it revealed
  xray() {
    const group = new THREE.Group();
    standBase(group, 0.3);
    const frameMat = basic(0x22202a, { metalness: 0.4 });
    const holder = new THREE.Group();
    holder.position.set(-0.12, 0, -0.02);
    holder.rotation.y = 0.25;
    group.add(holder);
    add(holder, new THREE.BoxGeometry(0.36, 0.46, 0.025), frameMat, 0, 0.36, 0);
    const xtex = xrayTexture();
    const film = add(holder, new THREE.PlaneGeometry(0.32, 0.41), new THREE.MeshStandardMaterial({ map: xtex, emissive: 0xffffff, emissiveMap: xtex, emissiveIntensity: 0.9 }), 0, 0.36, 0.014);
    add(holder, new THREE.CylinderGeometry(0.012, 0.012, 0.12), frameMat, 0, 0.09, 0);
    const label = textPlate('Photo 51 · 1952', 0.26, 0.05);
    label.position.set(0, 0.1, 0.02);
    holder.add(label);
    // X-ray tube with beam
    const tube = add(group, new THREE.CylinderGeometry(0.035, 0.035, 0.14, 14), basic(0x9aa3ad, { metalness: 0.7, roughness: 0.3 }), -0.05, 0.36, 0.27);
    tube.rotation.x = Math.PI / 2;
    tube.rotation.z = 0.25;
    const beam = add(group, new THREE.CylinderGeometry(0.005, 0.04, 0.22, 12, 1, true), new THREE.MeshBasicMaterial({ color: 0xbfe2ff, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending }), -0.09, 0.36, 0.12);
    beam.rotation.x = Math.PI / 2;
    beam.rotation.z = 0.25;
    // the double helix
    const h = helix(group, { turns: 13, r: 0.06, step: 0.045, sphere: 0.017 });
    h.position.set(0.2, 0.08, 0.02);
    return {
      group,
      update(t) {
        film.material.emissiveIntensity = 0.75 + Math.sin(t * 1.5) * 0.15;
        beam.material.opacity = 0.25 + Math.abs(Math.sin(t * 3)) * 0.25;
        h.rotation.y = t * 0.6;
      },
    };
  },

  // Lise Meitner – a uranium nucleus (protons + neutrons) splitting in two, with energy flash
  fission() {
    const group = new THREE.Group();
    standBase(group, 0.3);
    const protonMat = basic(0xe2584f, { roughness: 0.35, emissive: 0x3a0a05 });
    const neutronMat = basic(0xb9c2cf, { roughness: 0.35 });
    const sg = new THREE.SphereGeometry(0.032, 12, 10);
    const makeCluster = (n, seed) => {
      const g = new THREE.Group();
      for (let i = 0; i < n; i++) {
        const phi = Math.acos(1 - (2 * (i + 0.5)) / n), th = Math.PI * (1 + Math.sqrt(5)) * i + seed;
        const r = 0.055 * Math.cbrt((i + 1) / n) + 0.01;
        add(g, sg, i % 2 ? protonMat : neutronMat, r * Math.sin(phi) * Math.cos(th), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(th));
      }
      return g;
    };
    const a = makeCluster(12, 0.3);
    const b = makeCluster(11, 1.7);
    group.add(a, b);
    const incoming = add(group, new THREE.SphereGeometry(0.028, 10, 8), glow(0x9fe8ff, 2));
    const out1 = add(group, new THREE.SphereGeometry(0.022, 10, 8), glow(0x9fe8ff, 2));
    const out2 = out1.clone();
    group.add(out2);
    const flash = add(group, new THREE.SphereGeometry(0.22, 16, 10), new THREE.MeshBasicMaterial({ color: 0xffe2a8, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }), 0, 0.4, 0);
    const tile = elementTile('Mt', 109, '#c8962e');
    tile.position.set(0.24, 0.12, 0.18);
    tile.rotation.x = -0.3;
    group.add(tile);
    const label = textPlate('U → Ba + Kr + energy', 0.34, 0.06);
    label.position.set(-0.08, 0.07, 0.24);
    label.rotation.x = -0.7;
    group.add(label);
    return {
      group,
      update(t) {
        const p = (t * 0.3) % 1;
        // 0–0.3: neutron flies in; 0.3: split; 0.3–1: halves drift apart
        incoming.visible = p < 0.3;
        incoming.position.set(-0.35 + (p / 0.3) * 0.33, 0.4, 0);
        const sep = p < 0.3 ? 0.0 : Math.min(0.2, (p - 0.3) * 0.45);
        const wobble = p < 0.3 ? Math.sin(t * 25) * 0.004 * (p / 0.3) : 0;
        a.position.set(-0.04 - sep + wobble, 0.4, 0);
        b.position.set(0.04 + sep - wobble, 0.4, 0);
        a.rotation.y = b.rotation.y = t * 0.4;
        out1.visible = out2.visible = p > 0.3;
        out1.position.set(0, 0.4 + (p - 0.3) * 0.5, (p - 0.3) * 0.4);
        out2.position.set(0, 0.4 - (p - 0.3) * 0.4, -(p - 0.3) * 0.4);
        flash.material.opacity = p > 0.28 && p < 0.45 ? 0.7 * (1 - (p - 0.28) / 0.17) : 0;
        flash.scale.setScalar(0.5 + Math.max(0, p - 0.28) * 4);
      },
    };
  },

  // Hedy Lamarr – piano keys (her inspiration), a torpedo, a film reel and hopping radio signals
  piano() {
    const group = new THREE.Group();
    const kb = new THREE.Group();
    kb.position.set(0, 0, 0.12);
    group.add(kb);
    add(kb, new THREE.BoxGeometry(0.6, 0.08, 0.2), basic(0x1b1420, { roughness: 0.3 }), 0, 0.04, 0);
    const keys = [];
    const white = basic(0xfaf8f2, { roughness: 0.3 });
    const hot = glow(0xffd36e, 0.9);
    const black = basic(0x111111, { roughness: 0.3 });
    for (let i = 0; i < 10; i++) {
      keys.push(add(kb, new THREE.BoxGeometry(0.052, 0.025, 0.14), white, -0.26 + i * 0.058, 0.093, 0.02));
      if ([0, 1, 3, 4, 5, 7, 8].includes(i)) add(kb, new THREE.BoxGeometry(0.03, 0.025, 0.08), black, -0.26 + i * 0.058 + 0.029, 0.11, -0.01);
    }
    // frequency-hopping display behind the keys
    const screen = new THREE.Group();
    screen.position.set(-0.08, 0.3, -0.12);
    group.add(screen);
    add(screen, new THREE.BoxGeometry(0.36, 0.22, 0.03), basic(0x1b1426), 0, 0, 0);
    const bars = [];
    const dim = basic(0x3a2f4a);
    for (let i = 0; i < 8; i++) {
      bars.push(add(screen, new THREE.BoxGeometry(0.028, 0.15, 0.01), dim, -0.14 + i * 0.04, 0, 0.02));
    }
    add(group, new THREE.CylinderGeometry(0.01, 0.01, 0.2), basic(0xe6ddcc), -0.08, 0.1, -0.12);
    standBase(group, 0.07).position.set(-0.08, 0.025, -0.12);
    // torpedo
    const torp = new THREE.Group();
    torp.position.set(0.18, 0.5, -0.08);
    group.add(torp);
    const tb = add(torp, new THREE.CapsuleGeometry(0.035, 0.2, 6, 12), basic(0x6f7a86, { metalness: 0.6, roughness: 0.35 }));
    tb.rotation.z = Math.PI / 2;
    for (let i = 0; i < 4; i++) {
      const fin = add(torp, new THREE.BoxGeometry(0.05, 0.005, 0.06), basic(0x4a5560), -0.13, 0, 0);
      fin.rotation.x = (i * Math.PI) / 2;
    }
    const ant = add(torp, new THREE.CylinderGeometry(0.003, 0.003, 0.07), basic(0xcccccc), 0.02, 0.06, 0);
    void ant;
    const waves = [];
    for (let i = 0; i < 3; i++) {
      const w = add(group, new THREE.TorusGeometry(0.05 + i * 0.04, 0.005, 6, 32, Math.PI * 0.6), new THREE.MeshBasicMaterial({ color: 0x9fd4ff, transparent: true, opacity: 0.8, depthWrite: false }), 0.2, 0.57, -0.08);
      w.rotation.z = Math.PI * 0.2;
      waves.push(w);
    }
    // film reel (Hollywood star)
    const reel = new THREE.Group();
    reel.position.set(0.27, 0.2, 0.0);
    reel.rotation.y = -0.6;
    group.add(reel);
    const reelMat = basic(0x2b2b33, { metalness: 0.6, roughness: 0.3 });
    const disc = add(reel, new THREE.CylinderGeometry(0.08, 0.08, 0.012, 24), reelMat);
    disc.rotation.x = Math.PI / 2;
    for (let i = 0; i < 5; i++) {
      const hole = add(reel, new THREE.CylinderGeometry(0.018, 0.018, 0.014, 10), basic(0x111111), Math.cos((i / 5) * Math.PI * 2) * 0.045, Math.sin((i / 5) * Math.PI * 2) * 0.045, 0.001);
      hole.rotation.x = Math.PI / 2;
    }
    add(group, new THREE.BoxGeometry(0.02, 0.12, 0.02), basic(0xe6ddcc), 0.27, 0.06, 0.0);
    return {
      group,
      update(t) {
        const hop = Math.floor(t * 3);
        const pattern = [2, 6, 0, 4, 7, 1, 5, 3];
        const lit = pattern[hop % 8];
        bars.forEach((b, i) => { b.material = i === lit ? hot : dim; b.scale.y = i === lit ? 1 : 0.35; b.position.y = i === lit ? 0 : -0.05; });
        keys.forEach((k, i) => { k.material = i === (lit + 1) % 10 ? hot : white; });
        torp.position.y = 0.5 + Math.sin(t) * 0.02;
        waves.forEach((w, i) => {
          const p = (t * 0.6 + i / 3) % 1;
          w.scale.setScalar(0.6 + p * 1.2);
          w.material.opacity = 0.9 * (1 - p);
        });
        reel.rotation.z = t * 0.8;
      },
    };
  },

  // Katherine Johnson – Earth with a capsule following her calculated orbit, plus her chalkboard
  chalkboard() {
    const group = new THREE.Group();
    // small chalkboard behind
    const board = new THREE.Group();
    board.position.set(-0.16, 0, -0.16);
    board.rotation.y = 0.35;
    group.add(board);
    const wood = basic(0x7a5230);
    add(board, new THREE.BoxGeometry(0.42, 0.32, 0.02), wood, 0, 0.44, 0);
    add(board, new THREE.PlaneGeometry(0.38, 0.28), new THREE.MeshStandardMaterial({ map: chalkboardTexture(), roughness: 0.9 }), 0, 0.44, 0.011);
    for (const x of [-0.17, 0.17]) add(board, new THREE.BoxGeometry(0.02, 0.3, 0.02), wood, x, 0.15, 0);
    // Earth + orbit
    standBase(group, 0.12).position.set(0.1, 0.025, 0.06);
    add(group, new THREE.CylinderGeometry(0.01, 0.01, 0.2), basic(0xe6ddcc), 0.1, 0.12, 0.06);
    const sys = new THREE.Group();
    sys.position.set(0.1, 0.36, 0.06);
    group.add(sys);
    const earth = add(sys, new THREE.SphereGeometry(0.15, 28, 18), new THREE.MeshStandardMaterial({ map: earthTexture(), roughness: 0.7 }));
    const tilt = new THREE.Group();
    tilt.rotation.x = 0.45;
    tilt.rotation.z = 0.2;
    sys.add(tilt);
    const orbitR = 0.26;
    const dots = [];
    for (let i = 0; i < 28; i++) {
      const a = (i / 28) * Math.PI * 2;
      dots.push(add(tilt, new THREE.SphereGeometry(0.005, 6, 4), glow(0xffffff, 1.5), Math.cos(a) * orbitR, 0, Math.sin(a) * orbitR * 0.85));
    }
    const cap = new THREE.Group();
    tilt.add(cap);
    add(cap, new THREE.ConeGeometry(0.025, 0.04, 12), basic(0xd9d6cf, { metalness: 0.5, roughness: 0.35 }));
    add(cap, new THREE.SphereGeometry(0.01, 8, 6), glow(0xffa24a, 2), 0, -0.025, 0);
    // pencil + paper with calculations
    const paper = add(group, new THREE.PlaneGeometry(0.16, 0.2), new THREE.MeshStandardMaterial({ map: codeSheetTexture(), roughness: 0.9 }), -0.18, 0.003, 0.17);
    paper.rotation.x = -Math.PI / 2;
    paper.rotation.z = 0.3;
    const pencil = add(group, new THREE.CylinderGeometry(0.006, 0.006, 0.14, 6), basic(0xf2c14e), -0.12, 0.01, 0.2);
    pencil.rotation.z = Math.PI / 2;
    pencil.rotation.y = 0.6;
    return {
      group,
      update(t) {
        earth.rotation.y = t * 0.3;
        const a = t * 0.9;
        cap.position.set(Math.cos(a) * orbitR, 0, Math.sin(a) * orbitR * 0.85);
        cap.rotation.y = -a;
        cap.rotation.z = -Math.PI / 2;
      },
    };
  },

  // Valentina Tereshkova – Vostok capsule above Earth, a parachute and a seagull ("Chaika")
  capsule() {
    const group = new THREE.Group();
    // Earth's curved horizon
    const earth = add(group, new THREE.SphereGeometry(0.3, 32, 16, 0, Math.PI * 2, 0, 0.9), new THREE.MeshStandardMaterial({ map: earthTexture(), roughness: 0.7 }), 0, -0.17, 0);
    const atm = add(group, new THREE.SphereGeometry(0.315, 32, 16, 0, Math.PI * 2, 0, 0.9), new THREE.MeshBasicMaterial({ color: 0x7fc4ff, transparent: true, opacity: 0.18, depthWrite: false }), 0, -0.17, 0);
    void atm;
    const ship = new THREE.Group();
    group.add(ship);
    add(ship, new THREE.SphereGeometry(0.075, 20, 14), basic(0xd9d6cf, { metalness: 0.5, roughness: 0.35 }));
    add(ship, new THREE.CylinderGeometry(0.05, 0.09, 0.1, 16), basic(0x9aa0a6, { metalness: 0.6, roughness: 0.4 }), 0, -0.11, 0);
    add(ship, new THREE.CircleGeometry(0.022, 12), glow(0x7fd0ff, 1.2), 0, 0.01, 0.075);
    const ant = add(ship, new THREE.CylinderGeometry(0.003, 0.003, 0.1), basic(0xcccccc), 0.03, 0.1, 0);
    ant.rotation.z = -0.3;
    const label = textPlate('Vostok 6 · 1963', 0.22, 0.05);
    label.position.set(-0.12, 0.08, 0.27);
    label.rotation.x = -0.6;
    group.add(label);
    // parachute with a tiny cosmonaut
    const chute = new THREE.Group();
    group.add(chute);
    const canopyTex = canvasTex(128, 64, (g, w, h) => { for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#ffffff' : '#ff7a3d'; g.fillRect((i * w) / 8, 0, w / 8, h); } });
    add(chute, new THREE.SphereGeometry(0.075, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ map: canopyTex, side: THREE.DoubleSide, roughness: 0.8 }), 0, 0.08, 0);
    const lineMat = new THREE.LineBasicMaterial({ color: 0xeeeeee });
    const pts = [];
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; pts.push(new THREE.Vector3(Math.cos(a) * 0.075, 0.08, Math.sin(a) * 0.075), new THREE.Vector3(0, -0.02, 0)); }
    chute.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), lineMat));
    add(chute, new THREE.CapsuleGeometry(0.012, 0.03, 4, 8), basic(0xff7a3d), 0, -0.04, 0);
    // seagull
    const gull = new THREE.Group();
    group.add(gull);
    const wingMat = basic(0xffffff, { side: THREE.DoubleSide });
    const wingGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.07, 0.02, -0.01), new THREE.Vector3(0.0, 0, 0.025)]);
    wingGeo.computeVertexNormals();
    const wl = new THREE.Mesh(wingGeo, wingMat);
    const wr = wl.clone();
    wr.scale.x = -1;
    gull.add(wl, wr);
    add(gull, new THREE.CapsuleGeometry(0.008, 0.03, 4, 6), wingMat).rotation.x = Math.PI / 2;
    const stars = new THREE.Group();
    for (let i = 0; i < 14; i++) add(stars, new THREE.SphereGeometry(0.007, 6, 4), glow(0xffffff, 2), Math.sin(i * 7.1) * 0.38, 0.3 + ((i * 0.37) % 0.45), Math.cos(i * 3.3) * 0.3);
    group.add(stars);
    return {
      group,
      update(t) {
        const a = t * 0.5;
        ship.position.set(Math.cos(a) * 0.2, 0.42 + Math.sin(a * 2) * 0.02, Math.sin(a) * 0.12 - 0.04);
        ship.rotation.set(0, -a, 0.3);
        const d = (t * 0.12) % 1;
        chute.position.set(0.24, 0.6 - d * 0.42, 0.14);
        chute.rotation.z = Math.sin(t * 1.5) * 0.15;
        chute.visible = d < 0.95;
        const g = t * 0.9 + 2;
        gull.position.set(Math.cos(g) * 0.28, 0.32 + Math.sin(t * 2) * 0.02, Math.sin(g) * 0.2);
        gull.rotation.y = -g;
        const flap = Math.sin(t * 9) * 0.5;
        wl.rotation.z = flap;
        wr.rotation.z = -flap;
        earth.rotation.y = t * 0.05;
      },
    };
  },

  // Margaret Hamilton – her tall stack of code next to the Apollo lunar module on the Moon
  codestack() {
    const group = new THREE.Group();
    const sheet = new THREE.MeshStandardMaterial({ map: codeSheetTexture(), roughness: 0.9 });
    const sheet2 = basic(0xefeee6, { roughness: 0.9 });
    const n = 15;
    const top = [];
    for (let i = 0; i < n; i++) {
      const m = add(group, new THREE.BoxGeometry(0.2, 0.04, 0.16), i % 2 ? sheet : sheet2, -0.18 + Math.sin(i * 1.7) * 0.008, 0.02 + i * 0.04, -0.04 + Math.cos(i * 2.3) * 0.008);
      m.rotation.y = Math.sin(i * 3.1) * 0.05;
      top.push(m);
    }
    // tiny programmer for scale (as tall as the stack)
    const mat = basic(0x8e5bd1);
    add(group, new THREE.CapsuleGeometry(0.025, 0.42, 4, 8), mat, -0.03, 0.26, -0.04);
    add(group, new THREE.SphereGeometry(0.035, 12, 8), mat, -0.03, 0.54, -0.04);
    // Moon surface patch
    const moonMat = basic(0x9c9a96, { roughness: 1 });
    add(group, new THREE.CylinderGeometry(0.2, 0.22, 0.04, 24), moonMat, 0.17, 0.02, 0.07);
    for (const [x, z, r] of [[0.08, 0.15, 0.03], [0.26, 0.0, 0.025], [0.25, 0.17, 0.02]]) {
      const c = add(group, new THREE.TorusGeometry(r, 0.006, 6, 16), basic(0x7d7b77, { roughness: 1 }), x, 0.041, z);
      c.rotation.x = Math.PI / 2;
    }
    // Lunar module
    const lm = new THREE.Group();
    lm.position.set(0.17, 0.04, 0.05);
    group.add(lm);
    const foil = new THREE.MeshStandardMaterial({ color: 0xd8a93a, metalness: 0.9, roughness: 0.35, emissive: 0x2a1c00 });
    add(lm, new THREE.CylinderGeometry(0.08, 0.08, 0.08, 8), foil, 0, 0.11, 0);
    add(lm, new THREE.BoxGeometry(0.11, 0.08, 0.1), basic(0xb9bec5, { metalness: 0.5, roughness: 0.4 }), 0, 0.19, 0);
    add(lm, new THREE.CircleGeometry(0.018, 3), basic(0x111111), 0, 0.2, 0.051).rotation.z = Math.PI / 2;
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const leg = add(lm, new THREE.CylinderGeometry(0.005, 0.005, 0.13), foil, Math.cos(a) * 0.09, 0.06, Math.sin(a) * 0.09);
      leg.rotation.z = Math.cos(a) * 0.5;
      leg.rotation.x = -Math.sin(a) * 0.5;
      add(lm, new THREE.CylinderGeometry(0.018, 0.018, 0.006, 10), foil, Math.cos(a) * 0.12, 0.003, Math.sin(a) * 0.12);
    }
    add(lm, new THREE.CylinderGeometry(0.002, 0.002, 0.08), basic(0xcccccc), 0.04, 0.27, 0);
    // flag
    add(group, new THREE.CylinderGeometry(0.003, 0.003, 0.14), basic(0xcccccc), 0.3, 0.11, 0.12);
    const flag = add(group, new THREE.PlaneGeometry(0.06, 0.04), basic(0xffffff, { side: THREE.DoubleSide }), 0.33, 0.16, 0.12);
    const label = textPlate('Apollo · 1969', 0.2, 0.05);
    label.position.set(-0.18, 0.05, 0.2);
    label.rotation.x = -0.6;
    group.add(label);
    return {
      group,
      update(t) {
        top[n - 1].rotation.y = Math.sin(t * 0.8) * 0.15;
        lm.position.y = 0.04 + Math.max(0, Math.sin(t * 0.6)) * 0.08;
        flag.rotation.y = Math.sin(t * 2) * 0.2;
      },
    };
  },

  // Stephanie Kwolek – golden Kevlar fibre on a spool, woven fabric and a protective helmet
  spool() {
    const group = new THREE.Group();
    add(group, new THREE.BoxGeometry(0.62, 0.04, 0.34), basic(0xe6ddcc), 0, 0.02, 0);
    const spool = new THREE.Group();
    spool.position.set(-0.13, 0.25, -0.02);
    spool.rotation.z = Math.PI / 2;
    group.add(spool);
    const wood = basic(0x6b4a2a);
    for (const y of [-0.12, 0.12]) add(spool, new THREE.CylinderGeometry(0.16, 0.16, 0.025, 24), wood, 0, y, 0);
    add(spool, new THREE.CylinderGeometry(0.11, 0.11, 0.23, 24), new THREE.MeshStandardMaterial({ color: 0xf1c232, metalness: 0.7, roughness: 0.25, emissive: 0x3a2800 }));
    const fiberMat = new THREE.MeshStandardMaterial({ color: 0xffd34d, metalness: 0.6, roughness: 0.3 });
    for (let i = 0; i < 6; i++) {
      const tr = add(spool, new THREE.TorusGeometry(0.112, 0.005, 4, 28), fiberMat, 0, -0.1 + i * 0.04, 0);
      tr.rotation.x = Math.PI / 2;
    }
    for (const x of [-0.27, 0.01]) add(group, new THREE.BoxGeometry(0.03, 0.24, 0.04), basic(0xe6ddcc), x, 0.14, -0.02);
    // woven Kevlar panel
    const weave = canvasTex(128, 128, (g, w, h) => {
      g.fillStyle = '#b8901f';
      g.fillRect(0, 0, w, h);
      for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
        g.fillStyle = (x + y) % 2 ? '#f2c94c' : '#d9a92c';
        g.fillRect(x * 16 + 1, y * 16 + 1, 14, 14);
      }
    });
    weave.wrapS = weave.wrapT = THREE.RepeatWrapping;
    const panel = add(group, new THREE.PlaneGeometry(0.2, 0.2), new THREE.MeshStandardMaterial({ map: weave, roughness: 0.5, metalness: 0.3, side: THREE.DoubleSide }), 0.18, 0.2, -0.1);
    panel.rotation.y = -0.4;
    // thread from spool to panel
    const pts = [];
    for (let i = 0; i <= 16; i++) pts.push(new THREE.Vector3(-0.13 + i * 0.019, 0.36 - Math.sin((i / 16) * Math.PI) * 0.06 - i * 0.004, -0.02 - i * 0.004));
    add(group, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, 0.004, 4), fiberMat);
    // protective helmet
    const helmet = new THREE.Group();
    helmet.position.set(0.17, 0.04, 0.1);
    group.add(helmet);
    const hm = new THREE.MeshStandardMaterial({ color: 0x3d4a3a, roughness: 0.55 });
    add(helmet, new THREE.SphereGeometry(0.09, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), hm);
    const brim = add(helmet, new THREE.TorusGeometry(0.09, 0.012, 6, 24), hm);
    brim.rotation.x = Math.PI / 2;
    const label = textPlate('5× stronger than steel', 0.26, 0.05);
    label.position.set(-0.13, 0.05, 0.18);
    label.rotation.x = -0.6;
    group.add(label);
    return { group, update(t) { spool.rotation.x = t * 0.5; helmet.rotation.y = t * 0.4; } };
  },

  // Doudna & Charpentier – a virus attacking a bacterium, and CRISPR scissors cutting DNA
  crispr() {
    const group = new THREE.Group();
    standBase(group, 0.3);
    const h = helix(group, { turns: 13, r: 0.085, step: 0.045, cutAt: 6, sphere: 0.02 });
    h.position.set(0.04, 0.08, 0);
    // scissors
    const sc = new THREE.Group();
    const steel = new THREE.MeshStandardMaterial({ color: 0xdfe4ea, metalness: 0.9, roughness: 0.2 });
    const handle = new THREE.MeshStandardMaterial({ color: 0x8e5bd1, roughness: 0.4 });
    const bladeA = new THREE.Group();
    const bladeB = new THREE.Group();
    for (const [blade, s] of [[bladeA, 1], [bladeB, -1]]) {
      add(blade, new THREE.BoxGeometry(0.15, 0.012, 0.02), steel, 0.075, 0, 0);
      add(blade, new THREE.TorusGeometry(0.028, 0.008, 6, 16), handle, -0.05, s * 0.025, 0);
      sc.add(blade);
    }
    add(sc, new THREE.CylinderGeometry(0.01, 0.01, 0.04, 8), steel).rotation.x = Math.PI / 2;
    sc.position.set(-0.17, 0.35, 0.06);
    group.add(sc);
    // bacterium + attacking virus
    const bact = add(group, new THREE.CapsuleGeometry(0.035, 0.09, 6, 12), basic(0x5dd39e, { roughness: 0.5 }), -0.22, 0.12, -0.12);
    bact.rotation.z = Math.PI / 2;
    const virus = new THREE.Group();
    group.add(virus);
    add(virus, new THREE.IcosahedronGeometry(0.035, 0), basic(0xe05a9a, { flatShading: true }));
    for (let i = 0; i < 6; i++) {
      const spike = add(virus, new THREE.CylinderGeometry(0.003, 0.003, 0.04), basic(0xe05a9a));
      const dir = new THREE.Vector3(Math.sin(i * 2.1), Math.cos(i * 1.3), Math.sin(i * 3.7)).normalize();
      spike.position.copy(dir.clone().multiplyScalar(0.045));
      spike.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    }
    const label = textPlate('CRISPR-Cas9', 0.2, 0.05);
    label.position.set(0.18, 0.06, 0.24);
    label.rotation.x = -0.6;
    group.add(label);
    return {
      group,
      update(t) {
        h.rotation.y = t * 0.5;
        const o = 0.15 + Math.abs(Math.sin(t * 2)) * 0.25;
        bladeA.rotation.z = o;
        bladeB.rotation.z = -o;
        const a = t * 1.2;
        virus.position.set(-0.22 + Math.cos(a) * 0.1, 0.2 + Math.sin(a * 2) * 0.03, -0.12 + Math.sin(a) * 0.08);
        virus.rotation.y = t;
      },
    };
  },

  // Maryam Mirzakhani – curved saddle surface with paths, a "pretzel" surface and the Fields Medal
  saddle() {
    const group = new THREE.Group();
    // doodle paper on the floor of the case
    const paper = add(group, new THREE.PlaneGeometry(0.6, 0.34), new THREE.MeshStandardMaterial({
      map: canvasTex(256, 146, (g, w, h) => {
        g.fillStyle = '#fbf7ee';
        g.fillRect(0, 0, w, h);
        g.strokeStyle = 'rgba(80,60,140,0.6)';
        g.lineWidth = 2;
        for (let i = 0; i < 9; i++) { g.beginPath(); g.ellipse(70 + i * 14, 70, 50 - i * 3, 20 + i * 2, i * 0.3, 0, Math.PI * 2); g.stroke(); }
        g.beginPath(); g.moveTo(150, 30); g.bezierCurveTo(250, 20, 180, 120, 240, 130); g.stroke();
      }),
      roughness: 0.9,
    }), 0, 0.003, 0);
    paper.rotation.x = -Math.PI / 2;
    const fn = (u, v, target) => {
      const x = (u - 0.5) * 0.44, z = (v - 0.5) * 0.44;
      target.set(x, (x * x - z * z) * 1.8, z);
    };
    const holder = new THREE.Group();
    holder.position.set(-0.08, 0.44, -0.04);
    holder.add(new THREE.Mesh(new ParametricGeometry(fn, 22, 22), new THREE.MeshStandardMaterial({ color: 0x8e5bd1, roughness: 0.35, metalness: 0.2, side: THREE.DoubleSide, transparent: true, opacity: 0.9 })));
    holder.add(new THREE.LineSegments(new THREE.WireframeGeometry(new ParametricGeometry(fn, 8, 8)), new THREE.LineBasicMaterial({ color: 0xffe08a })));
    const pts = [];
    for (let i = 0; i <= 40; i++) {
      const p = new THREE.Vector3();
      fn(i / 40, 0.5 + Math.sin((i / 40) * Math.PI * 2) * 0.3, p);
      p.y += 0.006;
      pts.push(p);
    }
    holder.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.005, 4), glow(0xffffff, 1.5)));
    group.add(holder);
    add(group, new THREE.CylinderGeometry(0.012, 0.012, 0.4), basic(0xe6ddcc), -0.08, 0.22, -0.04);
    standBase(group, 0.08).position.set(-0.08, 0.025, -0.04);
    // genus-2 "pretzel" surface
    const pretzel = new THREE.Group();
    pretzel.position.set(0.2, 0.42, -0.1);
    const pm = new THREE.MeshStandardMaterial({ color: 0x5ab0e0, roughness: 0.3, metalness: 0.2 });
    add(pretzel, new THREE.TorusGeometry(0.05, 0.022, 10, 24), pm, -0.045, 0, 0);
    add(pretzel, new THREE.TorusGeometry(0.05, 0.022, 10, 24), pm, 0.045, 0, 0);
    group.add(pretzel);
    // Fields Medal
    const medal = new THREE.Group();
    medal.position.set(0.2, 0.15, 0.1);
    group.add(medal);
    const gold = new THREE.MeshStandardMaterial({ color: 0xe8bb4a, metalness: 0.9, roughness: 0.25, emissive: 0x3a2600 });
    const faceTex = canvasTex(128, 128, (g, w, h) => {
      g.fillStyle = '#e8bb4a';
      g.fillRect(0, 0, w, h);
      g.strokeStyle = '#9a6d17';
      g.lineWidth = 4;
      g.beginPath(); g.arc(w / 2, h / 2, 56, 0, Math.PI * 2); g.stroke();
      g.fillStyle = '#9a6d17';
      g.beginPath(); g.ellipse(w / 2, h / 2 + 4, 22, 28, 0, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.arc(w / 2, h / 2 - 28, 14, 0, Math.PI * 2); g.fill();
    });
    const disc = add(medal, new THREE.CylinderGeometry(0.07, 0.07, 0.012, 32), [gold, new THREE.MeshStandardMaterial({ map: faceTex, metalness: 0.8, roughness: 0.3 }), gold]);
    disc.rotation.x = Math.PI / 2;
    const ribbon = canvasTex(32, 64, (g, w, h) => { g.fillStyle = '#3b6fd8'; g.fillRect(0, 0, w, h); g.fillStyle = '#ffffff'; g.fillRect(12, 0, 8, h); });
    for (const s of [-1, 1]) {
      const r = add(medal, new THREE.PlaneGeometry(0.03, 0.12), new THREE.MeshStandardMaterial({ map: ribbon, side: THREE.DoubleSide }), s * 0.02, 0.12, -0.004);
      r.rotation.z = s * 0.25;
    }
    add(group, new THREE.BoxGeometry(0.12, 0.03, 0.06), basic(0xe6ddcc), 0.2, 0.015, 0.1);
    return {
      group,
      update(t) {
        holder.rotation.y = t * 0.35;
        pretzel.rotation.set(t * 0.5, t * 0.7, 0);
        medal.rotation.y = Math.sin(t * 0.8) * 0.6;
      },
    };
  },
};

export function buildExhibitObject(kind) {
  const b = builders[kind] || builders.atom;
  return b();
}

export const EXHIBIT_KINDS = Object.keys(builders);
