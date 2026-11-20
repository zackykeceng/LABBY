/* ============================================================
   THREE-SCENE.JS — Base 3D Scene Manager (v11.2 Home + Audio Pause Sync)
   Fitur: Early-boot Graphics Quality Tiering (Tinggi / Sedang / Ringan)
   dengan lazy PMREM allocation, Surgical Softbox Environment, studio
   radial spotlight backdrop, virtual simulation clock (pause & slow-mo),
   sinkronisasi jeda suara, smooth camera flyTo, dan soft pan clamp.
   ============================================================ */

class ThreeScene {
  constructor(container) {
    if (typeof THREE === 'undefined') {
      throw new Error('THREE tidak tersedia. Pastikan index.html memuat Three.js.');
    }
    if (typeof THREE.OrbitControls === 'undefined') {
      throw new Error('OrbitControls tidak tersedia. Cek import di index.html.');
    }

    this.container = container;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight || 1,
      0.08,
      1000
    );
    this.camera.position.set(0, 0, 8);
    this._defaultCamPos = new THREE.Vector3(0, 0, 8);
    this._defaultTarget = new THREE.Vector3(0, 0, 0);

    this._loadingEl = document.createElement('div');
    this._loadingEl.className = 'scene-loading';
    this._loadingEl.innerHTML = `<div class="spinner"></div><span>Menyiapkan model 3D…</span>`;
    container.appendChild(this._loadingEl);

    let savedQ = 'high';
    try {
      const q = localStorage.getItem('labby_gfx_quality');
      if (q === 'high' || q === 'medium' || q === 'low') savedQ = q;
    } catch (e) {}
    this._quality = savedQ;

