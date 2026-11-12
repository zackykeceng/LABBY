/* ============================================================
   LUNGS-KIT.JS — Generator paru-paru 3D realistis (100% prosedural)
   Tanpa file model eksternal. Semua geometri, tekstur & shader
   dibuat lewat kode. Koordinat: +x = sisi kiri pasien (kanan layar).
   ============================================================ */
const LungsKit = (() => {
  const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
  const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

  // RNG deterministik -> bentuk paru-paru & percabangan selalu sama setiap dimuat
  let _s = 20240817;
  const rand = () => { _s |= 0; _s = _s + 0x6D2B79F5 | 0; let t = Math.imul(_s ^ _s >>> 15, 1 | _s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const resetRand = () => { _s = 20240817; };

  // ---------- Noise (value noise + fBm) untuk tekstur lobulus paru ----------
  const hash3 = (x, y, z) => { const h = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return h - Math.floor(h); };
  function vnoise(x, y, z) {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
    const xf = x - xi, yf = y - yi, zf = z - zi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
    const l = (a, b, t) => a + (b - a) * t;
    return l(
      l(l(hash3(xi, yi, zi), hash3(xi + 1, yi, zi), u), l(hash3(xi, yi + 1, zi), hash3(xi + 1, yi + 1, zi), u), v),
      l(l(hash3(xi, yi, zi + 1), hash3(xi + 1, yi, zi + 1), u), l(hash3(xi, yi + 1, zi + 1), hash3(xi + 1, yi + 1, zi + 1), u), v), w);
  }
  function fbm(x, y, z, f, oct = 3) {
    let a = 0.5, s = 0;
    for (let i = 0; i < oct; i++) { s += a * vnoise(x * f, y * f, z * f); f *= 2.03; a *= 0.5; }
    return s;
  }

  // ---------- Bentuk Parenkim Paru-Paru ----------
  const ROT = 0.0, FRAME_POS = V3(0, -0.1, 0);
  function lp(x, y, z, isLeft, amp = 1, fine = 1, out = V3()) {
    const ny = y;
    let px = x * 0.88, py = y * 1.55, pz = z * 0.84;

    if (ny > 0) {
      const k = Math.pow(Math.min(1, ny), 1.35);
      const taper = 1 - 0.56 * k;
      px *= taper; pz *= taper * 0.95;
    } else {
      const flare = 1 + Math.sin(-ny * Math.PI * 0.5) * 0.18;
      px *= flare; pz *= flare * 0.96;
      if (ny < -0.68) {
        const dome = Math.max(0, 1 - Math.hypot(x, z) * 0.95);
        py += dome * 0.38 * sstep(-0.68, -1.0, ny);
      }
    }

    if (!isLeft && x > 0.06) {
      px *= 0.50;
    } else if (isLeft && x < -0.06) {
      px *= 0.50;
      if (ny < 0.25 && ny > -0.75) {
        const notch = Math.exp(-((ny + 0.25) ** 2) / 0.09) * sstep(-0.1, 0.65, z);
        px += notch * 0.38;
      }
    }

    const ob = y - 0.42 * z + 0.16;
    const obG = 0.075 * Math.exp(-(ob * ob) / 0.0038);
    let hzG = 0;
    if (!isLeft && z > -0.15) {
      const hz = y - 0.26;
      hzG = 0.065 * Math.exp(-(hz * hz) / 0.0032) * sstep(-0.15, 0.25, z);
    }

    const seedOffset = isLeft ? 13.7 : 0.0;
    const n1 = fbm(x + seedOffset, y, z, 2.3, 3) - 0.5;
    const n2 = fbm(x + 9 + seedOffset, y + 3, z + 5, 9, 3) - 0.5;
    const s = (1 - obG - hzG) * (1 + amp * (n1 * 0.055 + fine * n2 * 0.02));
    return out.set(px * s, py * s, pz * s);
  }

  function fixSphereNormals(g, w, h) {
    const n = g.attributes.normal, W = w + 1, a = V3();
    for (let j = 0; j <= h; j++) {
      const i0 = j * W;
      if (j === 0 || j === h) {
        a.set(0, 0, 0);
        for (let i = 0; i < W; i++) a.add(V3(n.getX(i0 + i), n.getY(i0 + i), n.getZ(i0 + i)));
        a.normalize();
        for (let i = 0; i < W; i++) n.setXYZ(i0 + i, a.x, a.y, a.z);
      } else {
        a.set(n.getX(i0) + n.getX(i0 + w), n.getY(i0) + n.getY(i0 + w), n.getZ(i0) + n.getZ(i0 + w)).normalize();
        n.setXYZ(i0, a.x, a.y, a.z); n.setXYZ(i0 + w, a.x, a.y, a.z);
      }
    }
    n.needsUpdate = true;
  }

  function lungGeo(isLeft, scale = 1, amp = 1, fine = 1, w = 144, h = 108) {
    const g = new THREE.SphereGeometry(1, w, h), p = g.attributes.position, t = V3();
    for (let i = 0; i < p.count; i++) {
      lp(p.getX(i), p.getY(i), p.getZ(i), isLeft, amp, fine, t);
      p.setXYZ(i, t.x * scale, t.y * scale, t.z * scale);
    }
    g.computeVertexNormals(); fixSphereNormals(g, w, h);
    return g;
  }

  function diaphragmGeo(w = 96, h = 48) {
    const g = new THREE.SphereGeometry(2.15, w, h, 0, Math.PI * 2, 0, Math.PI * 0.46);
    const p = g.attributes.position, v = V3();
    for (let i = 0; i < p.count; i++) {
      v.set(p.getX(i), p.getY(i), p.getZ(i));
      const domeTwin = 0.12 * Math.cos(v.x * 1.45);
      const notchBack = v.z < -0.3 ? (v.z + 0.3) * 0.25 : 0;
      const n = (fbm(v.x, v.y, v.z, 2.5, 2) - 0.5) * 0.06;
      p.setXYZ(i, v.x * 1.06, (v.y * 0.42 + domeTwin + n) - 0.45, v.z * 0.72 + notchBack);
    }
    g.computeVertexNormals();
    return g;
  }

  function makeTube(curve, radiusFn, { seg = 64, radial = 18, delay = null } = {}) {
    const fr = curve.computeFrenetFrames(seg, false);
    const pos = [], nor = [], uv = [], idx = [], del = [], P = V3(), N = V3();
    for (let i = 0; i <= seg; i++) {
      const t = i / seg; curve.getPointAt(t, P);
      const r = radiusFn(t), nn = fr.normals[i], bb = fr.binormals[i];
      for (let j = 0; j <= radial; j++) {
        const a = j / radial * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
        N.set(nn.x * c + bb.x * s, nn.y * c + bb.y * s, nn.z * c + bb.z * s);
        pos.push(P.x + N.x * r, P.y + N.y * r, P.z + N.z * r); nor.push(N.x, N.y, N.z); uv.push(j / radial, t);
        if (delay) del.push(delay(t));
      }
    }
    for (let i = 0; i < seg; i++) for (let j = 0; j < radial; j++) {
      const a = i * (radial + 1) + j, b = a + radial + 1;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    if (delay) g.setAttribute('aDelay', new THREE.Float32BufferAttribute(del, 1));
    g.setIndex(idx);
    return g;
  }
  const catmull = (pts, tension = 0.5) => new THREE.CatmullRomCurve3(pts, false, 'catmullrom', tension);

  function parenchymaTexture() {
    if (typeof document === 'undefined') return null;
    const c = document.createElement('canvas'); c.width = c.height = 512;
    const x = c.getContext('2d');
    x.fillStyle = '#808080'; x.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 3200; i++) {
      const px = rand() * 512, py = rand() * 512, rad = 6 + rand() * 22;
      const l = rand() > 0.45 ? 235 : 25;
      x.strokeStyle = `rgba(${l},${l},${l},${0.03 + rand() * 0.06})`;
      x.lineWidth = 0.6 + rand() * 1.4;
      x.beginPath(); x.arc(px, py, rad, 0, Math.PI * 2); x.stroke();
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 2); t.anisotropy = 4;
    return t;
  }

  function glowSprite() {
    if (typeof document === 'undefined') return null;
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,255,255,0.55)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  }

  function glass(color, { op = 0.62, min = 0.28, rim = 0xffb4c0, bump = null, rough = 0.36 } = {}) {
    const m = new THREE.MeshPhysicalMaterial({
      color, roughness: rough, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.22,
      transparent: true, opacity: op, side: THREE.DoubleSide, depthWrite: false,
      bumpMap: bump, bumpScale: 1.2, envMapIntensity: 0.9
    });
    m.userData.baseOpacity = op;
    m.userData.rimU = { value: new THREE.Color(rim) };
    m.userData.minU = { value: min };
    m.onBeforeCompile = (sh) => {
      sh.uniforms.uRim = m.userData.rimU; sh.uniforms.uMin = m.userData.minU;
      sh.fragmentShader = sh.fragmentShader
        .replace('void main() {', 'uniform vec3 uRim; uniform float uMin;\nvoid main() {')
        .replace('#include <opaque_fragment>', `
          float fr = pow(1.0 - abs(dot(normalize(vNormal), normalize(vViewPosition))), 2.2);
          vec3 col = outgoingLight + uRim * fr * 0.85;
          gl_FragColor = vec4(col, clamp(diffuseColor.a * (uMin + (1.0 - uMin) * fr * 1.6), 0.0, 1.0));`);
    };
    return m;
  }
  const solid = (color, o = {}) => new THREE.MeshPhysicalMaterial(Object.assign(
    { color, roughness: 0.45, metalness: 0, clearcoat: 0.55, clearcoatRoughness: 0.3, envMapIntensity: 0.8 }, o));

  function airflowMaterial() {
    return new THREE.ShaderMaterial({
      uniforms: { uPhase: { value: 0 }, uColor: { value: new THREE.Color(0x19f2c4) }, uBoost: { value: 1 } },
      side: THREE.DoubleSide,
      vertexShader: `attribute float aDelay; varying float vD; varying vec3 vN;
        void main(){ vD = aDelay; vN = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `uniform float uPhase; uniform vec3 uColor; uniform float uBoost; varying float vD; varying vec3 vN;
        void main(){
          float dtIn = uPhase - vD;
          float headIn = exp(-dtIn * dtIn / 0.0025);
          float tailIn = dtIn > 0.0 && dtIn < 0.45 ? exp(-dtIn / 0.12) * 0.55 : 0.0;
          float revPhase = (1.0 - uPhase) - vD * 0.85;
          float headOut = uPhase > 0.48 ? exp(-revPhase * revPhase / 0.0035) * 0.65 : 0.0;
          float g = 0.28 + (headIn * 2.4 + tailIn + headOut) * uBoost;
          gl_FragColor = vec4(uColor * g * (0.6 + 0.4 * abs(vN.z)), 1.0); }`
    });
  }

  function build() {
    resetRand();
    const out = {
      clickables: [], glass: [], cond: [], nodes: [], anchors: {},
      pumps: {}, paths: [], chambers: [], alveoli: [], dissectables: [], explodables: []
    };
    const root = new THREE.Group();
    const frame = new THREE.Group();
    frame.rotation.z = ROT; frame.position.copy(FRAME_POS);
    root.add(frame); frame.updateMatrix(); frame.updateMatrixWorld(true);
    out.root = root; out.frame = frame;

    const bump = parenchymaTexture();
    const reg = (obj, key, extra = {}) => { obj.userData = Object.assign({ key, priority: 1 }, extra); out.clickables.push(obj); return obj; };
    const G = (c, o) => { const m = glass(c, Object.assign({ bump }, o)); out.glass.push(m); return m; };
    const addExplode = (obj, offset) => {
      if (!obj) return obj;
      const basePos = obj.position.clone();
      const targetPos = basePos.clone().add(offset);
      out.explodables.push({ obj, basePos, targetPos, offset: offset.clone() });
      return obj;
    };
    const markDissect = (obj) => {
      obj.traverse(o => {
        if (o.isMesh && o.material) {
          o.userData.dissectable = true;
          if (!out.dissectables.includes(o.material)) out.dissectables.push(o.material);
        }
      });
      return obj;
    };

    const R_POS = V3(-1.02, -0.05, 0.02);
    const L_POS = V3(1.02, -0.05, 0.02);
    const R_EXP = V3(-0.92, 0.06, -0.12);
    const L_EXP = V3(0.92, 0.06, -0.12);

    const rLungMat = G(0xd9777b, { op: 0.62, min: 0.28, rim: 0xffb4b0 });
    const rightLung = new THREE.Mesh(lungGeo(false, 1, 1, 1, 144, 108), rLungMat);
    rightLung.position.copy(R_POS); rightLung.renderOrder = 5;
    rightLung.userData.basePos = R_POS.clone();
    reg(rightLung, 'rlung', {
      priority: 0.5,
      dissectable: true,
      resolve: (pLocal) => {
        const p = pLocal.clone().sub(rightLung.position);
        const ob = p.y / 1.55 - 0.42 * (p.z / 0.84) + 0.16;
        if (ob < 0) return 'rinf';
        if (p.y / 1.55 < 0.26 && p.z > -0.12) return 'rmid';
        return 'rsup';
      }
    });
    frame.add(rightLung);
    const rEndo = new THREE.Mesh(lungGeo(false, 0.88, 1.5, 1.8, 96, 72), solid(0x74222b, { side: THREE.BackSide, roughness: 0.72, clearcoat: 0.2, bumpMap: bump, bumpScale: 1.8 }));
    rightLung.add(rEndo);

    const lLungMat = G(0xd9777b, { op: 0.62, min: 0.28, rim: 0xffb4b0 });
    const leftLung = new THREE.Mesh(lungGeo(true, 1, 1, 1, 144, 108), lLungMat);
    leftLung.position.copy(L_POS); leftLung.renderOrder = 5;
    leftLung.userData.basePos = L_POS.clone();
    reg(leftLung, 'llung', {
      priority: 0.5,
      dissectable: true,
      resolve: (pLocal) => {
        const p = pLocal.clone().sub(leftLung.position);
        if (p.x < -0.18 && p.y < 0.35 && p.y > -0.85 && p.z > -0.1) return 'notch';
        const ob = p.y / 1.55 - 0.42 * (p.z / 0.84) + 0.16;
        return ob < 0 ? 'linf' : 'lsup';
      }
    });
    frame.add(leftLung);
    const lEndo = new THREE.Mesh(lungGeo(true, 0.88, 1.5, 1.8, 96, 72), solid(0x74222b, { side: THREE.BackSide, roughness: 0.72, clearcoat: 0.2, bumpMap: bump, bumpScale: 1.8 }));
    leftLung.add(lEndo);

    const mkFissure = (parent, yOff, tiltZ) => {
      const fg = new THREE.CircleGeometry(0.68, 32);
      const fm = G(0xb55a5e, { op: 0.36, min: 0.32, rim: 0xff8a8a });
      const mesh = new THREE.Mesh(fg, fm);
      mesh.position.set(0, yOff, 0.04);
      mesh.rotation.x = Math.PI / 2 - tiltZ;
      mesh.renderOrder = 4;
      parent.add(mesh);
    };
    mkFissure(rightLung, -0.18, 0.42);
    mkFissure(rightLung, 0.32, 0.05);
    mkFissure(leftLung, -0.18, 0.42);

    markDissect(rightLung);
    markDissect(leftLung);
    addExplode(rightLung, R_EXP);
    addExplode(leftLung, L_EXP);

    out.rightLung = rightLung;
    out.leftLung = leftLung;
    out.chambers = { rightLung, leftLung };
    out.pumps = { rlung: [rightLung], llung: [leftLung] };

    const mucosaMat = G(0xd98688, { op: 0.65, min: 0.32, rim: 0xffb0b8 });
    const cartilageMat = solid(0xf1dcb4, { roughness: 0.4, clearcoat: 0.6, emissive: 0x2a1a08, emissiveIntensity: 0.2 });

    const larynxGroup = new THREE.Group();
    const thyroid = new THREE.Mesh(
      makeTube(catmull([V3(0, 2.52, 0.02), V3(0, 2.74, 0.05), V3(0, 2.96, 0.02)]), t => 0.23 + 0.06 * Math.sin(t * Math.PI), { seg: 24, radial: 24 }),
      cartilageMat
    );
    const cricoid = new THREE.Mesh(new THREE.TorusGeometry(0.225, 0.032, 12, 32), cartilageMat);
    cricoid.rotation.x = Math.PI / 2; cricoid.position.set(0, 2.48, 0.01);
    larynxGroup.add(thyroid, cricoid);
    larynxGroup.traverse(o => { if (o.isMesh) reg(o, 'larynx', { priority: 1.8 }); });
    addExplode(larynxGroup, V3(0, 0.85, 0.22));
    frame.add(larynxGroup);

    const tracheaGroup = new THREE.Group();
    const tracheaCurve = catmull([V3(0, 2.46, 0.01), V3(0, 1.82, 0.0), V3(0, 1.12, -0.01)]);
    const tracheaTube = new THREE.Mesh(makeTube(tracheaCurve, () => 0.20, { seg: 48, radial: 28 }), mucosaMat);
    tracheaTube.renderOrder = 5;
    reg(tracheaTube, 'trachea', { priority: 1.6 });
    tracheaGroup.add(tracheaTube);

    for (let i = 0; i < 12; i++) {
      const y = 1.24 + i * 0.10;
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.212, 0.019, 10, 28, Math.PI * 1.65), cartilageMat);
      ring.rotation.x = Math.PI / 2;
      ring.rotation.z = -Math.PI * 0.325;
      ring.position.set(0, y, 0.0);
      reg(ring, 'trachea', { priority: 1.7 });
      tracheaGroup.add(ring);
    }
    addExplode(tracheaGroup, V3(0, 0.45, 0.25));
    frame.add(tracheaGroup);

    const rBronchGroup = new THREE.Group();
    const lBronchGroup = new THREE.Group();
    const rBronchCurve = catmull([V3(0, 1.15, -0.01), V3(-0.38, 0.90, 0.01), V3(-0.78, 0.56, 0.03)]);
    const lBronchCurve = catmull([V3(0, 1.15, -0.01), V3(0.42, 0.86, 0.01), V3(0.84, 0.48, 0.03)]);
    const rBronch = new THREE.Mesh(makeTube(rBronchCurve, t => 0.16 - 0.03 * t, { seg: 32, radial: 22 }), mucosaMat);
    const lBronch = new THREE.Mesh(makeTube(lBronchCurve, t => 0.15 - 0.03 * t, { seg: 32, radial: 22 }), mucosaMat);
    rBronch.renderOrder = 5; lBronch.renderOrder = 5;
    reg(rBronch, 'rbronch', { priority: 1.8 });
    reg(lBronch, 'lbronch', { priority: 1.8 });
    rBronchGroup.add(rBronch);
    lBronchGroup.add(lBronch);

    for (let r = 1; r <= 4; r++) {
      const t = r * 0.21;
      const pr = rBronchCurve.getPointAt(t), pl = lBronchCurve.getPointAt(t);
      const rr = new THREE.Mesh(new THREE.TorusGeometry(0.155 - 0.02 * t, 0.015, 8, 20), cartilageMat);
      rr.position.copy(pr); rr.rotation.set(Math.PI / 2, -0.55, 0); reg(rr, 'rbronch', { priority: 1.8 });
      const rl = new THREE.Mesh(new THREE.TorusGeometry(0.145 - 0.02 * t, 0.015, 8, 20), cartilageMat);
      rl.position.copy(pl); rl.rotation.set(Math.PI / 2, 0.62, 0); reg(rl, 'lbronch', { priority: 1.8 });
      rBronchGroup.add(rr);
      lBronchGroup.add(rl);
    }
    addExplode(rBronchGroup, V3(-0.22, 0.18, 0.42));
    addExplode(lBronchGroup, V3(0.22, 0.18, 0.42));
    frame.add(rBronchGroup, lBronchGroup);

    const pulmvGroup = new THREE.Group();
    frame.add(pulmvGroup);
    addExplode(pulmvGroup, V3(0, -0.05, 0.68));

    const vessel = (key, pts, r0, r1, color) => {
      const curve = catmull(pts);
      const m = new THREE.Mesh(
        makeTube(curve, t => r0 + (r1 - r0) * t, { seg: pts.length * 8, radial: 14 }),
        solid(color, { roughness: 0.3, clearcoat: 1, emissive: color, emissiveIntensity: 0.12 })
      );
      reg(m, key, { priority: 1.5 }); pulmvGroup.add(m);
      return { mesh: m, curve };
    };
    const paR = vessel('pulmv', [V3(0.05, 0.68, 0.22), V3(-0.35, 0.64, 0.18), V3(-0.82, 0.45, 0.12), V3(-1.12, 0.10, 0.14)], 0.12, 0.045, 0x4452b8);
    vessel('pulmv', [V3(0.05, 0.68, 0.22), V3(0.42, 0.62, 0.18), V3(0.86, 0.42, 0.12), V3(1.14, 0.06, 0.14)], 0.12, 0.045, 0x4452b8);
    vessel('pulmv', [V3(-1.10, -0.18, 0.16), V3(-0.74, 0.18, 0.14), V3(-0.22, 0.34, 0.10), V3(0.08, 0.38, -0.05)], 0.045, 0.10, 0xd02a30);
    vessel('pulmv', [V3(1.12, -0.22, 0.16), V3(0.76, 0.15, 0.14), V3(0.28, 0.32, 0.10), V3(0.08, 0.38, -0.05)], 0.045, 0.10, 0xd02a30);

    [-1, 1].forEach(side => {
      const isL = side > 0;
      const offset = side > 0 ? L_POS : R_POS;
      for (let i = 0; i < 10; i++) {
        let d = V3((rand() - 0.5) * 0.9, 0.55 - i * 0.13, (rand() - 0.5) * 0.8).normalize();
        const pts = [];
        for (let k = 0; k < 6; k++) {
          const p = lp(d.x, d.y, d.z, isL, 0.5, 0.5).multiplyScalar(0.84).add(offset);
          pts.push(p);
          d.add(V3(side * 0.08, -0.07 - rand() * 0.05, (rand() - 0.5) * 0.08)).normalize();
        }
        vessel('pulmv', pts, 0.016, 0.004, i % 2 === 0 ? 0xc42830 : 0x4452b8);
      }
    });

    const condMat = out.condMat = airflowMaterial();
    const rate = 0.095;
    const addAirway = (pts, r0, r1, d0, key, radial = 10) => {
      const curve = catmull(pts), len = curve.getLength();
      const m = new THREE.Mesh(
        makeTube(curve, t => r0 + (r1 - r0) * t, { seg: Math.max(10, Math.round(len * 28)), radial, delay: t => d0 + t * len * rate }),
        condMat
      );
      frame.add(m); out.cond.push(m);
      if (key) {
        const px = new THREE.Mesh(makeTube(curve, () => Math.max(0.048, r0 * 1.4), { seg: 12, radial: 6 }), new THREE.MeshBasicMaterial({ visible: false }));
        reg(px, key, { priority: 3.5, cond: true }); frame.add(px); out.cond.push(px);
      }
      return { curve, len, d0, end: d0 + len * rate, at: t => d0 + t * len * rate };
    };

    const node = (key, pLocal, delay, size = 0.07) => {
      const m = new THREE.Mesh(new THREE.SphereGeometry(size, 18, 18), new THREE.MeshBasicMaterial({ color: 0x8ffff0 }));
      m.position.copy(pLocal); frame.add(m); out.cond.push(m); out.nodes.push({ mesh: m, delay, size });
      const hit = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 10), new THREE.MeshBasicMaterial({ visible: false }));
      hit.position.copy(pLocal); reg(hit, key, { priority: 4, cond: true }); frame.add(hit); out.cond.push(hit);
      const anc = new THREE.Object3D(); anc.position.copy(pLocal); frame.add(anc); out.anchors[key] = anc;
      return m;
    };

    const trkFlow = addAirway([V3(0, 2.65, 0.02), V3(0, 1.85, 0.0), V3(0, 1.15, -0.01)], 0.042, 0.038, 0.0, 'trachea', 12);
    node('carina', V3(0, 1.15, 0.02), trkFlow.end, 0.075);

    const rMainFlow = addAirway([V3(0, 1.15, -0.01), V3(-0.38, 0.90, 0.01), V3(-0.78, 0.56, 0.03)], 0.034, 0.028, trkFlow.end, 'rbronch', 10);
    const lMainFlow = addAirway([V3(0, 1.15, -0.01), V3(0.42, 0.86, 0.01), V3(0.84, 0.48, 0.03)], 0.034, 0.028, trkFlow.end, 'lbronch', 10);

    const alvMat = solid(0xffb8c6, { roughness: 0.3, clearcoat: 0.95, emissive: 0xf43f5e, emissiveIntensity: 0.22 });
    const sacGeo = new THREE.SphereGeometry(0.052, 14, 14);
    const sacOffsets = [
      [0, 0, 0], [0.048, 0.028, 0.02], [-0.048, 0.028, -0.02], [0.028, -0.042, -0.028],
      [-0.038, -0.028, 0.038], [0, 0.056, -0.028], [0, -0.048, 0.038], [0.046, -0.018, 0.038]
    ];

    const addAlveolusCluster = (pos, delayVal, side) => {
      const cluster = new THREE.Group();
      sacOffsets.forEach(([ox, oy, oz]) => {
        const s = new THREE.Mesh(sacGeo, alvMat);
        s.position.set(ox, oy, oz);
        reg(s, 'alveoli', { priority: 3.8 });
        cluster.add(s);
      });
      cluster.position.copy(pos);
      cluster.userData = { key: 'alveoli', basePos: pos.clone(), delay: delayVal };
      addExplode(cluster, V3(side * 0.28, 0, 0.35));
      frame.add(cluster);
      out.alveoli.push(cluster);
      out.nodes.push({ mesh: cluster, delay: delayVal, size: 1 });
      return cluster;
    };

    const branchSpecs = [
      { side: -1, start: V3(-0.78, 0.56, 0.03), d0: rMainFlow.end, pts: [V3(-0.96, 1.02, 0.06), V3(-1.02, 1.46, 0.04)] },
      { side: -1, start: V3(-0.96, 1.02, 0.06), d0: rMainFlow.end + 0.05, pts: [V3(-1.26, 0.98, 0.18)] },
      { side: -1, start: V3(-0.78, 0.56, 0.03), d0: rMainFlow.end, pts: [V3(-1.14, 0.28, 0.16), V3(-1.38, 0.06, 0.22)] },
      { side: -1, start: V3(-1.14, 0.28, 0.16), d0: rMainFlow.end + 0.05, pts: [V3(-1.30, 0.48, -0.10)] },
      { side: -1, start: V3(-0.78, 0.56, 0.03), d0: rMainFlow.end, pts: [V3(-0.98, -0.12, 0.08), V3(-1.14, -0.68, 0.12), V3(-1.24, -1.16, 0.10)] },
      { side: -1, start: V3(-0.98, -0.12, 0.08), d0: rMainFlow.end + 0.06, pts: [V3(-0.76, -0.62, 0.18), V3(-0.72, -1.06, 0.14)] },
      { side: -1, start: V3(-1.14, -0.68, 0.12), d0: rMainFlow.end + 0.11, pts: [V3(-1.44, -0.92, 0.16)] },
      { side: 1, start: V3(0.84, 0.48, 0.03), d0: lMainFlow.end, pts: [V3(0.98, 0.98, 0.06), V3(1.04, 1.44, 0.04)] },
      { side: 1, start: V3(0.98, 0.98, 0.06), d0: lMainFlow.end + 0.05, pts: [V3(1.28, 0.92, 0.18)] },
      { side: 1, start: V3(0.84, 0.48, 0.03), d0: lMainFlow.end, pts: [V3(1.16, 0.22, 0.15), V3(1.38, 0.02, 0.22)] },
      { side: 1, start: V3(1.16, 0.22, 0.15), d0: lMainFlow.end + 0.05, pts: [V3(1.30, 0.46, -0.10)] },
      { side: 1, start: V3(0.84, 0.48, 0.03), d0: lMainFlow.end, pts: [V3(1.02, -0.16, 0.08), V3(1.16, -0.72, 0.12), V3(1.26, -1.18, 0.10)] },
      { side: 1, start: V3(1.02, -0.16, 0.08), d0: lMainFlow.end + 0.06, pts: [V3(0.82, -0.66, 0.18), V3(0.76, -1.08, 0.14)] },
      { side: 1, start: V3(1.16, -0.72, 0.12), d0: lMainFlow.end + 0.11, pts: [V3(1.46, -0.94, 0.16)] }
    ];

    branchSpecs.forEach((b, idx) => {
      const fullPts = [b.start, ...b.pts];
      const seg = addAirway(fullPts, 0.022, 0.011, b.d0, 'bronchiole', 8);
      const tip = b.pts[b.pts.length - 1];
      addAlveolusCluster(tip, seg.end, b.side);

      for (let k = 0; k < 2; k++) {
        const subTip = tip.clone().add(V3(b.side * (0.08 + rand() * 0.10), (rand() - 0.5) * 0.22, (rand() - 0.5) * 0.20));
        addAirway([tip, subTip], 0.009, 0.004, seg.end, null, 5);
      }
      if (idx === 9) {
        const anc = new THREE.Object3D(); anc.position.copy(b.pts[0]); frame.add(anc); out.anchors.bronchioleL = anc;
      }
    });

    const diaMat = G(0xb55a5e, { op: 0.68, min: 0.35, rim: 0xff8a8a, rough: 0.42 });
    const diaphragm = new THREE.Mesh(diaphragmGeo(), diaMat);
    diaphragm.position.set(0, -1.65, 0.02);
    diaphragm.renderOrder = 4;
    reg(diaphragm, 'diaphragm', { priority: 1.2 });
    frame.add(diaphragm);
    out.diaphragm = diaphragm;

    // Jangkar label (ikut bergeser saat Urai Struktur aktif)
    const mkAnc = (name, p, expOffset = null, parent = frame) => {
      const o = new THREE.Object3D(); o.position.copy(p); parent.add(o); out.anchors[name] = o;
      if (expOffset) addExplode(o, expOffset);
    };
    mkAnc('tracheaL', V3(-0.18, 2.02, 0.18), V3(0, 0.45, 0.25));
    mkAnc('rbronchL', rBronchCurve.getPointAt(0.55), V3(-0.22, 0.18, 0.42));
    mkAnc('lbronchL', lBronchCurve.getPointAt(0.55), V3(0.22, 0.18, 0.42));
    mkAnc('rsupL', V3(-1.12, 0.86, 0.38), R_EXP);
    mkAnc('rmidL', V3(-1.22, -0.04, 0.46), R_EXP);
    mkAnc('rinfL', V3(-1.18, -0.88, 0.38), R_EXP);
    mkAnc('lsupL', V3(1.12, 0.86, 0.38), L_EXP);
    mkAnc('alveoliL', V3(1.38, 0.02, 0.24), V3(0.28, 0, 0.35));
    mkAnc('notchL', V3(0.62, -0.38, 0.36), L_EXP);
    mkAnc('diaphragmL', V3(0.55, -1.48, 0.36), V3(0, -0.78, 0));
    mkAnc('pulmvL', paR.curve.getPointAt(0.5), V3(0, -0.05, 0.68));

    const P = (...a) => a.map(v => V3(...v));
    const o2Right1 = [0x6f8cff, [[0, 2.9, 0.02], [0, 1.9, 0.0], [0, 1.15, 0.0], [-0.45, 0.85, 0.02], [-0.82, 0.56, 0.04], [-1.02, 1.05, 0.06], [-1.08, 1.44, 0.05]]];
    const o2Right2 = [0x6f8cff, [[0, 2.9, 0.02], [0, 1.9, 0.0], [0, 1.15, 0.0], [-0.45, 0.85, 0.02], [-0.82, 0.56, 0.04], [-1.02, -0.15, 0.08], [-1.22, -1.12, 0.10]]];
    const o2Left1  = [0x6f8cff, [[0, 2.9, 0.02], [0, 1.9, 0.0], [0, 1.15, 0.0], [0.48, 0.82, 0.02], [0.86, 0.48, 0.04], [1.18, 0.22, 0.15], [1.38, 0.02, 0.22]]];
    const o2Left2  = [0x6f8cff, [[0, 2.9, 0.02], [0, 1.9, 0.0], [0, 1.15, 0.0], [0.48, 0.82, 0.02], [0.86, 0.48, 0.04], [1.04, -0.18, 0.08], [1.26, -1.16, 0.10]]];
    const co2Right = [0xff3a2e, [[-1.34, 0.06, 0.20], [-1.10, 0.28, 0.14], [-0.78, 0.56, 0.03], [-0.38, 0.90, 0.01], [0, 1.15, 0.0], [0, 2.0, 0.0], [0, 2.9, 0.02]]];
    const co2Left  = [0xff3a2e, [[1.26, -1.12, 0.10], [1.02, -0.16, 0.08], [0.84, 0.48, 0.03], [0.42, 0.86, 0.01], [0, 1.15, 0.0], [0, 2.0, 0.0], [0, 2.9, 0.02]]];

    out.paths = [o2Right1, o2Right2, o2Left1, o2Left2, co2Right, co2Left].map(([c, pts]) => ({
      color: new THREE.Color(c),
      curve: catmull(P(...pts), 0.5)
    }));
    out.glowTex = glowSprite();
    return out;
  }

  return { build, V3, sstep, ROT, FRAME_POS, lp };
})();