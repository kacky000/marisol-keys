// Accumulates many boxes and quads into one BufferGeometry so a whole district draws in a
// handful of calls. UVs are in world metres divided by a tile size; colours are per-vertex tints.

import * as THREE from 'three';

export class MeshBatch {
  constructor({ tileU = 1, tileV = 1 } = {}) {
    this.pos = []; this.nrm = []; this.uv = []; this.col = []; this.idx = [];
    this.tileU = tileU; this.tileV = tileV;
  }

  get vertexCount() { return this.pos.length / 3; }

  // Four corners (counter-clockwise seen from the normal side), with their uvs. `color` is one
  // colour or an array of four (per corner), e.g. darker at the foot of a wall.
  quad(p0, p1, p2, p3, n, uvs, color) {
    const base = this.vertexCount;
    const cols = Array.isArray(color) ? color : [color, color, color, color];
    [[p0, uvs[0]], [p1, uvs[1]], [p2, uvs[2]], [p3, uvs[3]]].forEach(([p, t], k) => {
      this.pos.push(p[0], p[1], p[2]);
      this.nrm.push(n[0], n[1], n[2]);
      this.uv.push(t[0], t[1]);
      this.col.push(cols[k].r, cols[k].g, cols[k].b);
    });
    this.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }

  // Horizontal rectangle at height y, uvs tiled in world space (or stretched 0..1 when fit).
  flat(x0, z0, x1, z1, y, color, { fit = false, uScale = 1, vScale = 1 } = {}) {
    const u0 = fit ? 0 : x0 / this.tileU, u1 = fit ? uScale : x1 / this.tileU;
    const v0 = fit ? 0 : z0 / this.tileV, v1 = fit ? vScale : z1 / this.tileV;
    this.quad([x0, y, z1], [x1, y, z1], [x1, y, z0], [x0, y, z0], [0, 1, 0], [[u0, v1], [u1, v1], [u1, v0], [u0, v0]], color);
  }

  // A strip along a segment (roads): width w, from (ax,az) to (bx,bz), v runs along the length.
  strip(ax, az, bx, bz, w, y, color, vStart, vEnd) {
    const dx = bx - ax, dz = bz - az, len = Math.hypot(dx, dz);
    const rx = (-dz / len) * (w / 2), rz = (dx / len) * (w / 2);
    this.quad([ax - rx, y, az - rz], [ax + rx, y, az + rz], [bx + rx, y, bz + rz], [bx - rx, y, bz - rz], [0, 1, 0],
      [[0, vStart], [1, vStart], [1, vEnd], [0, vEnd]], color);
  }

  // Axis-aligned box from y0 to y0+h centred on (cx, cz). Side uvs use world metres / tile size
  // so windows stay square on any building. Skips the bottom face.
  box(cx, y0, cz, w, h, d, color, { top = true, sides = true, topColor = null, uOffset = 0 } = {}) {
    const x0 = cx - w / 2, x1 = cx + w / 2, z0 = cz - d / 2, z1 = cz + d / 2, y1 = y0 + h;
    const tu = this.tileU, tv = this.tileV;
    const v0 = y0 / tv, v1 = y1 / tv;
    if (sides) {
      const uw = w / tu, ud = d / tu, o = uOffset;
      // fake ambient occlusion: walls darken toward the ground, strongest at street level
      const ao = y0 < 1 ? Math.max(0.55, 1 - 6 / (h + 8)) : 0.92;
      const foot = color.clone().multiplyScalar(ao);
      const c4 = [foot, foot, color, color];
      this.quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [0, 0, 1], [[o, v0], [o + uw, v0], [o + uw, v1], [o, v1]], c4);
      this.quad([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [0, 0, -1], [[o, v0], [o + uw, v0], [o + uw, v1], [o, v1]], c4);
      this.quad([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [1, 0, 0], [[o, v0], [o + ud, v0], [o + ud, v1], [o, v1]], c4);
      this.quad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [-1, 0, 0], [[o, v0], [o + ud, v0], [o + ud, v1], [o, v1]], c4);
    }
    if (top) {
      this.quad([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], [0, 1, 0],
        [[x0 / tu, z1 / tu], [x1 / tu, z1 / tu], [x1 / tu, z0 / tu], [x0 / tu, z0 / tu]], topColor || color);
    }
  }

