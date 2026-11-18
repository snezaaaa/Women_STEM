// Automated full play-through of STEM IS FOR YOU.
//   npm run build && npm test           (tests the production build under /Women_STEM/)
//   node tests/playthrough.mjs <url>    (tests any running instance)
// Needs Playwright with Chromium:  npm i -D playwright && npx playwright install chromium
import { createRequire } from 'module';
import { spawn, execSync } from 'child_process';
import fs from 'fs';

const require = createRequire(import.meta.url);
let chromium;
try {
  ({ chromium } = require('playwright'));
} catch {
  const globalRoot = execSync('npm root -g').toString().trim();
  ({ chromium } = require(`${globalRoot}/playwright`));
}

const OUT = 'tests/screenshots';
fs.mkdirSync(OUT, { recursive: true });

let server = null;
let url = process.argv[2];
if (!url) {
  server = spawn('npx', ['vite', 'preview', '--port', '4173', '--strictPort'], { stdio: 'pipe' });
  await new Promise((res) => {
    server.stdout.on('data', (d) => { if (String(d).includes('4173')) res(); });
    setTimeout(res, 6000);
  });
  url = 'http://localhost:4173/Women_STEM/';
}

const results = [];
const check = (ok, msg) => { results.push([ok, msg]); console.log(`${ok ? '✔' : '✘'} ${msg}`); };

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const errors = [];

async function newPage(opts) {
  const page = await browser.newPage(opts);
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  return page;
}

const wait = (page, fn, arg, timeout = 60000) => page.waitForFunction(fn, arg, { timeout, polling: 100 });

async function answer(page, ex, wrongCount) {
  await page.waitForSelector('.clue-card.in');
  for (let w = 0; w < wrongCount; w++) {
    const wrong = page.locator('.answer:not([disabled])', { hasNotText: ex.correct }).first();
    await wrong.click();
    await page.waitForTimeout(150);
  }
  if (wrongCount >= 4) return; // never
  if (wrongCount === 3) {
    await page.waitForSelector('.answer.reveal-right');
    await page.click('.card-footer .btn');
  } else {
    await page.locator('.answer', { hasText: new RegExp(`^${ex.correct.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`) }).click();
  }
  await page.waitForSelector('.reveal-card.in');
}

// ------------------------------------------------------------- desktop run
{
  const page = await newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto(url);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForSelector('text=Start');
  await page.screenshot({ path: `${OUT}/d01-intro.png` });
  await page.click('#timerToggle');
  await page.click('text=Start');
  await page.waitForSelector('.char-chip');
  await page.click('.char-chip >> nth=1');
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/d02-select.png` });
  await page.click('text=Enter the museum');
  await wait(page, () => window.__stem.mode === 'play' && window.__stem.room === 0);
  await page.evaluate(() => (window.__stem.timeScale = 3));
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/d03-room1.png` });

  const content = await page.evaluate(() => window.__stem.content);
  const rooms = content.rooms;
  let k = 0;
  let expectedStars = 0;
  for (let r = 0; r < rooms.length; r++) {
    if (r === 2) {
      // refresh mid-game: progress must survive
      await page.reload();
      await page.waitForSelector('text=Continue');
      await page.click('text=Continue');
      await wait(page, () => window.__stem.mode === 'play');
      await page.evaluate(() => (window.__stem.timeScale = 3));
      const room = await page.evaluate(() => window.__stem.room);
      const solved = await page.evaluate(() => Object.keys(window.__stem.save.results).length);
      check(room === 2 && solved === 6, `refresh keeps progress (room ${room + 1}, ${solved} names restored)`);
    }
    for (let j = 0; j < 3; j++) {
      const ex = rooms[r].exhibits[j];
      const wrongs = k % 4;
      const stars = [3, 2, 1, 0][wrongs];
      expectedStars += stars;
      if (r === 0 && j === 0) {
        // real mouse click on the case: walk there, then the card opens
        const p = await page.evaluate((id) => window.__stem.caseScreenPos(id), ex.id);
        await page.mouse.click(p.x, p.y);
      } else {
        await page.evaluate((id) => window.__stem.walkToCase(id), ex.id);
      }
      await answer(page, ex, wrongs);
      if (r === 0 && j === 1) await page.screenshot({ path: `${OUT}/d04-reveal.png` });
      const got = await page.evaluate((id) => window.__stem.save.results[id], ex.id);
      check(got === stars, `${ex.name}: letter ${ex.letter}, ${wrongs} wrong → ${got} star(s) (expected ${stars})`);
      await page.click('.reveal-card .btn');
      await wait(page, () => !document.querySelector('.card') && !document.querySelector('.flying-letter'));
      if (r === 0 && j === 0) {
        await page.screenshot({ path: `${OUT}/d05-after-first.png` });
      }
      k++;
    }
    const slots = await page.$$eval('.slot.filled', (s) => s.map((x) => x.textContent).join(''));
    check(slots === rooms[r].code, `room ${r + 1} door code ${slots} === ${rooms[r].code}`);
    await wait(page, (i) => window.__stem.museum.doors[i].openT >= 1, r);
    check(true, `door ${r + 1} opened`);
    if (r === 0) {
      await page.evaluate(() => window.__stem.walkTo(0, -13.5));
      await wait(page, () => window.__stem.player.path === null);
      await page.screenshot({ path: `${OUT}/d06-door-open.png` });
    }
    const nextZ = -(r + 1) * 16 - 3;
    await page.evaluate((z) => window.__stem.walkTo(0, z), nextZ);
    await wait(page, (n) => window.__stem.room === n, r + 1);
    check(true, `entered ${r + 1 < rooms.length ? 'room ' + (r + 2) : 'the finale room'}`);
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${OUT}/d07-room${r + 2}.png` });
  }
  // finale: walk onto the 13th pedestal
  await page.evaluate(() => { const c = window.__stem.museum.finaleCentre; window.__stem.walkTo(c.x, c.z + 4.5); });
  await wait(page, () => window.__stem.player.path === null);
  await page.screenshot({ path: `${OUT}/d08-hall.png` });
  await page.evaluate(() => { const c = window.__stem.museum.finaleCentre; window.__stem.walkTo(c.x, c.z); });
  await wait(page, () => window.__stem.mode === 'finale');
  await page.evaluate(() => (window.__stem.timeScale = 1));
  await page.waitForSelector('.finale-msg.in');
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${OUT}/d09-mirror.png` });
  await page.evaluate(() => (window.__stem.timeScale = 3));
  await page.waitForSelector('.screen.summary', { timeout: 60000 });
  const summary = await page.textContent('.screen.summary');
  check(summary.includes(`★ ${expectedStars} / 36`), `summary shows ★ ${expectedStars} / 36`);
  const names = await page.$$eval('.sum-name', (n) => n.length);
  check(names === 12, `summary lists ${names} scientists`);
  await page.screenshot({ path: `${OUT}/d10-summary.png` });
  await page.click('text=Play again');
  await page.waitForSelector('text=Start');
  check(true, 'Play again returns to the intro');
  await page.close();
}

