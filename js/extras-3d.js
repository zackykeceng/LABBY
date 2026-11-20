/* ============================================================
   EXTRAS-3D.JS — Pengembangan lanjutan model 3D Jantung & Paru-paru
   Cara pakai: muat SETELAH heart-3d.js & lungs-3d.js, SEBELUM app.js.
   File ini membungkus HeartExperiment.init / LungsExperiment.init,
   jadi file lama tidak perlu diubah.

   JANTUNG : Partikel realistis (eritrosit bikonkaf, leukosit, trombosit),
             zoom ke dalam organ, Tur berpemandu aliran darah
             (katup + volume bilik), simulasi penyumbatan koroner
             (plak 3D, area iskemia, EKG segmen ST naik).
   PARU    : Rangka dada 3D (rusuk, sternum, tulang belakang) yang ikut
             mengembang saat inspirasi, molekul O2 dan CO2 realistis.
   KEDUANYA: Mode Tantangan (kenali struktur), tombol 
   ============================================================ */
(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const S = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const snd = (fn) => { try { if (typeof Sound !== 'undefined' && typeof Sound[fn] === 'function') Sound[fn](); } catch (e) {} };
  const toast = (m, t = 'info') => { try { if (typeof Utils !== 'undefined') Utils.toast(m, t); } catch (e) {} };
  const record = (exp, condition, value) => { try { if (typeof Progress !== 'undefined') Progress.addData(exp, { condition, value }); } catch (e) {} };

  /* ---------------------------------------------------------- gaya */
  function injectStyle() {
    if ($('x3dStyle')) return;
    const s = document.createElement('style');
    s.id = 'x3dStyle';
    s.textContent = `
      .scene-container:fullscreen,.scene-container.x-pseudo-fs{width:100vw!important;height:100vh!important;height:100dvh!important;max-width:none!important;max-height:none!important;margin:0!important;border-radius:0!important}
      .scene-container:-webkit-full-screen{width:100vw!important;height:100vh!important;max-width:none!important;max-height:none!important;border-radius:0!important}
      .scene-container.x-pseudo-fs{position:fixed!important;inset:0;z-index:9999}
      .x-card{margin-top:.9rem;padding:.75rem .85rem;border-radius:.8rem;background:rgba(127,127,127,.10);border:1px solid rgba(127,127,127,.22);font-size:.82rem;line-height:1.4}
      .x-card h4{margin:0 0 .5rem;font-size:.82rem;font-weight:700}
      .x-chips{display:flex;flex-wrap:wrap;gap:.35rem;margin-top:.55rem}
      .x-chip{padding:.18rem .55rem;border-radius:999px;font-size:.72rem;background:rgba(127,127,127,.16);border:1px solid rgba(127,127,127,.25)}
      .x-chip.on{background:rgba(34,197,94,.18);border-color:rgba(34,197,94,.55)}
      .x-chip.off{background:rgba(239,68,68,.14);border-color:rgba(239,68,68,.5)}
      .x-row{display:flex;justify-content:space-between;align-items:baseline;gap:.5rem}
      .x-bar{height:.5rem;border-radius:999px;background:rgba(127,127,127,.22);overflow:hidden;margin-top:.35rem}
      .x-bar>i{display:block;height:100%;width:0;background:linear-gradient(90deg,#38bdf8,#f43f5e);border-radius:inherit}
      .x-hud{position:absolute;left:50%;transform:translateX(-50%);z-index:58;width:max-content;max-width:min(560px,calc(100% - 7.5rem));
        padding:.6rem .85rem;border-radius:.9rem;background:rgba(10,14,26,.86);color:#f8fafc;border:1px solid rgba(255,255,255,.2);
        backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);font-size:.84rem;line-height:1.45;box-shadow:0 8px 28px rgba(0,0,0,.45);transition:border-color .2s,box-shadow .2s}
      .x-hud.top{top:.75rem}.x-hud.bottom{bottom:.75rem}
      .x-hud .row{display:flex;gap:.5rem;align-items:center;flex-wrap:wrap}
      .x-hud .sp{justify-content:space-between}
      .x-hud button{padding:.3rem .75rem;border-radius:.6rem;border:1px solid rgba(255,255,255,.28);background:rgba(255,255,255,.08);color:inherit;cursor:pointer;font:inherit;font-size:.78rem}
      .x-hud button:hover{background:rgba(255,255,255,.2)}
      .x-hud button:disabled{opacity:.4;cursor:default}
      .x-hud button.pri{background:#2563eb;border-color:#60a5fa}
      .x-hud.ok{border-color:#22c55e;box-shadow:0 0 0 2px rgba(34,197,94,.35),0 8px 28px rgba(0,0,0,.45)}
      .x-hud.bad{border-color:#ef4444;animation:xShake .35s}
      @keyframes xShake{0%,100%{transform:translateX(-50%)}25%{transform:translateX(calc(-50% - 7px))}75%{transform:translateX(calc(-50% + 7px))}}
    `;
    document.head.appendChild(s);
  }

  /* ---------------------------------------------------------- helper UI */
  const ICON = {
    tour: '<circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/>',
    quiz: '<circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
    fsEnter: '<path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/>',
    fsExit: '<path d="M8 3v3a2 2 0 0 1-2 2H3"/><path d="M21 8h-3a2 2 0 0 1-2-2V3"/><path d="M3 16h3a2 2 0 0 1 2 2v3"/><path d="M16 21v-3a2 2 0 0 1 2-2h3"/>',
    ribs: '<path d="M12 3v18"/><path d="M12 6c-4 0-7 2-8 5"/><path d="M12 6c4 0 7 2 8 5"/><path d="M12 11c-4 0-7 2-8 5"/><path d="M12 11c4 0 7 2 8 5"/><path d="M12 16c-3 0-5 1-6 3"/><path d="M12 16c3 0 5 1 6 3"/>'
  };

  function addSceneBtn(contId, { id, title, icon, pressed = false, onclick }) {
    const host = $(contId) && $(contId).querySelector('.scene-controls');
    if (!host) return null;
    const b = document.createElement('button');
    b.className = 'scene-btn'; b.id = id; b.title = title; b.type = 'button';
    b.setAttribute('aria-label', title); b.setAttribute('aria-pressed', String(pressed));
    b.innerHTML = `<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icon}</svg>`;
    b.onclick = onclick;
    host.appendChild(b);
    return b;
  }

  function mkHud(contId, pos) {
    const d = document.createElement('div');
    d.className = 'x-hud ' + pos;
    ['pointerdown', 'pointerup', 'mousedown', 'mouseup', 'touchstart', 'touchend', 'click', 'wheel']
      .forEach(e => d.addEventListener(e, (ev) => ev.stopPropagation()));
    $(contId).appendChild(d);
    return d;
  }

  function wrapInit(E, attach) {
    const orig = E.init;
    E.init = function () {
      orig.apply(this, arguments);
      try { attach(this); } catch (err) { console.error('[extras-3d]', err); }
    };
  }

  /* ---------------------------------------------------------- LAYAR PENUH */
  function sceneFullscreen(contId) {
    const cont = $(contId);
    if (!cont) return;
    const doc = document;
    const getFs = () => doc.fullscreenElement || doc.webkitFullscreenElement || null;
    const canNative = !!(cont.requestFullscreen || cont.webkitRequestFullscreen);
    const isOn = () => getFs() === cont || cont.classList.contains('x-pseudo-fs');
    const setIcon = (b, on) => {
      b.querySelector('svg').innerHTML = on ? ICON.fsExit : ICON.fsEnter;
      const t = on ? 'Keluar dari layar penuh' : 'Layar penuh';
      b.title = t; b.setAttribute('aria-label', t); b.setAttribute('aria-pressed', String(on));
    };
    // beri tahu renderer bahwa ukuran kontainer berubah
    const refit = () => {
      const fire = () => window.dispatchEvent(new Event('resize'));
      fire(); requestAnimationFrame(fire); setTimeout(fire, 150); setTimeout(fire, 400);
    };
    const btn = addSceneBtn(contId, {
      id: contId + 'Fs', title: 'Layar penuh', icon: ICON.fsEnter, pressed: false,
      onclick: () => {
        snd('click');
        if (isOn()) {
          if (cont.classList.contains('x-pseudo-fs')) { cont.classList.remove('x-pseudo-fs'); sync(); }
          else (doc.exitFullscreen || doc.webkitExitFullscreen).call(doc);
        } else if (canNative) {
          const req = cont.requestFullscreen || cont.webkitRequestFullscreen;
          const r = req.call(cont);
          if (r && r.catch) r.catch(() => { cont.classList.add('x-pseudo-fs'); sync(); });
        } else { cont.classList.add('x-pseudo-fs'); sync(); }
      }
    });
    if (!btn) return;
    const sync = () => { setIcon(btn, isOn()); refit(); };
    doc.addEventListener('fullscreenchange', sync);
    doc.addEventListener('webkitfullscreenchange', sync);
    doc.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && cont.classList.contains('x-pseudo-fs')) { cont.classList.remove('x-pseudo-fs'); sync(); }
    });
  }

  /* ---------------------------------------------------------- MODE TANTANGAN (umum) */
  function createChallenge(E, cfg) {
    const st = E.state, N = 5;
    let active = false, queue = [], idx = 0, score = 0, tries = 0, lock = false, hud = null, btn = null, prevLabels = true, timer = 0;
    const nameOf = (k) => (E.INFO[k] || [k])[0];
    const pool = () => cfg.pool.filter(k => E.INFO[k] && (st.showCond || !cfg.cond.includes(k)));
    const syncLabels = (v) => { st.showLabels = v; const b = $(cfg.labelBtn); if (b) b.setAttribute('aria-pressed', String(v)); };

    function paint(msg, cls) {
      if (!hud) return;
      hud.classList.remove('ok', 'bad'); void hud.offsetWidth; if (cls) hud.classList.add(cls);
      hud.innerHTML = `
        <div class="row sp"><b>Soal ${idx + 1} dari ${queue.length}</b><span>Skor: ${score}</span></div>
        <div style="margin:.4rem 0;font-size:.95rem">${msg || `Klik bagian: <b>${nameOf(queue[idx])}</b>`}</div>
        <div class="row"><button type="button" data-a="skip">Lewati</button><button type="button" data-a="stop">Selesai</button></div>`;
      hud.querySelector('[data-a=skip]').onclick = () => { if (!lock) advance(); };
      hud.querySelector('[data-a=stop]').onclick = () => stop(false);
    }

    function start() {
      if (E._x && E._x.stopTour) E._x.stopTour();
      const p = pool();
      queue = (typeof Utils !== 'undefined' ? Utils.shuffle(p) : p).slice(0, N);
      if (!queue.length) return;
      idx = 0; score = 0; tries = 0; lock = false; active = true;
      E.clearSelection();
      prevLabels = st.showLabels; syncLabels(false);
      const ov = $(cfg.sceneId).querySelector('.scene-overlay'); if (ov) ov.style.display = 'none';
      hud = mkHud(cfg.sceneId, 'top'); paint();
      if (btn) btn.setAttribute('aria-pressed', 'true');
      snd('info');
    }

    function stop(done) {
      clearTimeout(timer);
      if (!active) return;
      active = false; lock = false;
      if (hud) { hud.remove(); hud = null; }
      syncLabels(prevLabels);
      const ov = $(cfg.sceneId).querySelector('.scene-overlay'); if (ov) ov.style.display = '';
      if (btn) btn.setAttribute('aria-pressed', 'false');
      E.clearSelection();
      if (done) {
        record(cfg.exp, 'Tantangan kenali struktur', `${score} dari ${queue.length} benar`);
        const text = `Skormu ${score} dari ${queue.length}. ${score === queue.length ? 'Sempurna!' : 'Coba lagi untuk memperbaiki skor.'}`;
        try { Utils.modal({ emoji: score >= 4 ? '🏆' : '💪', title: 'Tantangan selesai!', text }); } catch (e) { toast(text, 'success'); }
      }
    }

    function advance() {
      clearTimeout(timer);
      E.clearSelection();
      idx++; tries = 0; lock = false;
      if (idx >= queue.length) stop(true); else paint();
    }

    function answer(key) {
      if (!active || lock) return;
      const target = queue[idx];
      if (key === target) {
        if (tries === 0) score++;
        lock = true; snd('success');
        paint(`✔ Benar! Itu <b>${nameOf(key)}</b>.`, 'ok');
        timer = setTimeout(advance, 1500);
      } else {
        tries++; snd('error');
        if (tries >= 2) {
          lock = true;
          paint(`✖ Itu <b>${nameOf(key)}</b>. Jawabannya: <b>${nameOf(target)}</b> (lihat yang menyala).`, 'bad');
          E.select(target);
          timer = setTimeout(advance, 2400);
        } else {
          paint(`✖ Itu <b>${nameOf(key)}</b>. Coba cari: <b>${nameOf(target)}</b>.`, 'bad');
        }
      }
    }

    const origSelect = E.select;
    E.select = function (key, noFocus) {
      const r = origSelect.call(this, key, noFocus);
      answer(key);
      return r;
    };

    btn = addSceneBtn(cfg.sceneId, {
      id: cfg.btnId, title: 'Mode tantangan: kenali struktur', icon: ICON.quiz,
      onclick: () => { snd('click'); active ? stop(false) : start(); }
    });
    E._x = E._x || {};
    E._x.stopChallenge = () => stop(false);
  }

  /* ============================================================
     JANTUNG
     ============================================================ */
  const HEART_STEPS = [
    { key: 'svc', text: 'Darah miskin O₂ dari seluruh tubuh dialirkan vena kava superior dan inferior menuju jantung.' },
    { key: 'ra', text: 'Serambi kanan menampung darah miskin O₂. Nodus SA di dindingnya mengirim impuls listrik yang memicu setiap detak.' },
    { key: 'tri', text: 'Katup trikuspid terbuka: darah mengalir dari serambi kanan ke bilik kanan.' },
    { key: 'rv', text: 'Bilik kanan berkontraksi dan memompa darah ke paru-paru. Dindingnya lebih tipis karena tekanan di paru-paru rendah.' },
    { key: 'pov', text: 'Katup pulmonal terbuka saat bilik kanan memompa, lalu menutup agar darah tidak kembali ke bilik.' },
    { key: 'pulm', text: 'Arteri pulmonalis membawa darah miskin O₂ ke paru-paru. Di sana terjadi pertukaran gas.' },
    { key: 'pv', text: 'Vena pulmonalis membawa darah kaya O₂ dari paru-paru kembali ke jantung.' },
    { key: 'la', text: 'Serambi kiri menampung darah kaya O₂, lalu mengalirkannya ke bilik kiri.' },
    { key: 'mitral', text: 'Katup mitral (bikuspid) terbuka saat bilik relaks dan menutup rapat saat bilik kiri berkontraksi.' },
    { key: 'lv', text: 'Bilik kiri berdinding paling tebal karena harus memompa darah ke seluruh tubuh melawan tekanan tinggi.' },
    { key: 'aov', text: 'Katup aorta terbuka saat bilik kiri berkontraksi dan menutup saat relaksasi.' },
    { key: 'aorta', text: 'Aorta mengedarkan darah kaya O₂ ke seluruh tubuh, termasuk ke otot jantung lewat arteri koroner. Perjalanan selesai!' }
  ];

  function heartTour(E) {
    const st = E.state, kit = st.kit, sc = st.scene, T = THREE, info = $('heartClickInfo');
    let active = false, i = 0, hud = null, goal = null, followUntil = 0, btn = null;

    const center = (key, all) => {
      const arr = kit.clickables.filter(o => o.userData.key === key);
      if (!arr.length) return new T.Vector3();
      const list = all ? arr : [arr[0]], v = new T.Vector3(), c = new T.Vector3();
      list.forEach(o => { new T.Box3().setFromObject(o).getCenter(c); v.add(c); });
      return v.multiplyScalar(1 / list.length);
    };
    const target = (key) => {
      if (key === 'rv') return kit.frame.localToWorld(new T.Vector3(-0.4, -0.35, 0.55));
      if (key === 'lv') return kit.anchors.lvL ? kit.anchors.lvL.getWorldPosition(new T.Vector3()) : center('vent');
      return center(key, ['tri', 'mitral', 'aov', 'pov', 'pv'].includes(key));
    };

    function show() {
      const s = HEART_STEPS[i];
      E.select(s.key, true);
      if (info) info.classList.remove('show');         // teks tur ditampilkan di panel bawah
      goal = target(s.key); followUntil = performance.now() + 2600;
      const name = (E.INFO[s.key] || [s.key])[0];
      hud.innerHTML = `
        <div class="row sp"><b>Langkah ${i + 1} dari ${HEART_STEPS.length}</b><span>${name}</span></div>
        <div style="margin:.4rem 0">${s.text}</div>
        <div class="row"><button type="button" data-a="prev" ${i === 0 ? 'disabled' : ''}>◀ Sebelumnya</button>
        <button type="button" class="pri" data-a="next">${i === HEART_STEPS.length - 1 ? 'Selesai' : 'Lanjut ▶'}</button>
        <button type="button" data-a="stop">Keluar</button></div>`;
      hud.querySelector('[data-a=prev]').onclick = () => { if (i > 0) { i--; show(); } };
      hud.querySelector('[data-a=next]').onclick = () => { if (i < HEART_STEPS.length - 1) { i++; show(); } else stop(true); };
      hud.querySelector('[data-a=stop]').onclick = () => stop(false);
    }
    function start() {
      if (E._x && E._x.stopChallenge) E._x.stopChallenge();
      active = true; i = 0; E.clearSelection();
      hud = mkHud('heartScene', 'bottom'); show();
      if (btn) btn.setAttribute('aria-pressed', 'true');
    }
    function stop(done) {
      if (!active) return;
      active = false; goal = null;
      if (hud) { hud.remove(); hud = null; }
      if (btn) btn.setAttribute('aria-pressed', 'false');
      E.clearSelection();
      if (done) { toast('Tur selesai! Coba Mode Tantangan untuk menguji ingatanmu.', 'success'); record('heart', 'Tur aliran darah', 'Selesai (12 langkah)'); }
    }
    btn = addSceneBtn('heartScene', { id: 'btnHeartTour', title: 'Tur berpemandu aliran darah', icon: ICON.tour, onclick: () => { snd('click'); active ? stop(false) : start(); } });
    E._x = E._x || {}; E._x.stopTour = () => stop(false);

    sc.addAnimation(() => {
      if (!active || !goal || performance.now() > followUntil) return;
      const c = sc.controls, cam = sc.camera;
      c.target.lerp(goal, 0.08);
      const off = cam.position.clone().sub(c.target), d = off.length();
      off.setLength(d + (6.4 - d) * 0.05);
      cam.position.copy(c.target).add(off);
    });
  }

  function heartInfarct(E) {
    const st = E.state, kit = st.kit, sc = st.scene, T = THREE, V = (x, y, z) => new T.Vector3(x, y, z);
    const lad = kit.clickables.find(o => o.userData.key === 'lad'), vent = kit.clickables.find(o => o.userData.key === 'vent');
    if (!lad || !vent || typeof HeartKit === 'undefined') return;
    const corGroup = lad.parent, ventMat = vent.material, ventBase = ventMat.color.getHex();

    E.INFO.plaque = ['Plak Aterosklerosis (Penyumbatan Arteri Koroner)',
      'Timbunan lemak, kolesterol, dan kalsium pada dinding arteri koroner menyempitkan pembuluh sehingga aliran darah ke otot jantung berkurang. Area otot yang kekurangan O₂ (tampak gelap) mengalami <i>iskemia</i> dan bisa mati — inilah serangan jantung (infark miokardium). Pada EKG, segmen ST sering tampak naik. Nyeri dada adalah tanda bahaya yang perlu segera diperiksakan.'];

    const surf = (t) => {
      const v = V(0.24 + 0.1 * t, 0.55 - 1.52 * t, 0); v.z = Math.sqrt(Math.max(0.02, 1 - v.x * v.x - v.y * v.y));
      const n = v.clone().normalize();
      return { p: HeartKit.vp(n.x, n.y, n.z, 1, 1).multiplyScalar(1.02), n };
    };

    const a = surf(0.3);
    const plaqueMat = new T.MeshPhysicalMaterial({ color: 0xe6c25a, roughness: 0.4, clearcoat: 0.8, emissive: 0x6a4a00, emissiveIntensity: 0.35 });
    const plaque = new T.Mesh(new T.SphereGeometry(0.085, 24, 16), plaqueMat);
    plaque.scale.set(1, 1.5, 1); plaque.position.copy(a.p); plaque.visible = false;
    plaque.userData = { key: 'plaque', priority: 2.5, dissectable: true };
    corGroup.add(plaque);

    const b = surf(0.62);
    const zoneMat = new T.MeshBasicMaterial({ color: 0x2a0716, transparent: true, opacity: 0.5, depthWrite: false });
    const zone = new T.Mesh(new T.SphereGeometry(1, 32, 20), zoneMat);
    zone.scale.set(0.5, 0.62, 0.12);
    zone.position.copy(b.p).multiplyScalar(0.97);
    zone.quaternion.setFromUnitVectors(V(0, 0, 1), b.n);
    zone.renderOrder = 6; zone.visible = false;
    kit.frame.add(zone);
    const zOff = V(0, -0.32, -0.18);   // ikut bergeser bersama dinding bilik saat Urai Struktur
    kit.explodables.push({ obj: zone, basePos: zone.position.clone(), targetPos: zone.position.clone().add(zOff), offset: zOff });
    kit.dissectables.push(plaqueMat, zoneMat);

    // EKG: segmen ST naik saat infark
    const origEcg = E.ecgValue;
    E.ecgValue = function (ph) {
      let v = origEcg.call(this, ph);
      if (this.state.infarct) v += 0.2 * (S(0.215, 0.25, ph) - S(0.37, 0.43, ph));
      return v;
    };

    const btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'btn btn-primary'; btn.id = 'btnHeartInfarct';
    btn.textContent = 'Simulasikan penyumbatan koroner';
    const reset = $('btnResetHeart');
    if (reset && reset.parentElement) reset.parentElement.insertBefore(btn, reset);

    function setInfarct(on) {
      st.infarct = on; plaque.visible = on; zone.visible = on;
      const i = kit.clickables.indexOf(plaque);          // raycaster tidak memeriksa .visible
      if (on && i < 0) kit.clickables.push(plaque);
      if (!on && i >= 0) kit.clickables.splice(i, 1);
      ventMat.color.setHex(on ? 0xb8697f : ventBase);
      btn.textContent = on ? 'Pulihkan aliran koroner' : 'Simulasikan penyumbatan koroner';
      if (on) btn.classList.replace('btn-primary', 'btn-secondary'); else btn.classList.replace('btn-secondary', 'btn-primary');
      if (on) {
        E.select('plaque', true);
        toast('Aliran ke otot jantung terhambat. Perhatikan area gelap dan segmen ST pada EKG.', 'info');
        record('heart', 'Penyumbatan arteri koroner', st.bpm + ' BPM, ST naik');
      } else if (st.selectedChamber === 'plaque') E.clearSelection();
    }
    btn.onclick = () => { snd('click'); setInfarct(!st.infarct); };
    if (reset) { const o = reset.onclick; reset.onclick = function (e) { if (o) o.call(this, e); setInfarct(false); }; }

    sc.addAnimation((el) => { if (st.infarct) zoneMat.opacity = 0.46 + 0.12 * Math.sin(el * 4); });
  }

  function attachHeart(E) {
    injectStyle();
    E._x = E._x || {};
    document.querySelectorAll('#heartScene .scene-controls [id*="ireframe"]').forEach(b => b.remove());
    heartTour(E);
    sceneFullscreen('heartScene');
    heartCells(E);
    heartInfarct(E);
    zoomInside(E);
    createChallenge(E, {
      sceneId: 'heartScene', labelBtn: 'btnLabels', btnId: 'btnHeartChallenge', exp: 'heart',
      pool: ['lv', 'rv', 'ra', 'la', 'aorta', 'pulm', 'svc', 'ivc', 'pv', 'mitral', 'tri', 'aov', 'pov', 'sa', 'av', 'his'],
      cond: ['sa', 'av', 'his', 'lbb', 'rbb']
    });
  }

  /* ============================================================
     PARU-PARU
     ============================================================ */
  function buildRibCage(kit) {
    const T = THREE, V = (x, y, z) => new T.Vector3(x, y, z), g = new T.Group();
    const bone = new T.MeshPhysicalMaterial({ color: 0xe9dcc0, roughness: 0.5, clearcoat: 0.4, transparent: true, opacity: 0.6, depthWrite: false, envMapIntensity: 0.8 });
    const solidBone = new T.MeshPhysicalMaterial({ color: 0xdccfb0, roughness: 0.55, clearcoat: 0.3 });
    const parts = [];
    const add = (mesh, mat) => { mesh.userData = { key: 'ribs', priority: 1.0, dissectable: true }; mesh.renderOrder = 3; g.add(mesh); parts.push(mesh); return mesh; };

    const ys = [1.25, 0.9, 0.55, 0.2, -0.15, -0.5, -0.85, -1.15];
    const A = (y) => 1.7 + 0.65 * S(1.3, -0.2, y) - 0.15 * S(-0.6, -1.3, y);   // setengah lebar, menyesuaikan bentuk paru
    ys.forEach((y0) => [-1, 1].forEach((side) => {
      const a = A(y0), pts = [], n = 16;
      for (let k = 0; k <= n; k++) {
        const f = k / n, phi = f * Math.PI;
        pts.push(V(side * (0.2 + (a - 0.2) * Math.sin(phi)), y0 - 0.4 * f + 0.05 * Math.sin(phi), -1.2 * Math.cos(phi)));
      }
      add(new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts), 44, 0.034, 8, false), bone));
    }));
    const sternum = add(new T.Mesh(new T.BoxGeometry(0.55, 2.2, 0.12), bone));
    sternum.position.set(0, 0.0, 1.22);
    for (let k = 0; k < 10; k++) {
      const v = add(new T.Mesh(new T.CylinderGeometry(0.13, 0.13, 0.22, 16), solidBone));
      v.position.set(0, 1.45 - k * 0.31, -1.22);
    }
    g.visible = false;
    kit.frame.add(g);
    return { group: g, parts, mats: [bone, solidBone], bone };
  }

  function lungsRibs(E) {
    const st = E.state, kit = st.kit, sc = st.scene;
    E.INFO.ribs = ['Rangka Dada: Tulang Rusuk, Sternum & Tulang Belakang',
      'Rongga dada dibentuk oleh tulang rusuk, tulang dada (sternum), dan ruas tulang belakang (model ini menampilkan 8 pasang rusuk). Saat <b>inspirasi</b>, otot interkostal eksternal dan diafragma berkontraksi: rusuk terangkat ke atas dan ke luar, volume rongga dada membesar, tekanan di paru-paru turun, lalu udara masuk. Saat <b>ekspirasi</b>, rusuk turun kembali.'];
    const rc = buildRibCage(kit);
    rc.mats.forEach(m => kit.dissectables.push(m));
    let on = false, clickable = false;
    const setClickable = (f) => {
      if (f === clickable) return; clickable = f;
      rc.parts.forEach(p => { const i = kit.clickables.indexOf(p); if (f && i < 0) kit.clickables.push(p); if (!f && i >= 0) kit.clickables.splice(i, 1); });
    };
    const btn = addSceneBtn('lungsScene', {
      id: 'btnLungsRibs', title: 'Tampilkan rangka dada', icon: ICON.ribs, pressed: false,
      onclick: () => {
        on = !on; btn.setAttribute('aria-pressed', String(on)); snd('click');
        if (on) { E.select('ribs', true); toast('Rangka dada tampil. Perhatikan rusuk terangkat saat paru-paru mengembang.', 'info'); }
        else if (st.selectedPart === 'ribs') E.clearSelection();
      }
    });
    sc.addAnimation(() => {
      const ph = st.phase, breath = S(0.02, 0.42, ph) - S(0.44, 0.88, ph);
      const strength = (st.depth / 100) * (st.type === 'normal' ? 0.65 : st.type === 'dalam' ? 0.88 : 1.15) * (st.smokeFactor || 1), e = breath * strength;
      const f = 1 - st.explode;                         // memudar saat Urai Struktur
      rc.group.scale.set(1 + 0.03 * e, 1, 1 + 0.035 * e);
      rc.group.position.y = 0.07 * e;
      rc.bone.opacity = 0.6 * f;
      const vis = on && f > 0.03;
      rc.group.visible = vis; setClickable(vis);
    });
  }

  /* ============================================================
     PARTIKEL REALISTIS
     Jantung: eritrosit bikonkaf (rumus Evans-Fung), leukosit, trombosit.
     Paru   : molekul O2 (2 atom) & CO2 (3 atom) yang mengikuti napas.
     ============================================================ */
  const makeRnd = (seed) => { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; };

  function rbcGeometry(R) {
    const T = THREE, k = R / 3.91, pts = [], N = 28;
    const half = (rho) => 0.5 * 3.91 * Math.sqrt(Math.max(0, 1 - rho * rho)) * (0.207161 + 2.002558 * rho * rho - 1.122762 * Math.pow(rho, 4)) * k;
    for (let i = 0; i <= N; i++) { const rho = Math.sin(i / N * Math.PI / 2); pts.push(new T.Vector2(rho * R, -half(rho))); }
    for (let i = N - 1; i >= 0; i--) { const rho = Math.sin(i / N * Math.PI / 2); pts.push(new T.Vector2(rho * R, half(rho))); }
    return new T.LatheGeometry(pts, 24);
  }

  function atomsGeometry(atoms) {
    const T = THREE, pos = [], nor = [], col = [], idx = [];
    let base = 0;
    atoms.forEach((a) => {
      const g = new T.SphereGeometry(a.r, 12, 9), p = g.attributes.position, n = g.attributes.normal, c = new T.Color(a.c);
      for (let i = 0; i < p.count; i++) {
        pos.push(p.getX(i) + a.p[0], p.getY(i) + a.p[1], p.getZ(i) + a.p[2]);
        nor.push(n.getX(i), n.getY(i), n.getZ(i)); col.push(c.r, c.g, c.b);
      }
      const ix = g.index.array;
      for (let i = 0; i < ix.length; i++) idx.push(ix[i] + base);
      base += p.count; g.dispose();
    });
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    geo.setAttribute('normal', new T.Float32BufferAttribute(nor, 3));
    geo.setAttribute('color', new T.Float32BufferAttribute(col, 3));
    geo.setIndex(idx);
    return geo;
  }

  function particleLegend(afterEl, title, chipsHtml, onToggle) {
    const card = document.createElement('div');
    card.className = 'x-card';
    card.innerHTML = `<h4>${title}</h4><div class="x-chips">${chipsHtml}</div>
      <div class="x-row" style="margin-top:.65rem"><span style="font-size:.74rem">Gaya tampilan partikel</span>
      <button type="button" class="btn btn-secondary btn-sm" data-a="mode">Titik cahaya</button></div>`;
    afterEl.after(card);
    const b = card.querySelector('[data-a=mode]');
    let realistic = true;
    b.onclick = () => { realistic = !realistic; b.textContent = realistic ? 'Titik cahaya' : 'Realistis'; snd('click'); onToggle(realistic); };
    return card;
  }

  function heartCells(E) {
    const st = E.state, kit = st.kit, sc = st.scene, T = THREE, rnd = makeRnd(7331);
    const group = new T.Group(); kit.root.add(group);
    const items = [];
    const mat = (o) => new T.MeshPhysicalMaterial(Object.assign({ roughness: 0.4, clearcoat: 0.5, clearcoatRoughness: 0.35, envMapIntensity: 0.9, side: T.DoubleSide }, o));
    const make = (geo, material, n, size) => {
      const mesh = new T.InstancedMesh(geo, material, n);
      mesh.instanceMatrix.setUsage(T.DynamicDrawUsage); mesh.frustumCulled = false;
      group.add(mesh);
      for (let i = 0; i < n; i++) {
        const pi = i % 4, ang = rnd() * Math.PI * 2, rr = Math.sqrt(rnd()) * size.spread;
        items.push({ mesh, i, path: kit.paths[pi], deoxy: pi < 2, t: rnd(), v: 0.75 + rnd() * 0.5,
          ox: Math.cos(ang) * rr, oy: Math.sin(ang) * rr, a0: rnd() * 6.283, ar: (rnd() - 0.5) * 3,
          sc: size.min + rnd() * (size.max - size.min), lam: 1 - 0.5 * Math.pow(rr / size.spread, 2) });
      }
      kit.dissectables.push(material);
      return mesh;
    };

    // eritrosit: bentuk cakram bikonkaf; merah cerah = kaya O2, merah tua keunguan = miskin O2
    const rbc = make(rbcGeometry(0.06), mat({ color: 0xffffff, emissive: 0x2a0505 }), 340, { spread: 0.1, min: 0.85, max: 1.15 });
    const OXY = new T.Color(0xe3262b), DEOXY = new T.Color(0x8e1f33), tc = new T.Color();
    items.forEach((it) => { if (it.mesh === rbc) { tc.copy(it.deoxy ? DEOXY : OXY).multiplyScalar(0.88 + rnd() * 0.24); rbc.setColorAt(it.i, tc); } });
    rbc.instanceColor.needsUpdate = true;

    // leukosit: bola putih bergerigi halus
    const wGeo = new T.SphereGeometry(0.08, 24, 16), wp = wGeo.attributes.position;
    for (let i = 0; i < wp.count; i++) {
      const x = wp.getX(i), y = wp.getY(i), z = wp.getZ(i), n = 1 + 0.09 * Math.sin(x * 43) * Math.cos(y * 37 + 1) * Math.sin(z * 41 + 2);
      wp.setXYZ(i, x * n, y * n, z * n);
    }
    wGeo.computeVertexNormals();
    make(wGeo, mat({ color: 0xe9e2d2, roughness: 0.65, clearcoat: 0.2 }), 10, { spread: 0.12, min: 0.9, max: 1.2 });

    // trombosit: kepingan kecil
    const pGeo = new T.SphereGeometry(0.03, 10, 8); pGeo.scale(1, 0.4, 1);
    make(pGeo, mat({ color: 0xcaa7b8, roughness: 0.6 }), 50, { spread: 0.12, min: 0.9, max: 1.3 });

    // simpan partikel titik cahaya lama agar bisa dipakai lagi lewat tombol gaya tampilan
    const oldParticles = st.particles.slice();
    st.particles.length = 0;
    let realistic = true;
    const legend = particleLegend($('heartEcg').closest('.control-group'),
      'Partikel dalam darah',
      `<span class="x-chip"><i style="color:#e3262b;font-style:normal">●</i> Eritrosit kaya O₂</span>
       <span class="x-chip"><i style="color:#8e1f33;font-style:normal">●</i> Eritrosit miskin O₂</span>
       <span class="x-chip"><i style="color:#e9e2d2;font-style:normal">●</i> Leukosit</span>
       <span class="x-chip"><i style="color:#caa7b8;font-style:normal">●</i> Trombosit</span>`,
      (v) => { realistic = v; st.particles.length = 0; if (!v) oldParticles.forEach(p => st.particles.push(p)); });
    legend.id = 'xHeartLegend';

    const P0 = new T.Vector3(), P1 = new T.Vector3(), Tn = new T.Vector3(), N = new T.Vector3(), B = new T.Vector3(),
      ref = new T.Vector3(), ax = new T.Vector3(), Z = new T.Vector3(), pos = new T.Vector3(), M = new T.Matrix4(), S3 = new T.Vector3();
    let last = 0;
    sc.addAnimation((el) => {
      const dt = Math.min(0.1, Math.max(0, el - last)); last = el;
      st.bloodParticles.visible = !realistic;
      group.visible = realistic && st.explode < 0.05;       // jalur tidak ikut terurai, jadi disembunyikan saat Urai Struktur
      if (!group.visible) return;
      const ph = st.phase, pulse = S(0.24, 0.34, ph) - S(0.55, 0.7, ph);
      const base = dt * 0.1 * (st.bpm / 75) * (0.75 + 0.75 * pulse);
      for (let k = 0; k < items.length; k++) {
        const it = items[k];
        it.t = (it.t + base * it.v * it.lam) % 1;
        const tt = Math.min(it.t, 0.994);
        it.path.curve.getPoint(tt, P0); it.path.curve.getPoint(tt + 0.005, P1);
        Tn.subVectors(P1, P0).normalize();
        ref.set(0, 1, 0); if (Math.abs(Tn.y) > 0.9) ref.set(1, 0, 0);
        N.crossVectors(ref, Tn).normalize(); B.crossVectors(Tn, N);
        pos.copy(P0).addScaledVector(N, it.ox).addScaledVector(B, it.oy);
        const a = it.a0 + el * it.ar;
        ax.copy(N).multiplyScalar(Math.cos(a)).addScaledVector(B, Math.sin(a));   // sumbu cakram berputar sambil mengalir
        Z.crossVectors(Tn, ax);
        const s = it.sc * Math.min(1, it.t / 0.03, (1 - it.t) / 0.03);
        M.makeBasis(Tn, ax, Z); M.scale(S3.set(s, s, s)); M.setPosition(pos);
        it.mesh.setMatrixAt(it.i, M);
      }
      group.children.forEach(m => { m.instanceMatrix.needsUpdate = true; });
    });
  }

  function lungsMolecules(E, afterEl) {
    const st = E.state, kit = st.kit, sc = st.scene, T = THREE, rnd = makeRnd(4242);
    const group = new T.Group(); kit.frame.add(group);          // sama dengan sistem koordinat saluran napas
    const o2Geo = atomsGeometry([{ p: [-0.045, 0, 0], r: 0.042, c: 0x59b6ff }, { p: [0.045, 0, 0], r: 0.042, c: 0x59b6ff }]);
    const co2Geo = atomsGeometry([{ p: [0, 0, 0], r: 0.034, c: 0x4a5160 }, { p: [-0.095, 0, 0], r: 0.042, c: 0xff4538 }, { p: [0.095, 0, 0], r: 0.042, c: 0xff4538 }]);
    const mat = new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.3, metalness: 0.05, emissive: 0x1b2432, emissiveIntensity: 0.6 });
    kit.dissectables.push(mat);
    const items = [];
    const make = (geo, n, pathIds, kind) => {
      const mesh = new T.InstancedMesh(geo, mat, n);
      mesh.instanceMatrix.setUsage(T.DynamicDrawUsage); mesh.frustumCulled = false; group.add(mesh);
      for (let i = 0; i < n; i++) {
        const ang = rnd() * 6.283, rr = Math.sqrt(rnd()) * 0.05;
        items.push({ mesh, i, kind, path: kit.paths[pathIds[i % pathIds.length]], t: rnd(), v: 0.8 + rnd() * 0.4,
          ox: Math.cos(ang) * rr, oy: Math.sin(ang) * rr, r0: [rnd() * 6.28, rnd() * 6.28, rnd() * 6.28], w: [0.6 + rnd() * 1.4, 0.6 + rnd() * 1.4], ph: rnd() * 6.28 });
      }
    };
    make(o2Geo, 90, [0, 1, 2, 3], 'o2');      // O2: masuk saat inspirasi
    make(co2Geo, 60, [4, 5], 'co2');          // CO2: keluar saat ekspirasi

    const oldParticles = st.particles.slice();
    st.particles.length = 0;
    let realistic = true;
    particleLegend(afterEl || document.querySelector('#panelLungs .stat-grid'),
      'Molekul udara',
      `<span class="x-chip"><i style="color:#59b6ff;font-style:normal">●●</i> O₂ (masuk saat inspirasi)</span>
       <span class="x-chip"><i style="color:#ff4538;font-style:normal">●</i><i style="color:#4a5160;font-style:normal">●</i><i style="color:#ff4538;font-style:normal">●</i> CO₂ (keluar saat ekspirasi)</span>`,
      (v) => { realistic = v; st.particles.length = 0; if (!v) oldParticles.forEach(p => st.particles.push(p)); });

    const P0 = new T.Vector3(), P1 = new T.Vector3(), Tn = new T.Vector3(), N = new T.Vector3(), B = new T.Vector3(),
      ref = new T.Vector3(), pos = new T.Vector3(), M = new T.Matrix4(), S3 = new T.Vector3(), eu = new T.Euler();
    let last = 0;
    sc.addAnimation((el) => {
      const dt = Math.min(0.1, Math.max(0, el - last)); last = el;
      if (st.airParticles) st.airParticles.visible = !realistic && st.showCond;
      group.visible = realistic && st.showCond && st.explode < 0.05;
      if (!group.visible) return;
      const ph = st.phase;
      const wi = ph > 0.02 && ph < 0.44 ? Math.sin(Math.PI * (ph - 0.02) / 0.42) : 0;
      const wo = ph > 0.44 && ph < 0.88 ? Math.sin(Math.PI * (ph - 0.44) / 0.44) : 0;
      const strength = (st.depth / 100) * (st.type === 'normal' ? 0.65 : st.type === 'dalam' ? 0.88 : 1.15) * (st.smokeFactor || 1);
      const dph = dt * st.rpm / 60, sF = 0.4 + 0.6 * Math.min(1, strength);
      for (let k = 0; k < items.length; k++) {
        const it = items[k], o2 = it.kind === 'o2';
        it.t += dph * 2.6 * (o2 ? wi : wo) * sF * it.v;
        if (it.t >= 1) it.t = 0;
        const tt = Math.min(it.t, 0.994);
        it.path.curve.getPoint(tt, P0); it.path.curve.getPoint(tt + 0.005, P1);
        Tn.subVectors(P1, P0).normalize();
        ref.set(0, 1, 0); if (Math.abs(Tn.y) > 0.9) ref.set(1, 0, 0);
        N.crossVectors(ref, Tn).normalize(); B.crossVectors(Tn, N);
        const jx = 0.012 * Math.sin(el * 3 + it.ph), jy = 0.012 * Math.cos(el * 2.3 + it.ph);   // gerak acak halus
        pos.copy(P0).addScaledVector(N, it.ox + jx).addScaledVector(B, it.oy + jy);
        // saluran menyempit menuju alveolus -> molekul mengecil agar tetap "muat"
        const narrow = o2 ? 1 - 0.6 * S(0.45, 0.75, it.t) : 0.4 + 0.6 * S(0.25, 0.55, it.t);
        const s = narrow * Math.min(1, it.t / 0.04, (1 - it.t) / 0.04);
        eu.set(it.r0[0] + el * it.w[0], it.r0[1] + el * it.w[1], it.r0[2]);
        M.makeRotationFromEuler(eu); M.scale(S3.set(s, s, s)); M.setPosition(pos);
        it.mesh.setMatrixAt(it.i, M);
      }
      group.children.forEach(m => { m.instanceMatrix.needsUpdate = true; });
    });
  }

  /* ============================================================
     ZOOM KE DALAM ORGAN
     Kamera boleh didekatkan sampai masuk ke dalam organ (gulir / cubit untuk zoom).
     Saat sangat dekat, dinding organ dibuat lebih pekat agar terasa seperti ruang di dalam.
     ============================================================ */
  function zoomInside(E) {
    const st = E.state, sc = st.scene, kit = st.kit, cam = sc.camera, ctl = sc.controls;
    if (!ctl || !cam) return;
    ctl.minDistance = 0.12;
    cam.near = 0.03; cam.updateProjectionMatrix();
    if ('zoomSpeed' in ctl) ctl.zoomSpeed = Math.max(ctl.zoomSpeed || 1, 1.2);
    const glass = (kit.glass || []).filter(m => m.userData && m.userData.minU);
    // rec.op / rec.mu = nilai "milik pengguna" (slider opasitas, tombol reset); w* = nilai terakhir yang kita tulis
    const rec = glass.map(m => ({ op: m.opacity, mu: m.userData.minU.value, wOp: m.opacity, wMu: m.userData.minU.value }));
    let k = 0;
    sc.addAnimation(() => {
      const d = cam.position.distanceTo(ctl.target);
      const goal = 1 - S(0.8, 2.6, d);                 // 0 = jauh, 1 = di dalam organ
      k += (goal - k) * 0.12;
      if (goal === 0 && k < 0.002) k = 0;
      glass.forEach((m, i) => {
        const r = rec[i], u = m.userData.minU;
        if (m.opacity !== r.wOp) r.op = m.opacity;     // slider/reset mengubah nilai -> jadikan acuan baru
        if (u.value !== r.wMu) r.mu = u.value;
        r.wOp = Math.min(1, r.op * (1 + 0.35 * k));
        r.wMu = r.mu + (0.8 - r.mu) * k;
        m.opacity = r.wOp; u.value = r.wMu;
      });
    });
  }

  function attachLungs(E) {
    injectStyle();
    E._x = E._x || {};
    lungsRibs(E);
    sceneFullscreen('lungsScene');
    lungsMolecules(E, document.querySelector('#panelLungs .stat-grid'));
    zoomInside(E);
    createChallenge(E, {
      sceneId: 'lungsScene', labelBtn: 'btnLungsLabels', btnId: 'btnLungsChallenge', exp: 'lungs',
      pool: ['larynx', 'trachea', 'carina', 'rbronch', 'lbronch', 'bronchiole', 'alveoli', 'rsup', 'rmid', 'rinf', 'lsup', 'linf', 'notch', 'pulmv', 'diaphragm'],
      cond: ['carina', 'bronchiole']
    });
  }

  /* ---------------------------------------------------------- pasang */
  if (typeof HeartExperiment !== 'undefined') wrapInit(HeartExperiment, attachHeart);
  if (typeof LungsExperiment !== 'undefined') wrapInit(LungsExperiment, attachLungs);
})();