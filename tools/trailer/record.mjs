// Records a vertical (1080×1920, 30 fps) Instagram trailer of the real game, frame by frame.
//   npm run build && node tools/trailer/record.mjs <framesDir>
// Then: python3 tools/trailer/music.py <out.wav> and ffmpeg (see tools/trailer/README.md).
// The page clock is faked, so every frame is exactly 1/30 s of game time however slow the machine is.
import { createRequire } from 'module';
import { spawn, execSync } from 'child_process';
import fs from 'fs';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require(`${execSync('npm root -g').toString().trim()}/playwright`)); }

const OUT = process.argv[2] || 'trailer-frames';
// TRAILER_ONLY=montage|finale TRAILER_START=<frame> re-records just that part (montage, or finale + end card) into existing frames
const ONLY = process.env.TRAILER_ONLY || '';
if (!ONLY) fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
const FPS = 30;
const FRAME_MS = 1000 / FPS;

const server = spawn('npx', ['vite', 'preview', '--port', '4177', '--strictPort'], { stdio: 'pipe' });
await new Promise((res) => { server.stdout.on('data', (d) => { if (String(d).includes('4177')) res(); }); setTimeout(res, 6000); });
const URL = 'http://localhost:4177/Women_STEM/';

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const context = await browser.newContext({ viewport: { width: 540, height: 960 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const page = await context.newPage();
page.on('pageerror', (e) => console.log('pageerror', e.message));
await page.clock.install({ time: new Date('2026-11-23T10:00:00') });

let frame = Number(process.env.TRAILER_START || 0);
const log = (m) => console.log(`[${(frame / FPS).toFixed(1)}s] ${m}`);

// ---------- caption overlay (trailer only) ----------
const CAPTION_CSS = `
.toast { display: none !important; }
#tr-cap { position: fixed; left: 0; right: 0; z-index: 99; display: flex; justify-content: center; pointer-events: none; padding: 0 22px; }
#tr-cap div { background: rgba(30,14,54,0.88); border: 2px solid #f2c14e; color: #fff; border-radius: 22px; padding: 12px 20px;
  font: 800 30px/1.18 'Segoe UI', system-ui, sans-serif; text-align: center; box-shadow: 0 10px 30px rgba(0,0,0,0.45); max-width: 480px; }
#tr-cap b { color: #f2c14e; }
#tr-end { position: fixed; inset: 0; z-index: 100; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 18px;
  background: radial-gradient(ellipse at 50% 40%, #4b2a7d, #1e0f36 70%); color: #fff; text-align: center; font-family: 'Segoe UI', system-ui, sans-serif; padding: 30px; }
#tr-end .logo { font: 800 62px/1.02 Georgia, serif; background: linear-gradient(180deg,#fff1b8,#e2b94f 55%,#a8781e); -webkit-background-clip: text; background-clip: text; color: transparent;
  filter: drop-shadow(0 0 18px rgba(242,193,78,0.55)); }
#tr-end .sub { font-size: 24px; color: #e9dcff; max-width: 420px; line-height: 1.35; }
#tr-end .url { margin-top: 10px; font-weight: 800; font-size: 22px; color: #1e0f36; background: #f2c14e; padding: 12px 22px; border-radius: 999px; }
#tr-end .tag { font-weight: 800; letter-spacing: 0.18em; color: #f2c14e; font-size: 16px; }
`;
async function setupOverlay() {
  await page.addStyleTag({ content: CAPTION_CSS });
  await page.evaluate(() => { const d = document.createElement('div'); d.id = 'tr-cap'; document.body.append(d); });
}
async function caption(html, top = '19%') {
  await page.evaluate(([h, t]) => {
    const c = document.getElementById('tr-cap');
    c.style.top = t;
    c.innerHTML = h ? `<div>${h}</div>` : '';
  }, [html, top]);
}

// ---------- recording ----------
async function shoot() {
  await page.clock.runFor(FRAME_MS);
  await page.screenshot({ path: `${OUT}/${String(frame).padStart(5, '0')}.jpg`, type: 'jpeg', quality: 92 });
  frame++;
  if (frame % 30 === 0) log('frame');
}
/** Record `sec` seconds; `each(t)` runs before every frame (t = seconds into this shot). */
async function rec(sec, each) {
  const n = Math.round(sec * FPS);
  for (let i = 0; i < n; i++) {
    if (each) await each(i / FPS, i);
    await shoot();
  }
}
const ev = (fn, arg) => page.evaluate(fn, arg);
async function advance(ms) { await page.clock.runFor(ms); }
/** Keep recording (game time advances) until a selector exists – never wait in real time. */
async function recUntil(selector, maxSec = 6) {
  for (let i = 0; i < maxSec * FPS; i++) {
    if (await page.$(selector)) return;
    await shoot();
  }
  throw new Error('timed out waiting for ' + selector);
}
/** Stop the page clock from following real time: from now on only runFor() moves it. */
async function pauseClock() {
  const now = await page.evaluate(() => Date.now());
  await page.clock.pauseAt(now + 1000);
}

async function loadWithSave(save) {
  await page.goto(URL);
  await page.evaluate((s) => { localStorage.clear(); if (s) localStorage.setItem('stem-is-for-you-save-v1', JSON.stringify(s)); }, save);
  await page.reload();
  await pauseClock();
  await advance(500);
  await setupOverlay();
}

const baseSave = (results, extra = {}) => ({ v: 1, characterId: 'zoe', results, progress: {}, elapsed: 61, timerOn: false, finished: false, ...extra });

if (!ONLY) {
// ===== 1. Title (intro screen) =====
await loadWithSave(null);
await caption('Locked in a <b>science museum</b> after dark…', '4%');
await rec(3.0);

// ===== 2. Character select =====
await page.click('text=Start');
await advance(300);
await caption('Pick your <b>researcher</b>', '6%');
const picks = [1, 2, 3, 4, 5];
await rec(3.4, async (t, i) => { if (i % 20 === 0 && picks.length) await page.click(`.char-chip >> nth=${picks.shift()}`); });

// ===== 3. Walk in Room 1 =====
await loadWithSave(baseSave({ lovelace: 3, maric: 2 }));
await page.click('text=Continue');
await advance(200);
await ev(() => window.__stem.snap());
await caption('Explore <b>4 rooms</b> of a 3D museum');
await rec(3.4, async (t, i) => {
  if (i === 8) await ev(() => window.__stem.walkTo(-3.2, -6.4));
  if (i === 60) await ev(() => window.__stem.walkToCase('curie'));
});

// ===== 4. Inspect + answer =====
await recUntil('.clue-card.in');
await caption('Read the clues about <b>real women scientists</b>', '2%');
await rec(2.6);
await page.locator('.answer', { hasText: 'Oxygen' }).click();
await caption('Wrong? No problem: <b>another clue</b> appears', '2%');
await rec(1.8);
await page.locator('.answer', { hasText: 'Polonium' }).click();
await caption('Right answer = <b>★ stars</b>', '2%');
await rec(1.0);

// ===== 5. Name restored → letter → door =====
await recUntil('.reveal-card.in');
await caption('Restore her <b>name</b>…', '2%');
await rec(2.4);
await page.click('.reveal-card .btn');
await caption('…collect the <b>letter</b> and unlock the <b>door</b>!');
await rec(1.6);
await rec(3.0, async (t, i) => { if (i === 10) await ev(() => window.__stem.walkTo(0, -13.2)); });

} // end scenes 1–5

// ===== 6. Exhibit montage (plaques show the illustrated portraits) =====
if (!ONLY || ONLY === 'montage') {
if (ONLY) {
  await loadWithSave(baseSave({ lovelace: 3, maric: 2, curie: 2 }));
  await page.click('text=Continue');
  await advance(200);
}
await page.addStyleTag({ content: '.hud { visibility: hidden !important; }' });
const montage = ['franklin', 'lamarr', 'johnson', 'tereshkova', 'hamilton', 'doudna-charpentier', 'mirzakhani'];
await caption('<b>12</b> brilliant scientists to discover', '3%');
for (const id of montage) {
  await ev((cid) => {
    const s = window.__stem;
    const c = s.museum.cases.find((x) => x.exhibit.id === cid);
    c.setSolved(true);
    s.museum.setActiveRoom(c.roomIndex);
    s.camOverride = { pos: [c.pos.x - 1.1, 2.3, c.pos.z + 3.2], look: [c.pos.x, 2.25, c.pos.z] };
    s.snap();
    s._shot = c;
  }, id);
  await rec(0.75, async (t) => {
    await ev((tt) => {
      const s = window.__stem, c = s._shot;
      const a = -0.35 + tt * 0.55;
      s.camOverride = { pos: [c.pos.x + Math.sin(a) * 3.3, 2.3, c.pos.z + Math.cos(a) * 3.3], look: [c.pos.x, 2.25, c.pos.z] };
      s.snap();
    }, t);
  });
}

}

if (!ONLY || ONLY === 'finale') {
// ===== 7. Finale: the 13th pedestal and the mirror =====
const all = {};
for (const id of ['lovelace', 'curie', 'maric', 'franklin', 'meitner', 'lamarr', 'johnson', 'tereshkova', 'hamilton', 'kwolek', 'doudna-charpentier', 'mirzakhani']) all[id] = 3;
await loadWithSave(baseSave(all, { elapsed: 742 }));
await page.click('text=Continue');
await advance(200);
await ev(() => { const s = window.__stem; const c = s.museum.finaleCentre; s.player.teleport(c.x, c.z + 4.6, Math.PI); s.snap(); });
await caption('…and then <b>one empty pedestal</b> is waiting');
await rec(0.6);
await ev(() => { const c = window.__stem.museum.finaleCentre; window.__stem.walkTo(c.x, c.z); });
await rec(1.4);
await caption('');
await rec(5.6);

// ===== 8. End card =====
await ev(() => {
  const d = document.createElement('div');
  d.id = 'tr-end';
  d.innerHTML = `<div class="tag">GIRLS GO STEM · EIT</div>
    <div class="logo">STEM<br>IS FOR<br>YOU</div>
    <div class="sub">A free 3D museum escape game about women who changed science</div>
    <div class="sub">Phone · tablet · classroom projector</div>
    <div class="url">snezaaaa.github.io/Women_STEM</div>`;
  document.body.append(d);
});
await rec(3.6);
}

console.log(`done: ${frame} frames (${(frame / FPS).toFixed(1)} s) in ${OUT}`);
await browser.close();
server.kill();
