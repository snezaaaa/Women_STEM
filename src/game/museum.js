import * as THREE from 'three';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import { Reflector } from 'three/examples/jsm/objects/Reflector.js';
import fontJson from 'three/examples/fonts/optimer_bold.typeface.json';
import { buildExhibitObject } from './exhibits.js';
import {
  checkerTexture, wallTexture, radialGlowTexture, ringTexture, plaqueTexture, updatePlaqueTexture,
  keypadTexture, updateKeypadTexture, figureTexture, nameCardTexture,
} from './textures.js';

export const ROOM_W = 18;
export const ROOM_D = 16;
export const FINALE_D = 20;
export const WALL_H = 6.5;
const WALL_T = 0.4;
const DOOR_W = 2.6;
const DOOR_H = 3.6;
const CASE_X = [-5.5, 0, 5.5];
const CASE_OFFSET_Z = 8.2; // from the room's front wall

const font = new FontLoader().parse(fontJson);

export function roomFrontZ(i) { return -i * ROOM_D; }
export function roomBackZ(i, count) { return i < count ? -(i + 1) * ROOM_D : -(count * ROOM_D) - FINALE_D; }

export class Museum {
  constructor(scene, content) {
    this.scene = scene;
    this.content = content;
    this.rooms = content.rooms;
    this.count = this.rooms.length;
    this.group = new THREE.Group();
    scene.add(this.group);
    this._cur = this.group;
    this.roomGroups = [];
    this.colliders = [];
    this.cases = [];
    this.doors = [];
    this.animated = [];
    this.mats = this._materials();
    this.totalDepth = this.count * ROOM_D + FINALE_D;
    this._buildShell();
    this.rooms.forEach((room, i) => this._buildRoom(room, i));
    this._buildFinale();
    this._buildLights();
  }

