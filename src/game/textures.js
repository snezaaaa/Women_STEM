import * as THREE from 'three';

export const COLORS = {
  wall: 0x8a6bbf,
  wallDark: 0x5b3f8c,
  gold: 0xd9ae4a,
  goldHex: '#e2b94f',
  violet: '#8e5bd1',
  violetDeep: '#3a1f63',
  cream: '#f3e6cc',
  beige: '#dcc39b',
};

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function toTexture(c, { repeat = null, srgb = true } = {}) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat[0], repeat[1]);
  }
  return t;
}

export function checkerTexture(repeatX, repeatY) {
  const c = canvas(256, 256);
  const g = c.getContext('2d');
  const s = 128;
  for (let y = 0; y < 2; y++) {
    for (let x = 0; x < 2; x++) {
      g.fillStyle = (x + y) % 2 ? COLORS.beige : COLORS.cream;
      g.fillRect(x * s, y * s, s, s);
      // subtle tile sheen
      const grd = g.createLinearGradient(x * s, y * s, x * s + s, y * s + s);
      grd.addColorStop(0, 'rgba(255,255,255,0.10)');
      grd.addColorStop(1, 'rgba(0,0,0,0.05)');
      g.fillStyle = grd;
      g.fillRect(x * s, y * s, s, s);
    }
  }
  g.strokeStyle = 'rgba(120,90,50,0.25)';
  g.lineWidth = 2;
  for (let i = 0; i <= 2; i++) {
    g.beginPath(); g.moveTo(i * s, 0); g.lineTo(i * s, 256); g.stroke();
    g.beginPath(); g.moveTo(0, i * s); g.lineTo(256, i * s); g.stroke();
  }
  return toTexture(c, { repeat: [repeatX, repeatY] });
}

export function wallTexture(repeatX, repeatY) {
  // soft vertical damask-like stripes
  const c = canvas(128, 256);
  const g = c.getContext('2d');
  g.fillStyle = '#9b80cc';
  g.fillRect(0, 0, 128, 256);
  g.fillStyle = 'rgba(255,255,255,0.06)';
  g.fillRect(0, 0, 64, 256);
  g.fillStyle = 'rgba(255,255,255,0.05)';
  for (let y = 16; y < 256; y += 64) {
    g.beginPath();
    g.ellipse(96, y + 16, 10, 18, 0, 0, Math.PI * 2);
    g.fill();
  }
  return toTexture(c, { repeat: [repeatX, repeatY] });
}

export function radialGlowTexture(color = '255,236,190') {
  const c = canvas(128, 128);
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, `rgba(${color},0.9)`);
  grd.addColorStop(0.4, `rgba(${color},0.35)`);
  grd.addColorStop(1, `rgba(${color},0)`);
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  return toTexture(c);
}

export function ringTexture() {
  const c = canvas(256, 256);
  const g = c.getContext('2d');
  g.translate(128, 128);
  const grd = g.createRadialGradient(0, 0, 80, 0, 0, 126);
  grd.addColorStop(0, 'rgba(255,215,110,0)');
  grd.addColorStop(0.55, 'rgba(255,215,110,1)');
  grd.addColorStop(0.7, 'rgba(255,235,170,1)');
  grd.addColorStop(1, 'rgba(255,215,110,0)');
  g.fillStyle = grd;
  g.beginPath();
  g.arc(0, 0, 126, 0, Math.PI * 2);
  g.fill();
  return toTexture(c);
}

export function targetRingTexture() {
  const c = canvas(128, 128);
  const g = c.getContext('2d');
  g.strokeStyle = '#b787ff';
  g.lineWidth = 10;
  g.beginPath(); g.arc(64, 64, 50, 0, Math.PI * 2); g.stroke();
  g.fillStyle = 'rgba(183,135,255,0.55)';
  g.beginPath(); g.arc(64, 64, 16, 0, Math.PI * 2); g.fill();
  return toTexture(c);
}

