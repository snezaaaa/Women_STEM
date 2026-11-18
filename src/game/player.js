import * as THREE from 'three';
import { ROOM_W } from './museum.js';
import { targetRingTexture, dotTexture } from './textures.js';

const RADIUS = 0.32;
const SPEED = 3.0;
const CELL = 0.4;

/** Circle-vs-AABB push-out against enabled colliders. */
export function resolveCollisions(pos, colliders, r = RADIUS) {
  for (let iter = 0; iter < 3; iter++) {
    let moved = false;
    for (const c of colliders) {
      if (!c.enabled) continue;
      const cx = Math.max(c.minX, Math.min(pos.x, c.maxX));
      const cz = Math.max(c.minZ, Math.min(pos.z, c.maxZ));
      const dx = pos.x - cx, dz = pos.z - cz;
      const d2 = dx * dx + dz * dz;
      if (d2 < r * r) {
        if (d2 > 1e-8) {
          const d = Math.sqrt(d2);
          pos.x += (dx / d) * (r - d);
          pos.z += (dz / d) * (r - d);
        } else {
          // centre inside box: push out along the smallest axis
          const pens = [
            [pos.x - c.minX + r, -1, 0], [c.maxX - pos.x + r, 1, 0],
            [pos.z - c.minZ + r, 0, -1], [c.maxZ - pos.z + r, 0, 1],
          ].sort((a, b) => a[0] - b[0]);
          pos.x += pens[0][1] * pens[0][0];
          pos.z += pens[0][2] * pens[0][0];
        }
        moved = true;
      }
    }
    if (!moved) break;
  }
}