  _materials() {
    const floorTex = checkerTexture(ROOM_W / 2, (this.count * ROOM_D + FINALE_D) / 2);
    return {
      floor: new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.55, metalness: 0.05 }),
      wall: new THREE.MeshStandardMaterial({ map: wallTexture(6, 2), color: 0xffffff, roughness: 0.9 }),
      wallSide: new THREE.MeshStandardMaterial({ map: wallTexture(8, 2), color: 0xffffff, roughness: 0.9 }),
      gold: new THREE.MeshStandardMaterial({ color: 0xe0b24a, metalness: 0.9, roughness: 0.28, emissive: 0x3a2600 }),
      white: new THREE.MeshStandardMaterial({ color: 0xf7f4ef, roughness: 0.45 }),
      velvet: new THREE.MeshStandardMaterial({ color: 0x2a1a40, roughness: 0.95 }),
      led: new THREE.MeshBasicMaterial({ color: 0xfff6dd }),
      glass: new THREE.MeshStandardMaterial({ color: 0xe8f4ff, transparent: true, opacity: 0.1, roughness: 0.04, metalness: 0.3, depthWrite: false }),
      door: new THREE.MeshStandardMaterial({ color: 0x3a2360, roughness: 0.5, metalness: 0.2 }),
      dark: new THREE.MeshStandardMaterial({ color: 0x2b1b45, roughness: 0.6 }),
      cone: new THREE.MeshBasicMaterial({ color: 0xfff1c9, transparent: true, opacity: 0.035, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }),
      pool: new THREE.MeshBasicMaterial({ map: radialGlowTexture(), transparent: true, depthWrite: false, opacity: 0.55, blending: THREE.AdditiveBlending }),
    };
  }

  _box(w, h, d, mat, x, y, z, { collide = false, shadow = false, parent = this._cur } = {}) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    m.receiveShadow = true;
    m.castShadow = shadow;
    parent.add(m);
    if (collide) this.addCollider(x - w / 2, x + w / 2, z - d / 2, z + d / 2);
    return m;
  }

  addCollider(minX, maxX, minZ, maxZ, tag = 'static') {
    const c = { minX, maxX, minZ, maxZ, enabled: true, tag };
    this.colliders.push(c);
    return c;
  }

  _buildShell() {
    const len = this.totalDepth;
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_W, len), this.mats.floor);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0, -len / 2);
    floor.receiveShadow = true;
    floor.name = 'floor';
    this._cur.add(floor);
    this.floor = floor;
    // side walls (one long wall per side) + trims
    for (const s of [-1, 1]) {
      const x = s * (ROOM_W / 2 + WALL_T / 2);
      const w = this._box(WALL_T, WALL_H, len, this.mats.wallSide, x, WALL_H / 2, -len / 2, { collide: true });
      w.material.map.repeat.set(len / 2.2, 2);
      this._box(0.06, 0.22, len, this.mats.gold, s * (ROOM_W / 2 - 0.03), 0.11, -len / 2);
      this._box(0.08, 0.12, len, this.mats.gold, s * (ROOM_W / 2 - 0.04), 2.6, -len / 2);
      this._box(0.1, 0.18, len, this.mats.gold, s * (ROOM_W / 2 - 0.05), WALL_H - 0.09, -len / 2);
    }
    // front wall (entrance) at z = 0
    this._box(ROOM_W + WALL_T * 2, WALL_H, WALL_T, this.mats.wall, 0, WALL_H / 2, WALL_T / 2, { collide: true });
    // far back wall of the finale
    const bz = -len - WALL_T / 2;
    this._box(ROOM_W + WALL_T * 2, WALL_H, WALL_T, this.mats.wall, 0, WALL_H / 2, bz, { collide: true });
  }

  _titleText(text, z, y = 5.05, maxWidth = 13.5) {
    const size = Math.min(0.72, maxWidth / (text.length * 0.62));
    const geo = new TextGeometry(text, { font, size, depth: 0.06, curveSegments: 3, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.01, bevelSegments: 1 });
    geo.computeBoundingBox();
    const bb = geo.boundingBox;
    geo.translate(-(bb.max.x + bb.min.x) / 2, 0, 0);
    let w = bb.max.x - bb.min.x;
    const m = new THREE.Mesh(geo, this.mats.gold);
    if (w > maxWidth) { m.scale.setScalar(maxWidth / w); w = maxWidth; }
    m.position.set(0, y, z);
    this._cur.add(m);
    return m;
  }

  _backWallWithDoor(z, roomIndex, room) {
    const side = (ROOM_W + WALL_T * 2 - DOOR_W) / 2;
    const lx = -(DOOR_W / 2 + side / 2);
    this._box(side, WALL_H, WALL_T, this.mats.wall, lx, WALL_H / 2, z, { collide: true });
    this._box(side, WALL_H, WALL_T, this.mats.wall, -lx, WALL_H / 2, z, { collide: true });
    this._box(DOOR_W, WALL_H - DOOR_H, WALL_T, this.mats.wall, 0, DOOR_H + (WALL_H - DOOR_H) / 2, z);
    // trims on both faces
    for (const f of [1, -1]) {
      const fz = z + f * (WALL_T / 2 + 0.03);
      for (const sx of [-1, 1]) {
        const cx = sx * (DOOR_W / 2 + side / 2);
        this._box(side, 0.22, 0.06, this.mats.gold, cx, 0.11, fz);
        this._box(side, 0.12, 0.08, this.mats.gold, cx, 2.6, fz);
        this._box(side, 0.18, 0.1, this.mats.gold, cx, WALL_H - 0.09, fz);
      }
      this._box(DOOR_W, 0.18, 0.1, this.mats.gold, 0, WALL_H - 0.09, fz);
      // door frame
      this._box(0.18, DOOR_H + 0.18, 0.14, this.mats.gold, -DOOR_W / 2 - 0.09, (DOOR_H + 0.18) / 2, fz);
      this._box(0.18, DOOR_H + 0.18, 0.14, this.mats.gold, DOOR_W / 2 + 0.09, (DOOR_H + 0.18) / 2, fz);
      this._box(DOOR_W + 0.36, 0.18, 0.14, this.mats.gold, 0, DOOR_H + 0.09, fz);
    }
    // door panels (slide into the wall)
    const panels = [];
    for (const s of [-1, 1]) {
      const p = new THREE.Group();
      p.position.set(s * DOOR_W / 4, 0, z);
      const slab = this._box(DOOR_W / 2, DOOR_H, 0.16, this.mats.door, 0, DOOR_H / 2, 0, { parent: p });
      slab.castShadow = false;
      this._box(DOOR_W / 2 - 0.3, DOOR_H - 0.8, 0.18, this.mats.dark, 0, DOOR_H / 2, 0, { parent: p });
      this._box(0.06, 0.5, 0.24, this.mats.gold, -s * (DOOR_W / 4 - 0.18), DOOR_H / 2, 0, { parent: p });
      this._box(DOOR_W / 2 - 0.3, 0.05, 0.2, this.mats.gold, 0, DOOR_H - 0.4, 0, { parent: p });
      this._box(DOOR_W / 2 - 0.3, 0.05, 0.2, this.mats.gold, 0, 0.4, 0, { parent: p });
      this._cur.add(p);
      panels.push(p);
    }
    const collider = this.addCollider(-DOOR_W / 2, DOOR_W / 2, z - WALL_T / 2, z + WALL_T / 2, 'door');
    // keypad on the room side of the wall
    const kz = z + WALL_T / 2 + 0.02;
    const kTex = keypadTexture(room.code);
    const keypad = new THREE.Mesh(new THREE.PlaneGeometry(0.68, 0.8), new THREE.MeshBasicMaterial({ map: kTex }));
    keypad.position.set(DOOR_W / 2 + 0.95, 1.65, kz + 0.04);
    this._cur.add(keypad);
    this._box(0.8, 0.92, 0.06, this.mats.gold, keypad.position.x, 1.65, kz + 0.005);
    const lightMat = new THREE.MeshStandardMaterial({ color: 0xff3b3b, emissive: 0xff2222, emissiveIntensity: 2 });
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 10), lightMat);
    lamp.position.set(keypad.position.x, 2.32, kz + 0.08);
    this._cur.add(lamp);
    const lampGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: radialGlowTexture('255,80,80'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    lampGlow.scale.setScalar(0.8);
    lampGlow.position.copy(lamp.position);
    this._cur.add(lampGlow);
    // lamp over the door
    const door = {
      roomIndex,
      z,
      code: room.code,
      panels,
      collider,
      open: false,
      openT: 0,
      kTex,
      lightMat,
      lampGlow,
      keypadPos: keypad.position.clone(),
      setProgress: (collected, open) => {
        updateKeypadTexture(kTex, room.code, collected, open);
        lightMat.color.set(open ? 0x3bff7a : 0xff3b3b);
        lightMat.emissive.set(open ? 0x22ff66 : 0xff2222);
        lampGlow.material.map = radialGlowTexture(open ? '80,255,140' : '255,80,80');
        lampGlow.material.needsUpdate = true;
      },
    };
    this.doors.push(door);
    return door;
  }

  _beginRoomGroup() {
    const g = new THREE.Group();
    this.group.add(g);
    this.roomGroups.push(g);
    this._cur = g;
    return g;
  }

  _buildRoom(room, i) {
    this._beginRoomGroup();
    const z0 = roomFrontZ(i);
    const zb = roomBackZ(i, this.count);
    this._backWallWithDoor(zb - WALL_T / 2 + 0.0, i, room);
    const faceZ = zb + 0.02;
    this._titleText(room.title, faceZ);
    // small room number above
    const label = this._titleText(`ROOM ${i + 1}`, faceZ, 5.95, 3);
    label.scale.multiplyScalar(0.45);
    // decorative columns
    for (const sx of [-1, 1]) {
      for (const dz of [1.2, ROOM_D - 1.2]) {
        const col = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, WALL_H, 12), this.mats.white);
        col.position.set(sx * (ROOM_W / 2 - 0.35), WALL_H / 2, z0 - dz);
        col.receiveShadow = true;
        this._cur.add(col);
        this._box(0.8, 0.2, 0.8, this.mats.gold, col.position.x, 0.1, col.position.z);
        this._box(0.8, 0.2, 0.8, this.mats.gold, col.position.x, WALL_H - 0.1, col.position.z);
        this.addCollider(col.position.x - 0.4, col.position.x + 0.4, col.position.z - 0.4, col.position.z + 0.4);
      }
    }
    // framed abstract art on side walls
    for (const sx of [-1, 1]) {
      const fx = sx * (ROOM_W / 2 - 0.06);
      const art = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.6), new THREE.MeshStandardMaterial({ map: artTexture(i * 2 + (sx > 0 ? 1 : 0)), roughness: 0.8 }));
      art.position.set(fx - sx * 0.02, 3.8, z0 - ROOM_D / 2 + 1.5);
      art.rotation.y = -sx * Math.PI / 2;
      this._cur.add(art);
      const frame = this._box(0.06, 1.8, 2.6, this.mats.gold, fx, 3.8, art.position.z);
      frame.position.x = fx + sx * 0.0;
    }
    // benches near the entrance (sides)
    for (const sx of [-1, 1]) {
      const bx = sx * 6.2, bz = z0 - 3.2;
      this._box(2.0, 0.08, 0.6, this.mats.dark, bx, 0.48, bz);
      this._box(0.12, 0.44, 0.5, this.mats.gold, bx - 0.85, 0.22, bz);
      this._box(0.12, 0.44, 0.5, this.mats.gold, bx + 0.85, 0.22, bz);
      this.addCollider(bx - 1.05, bx + 1.05, bz - 0.35, bz + 0.35);
    }
    room.exhibits.forEach((ex, j) => this._buildCase(ex, i, j, new THREE.Vector3(CASE_X[j], 0, z0 - CASE_OFFSET_Z)));
  }

  _buildCase(exhibit, roomIndex, j, pos) {
    const g = new THREE.Group();
    g.position.copy(pos);
    this._cur.add(g);
    // bigger display case: pedestal 1.4 m wide, glass 1.3 × 1.15 m
    const PW = 1.4, PH = 0.95, GW = 1.3, GH = 1.15;
    const gy = PH + GH / 2;
    const pedestal = this._box(PW, PH, PW, this.mats.white, 0, PH / 2, 0, { parent: g, shadow: false });
    this._box(PW + 0.08, 0.08, PW + 0.08, this.mats.gold, 0, PH, 0, { parent: g });
    this._box(PW + 0.08, 0.1, PW + 0.08, this.mats.gold, 0, 0.05, 0, { parent: g });
    // dark velvet display floor so the objects stand out
    this._box(GW - 0.04, 0.012, GW - 0.04, this.mats.velvet, 0, PH + 0.045, 0, { parent: g });
    const glass = this._box(GW, GH, GW, this.mats.glass, 0, gy, 0, { parent: g });
    glass.renderOrder = 2;
    const h = GW / 2;
    for (const [x, z] of [[-h, -h], [h, -h], [-h, h], [h, h]]) this._box(0.035, GH, 0.035, this.mats.gold, x, gy, z, { parent: g });
    this._box(GW + 0.06, 0.05, GW + 0.06, this.mats.gold, 0, PH + GH + 0.025, 0, { parent: g });
    // LED strip under the lid lights the object from above
    this._box(GW - 0.2, 0.015, 0.06, this.mats.led, 0, PH + GH - 0.01, 0.35, { parent: g });
    this._box(GW - 0.2, 0.015, 0.06, this.mats.led, 0, PH + GH - 0.01, -0.35, { parent: g });
    const obj = buildExhibitObject(exhibit.object);
    obj.group.position.y = PH + 0.05;
    obj.group.scale.setScalar(1.38);
    g.add(obj.group);
    this.animated.push(obj);
    // plaque above the case
    const tex = plaqueTexture(exhibit, false);
    const plaque = new THREE.Mesh(new THREE.PlaneGeometry(1.25, 1.46), new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
    plaque.position.set(0, PH + GH + 1.05, 0.05);
    plaque.rotation.x = -0.18;
    g.add(plaque);
    for (const x of [-0.45, 0.45]) this._box(0.03, 0.34, 0.03, this.mats.gold, x, PH + GH + 0.2, 0.0, { parent: g });
    // spotlight cone + light pool
    const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 1.35, WALL_H - 0.4, 20, 1, true), this.mats.cone);
    cone.position.set(0, (WALL_H - 0.4) / 2 + 0.2, 0);
    g.add(cone);
    const fixture = this._box(0.3, 0.2, 0.3, this.mats.dark, 0, WALL_H - 0.1, 0, { parent: g });
    fixture.castShadow = false;
    const pool = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 3.6), this.mats.pool);
    pool.rotation.x = -Math.PI / 2;
    pool.position.y = 0.012;
    g.add(pool);
    // gold glow ring on the floor
    const ring = new THREE.Mesh(
      new THREE.PlaneGeometry(2.9, 2.9),
      new THREE.MeshBasicMaterial({ map: ringTexture(), transparent: true, depthWrite: false, opacity: 0, blending: THREE.AdditiveBlending })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.02;
    g.add(ring);
    const collider = this.addCollider(pos.x - 0.76, pos.x + 0.76, pos.z - 0.76, pos.z + 0.76);
    const caseObj = {
      exhibit,
      roomIndex,
      index: j,
      group: g,
      pos: pos.clone(),
      approach: new THREE.Vector3(pos.x, 0, pos.z + 1.55),
      object: obj,
      objectCentreY: PH + 0.42,
      pickables: [pedestal, glass, plaque],
      ring,
      plaque,
      tex,
      glow: 0,
      solved: false,
      collider,
      setSolved: (solved) => {
        caseObj.solved = solved;
        updatePlaqueTexture(tex, exhibit, solved);
      },
    };
    [pedestal, glass, plaque].forEach((m) => { m.userData.case = caseObj; });
    this.cases.push(caseObj);
  }

  _buildFinale() {
    this._beginRoomGroup();
    const i = this.count;
    const z0 = roomFrontZ(i);
    const zb = roomBackZ(i, this.count);
    this.finaleZ0 = z0;
    this._titleText(this.content.game.finaleRoomTitle || 'The Hall of Names', zb + 0.02, 5.6);
    // mirror
    const mw = 6.4, mh = 4.4;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.mirror = new Reflector(new THREE.PlaneGeometry(mw, mh), {
      textureWidth: Math.min(1024, Math.round(window.innerWidth * dpr * 0.7)),
      textureHeight: Math.min(1024, Math.round(window.innerHeight * dpr * 0.7)),
      color: 0xb8b0c8,
    });
    this.mirror.position.set(0, 0.6 + mh / 2, zb + 0.06);
    this.mirror.visible = false;
    this._cur.add(this.mirror);
    const fz = zb + 0.05;
    this._box(mw + 0.4, 0.2, 0.1, this.mats.gold, 0, 0.6 + mh + 0.1, fz);
    this._box(mw + 0.4, 0.2, 0.1, this.mats.gold, 0, 0.5, fz);
    this._box(0.2, mh + 0.4, 0.1, this.mats.gold, -mw / 2 - 0.1, 0.6 + mh / 2, fz);
    this._box(0.2, mh + 0.4, 0.1, this.mats.gold, mw / 2 + 0.1, 0.6 + mh / 2, fz);
    // 12 pedestals in a semicircle opening toward the mirror
    const centre = new THREE.Vector3(0, 0, zb + 5.0);
    this.finaleCentre = centre;
    const all = this.rooms.flatMap((r) => r.exhibits);
    const radius = 5.2;
    this.hallFigures = [];
    all.forEach((ex, k) => {
      // angles across the front half (towards the entrance), with a gap in the middle to walk in
      const left = k < 6;
      const t = (k % 6) / 5;
      // left group: from beside the mirror round to the entrance gap; right group mirrors it
      const a = left ? Math.PI + 0.3 - t * (Math.PI / 2) : Math.PI / 2 - 0.3 - t * (Math.PI / 2);
      const p = new THREE.Vector3(centre.x + Math.cos(a) * radius, 0, centre.z + Math.sin(a) * radius);
      const g = new THREE.Group();
      g.position.copy(p);
      g.lookAt(centre.x, 0, centre.z);
      this._cur.add(g);
      this._box(0.9, 0.7, 0.9, this.mats.white, 0, 0.35, 0, { parent: g });
      this._box(0.98, 0.06, 0.98, this.mats.gold, 0, 0.7, 0, { parent: g });
      const sil = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.25), new THREE.MeshBasicMaterial({ map: figureTexture(ex), transparent: true, side: THREE.DoubleSide, alphaTest: 0.05 }));
      sil.position.y = 0.73 + 0.62;
      g.add(sil);
      const card = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.3), new THREE.MeshBasicMaterial({ map: nameCardTexture(ex.name), transparent: true }));
      card.position.set(0, 0.42, 0.47);
      g.add(card);
      const back = card.clone();
      back.position.z = -0.47;
      back.rotation.y = Math.PI;
      g.add(back);
      this.addCollider(p.x - 0.5, p.x + 0.5, p.z - 0.5, p.z + 0.5);
      this.hallFigures.push(g);
    });
    // 13th pedestal (empty)
    const p13 = new THREE.Group();
    p13.position.copy(centre);
    this._cur.add(p13);
    this._box(1.3, 0.3, 1.3, this.mats.white, 0, 0.15, 0, { parent: p13 });
    this._box(1.38, 0.06, 1.38, this.mats.gold, 0, 0.3, 0, { parent: p13 });
    const ring13 = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 2.8), new THREE.MeshBasicMaterial({ map: ringTexture(), transparent: true, depthWrite: false, opacity: 0.8, blending: THREE.AdditiveBlending }));
    ring13.rotation.x = -Math.PI / 2;
    ring13.position.y = 0.34;
    p13.add(ring13);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, WALL_H, 24, 1, true), this.mats.cone.clone());
    beam.material.opacity = 0.09;
    beam.position.y = WALL_H / 2;
    p13.add(beam);
    const q = new THREE.Mesh(
      new TextGeometry('?', { font, size: 0.5, depth: 0.08, curveSegments: 4 }).center(),
      this.mats.gold
    );
    q.position.y = 1.6;
    p13.add(q);
    this.pedestal13 = { group: p13, ring: ring13, q, beam, height: 0.33 };
    this.animated.push({ update: (t) => { q.rotation.y = t * 1.2; q.position.y = 1.6 + Math.sin(t * 2) * 0.1; ring13.material.opacity = 0.55 + Math.sin(t * 3) * 0.25; } });
    // finale spotlights pools
    const pool = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), this.mats.pool.clone());
    pool.material.opacity = 0.35;
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(centre.x, 0.011, centre.z + 1);
    this._cur.add(pool);
  }

  _buildLights() {
    const hemi = new THREE.HemisphereLight(0xf3e9ff, 0x6b5a46, 0.95);
    this.scene.add(hemi);
    this.scene.add(new THREE.AmbientLight(0x8a70b8, 0.35));
    const sun = new THREE.DirectionalLight(0xfff3e0, 1.25);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -5;
    sun.shadow.camera.right = 5;
    sun.shadow.camera.top = 5;
    sun.shadow.camera.bottom = -5;
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 20;
    sun.shadow.bias = -0.0015;
    sun.shadow.normalBias = 0.02;
    this.scene.add(sun);
    this.scene.add(sun.target);
    this.sun = sun;
    // three real spotlights that follow the current room's cases
    this.spots = [0, 1, 2].map(() => {
      const s = new THREE.SpotLight(0xfff4e0, 42, 9, 0.38, 0.5, 1.3);
      s.castShadow = false;
      this.scene.add(s);
      this.scene.add(s.target);
      return s;
    });
    this.setActiveRoom(0);
  }

  setActiveRoom(i) {
    const roomCases = this.cases.filter((c) => c.roomIndex === i);
    this.spots.forEach((s, k) => {
      const c = roomCases[k];
      if (c) {
        s.visible = true;
        s.position.set(c.pos.x, WALL_H - 0.3, c.pos.z + 0.2);
        s.target.position.set(c.pos.x, 1.3, c.pos.z);
      } else {
        // finale: light the 13th pedestal and the mirror
        const cz = this.finaleCentre.z;
        s.visible = k < 2;
        s.position.set(k === 0 ? 0 : 0, WALL_H - 0.3, cz + (k === 0 ? 1.5 : -3));
        s.target.position.set(0, k === 0 ? 0.5 : 2.5, k === 0 ? cz : cz - 6);
      }
    });
    this.mirror.visible = i >= this.count;
    this.roomGroups.forEach((g, k) => { g.visible = Math.abs(k - i) <= 1; });
  }

  /** Which room (0..count) contains world z. */
  roomAt(z) {
    if (z > roomBackZ(this.count - 1, this.count) - 0.0) {
      return Math.min(this.count - 1, Math.max(0, Math.floor(-z / ROOM_D)));
    }
    return this.count;
  }

  roomBounds(i) {
    return { front: roomFrontZ(i), back: roomBackZ(i, this.count) };
  }

  openDoor(i, instant = false) {
    const d = this.doors[i];
    if (!d || d.open) return;
    d.open = true;
    d.collider.enabled = false;
    if (instant) d.openT = 1;
  }

  update(t, dt, playerPos) {
    for (const a of this.animated) a.update(t);
    for (const d of this.doors) {
      if (d.open && d.openT < 1) d.openT = Math.min(1, d.openT + dt / 1.6);
      const e = d.openT < 0.5 ? 2 * d.openT * d.openT : 1 - Math.pow(-2 * d.openT + 2, 2) / 2;
      d.panels[0].position.x = -DOOR_W / 4 - e * (DOOR_W / 2 - 0.05);
      d.panels[1].position.x = DOOR_W / 4 + e * (DOOR_W / 2 - 0.05);
      d.lampGlow.scale.setScalar(0.7 + Math.sin(t * 4) * 0.08);
    }
    for (const c of this.cases) {
      c.ring.material.opacity += ((c.glow ? 0.65 + Math.sin(t * 4) * 0.25 : 0) - c.ring.material.opacity) * Math.min(1, dt * 8);
    }
    if (playerPos) {
      this.sun.position.set(playerPos.x + 3, 10, playerPos.z + 4);
      this.sun.target.position.set(playerPos.x, 0, playerPos.z);
    }
  }
}