export function dotTexture() {
  const c = canvas(64, 64);
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 30);
  grd.addColorStop(0, 'rgba(210,180,255,1)');
  grd.addColorStop(0.6, 'rgba(160,110,240,0.9)');
  grd.addColorStop(1, 'rgba(160,110,240,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  return toTexture(c);
}

// ---------- silhouettes ----------
// Draws a stylised head-and-shoulders silhouette of a woman (no real likeness).
export function drawSilhouette(g, cx, baseY, h, style, fill) {
  const s = h / 300; // design units: 300 tall
  g.save();
  g.translate(cx, baseY);
  g.scale(s, s);
  g.fillStyle = fill;
  // shoulders / bust
  g.beginPath();
  g.moveTo(-120, 0);
  g.bezierCurveTo(-118, -70, -70, -95, -30, -105);
  g.lineTo(-22, -140);
  g.lineTo(22, -140);
  g.lineTo(30, -105);
  g.bezierCurveTo(70, -95, 118, -70, 120, 0);
  g.closePath();
  g.fill();
  // head
  g.beginPath();
  g.ellipse(0, -190, 44, 56, 0, 0, Math.PI * 2);
  g.fill();
  // hair styles
  g.beginPath();
  switch (style) {
    case 'bun':
      g.ellipse(0, -205, 50, 50, 0, Math.PI, 0);
      g.fill();
      g.beginPath();
      g.arc(0, -262, 26, 0, Math.PI * 2);
      break;
    case 'updo':
      g.ellipse(0, -210, 52, 52, 0, Math.PI * 0.9, Math.PI * 2.1);
      g.fill();
      g.beginPath();
      g.ellipse(-42, -175, 14, 30, 0.2, 0, Math.PI * 2);
      g.fill();
      g.beginPath();
      g.ellipse(42, -175, 14, 30, -0.2, 0, Math.PI * 2);
      g.fill();
      g.beginPath();
      g.ellipse(0, -258, 34, 20, 0, 0, Math.PI * 2);
      break;
    case 'short':
      g.ellipse(0, -200, 54, 58, 0, Math.PI * 0.85, Math.PI * 2.15);
      g.fill();
      g.beginPath();
      g.rect(-54, -200, 18, 50);
      g.rect(36, -200, 18, 50);
      break;
    case 'long':
      g.ellipse(0, -200, 54, 60, 0, Math.PI, 0);
      g.fill();
      g.beginPath();
      g.moveTo(-54, -200);
      g.bezierCurveTo(-64, -140, -70, -100, -60, -70);
      g.lineTo(-30, -100);
      g.lineTo(-38, -200);
      g.closePath();
      g.fill();
      g.beginPath();
      g.moveTo(54, -200);
      g.bezierCurveTo(64, -140, 70, -100, 60, -70);
      g.lineTo(30, -100);
      g.lineTo(38, -200);
      g.closePath();
      break;
    case 'waves':
      g.ellipse(0, -202, 56, 60, 0, Math.PI, 0);
      g.fill();
      for (let i = 0; i < 4; i++) {
        g.beginPath(); g.arc(-50 - (i % 2) * 6, -190 + i * 26, 18, 0, Math.PI * 2); g.fill();
        g.beginPath(); g.arc(50 + (i % 2) * 6, -190 + i * 26, 18, 0, Math.PI * 2); g.fill();
      }
      g.beginPath();
      break;
    case 'curls':
      for (let a = 0; a < 14; a++) {
        const ang = Math.PI * 0.95 + (a / 13) * Math.PI * 1.1;
        g.beginPath();
        g.arc(Math.cos(ang) * 50, -200 + Math.sin(ang) * 54, 22, 0, Math.PI * 2);
        g.fill();
      }
      g.beginPath();
      break;
    default:
      g.ellipse(0, -205, 50, 50, 0, Math.PI, 0);
  }
  g.fill();
  g.restore();
}

function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

function wrapText(g, text, x, y, maxW, lineH, maxLines = 3) {
  const words = text.split(' ');
  let line = '';
  const lines = [];
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (g.measureText(test).width > maxW && line) {
      lines.push(line);
      line = w;
    } else line = test;
  }
  if (line) lines.push(line);
  lines.slice(0, maxLines).forEach((l, i) => g.fillText(l, x, y + i * lineH));
  return Math.min(lines.length, maxLines);
}