// ------------------------------------------------------------- mobile run (touch)
{
  const page = await newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await page.goto(url);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForSelector('text=Start');
  await page.screenshot({ path: `${OUT}/m01-intro.png` });
  await page.tap('text=Start');
  await page.waitForSelector('.char-chip');
  await page.tap('.char-chip >> nth=4');
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/m02-select.png` });
  await page.tap('text=Enter the museum');
  await wait(page, () => window.__stem.mode === 'play');
  await page.evaluate(() => (window.__stem.timeScale = 3));
  await page.waitForTimeout(600);
  // tap the floor → walk there (target ring + dotted path)
  const fp = await page.evaluate(() => window.__stem.floorScreenPos(-1.5, -6.2));
  await page.touchscreen.tap(fp.x, fp.y);
  await page.waitForTimeout(250);
  const hasPath = await page.evaluate(() => !!window.__stem.player.path && window.__stem.player.target.visible);
  check(hasPath, 'tap on floor creates a path with a target ring');
  await page.screenshot({ path: `${OUT}/m03-tap-walk.png` });
  await wait(page, () => window.__stem.player.path === null);
  const pos = await page.evaluate(() => ({ x: window.__stem.player.position.x, z: window.__stem.player.position.z }));
  check(Math.hypot(pos.x + 1.5, pos.z + 6.2) < 0.5, `character walked to tapped point (${pos.x.toFixed(2)}, ${pos.z.toFixed(2)})`);
  // tap a case
  const cp = await page.evaluate(() => window.__stem.caseScreenPos('curie'));
  await page.touchscreen.tap(cp.x, cp.y);
  await page.waitForSelector('.clue-card.in', { timeout: 60000 });
  check(true, 'tapping a case opens the clue card on mobile');
  await page.screenshot({ path: `${OUT}/m04-clue.png` });
  await page.locator('.answer', { hasText: 'Oxygen' }).tap();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/m05-wrong.png` });
  await page.locator('.answer', { hasText: 'Polonium' }).tap();
  await page.waitForSelector('.reveal-card.in');
  await page.screenshot({ path: `${OUT}/m06-reveal.png` });
  await page.close();
}

// ------------------------------------------------------------- collision sanity
{
  const page = await newPage({ viewport: { width: 800, height: 600 } });
  await page.goto(url);
  await page.waitForSelector('text=Start');
  await page.click('text=Start');
  await page.click('text=Enter the museum');
  await wait(page, () => window.__stem.mode === 'play');
  await page.evaluate(() => (window.__stem.timeScale = 3));
  // stand in front of the locked door and hold W: the door must block
  await page.evaluate(() => window.__stem.player.teleport(0, -12.5, Math.PI));
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(4000);
  await page.keyboard.up('KeyW');
  const z = await page.evaluate(() => window.__stem.player.position.z);
  check(z > -16 + 0.2, `locked door blocks the player (z = ${z.toFixed(2)})`);
  await page.close();
}

await browser.close();
if (server) server.kill();
check(errors.length === 0, `no page errors${errors.length ? ': ' + errors.join(' | ') : ''}`);
const failed = results.filter((r) => !r[0]).length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed ? 1 : 0);