// Abstract geometric "science art" for the side walls (no real people).
const artCache = {};
function artTexture(seed) {
  if (artCache[seed]) return artCache[seed];
  const c = document.createElement('canvas');
  c.width = 384; c.height = 256;
  const g = c.getContext('2d');
  const palettes = [
    ['#2c1a4d', '#f2c14e', '#8e5bd1', '#f7efe1'],
    ['#123047', '#7fd0ff', '#f2c14e', '#ffffff'],
    ['#3a1f2f', '#ff8fa3', '#f2c14e', '#fbe9ef'],
    ['#14332a', '#5dd39e', '#f2c14e', '#eafff5'],
  ];
  const [bg, a, b, d] = palettes[seed % 4];
  g.fillStyle = bg; g.fillRect(0, 0, 384, 256);
  g.lineWidth = 4;
  const kind = seed % 4;
  if (kind === 0) {
    for (let i = 0; i < 6; i++) { g.strokeStyle = i % 2 ? a : b; g.beginPath(); g.arc(192, 128, 20 + i * 18, 0, Math.PI * 2); g.stroke(); }
  } else if (kind === 1) {
    g.strokeStyle = a;
    for (let x = 0; x < 384; x += 6) { const y = 128 + Math.sin(x / 20) * 60 * Math.sin(x / 120); g.beginPath(); g.moveTo(x, y); g.lineTo(x + 6, 128 + Math.sin((x + 6) / 20) * 60 * Math.sin((x + 6) / 120)); g.stroke(); }
    g.fillStyle = b; g.beginPath(); g.arc(320, 60, 22, 0, Math.PI * 2); g.fill();
  } else if (kind === 2) {
    for (let i = 0; i < 7; i++) { g.fillStyle = [a, b, d][i % 3]; g.beginPath(); const x = 40 + i * 50; g.moveTo(x, 200); g.lineTo(x + 25, 200 - 30 - i * 15); g.lineTo(x + 50, 200); g.fill(); }
  } else {
    g.strokeStyle = a;
    for (let i = 0; i < 12; i++) { const y = 20 + i * 18; g.beginPath(); g.moveTo(40, y); g.bezierCurveTo(150, y - 40, 230, y + 40, 344, y); g.stroke(); }
    g.fillStyle = b; g.fillRect(170, 100, 40, 40);
  }
  g.strokeStyle = d; g.lineWidth = 2; g.strokeRect(10, 10, 364, 236);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  artCache[seed] = t;
  return t;
}