function fitFont(g, text, maxW, size, weight = '700', family = 'Georgia, serif') {
  let s = size;
  g.font = `${weight} ${s}px ${family}`;
  while (g.measureText(text).width > maxW && s > 16) {
    s -= 2;
    g.font = `${weight} ${s}px ${family}`;
  }
  return s;
}

/** Plaque above a case: silhouette(s) + "? ? ?" or name + achievement. */
export function drawPlaque(c, exhibit, solved) {
  const g = c.getContext('2d');
  const W = c.width, H = c.height;
  g.clearRect(0, 0, W, H);
  // frame
  const fr = g.createLinearGradient(0, 0, W, H);
  fr.addColorStop(0, '#f6d77c');
  fr.addColorStop(0.5, '#b8862c');
  fr.addColorStop(1, '#f0c868');
  g.fillStyle = fr;
  roundRect(g, 0, 0, W, H, 18);
  g.fill();
  g.fillStyle = solved ? '#fbf6ff' : '#f2efe8';
  roundRect(g, 18, 18, W - 36, H - 36, 10);
  g.fill();
  // silhouette area
  const sil = exhibit.silhouettes && exhibit.silhouettes.length ? exhibit.silhouettes : ['bun'];
  const fill = solved ? COLORS.violet : '#4a4458';
  const areaTop = 40, areaH = H * 0.5;
  if (!solved) {
    g.fillStyle = '#e4e0d8';
    roundRect(g, 40, areaTop, W - 80, areaH, 8);
    g.fill();
  } else {
    const glow = g.createRadialGradient(W / 2, areaTop + areaH / 2, 10, W / 2, areaTop + areaH / 2, W / 2);
    glow.addColorStop(0, 'rgba(200,160,255,0.6)');
    glow.addColorStop(1, 'rgba(200,160,255,0)');
    g.fillStyle = glow;
    g.fillRect(40, areaTop, W - 80, areaH);
  }
  g.save();
  roundRect(g, 40, areaTop, W - 80, areaH, 8);
  g.clip();
  if (sil.length === 1) {
    drawSilhouette(g, W / 2, areaTop + areaH, areaH * 0.95, sil[0], fill);
  } else {
    drawSilhouette(g, W / 2 - W * 0.17, areaTop + areaH, areaH * 0.85, sil[0], fill);
    drawSilhouette(g, W / 2 + W * 0.17, areaTop + areaH, areaH * 0.85, sil[1], solved ? '#6d3fb3' : '#3d3849');
  }
  g.restore();
  // text
  g.textAlign = 'center';
  g.textBaseline = 'top';
  const textY = areaTop + areaH + 22;
  if (!solved) {
    g.fillStyle = '#5a5168';
    g.font = '700 64px Georgia, serif';
    g.fillText('? ? ?', W / 2, textY + 10);
  } else {
    g.fillStyle = '#3a1f63';
    const name = exhibit.name;
    if (name.includes('&')) {
      const [a, b] = name.split('&').map((s) => s.trim());
      fitFont(g, a, W - 80, 34);
      g.fillText(a + ' &', W / 2, textY - 6);
      fitFont(g, b, W - 80, 34);
      g.fillText(b, W / 2, textY + 32);
    } else {
      fitFont(g, name, W - 70, 46);
      g.fillText(name, W / 2, textY);
    }
    g.fillStyle = '#7a5a1c';
    g.font = '600 28px system-ui, sans-serif';
    wrapText(g, exhibit.achievement, W / 2, textY + 76, W - 80, 32, 2);
  }
}

export function plaqueTexture(exhibit, solved) {
  const c = canvas(512, 600);
  drawPlaque(c, exhibit, solved);
  const t = toTexture(c);
  t.userData.canvas = c;
  return t;
}

export function updatePlaqueTexture(tex, exhibit, solved) {
  drawPlaque(tex.userData.canvas, exhibit, solved);
  tex.needsUpdate = true;
}