  // Vertical cylinder (open bottom) with facade uvs wrapped around it, optional flat cap.
  cylinder(cx, y0, cz, r, h, color, { segments = 16, cap = true, capColor = null } = {}) {
    const tu = this.tileU, tv = this.tileV;
    const v0 = y0 / tv, v1 = (y0 + h) / tv;
    const ao = y0 < 1 ? Math.max(0.55, 1 - 6 / (h + 8)) : 0.92;
    const foot = color.clone().multiplyScalar(ao);
    for (let k = 0; k < segments; k++) {
      const a0 = (k / segments) * Math.PI * 2, a1 = ((k + 1) / segments) * Math.PI * 2;
      const p = (a, y) => [cx + Math.sin(a) * r, y, cz + Math.cos(a) * r];
      const am = (a0 + a1) / 2;
      const u0 = (a0 * r) / tu, u1 = (a1 * r) / tu;
      this.quad(p(a0, y0), p(a1, y0), p(a1, y0 + h), p(a0, y0 + h), [Math.sin(am), 0, Math.cos(am)], [[u0, v0], [u1, v0], [u1, v1], [u0, v1]], [foot, foot, color, color]);
      if (cap) {
        const c = capColor || color;
        this.quad(p(a1, y0 + h), [cx, y0 + h, cz], [cx, y0 + h, cz], p(a0, y0 + h), [0, 1, 0], [[0, 0], [0.5, 0.5], [0.5, 0.5], [1, 0]], c);
      }
    }
  }

  // A rotated box (any yaw) with uvs stretched per face; used for props and vehicles.
  orientedBox(cx, cy, cz, w, h, d, yaw, color) {
    const c = Math.cos(yaw), s = Math.sin(yaw);
    const P = (lx, ly, lz) => [cx + lx * c + lz * s, cy + ly, cz - lx * s + lz * c];
    const N = (lx, lz) => [lx * c + lz * s, 0, -lx * s + lz * c];
    const hw = w / 2, hh = h / 2, hd = d / 2;
    const uv = [[0, 0], [1, 0], [1, 1], [0, 1]];
    this.quad(P(-hw, -hh, hd), P(hw, -hh, hd), P(hw, hh, hd), P(-hw, hh, hd), N(0, 1), uv, color);
    this.quad(P(hw, -hh, -hd), P(-hw, -hh, -hd), P(-hw, hh, -hd), P(hw, hh, -hd), N(0, -1), uv, color);
    this.quad(P(hw, -hh, hd), P(hw, -hh, -hd), P(hw, hh, -hd), P(hw, hh, hd), N(1, 0), uv, color);
    this.quad(P(-hw, -hh, -hd), P(-hw, -hh, hd), P(-hw, hh, hd), P(-hw, hh, -hd), N(-1, 0), uv, color);
    this.quad(P(-hw, hh, hd), P(hw, hh, hd), P(hw, hh, -hd), P(-hw, hh, -hd), [0, 1, 0], uv, color);
  }

  // Four-sided pyramid roof over a w x d footprint.
  pyramid(cx, y0, cz, w, d, h, color) {
    const x0 = cx - w / 2, x1 = cx + w / 2, z0 = cz - d / 2, z1 = cz + d / 2;
    const apex = [cx, y0 + h, cz];
    const tri = (a, b) => {
      const ux = b[0] - a[0], uz = b[2] - a[2];
      const n = new THREE.Vector3().crossVectors(new THREE.Vector3(ux, 0, uz), new THREE.Vector3(apex[0] - a[0], apex[1] - a[1], apex[2] - a[2])).normalize();
      this.quad(a, b, apex, apex, [n.x, n.y, n.z], [[0, 0], [Math.hypot(ux, uz) / this.tileU, 0], [0.5, h / this.tileV], [0.5, h / this.tileV]], color);
    };
    tri([x0, y0, z1], [x1, y0, z1]);
    tri([x1, y0, z1], [x1, y0, z0]);
    tri([x1, y0, z0], [x0, y0, z0]);
    tri([x0, y0, z0], [x0, y0, z1]);
  }

  toGeometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nrm, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    g.setIndex(this.vertexCount > 65535 ? new THREE.Uint32BufferAttribute(this.idx, 1) : new THREE.Uint16BufferAttribute(this.idx, 1));
    g.computeBoundingSphere();
    return g;
  }

  toMesh(material, { cast = true, receive = true } = {}) {
    const m = new THREE.Mesh(this.toGeometry(), material);
    m.castShadow = cast;
    m.receiveShadow = receive;
    return m;
  }
}

export const tint = (hex) => new THREE.Color(hex);