/** Grid A* over the walkable floor. */
class NavGrid {
  constructor(minX, maxX, minZ, maxZ) {
    this.minX = minX; this.minZ = minZ;
    this.w = Math.ceil((maxX - minX) / CELL);
    this.h = Math.ceil((maxZ - minZ) / CELL);
    this.blocked = new Uint8Array(this.w * this.h);
  }
  rebuild(colliders) {
    const r = RADIUS + 0.08;
    this.blocked.fill(0);
    for (let j = 0; j < this.h; j++) {
      for (let i = 0; i < this.w; i++) {
        const x = this.minX + (i + 0.5) * CELL, z = this.minZ + (j + 0.5) * CELL;
        for (const c of colliders) {
          if (!c.enabled) continue;
          if (x > c.minX - r && x < c.maxX + r && z > c.minZ - r && z < c.maxZ + r) { this.blocked[j * this.w + i] = 1; break; }
        }
      }
    }
  }
  cellOf(x, z) {
    return [Math.floor((x - this.minX) / CELL), Math.floor((z - this.minZ) / CELL)];
  }
  centre(i, j) { return new THREE.Vector3(this.minX + (i + 0.5) * CELL, 0, this.minZ + (j + 0.5) * CELL); }
  free(i, j) { return i >= 0 && j >= 0 && i < this.w && j < this.h && !this.blocked[j * this.w + i]; }
  nearestFree(i, j) {
    if (this.free(i, j)) return [i, j];
    for (let r = 1; r < 8; r++) {
      for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) {
        if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue;
        if (this.free(i + di, j + dj)) return [i + di, j + dj];
      }
    }
    return null;
  }
  lineFree(a, b) {
    const d = a.distanceTo(b);
    const steps = Math.ceil(d / (CELL * 0.5));
    for (let s = 0; s <= steps; s++) {
      const x = a.x + ((b.x - a.x) * s) / steps, z = a.z + ((b.z - a.z) * s) / steps;
      const [i, j] = this.cellOf(x, z);
      if (!this.free(i, j)) return false;
    }
    return true;
  }
  find(from, to) {
    const s0 = this.nearestFree(...this.cellOf(from.x, from.z));
    const g0 = this.nearestFree(...this.cellOf(to.x, to.z));
    if (!s0 || !g0) return null;
    const W = this.w, N = W * this.h;
    const start = s0[1] * W + s0[0], goal = g0[1] * W + g0[0];
    const gScore = new Float32Array(N).fill(Infinity);
    const came = new Int32Array(N).fill(-1);
    const closed = new Uint8Array(N);
    const open = [start]; // small binary heap by f
    const f = new Float32Array(N).fill(Infinity);
    const hfn = (n) => { const dx = Math.abs((n % W) - g0[0]), dz = Math.abs(Math.floor(n / W) - g0[1]); return Math.max(dx, dz) + 0.414 * Math.min(dx, dz); };
    gScore[start] = 0; f[start] = hfn(start);
    const push = (n) => { open.push(n); let k = open.length - 1; while (k > 0) { const p = (k - 1) >> 1; if (f[open[p]] <= f[open[k]]) break; [open[p], open[k]] = [open[k], open[p]]; k = p; } };
    const pop = () => { const top = open[0]; const last = open.pop(); if (open.length) { open[0] = last; let k = 0; for (;;) { const l = 2 * k + 1, r = l + 1; let m = k; if (l < open.length && f[open[l]] < f[open[m]]) m = l; if (r < open.length && f[open[r]] < f[open[m]]) m = r; if (m === k) break; [open[m], open[k]] = [open[k], open[m]]; k = m; } } return top; };
    let iterations = 0;
    while (open.length && iterations++ < 40000) {
      const cur = pop();
      if (cur === goal) break;
      if (closed[cur]) continue;
      closed[cur] = 1;
      const ci = cur % W, cj = Math.floor(cur / W);
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
        if (!di && !dj) continue;
        const ni = ci + di, nj = cj + dj;
        if (!this.free(ni, nj)) continue;
        if (di && dj && (!this.free(ci + di, cj) || !this.free(ci, cj + dj))) continue;
        const n = nj * W + ni;
        const tg = gScore[cur] + (di && dj ? 1.414 : 1);
        if (tg < gScore[n]) { gScore[n] = tg; came[n] = cur; f[n] = tg + hfn(n); push(n); }
      }
    }
    if (came[goal] === -1 && goal !== start) return null;
    const cells = [];
    for (let n = goal; n !== -1; n = came[n]) { cells.push(n); if (n === start) break; }
    cells.reverse();
    const pts = cells.map((n) => this.centre(n % W, Math.floor(n / W)));
    pts[0] = from.clone().setY(0);
    const end = this.free(...this.cellOf(to.x, to.z)) ? to.clone().setY(0) : pts[pts.length - 1];
    pts[pts.length - 1] = end;
    // string pulling
    const out = [pts[0]];
    let k = 0;
    while (k < pts.length - 1) {
      let m = pts.length - 1;
      while (m > k + 1 && !this.lineFree(pts[k], pts[m])) m--;
      out.push(pts[m]);
      k = m;
    }
    return out;
  }
}

