import * as THREE from 'three';
import './style.css';
import content from './data/content.json';
import { Museum, roomFrontZ } from './game/museum.js';
import { Player } from './game/player.js';
import { Character } from './game/character.js';
import { UI, formatTime } from './ui/ui.js';
import { sfx } from './game/audio.js';
import { loadSave, writeSave, clearSave, loadPrefs, writePrefs } from './game/save.js';
import { drawSilhouette } from './game/textures.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

// ---------------------------------------------------------------- setup
const canvas = document.getElementById('scene');
const dpr = Math.min(window.devicePixelRatio || 1, 2);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: dpr < 1.5, powerPreference: 'high-performance', preserveDrawingBuffer: false });
renderer.setPixelRatio(dpr);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x2a1745);
scene.fog = new THREE.Fog(0x2a1745, 16, 38);

// soft image-based lighting so gold & glass have something to reflect
const pmrem = new THREE.PMREMGenerator(renderer);
const envMap = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
pmrem.dispose();

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 80);
camera.position.set(0, 4, 4);

const museum = new Museum(scene, content);
const player = new Player(scene, museum);
// only metallic / glassy materials get reflections, so the violet walls keep their colour
scene.traverse((o) => {
  if (!o.isMesh) return;
  for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
    if (m.isMeshStandardMaterial && m.metalness >= 0.3 && !m.envMap) { m.envMap = envMap; m.envMapIntensity = 0.9; m.needsUpdate = true; }
  }
});
const ui = new UI(document.getElementById('ui'), content, sfx);

const rooms = content.rooms;
const ROOMS = rooms.length;
const allExhibits = rooms.flatMap((r) => r.exhibits);
const MAX_STARS = allExhibits.length * 3;

// ---------------------------------------------------------------- state
const prefs = loadPrefs();
sfx.setMuted(!!prefs.muted);
ui.setMuted(!!prefs.muted);

let save = loadSave();
const freshSave = () => ({ v: 1, characterId: null, results: {}, progress: {}, elapsed: 0, timerOn: false, finished: false });
if (save && save.v !== 1) save = null;

let mode = 'intro'; // intro | select | play | finale | summary
let currentRoom = -1;
let nearCase = null;
let modal = null; // 'clue' | 'reveal' | null
let selectIndex = 0;
let lastSaveAt = 0;
const clock = new THREE.Clock();

function persist() { writeSave(save); }

function roomSolved(i) { return rooms[i].exhibits.every((e) => save.results[e.id] !== undefined); }
function collectedFor(i) { return rooms[i].exhibits.map((e) => save.results[e.id] !== undefined); }
function totalStars() { return Object.values(save.results).reduce((a, b) => a + b, 0); }

function charDef(id) { return content.characters.find((c) => c.id === id) || content.characters[0]; }

function applyCharacter(def) { player.setCharacter(new Character(def)); }

// ---------------------------------------------------------------- flow
function showIntro() {
  mode = 'intro';
  ui.showHud(false);
  applyCharacter(content.characters[0]);
  player.teleport(0, -3.6, 0);
  ui.showIntro({
    hasSave: !!(save && save.characterId && !save.finished),
    timer: save ? save.timerOn : false,
    onStart: (timerOn) => {
      clearSave();
      save = freshSave();
      save.timerOn = timerOn;
      showSelect();
    },
    onContinue: (timerOn) => {
      save.timerOn = timerOn;
      startPlay();
    },
  });
}

function showSelect() {
  mode = 'select';
  selectIndex = 0;
  applyCharacter(content.characters[0]);
  player.teleport(0, -3.6, 0);
  ui.showCharacterSelect(content.characters, 0, (i) => {
    selectIndex = i;
    applyCharacter(content.characters[i]);
  }, (i) => {
    save.characterId = content.characters[i].id;
    persist();
    startPlay();
  });
}

function startPlay() {
  ui.closeScreen();
  mode = 'play';
  applyCharacter(charDef(save.characterId));
  // restore cases + doors
  museum.cases.forEach((c) => c.setSolved(save.results[c.exhibit.id] !== undefined));
  rooms.forEach((r, i) => {
    museum.doors[i].setProgress(collectedFor(i), roomSolved(i));
    if (roomSolved(i)) museum.openDoor(i, true);
  });
  // resume at the first room that is not solved yet (or the finale hall)
  let furthest = 0;
  while (furthest < ROOMS && roomSolved(furthest)) furthest++;
  player.rebuildNav();
  const z = furthest === 0 ? -4.2 : roomFrontZ(furthest) - 2.2;
  player.teleport(0, z, Math.PI);
  player.locked = false;
  currentRoom = -1;
  ui.showHud(true);
  ui.setStars(totalStars(), MAX_STARS);
  ui.setTimer(save.timerOn ? formatTime(save.elapsed) : null);
  snapCamera();
  persist();
}

