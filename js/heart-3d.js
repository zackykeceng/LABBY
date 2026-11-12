/* ============================================================
   HEART-3D.JS — Eksperimen Jantung (versi realistis)
   Model dibuat oleh HeartKit (js/heart-kit.js). File ini mengurus
   UI, interaksi, animasi siklus jantung, bedah lapisan, urai struktur, label, dan EKG.
   ============================================================ */
const HeartExperiment = {
  state: {
    scene: null, bpm: 75, aktivitas: 'santai', heartGroup: null, chambers: {}, bloodParticles: null,
    selectedChamber: null, beatPulse: 0, phase: 0, kit: null, clickables: [], labels: [],
    showLabels: true, showCond: true, dissect: 0, explode: 0, explodeTarget: 0, clipPlane: null,
    focus: null, ecg: []
  },
  missions: [
    { id: 'm1', text: 'Putar jantung dan klik Bilik Kiri' },
    { id: 'm2', text: 'Ubah aktivitas menjadi Olahraga Berat' },
    { id: 'm3', text: 'Selesaikan kuis dengan benar' }
  ],
  aktivitasData: {
    tidur: { bpm: 55, nama: 'Tidur' }, santai: { bpm: 75, nama: 'Duduk Santai' },
    jalan: { bpm: 95, nama: 'Jalan Kaki' }, lari: { bpm: 140, nama: 'Lari Cepat' },
    olahraga: { bpm: 170, nama: 'Olahraga Berat' }
  },

  // ---- Materi pembelajaran tiap struktur ----
  INFO: {
    lv: ['Bilik Kiri (Ventrikel Kiri)', '<span class="glossary-term" data-tooltip="Ruang jantung dengan otot paling tebal">Ventrikel kiri</span> — memompa darah kaya O₂ ke seluruh tubuh lewat aorta. Dindingnya paling tebal (±10–15 mm) karena harus melawan tekanan sistemik.'],
    rv: ['Bilik Kanan (Ventrikel Kanan)', 'Ventrikel kanan — memompa darah kaya CO₂ ke paru-paru lewat arteri pulmonalis. Dindingnya lebih tipis karena tekanan di paru-paru rendah.'],
    la: ['Serambi Kiri (Atrium Kiri)', 'Atrium kiri — menerima darah kaya O₂ dari paru-paru melalui 4 vena pulmonalis, lalu mengalirkannya ke bilik kiri lewat katup mitral.'],
    ra: ['Serambi Kanan (Atrium Kanan)', 'Atrium kanan — menerima darah kaya CO₂ dari seluruh tubuh lewat vena kava. Di dindingnya terdapat nodus SA, pemacu alami jantung.'],
    aorta: ['Aorta', 'Arteri terbesar. Membawa darah kaya O₂ dari bilik kiri ke seluruh tubuh. Dari lengkung aorta keluar cabang ke kepala dan lengan.'],
    pulm: ['Arteri Pulmonalis', 'Satu-satunya arteri yang membawa darah miskin O₂ (kaya CO₂) — dari bilik kanan menuju paru-paru.'],
    svc: ['Vena Kava Superior', 'Membawa darah miskin O₂ dari kepala dan lengan ke serambi kanan.'],
    ivc: ['Vena Kava Inferior', 'Membawa darah miskin O₂ dari tubuh bagian bawah ke serambi kanan.'],
    pv: ['Vena Pulmonalis', 'Satu-satunya vena yang membawa darah kaya O₂ — dari paru-paru ke serambi kiri.'],
    mitral: ['Katup Mitral (Bikuspid)', 'Memisahkan serambi kiri dan bilik kiri. Terdiri atas 2 daun katup, mencegah darah mengalir balik saat bilik berkontraksi.'],
    tri: ['Katup Trikuspid', 'Memisahkan serambi kanan dan bilik kanan. Terdiri atas 3 daun katup.'],
    aov: ['Katup Aorta', 'Katup semilunar (3 kantung) di pangkal aorta. Terbuka saat bilik kiri memompa, menutup saat relaksasi.'],
    pov: ['Katup Pulmonal', 'Katup semilunar di pangkal arteri pulmonalis. Mencegah darah kembali ke bilik kanan.'],
    pap: ['Otot Papilar & Chordae Tendineae', 'Otot papilar menarik benang-benang <i>chordae tendineae</i> agar daun katup AV tidak terbalik ke serambi saat bilik berkontraksi.'],
    lad: ['Arteri Koroner', 'Arteri koroner (merah) dan vena jantung (biru) memberi makan otot jantung sendiri. Penyumbatannya menyebabkan serangan jantung.'],
    rca: ['Arteri Koroner Kanan', 'Cabang arteri koroner yang memperdarahi serambi kanan, bilik kanan, serta nodus SA dan AV.'],
    vein: ['Vena Jantung (Koroner)', 'Mengumpulkan darah kaya CO₂ dari otot jantung (miokardium) untuk dikembalikan ke serambi kanan melalui sinus koronarius.'],
    sa: ['Nodus Sinoatrial (SA)', 'Pemacu alami jantung (±60–100 impuls/menit) di dinding serambi kanan dekat vena kava superior. Impuls dari sini menyebar ke kedua serambi sehingga berkontraksi.'],
    av: ['Nodus Atrioventrikular (AV)', 'Menahan impuls ±0,1 detik agar serambi selesai memompa darah ke bilik sebelum bilik berkontraksi.'],
    his: ['Berkas His', 'Satu-satunya "jembatan" listrik antara serambi dan bilik. Berjalan di sekat (septum) lalu bercabang dua.'],
    lbb: ['Cabang Berkas Kiri', 'Menghantar impuls ke bilik kiri melalui sekat, lalu menyebar ke serabut Purkinje (garis halus di dinding bilik).'],
    rbb: ['Cabang Berkas Kanan', 'Menghantar impuls ke bilik kanan dan ke apeks (ujung jantung) melalui serabut Purkinje.']
  },
  LABELS: [
    { key: 'svc', text: 'Vena kava superior', anchor: 'svcL', side: 'left' },
    { key: 'sa', text: 'Nodus sinoatrial', anchor: 'sa', side: 'left', cond: true },
    { key: 'av', text: 'Nodus atrioventrikular', anchor: 'av', side: 'left', cond: true },
    { key: 'his', text: 'Berkas His', anchor: 'his', side: 'left', cond: true },
    { key: 'lbb', text: 'Cabang berkas kiri', anchor: 'lbbL', side: 'left', cond: true },
    { key: 'rbb', text: 'Cabang berkas kanan', anchor: 'rbbL', side: 'left', cond: true },
    { key: 'ivc', text: 'Vena kava inferior', anchor: 'ivcL', side: 'left' },
    { key: 'aorta', text: 'Aorta', anchor: 'aortaL', side: 'right' },
    { key: 'pulm', text: 'Arteri pulmonalis', anchor: 'pulmL', side: 'right' },
    { key: 'lv', text: 'Bilik kiri', anchor: 'lvL', side: 'right' }
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
    const panel = document.getElementById('panelHeart');
    panel.innerHTML = `
      <div class="exp-header">
        <span class="exp-badge">Eksperimen 1 dari 2</span>
        <h2 class="exp-title">Jantung dan peredaran darah</h2>
        <p class="exp-description">Putar model jantung, gunakan fitur <b>Bedah Lapisan 3D</b> untuk mengiris dinding jantung dan melihat katup di dalamnya, atau <b>Urai Struktur</b> untuk memisahkan setiap bagian anatomis!</p>
      </div>
      <div class="exp-3d-layout">
        <div class="scene-container" id="heartScene">
          <div class="hx-layer" id="hxLayer"><svg id="hxSvg" width="100%" height="100%"></svg></div>
          <div class="tutorial-overlay" id="tutorialHeart">
            <div class="tutorial-box">
              <h3>Cara menjelajah</h3>
              <p><b>Seret</b> untuk memutar jantung, <b>gulir</b> untuk zoom, <b>klik</b> organ untuk membaca penjelasannya, serta gunakan kontrol <b>Bedah Lapisan</b> & <b>Urai Struktur</b>.</p>
              <button type="button" class="btn btn-primary" id="btnTutorialHeartClose">Mulai menjelajah</button>
            </div>
          </div>
          <div class="scene-overlay">
            <h4>Jantung</h4>
            <p>Seret untuk memutar, gulir untuk zoom, klik organ untuk penjelasan.</p>
          </div>
          <div class="scene-controls">
            <button class="scene-btn" id="btnLabels" title="Label" aria-label="Tampilkan label" aria-pressed="true"><svg class="ico" aria-hidden="true"><use href="#i-tag"/></svg></button>
            <button class="scene-btn" id="btnConduction" title="Sistem konduksi listrik" aria-label="Tampilkan sistem konduksi" aria-pressed="true"><svg class="ico" aria-hidden="true"><use href="#i-bolt"/></svg></button>
            <button class="scene-btn" id="btnHeartDissect" title="Bedah lapisan 3D (Irisan)" aria-label="Bedah lapisan 3D" aria-pressed="false">
              <svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
            </button>
            <button class="scene-btn" id="btnHeartExplode" title="Urai struktur 3D (Exploded View)" aria-label="Urai struktur 3D" aria-pressed="false">
              <svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/><polyline points="9 3 3 3 3 9"/><line x1="3" y1="3" x2="10" y2="10"/><polyline points="15 21 21 21 21 15"/><line x1="21" y1="21" x2="14" y2="14"/></svg>
            </button>
            <button class="scene-btn" id="btnResetView" title="Kembalikan sudut pandang" aria-label="Kembalikan sudut pandang"><svg class="ico" aria-hidden="true"><use href="#i-target"/></svg></button>
            <button class="scene-btn" id="btnWireframe" title="Wireframe" aria-label="Mode wireframe"><svg class="ico" aria-hidden="true"><use href="#i-cube"/></svg></button>
          </div>
          <div class="mobile-controls">
            <button class="mobile-btn" id="btnZoomIn" aria-label="Perbesar"><svg class="ico" aria-hidden="true"><use href="#i-plus"/></svg></button>
            <button class="mobile-btn" id="btnZoomOut" aria-label="Perkecil"><svg class="ico" aria-hidden="true"><use href="#i-minus"/></svg></button>
          </div>
          <div class="click-info" id="heartClickInfo" aria-live="polite">
            <button type="button" class="click-info-close" id="btnCloseHeartInfo" title="Tutup penjelasan" aria-label="Tutup penjelasan">&times;</button>
            <h5 id="clickInfoTitle"></h5><p id="clickInfoText"></p>
          </div>
        </div>
        <div class="control-panel">
          <div class="panel-header"><svg class="ico" aria-hidden="true"><use href="#i-sliders"/></svg><h3 class="panel-title">Kontrol</h3></div>
          <div class="control-group">
            <div class="control-label"><span>Aktivitas</span></div>
            <select class="select-input" id="selectHeartActivity">
              <option value="tidur">Tidur (55 BPM)</option>
              <option value="santai" selected>Duduk santai (75 BPM)</option>
              <option value="jalan">Jalan kaki (95 BPM)</option>
              <option value="lari">Lari cepat (140 BPM)</option>
              <option value="olahraga">Olahraga berat (170 BPM)</option>
            </select>
          </div>
          <div class="control-group">
            <div class="control-label"><span>Detak per menit</span><span class="value-badge" id="heartBpm">75</span></div>
            <input type="range" class="range-slider" id="sliderHeartBpm" min="40" max="200" value="75" step="1" aria-label="BPM">
          </div>
          <div class="control-group">
            <div class="control-label"><span>Bedah lapisan 3D</span><span class="value-badge" id="heartDissectVal">0%</span></div>
            <input type="range" class="range-slider" id="sliderHeartDissect" min="0" max="100" value="0" step="1" aria-label="Bedah lapisan 3D">
          </div>
          <div class="control-group">
            <div class="control-label"><span>Urai struktur 3D</span><span class="value-badge" id="heartExplodeVal">0%</span></div>
            <input type="range" class="range-slider" id="sliderHeartExplode" min="0" max="100" value="0" step="1" aria-label="Urai struktur 3D">
          </div>
          <div class="control-group">
            <div class="control-label"><span>Opasitas jaringan</span><span class="value-badge" id="heartXrayVal">62%</span></div>
            <input type="range" class="range-slider" id="sliderHeartXray" min="15" max="100" value="62" step="1" aria-label="Opasitas jaringan">
          </div>
          <div class="control-group">
            <div class="control-label"><span>Rekaman EKG (simulasi)</span></div>
            <canvas id="heartEcg" class="hx-ecg" width="320" height="86" aria-label="Grafik EKG simulasi"></canvas>
          </div>
          <div class="stat-grid">
            <div class="stat-card"><div class="stat-value" id="statHeartBpm">75</div><div class="stat-label">detak per menit</div></div>
            <div class="stat-card"><div class="stat-value" id="statHeartVol">4.9</div><div class="stat-label">liter darah per menit</div></div>
          </div>
          <div class="btn-group">
            <button class="btn btn-secondary" id="btnResetHeart"><svg class="ico" aria-hidden="true"><use href="#i-reset"/></svg> Kembalikan pengaturan awal</button>
          </div>
        </div>
      </div>
      <div class="bottom-panel">
        <div id="missionHeart"></div>
        <div id="lkpdHeart"></div>
        <div id="quizHeart"></div>
      </div>
    `;
    this.init();
  },

  init() {
    const container = document.getElementById('heartScene');
    this.state.scene = new ThreeScene(container);
    const sc = this.state.scene;
    sc.renderer.domElement.setAttribute('aria-label', 'Model 3D jantung interaktif.');
    sc.renderer.domElement.setAttribute('role', 'img');

    this.setupLook(sc);
    this.buildHeart();
    this.setupInteractions();
    this.setupControls();
    this.setupLabels();
    this.updateResult();
    this.animateHeart();

    renderMissions('missionHeart', 'heart', this.missions);
    renderLKPD('lkpdHeart', 'heart');
    renderQuiz('quizHeart', 'heart');

    this.bindTutorial();
    setTimeout(() => sc.hideLoading(), 300);

    if (!localStorage.getItem('biolab_tutorial_seen_heart')) {
      setTimeout(() => {
        const t = document.getElementById('tutorialHeart');
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
    sc.setDefaultView(new T.Vector3(0, 0.6, 9.4), new T.Vector3(0, 0.55, 0));
    sc.controls.minDistance = 2.5; sc.controls.maxDistance = 16;

    this.state.clipPlane = new T.Plane(new T.Vector3(0, 0, -1), 2.5);
  },

  bindTutorial() {
    const overlay = document.getElementById('tutorialHeart');
    const btnClose = document.getElementById('btnTutorialHeartClose');
    const close = () => {
      if (!overlay) return;
      overlay.classList.remove('show');
      try { localStorage.setItem('biolab_tutorial_seen_heart', 'true'); } catch (e) {}
      if (typeof Sound !== 'undefined') Sound.click();
    };
    if (btnClose) {
      btnClose.onclick = null;
      btnClose.addEventListener('click', (e) => { e.stopPropagation(); close(); });
    }
    if (overlay) overlay.onclick = (e) => { if (e.target === overlay) close(); };
  },

  setVisible(v) { if (this.state.scene) this.state.scene.setVisible(v); },

  buildHeart() {
    const st = this.state, scene = st.scene, T = THREE;
    const kit = HeartKit.build();
    st.kit = kit; st.heartGroup = kit.root; st.chambers = kit.chambers; st.clickables = kit.clickables;
    scene.scene.add(kit.root);

    // Partikel darah mengikuti jalur anatomis (biru = miskin O₂, merah = kaya O₂)
    const N = 380, pos = new Float32Array(N * 3), col = new Float32Array(N * 3);
    st.particles = Array.from({ length: N }, (_, i) => {
      const path = kit.paths[i % kit.paths.length];
      col.set([path.color.r, path.color.g, path.color.b], i * 3);
      return { path, t: Math.random(), v: 0.75 + Math.random() * 0.5, j: new T.Vector3((Math.random() - .5) * .1, (Math.random() - .5) * .1, (Math.random() - .5) * .1) };
    });
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.BufferAttribute(pos, 3));
    geo.setAttribute('color', new T.BufferAttribute(col, 3));
    st.bloodParticles = new T.Points(geo, new T.PointsMaterial({
      size: 0.13, map: kit.glowTex, vertexColors: true, transparent: true, opacity: 0.85,
      depthWrite: false, blending: T.AdditiveBlending, sizeAttenuation: true
    }));
    st.bloodParticles.frustumCulled = false;
    kit.root.add(st.bloodParticles);
  },

  // ---------- Terapkan Bedah Lapisan 3D (0..100) ----------
  applyDissect(val) {
    const st = this.state, kit = st.kit;
    st.dissect = val;
    const slider = document.getElementById('sliderHeartDissect');
    const badge = document.getElementById('heartDissectVal');
    const btn = document.getElementById('btnHeartDissect');
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
      st.clipPlane.constant = 1.15 - (val / 100) * 2.0;
      if (kit.dissectables) kit.dissectables.forEach(m => { m.clippingPlanes = [st.clipPlane]; });
    }
  },

  // ---------- Terapkan Urai Struktur 3D (0..100) ----------
  applyExplode(val) {
    const st = this.state;
    st.explodeTarget = val / 100;
    const slider = document.getElementById('sliderHeartExplode');
    const badge = document.getElementById('heartExplodeVal');
    const btn = document.getElementById('btnHeartExplode');
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
    st.selectedChamber = null;
    st.focus = null;
    const infoBox = document.getElementById('heartClickInfo');
    if (infoBox) {
      infoBox.classList.remove('show');
      infoBox.style.display = 'none';
    }
    if (!kit) return;

    kit.clickables.forEach(o => {
      const m = o.material;
      if (!m || !m.emissive || o.userData.key === 'vent' || m.isMeshBasicMaterial) return;
      if (m.userData.em0) {
        m.emissive.setHex(m.userData.em0.c);
        m.emissiveIntensity = m.userData.em0.i;
      }
    });
    kit.pumps.ra.forEach(m => m.material.userData.rimU.value.set(0xffb0b8));
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
      // Klik area kosong di luar jantung -> tutup kotak penjelasan
      if (!best) {
        if (st.selectedChamber) this.clearSelection();
        return;
      }
      let key = best.u.key;
      if (best.u.resolve) key = best.u.resolve(st.kit.frame.worldToLocal(best.h.point.clone()));
      // Jika komponen yang sama diklik kembali -> tutup kotak penjelasan (toggle)
      if (st.selectedChamber === key) {
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
    st.selectedChamber = key;
    document.getElementById('clickInfoTitle').textContent = info[0];
    document.getElementById('clickInfoText').innerHTML = info[1];
    const infoBox = document.getElementById('heartClickInfo');
    if (infoBox) {
      infoBox.style.display = '';
      // Reflow singkat agar animasi CSS .show berjalan mulus
      void infoBox.offsetWidth;
      infoBox.classList.add('show');
    }
    if (typeof Sound !== 'undefined') Sound.click();
    if (key === 'lv' && typeof Progress !== 'undefined') Progress.completeMission('heart', 'm1');

    // sorot struktur terpilih (emissive), rim cyan pada serambi kanan untuk SA/AV, flash pada jalur listrik
    kit.clickables.forEach(o => {
      const m = o.material;
      if (!m || !m.emissive || o.userData.key === 'vent' || m.isMeshBasicMaterial) return;
      if (!m.userData.em0) m.userData.em0 = { c: m.emissive.getHex(), i: m.emissiveIntensity };
      if (o.userData.key === key) { m.emissive.setHex(0x9a7430); m.emissiveIntensity = 1; }
      else { m.emissive.setHex(m.userData.em0.c); m.emissiveIntensity = m.userData.em0.i; }
    });
    const cyan = key === 'sa' || key === 'av';
    kit.pumps.ra.forEach(m => m.material.userData.rimU.value.set(cyan ? 0x28e0ff : 0xffb0b8));
    kit.condMat.uniforms.uBoost.value = ['sa', 'av', 'his', 'lbb', 'rbb'].includes(key) ? 1.9 : 1;

    if (!noFocus && this.LABELS.some(l => l.key === key)) {
      const L = this.LABELS.find(l => l.key === key), p = new THREE.Vector3();
      (kit.anchors[L.anchor] || kit.root).getWorldPosition(p);
      st.focus = { target: p.multiplyScalar(0.55).setZ(0).add(new THREE.Vector3(0, 0.25, 0)), t: 0 };
    }
  },

  setupControls() {
    const st = this.state, sc = st.scene;

    // Isolasi klik pada kotak info agar tidak tembus ke kanvas 3D / OrbitControls
    const infoBox = document.getElementById('heartClickInfo');
    if (infoBox) {
      ['pointerdown', 'pointerup', 'mousedown', 'mouseup', 'touchstart', 'touchend', 'click'].forEach(evt => {
        infoBox.addEventListener(evt, (e) => e.stopPropagation());
      });
    }

    // Tombol Close (×) pada kartu penjelasan jantung
    const btnCloseInfo = document.getElementById('btnCloseHeartInfo');
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
        if (e.key === 'Escape' && this.state.selectedChamber) {
          this.clearSelection();
        }
      };
      document.addEventListener('keydown', this._escHandler);
    }

    document.getElementById('btnResetView').onclick = () => { st.focus = null; sc.resetCamera(); };
    let wire = false;
    document.getElementById('btnWireframe').onclick = () => { wire = !wire; sc.scene.traverse(o => { if (o.isMesh && o.material && o.material.visible !== false) o.material.wireframe = wire; }); };

    const toggle = (id, flag, apply) => {
      const b = document.getElementById(id);
      b.onclick = () => { st[flag] = !st[flag]; b.setAttribute('aria-pressed', String(st[flag])); apply && apply(st[flag]); };
    };
    toggle('btnLabels', 'showLabels');
    toggle('btnConduction', 'showCond', (v) => st.kit.cond.forEach(m => { m.visible = v; }));

    // Kontrol Bedah Lapisan 3D (Tombol & Slider)
    document.getElementById('btnHeartDissect').onclick = () => {
      const next = st.dissect > 0 ? 0 : 58;
      this.applyDissect(next);
      if (typeof Sound !== 'undefined') Sound.click();
    };
    document.getElementById('sliderHeartDissect').oninput = (e) => {
      this.applyDissect(+e.target.value);
    };

    // Kontrol Urai Struktur 3D (Tombol & Slider)
    document.getElementById('btnHeartExplode').onclick = () => {
      const next = st.explodeTarget > 0 ? 0 : 100;
      this.applyExplode(next);
      if (typeof Sound !== 'undefined') Sound.click();
    };
    document.getElementById('sliderHeartExplode').oninput = (e) => {
      this.applyExplode(+e.target.value);
    };

    const zoomIn = document.getElementById('btnZoomIn'), zoomOut = document.getElementById('btnZoomOut');
    if (zoomIn) zoomIn.onclick = () => { if (sc.controls.dollyIn) sc.controls.dollyIn(1.2); else sc.camera.position.multiplyScalar(0.9); sc.controls.update(); };
    if (zoomOut) zoomOut.onclick = () => { if (sc.controls.dollyOut) sc.controls.dollyOut(1.2); else sc.camera.position.multiplyScalar(1.1); sc.controls.update(); };

    document.getElementById('sliderHeartXray').oninput = (e) => {
      const v = +e.target.value, f = v / 62;
      document.getElementById('heartXrayVal').textContent = v + '%';
      st.kit.glass.forEach(m => { m.opacity = Math.min(1, m.userData.baseOpacity * f); m.userData.minU.value = Math.min(1, 0.3 + Math.max(0, f - 1) * 0.7); });
    };

    document.getElementById('selectHeartActivity').onchange = (e) => {
      const data = this.aktivitasData[e.target.value];
      st.bpm = data.bpm;
      document.getElementById('sliderHeartBpm').value = data.bpm;
      const badge = document.getElementById('heartBpm');
      badge.textContent = data.bpm; badge.classList.add('changed');
      setTimeout(() => badge.classList.remove('changed'), 350);
      this.updateResult();
      Progress.addData('heart', { condition: data.nama, value: data.bpm + ' BPM' });
      if (e.target.value === 'olahraga') Progress.completeMission('heart', 'm2');
    };
    document.getElementById('sliderHeartBpm').oninput = (e) => {
      st.bpm = +e.target.value;
      document.getElementById('heartBpm').textContent = st.bpm;
      this.updateResult();
    };
    document.getElementById('btnResetHeart').onclick = () => {
      st.bpm = 75;
      document.getElementById('sliderHeartBpm').value = 75;
      document.getElementById('selectHeartActivity').value = 'santai';
      document.getElementById('heartBpm').textContent = '75';
      document.getElementById('sliderHeartXray').value = 62;
      document.getElementById('heartXrayVal').textContent = '62%';
      st.kit.glass.forEach(m => { m.opacity = m.userData.baseOpacity; m.userData.minU.value = 0.3; });
      this.applyDissect(0);
      this.applyExplode(0);
      this.clearSelection();
      this.updateResult();
    };
  },

  updateResult() {
    const vol = Math.round(this.state.bpm * 70);
    document.getElementById('statHeartBpm').textContent = this.state.bpm;
    document.getElementById('statHeartVol').textContent = (vol / 1000).toFixed(1);
    if (typeof Sound !== 'undefined' && Sound.isEnabled() && Sound._ambientSource) {
      Sound._ambientSource.playbackRate.value = this.state.bpm / 75;
    }
  },

  // ---------- Label 3D dengan garis penunjuk (gaya Anatomage) ----------
  setupLabels() {
    const st = this.state, layer = document.getElementById('hxLayer'), svg = document.getElementById('hxSvg');
    const NS = 'http://www.w3.org/2000/svg';
    st.labels = this.LABELS.map(L => {
      const dot = document.createElement('button'); dot.type = 'button'; dot.className = 'hx-dot'; dot.setAttribute('aria-label', L.text);
      const txt = document.createElement('span'); txt.className = 'hx-label ' + L.side; txt.textContent = L.text;
      const line = document.createElementNS(NS, 'line'); line.setAttribute('class', 'hx-line');
      svg.appendChild(line); layer.append(dot, txt);
      const go = (e) => {
        e.stopPropagation();
        if (st.selectedChamber === L.key) {
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
    const colL = Math.max(150, proj(-1.7, 0.6, 0)[0] - 8), colR = Math.min(w - 150, proj(1.95, 0.6, 0)[0] + 8);
    const rows = { left: [], right: [] };
    st.labels.forEach(L => {
      const show = st.showLabels && (!L.cond || st.showCond);
      L.dot.style.display = L.txt.style.display = L.line.style.display = show ? '' : 'none';
      if (!show) return;
      (kit.anchors[L.anchor] || kit.root).getWorldPosition(v); v.project(sc.camera);
      L.x = (v.x * .5 + .5) * w; L.y = (-v.y * .5 + .5) * h;
      L.dot.style.transform = `translate(${L.x}px,${L.y}px) translate(-50%,-50%)`;
      L.dot.classList.toggle('sel', st.selectedChamber === L.key);
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

  // ---------- EKG sintetis, sinkron dengan fase siklus ----------
  ecgValue(ph) {
    const g = (c, s, a) => a * Math.exp(-((ph - c) ** 2) / (2 * s * s));
    return g(0.05, 0.020, 0.14) + g(0.165, 0.007, -0.12) + g(0.19, 0.0075, 1.0) + g(0.215, 0.008, -0.25) + g(0.40, 0.040, 0.30);
  },
  drawEcg(el) {
    const cv = document.getElementById('heartEcg'); if (!cv) return;
    const st = this.state, ctx = cv.getContext('2d'), W = cv.width, H = cv.height, span = 2.6;
    st.ecg.push([el, this.ecgValue(st.phase)]);
    while (st.ecg.length && el - st.ecg[0][0] > span) st.ecg.shift();
    ctx.clearRect(0, 0, W, H); ctx.fillStyle = '#04120d'; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(40,200,140,.12)'; ctx.lineWidth = 1; ctx.beginPath();
    for (let x = 0; x < W; x += 16) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
    for (let y = 0; y < H; y += 16) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
    ctx.stroke();
    ctx.strokeStyle = '#2cf5b0'; ctx.lineWidth = 1.8; ctx.shadowColor = '#2cf5b0'; ctx.shadowBlur = 6; ctx.beginPath();
    st.ecg.forEach(([t, val], i) => { const x = W - (el - t) / span * W, y = H * 0.72 - val * H * 0.55; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
    ctx.stroke(); ctx.shadowBlur = 0;
  },

  // ---------- Siklus jantung: P → QRS → T, kontraksi serambi lalu bilik + animasi Urai Struktur ----------
  animateHeart() {
    const st = this.state, kit = st.kit, S = HeartKit.sstep, tmp = new THREE.Vector3();
    const arteries = kit.clickables.filter(o => o.userData.key === 'aorta' || o.userData.key === 'pulm');
    const pos = st.bloodParticles.geometry.attributes.position;
    let last = 0;
    st.scene.addAnimation((el) => {
      const dt = Math.min(0.1, Math.max(0, el - last)); last = el;
      const prev = st.phase; st.phase += dt * st.bpm / 60;
      if (st.phase >= 1) st.phase -= 1;
      const ph = st.phase;
      if (prev < 0.2 && ph >= 0.2 && typeof Sound !== 'undefined' && Sound.isEnabled()) Sound.heartbeat();

      // Interpolasi halus untuk Urai Struktur (Exploded View)
      if (kit.explodables && Math.abs(st.explode - st.explodeTarget) > 0.0005) {
        st.explode += (st.explodeTarget - st.explode) * Math.min(1, dt * 8);
        kit.explodables.forEach(item => {
          item.obj.position.lerpVectors(item.basePos, item.targetPos, st.explode);
        });
      }

      const aS = S(0.0, 0.07, ph) - S(0.09, 0.2, ph);            // sistol serambi
      const vS = S(0.2, 0.3, ph) - S(0.5, 0.64, ph);             // sistol bilik
      kit.frame.scale.set(1 - 0.05 * vS, 1 - 0.058 * vS, 1 - 0.05 * vS);
      kit.frame.rotation.y = 0.05 * vS;                          // puntiran bilik
      kit.pumps.ra.concat(kit.pumps.la).forEach(m => m.scale.setScalar(1 - 0.075 * aS));
      [kit.mitral, kit.tricus].forEach(g => g.scale.set(1 - 0.22 * vS, 1, 1 - 0.22 * vS));    // katup AV menutup
      const pulse = S(0.24, 0.34, ph) - S(0.55, 0.7, ph);
      arteries.forEach(o => { if (st.selectedChamber !== o.userData.key) { o.material.emissive.setRGB(0.5, 0.06, 0.06); o.material.emissiveIntensity = 0.35 * pulse; } });

      // impuls listrik
      kit.condMat.uniforms.uPhase.value = ph;
      kit.nodes.forEach(n => { const d = ph - n.delay; n.mesh.scale.setScalar(1 + 1.3 * Math.exp(-d * d / 0.0018)); });

      // aliran darah
      const sp = dt * 0.1 * (st.bpm / 75), a = pos.array;
      st.particles.forEach((p, i) => {
        p.t = (p.t + sp * p.v) % 1; p.path.curve.getPoint(p.t, tmp);
        a[i * 3] = tmp.x + p.j.x; a[i * 3 + 1] = tmp.y + p.j.y; a[i * 3 + 2] = tmp.z + p.j.z;
      });
      pos.needsUpdate = true;

      st.heartGroup.rotation.y = Math.sin(el * 0.25) * 0.1;
      if (st.focus) {
        const c = st.scene.controls; c.target.lerp(st.focus.target, 0.07);
        if (c.target.distanceTo(st.focus.target) < 0.02) st.focus = null;
      }
      this.updateLabels();
      this.drawEcg(el);
    });
  }
};