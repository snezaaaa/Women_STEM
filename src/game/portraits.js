// Stylised, friendly illustrated portraits drawn on a 2D canvas.
// These are NOT likenesses or photos: each is a simple cartoon built from a few
// characteristic traits (hair, era clothing, accessories) described in content.json:
//
// "portraits": [{
//   "skin": "#f3d6c2", "eyes": "#4a3020", "lips": "#b5646a",
//   "hair": { "color": "#3b2418", "length": "short|jaw|shoulder|long", "texture": "straight|wavy|curly",
//             "part": "center|side|none", "bun": true, "bangs": false, "ringlets": false, "volume": 0 },
//   "outfit": "#5b3f8c", "neckline": "round|high|shirt|labcoat|blazer|spacesuit", "inner": "#ffffff",
//   "glasses": "none|round|large", "accessories": ["pearls", "earrings", "headband", "lace", "helmet"]
// }]
//
// Design units: the figure is 300 units tall, base at y = 0, head centred at (0, -190).

function shade(hex, amt) {
  const n = parseInt(hex.replace('#', ''), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.max(0, Math.min(255, Math.round(v + amt * 255))));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

const LENGTH_Y = { short: -168, jaw: -138, shoulder: -100, long: -40 };

function hairBackPath(g, h, w, L) {
  g.beginPath();
  g.moveTo(-w, -200);
  g.ellipse(0, -200, w, 64, 0, Math.PI, 0);
  g.bezierCurveTo(w + 4, -170, w + 2, L + 30, w - 8, L);
  g.quadraticCurveTo(0, L + 10, -(w - 8), L);
  g.bezierCurveTo(-w - 2, L + 30, -w - 4, -170, -w, -200);
  g.closePath();
}

function drawBackHair(g, p) {
  const h = p.hair || {};
  const col = h.color || '#3b2418';
  g.fillStyle = col;
  const vol = h.volume || 0;
  const w = 54 + vol * 8;
  if (h.bun) {
    g.beginPath();
    g.arc(0, -258, 24 + vol * 3, 0, Math.PI * 2);
    g.fill();
  }
  if (h.length === 'short' && h.texture !== 'curly') {
    g.beginPath();
    g.ellipse(0, -198, w - 4, 62 + vol * 4, 0, 0, Math.PI * 2);
    g.fill();
  } else if (h.length !== 'short') {
    const L = LENGTH_Y[h.length] ?? -140;
    hairBackPath(g, h, w, L);
    g.fill();
    if (h.texture === 'wavy' || h.texture === 'curly') {
      const r = h.texture === 'curly' ? 15 : 11;
      for (let y = -195; y < L; y += r * 1.3) {
        const k = (y + 195) / (L + 195 || 1);
        const x = w - 4 + Math.sin(k * 6) * 3;
        g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
        g.beginPath(); g.arc(-x, y, r, 0, Math.PI * 2); g.fill();
      }
    }
  }
  if (h.texture === 'curly') {
    // a cloud of curls around the head
    const R = 58 + vol * 8;
    const bottom = LENGTH_Y[h.length] ?? -150;
    for (let a = Math.PI * 0.72; a <= Math.PI * 2.28; a += 0.26) {
      const y = -196 + Math.sin(a) * (R + 4);
      if (y > bottom) continue;
      g.beginPath();
      g.arc(Math.cos(a) * R, y, 17 + vol * 2, 0, Math.PI * 2);
      g.fill();
    }
  }
  if (h.ringlets) {
    for (const s of [-1, 1]) {
      for (let i = 0; i < 4; i++) {
        g.beginPath();
        g.ellipse(s * (50 + (i % 2) * 4), -178 + i * 13, 9, 8, 0, 0, Math.PI * 2);
        g.fill();
      }
    }
  }
}

function drawFrontHair(g, p) {
  const h = p.hair || {};
  const col = h.color || '#3b2418';
  const vol = h.volume || 0;
  // cap over the top of the head, cut along the hairline
  g.save();
  g.beginPath();
  if (h.bangs) {
    g.moveTo(-60, -170);
    g.lineTo(-46, -192);
    g.quadraticCurveTo(0, -212, 46, -192);
    g.lineTo(60, -170);
  } else if (h.part === 'side') {
    g.moveTo(-60, -172);
    g.lineTo(-46, -180);
    g.bezierCurveTo(-40, -215, -20, -226, -12, -228);
    g.bezierCurveTo(10, -222, 40, -210, 47, -182);
    g.lineTo(60, -172);
  } else {
    g.moveTo(-60, -172);
    g.lineTo(-46, -182);
    g.bezierCurveTo(-42, -212, -14, -222, 0, -214);
    g.bezierCurveTo(14, -222, 42, -212, 46, -182);
    g.lineTo(60, -172);
  }
  g.lineTo(80, -320);
  g.lineTo(-80, -320);
  g.closePath();
  g.clip();
  g.fillStyle = col;
  g.beginPath();
  g.ellipse(0, -198, 50 + vol * 4, 60 + vol * 4, 0, 0, Math.PI * 2);
  g.fill();
  if (h.texture === 'curly') {
    for (let a = Math.PI * 1.05; a <= Math.PI * 1.95; a += 0.2) {
      g.beginPath();
      g.arc(Math.cos(a) * 46, -200 + Math.sin(a) * 52, 13, 0, Math.PI * 2);
      g.fill();
    }
  }
  // soft shine
  g.strokeStyle = 'rgba(255,255,255,0.16)';
  g.lineWidth = 5;
  g.beginPath();
  g.arc(0, -196, 42, Math.PI * 1.15, Math.PI * 1.45);
  g.stroke();
  g.restore();
  // side locks framing the face
  if (!h.bun && h.length && h.length !== 'short') {
    const Lf = { jaw: -140, shoulder: -108, long: -70 }[h.length];
    g.fillStyle = col;
    for (const s of [-1, 1]) {
      g.beginPath();
      g.moveTo(s * 34, -214);
      g.bezierCurveTo(s * 54, -200, s * (54 + vol * 4), -165, s * (50 + vol * 4), Lf);
      g.lineTo(s * (36 + vol * 2), Lf + 2);
      g.bezierCurveTo(s * 42, -165, s * 44, -190, s * 34, -214);
      g.fill();
      if (h.texture === 'wavy' || h.texture === 'curly') {
        for (let y = -180; y < Lf; y += 16) {
          g.beginPath();
          g.arc(s * (47 + vol * 3), y, 9, 0, Math.PI * 2);
          g.fill();
        }
      }
    }
  }
}

function drawClothes(g, p) {
  const outfit = p.outfit || '#5b3f8c';
  const neck = p.neckline || 'round';
  const skin = p.skin || '#e8c3a6';
  // shoulders / torso
  g.beginPath();
  g.moveTo(-122, 0);
  g.bezierCurveTo(-120, -70, -76, -98, -34, -108);
  g.lineTo(34, -108);
  g.bezierCurveTo(76, -98, 120, -70, 122, 0);
  g.closePath();
  g.fillStyle = neck === 'labcoat' ? '#f7f7f4' : outfit;
  g.fill();
  // subtle fold shading
  g.fillStyle = 'rgba(0,0,0,0.08)';
  g.beginPath();
  g.ellipse(-70, -30, 22, 50, 0.3, 0, Math.PI * 2);
  g.ellipse(70, -30, 22, 50, -0.3, 0, Math.PI * 2);
  g.fill();
  const inner = p.inner || '#ffffff';
  switch (neck) {
    case 'high': // collar is drawn over the neck in drawHighCollar()
      break;
    case 'shirt':
      g.fillStyle = skin;
      g.beginPath(); g.moveTo(-18, -108); g.lineTo(0, -82); g.lineTo(18, -108); g.fill();
      g.fillStyle = inner;
      g.beginPath(); g.moveTo(-26, -110); g.lineTo(-2, -84); g.lineTo(-30, -92); g.closePath(); g.fill();
      g.beginPath(); g.moveTo(26, -110); g.lineTo(2, -84); g.lineTo(30, -92); g.closePath(); g.fill();
      break;
    case 'labcoat':
      g.fillStyle = p.outfit || '#5a6e9a';
      g.beginPath(); g.moveTo(-26, -108); g.lineTo(0, -55); g.lineTo(26, -108); g.fill();
      g.strokeStyle = '#d5d5d0';
      g.lineWidth = 3;
      g.beginPath(); g.moveTo(-30, -108); g.lineTo(-4, -50); g.lineTo(-6, 0); g.moveTo(30, -108); g.lineTo(4, -50); g.lineTo(6, 0); g.stroke();
      g.fillStyle = skin;
      g.beginPath(); g.moveTo(-14, -108); g.quadraticCurveTo(0, -94, 14, -108); g.fill();
      break;
    case 'blazer':
      g.fillStyle = inner;
      g.beginPath(); g.moveTo(-24, -108); g.lineTo(0, -60); g.lineTo(24, -108); g.fill();
      g.fillStyle = skin;
      g.beginPath(); g.moveTo(-14, -108); g.quadraticCurveTo(0, -96, 14, -108); g.fill();
      g.fillStyle = shade(outfit, 0.08);
      g.beginPath(); g.moveTo(-30, -108); g.lineTo(-4, -56); g.lineTo(-20, -70); g.closePath(); g.fill();
      g.beginPath(); g.moveTo(30, -108); g.lineTo(4, -56); g.lineTo(20, -70); g.closePath(); g.fill();
      break;
    case 'spacesuit':
      g.fillStyle = '#9aa3ad';
      g.beginPath(); g.ellipse(0, -110, 44, 14, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#c7ccd2';
      g.beginPath(); g.ellipse(0, -112, 36, 9, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = shade(outfit, -0.12);
      g.fillRect(-60, -60, 26, 18);
      break;
    default: // round neckline
      g.fillStyle = skin;
      g.beginPath(); g.moveTo(-24, -108); g.quadraticCurveTo(0, -84, 24, -108); g.fill();
  }
  const acc = p.accessories || [];
  if (acc.includes('lace') && neck !== 'high') {
    g.fillStyle = '#ffffff';
    for (let x = -22; x <= 22; x += 8) { g.beginPath(); g.arc(x, -108, 5, 0, Math.PI * 2); g.fill(); }
  }
  if (acc.includes('pearls')) {
    g.fillStyle = '#fbf7ee';
    for (let i = 0; i <= 10; i++) {
      const t = i / 10;
      const x = -24 + 48 * t, y = -104 + Math.sin(t * Math.PI) * 14;
      g.beginPath(); g.arc(x, y, 3.6, 0, Math.PI * 2); g.fill();
    }
  }
  if (acc.includes('brooch') && neck !== 'high') {
    g.fillStyle = '#e2b94f';
    g.beginPath(); g.arc(0, -98, 6, 0, Math.PI * 2); g.fill();
  }
}

function drawHighCollar(g, p) {
  if (p.neckline !== 'high') return;
  const outfit = p.outfit || '#5b3f8c';
  const acc = p.accessories || [];
  g.fillStyle = outfit;
  g.beginPath();
  g.moveTo(-24, -104); g.lineTo(-23, -142); g.quadraticCurveTo(0, -136, 23, -142); g.lineTo(24, -104);
  g.closePath();
  g.fill();
  g.fillStyle = shade(outfit, 0.08);
  g.fillRect(-23, -128, 46, 3);
  if (acc.includes('lace')) {
    g.fillStyle = '#ffffff';
    for (let x = -21; x <= 21; x += 7) { g.beginPath(); g.arc(x, -142 + Math.abs(x) * 0.05, 4.5, 0, Math.PI * 2); g.fill(); }
  }
  if (acc.includes('brooch')) {
    g.fillStyle = '#e2b94f';
    g.beginPath(); g.arc(0, -120, 6, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#fff3c4';
    g.beginPath(); g.arc(-1.5, -121.5, 2, 0, Math.PI * 2); g.fill();
  }
}

function drawFace(g, p) {
  const skin = p.skin || '#e8c3a6';
  const hairCol = (p.hair && p.hair.color) || '#3b2418';
  // neck
  g.fillStyle = skin;
  g.fillRect(-18, -150, 36, 46);
  g.fillStyle = 'rgba(0,0,0,0.10)';
  g.beginPath(); g.ellipse(0, -142, 20, 10, 0, 0, Math.PI * 2); g.fill();
  // ears
  g.fillStyle = shade(skin, -0.03);
  for (const s of [-1, 1]) { g.beginPath(); g.ellipse(s * 44, -186, 8, 13, 0, 0, Math.PI * 2); g.fill(); }
  // face
  g.fillStyle = skin;
  g.beginPath();
  g.moveTo(-44, -194);
  g.bezierCurveTo(-44, -252, 44, -252, 44, -194);
  g.bezierCurveTo(44, -160, 22, -133, 0, -132);
  g.bezierCurveTo(-22, -133, -44, -160, -44, -194);
  g.fill();
  // cheeks
  g.fillStyle = 'rgba(232,110,120,0.22)';
  for (const s of [-1, 1]) { g.beginPath(); g.ellipse(s * 25, -166, 9, 6, 0, 0, Math.PI * 2); g.fill(); }
  // eyes
  for (const s of [-1, 1]) {
    const x = s * 17, y = -186;
    g.fillStyle = '#ffffff';
    g.beginPath(); g.ellipse(x, y, 8.5, 5.5, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = p.eyes || '#4a3020';
    g.beginPath(); g.arc(x, y, 4.6, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#1a1210';
    g.beginPath(); g.arc(x, y, 2.2, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#ffffff';
    g.beginPath(); g.arc(x + 1.5, y - 1.6, 1.2, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#2a1a14';
    g.lineWidth = 2.2;
    g.beginPath(); g.ellipse(x, y, 9, 6, 0, Math.PI * 1.05, Math.PI * 1.95); g.stroke();
    // brow
    g.strokeStyle = shade(hairCol, -0.05);
    g.lineWidth = 3.2;
    g.lineCap = 'round';
    g.beginPath(); g.moveTo(x - s * 9, -197); g.quadraticCurveTo(x, -203, x + s * 9, -199); g.stroke();
  }
  // nose
  g.strokeStyle = shade(skin, -0.18);
  g.lineWidth = 2.2;
  g.beginPath(); g.moveTo(-2, -178); g.quadraticCurveTo(-5, -168, 1, -167); g.stroke();
  // smile
  g.strokeStyle = p.lips || '#b5646a';
  g.lineWidth = 3.4;
  g.beginPath(); g.moveTo(-10, -155); g.quadraticCurveTo(0, -148, 10, -155); g.stroke();
}

function drawGlasses(g, p) {
  if (!p.glasses || p.glasses === 'none') return;
  g.strokeStyle = p.glassesColor || '#2a2230';
  g.lineWidth = 3;
  g.fillStyle = 'rgba(200,225,255,0.12)';
  for (const s of [-1, 1]) {
    g.beginPath();
    if (p.glasses === 'large') {
      const x = s * 18 - 15, y = -200;
      g.moveTo(x + 6, y); g.arcTo(x + 30, y, x + 30, y + 26, 6); g.arcTo(x + 30, y + 26, x, y + 26, 9); g.arcTo(x, y + 26, x, y, 9); g.arcTo(x, y, x + 30, y, 6);
    } else {
      g.arc(s * 17, -186, 12, 0, Math.PI * 2);
    }
    g.fill();
    g.stroke();
  }
  g.beginPath(); g.moveTo(-5, -188); g.quadraticCurveTo(0, -192, 5, -188); g.stroke();
  g.beginPath(); g.moveTo(-29, -190); g.lineTo(-43, -192); g.moveTo(29, -190); g.lineTo(43, -192); g.stroke();
}

function drawAccessoriesFront(g, p) {
  const acc = p.accessories || [];
  if (acc.includes('earrings')) {
    g.fillStyle = '#e2b94f';
    for (const s of [-1, 1]) { g.beginPath(); g.arc(s * 46, -170, 4, 0, Math.PI * 2); g.fill(); }
  }
  if (acc.includes('headband')) {
    g.strokeStyle = p.headbandColor || '#e2b94f';
    g.lineWidth = 5;
    g.beginPath(); g.ellipse(0, -205, 49, 40, 0, Math.PI * 1.08, Math.PI * 1.92); g.stroke();
  }
}

function drawHelmetBack(g, p) {
  if (!(p.accessories || []).includes('helmet')) return;
  g.fillStyle = '#f4f4f2';
  g.beginPath(); g.arc(0, -192, 80, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#2a3446';
  g.beginPath(); g.arc(0, -192, 68, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#c7ccd2';
  g.lineWidth = 5;
  g.beginPath(); g.arc(0, -192, 74, 0, Math.PI * 2); g.stroke();
}

/** Draw one portrait (same footprint as drawSilhouette). */
export function drawPortrait(g, cx, baseY, h, p) {
  const s = h / 300;
  g.save();
  g.translate(cx, baseY);
  g.scale(s, s);
  g.lineJoin = 'round';
  drawHelmetBack(g, p);
  drawBackHair(g, p);
  drawClothes(g, p);
  drawFace(g, p);
  drawHighCollar(g, p);
  drawFrontHair(g, p);
  drawGlasses(g, p);
  drawAccessoriesFront(g, p);
  g.restore();
}

/** Draw one or two portraits side by side into an area (like the silhouettes). */
export function drawPortraitGroup(g, cx, baseY, h, portraits, width) {
  if (!portraits || !portraits.length) return false;
  if (portraits.length === 1) drawPortrait(g, cx, baseY, h, portraits[0]);
  else {
    const off = width * 0.2;
    drawPortrait(g, cx - off, baseY, h * 0.88, portraits[0]);
    drawPortrait(g, cx + off, baseY, h * 0.88, portraits[1]);
  }
  return true;
}