function enterRoom(i) {
  currentRoom = i;
  museum.setActiveRoom(i);
  if (i < ROOMS) {
    ui.setRoom(i, ROOMS, rooms[i].title);
    ui.setCode(rooms[i].code, collectedFor(i));
    ui.setHint();
  } else {
    ui.setRoom(i, ROOMS, content.game.finaleRoomTitle);
    ui.setCode('', []);
    ui.setHint(content.game.finaleHint);
    ui.toast(content.game.finaleHint, 3800);
  }
}

// ---------------------------------------------------------------- exhibits
function openCase(c) {
  if (mode !== 'play' || c.roomIndex !== currentRoom) return;
  const ex = c.exhibit;
  player.clearPath();
  // face the case
  player.heading = Math.atan2(c.pos.x - player.position.x, c.pos.z - player.position.z);
  sfx.open();
  if (save.results[ex.id] !== undefined) {
    modal = 'reveal';
    const { sil } = ui.showReveal(ex, save.results[ex.id], ex.letter, () => { ui.closeCard(); modal = null; }, 'Close');
    paintSil(sil, ex);
    return;
  }
  modal = 'clue';
  ui.setHint(' ');
  ui.openClue(ex, save.progress[ex.id], {
    onProgress: (p) => { save.progress[ex.id] = { cluesShown: p.cluesShown, wrongs: p.wrongs }; persist(); },
    onClose: () => { modal = null; ui.setHint(); },
    onDone: (stars) => solveExhibit(c, stars),
  });
}

function paintSil(canvasEl, ex) {
  const g = canvasEl.getContext('2d');
  const s = ex.silhouettes || ['bun'];
  if (s.length === 1) drawSilhouette(g, 110, 180, 170, s[0], '#8e5bd1');
  else { drawSilhouette(g, 72, 180, 150, s[0], '#8e5bd1'); drawSilhouette(g, 148, 180, 150, s[1], '#6d3fb3'); }
}

function solveExhibit(c, stars) {
  const ex = c.exhibit;
  save.results[ex.id] = stars;
  delete save.progress[ex.id];
  persist();
  c.setSolved(true);
  modal = 'reveal';
  const { sil } = ui.showReveal(ex, stars, ex.letter, (letterEl) => {
    sfx.letter();
    ui.flyLetter(ex.letter, letterEl, c.index, () => {
      modal = null;
      ui.setHint();
      const i = c.roomIndex;
      ui.setCode(rooms[i].code, collectedFor(i));
      ui.setStars(totalStars(), MAX_STARS);
      const open = roomSolved(i);
      museum.doors[i].setProgress(collectedFor(i), open);
      if (open) {
        setTimeout(() => {
          museum.openDoor(i);
          player.rebuildNav();
          sfx.door();
          ui.toast(`Code ${rooms[i].code} complete. The door is open!`);
        }, 350);
      }
    });
  }, `Collect the letter ${ex.letter}`);
  paintSil(sil, ex);
}

// ---------------------------------------------------------------- finale
let finaleT = 0;
function startFinale() {
  mode = 'finale';
  finaleT = 0;
  save.finished = true;
  persist();
  player.clearPath();
  player.locked = true;
  ui.showPrompt(null);
  ui.setHint(' ');
}

function updateFinale(dt) {
  finaleT += dt;
  const c = museum.finaleCentre;
  // glide to the centre of the 13th pedestal and face the mirror
  player.position.x += (c.x - player.position.x) * Math.min(1, dt * 3);
  player.position.z += (c.z - player.position.z) * Math.min(1, dt * 3);
  let dh = Math.PI - player.heading;
  dh = Math.atan2(Math.sin(dh), Math.cos(dh));
  player.heading += dh * Math.min(1, dt * 3);
  if (finaleT > 1.4 && !updateFinale.cheered) {
    updateFinale.cheered = true;
    player.character.setState('cheer');
    sfx.finale();
    ui.showHud(false);
    ui.showFinaleMessage(content.game.finalMessage, content.game.finaleTagline);
    museum.pedestal13.q.visible = false;
    museum.pedestal13.beam.visible = false;
  }
  if (finaleT > 7.5 && mode === 'finale') {
    mode = 'summary';
    ui.hideFinaleMessage();
    ui.showHud(false);
    ui.showSummary({
      stars: totalStars(),
      max: MAX_STARS,
      time: save.elapsed,
      list: allExhibits.map((e) => ({ letter: e.letter, name: e.name, stars: save.results[e.id] ?? 0 })),
      onPlayAgain: () => {
        clearSave();
        window.location.reload();
      },
    });
  }
}