/** Keypad screen next to the door: letters + status. */
export function drawKeypad(c, code, collected, open) {
  const g = c.getContext('2d');
  const W = c.width, H = c.height;
  g.fillStyle = '#1b1226';
  roundRect(g, 0, 0, W, H, 20);
  g.fill();
  g.strokeStyle = '#d9ae4a';
  g.lineWidth = 8;
  roundRect(g, 4, 4, W - 8, H - 8, 18);
  g.stroke();
  g.fillStyle = '#d9ae4a';
  g.font = '700 30px system-ui, sans-serif';
  g.textAlign = 'center';
  g.fillText('DOOR CODE', W / 2, 52);
  const n = code.length;
  const slotW = 70, gap = 16;
  const start = W / 2 - (n * slotW + (n - 1) * gap) / 2;
  for (let i = 0; i < n; i++) {
    const x = start + i * (slotW + gap);
    g.fillStyle = collected[i] ? '#3a1f63' : '#2a2236';
    roundRect(g, x, 76, slotW, 86, 10);
    g.fill();
    g.fillStyle = collected[i] ? '#ffe08a' : '#7d7390';
    g.font = '700 60px Georgia, serif';
    g.fillText(collected[i] ? code[i] : '_', x + slotW / 2, 142);
  }
  // keypad buttons
  for (let r = 0; r < 3; r++) {
    for (let k = 0; k < 3; k++) {
      g.fillStyle = '#3a2f4a';
      roundRect(g, W / 2 - 105 + k * 75, 184 + r * 52, 60, 40, 8);
      g.fill();
    }
  }
  g.fillStyle = open ? '#59e38a' : '#ff6b6b';
  g.font = '700 26px system-ui, sans-serif';
  g.fillText(open ? 'OPEN' : 'LOCKED', W / 2, H - 22);
}

export function keypadTexture(code) {
  const c = canvas(320, 380);
  drawKeypad(c, code, [false, false, false], false);
  const t = toTexture(c);
  t.userData.canvas = c;
  return t;
}

export function updateKeypadTexture(tex, code, collected, open) {
  drawKeypad(tex.userData.canvas, code, collected, open);
  tex.needsUpdate = true;
}

// ---------- exhibit textures ----------
export function punchCardTexture() {
  const c = canvas(512, 256);
  const g = c.getContext('2d');
  g.fillStyle = '#efe2bf';
  g.fillRect(0, 0, 512, 256);
  g.fillStyle = '#8a6d3b';
  g.font = '18px monospace';
  g.fillText('ANALYTICAL ENGINE · NOTE G', 20, 28);
  g.fillStyle = '#3b2a17';
  for (let col = 0; col < 28; col++) {
    for (let row = 0; row < 8; row++) {
      if (Math.sin(col * 12.9898 + row * 78.233) * 43758.5453 % 1 > 0.35) continue;
      g.fillRect(24 + col * 17, 48 + row * 25, 9, 15);
    }
  }
  return toTexture(c);
}

