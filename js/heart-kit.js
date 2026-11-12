/* ============================================================
   HEART-KIT.JS — Generator jantung 3D realistis (100% prosedural)
   Tanpa file model eksternal. Semua geometri, tekstur & shader
   dibuat lewat kode. Koordinat: +x = sisi kiri pasien (kanan layar).
   ============================================================ */
const HeartKit = (() => {
  const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
  const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

  // RNG deterministik -> bentuk jantung selalu sama setiap dimuat
  let _s = 20240607;
  const rand = () => { _s |= 0; _s = _s + 0x6D2B79F5 | 0; let t = Math.imul(_s ^ _s >>> 15, 1 | _s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const resetRand = () => { _s = 20240607; };

  // ---------- Noise (value noise + fBm) untuk tekstur otot ----------
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

  // ---------- Bentuk ventrikel ----------
  const ROT = 0.42, FRAME_POS = V3(0.2, -0.15, 0);
  function vp(x, y, z, amp = 1, fine = 1, out = V3()) {
    const k = y < 0 ? Math.pow(Math.min(1, -y), 1.4) : 0;          // meruncing ke apeks
    const taper = 1 - 0.6 * k;
    const yy = y > 0.55 ? 0.55 + (y - 0.55) * 0.35 : y;            // dasar diratakan
    const px = x * 0.98 * taper, pz = z * 0.9 * taper * (z < 0 ? 0.8 : 1), py = yy * 1.5;
    const gx = z >= 0 ? 0.30 : 0.12, dx = x - gx;                   // sulkus interventrikular
    const ivg = 0.085 * Math.exp(-dx * dx / 0.010) * (1 - sstep(0.35, 0.7, y)) * sstep(0.1, 0.4, Math.abs(z));
    const avg = 0.05 * Math.exp(-((y - 0.5) * (y - 0.5)) / 0.006);  // sulkus atrioventrikular
    const bulge = 0.10 * Math.exp(-(((x + 0.5) ** 2) + ((y + 0.1) ** 2) * 0.7 + ((z - 0.75) ** 2) * 1.6) / 0.30); // tonjolan RV
    const n1 = fbm(x, y, z, 2.2, 3) - 0.5, n2 = fbm(x + 9, y + 3, z + 5, 9, 3) - 0.5;
    const s = (1 - ivg - avg + bulge) * (1 + amp * (n1 * 0.07 + fine * n2 * 0.025));
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

  function ventGeo(scale, amp, fine, w = 160, h = 120) {
    const g = new THREE.SphereGeometry(1, w, h), p = g.attributes.position, t = V3();
    for (let i = 0; i < p.count; i++) { vp(p.getX(i), p.getY(i), p.getZ(i), amp, fine, t); p.setXYZ(i, t.x * scale, t.y * scale, t.z * scale); }
    g.computeVertexNormals(); fixSphereNormals(g, w, h);
    return g;
  }

  function blobGeo({ r, rot = [0, 0, 0], amp = 0.06, seed = 1, crenel = 0, w = 80, h = 56 }) {
    const g = new THREE.SphereGeometry(1, w, h), p = g.attributes.position;
    const e = new THREE.Euler(rot[0], rot[1], rot[2]), v = V3();
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const n = (fbm(x + seed * 7, y + seed * 3, z + seed * 5, 2.4, 3) - 0.5) * 2 * amp
              + (fbm(x + seed, y, z, 11, 2) - 0.5) * crenel;
      v.set(x * r[0], y * r[1], z * r[2]).multiplyScalar(1 + n).applyEuler(e);
      p.setXYZ(i, v.x, v.y, v.z);
    }
    g.computeVertexNormals(); fixSphereNormals(g, w, h);
    return g;
  }

  function makeTube(curve, radiusFn, { seg = 80, radial = 20, delay = null } = {}) {
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

  function muscleTexture() {
    if (typeof document === 'undefined') return null;
    const c = document.createElement('canvas'); c.width = c.height = 512;
    const x = c.getContext('2d');
    x.fillStyle = '#808080'; x.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 4200; i++) {
      const px = rand() * 512, py = rand() * 512, len = 30 + rand() * 90, tilt = (rand() - 0.5) * 0.35;
      const l = rand() > 0.5 ? 255 : 0;
      x.strokeStyle = `rgba(${l},${l},${l},${0.03 + rand() * 0.07})`;
      x.lineWidth = 0.6 + rand() * 1.8;
      x.beginPath(); x.moveTo(px, py); x.quadraticCurveTo(px + tilt * len, py + len / 2, px + tilt * len * 0.6, py + len); x.stroke();
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

  function glass(color, { op = 0.6, min = 0.3, rim = 0xff9a9a, bump = null, rough = 0.38 } = {}) {
    const m = new THREE.MeshPhysicalMaterial({
      color, roughness: rough, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.25,
      transparent: true, opacity: op, side: THREE.DoubleSide, depthWrite: false,
      bumpMap: bump, bumpScale: 1.4, envMapIntensity: 0.9
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
    { color, roughness: 0.5, metalness: 0, clearcoat: 0.5, clearcoatRoughness: 0.35, envMapIntensity: 0.8 }, o));

  function conductionMaterial() {
    return new THREE.ShaderMaterial({
      uniforms: { uPhase: { value: 0 }, uColor: { value: new THREE.Color(0x19f2c4) }, uBoost: { value: 1 } },
      side: THREE.DoubleSide,
      vertexShader: `attribute float aDelay; varying float vD; varying vec3 vN;
        void main(){ vD = aDelay; vN = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `uniform float uPhase; uniform vec3 uColor; uniform float uBoost; varying float vD; varying vec3 vN;
        void main(){ float dt = uPhase - vD;
          float head = exp(-dt * dt / 0.0018);
          float tail = dt > 0.0 ? exp(-dt / 0.10) * 0.55 : 0.0;
          float g = 0.30 + (head * 2.6 + tail) * uBoost;
          gl_FragColor = vec4(uColor * g * (0.6 + 0.4 * abs(vN.z)), 1.0); }`
    });
  }

  // ============================================================
  //  BUILD — merakit seluruh jantung
  // ============================================================
  function build() {
    resetRand();
    const out = {
      clickables: [], glass: [], cond: [], condLabels: {}, nodes: [], anchors: {},
      pumps: {}, paths: [], chambers: {}, dissectables: [], explodables: []
    };
    const root = new THREE.Group();
    const frame = new THREE.Group();
    frame.rotation.z = ROT; frame.position.copy(FRAME_POS);
    root.add(frame); frame.updateMatrix(); frame.updateMatrixWorld(true);
    out.root = root; out.frame = frame;
    const W2L = (v) => v.clone().applyMatrix4(frame.matrix.clone().invert());

    const bump = muscleTexture();
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

    // --- Ventrikel: dinding kaca + endokardium bagian dalam ---
    const vent = new THREE.Mesh(ventGeo(1, 1, 1, 176, 128), G(0xd9777b, { op: 0.62, min: 0.30, rim: 0xffb4b0 }));
    vent.renderOrder = 5;
    reg(vent, 'vent', { priority: 0.5, dissectable: true, resolve: (pLocal) => {
      const uy = pLocal.y / 1.5, k = uy < 0 ? Math.pow(Math.min(1, -uy), 1.4) : 0, taper = 1 - 0.6 * k;
      const gx = (pLocal.z >= 0 ? 0.30 : 0.12) * 0.98 * taper;
      return pLocal.x > gx ? 'lv' : 'rv';
    } });
    markDissect(vent);
    addExplode(vent, V3(0, -0.32, -0.18));
    frame.add(vent);

    const endo = new THREE.Mesh(ventGeo(0.86, 1.8, 2.2, 128, 96), solid(0x74222b, { side: THREE.BackSide, roughness: 0.7, clearcoat: 0.25, bumpMap: bump, bumpScale: 2.2 }));
    markDissect(endo);
    addExplode(endo, V3(0, -0.32, -0.18));
    frame.add(endo);

    // septum (sekat) setengah tembus
    const sg = new THREE.PlaneGeometry(1, 1, 24, 24), sp = sg.attributes.position, tmp = V3();
    for (let i = 0; i < sp.count; i++) {
      const u = sp.getX(i) + 0.5, v = sp.getY(i) + 0.5, y = -0.95 + v * 1.4, z = (u - 0.5) * 1.3;
      vp(0.24 + 0.05 * Math.sin(v * 3), y, z, 0, 0, tmp); sp.setXYZ(i, tmp.x * 0.9, tmp.y, tmp.z * 0.9);
    }
    sg.computeVertexNormals();
    const septum = new THREE.Mesh(sg, G(0xb55a5e, { op: 0.4, min: 0.35, rim: 0xff8a8a }));
    septum.renderOrder = 4;
    frame.add(septum);

    // --- Atrium & aurikel (dunia, di luar frame) ---
    const mkBlob = (key, color, c, o, rim, expOffset) => {
      const m = new THREE.Mesh(blobGeo(o), G(color, { op: 0.58, min: 0.28, rim: rim || 0xffb4b0 }));
      m.position.set(...c); m.renderOrder = 5; reg(m, key, { dissectable: true }); root.add(m);
      const lumen = new THREE.Mesh(m.geometry, solid(0x5a1d33, { side: THREE.BackSide, roughness: 0.8, clearcoat: 0.1 }));
      lumen.scale.setScalar(0.93); m.add(lumen);
      markDissect(m);
      if (expOffset) addExplode(m, expOffset);
      return m;
    };
    const ra = mkBlob('ra', 0xd98688, [-0.95, 0.98, 0.1], { r: [0.5, 0.64, 0.47], rot: [0, 0, 0.1], amp: 0.05, seed: 2 }, 0xffb0b8, V3(-0.78, 0.32, 0.18));
    const raa = mkBlob('ra', 0xd98688, [-0.5, 1.5, 0.62], { r: [0.42, 0.3, 0.14], rot: [0, 0.2, 0.6], amp: 0.05, crenel: 0.35, seed: 3 }, 0xffb0b8, V3(-0.78, 0.32, 0.18));
    const la = mkBlob('la', 0xe0908f, [0.3, 1.12, -0.5], { r: [0.8, 0.42, 0.42], rot: [0, 0, 0.12], amp: 0.05, seed: 4 }, 0xffb4b0, V3(0.75, 0.35, -0.35));
    const laa = mkBlob('la', 0xe0908f, [0.98, 1.12, 0.32], { r: [0.36, 0.27, 0.14], rot: [0, -0.3, -0.55], amp: 0.05, crenel: 0.35, seed: 5 }, 0xffb4b0, V3(0.75, 0.35, 0.25));
    out.pumps = { ra: [ra, raa], la: [la, laa] };
    out.chambers = { leftVent: vent, rightVent: vent, leftAtrium: la, rightAtrium: ra };

    // --- Pembuluh besar ---
    const vessel = (key, pts, r0, r1, color, opts = {}) => {
      const curve = catmull(pts);
      const geo = makeTube(curve, t => (r0 + (r1 - r0) * t) * (opts.bulge ? 1 + 0.22 * Math.exp(-Math.pow((t - 0.04) / 0.05, 2)) : 1), { seg: opts.seg || 70, radial: 28 });
      const m = new THREE.Mesh(geo, G(color, { op: opts.op || 0.62, min: 0.3, rim: opts.rim || 0xffb0b0 }));
      m.renderOrder = 5; reg(m, key); root.add(m);
      if (opts.explode) addExplode(m, opts.explode);
      return { mesh: m, curve };
    };
    const A = 0xe07a7a, Bv = 0x8f86d6;
    const aortaExp = V3(0.15, 0.88, -0.1);
    const aorta = vessel('aorta', [V3(-0.07, 0.62, 0), V3(-0.04, 1.2, 0.12), V3(0.05, 1.85, 0.12), V3(0.3, 2.4, 0.0), V3(0.75, 2.5, -0.25), V3(1.15, 2.2, -0.45), V3(1.25, 1.5, -0.65), V3(1.25, 0.8, -0.7)], 0.31, 0.25, A, { bulge: true, seg: 110, explode: aortaExp });
    [[0.22, 2.42, 0.02, 0.12, 0.07], [0.5, 2.5, -0.1, 0.18, 0.06], [0.78, 2.52, -0.22, 0.28, 0.07]].forEach(([x, y, z, dx, r]) =>
      vessel('aorta', [V3(x, y, z), V3(x + dx * 0.3, y + 0.35, z), V3(x + dx, y + 0.7, z - 0.02)], r * 1.5, r, A, { seg: 20, explode: aortaExp }));

    const pulmExp = V3(0.35, 0.68, 0.55);
    const pulm = vessel('pulm', [V3(0.22, 0.7, 0.5), V3(0.3, 1.2, 0.5), V3(0.42, 1.8, 0.3), V3(0.55, 2.1, 0.0)], 0.28, 0.23, 0x9d8ad8, { bulge: true, rim: 0xb0b0ff, explode: pulmExp });
    vessel('pulm', [V3(0.55, 2.1, 0.0), V3(1.0, 2.16, -0.2), V3(1.5, 2.1, -0.38)], 0.22, 0.15, 0x9d8ad8, { rim: 0xb0b0ff, explode: pulmExp });
    vessel('pulm', [V3(0.55, 2.1, 0.0), V3(0.15, 2.05, -0.3), V3(-0.5, 2.0, -0.45), V3(-1.0, 1.95, -0.46)], 0.2, 0.15, 0x9d8ad8, { rim: 0xb0b0ff, explode: pulmExp });

    const svcExp = V3(-0.68, 0.78, 0.08);
    const ivcExp = V3(-0.68, -0.65, -0.12);
    const svc = vessel('svc', [V3(-1.0, 1.45, 0.05), V3(-1.0, 2.1, 0.0), V3(-1.0, 2.85, -0.05)], 0.23, 0.22, Bv, { rim: 0x9fb4ff, explode: svcExp });
    const ivc = vessel('ivc', [V3(-0.95, 0.45, -0.15), V3(-0.97, -0.05, -0.2), V3(-0.95, -0.5, -0.25)], 0.26, 0.25, Bv, { rim: 0x9fb4ff, explode: ivcExp });
    [[[-0.2, 1.3, -0.62], [-0.9, 1.55, -0.85], [-1.4, 1.65, -0.95]], [[-0.3, 0.98, -0.66], [-1.0, 1.0, -0.95], [-1.45, 0.95, -1.0]],
     [[0.9, 1.3, -0.55], [1.5, 1.6, -0.75], [1.9, 1.7, -0.85]], [[0.95, 0.98, -0.5], [1.55, 0.9, -0.78], [1.95, 0.85, -0.9]]]
      .forEach((p, idx) => vessel('pv', p.map(a => V3(...a)), 0.14, 0.12, A, { seg: 24, rim: 0xffb0b0, explode: V3(idx < 2 ? -0.55 : 0.85, 0.35, -0.45) }));

    // --- Pembuluh koroner (menempel di permukaan jantung, dikelompokkan agar bisa diurai & dibedah) ---
    const corGroup = new THREE.Group();
    frame.add(corGroup);
    addExplode(corGroup, V3(0, 0.05, 0.72));

    const onSurf = (dirs, s = 1.02) => dirs.map(d => { const n = d.clone().normalize(); return vp(n.x, n.y, n.z, 1, 1).multiplyScalar(s); });
    const unitLine = (f, n) => Array.from({ length: n }, (_, i) => f(i / (n - 1)));
    const cor = (key, pts, r0, r1, color) => {
      const m = new THREE.Mesh(makeTube(catmull(pts), t => r0 + (r1 - r0) * t, { seg: pts.length * 6, radial: 10 }),
        solid(color, { roughness: 0.3, clearcoat: 1, side: THREE.DoubleSide, emissive: color, emissiveIntensity: 0.12 }));
      reg(m, key, { priority: 1.2, dissectable: true });
      markDissect(m);
      corGroup.add(m); return m;
    };
    const lad = unitLine(t => V3(0.24 + 0.1 * t, 0.55 - 1.52 * t, 0), 14).map(v => { v.z = Math.sqrt(Math.max(0.02, 1 - v.x * v.x - v.y * v.y)); return v; });
    const ladP = onSurf(lad);
    cor('lad', ladP, 0.045, 0.02, 0xd02a30);
    cor('rca', onSurf(unitLine(t => { const a = 0.35 - t * 2.6; return V3(0.84 * Math.sin(a), 0.55, 0.84 * Math.cos(a)); }, 16)), 0.045, 0.028, 0xd02a30);
    cor('lad', onSurf(unitLine(t => { const a = 0.35 + t * 2.0; return V3(0.84 * Math.sin(a), 0.55, 0.84 * Math.cos(a)); }, 12)), 0.04, 0.02, 0xd02a30);
    cor('vein', onSurf(lad.map(v => V3(v.x + 0.12, v.y, v.z))), 0.04, 0.022, 0x4452b8);
    for (let i = 0; i < 22; i++) {
      const base = ladP[2 + Math.floor(rand() * 10)], side = rand() > 0.35 ? 1 : -1;
      let d = base.clone().normalize(); const pts = [];
      for (let k = 0; k < 7; k++) { const p = vp(d.x, d.y, d.z, 1, 1).multiplyScalar(1.02); pts.push(p);
        d.add(V3(side * 0.09 + (rand() - 0.5) * 0.05, -0.05 - rand() * 0.05, (rand() - 0.5) * 0.06)).normalize(); }
      cor('lad', pts, 0.016, 0.004, rand() > 0.3 ? 0xc42830 : 0x4452b8);
    }

    // --- Katup ---
    const cream = solid(0xf1dcb4, { side: THREE.DoubleSide, roughness: 0.45, emissive: 0x2a1a08, emissiveIntensity: 0.25 });
    const avValve = (key, n, c, r, expOffset) => {
      const g = new THREE.Group(), seg = Math.PI * 2 / n;
      for (let i = 0; i < n; i++) {
        const geo = new THREE.CylinderGeometry(r, r * 0.5, 0.4, 20, 1, true, i * seg + 0.14, seg - 0.28); geo.translate(0, -0.2, 0);
        g.add(new THREE.Mesh(geo, cream));
      }
      const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.035, 10, 40), cream); ring.rotation.x = Math.PI / 2; g.add(ring);
      g.position.copy(c); g.traverse(o => { if (o.isMesh) reg(o, key, { priority: 2 }); }); frame.add(g);
      if (expOffset) addExplode(g, expOffset);
      return g;
    };
    out.mitral = avValve('mitral', 2, V3(0.42, 0.74, -0.14), 0.3, V3(0.35, 0.22, 0.45));
    out.tricus = avValve('tri', 3, V3(-0.4, 0.76, 0.22), 0.32, V3(-0.35, 0.22, 0.45));
    const semi = (key, c, r, rotY, local, expOffset) => {
      const g = new THREE.Group();
      for (let i = 0; i < 3; i++) {
        const geo = new THREE.SphereGeometry(r, 18, 12, i * Math.PI * 2 / 3 + 0.1, Math.PI * 2 / 3 - 0.2, Math.PI / 2, Math.PI / 2); geo.scale(1, 0.8, 1);
        g.add(new THREE.Mesh(geo, cream));
      }
      g.position.copy(c); g.rotation.y = rotY; g.traverse(o => { if (o.isMesh) reg(o, key, { priority: 2 }); });
      (local ? frame : root).add(g);
      if (expOffset) addExplode(g, expOffset);
      return g;
    };
    semi('aov', W2L(V3(-0.07, 0.72, 0)).add(V3(0, 0.0, 0)), 0.26, 0.3, true, V3(0.05, 0.38, 0.35)).rotation.z = -ROT * 0;
    semi('pov', W2L(V3(0.22, 0.8, 0.5)), 0.23, 0.9, true, V3(0.22, 0.42, 0.52));

    // --- Otot papilar + chordae tendineae ---
    const pmMat = solid(0x8a2b30, { roughness: 0.55, bumpMap: bump, bumpScale: 2 });
    const chord = [];
    const papGroup = new THREE.Group();
    frame.add(papGroup);
    addExplode(papGroup, V3(0, -0.12, 0.32));

    const papillary = (baseDir, tipLocal, r, key, ringC, ringR, n) => {
      const b = baseDir.clone().normalize(), bp = vp(b.x, b.y, b.z, 0, 0).multiplyScalar(0.86);
      const mid = bp.clone().lerp(tipLocal, 0.5).add(V3(0, 0, 0));
      const m = new THREE.Mesh(makeTube(catmull([bp, mid, tipLocal]), t => r * (1 - 0.45 * t) * (t > 0.92 ? 0.7 : 1), { seg: 16, radial: 12 }), pmMat);
      reg(m, 'pap', { priority: 1.5 }); papGroup.add(m);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + rand() * 0.3, e = ringC.clone().add(V3(Math.cos(a) * ringR * 0.8, -0.34 - rand() * 0.06, Math.sin(a) * ringR * 0.8));
        const mp = tipLocal.clone().lerp(e, 0.5).add(V3((rand() - 0.5) * 0.06, 0, (rand() - 0.5) * 0.06));
        [[tipLocal, mp], [mp, e]].forEach(([p, q]) => chord.push(p.x, p.y, p.z, q.x, q.y, q.z));
      }
    };
    const mc = out.mitral.position, tc = out.tricus.position;
    papillary(V3(0.82, -0.5, 0.35), V3(0.5, 0.2, 0.05), 0.085, 'pap', mc, 0.3, 14);
    papillary(V3(0.78, -0.45, -0.45), V3(0.35, 0.2, -0.3), 0.08, 'pap', mc, 0.3, 14);
    papillary(V3(-0.5, -0.55, 0.7), V3(-0.4, 0.28, 0.35), 0.06, 'pap', tc, 0.32, 10);
    papillary(V3(-0.2, -0.75, 0.55), V3(-0.28, 0.25, 0.4), 0.05, 'pap', tc, 0.32, 8);
    papillary(V3(-0.65, -0.3, 0.2), V3(-0.55, 0.3, 0.1), 0.045, 'pap', tc, 0.32, 8);
    const cg = new THREE.BufferGeometry(); cg.setAttribute('position', new THREE.Float32BufferAttribute(chord, 3));
    papGroup.add(new THREE.LineSegments(cg, new THREE.LineBasicMaterial({ color: 0xf0e2c8, transparent: true, opacity: 0.85 })));

    // --- Sistem konduksi listrik ---
    const condMat = out.condMat = conductionMaterial();
    const dpu = { atrial: 0.04, av: 0.45, his: 0.05, bundle: 0.06, purk: 0.085 };
    const addCond = (pts, r0, r1, d0, rate, key, radial = 10) => {
      const curve = catmull(pts), len = curve.getLength();
      const m = new THREE.Mesh(makeTube(curve, t => r0 + (r1 - r0) * t, { seg: Math.max(10, Math.round(len * 30)), radial, delay: t => d0 + t * len * rate }), condMat);
      frame.add(m); out.cond.push(m);
      if (key) { const px = new THREE.Mesh(makeTube(curve, () => 0.05, { seg: 14, radial: 6 }), new THREE.MeshBasicMaterial({ visible: false }));
        reg(px, key, { priority: 4, cond: true }); frame.add(px); out.cond.push(px); }
      return { curve, len, d0, rate, end: d0 + len * rate, at: t => d0 + t * len * rate };
    };
    const node = (key, pLocal, delay, size = 0.075) => {
      const m = new THREE.Mesh(new THREE.SphereGeometry(size, 20, 20), new THREE.MeshBasicMaterial({ color: 0x8ffff0 }));
      m.position.copy(pLocal); frame.add(m); out.cond.push(m); out.nodes.push({ mesh: m, delay, size });
      const hit = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 10), new THREE.MeshBasicMaterial({ visible: false }));
      hit.position.copy(pLocal); reg(hit, key, { priority: 4, cond: true }); frame.add(hit); out.cond.push(hit);
      const anc = new THREE.Object3D(); anc.position.copy(pLocal); frame.add(anc); out.anchors[key] = anc;
      return m;
    };
    const SA = W2L(V3(-1.0, 1.52, 0.2)), AVn = V3(-0.2, 0.70, 0.08), AVx = V3(-0.04, 0.66, 0.1);
    const inter = addCond([SA, W2L(V3(-0.88, 1.2, 0.38)), W2L(V3(-0.62, 0.92, 0.3)), W2L(V3(-0.42, 0.72, 0.22)), AVn], 0.014, 0.016, 0, dpu.atrial, null, 8);
    addCond([SA, W2L(V3(-0.5, 1.62, 0.1)), W2L(V3(0.1, 1.55, -0.2)), W2L(V3(0.55, 1.35, -0.38))], 0.012, 0.012, 0, dpu.atrial, null, 8);
    addCond([SA, W2L(V3(-1.2, 1.25, 0.1)), W2L(V3(-1.1, 0.85, -0.1)), W2L(V3(-0.6, 0.7, 0.0)), AVn], 0.011, 0.012, 0, dpu.atrial, null, 8);
    const avSeg = addCond([AVn, AVx], 0.018, 0.02, inter.end, dpu.av, null, 10);
    const hisP = [AVx, V3(0.02, 0.56, 0.1), V3(0.12, 0.44, 0.08), V3(0.19, 0.34, 0.05)];
    const his = addCond(hisP, 0.022, 0.022, avSeg.end, dpu.his, 'his', 12);
    const lbb = addCond([V3(0.19, 0.34, 0.05), V3(0.26, 0.1, 0.01), V3(0.27, -0.4, 0.02), V3(0.2, -0.9, 0.04), V3(0.08, -1.3, 0.06)], 0.02, 0.012, his.end, dpu.bundle, 'lbb', 12);
    const rbb = addCond([V3(0.17, 0.36, 0.1), V3(0.05, 0.1, 0.24), V3(-0.12, -0.5, 0.36), V3(-0.22, -1.0, 0.34), V3(-0.1, -1.3, 0.2)], 0.018, 0.011, his.end, dpu.bundle, 'rbb', 12);
    node('sa', SA, 0, 0.085); node('av', AVn, inter.end, 0.075); node('his', V3(0.1, 0.46, 0.08), his.at(0.5), 0.055);

    // jangkar label (ikut bergeser saat mode Urai Struktur aktif)
    const mkAnc = (name, p, parent = frame, expOffset = null) => {
      const o = new THREE.Object3D(); o.position.copy(p); parent.add(o); out.anchors[name] = o;
      if (expOffset) addExplode(o, expOffset);
    };
    mkAnc('lbbL', lbb.curve.getPointAt(0.45));
    mkAnc('rbbL', rbb.curve.getPointAt(0.55));
    mkAnc('aortaL', aorta.curve.getPointAt(0.3), root, aortaExp);
    mkAnc('pulmL', pulm.curve.getPointAt(0.55), root, pulmExp);
    mkAnc('svcL', svc.curve.getPointAt(0.55), root, svcExp);
    mkAnc('ivcL', ivc.curve.getPointAt(0.5), root, ivcExp);
    mkAnc('lvL', V3(0.75, -0.55, 0.5), frame, V3(0, -0.32, -0.18));
    mkAnc('raL', V3(-1.2, 1.0, 0.45), root, V3(-0.78, 0.32, 0.18));
    mkAnc('mitralL', mc.clone().add(V3(0.1, 0, 0.1)), frame, V3(0.35, 0.22, 0.45));

    // serabut Purkinje: jalan acak pada endokardium
    const purk = (side, tAt, d0, y0) => {
      const walk = (dir, steps, d, depth) => {
        const pts = [], dirs = [];
        for (let i = 0; i < steps; i++) {
          const p = vp(dir.x, dir.y, dir.z, 0, 0).multiplyScalar(0.855); pts.push(p); dirs.push(dir.clone());
          dir.add(V3(side * (0.07 + rand() * 0.05), -0.07 - rand() * 0.04, (rand() - 0.5) * 0.12 + (d.z > 0 ? 0.02 : -0.02))).normalize();
        }
        const tube = addCond(pts, 0.009, 0.004, d.at, dpu.purk, null, 5);
        if (depth < 2 && steps >= 7) for (let b = 0; b < 2; b++) { const k = 2 + Math.floor(rand() * (steps - 5)); walk(dirs[k].clone(), steps - k, { z: rand() - 0.5, at: tube.at(k / steps) }, depth + 1); }
      };
      const dir0 = V3(side * 0.42 + 0.1, y0, (rand() - 0.5) * 0.9).normalize();
      walk(dir0, 9, { z: dir0.z, at: d0 }, 0);
    };
    for (let i = 0; i < 9; i++) { const t = 0.2 + i * 0.09; purk(1, 0, lbb.at(t), 0.35 - t * 1.6 + 0.25); }
    for (let i = 0; i < 6; i++) { const t = 0.25 + i * 0.12; purk(-1, 0, rbb.at(t), 0.35 - t * 1.6 + 0.2); }
    out.timeline = { sa: 0, avEnd: avSeg.end, hisEnd: his.end, vEnd: 0.34 };

    // --- Jalur aliran darah ---
    const P = (...a) => a.map(v => V3(...v));
    const deoxy = [0x6f8cff, [[-1.0, 2.8, -0.05], [-1.0, 1.9, 0.05], [-0.98, 1.1, 0.12], [-0.6, 0.55, 0.22], [-0.45, -0.3, 0.4], [-0.1, 0.1, 0.62], [0.2, 0.75, 0.55], [0.3, 1.3, 0.5], [0.45, 1.9, 0.25], [1.0, 2.15, -0.2], [1.6, 2.1, -0.4]]];
    const deoxy2 = [0x6f8cff, [[-0.95, -0.45, -0.25], [-0.97, 0.2, -0.18], [-0.95, 0.85, 0.05], [-0.6, 0.55, 0.22], [-0.45, -0.3, 0.4], [-0.1, 0.1, 0.62], [0.2, 0.75, 0.55], [0.3, 1.3, 0.5], [0.45, 1.9, 0.25], [-0.4, 2.0, -0.4], [-1.1, 1.95, -0.46]]];
    const oxy = [0xff3a2e, [[1.9, 1.7, -0.85], [1.2, 1.5, -0.7], [0.6, 1.15, -0.45], [0.45, 0.65, -0.1], [0.55, -0.2, 0.1], [0.3, 0.3, 0.0], [-0.04, 0.9, 0.08], [0.03, 1.8, 0.12], [0.3, 2.4, 0.0], [0.8, 2.5, -0.25], [1.2, 2.1, -0.5], [1.25, 0.8, -0.7]]];
    const oxy2 = [0xff3a2e, [[-1.45, 1.65, -0.95], [-0.8, 1.45, -0.8], [-0.1, 1.2, -0.55], [0.45, 0.65, -0.1], [0.55, -0.2, 0.1], [0.3, 0.3, 0.0], [-0.04, 0.9, 0.08], [0.03, 1.8, 0.12], [0.3, 2.4, 0.0], [0.8, 2.5, -0.25], [1.2, 2.1, -0.5], [1.25, 0.8, -0.7]]];
    out.paths = [deoxy, deoxy2, oxy, oxy2].map(([c, pts]) => ({ color: new THREE.Color(c), curve: catmull(P(...pts), 0.5) }));
    out.glowTex = glowSprite();
    return out;
  }

  return { build, V3, sstep, ROT, FRAME_POS, vp };
})();