// Plaques between the camera and the player become see-through.
function fadeOccluders(dt) {
  for (const c of museum.cases) {
    const m = c.plaque.material;
    const p = player.position;
    const blocking = mode === 'play' && c.roomIndex === currentRoom && p.z < c.pos.z - 0.3 && camera.position.z > c.pos.z && Math.abs(c.pos.x - (p.x + camera.position.x) / 2) < 1.6;
    const target = blocking ? 0.18 : 1;
    m.opacity += (target - m.opacity) * Math.min(1, dt * 8);
  }
}

// ---------------------------------------------------------------- camera
const camTarget = new THREE.Vector3();
const camLook = new THREE.Vector3();
const lookNow = new THREE.Vector3(0, 1, -3);

function desiredCamera(outPos, outLook) {
  const ov = window.__stem && window.__stem.camOverride;
  if (ov) { outPos.set(...ov.pos); outLook.set(...ov.look); return; }
  const p = player.position;
  const aspect = window.innerWidth / window.innerHeight;
  if (mode === 'intro' || mode === 'select') {
    const portrait = aspect < 0.8;
    outPos.set(0, 1.25, p.z + (portrait ? 4.4 : 3.1));
    outLook.set(0, portrait ? 0.35 : 0.55, p.z);
    if (mode === 'intro') { outPos.set(0, 3.2, p.z + 2.9); outLook.set(0, 2.2, p.z - 6); }
    return;
  }
  if (mode === 'finale' || mode === 'summary') {
    const c = museum.finaleCentre;
    const k = Math.min(1, finaleT / 2.5);
    outPos.set(c.x, 1.85 + (1 - k) * 2, c.z + 2.6 + (1 - k) * 2.5);
    outLook.set(c.x, 1.5, c.z - 6);
    return;
  }
  const far = aspect < 0.8 ? 1.45 : aspect < 1.2 ? 1.15 : 1;
  const ox = 0, oy = 3.9 * far, oz = 6.0 * far;
  outPos.set(p.x * 0.85 + ox, oy, p.z + oz);
  const room = museum.roomAt(p.z);
  const limit = roomFrontZ(room) - 0.5;
  if (outPos.z > limit) {
    const over = outPos.z - limit;
    outPos.z = limit;
    outPos.y += over * 0.18;
  }
  outLook.set(p.x * 0.95, 1.5, p.z - 3.2);
}

function snapCamera() {
  desiredCamera(camTarget, camLook);
  camera.position.copy(camTarget);
  lookNow.copy(camLook);
  camera.lookAt(lookNow);
}

function updateCamera(dt) {
  desiredCamera(camTarget, camLook);
  const k = 1 - Math.exp(-dt * (mode === 'finale' ? 2 : 5));
  camera.position.lerp(camTarget, k);
  lookNow.lerp(camLook, k);
  camera.lookAt(lookNow);
  const aspect = window.innerWidth / window.innerHeight;
  // keep a usable horizontal field of view on portrait phones
  const fov = Math.round(THREE.MathUtils.clamp((2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(27)) / aspect) * 180) / Math.PI, 50, 76));
  if (camera.fov !== fov) { camera.fov = fov; camera.updateProjectionMatrix(); }
}

// ---------------------------------------------------------------- input
const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();
let downAt = null;

canvas.addEventListener('pointerdown', (e) => {
  downAt = { x: e.clientX, y: e.clientY, t: performance.now() };
  sfx.unlock();
});
canvas.addEventListener('pointerup', (e) => {
  if (!downAt) return;
  const moved = Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y);
  downAt = null;
  if (moved > 14) return;
  handleTap(e.clientX, e.clientY);
});

function pick(clientX, clientY) {
  ndc.set((clientX / window.innerWidth) * 2 - 1, -(clientY / window.innerHeight) * 2 + 1);
  raycaster.setFromCamera(ndc, camera);
  const pickables = museum.cases.filter((c) => c.roomIndex === currentRoom).flatMap((c) => c.pickables);
  const hitCase = raycaster.intersectObjects(pickables, false)[0];
  if (hitCase) return { case: hitCase.object.userData.case };
  const hitFloor = raycaster.intersectObject(museum.floor, false)[0];
  if (hitFloor) return { point: hitFloor.point };
  return null;
}