export function xrayTexture() {
  const c = canvas(256, 320);
  const g = c.getContext('2d');
  g.fillStyle = '#0d0f14';
  g.fillRect(0, 0, 256, 320);
  const grd = g.createRadialGradient(128, 160, 10, 128, 160, 150);
  grd.addColorStop(0, 'rgba(160,190,220,0.55)');
  grd.addColorStop(1, 'rgba(40,60,90,0.1)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 256, 320);
  // X pattern of layered dashes (Photo-51 style)
  g.fillStyle = 'rgba(235,245,255,0.95)';
  for (let i = -6; i <= 6; i++) {
    if (i === 0) continue;
    const y = 160 + i * 20;
    const off = Math.abs(i) * 11;
    g.fillRect(128 - off - 8, y - 4, 16, 8);
    g.fillRect(128 + off - 8, y - 4, 16, 8);
  }
  g.fillStyle = 'rgba(235,245,255,0.6)';
  g.fillRect(118, 20, 20, 10);
  g.fillRect(118, 290, 20, 10);
  g.strokeStyle = 'rgba(200,220,255,0.3)';
  g.lineWidth = 3;
  g.beginPath(); g.ellipse(128, 160, 100, 130, 0, 0, Math.PI * 2); g.stroke();
  g.fillStyle = 'rgba(255,255,255,0.7)';
  g.font = '16px monospace';
  g.fillText('51', 14, 306);
  return toTexture(c);
}

export function chalkboardTexture() {
  const c = canvas(512, 384);
  const g = c.getContext('2d');
  g.fillStyle = '#21402f';
  g.fillRect(0, 0, 512, 384);
  g.strokeStyle = 'rgba(255,255,255,0.9)';
  g.fillStyle = 'rgba(255,255,255,0.9)';
  g.lineWidth = 4;
  // earth
  g.beginPath(); g.arc(220, 200, 46, 0, Math.PI * 2); g.stroke();
  // orbit
  g.setLineDash([12, 8]);
  g.beginPath(); g.ellipse(220, 200, 170, 90, -0.25, 0, Math.PI * 2); g.stroke();
  g.setLineDash([]);
  // spacecraft dot
  g.beginPath(); g.arc(380, 150, 9, 0, Math.PI * 2); g.fill();
  g.font = 'italic 30px Georgia, serif';
  g.fillText('r(θ) = a(1−e²)/(1+e·cosθ)', 30, 50);
  g.font = 'italic 26px Georgia, serif';
  g.fillText('v = √(GM/r)', 300, 350);
  g.fillText('t = 88 min', 30, 350);
  return toTexture(c);
}

export function codeSheetTexture() {
  const c = canvas(128, 128);
  const g = c.getContext('2d');
  g.fillStyle = '#f7f5ee';
  g.fillRect(0, 0, 128, 128);
  for (let y = 4; y < 128; y += 8) {
    g.fillStyle = (y / 8) % 2 ? '#dfeedd' : '#f7f5ee';
    g.fillRect(0, y, 128, 4);
  }
  return toTexture(c);
}

/** Large gold text used for floating "STEM IS FOR YOU" in the finale (sprite). */
export function goldTextTexture(text, w = 1024, h = 192) {
  const c = canvas(w, h);
  const g = c.getContext('2d');
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  fitFont(g, text, w - 40, 130, '800');
  const grd = g.createLinearGradient(0, 20, 0, h - 20);
  grd.addColorStop(0, '#fff1b8');
  grd.addColorStop(0.5, '#e2b94f');
  grd.addColorStop(1, '#a8781e');
  g.shadowColor = 'rgba(255,210,110,0.8)';
  g.shadowBlur = 24;
  g.fillStyle = grd;
  g.fillText(text, w / 2, h / 2);
  return toTexture(c);
}

export function nameCardTexture(name) {
  const c = canvas(512, 128);
  const g = c.getContext('2d');
  g.fillStyle = 'rgba(30,16,52,0.85)';
  roundRect(g, 0, 0, 512, 128, 24);
  g.fill();
  g.strokeStyle = '#d9ae4a';
  g.lineWidth = 6;
  roundRect(g, 3, 3, 506, 122, 22);
  g.stroke();
  g.fillStyle = '#ffe7a3';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  if (name.includes('&')) {
    const [a, b] = name.split('&').map((s) => s.trim());
    fitFont(g, a + ' &', 470, 40);
    g.fillText(a + ' &', 256, 42);
    fitFont(g, b, 470, 40);
    g.fillText(b, 256, 88);
  } else {
    fitFont(g, name, 470, 52);
    g.fillText(name, 256, 66);
  }
  return toTexture(c);
}

export function silhouetteTexture(styles, color = COLORS.violet) {
  const c = canvas(256, 320);
  const g = c.getContext('2d');
  if (styles.length === 1) drawSilhouette(g, 128, 320, 300, styles[0], color);
  else {
    drawSilhouette(g, 80, 320, 250, styles[0], color);
    drawSilhouette(g, 176, 320, 250, styles[1], '#6d3fb3');
  }
  return toTexture(c);
}
