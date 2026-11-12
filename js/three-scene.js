/* ============================================================
   THREE-SCENE.JS - Base 3D Scene Manager
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
      0.1,
      1000
    );
    this.camera.position.set(0, 0, 8);
    this._defaultCamPos = new THREE.Vector3(0, 0, 8);

    this._loadingEl = document.createElement('div');
    this._loadingEl.className = 'scene-loading';
    this._loadingEl.innerHTML = `<div class="spinner"></div><span>Menyiapkan model 3D…</span>`;
    container.appendChild(this._loadingEl);

    try {
      this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch (e) {
      container.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#fca5a5;padding:2rem;text-align:center;font-family:Inter,sans-serif;">
        <div><b>WebGL tidak didukung</b><br>
        Browser Anda belum mendukung WebGL. Coba Chrome/Firefox terbaru atau aktifkan akselerasi hardware.</div>
      </div>`;
      throw new Error('WebGL not supported');
    }

    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(container.clientWidth || 800, container.clientHeight || 500);
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.localClippingEnabled = true;
    container.appendChild(this.renderer.domElement);

    this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.rotateSpeed = 0.8;
    this.controls.zoomSpeed = 0.9;
    this.controls.minDistance = 3;
    this.controls.maxDistance = 20;
    this.controls.enablePan = false;

    this.setupLights();
    this.setupResize();

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.clickableObjects = [];
    this.clock = new THREE.Clock();
    this.animations = [];
    this._isVisible = true;

    this.animate = this.animate.bind(this);
    this.animate();

    console.log('✓ ThreeScene initialized (r' + THREE.REVISION + ')');
  }

  hideLoading() {
    if (this._loadingEl) {
      this._loadingEl.classList.add('hidden');
      setTimeout(() => { if (this._loadingEl && this._loadingEl.parentNode) this._loadingEl.remove(); }, 350);
    }
  }

  resetCamera() {
    this.camera.position.copy(this._defaultCamPos);
    if (this._defaultTarget) this.controls.target.copy(this._defaultTarget);
    else this.controls.target.set(0, 0, 0);
    this.controls.update();
  }

  setDefaultView(camPos, target) {
    this._defaultCamPos.copy(camPos);
    this._defaultTarget = target.clone();
    this.resetCamera();
  }

  // Post-processing (bloom + tone mapping). Aman: kembali false bila addon belum dimuat.
  enablePost({ strength = 0.6, radius = 0.5, threshold = 0.9 } = {}) {
    const T = THREE;
    if (!T.EffectComposer || !T.RenderPass || !T.UnrealBloomPass || !T.OutputPass) return false;
    const w = this.container.clientWidth || 800, h = this.container.clientHeight || 500;
    this.composer = new T.EffectComposer(this.renderer);
    this.composer.setSize(w, h);
    this.composer.addPass(new T.RenderPass(this.scene, this.camera));
    this.bloom = new T.UnrealBloomPass(new T.Vector2(w, h), strength, radius, threshold);
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

  setVisible(v) { this._isVisible = v; }

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
    if (!this._isVisible) return;
    const elapsed = this.clock.getElapsedTime();
    this.animations.forEach(fn => fn(elapsed));
    if (this.controls) this.controls.update();
    if (this.composer) this.composer.render();
    else if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  dispose() {
    if (this.animationId) cancelAnimationFrame(this.animationId);
    if (this._ro) this._ro.disconnect();
    if (this._resize) window.removeEventListener('resize', this._resize);
    if (this.controls) this.controls.dispose();
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