    try {
      this.renderer = new THREE.WebGLRenderer({
        antialias: savedQ !== 'low',
        alpha: true,
        powerPreference: 'high-performance'
      });
    } catch (e) {
      container.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#fca5a5;padding:2rem;text-align:center;font-family:Inter,sans-serif;">
        <div><b>WebGL tidak didukung</b><br>
        Browser Anda belum mendukung WebGL. Coba Chrome/Firefox terbaru atau aktifkan akselerasi hardware.</div>
      </div>`;
      throw new Error('WebGL not supported');
    }

    const dpr = window.devicePixelRatio || 1;
    const initPR = savedQ === 'high' ? Math.min(dpr, 2) : savedQ === 'medium' ? Math.min(dpr, 1.35) : 1.0;
    this.renderer.setPixelRatio(initPR);
    this.renderer.setSize(container.clientWidth || 800, container.clientHeight || 500);
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.shadowMap.enabled = (savedQ === 'high');
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.localClippingEnabled = true;
    if ('outputColorSpace' in this.renderer && THREE.SRGBColorSpace) {
      this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    } else if ('outputEncoding' in this.renderer && THREE.sRGBEncoding) {
      this.renderer.outputEncoding = THREE.sRGBEncoding;
    }
    container.appendChild(this.renderer.domElement);

    this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.075;
    this.controls.rotateSpeed = 0.82;
    this.controls.zoomSpeed = 1.0;
    this.controls.minDistance = 2.5;
    this.controls.maxDistance = 18;
    this.controls.enablePan = true;
    this.controls.screenSpacePanning = true;
    this.controls.panSpeed = 0.55;
    this._maxPanRadius = 4.2;

    this._fly = null;
    this._onUserControlStart = () => { this._fly = null; };
    this.controls.addEventListener('start', this._onUserControlStart);

    this.setupLights();
    this.setupResize();

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.clickableObjects = [];
    this.clock = new THREE.Clock();
    this.animations = [];
    this._isVisible = true;

    this.paused = false;
    this.timeScale = 1.0;
    this._simTime = 0;
    this._lastPerf = performance.now();
    this._studioMotes = null;
    this._studioDome = null;
    this._envRT = null;
    this._envOpts = null;

    this.animate = this.animate.bind(this);
    this.animate();

    console.log('✓ ThreeScene v11.2 initialized (r' + THREE.REVISION + ', quality=' + this._quality + ')');
  }

  hideLoading() {
    if (this._loadingEl) {
      this._loadingEl.classList.add('hidden');
      setTimeout(() => {
        if (this._loadingEl && this._loadingEl.parentNode) this._loadingEl.remove();
      }, 350);
    }
  }

  setQuality(tier) {
    const t = (tier === 'low' || tier === 'medium') ? tier : 'high';
    this._quality = t;
    const dpr = window.devicePixelRatio || 1;
    const targetPR = t === 'high' ? Math.min(dpr, 2) : t === 'medium' ? Math.min(dpr, 1.35) : 1.0;
    if (this.renderer) {
      this.renderer.shadowMap.enabled = (t === 'high');
      this.renderer.setPixelRatio(targetPR);
      const w = this.container.clientWidth || 800;
      const h = this.container.clientHeight || 500;
      this.renderer.setSize(w, h);
      if (this.composer) this.composer.setSize(w, h);
    }
    if (this.bloom) {
      this.bloom.enabled = (t === 'high');
    }
    if (t === 'low') {
      this.scene.environment = null;
    } else {
      if (!this._envRT && this._envOpts) {
        this.enableSurgicalEnvironment(this._envOpts);
      } else if (this._envRT) {
        this.scene.environment = this._envRT.texture;
      }
    }
    if (this._studioMotes) {
      this._studioMotes.visible = (t !== 'low');
      if (this._studioMotes.material) {
        this._studioMotes.material.opacity = t === 'high' ? 0.20 : 0.11;
      }
    }
    return t;
  }

  getQuality() {
    return this._quality;
  }

  setPaused(flag) {
    this.paused = !!flag;
    if (typeof Sound !== 'undefined' && typeof Sound.setSimulationPaused === 'function') {
      Sound.setSimulationPaused(this.paused);
    }
  }

  togglePause() {
    this.setPaused(!this.paused);
    return this.paused;
  }

  setTimeScale(scale) {
    this.timeScale = Math.max(0.05, Math.min(3.0, Number(scale) || 1.0));
    return this.timeScale;
  }

  flyTo(camPos, target, duration = 820) {
    const T = THREE;
    const toPos = camPos instanceof T.Vector3 ? camPos.clone() : new T.Vector3(camPos[0], camPos[1], camPos[2]);
    const toTgt = target
      ? (target instanceof T.Vector3 ? target.clone() : new T.Vector3(target[0], target[1], target[2]))
      : this.controls.target.clone();
    if (duration <= 0) {
      this._fly = null;
      this.camera.position.copy(toPos);
      this.controls.target.copy(toTgt);
      this.controls.update();
      return;
    }
    this._fly = {
      fromPos: this.camera.position.clone(),
      toPos,
      fromTgt: this.controls.target.clone(),
      toTgt,
      elapsed: 0,
      duration: Math.max(120, duration)
    };
  }

  resetCamera(animated = true) {
    if (animated && this._defaultCamPos) {
      this.flyTo(this._defaultCamPos, this._defaultTarget || new THREE.Vector3(0, 0, 0), 680);
    } else {
      this._fly = null;
      this.camera.position.copy(this._defaultCamPos);
      if (this._defaultTarget) this.controls.target.copy(this._defaultTarget);
      else this.controls.target.set(0, 0, 0);
      this.controls.update();
    }
  }

  setDefaultView(camPos, target) {
    this._defaultCamPos.copy(camPos);
    this._defaultTarget = target.clone();
    this.resetCamera(false);
  }

  enableSurgicalEnvironment(opts = {}) {
    const { accentColor = 0x67e8f9, bounceColor = 0x3b1322 } = opts;
    this._envOpts = { accentColor, bounceColor };
    if (this._quality === 'low') {
      this.scene.environment = null;
      return false;
    }
    const T = THREE;
    if (!this.renderer || !T.PMREMGenerator) return false;
    try {
      const envScene = new T.Scene();
      envScene.background = new T.Color(0x05070e);

      const addSoftbox = (hex, intensity, pos, scale, rot) => {
        const col = new T.Color(hex).multiplyScalar(intensity);
        const geo = new T.PlaneGeometry(1, 1);
        const mat = new T.MeshBasicMaterial({ color: col, side: T.DoubleSide });
        const m = new T.Mesh(geo, mat);
        m.position.set(pos[0], pos[1], pos[2]);
        m.scale.set(scale[0], scale[1], 1);
        if (rot) m.rotation.set(rot[0], rot[1], rot[2]);
        envScene.add(m);
      };

      addSoftbox(0xfff6ed, 3.6, [-4.2, 6.2, 5.8], [5.8, 3.4], [0.58, -0.52, 0]);
      addSoftbox(0xe0f2fe, 2.6, [6.8, 3.2, 3.8], [3.6, 5.2], [0.22, 1.08, 0]);
      addSoftbox(accentColor, 3.0, [4.6, 2.6, -7.2], [6.6, 3.0], [-0.18, 2.52, 0]);
      addSoftbox(0xff9aa8, 1.4, [-5.6, -2.8, -3.5], [5.2, 3.4], [-0.35, -2.15, 0]);
      addSoftbox(0xffffff, 2.4, [0, 8.2, -1.2], [6.0, 1.4], [Math.PI / 2, 0, 0]);
      addSoftbox(bounceColor, 0.85, [0, -7.0, 0], [16, 16], [-Math.PI / 2, 0, 0]);

      const pm = new T.PMREMGenerator(this.renderer);
      if (pm.compileEquirectangularShader) pm.compileEquirectangularShader();
      const rt = pm.fromScene(envScene, 0.032);
      pm.dispose();

      envScene.traverse(o => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) o.material.dispose();
      });

      if (this._envRT) this._envRT.dispose();
      this._envRT = rt;
      this.scene.environment = rt.texture;
      return true;
    } catch (e) {
      console.warn('[ThreeScene] Surgical PMREM fallback:', e);
      return false;
    }
  }

  enableStudioBackdrop({
    topColor = 0x101829,
    midColor = 0x070b14,
    bottomColor = 0x030408,
    glowColor = 0x1e293b,
    moteColor = 0x7dd3fc,
    moteCount = 115
  } = {}) {
    const T = THREE;
    if (this._studioDome) { this.scene.remove(this._studioDome); this._studioDome = null; }
    if (this._studioMotes) { this.scene.remove(this._studioMotes); this._studioMotes = null; }

    const domeGeo = new T.SphereGeometry(48, 36, 22);
    const domeMat = new T.ShaderMaterial({
      side: T.BackSide,
      depthWrite: false,
      uniforms: {
        uTop: { value: new T.Color(topColor) },
        uMid: { value: new T.Color(midColor) },
        uBot: { value: new T.Color(bottomColor) },
        uGlow: { value: new T.Color(glowColor) }
      },
      vertexShader: `
        varying vec3 vWorldDir;
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorldDir = normalize(wp.xyz);
          gl_Position = projectionMatrix * viewMatrix * wp;
        }`,
      fragmentShader: `
        uniform vec3 uTop;
        uniform vec3 uMid;
        uniform vec3 uBot;
        uniform vec3 uGlow;
        varying vec3 vWorldDir;
        void main() {
          vec3 d = normalize(vWorldDir);
          float h = clamp(d.y * 0.5 + 0.5, 0.0, 1.0);
          vec3 c = h > 0.5
            ? mix(uMid, uTop, smoothstep(0.5, 1.0, h))
            : mix(uBot, uMid, smoothstep(0.0, 0.5, h));
          float halo = pow(max(0.0, 1.0 - abs(d.y) * 1.45), 2.5) * 0.24;
          c += uGlow * halo;
          gl_FragColor = vec4(c, 1.0);
        }`
    });
    const dome = new T.Mesh(domeGeo, domeMat);
    dome.raycast = () => {};
    dome.renderOrder = -10;
    this.scene.add(dome);
    this._studioDome = dome;

    const pos = new Float32Array(moteCount * 3);
    let s = 13379;
    const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    for (let i = 0; i < moteCount; i++) {
      const r = 5.5 + rnd() * 14;
      const th = rnd() * Math.PI * 2;
      const ph = Math.acos(2 * rnd() - 1);
      pos[i * 3] = r * Math.sin(ph) * Math.cos(th);
      pos[i * 3 + 1] = r * Math.cos(ph) * 0.75;
      pos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
    }
    const mGeo = new T.BufferGeometry();
    mGeo.setAttribute('position', new T.BufferAttribute(pos, 3));
    const mMat = new T.PointsMaterial({
      color: moteColor,
      size: 0.072,
      transparent: true,
      opacity: this._quality === 'high' ? 0.20 : 0.11,
      depthWrite: false,
      blending: T.AdditiveBlending,
      sizeAttenuation: true
    });
    const motes = new T.Points(mGeo, mMat);
    motes.raycast = () => {};
    motes.visible = (this._quality !== 'low');
    this.scene.add(motes);
    this._studioMotes = motes;
  }

  enablePost({ strength = 0.45, radius = 0.5, threshold = 0.90 } = {}) {
    const T = THREE;
    if (!T.EffectComposer || !T.RenderPass || !T.UnrealBloomPass || !T.OutputPass) return false;
    const w = this.container.clientWidth || 800, h = this.container.clientHeight || 500;
    this.composer = new T.EffectComposer(this.renderer);
    this.composer.setSize(w, h);
    this.composer.addPass(new T.RenderPass(this.scene, this.camera));
    this.bloom = new T.UnrealBloomPass(new T.Vector2(w, h), strength, radius, threshold);
    this.bloom.enabled = (this._quality === 'high');
    this.composer.addPass(this.bloom);
    this.composer.addPass(new T.OutputPass());
    return true;
  }

  setupLights() {
    const ambient = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambient);
    const main = new THREE.DirectionalLight(0xffffff, 1.0);
    main.position.set(5, 8, 5);
    main.castShadow = true;
    main.shadow.mapSize.width = 1024;
    main.shadow.mapSize.height = 1024;
    this.scene.add(main);
    const fill = new THREE.DirectionalLight(0x93c5fd, 0.6);
    fill.position.set(-5, -3, -5);
    this.scene.add(fill);
    const rim = new THREE.PointLight(0xfca5a5, 0.8, 20);
    rim.position.set(0, 5, -5);
    this.scene.add(rim);
  }

  setupResize() {
    this._resize = () => {
      const w = this.container.clientWidth;
      const h = this.container.clientHeight;
      if (w === 0 || h === 0) return;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
      if (this.composer) this.composer.setSize(w, h);
    };
    if (typeof ResizeObserver !== 'undefined') {
      this._ro = new ResizeObserver(this._resize);
      this._ro.observe(this.container);
    } else {
      window.addEventListener('resize', this._resize);
    }
  }

  setVisible(v) {
    this._isVisible = v;
    if (v) {
      this._lastPerf = performance.now();
      if (typeof Sound !== 'undefined' && typeof Sound.setSimulationPaused === 'function') {
        Sound.setSimulationPaused(this.paused);
      }
    }
  }

  addClickable(object, data) {
    object.userData = data;
    this.clickableObjects.push(object);
  }

  handleClick(event, callback) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.clickableObjects, true);
    if (intersects.length > 0) {
      let obj = intersects[0].object;
      while (obj && !obj.userData.name && obj.parent) obj = obj.parent;
      if (obj && obj.userData.name) {
        callback(obj.userData);
        return obj.userData;
      }
    }
    return null;
  }

  addAnimation(fn) { this.animations.push(fn); }

  animate() {
    this.animationId = requestAnimationFrame(this.animate);
    const now = performance.now();
    const realDt = Math.min(0.1, Math.max(0, (now - this._lastPerf) / 1000));
    this._lastPerf = now;

    if (!this._isVisible) return;

    if (!this.paused) {
      this._simTime += realDt * this.timeScale;
    }

    if (this._fly) {
      const f = this._fly;
      f.elapsed += realDt * 1000;
      const t = Math.min(1, f.elapsed / f.duration);
      const ease = 1 - Math.pow(1 - t, 3);
      this.camera.position.lerpVectors(f.fromPos, f.toPos, ease);
      this.controls.target.lerpVectors(f.fromTgt, f.toTgt, ease);
      if (t >= 1) this._fly = null;
    }

    if (this._studioMotes && this._studioMotes.visible) {
      this._studioMotes.rotation.y += realDt * 0.018;
      this._studioMotes.rotation.x = Math.sin(now * 0.00015) * 0.06;
    }

    const el = this._simTime;
    for (let i = 0; i < this.animations.length; i++) {
      this.animations[i](el, realDt);
    }

    if (this.controls) {
      if (this.controls.target.lengthSq() > this._maxPanRadius * this._maxPanRadius) {
        this.controls.target.setLength(this._maxPanRadius);
      }
      this.controls.update();
    }

    if (this.composer && this._quality === 'high') this.composer.render();
    else if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  dispose() {
    if (this.animationId) cancelAnimationFrame(this.animationId);
    if (this._ro) this._ro.disconnect();
    if (this._resize) window.removeEventListener('resize', this._resize);
    if (this._envRT) this._envRT.dispose();
    if (this.controls) {
      if (this._onUserControlStart) this.controls.removeEventListener('start', this._onUserControlStart);
      this.controls.dispose();
    }
    if (this.renderer) {
      this.renderer.dispose();
      if (this.container.contains(this.renderer.domElement)) {
        this.container.removeChild(this.renderer.domElement);
      }
    }
  }
}

function createOrganMaterial(color, options = {}) {
  return new THREE.MeshStandardMaterial({
    color: color,
    roughness: options.roughness !== undefined ? options.roughness : 0.7,
    metalness: options.metalness !== undefined ? options.metalness : 0.1,
    emissive: options.emissive !== undefined ? options.emissive : 0x000000,
    emissiveIntensity: options.emissiveIntensity || 0,
    transparent: options.transparent || false,
    opacity: options.opacity !== undefined ? options.opacity : 1
  });
}

function createLabel(text, x, y, color = '#dc2626') {
  const div = document.createElement('div');
  div.className = 'organ-label';
  div.textContent = text;
  div.style.left = x + 'px';
  div.style.top = y + 'px';
  div.style.background = color;
  return div;
}