export class Player {
  constructor(scene, museum) {
    this.scene = scene;
    this.museum = museum;
    this.position = new THREE.Vector3(0, 0, -2.5);
    this.heading = Math.PI; // facing -z
    this.root = new THREE.Group();
    scene.add(this.root);
    this.character = null;
    this.keys = new Set();
    this.path = null;
    this.onArrive = null;
    this.locked = false;
    this.nav = new NavGrid(-ROOM_W / 2, ROOM_W / 2, -museum.totalDepth, 0);
    this.nav.rebuild(museum.colliders);
    // target ring + dotted path
    this.target = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9), new THREE.MeshBasicMaterial({ map: targetRingTexture(), transparent: true, depthWrite: false }));
    this.target.rotation.x = -Math.PI / 2;
    this.target.position.y = 0.03;
    this.target.visible = false;
    scene.add(this.target);
    this.dots = [];
    const dotMat = new THREE.MeshBasicMaterial({ map: dotTexture(), transparent: true, depthWrite: false });
    const dotGeo = new THREE.PlaneGeometry(0.2, 0.2);
    for (let i = 0; i < 80; i++) {
      const d = new THREE.Mesh(dotGeo, dotMat);
      d.rotation.x = -Math.PI / 2;
      d.position.y = 0.025;
      d.visible = false;
      scene.add(d);
      this.dots.push(d);
    }
  }

  setCharacter(character) {
    if (this.character) {
      this.root.remove(this.character.object);
      this.character.dispose();
    }
    this.character = character;
    this.root.add(character.object);
  }

  rebuildNav() { this.nav.rebuild(this.museum.colliders); }

  teleport(x, z, heading = Math.PI) {
    this.position.set(x, 0, z);
    this.heading = heading;
    this.clearPath();
  }

  clearPath() {
    this.path = null;
    this.onArrive = null;
    this.target.visible = false;
    this.dots.forEach((d) => (d.visible = false));
  }

  walkTo(point, onArrive = null) {
    const path = this.nav.find(this.position, point);
    if (!path || path.length < 2) {
      if (path && onArrive) onArrive();
      return !!path;
    }
    this.path = path.slice(1);
    this.onArrive = onArrive;
    const end = path[path.length - 1];
    this.target.position.set(end.x, 0.03, end.z);
    this.target.visible = true;
    this._layoutDots(path);
    return true;
  }

  _layoutDots(path) {
    let di = 0;
    const spacing = 0.45;
    let carry = spacing * 0.6;
    for (let k = 0; k < path.length - 1 && di < this.dots.length; k++) {
      const a = path[k], b = path[k + 1];
      const len = a.distanceTo(b);
      for (let s = carry; s < len - 0.3 && di < this.dots.length; s += spacing) {
        const p = a.clone().lerp(b, s / len);
        this.dots[di].position.set(p.x, 0.025, p.z);
        this.dots[di].visible = true;
        di++;
        carry = s + spacing - len;
      }
      if (carry < 0) carry = 0;
    }
    for (; di < this.dots.length; di++) this.dots[di].visible = false;
    this._dotCount = path;
  }

  update(dt, cameraYaw = 0) {
    let move = new THREE.Vector3();
    let speed = 0;
    if (!this.locked) {
      const k = this.keys;
      const f = (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0);
      const r = (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0) - (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0);
      if (f || r) {
        if (this.path) this.clearPath();
        move.set(r, 0, -f).normalize().applyAxisAngle(new THREE.Vector3(0, 1, 0), cameraYaw);
        speed = SPEED;
      } else if (this.path && this.path.length) {
        const wp = this.path[0];
        const to = new THREE.Vector3(wp.x - this.position.x, 0, wp.z - this.position.z);
        const dist = to.length();
        if (dist < 0.08) {
          this.path.shift();
          if (!this.path.length) {
            const cb = this.onArrive;
            this.clearPath();
            if (cb) cb();
          }
        } else {
          move.copy(to).divideScalar(dist);
          speed = Math.min(SPEED, dist / dt);
        }
        // hide dots already passed
        for (const d of this.dots) if (d.visible && d.position.distanceTo(new THREE.Vector3(this.position.x, 0.025, this.position.z)) < 0.3) d.visible = false;
      }
    }
    if (speed > 0) {
      const before = this.position.clone();
      this.position.addScaledVector(move, speed * dt);
      resolveCollisions(this.position, this.museum.colliders);
      const actual = this.position.distanceTo(before) / dt;
      const targetHeading = Math.atan2(move.x, move.z);
      let dh = targetHeading - this.heading;
      dh = Math.atan2(Math.sin(dh), Math.cos(dh));
      this.heading += dh * Math.min(1, dt * 12);
      speed = actual;
      // stuck while path-following → drop the path
      if (this.path && actual < 0.05) { this._stuck = (this._stuck || 0) + dt; if (this._stuck > 0.6) this.clearPath(); } else this._stuck = 0;
    }
    this.character && this.character.setMoving(speed);
    this.root.position.copy(this.position);
    this.root.rotation.y = this.heading;
    this.character && this.character.update(dt);
    if (this.target.visible) this.target.rotation.z += dt * 1.5;
  }
}