function handleTap(x, y) {
  if (mode !== 'play' || modal === 'reveal') return;
  const hit = pick(x, y);
  if (!hit) return;
  if (modal === 'clue') { ui.closeCard(); modal = null; ui.setHint(); }
  if (hit.case) {
    const c = hit.case;
    if (nearCase === c) openCase(c);
    else player.walkTo(c.approach, () => openCase(c));
  } else if (hit.point) {
    player.walkTo(hit.point);
  }
}

const MOVE_KEYS = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
window.addEventListener('keydown', (e) => {
  if (mode !== 'play') return;
  if (MOVE_KEYS.includes(e.code)) {
    if (modal) return;
    player.keys.add(e.code);
    e.preventDefault();
  }
  if ((e.code === 'KeyE' || e.code === 'Enter' || e.code === 'Space') && !modal && nearCase) {
    e.preventDefault();
    openCase(nearCase);
  }
  if (e.code === 'Escape' && modal === 'clue') { ui.closeCard(); modal = null; ui.setHint(); }
});
window.addEventListener('keyup', (e) => player.keys.delete(e.code));
window.addEventListener('blur', () => player.keys.clear());

ui.onMute = () => {
  const m = !sfx.isMuted();
  sfx.setMuted(m);
  ui.setMuted(m);
  prefs.muted = m;
  writePrefs(prefs);
};

function onResize() {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', onResize);
window.addEventListener('orientationchange', () => setTimeout(onResize, 200));

// ---------------------------------------------------------------- loop
function frame() {
  const dt = Math.min(clock.getDelta(), 0.05) * (window.__stem ? window.__stem.timeScale : 1);
  const t = clock.elapsedTime;

  if (mode === 'select' || mode === 'intro') {
    player.heading = mode === 'select' ? Math.sin(t * 0.5) * 0.6 : 0;
    player.update(dt);
    if (currentRoom !== 0) { currentRoom = 0; museum.setActiveRoom(0); }
  } else {
    player.locked = mode !== 'play' || modal === 'reveal';
    if (modal) player.keys.clear();
    player.update(dt);
    const room = museum.roomAt(player.position.z);
    if (room !== currentRoom) enterRoom(room);
    if (mode === 'play') {
      // proximity glow
      nearCase = null;
      let best = 2.2;
      for (const c of museum.cases) {
        c.glow = false;
        if (c.roomIndex !== currentRoom) continue;
        const d = Math.hypot(c.pos.x - player.position.x, c.pos.z - player.position.z);
        if (d < best) { best = d; nearCase = c; }
      }
      if (nearCase) nearCase.glow = true;
      ui.showPrompt(nearCase && !modal ? (ui.touch ? 'Tap the glowing case' : 'Click the case or press E') : null);
      // finale trigger: step onto the 13th pedestal
      if (currentRoom === ROOMS) {
        const c = museum.finaleCentre;
        if (Math.hypot(player.position.x - c.x, player.position.z - c.z) < 0.75) startFinale();
      }
      save.elapsed += dt;
      if (save.timerOn) ui.setTimer(formatTime(save.elapsed));
      if (t - lastSaveAt > 3) { lastSaveAt = t; persist(); }
    }
    if (mode === 'finale' || mode === 'summary') updateFinale(dt);
    // step up onto the 13th pedestal
    if (currentRoom === ROOMS) {
      const c = museum.finaleCentre;
      const d = Math.hypot(player.position.x - c.x, player.position.z - c.z);
      player.root.position.y = d < 0.8 ? museum.pedestal13.height : 0;
    }
  }
  fadeOccluders(dt);
  museum.update(t, dt, player.position);
  updateCamera(dt);
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

// ---------------------------------------------------------------- test / debug hook
window.__stem = {
  get mode() { return mode; },
  get room() { return currentRoom; },
  get modal() { return modal; },
  get save() { return save; },
  content,
  player,
  museum,
  caseScreenPos(id) {
    const c = museum.cases.find((x) => x.exhibit.id === id);
    const v = c.pos.clone().setY(1.5).project(camera);
    return { x: ((v.x + 1) / 2) * window.innerWidth, y: ((1 - v.y) / 2) * window.innerHeight };
  },
  floorScreenPos(x, z) {
    const v = new THREE.Vector3(x, 0, z).project(camera);
    return { x: ((v.x + 1) / 2) * window.innerWidth, y: ((1 - v.y) / 2) * window.innerHeight };
  },
  walkToCase(id) {
    const c = museum.cases.find((x) => x.exhibit.id === id);
    return player.walkTo(c.approach, () => openCase(c));
  },
  walkTo(x, z) { return player.walkTo(new THREE.Vector3(x, 0, z)); },
  timeScale: 1,
};

save = save || freshSave();
if (!loadSave()) save = freshSave();
showIntro();
snapCamera();
requestAnimationFrame(frame);
