/* ============================================================
   LUNGS-3D.JS — Eksperimen Paru-paru & Spirometri (versi realistis)
   Model dibuat oleh LungsKit (js/lungs-kit.js). File ini mengurus
   UI, interaksi, animasi siklus pernapasan, bedah lapisan, urai struktur, label, dan Spirogram.
   ============================================================ */
const LungsExperiment = {
  state: {
    scene: null, depth: 50, rpm: 16, type: 'normal', lungsGroup: null, chambers: {}, airParticles: null,
    selectedPart: null, phase: 0, kit: null, clickables: [], labels: [],
    showLabels: true, showCond: true, dissect: 0, explode: 0, explodeTarget: 0, clipPlane: null,
    isSmoking: false, smokeParticles: null, focus: null, spiro: []
  },
  missions: [
    { id: 'm1', text: 'Putar paru-paru dan klik Alveolus' },
    { id: 'm2', text: 'Atur napas menjadi Maksimal 100%' },
    { id: 'm3', text: 'Selesaikan kuis dengan benar' }
  ],
  aktivitasData: {
    normal:   { rpm: 16, baseVol: 500,  depth: 50,  nama: 'Tidur / Santai (Tidal)' },
    dalam:    { rpm: 20, baseVol: 2000, depth: 75,  nama: 'Aktivitas Sedang (Komplementer)' },
    maksimal: { rpm: 28, baseVol: 3500, depth: 100, nama: 'Olahraga Berat (Kapasitas Vital)' }
  },

  // ---- Materi pembelajaran tiap struktur ----
  INFO: {
    larynx:     ['Laring (Kotak Suara)', '<span class="glossary-term" data-tooltip="Pangkal tenggorokan pelindung saluran napas">Laring</span> — tersusun atas tulang rawan tiroid dan krikoid. Di dalamnya terdapat pita suara dan katup epiglotis yang mencegah makanan masuk ke trakea.'],
    trachea:    ['Trakea (Batang Tenggorokan)', 'Saluran napas utama sepanjang ±10–12 cm yang diperkuat oleh 16–20 cincin tulang rawan berbentuk huruf C agar tidak kolaps saat tekanan dada berubah.'],
    carina:     ['Karina Trakea', 'Titik percabangan di dasar trakea tempat saluran napas terbagi menjadi bronkus utama kanan dan kiri. Mukosanya sangat peka memicu refleks batuk.'],
    rbronch:    ['Bronkus Utama Kanan', 'Cabang trakea menuju paru-paru kanan. Bentuknya lebih pendek, lebih lebar, dan lebih vertikal dibanding bronkus kiri.'],
    lbronch:    ['Bronkus Utama Kiri', 'Cabang trakea menuju paru-paru kiri. Lebih panjang dan melandai karena harus melewati bagian bawah lengkung aorta dan belakang jantung.'],
    bronchiole: ['Cabang Bronkiolus', 'Saluran percabangan halus (< 1 mm) di dalam lobulus paru yang tidak lagi memiliki tulang rawan, melainkan dikelilingi otot polos untuk mengatur aliran udara.'],
    alveoli:    ['Alveolus (Kantung Udara)', '<span class="glossary-term" data-tooltip="Tempat pertukaran O2 dan CO2 secara difusi">Alveolus</span> — gelembung mikroskopis berdinding sangat tipis (1 lapis sel epitel) yang dikelilingi kapiler darah. Terdapat ±300 juta alveolus di kedua paru-paru!'],
    rsup:       ['Lobus Superior Kanan', 'Bagian puncak (apeks) paru-paru kanan yang terletak di atas fisura horizontal, menerima udara dari bronkus lobaris superior.'],
    rmid:       ['Lobus Medius Kanan', 'Lobus tengah yang hanya dimiliki oleh paru-paru kanan, dibatasi oleh fisura horizontal di bagian atas dan fisura oblik di bagian bawah.'],
    rinf:       ['Lobus Inferior Kanan', 'Lobus terbesar di bagian bawah paru-paru kanan yang bertumpu langsung di atas kubah kanan otot diafragma.'],
    lsup:       ['Lobus Superior Kiri', 'Bagian atas paru-paru kiri yang mencakup area lingula dan berbatasan dengan fisura oblik kiri.'],
    linf:       ['Lobus Inferior Kiri', 'Bagian bawah paru-paru kiri di belakang fisura oblik yang mengembang paling besar saat inspirasi dalam.'],
    notch:      ['Takik Jantung (Cardiac Notch)', 'Lekukan anatomis khusus pada sisi medial lobus superior paru-paru kiri yang memberi ruang bagi apeks (ujung) bilik kiri jantung.'],
    pulmv:      ['Pembuluh Darah Pulmonal', 'Arteri pulmonalis (biru) membawa darah kaya CO₂ dari bilik kanan jantung ke kapiler alveolus, sedangkan vena pulmonalis (merah) membawa darah kaya O₂ ke serambi kiri.'],
    diaphragm:  ['Otot Diafragma', 'Otot utama pernapasan berbentuk kubah yang memisahkan rongga dada dan perut. Saat berkontraksi (inspirasi), diafragma mendatar dan menarik udara masuk ke paru-paru.']
  },

  LABELS: [
    { key: 'trachea',    text: 'Trakea',                        anchor: 'tracheaL',    side: 'left' },
    { key: 'rbronch',    text: 'Bronkus utama kanan',           anchor: 'rbronchL',    side: 'left', cond: true },
    { key: 'rsup',       text: 'Lobus superior',                anchor: 'rsupL',       side: 'left' },
    { key: 'rmid',       text: 'Lobus medius',                  anchor: 'rmidL',       side: 'left' },
    { key: 'rinf',       text: 'Lobus inferior',                anchor: 'rinfL',       side: 'left' },
    { key: 'carina',     text: 'Karina trakea',                 anchor: 'carina',      side: 'right', cond: true },
    { key: 'bronchiole', text: 'Cabang bronkiolus',             anchor: 'bronchioleL', side: 'right', cond: true },
    { key: 'alveoli',    text: 'Alveolus',                      anchor: 'alveoliL',    side: 'right' },
    { key: 'notch',      text: 'Takik jantung (cardiac notch)', anchor: 'notchL',      side: 'right' },
    { key: 'diaphragm',  text: 'Otot diafragma',                anchor: 'diaphragmL',  side: 'right' }
  ],

  injectCloseStyle() {
    let style = document.getElementById('clickInfoCloseStyle');
    if (!style) {
      style = document.createElement('style');
      style.id = 'clickInfoCloseStyle';
      document.head.appendChild(style);
    }
    style.textContent = `
      .click-info {
        position: absolute !important;
        padding-right: 2.6rem !important;
        z-index: 60 !important;
        pointer-events: none !important;
      }
      .click-info.show {
        pointer-events: auto !important;
      }
      .click-info h5 {
        padding-right: 1.5rem !important;
      }
      .click-info-close {
        position: absolute !important;
        top: 10px !important;
        right: 10px !important;
        width: 28px !important;
        height: 28px !important;
        border-radius: 8px !important;
        border: 1.5px solid rgba(255, 255, 255, 0.28) !important;
        background: rgba(15, 23, 42, 0.75) !important;
        color: #f8fafc !important;
        font-size: 18px !important;
        font-weight: 700 !important;
        line-height: 1 !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        cursor: pointer !important;
        pointer-events: auto !important;
        transition: all 0.18s ease !important;
        z-index: 65 !important;
        padding: 0 !important;
      }
      .click-info-close:hover {
        background: #ef4444 !important;
        border-color: #fca5a5 !important;
        color: #ffffff !important;
        transform: scale(1.08) !important;
      }
      .click-info-close:active {
        transform: scale(0.94) !important;
      }
    `;
  },

  render() {
    this.injectCloseStyle();
    const panel = document.getElementById('panelLungs');
    if (!panel) return;
    panel.innerHTML = `
      <div class="exp-header">
        <span class="exp-badge">Eksperimen 2 dari 2</span>
        <h2 class="exp-title">Sistem pernapasan dan spirometri</h2>
        <p class="exp-description">Putar model paru-paru, gunakan fitur <b>Bedah Lapisan 3D</b> untuk mengiris parenkim paru-paru dan melihat pohon bronkiolus serta alveolus di dalamnya, atau <b>Urai Struktur</b> untuk memisahkan setiap organ!</p>
      </div>
      <div class="exp-3d-layout">
        <div class="scene-container" id="lungsScene">
          <div class="lx-layer" id="lxLayer"><svg id="lxSvg" width="100%" height="100%"></svg></div>
          <div class="tutorial-overlay" id="tutorialLungs">
            <div class="tutorial-box">
              <h3>Cara menjelajah</h3>
              <p><b>Seret</b> untuk memutar paru-paru, <b>gulir</b> untuk zoom, <b>klik</b> organ untuk membaca penjelasannya, serta gunakan fitur <b>Bedah Lapisan</b> & <b>Urai Struktur</b>.</p>
              <button type="button" class="btn btn-primary" id="btnTutorialLungsClose">Mulai menjelajah</button>
            </div>
          </div>
          <div class="scene-overlay">
            <h4>Paru-paru</h4>
            <p>Seret untuk memutar, gulir untuk zoom, klik organ untuk penjelasan.</p>
          </div>
          <div class="scene-controls">
            <button class="scene-btn" id="btnLungsLabels" title="Label" aria-label="Tampilkan label" aria-pressed="true"><svg class="ico" aria-hidden="true"><use href="#i-tag"/></svg></button>
            <button class="scene-btn" id="btnToggleAirflow" title="Jalur konduksi udara" aria-label="Tampilkan jalur bronkiolus" aria-pressed="true"><svg class="ico" aria-hidden="true"><use href="#i-bolt"/></svg></button>
            <button class="scene-btn" id="btnLungsDissect" title="Bedah lapisan 3D (Irisan)" aria-label="Bedah lapisan 3D" aria-pressed="false">
              <svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
            </button>
            <button class="scene-btn" id="btnLungsExplode" title="Urai struktur 3D (Exploded View)" aria-label="Urai struktur 3D" aria-pressed="false">
              <svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/><polyline points="9 3 3 3 3 9"/><line x1="3" y1="3" x2="10" y2="10"/><polyline points="15 21 21 21 21 15"/><line x1="21" y1="21" x2="14" y2="14"/></svg>
            </button>
            <button class="scene-btn" id="btnResetLungsView" title="Kembalikan sudut pandang" aria-label="Kembalikan sudut pandang"><svg class="ico" aria-hidden="true"><use href="#i-target"/></svg></button>
            <button class="scene-btn" id="btnLungsWireframe" title="Wireframe" aria-label="Mode wireframe"><svg class="ico" aria-hidden="true"><use href="#i-cube"/></svg></button>
          </div>
          <div class="mobile-controls">
            <button class="mobile-btn" id="btnLungsZoomIn" aria-label="Perbesar"><svg class="ico" aria-hidden="true"><use href="#i-plus"/></svg></button>
            <button class="mobile-btn" id="btnLungsZoomOut" aria-label="Perkecil"><svg class="ico" aria-hidden="true"><use href="#i-minus"/></svg></button>
          </div>
          <div class="click-info" id="lungsClickInfo" aria-live="polite">
            <button type="button" class="click-info-close" id="btnCloseLungsInfo" title="Tutup penjelasan" aria-label="Tutup penjelasan">&times;</button>
            <h5 id="lungsInfoTitle"></h5><p id="lungsInfoText"></p>
          </div>
        </div>
        <div class="control-panel">
          <div class="panel-header"><svg class="ico" aria-hidden="true"><use href="#i-sliders"/></svg><h3 class="panel-title">Kontrol</h3></div>
          <div class="control-group">
            <div class="control-label"><span>Aktivitas</span></div>
            <select class="select-input" id="selectLungsType">
              <option value="normal" selected>Tidur / santai (500 mL)</option>
              <option value="dalam">Aktivitas sedang (2000 mL)</option>
              <option value="maksimal">Olahraga berat (3500 mL)</option>
            </select>
          </div>
          <div class="control-group">
            <div class="control-label"><span>Kedalaman napas</span><span class="value-badge" id="lungsDepth">50%</span></div>
            <input type="range" class="range-slider" id="sliderLungsDepth" min="10" max="100" value="50" step="1" aria-label="Kedalaman napas">
          </div>
          <div class="control-group">
            <div class="control-label"><span>Bedah lapisan 3D</span><span class="value-badge" id="lungsDissectVal">0%</span></div>
            <input type="range" class="range-slider" id="sliderLungsDissect" min="0" max="100" value="0" step="1" aria-label="Bedah lapisan 3D">
          </div>
          <div class="control-group">
            <div class="control-label"><span>Urai struktur 3D</span><span class="value-badge" id="lungsExplodeVal">0%</span></div>
            <input type="range" class="range-slider" id="sliderLungsExplode" min="0" max="100" value="0" step="1" aria-label="Urai struktur 3D">
          </div>
          <div class="control-group">
            <div class="control-label"><span>Opasitas jaringan</span><span class="value-badge" id="lungsOpacityVal">62%</span></div>
            <input type="range" class="range-slider" id="sliderLungsOpacity" min="15" max="100" value="62" step="1" aria-label="Opasitas jaringan">
          </div>
          <div class="control-group">
            <div class="control-label"><span>Rekaman spirogram (simulasi)</span></div>
            <canvas id="spiroCanvas" class="lx-spiro" width="320" height="86" aria-label="Grafik Spirogram simulasi"></canvas>
          </div>
          <div class="stat-grid">
            <div class="stat-card"><div class="stat-value" id="statLungsVol">250</div><div class="stat-label">mL udara per napas</div></div>
            <div class="stat-card"><div class="stat-value" id="statLungsRate">16</div><div class="stat-label">napas per menit</div></div>
          </div>
          <div class="btn-group">
            <button class="btn btn-primary" id="btnSimulateSmoke"><svg class="ico" aria-hidden="true"><use href="#i-wind"/></svg> Simulasikan paparan asap</button>
            <button class="btn btn-secondary" id="btnResetLungs"><svg class="ico" aria-hidden="true"><use href="#i-reset"/></svg> Kembalikan pengaturan awal</button>
          </div>
        </div>
      </div>
      <div class="bottom-panel">
        <div id="missionLungs"></div>
        <div id="lkpdLungs"></div>
        <div id="quizLungs"></div>
      </div>
    `;
    this.init();
  },

  init() {
    const container = document.getElementById('lungsScene');
    this.state.scene = new ThreeScene(container);
    const sc = this.state.scene;
    sc.renderer.domElement.setAttribute('aria-label', 'Model 3D paru-paru interaktif.');
    sc.renderer.domElement.setAttribute('role', 'img');

    this.setupLook(sc);
    this.buildLungs();
    this.setupInteractions();
    this.setupControls();
    this.setupLabels();
    this.updateResult();
    this.animateLungs();

    renderMissions('missionLungs', 'lungs', this.missions);
    renderLKPD('lkpdLungs', 'lungs');
    renderQuiz('quizLungs', 'lungs');

    this.bindTutorial();
    setTimeout(() => sc.hideLoading(), 300);

    if (!localStorage.getItem('biolab_tutorial_seen_lungs')) {
      setTimeout(() => {
        const t = document.getElementById('tutorialLungs');
        if (t) t.classList.add('show');
      }, 500);
    }
  },

  // Pencahayaan sinematik, environment map, bloom, clipping plane
  setupLook(sc) {
    const T = THREE, r = sc.renderer;
    r.localClippingEnabled = true;
    sc.scene.children.filter(o => o.isLight).forEach(o => sc.scene.remove(o));
    sc.scene.background = new T.Color(0x030305);
    r.toneMapping = T.ACESFilmicToneMapping; r.toneMappingExposure = 1.15;
    if (T.RoomEnvironment) {
      const pm = new T.PMREMGenerator(r);
      sc.scene.environment = pm.fromScene(new T.RoomEnvironment(), 0.04).texture; pm.dispose();
    }
    const dl = (c, i, x, y, z) => { const l = new T.DirectionalLight(c, i); l.position.set(x, y, z); sc.scene.add(l); };
    dl(0xfff0e6, 2.4, -3, 5, 7);      // key
    dl(0x6fe9ff, 2.2, 5, 2, -5);      // rim dingin dari belakang
    dl(0xff8f8f, 0.9, 4, -3, 4);      // fill hangat
    sc.scene.add(new T.HemisphereLight(0xffd6d6, 0x220808, 0.35));
    sc.enablePost({ strength: 0.55, radius: 0.55, threshold: 0.88 });
    sc.setDefaultView(new T.Vector3(0, 0.45, 9.6), new T.Vector3(0, 0.35, 0));
    sc.controls.minDistance = 2.5; sc.controls.maxDistance = 16;

    this.state.clipPlane = new T.Plane(new T.Vector3(0, 0, -1), 2.5);
  },

  bindTutorial() {
    const overlay = document.getElementById('tutorialLungs');
    const btnClose = document.getElementById('btnTutorialLungsClose');
    const close = () => {
      if (!overlay) return;
      overlay.classList.remove('show');
      try { localStorage.setItem('biolab_tutorial_seen_lungs', 'true'); } catch (e) {}
      if (typeof Sound !== 'undefined') Sound.click();
    };
    if (btnClose) {
      btnClose.onclick = null;
      btnClose.addEventListener('click', (e) => { e.stopPropagation(); close(); });
    }
    if (overlay) overlay.onclick = (e) => { if (e.target === overlay) close(); };
  },

  setVisible(v) { if (this.state.scene) this.state.scene.setVisible(v); },

  buildLungs() {
    const st = this.state, scene = st.scene, T = THREE;
    const kit = LungsKit.build();
    st.kit = kit; st.lungsGroup = kit.root; st.chambers = kit.chambers; st.clickables = kit.clickables;
    scene.scene.add(kit.root);

    // Partikel udara mengikuti jalur anatomis (biru = O2 segar masuk, merah = CO2 keluar)
    const N = 340, pos = new Float32Array(N * 3), col = new Float32Array(N * 3);
    st.particles = Array.from({ length: N }, (_, i) => {
      const path = kit.paths[i % kit.paths.length];
      col.set([path.color.r, path.color.g, path.color.b], i * 3);
      return { path, t: Math.random(), v: 0.75 + Math.random() * 0.5, j: new T.Vector3((Math.random() - .5) * .09, (Math.random() - .5) * .09, (Math.random() - .5) * .09) };
    });
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.BufferAttribute(pos, 3));
    geo.setAttribute('color', new T.BufferAttribute(col, 3));
    st.airParticles = new T.Points(geo, new T.PointsMaterial({
      size: 0.13, map: kit.glowTex, vertexColors: true, transparent: true, opacity: 0.85,
      depthWrite: false, blending: T.AdditiveBlending, sizeAttenuation: true
    }));
    st.airParticles.frustumCulled = false;
    kit.root.add(st.airParticles);
  },

  // ---------- Terapkan Bedah Lapisan 3D (0..100) ----------
  applyDissect(val) {
    const st = this.state, kit = st.kit;
    st.dissect = val;
    const slider = document.getElementById('sliderLungsDissect');
    const badge = document.getElementById('lungsDissectVal');
    const btn = document.getElementById('btnLungsDissect');
    if (slider) {
      slider.value = val;
      slider.style.setProperty('--p', val + '%');
    }
    if (badge) badge.textContent = Math.round(val) + '%';
    if (btn) btn.setAttribute('aria-pressed', String(val > 0));

    if (val <= 0) {
      st.clipPlane.constant = 2.5;
      if (kit.dissectables) kit.dissectables.forEach(m => { m.clippingPlanes = null; });
    } else {
      st.clipPlane.constant = 0.95 - (val / 100) * 1.8;
      if (kit.dissectables) kit.dissectables.forEach(m => { m.clippingPlanes = [st.clipPlane]; });
    }
  },

  // ---------- Terapkan Urai Struktur 3D (0..100) ----------
  applyExplode(val) {
    const st = this.state;
    st.explodeTarget = val / 100;
    const slider = document.getElementById('sliderLungsExplode');
    const badge = document.getElementById('lungsExplodeVal');
    const btn = document.getElementById('btnLungsExplode');
    if (slider) {
      slider.value = val;
      slider.style.setProperty('--p', val + '%');
    }
    if (badge) badge.textContent = Math.round(val) + '%';
    if (btn) btn.setAttribute('aria-pressed', String(val > 0));
  },

  // ---------- Tutup Info & Reset Sorotan Komponen ----------
  clearSelection() {
    const st = this.state, kit = st.kit;
    st.selectedPart = null;
    st.focus = null;
    const infoBox = document.getElementById('lungsClickInfo');
    if (infoBox) {
      infoBox.classList.remove('show');
      infoBox.style.display = 'none';
    }
    if (!kit) return;

    kit.clickables.forEach(o => {
      const m = o.material;
      if (!m || !m.emissive || o.userData.key === 'rlung' || o.userData.key === 'llung' || m.isMeshBasicMaterial) return;
      if (m.userData.em0) {
        m.emissive.setHex(m.userData.em0.c);
        m.emissiveIntensity = m.userData.em0.i;
      }
    });
    kit.pumps.rlung.forEach(m => m.material.userData.rimU.value.set(0xffb4b0));
    kit.pumps.llung.forEach(m => m.material.userData.rimU.value.set(0xffb4b0));
    kit.condMat.uniforms.uBoost.value = 1;
  },

  // ---------- Interaksi ----------
  setupInteractions() {
    const canvas = this.state.scene.renderer.domElement;
    if (this._down) canvas.removeEventListener('pointerdown', this._down);
    if (this._clickHandler) canvas.removeEventListener('pointerup', this._clickHandler);
    let sx = 0, sy = 0;
    this._down = (e) => { sx = e.clientX; sy = e.clientY; };
    this._clickHandler = (e) => {
      if (Math.hypot(e.clientX - sx, e.clientY - sy) > 5) return;      // abaikan drag/rotasi
      const st = this.state, sc = st.scene, rect = canvas.getBoundingClientRect();
      sc.mouse.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
      sc.raycaster.setFromCamera(sc.mouse, sc.camera);
      let best = null;
      for (const h of sc.raycaster.intersectObjects(st.clickables, false)) {
        const u = h.object.userData;
        if (u.cond && !st.showCond) continue;
        if (u.dissectable && st.dissect > 0 && st.clipPlane && st.clipPlane.distanceToPoint(h.point) < 0) continue;
        const pr = u.priority !== undefined ? u.priority : 1;
        if (!best || pr > best.pr || (pr === best.pr && h.distance < best.h.distance)) best = { h, u, pr };
      }
      // Klik area kosong di luar paru-paru -> tutup kotak penjelasan
      if (!best) {
        if (st.selectedPart) this.clearSelection();
        return;
      }
      let key = best.u.key;
      if (best.u.resolve) key = best.u.resolve(st.kit.frame.worldToLocal(best.h.point.clone()));
      // Klik kembali komponen yang sedang aktif -> tutup penjelasan (toggle)
      if (st.selectedPart === key) {
        this.clearSelection();
        if (typeof Sound !== 'undefined') Sound.click();
        return;
      }
      this.select(key);
    };
    canvas.addEventListener('pointerdown', this._down);
    canvas.addEventListener('pointerup', this._clickHandler);
  },

  select(key, noFocus) {
    const st = this.state, kit = st.kit, info = this.INFO[key];
    if (!info) return;
    st.selectedPart = key;
    document.getElementById('lungsInfoTitle').textContent = info[0];
    document.getElementById('lungsInfoText').innerHTML = info[1];
    const infoBox = document.getElementById('lungsClickInfo');
    if (infoBox) {
      infoBox.style.display = '';
      void infoBox.offsetWidth;
      infoBox.classList.add('show');
    }
    if (typeof Sound !== 'undefined') Sound.click();
    if (key === 'alveoli' && typeof Progress !== 'undefined') Progress.completeMission('lungs', 'm1');

    // sorot struktur terpilih (emissive), rim cyan pada paru kanan/kiri, flash pada jalur bronkiolus
    kit.clickables.forEach(o => {
      const m = o.material;
      if (!m || !m.emissive || o.userData.key === 'rlung' || o.userData.key === 'llung' || m.isMeshBasicMaterial) return;
      if (!m.userData.em0) m.userData.em0 = { c: m.emissive.getHex(), i: m.emissiveIntensity };
      if (o.userData.key === key) { m.emissive.setHex(0x9a7430); m.emissiveIntensity = 1; }
      else { m.emissive.setHex(m.userData.em0.c); m.emissiveIntensity = m.userData.em0.i; }
    });
    const cyanR = ['rsup', 'rmid', 'rinf', 'rbronch'].includes(key);
    const cyanL = ['lsup', 'linf', 'notch', 'lbronch', 'bronchiole', 'alveoli'].includes(key);
    kit.pumps.rlung.forEach(m => m.material.userData.rimU.value.set(cyanR ? 0x28e0ff : 0xffb4b0));
    kit.pumps.llung.forEach(m => m.material.userData.rimU.value.set(cyanL ? 0x28e0ff : 0xffb4b0));
    kit.condMat.uniforms.uBoost.value = ['trachea', 'carina', 'rbronch', 'lbronch', 'bronchiole', 'alveoli'].includes(key) ? 1.9 : 1;

    if (!noFocus && this.LABELS.some(l => l.key === key)) {
      const L = this.LABELS.find(l => l.key === key), p = new THREE.Vector3();
      (kit.anchors[L.anchor] || kit.root).getWorldPosition(p);
      st.focus = { target: p.multiplyScalar(0.55).setZ(0).add(new THREE.Vector3(0, 0.2, 0)), t: 0 };
    }
  },

  setupControls() {
    const st = this.state, sc = st.scene, kit = st.kit;

    // Isolasi klik pada kotak info agar tidak tembus ke kanvas 3D / OrbitControls
    const infoBox = document.getElementById('lungsClickInfo');
    if (infoBox) {
      ['pointerdown', 'pointerup', 'mousedown', 'mouseup', 'touchstart', 'touchend', 'click'].forEach(evt => {
        infoBox.addEventListener(evt, (e) => e.stopPropagation());
      });
    }

    // Tombol Close (×) pada kartu penjelasan paru-paru
    const btnCloseInfo = document.getElementById('btnCloseLungsInfo');
    if (btnCloseInfo) {
      const closeFn = (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.clearSelection();
        if (typeof Sound !== 'undefined') Sound.click();
      };
      btnCloseInfo.addEventListener('pointerdown', (e) => e.stopPropagation());
      btnCloseInfo.addEventListener('click', closeFn);
    }

    // Tutup penjelasan dengan tombol Escape
    if (!this._escHandler) {
      this._escHandler = (e) => {
        if (e.key === 'Escape' && this.state.selectedPart) {
          this.clearSelection();
        }
      };
      document.addEventListener('keydown', this._escHandler);
    }

    document.getElementById('btnResetLungsView').onclick = () => { st.focus = null; sc.resetCamera(); };
    let wire = false;
    document.getElementById('btnLungsWireframe').onclick = () => {
      wire = !wire;
      sc.scene.traverse(o => { if (o.isMesh && o.material && o.material.visible !== false) o.material.wireframe = wire; });
    };

    const toggle = (id, flag, apply) => {
      const b = document.getElementById(id);
      b.onclick = () => { st[flag] = !st[flag]; b.setAttribute('aria-pressed', String(st[flag])); apply && apply(st[flag]); };
    };
    toggle('btnLungsLabels', 'showLabels');
    toggle('btnToggleAirflow', 'showCond', (v) => {
      kit.cond.forEach(m => { m.visible = v; });
      if (st.airParticles) st.airParticles.visible = v;
    });

    // Kontrol Bedah Lapisan 3D (Tombol & Slider)
    document.getElementById('btnLungsDissect').onclick = () => {
      const next = st.dissect > 0 ? 0 : 55;
      this.applyDissect(next);
      if (typeof Sound !== 'undefined') Sound.click();
    };
    document.getElementById('sliderLungsDissect').oninput = (e) => {
      this.applyDissect(+e.target.value);
    };

    // Kontrol Urai Struktur 3D (Tombol & Slider)
    document.getElementById('btnLungsExplode').onclick = () => {
      const next = st.explodeTarget > 0 ? 0 : 100;
      this.applyExplode(next);
      if (typeof Sound !== 'undefined') Sound.click();
    };
    document.getElementById('sliderLungsExplode').oninput = (e) => {
      this.applyExplode(+e.target.value);
    };

    const zoomIn = document.getElementById('btnLungsZoomIn'), zoomOut = document.getElementById('btnLungsZoomOut');
    if (zoomIn) zoomIn.onclick = () => { if (sc.controls.dollyIn) sc.controls.dollyIn(1.2); else sc.camera.position.multiplyScalar(0.9); sc.controls.update(); };
    if (zoomOut) zoomOut.onclick = () => { if (sc.controls.dollyOut) sc.controls.dollyOut(1.2); else sc.camera.position.multiplyScalar(1.1); sc.controls.update(); };

    document.getElementById('sliderLungsOpacity').oninput = (e) => {
      const v = +e.target.value, f = v / 62;
      document.getElementById('lungsOpacityVal').textContent = v + '%';
      kit.glass.forEach(m => { m.opacity = Math.min(1, m.userData.baseOpacity * f); m.userData.minU.value = Math.min(1, 0.28 + Math.max(0, f - 1) * 0.7); });
    };

    document.getElementById('selectLungsType').onchange = (e) => {
      st.type = e.target.value;
      const data = this.aktivitasData[st.type];
      st.rpm = data.rpm;
      st.depth = data.depth;
      document.getElementById('sliderLungsDepth').value = st.depth;
      const badge = document.getElementById('lungsDepth');
      badge.textContent = st.depth + '%'; badge.classList.add('changed');
      setTimeout(() => badge.classList.remove('changed'), 350);
      this.updateResult();
      Progress.addData('lungs', { condition: data.nama, value: document.getElementById('statLungsVol').textContent + ' mL' });
      if (st.depth === 100) Progress.completeMission('lungs', 'm2');
    };

    document.getElementById('sliderLungsDepth').oninput = (e) => {
      st.depth = +e.target.value;
      document.getElementById('lungsDepth').textContent = st.depth + '%';
      this.updateResult();
      if (st.depth === 100) Progress.completeMission('lungs', 'm2');
    };
    document.getElementById('sliderLungsDepth').onchange = (e) => {
      Progress.addData('lungs', {
        condition: 'Kedalaman ' + e.target.value + '%',
        value: 'Volume: ' + document.getElementById('statLungsVol').textContent + ' mL'
      });
    };

    const btnSmoke = document.getElementById('btnSimulateSmoke');
    btnSmoke.onclick = () => {
      st.isSmoking = !st.isSmoking;
      if (st.isSmoking) {
        kit.rightLung.material.color.setHex(0x525866);
        kit.leftLung.material.color.setHex(0x525866);
        kit.alveoli.forEach(cl => cl.children.forEach(s => s.material.color.setHex(0x64748b)));
        btnSmoke.textContent = '✨ Bersihkan Paru-paru';
        btnSmoke.classList.replace('btn-primary', 'btn-secondary');
      } else {
        kit.rightLung.material.color.setHex(0xd9777b);
        kit.leftLung.material.color.setHex(0xd9777b);
        kit.alveoli.forEach(cl => cl.children.forEach(s => s.material.color.setHex(0xffb8c6)));
        btnSmoke.textContent = '🚬 Simulasi Paparan Asap';
        btnSmoke.classList.replace('btn-secondary', 'btn-primary');
      }
      if (typeof Sound !== 'undefined') Sound.click();
    };

    document.getElementById('btnResetLungs').onclick = () => {
      st.depth = 50; st.rpm = 16; st.type = 'normal'; st.isSmoking = false;
      document.getElementById('sliderLungsDepth').value = 50;
      document.getElementById('lungsDepth').textContent = '50%';
      document.getElementById('selectLungsType').value = 'normal';
      document.getElementById('sliderLungsOpacity').value = 62;
      document.getElementById('lungsOpacityVal').textContent = '62%';
      kit.glass.forEach(m => { m.opacity = m.userData.baseOpacity; m.userData.minU.value = 0.28; });
      kit.rightLung.material.color.setHex(0xd9777b);
      kit.leftLung.material.color.setHex(0xd9777b);
      kit.alveoli.forEach(cl => cl.children.forEach(s => s.material.color.setHex(0xffb8c6)));
      btnSmoke.textContent = '🚬 Simulasi Paparan Asap';
      btnSmoke.classList.replace('btn-secondary', 'btn-primary');
      this.applyDissect(0);
      this.applyExplode(0);
      this.clearSelection();
      this.updateResult();
    };
  },

  updateResult() {
    const st = this.state;
    const base = st.type === 'normal' ? 500 : st.type === 'dalam' ? 2000 : 3500;
    const rate = st.type === 'normal' ? 16 : st.type === 'dalam' ? 20 : 28;
    st.rpm = rate;
    document.getElementById('statLungsVol').textContent = Math.round(base * (st.depth / 100));
    document.getElementById('statLungsRate').textContent = rate;
    if (typeof Sound !== 'undefined' && Sound.isEnabled() && Sound.setLungsDepth) {
      const typeNum = st.type === 'normal' ? 1 : st.type === 'dalam' ? 2 : 3;
      Sound.setLungsDepth(st.depth, typeNum);
    }
  },

  // ---------- Label 3D dengan garis penunjuk (gaya Anatomage) ----------
  setupLabels() {
    const st = this.state, layer = document.getElementById('lxLayer'), svg = document.getElementById('lxSvg');
    const NS = 'http://www.w3.org/2000/svg';
    st.labels = this.LABELS.map(L => {
      const dot = document.createElement('button'); dot.type = 'button'; dot.className = 'lx-dot'; dot.setAttribute('aria-label', L.text);
      const txt = document.createElement('span'); txt.className = 'lx-label ' + L.side; txt.textContent = L.text;
      const line = document.createElementNS(NS, 'line'); line.setAttribute('class', 'lx-line');
      svg.appendChild(line); layer.append(dot, txt);
      const go = (e) => {
        e.stopPropagation();
        if (st.selectedPart === L.key) {
          this.clearSelection();
          if (typeof Sound !== 'undefined') Sound.click();
        } else {
          this.select(L.key);
        }
      };
      dot.onclick = go; txt.onclick = go;
      return Object.assign({ dot, txt, line }, L);
    });
  },

  updateLabels() {
    const st = this.state, sc = st.scene, kit = st.kit, w = sc.container.clientWidth, h = sc.container.clientHeight;
    if (!w || !h) return;
    const v = new THREE.Vector3(), proj = (x, y, z) => { v.set(x, y, z).project(sc.camera); return [(v.x * .5 + .5) * w, (-v.y * .5 + .5) * h]; };
    const colL = Math.max(150, proj(-1.95, 0.5, 0)[0] - 8), colR = Math.min(w - 150, proj(1.95, 0.5, 0)[0] + 8);
    const rows = { left: [], right: [] };
    st.labels.forEach(L => {
      const show = st.showLabels && (!L.cond || st.showCond);
      L.dot.style.display = L.txt.style.display = L.line.style.display = show ? '' : 'none';
      if (!show) return;
      (kit.anchors[L.anchor] || kit.root).getWorldPosition(v); v.project(sc.camera);
      L.x = (v.x * .5 + .5) * w; L.y = (-v.y * .5 + .5) * h;
      L.dot.style.transform = `translate(${L.x}px,${L.y}px) translate(-50%,-50%)`;
      L.dot.classList.toggle('sel', st.selectedPart === L.key);
      rows[L.side].push(L);
    });
    ['left', 'right'].forEach(side => {
      const arr = rows[side].sort((a, b) => a.y - b.y); let prev = -1e9;
      arr.forEach(L => {
        L.ty = Math.max(L.y, prev + 28); prev = L.ty;
        const tx = side === 'left' ? colL : colR;
        L.txt.style.transform = `translate(${tx}px,${L.ty}px) translate(${side === 'left' ? '-100%' : '0'},-50%)`;
        L.line.setAttribute('x1', tx); L.line.setAttribute('y1', L.ty + 9);
        L.line.setAttribute('x2', L.x); L.line.setAttribute('y2', L.y);
      });
    });
  },

  // ---------- Spirogram sintetis, sinkron dengan fase siklus pernapasan ----------
  spiroValue(ph) {
    const S = LungsKit.sstep;
    const wave = S(0.02, 0.42, ph) - S(0.44, 0.88, ph);
    const strength = this.state.depth / 100;
    const mult = this.state.type === 'normal' ? 0.38 : this.state.type === 'dalam' ? 0.68 : 0.96;
    return (wave - 0.35) * 1.45 * strength * mult;
  },
  drawSpirogram(el) {
    const cv = document.getElementById('spiroCanvas'); if (!cv) return;
    const st = this.state, ctx = cv.getContext('2d'), W = cv.width, H = cv.height, span = 4.2;
    st.spiro.push([el, this.spiroValue(st.phase)]);
    while (st.spiro.length && el - st.spiro[0][0] > span) st.spiro.shift();
    ctx.clearRect(0, 0, W, H); ctx.fillStyle = '#04120d'; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(40,200,140,.12)'; ctx.lineWidth = 1; ctx.beginPath();
    for (let x = 0; x < W; x += 16) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
    for (let y = 0; y < H; y += 16) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
    ctx.stroke();
    ctx.strokeStyle = '#2cf5b0'; ctx.lineWidth = 1.8; ctx.shadowColor = '#2cf5b0'; ctx.shadowBlur = 6; ctx.beginPath();
    st.spiro.forEach(([t, val], i) => { const x = W - (el - t) / span * W, y = H * 0.62 - val * H * 0.44; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
    ctx.stroke(); ctx.shadowBlur = 0;
  },

  // ---------- Siklus Pernapasan + Urai Struktur ----------
  animateLungs() {
    const st = this.state, kit = st.kit, S = LungsKit.sstep, tmp = new THREE.Vector3();
    const pos = st.airParticles.geometry.attributes.position;
    let last = 0;
    st.scene.addAnimation((el) => {
      const dt = Math.min(0.1, Math.max(0, el - last)); last = el;
      st.phase += dt * (st.rpm / 60);
      if (st.phase >= 1) st.phase -= 1;
      const ph = st.phase;

      // Interpolasi halus untuk Urai Struktur (Exploded View)
      if (kit.explodables && Math.abs(st.explode - st.explodeTarget) > 0.0005) {
        st.explode += (st.explodeTarget - st.explode) * Math.min(1, dt * 8);
        kit.explodables.forEach(item => {
          item.obj.position.lerpVectors(item.basePos, item.targetPos, st.explode);
        });
      }

      const breath = S(0.02, 0.42, ph) - S(0.44, 0.88, ph);
      const strength = (st.depth / 100) * (st.type === 'normal' ? 0.65 : st.type === 'dalam' ? 0.88 : 1.15);

      const sx = 1 + 0.13 * breath * strength;
      const sy = 1 + 0.11 * breath * strength;
      const sz = 1 + 0.15 * breath * strength;
      kit.rightLung.scale.set(sx, sy, sz);
      kit.leftLung.scale.set(sx, sy, sz);

      if (kit.diaphragm) {
        kit.diaphragm.position.y = -1.65 - 0.24 * breath * strength - 0.78 * st.explode;
        kit.diaphragm.scale.set(1 + 0.06 * breath * strength, 1 - 0.28 * breath * strength, 1 + 0.06 * breath * strength);
      }

      // impuls aliran udara pada pohon bronkiolus
      kit.condMat.uniforms.uPhase.value = ph;
      kit.nodes.forEach(n => {
        const d = ph - n.delay;
        const pulse = Math.exp(-d * d / 0.0045);
        if (n.mesh.userData && n.mesh.userData.key === 'alveoli') {
          n.mesh.scale.setScalar(1 + (0.22 * breath * strength) + 0.15 * pulse);
        } else {
          n.mesh.scale.setScalar(1 + 1.15 * pulse);
        }
      });

      // aliran partikel O2 & CO2
      const sp = dt * 0.24 * (st.rpm / 16) * (0.6 + 0.6 * strength), a = pos.array;
      st.particles.forEach((p, i) => {
        p.t = (p.t + sp * p.v) % 1; p.path.curve.getPoint(p.t, tmp);
        a[i * 3] = tmp.x + p.j.x; a[i * 3 + 1] = tmp.y + p.j.y; a[i * 3 + 2] = tmp.z + p.j.z;
      });
      pos.needsUpdate = true;

      // partikel asap rokok jika simulasi aktif
      if (st.isSmoking) {
        if (!st.smokeParticles) {
          const sGeo = new THREE.BufferGeometry();
          const sArr = new Float32Array(120 * 3);
          for (let i = 0; i < 360; i++) sArr[i] = (Math.random() - 0.5) * 2.6;
          sGeo.setAttribute('position', new THREE.BufferAttribute(sArr, 3));
          st.smokeParticles = new THREE.Points(sGeo, new THREE.PointsMaterial({
            color: 0x94a3b8, size: 0.22, map: kit.glowTex, transparent: true, opacity: 0.48, depthWrite: false
          }));
          kit.root.add(st.smokeParticles);
        }
        const sPos = st.smokeParticles.geometry.attributes.position.array;
        for (let i = 0; i < sPos.length; i += 3) {
          sPos[i] += Math.sin(el + i) * 0.006;
          sPos[i + 1] -= 0.012;
          sPos[i + 2] += Math.cos(el + i) * 0.006;
          if (sPos[i + 1] < -1.8) sPos[i + 1] = 2.4;
        }
        st.smokeParticles.geometry.attributes.position.needsUpdate = true;
      } else if (st.smokeParticles) {
        kit.root.remove(st.smokeParticles);
        st.smokeParticles = null;
      }

      st.lungsGroup.rotation.y = Math.sin(el * 0.25) * 0.1;
      if (st.focus) {
        const c = st.scene.controls; c.target.lerp(st.focus.target, 0.07);
        if (c.target.distanceTo(st.focus.target) < 0.02) st.focus = null;
      }
      this.updateLabels();
      this.drawSpirogram(el);
    });
  }
};