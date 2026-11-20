/* ============================================================
   EXTRAS-3D.JS (v11.2 — Audio Pause Sync + Home Quality Selector +
   Pintasan Cepat di Viewport 3D, Mikroskop Difusi, & Isolasi Struktur)
   Cara pakai: muat SETELAH heart-3d.js & lungs-3d.js, SEBELUM app.js.
   Kompatibel 100% tanpa mengubah file HTML/kit/eksperimen lama.
   ============================================================ */
(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const S = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const snd = (fn) => { try { if (typeof Sound !== 'undefined' && typeof Sound[fn] === 'function') Sound[fn](); } catch (e) {} };
  const toast = (m, t = 'info') => { try { if (typeof Utils !== 'undefined') Utils.toast(m, t); } catch (e) {} };
  const record = (exp, condition, value) => { try { if (typeof Progress !== 'undefined') Progress.addData(exp, { condition, value }); } catch (e) {} };
  const makeRnd = (seed) => { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; };

  /* ---------------------------------------------------------- SINKRON SUARA SAAT JEDA */
  function patchBreathAudioPause() {
    if (typeof Sound === 'undefined' || Sound._xPausePatched) return;
    Sound._xPausePatched = true;
    const origUpdate = Sound.updateBreath;
    if (typeof origUpdate === 'function') {
      Sound.updateBreath = function (ph, strength, rpm) {
        const paused = this._simPaused || (
          typeof LungsExperiment !== 'undefined' &&
          LungsExperiment.state &&
          LungsExperiment.state.scene &&
          LungsExperiment.state.scene.paused
        );
        if (paused) {
          if (this.ctx && this._breathGain && this.ctx.state === 'running') {
            this._breathGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.025);
          }
          return;
        }
        return origUpdate.call(this, ph, strength, rpm);
      };
    }
  }
  patchBreathAudioPause();

  /* ---------------------------------------------------------- GAYA CSS */
  function injectStyle() {
    if ($('x3dStyle')) return;
    const s = document.createElement('style');
    s.id = 'x3dStyle';
    s.textContent = `
      .scene-container:fullscreen,.scene-container.x-pseudo-fs{width:100vw!important;height:100vh!important;height:100dvh!important;max-width:none!important;max-height:none!important;margin:0!important;border-radius:0!important}
      .scene-container:-webkit-full-screen{width:100vw!important;height:100vh!important;max-width:none!important;max-height:none!important;border-radius:0!important}
      .scene-container.x-pseudo-fs{position:fixed!important;inset:0;z-index:9999}

      /* Kartu legenda partikel di control panel */
      .x-card{margin-top:.85rem;padding:.75rem .85rem;border-radius:.85rem;background:rgba(127,127,127,.10);border:1px solid rgba(127,127,127,.22);font-size:.82rem;line-height:1.42}
      .x-card h4{margin:0 0 .45rem;font-size:.82rem;font-weight:700;display:flex;align-items:center;justify-content:space-between;gap:.4rem}
      .x-badge{display:inline-flex;align-items:center;gap:.3rem;padding:.14rem .52rem;border-radius:999px;font-size:.7rem;font-weight:700;background:rgba(56,189,248,.16);color:#38bdf8;border:1px solid rgba(56,189,248,.38)}
      .x-badge.warn{background:rgba(245,158,11,.18);color:#f59e0b;border-color:rgba(245,158,11,.45)}
      .x-badge.ok{background:rgba(34,197,94,.16);color:#22c55e;border-color:rgba(34,197,94,.42)}
      .x-chips{display:flex;flex-wrap:wrap;gap:.35rem;margin-top:.45rem}
      .x-chip{padding:.18rem .52rem;border-radius:999px;font-size:.71rem;background:rgba(127,127,127,.15);border:1px solid rgba(127,127,127,.25);transition:all .18s}
      .x-chip.on{background:rgba(34,197,94,.18);border-color:rgba(34,197,94,.55);color:#22c55e;font-weight:600}
      .x-chip.off{background:rgba(239,68,68,.14);border-color:rgba(239,68,68,.45);opacity:.85}
      .x-row{display:flex;justify-content:space-between;align-items:center;gap:.5rem;margin-top:.4rem}

      /* Bilah Pemilih Kualitas Grafis 3D di Menu Home (#homeScreen) */
      .x-home-gfx{
        flex:none;width:100%;margin-top:clamp(.75rem,2vh,1.25rem);
        padding:.68rem 1rem;border-radius:20px;
        background:var(--paper,#ffffff);color:var(--ink,#231a4a);
        border:2.5px solid var(--ink,#231a4a);
        box-shadow:5px 5px 0 var(--violet,#7c5cff);
        display:flex;align-items:center;justify-content:space-between;gap:.75rem;flex-wrap:wrap;
        text-align:left;position:relative;z-index:2;
      }
      .x-home-gfx-info{display:flex;align-items:center;gap:.65rem;min-width:0}
      .x-home-gfx-ico{
        width:36px;height:36px;flex:none;border-radius:50%;
        background:var(--violet-soft,#e6e0ff);color:var(--violet,#7c5cff);
        border:2px solid var(--ink,#231a4a);display:grid;place-items:center;
      }
      .x-home-gfx-title{font-family:var(--font-display,'Fredoka',sans-serif);font-size:1.02rem;font-weight:700;line-height:1.15;color:var(--ink,#231a4a)}
      .x-home-gfx-sub{font-size:.8rem;font-weight:600;color:var(--ink-2,#4a4170);line-height:1.3;margin-top:.1rem}
      .x-home-gfx-btns{display:flex;align-items:center;gap:.45rem;flex-wrap:wrap}
      .x-gfx-opt{
        display:inline-flex;align-items:center;gap:.35rem;
        padding:.42rem .88rem;border-radius:999px;
        border:2px solid var(--ink,#231a4a);
        background:var(--paper-2,#f6f3ff);color:var(--ink,#231a4a);
        font-family:var(--font-body,'Nunito',sans-serif);font-size:.84rem;font-weight:800;
        box-shadow:0 3px 0 var(--ink,#231a4a);cursor:pointer;
        transition:transform .1s,box-shadow .1s,background .15s;
      }
      .x-gfx-opt:hover{transform:translateY(-1px);box-shadow:0 4px 0 var(--ink,#231a4a);background:#ede9fe}
      .x-gfx-opt:active{transform:translateY(3px);box-shadow:none}
      .x-gfx-opt.active[data-q="high"]{background:var(--mint,#3ddc97);color:var(--ink,#231a4a)}
      .x-gfx-opt.active[data-q="medium"]{background:var(--sky,#4fb3ff);color:var(--ink,#231a4a)}
      .x-gfx-opt.active[data-q="low"]{background:var(--sun,#ffc93c);color:var(--ink,#231a4a)}
      .x-gfx-opt small{font-size:.72rem;font-weight:700;opacity:.82}

      @media (min-width:901px) and (min-height:560px){
        .x-home-gfx{margin-top:clamp(.45rem,1.3vh,.9rem);padding:.5rem .85rem}
        .x-home-gfx-ico{width:32px;height:32px}
        .x-home-gfx-title{font-size:.95rem}
        .x-home-gfx-sub{font-size:.75rem}
        .x-gfx-opt{padding:.34rem .75rem;font-size:.8rem}
      }
      @media (max-width:720px){
        .x-home-gfx{flex-direction:column;align-items:stretch;padding:.72rem .8rem;border-radius:18px;box-shadow:4px 4px 0 var(--violet,#7c5cff)}
        .x-home-gfx-btns{display:grid;grid-template-columns:repeat(3,1fr);gap:.4rem}
        .x-gfx-opt{justify-content:center;padding:.45rem .35rem;font-size:.78rem;text-align:center}
        .x-gfx-opt small{display:none}
      }

      /* Tombol aksi kontekstual di dalam kartu click-info (Isolasi Struktur & Mikroskop) */
      .x-info-actions{display:flex;gap:.4rem;flex-wrap:wrap;margin-top:.55rem}
      .x-info-btn{display:inline-flex;align-items:center;gap:.32rem;padding:.3rem .65rem;border-radius:.55rem;
        border:1px solid rgba(96,165,250,.48);background:rgba(37,99,235,.22);color:#e0f2fe;
        font:inherit;font-size:.74rem;font-weight:600;cursor:pointer;transition:all .16s}
      .x-info-btn:hover{background:rgba(37,99,235,.45);border-color:#93c5fd;color:#fff}
      .x-info-btn.on{background:#2563eb;border-color:#93c5fd;color:#fff;box-shadow:0 0 12px rgba(59,130,246,.45)}
      .x-info-btn.micro{border-color:rgba(45,212,191,.5);background:rgba(13,148,136,.24);color:#ccfbf1}
      .x-info-btn.micro:hover{background:rgba(13,148,136,.48);border-color:#5eead4;color:#fff}

      /* HUD Tur, Tantangan, Isolasi & Mikroskop */
      .x-hud{position:absolute;left:50%;transform:translateX(-50%);z-index:58;width:max-content;max-width:min(560px,calc(100% - 7.5rem));
        padding:.65rem .9rem;border-radius:.95rem;background:rgba(10,14,26,.88);color:#f8fafc;border:1px solid rgba(255,255,255,.2);
        backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);font-size:.84rem;line-height:1.45;box-shadow:0 10px 30px rgba(0,0,0,.5);transition:border-color .2s,box-shadow .2s}
      .x-hud.top{top:.75rem}.x-hud.bottom{bottom:.75rem}
      .x-hud .row{display:flex;gap:.45rem;align-items:center;flex-wrap:wrap}
      .x-hud .sp{justify-content:space-between}
      .x-hud button{padding:.3rem .72rem;border-radius:.6rem;border:1px solid rgba(255,255,255,.28);background:rgba(255,255,255,.08);color:inherit;cursor:pointer;font:inherit;font-size:.78rem;transition:all .15s}
      .x-hud button:hover{background:rgba(255,255,255,.2)}
      .x-hud button:disabled{opacity:.38;cursor:default}
      .x-hud button.pri{background:#2563eb;border-color:#60a5fa}
      .x-hud button.teal{background:#0d9488;border-color:#5eead4}
      .x-hud.ok{border-color:#22c55e;box-shadow:0 0 0 2px rgba(34,197,94,.35),0 10px 30px rgba(0,0,0,.5)}
      .x-hud.bad{border-color:#ef4444;animation:xShake .35s}
      .x-prog{height:4px;border-radius:999px;background:rgba(255,255,255,.14);overflow:hidden;margin:.4rem 0 .25rem}
      .x-prog>i{display:block;height:100%;background:linear-gradient(90deg,#38bdf8,#60a5fa);transition:width .25s ease}
      .x-dots{display:flex;gap:5px;align-items:center}
      .x-dot{width:8px;height:8px;border-radius:50%;background:rgba(255,255,255,.22)}
      .x-dot.cur{background:#38bdf8;box-shadow:0 0 8px #38bdf8}
      .x-dot.ok{background:#22c55e}
      .x-dot.bad{background:#ef4444}
      @keyframes xShake{0%,100%{transform:translateX(-50%)}25%{transform:translateX(calc(-50% - 7px))}75%{transform:translateX(calc(-50% + 7px))}}

      /* Banner status Isolasi Struktur di atas kanvas */
      .x-iso-banner{position:absolute;top:.75rem;left:50%;transform:translateX(-50%);z-index:56;
        display:flex;align-items:center;gap:.55rem;padding:.38rem .75rem;border-radius:999px;
        background:rgba(15,23,42,.88);color:#f8fafc;border:1px solid rgba(96,165,250,.55);
        backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);font-size:.76rem;box-shadow:0 6px 20px rgba(0,0,0,.4)}
      .x-iso-banner button{padding:.2rem .55rem;border-radius:999px;border:1px solid rgba(255,255,255,.28);
        background:rgba(37,99,235,.8);color:#fff;font:inherit;font-size:.72rem;font-weight:600;cursor:pointer}
      .x-iso-banner button:hover{background:#3b82f6}

      /* Bilah kontrol cepat 3D (termasuk pintasan kecil kualitas grafis) */
      .x-dock{position:absolute;left:.75rem;bottom:.75rem;z-index:52;display:flex;align-items:center;gap:.3rem;flex-wrap:wrap;
        max-width:calc(100% - 5.5rem);padding:.32rem .42rem;border-radius:999px;
        background:rgba(10,14,26,.78);border:1px solid rgba(255,255,255,.16);
        backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);box-shadow:0 6px 20px rgba(0,0,0,.38);
        transition:opacity .2s,transform .2s}
      .x-dock.hide-for-hud{opacity:0;pointer-events:none;transform:translateY(8px)}
      .x-dock-sep{width:1px;height:16px;background:rgba(255,255,255,.18);margin:0 .12rem}
      .x-pill{display:inline-flex;align-items:center;gap:.25rem;padding:.24rem .55rem;border-radius:999px;border:1px solid transparent;
        background:transparent;color:#e2e8f0;font:inherit;font-size:.73rem;font-weight:600;cursor:pointer;white-space:nowrap;transition:all .15s}
      .x-pill:hover{background:rgba(255,255,255,.13);color:#fff}
      .x-pill.active{background:rgba(37,99,235,.85);border-color:rgba(147,197,253,.55);color:#fff}
      .x-pill.micro-pill{border-color:rgba(45,212,191,.42);color:#99f6e4}
      .x-pill.micro-pill.active{background:rgba(13,148,136,.9);border-color:#5eead4;color:#fff}
      .x-pill.gfx-pill{border-color:rgba(255,255,255,.22);color:#cbd5e1;font-size:.7rem;padding:.22rem .5rem}
      .x-pill.gfx-pill.low{border-color:rgba(245,158,11,.5);color:#fde68a;background:rgba(245,158,11,.16)}
      .x-pill.paused{background:rgba(245,158,11,.24);border-color:rgba(251,191,36,.5);color:#fde68a}
      .x-pill svg{width:13px;height:13px}

      /* Tooltip hover 3D */
      .x-hover-tip{position:absolute;z-index:55;pointer-events:none;opacity:0;transform:translate(-50%,-125%) scale(.96);
        padding:.3rem .62rem;border-radius:.55rem;background:rgba(10,15,28,.9);color:#f8fafc;
        border:1px solid rgba(125,211,252,.42);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);
        font-size:.75rem;font-weight:600;white-space:nowrap;box-shadow:0 6px 18px rgba(0,0,0,.42);
        transition:opacity .12s ease,transform .12s ease}
      .x-hover-tip.show{opacity:1;transform:translate(-50%,-135%) scale(1)}
      .x-hover-tip small{display:block;font-weight:400;font-size:.66rem;color:#93c5fd;margin-top:1px}

      @media (max-width:640px){
        .x-dock{left:.5rem;bottom:.5rem;border-radius:.85rem;padding:.28rem .35rem;gap:.2rem}
        .x-pill{padding:.2rem .42rem;font-size:.69rem}
        .x-hud{max-width:calc(100% - 1.5rem);font-size:.8rem}
      }
    `;
    document.head.appendChild(s);
  }

  /* ---------------------------------------------------------- IKON & HELPER */
  const ICON = {
    tour: '<circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/>',
    quiz: '<circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
    fsEnter: '<path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/>',
    fsExit: '<path d="M8 3v3a2 2 0 0 1-2 2H3"/><path d="M21 8h-3a2 2 0 0 1-2-2V3"/><path d="M3 16h3a2 2 0 0 1 2 2v3"/><path d="M16 21v-3a2 2 0 0 1 2-2h3"/>',
    ribs: '<path d="M12 3v18"/><path d="M12 6c-4 0-7 2-8 5"/><path d="M12 6c4 0 7 2 8 5"/><path d="M12 11c-4 0-7 2-8 5"/><path d="M12 11c4 0 7 2 8 5"/><path d="M12 16c-3 0-5 1-6 3"/><path d="M12 16c3 0 5 1 6 3"/>',
    micro: '<path d="M6 18h8"/><path d="M3 22h18"/><path d="M14 22a7 7 0 1 0 0-14h-1"/><path d="M9 14h2"/><path d="M9 12a2 2 0 0 1-2-2V6h6v4a2 2 0 0 1-2 2Z"/><path d="M12 6V3a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v3"/>',
    focus: '<circle cx="12" cy="12" r="3"/><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
    play: '<polygon points="6 4 20 12 6 20 6 4" fill="currentColor" stroke="none"/>',
    pause: '<rect x="6" y="4" width="4" height="16" rx="1" fill="currentColor" stroke="none"/><rect x="14" y="4" width="4" height="16" rx="1" fill="currentColor" stroke="none"/>'
  };

  function addSceneBtn(contId, { id, title, icon, pressed = false, onclick }) {
    const host = $(contId) && $(contId).querySelector('.scene-controls');
    if (!host) return null;
    if ($(id)) $(id).remove();
    const b = document.createElement('button');
    b.className = 'scene-btn'; b.id = id; b.title = title; b.type = 'button';
    b.setAttribute('aria-label', title); b.setAttribute('aria-pressed', String(pressed));
    b.innerHTML = `<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icon}</svg>`;
    b.onclick = onclick;
    host.appendChild(b);
    return b;
  }

  function isolatePointer(el) {
    ['pointerdown', 'pointerup', 'mousedown', 'mouseup', 'touchstart', 'touchend', 'click', 'wheel']
      .forEach(ev => el.addEventListener(ev, (e) => e.stopPropagation()));
  }

  function mkHud(contId, pos) {
    const d = document.createElement('div');
    d.className = 'x-hud ' + pos;
    isolatePointer(d);
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

  function flyCamera(sc, pos, target, ms = 820) {
    if (typeof sc.flyTo === 'function') sc.flyTo(pos, target, ms);
    else {
      sc.camera.position.copy(pos);
      if (target) sc.controls.target.copy(target);
      sc.controls.update();
    }
  }

  /* ============================================================
     PBR PROCEDURAL NORMAL MAP & ROUGHNESS MAP GENERATOR (SOBEL 3x3)
     ============================================================ */
  const _texCache = {};

  function heightCanvasToNormalAndRoughness(hCanvas, strength = 2.4, repeatX = 3, repeatY = 2) {
    const w = hCanvas.width, h = hCanvas.height;
    const hCtx = hCanvas.getContext('2d');
    const src = hCtx.getImageData(0, 0, w, h).data;

    const nCanvas = document.createElement('canvas'); nCanvas.width = w; nCanvas.height = h;
    const nCtx = nCanvas.getContext('2d');
    const nImg = nCtx.createImageData(w, h);
    const nd = nImg.data;

    const rCanvas = document.createElement('canvas'); rCanvas.width = w; rCanvas.height = h;
    const rCtx = rCanvas.getContext('2d');
    const rImg = rCtx.createImageData(w, h);
    const rd = rImg.data;

    const sample = (x, y) => {
      const wx = (x + w) % w, wy = (y + h) % h;
      return src[(wy * w + wx) * 4] / 255;
    };

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const tl = sample(x - 1, y - 1), tc = sample(x, y - 1), tr = sample(x + 1, y - 1);
        const ml = sample(x - 1, y),     mc = sample(x, y),     mr = sample(x + 1, y);
        const bl = sample(x - 1, y + 1), bc = sample(x, y + 1), br = sample(x + 1, y + 1);

        const dx = (tr + 2 * mr + br) - (tl + 2 * ml + bl);
        const dy = (bl + 2 * bc + br) - (tl + 2 * tc + tr);
        let nx = -dx * strength, ny = -dy * strength, nz = 1.0;
        const inv = 1 / Math.hypot(nx, ny, nz);
        nx *= inv; ny *= inv; nz *= inv;

        const idx = (y * w + x) * 4;
        nd[idx]     = Math.round((nx * 0.5 + 0.5) * 255);
        nd[idx + 1] = Math.round((ny * 0.5 + 0.5) * 255);
        nd[idx + 2] = Math.round((nz * 0.5 + 0.5) * 255);
        nd[idx + 3] = 255;

        const rough = Math.round(Math.min(245, Math.max(40, (0.24 + mc * 0.42 + Math.abs(dx) * 0.25) * 255)));
        rd[idx] = rd[idx + 1] = rd[idx + 2] = rough;
        rd[idx + 3] = 255;
      }
    }
    nCtx.putImageData(nImg, 0, 0);
    rCtx.putImageData(rImg, 0, 0);

    const mk = (c) => {
      const t = new THREE.CanvasTexture(c);
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(repeatX, repeatY);
      t.anisotropy = 4;
      return t;
    };
    return { normalMap: mk(nCanvas), roughnessMap: mk(rCanvas) };
  }

  function getOrganTextures(kind) {
    if (_texCache[kind] || typeof document === 'undefined') return _texCache[kind] || null;
    const size = 256;
    const c = document.createElement('canvas'); c.width = c.height = size;
    const x = c.getContext('2d');
    const rnd = makeRnd(kind === 'heart' ? 77101 : 99203);

    x.fillStyle = '#808080';
    x.fillRect(0, 0, size, size);

    if (kind === 'heart') {
      for (let i = 0; i < 2400; i++) {
        const px = rnd() * size, py = rnd() * size;
        const len = 24 + rnd() * 56, tilt = 0.28 + (rnd() - 0.5) * 0.22;
        const bright = rnd() > 0.48 ? 230 : 28;
        x.strokeStyle = `rgba(${bright},${bright},${bright},${0.04 + rnd() * 0.08})`;
        x.lineWidth = 0.7 + rnd() * 1.9;
        for (const ox of [-size, 0, size]) {
          for (const oy of [-size, 0, size]) {
            if (px + ox < -60 || px + ox > size + 60 || py + oy < -60 || py + oy > size + 60) continue;
            x.beginPath();
            x.moveTo(px + ox, py + oy);
            x.quadraticCurveTo(px + ox + tilt * len * 0.5, py + oy + len * 0.5, px + ox + tilt * len, py + oy + len);
            x.stroke();
          }
        }
      }
      for (let i = 0; i < 45; i++) {
        let vx = rnd() * size, vy = rnd() * size;
        x.strokeStyle = 'rgba(20,20,20,0.14)';
        x.lineWidth = 1.0 + rnd() * 1.2;
        x.beginPath(); x.moveTo(vx, vy);
        for (let s = 0; s < 6; s++) { vx += (rnd() - 0.5) * 28; vy += 8 + rnd() * 18; x.lineTo(vx, vy); }
        x.stroke();
      }
      _texCache[kind] = heightCanvasToNormalAndRoughness(c, 2.2, 3, 2);
    } else {
      for (let i = 0; i < 1800; i++) {
        const px = rnd() * size, py = rnd() * size, r = 3 + rnd() * 12;
        const v = rnd() > 0.45 ? 235 : 35;
        const g = x.createRadialGradient(px, py, 0, px, py, r);
        g.addColorStop(0, `rgba(${v},${v},${v},0.12)`);
        g.addColorStop(1, `rgba(${v},${v},${v},0)`);
        x.fillStyle = g;
        x.beginPath(); x.arc(px, py, r, 0, Math.PI * 2); x.fill();
      }
      for (let i = 0; i < 90; i++) {
        const px = rnd() * size, py = rnd() * size, r = 10 + rnd() * 20;
        x.strokeStyle = 'rgba(18,18,18,0.16)';
        x.lineWidth = 0.9 + rnd() * 0.9;
        x.beginPath();
        const sides = 5 + Math.floor(rnd() * 3);
        for (let k = 0; k <= sides; k++) {
          const a = (k / sides) * Math.PI * 2 + rnd() * 0.25;
          const xx = px + Math.cos(a) * r, yy = py + Math.sin(a) * r;
          k === 0 ? x.moveTo(xx, yy) : x.lineTo(xx, yy);
        }
        x.stroke();
      }
      _texCache[kind] = heightCanvasToNormalAndRoughness(c, 2.0, 3, 2);
    }
    return _texCache[kind];
  }

  /* ============================================================
     ULTRA-REALISTIC ANATOMICAL GLSL SHADER ENGINE
     ============================================================ */
  const GLSL_NOISE_LIB = `
    varying vec3 vXObjPos;
    varying vec3 vXWPos;
    varying vec3 vXWNorm;
    uniform float uXTime;
    uniform float uXPulse;
    uniform float uXOrgan;
    uniform float uXSmoke;
    uniform float uXQuality;
    uniform vec3 uXSssCol;
    uniform vec3 uXVeinCol;
    uniform vec3 uXKeyDir;
    uniform vec3 uXRimDir;

    float xHash(vec3 p) {
      p = fract(p * 0.3183099 + vec3(0.1, 0.2, 0.3));
      p *= 17.0;
      return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
    }

    float xNoise(vec3 x) {
      vec3 i = floor(x);
      vec3 f = fract(x);
      f = f * f * (3.0 - 2.0 * f);
      return mix(
        mix(mix(xHash(i + vec3(0.0, 0.0, 0.0)), xHash(i + vec3(1.0, 0.0, 0.0)), f.x),
            mix(xHash(i + vec3(0.0, 1.0, 0.0)), xHash(i + vec3(1.0, 1.0, 0.0)), f.x), f.y),
        mix(mix(xHash(i + vec3(0.0, 0.0, 1.0)), xHash(i + vec3(1.0, 0.0, 1.0)), f.x),
            mix(xHash(i + vec3(0.0, 1.0, 1.0)), xHash(i + vec3(1.0, 1.0, 1.0)), f.x), f.y), f.z
      );
    }

    float xFbm(vec3 p) {
      if (uXQuality < 0.5) return xNoise(p * 1.4);
      float v = 0.55 * xNoise(p);
      v += 0.30 * xNoise(p * 2.04 + vec3(13.1, 7.7, 5.3));
      if (uXQuality > 1.5) {
        v += 0.15 * xNoise(p * 4.12 + vec3(26.2, 15.4, 10.6));
      }
      return v;
    }

    float xRidge(vec3 p) {
      if (uXQuality < 0.5) return 0.0;
      float n1 = 1.0 - abs(xNoise(p) * 2.0 - 1.0);
      float r = pow(n1, 5.0) * 0.65;
      if (uXQuality > 1.5) {
        float n2 = 1.0 - abs(xNoise(p * 2.18 + vec3(4.2, 1.9, 8.3)) * 2.0 - 1.0);
        r += pow(n2, 6.0) * 0.45;
      }
      return r;
    }
  `;

  const GLSL_VERT_INJECT = `
    #include <begin_vertex>
    vXObjPos = transformed;
    #ifdef USE_INSTANCING
      vXWPos = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;
      vXWNorm = normalize((modelMatrix * instanceMatrix * vec4(objectNormal, 0.0)).xyz);
    #else
      vXWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
      vXWNorm = normalize((modelMatrix * vec4(objectNormal, 0.0)).xyz);
    #endif
  `;

  function applyUltraOrganShader(mat, shared, opts = {}) {
    if (!mat || mat.userData._xShaderV11) return;
    const isGlass = !!opts.isGlass;
    const sssColor = new THREE.Color(opts.sssHex || (opts.organ === 0 ? 0xff3b4e : 0xff6b82));
    const veinColor = new THREE.Color(opts.veinHex || (opts.organ === 0 ? 0x5c0c1c : 0x5c1a2e));

    if (opts.normalMap && !mat.normalMap) {
      mat.normalMap = opts.normalMap;
      mat.normalScale = new THREE.Vector2(opts.normalScale || 0.55, opts.normalScale || 0.55);
      mat.bumpMap = null;
    }
    if (opts.roughnessMap && !mat.roughnessMap) {
      mat.roughnessMap = opts.roughnessMap;
    }
    mat.clearcoat = isGlass ? 1.0 : Math.max(mat.clearcoat || 0.45, 0.65);
    mat.clearcoatRoughness = isGlass ? 0.14 : 0.22;
    mat.envMapIntensity = isGlass ? 1.25 : 1.05;

    const cacheId = `xOrganV11_${isGlass ? 'g' : 's'}_${opts.organ}_${opts.variant || 'd'}`;
    mat.customProgramCacheKey = () => cacheId;

    mat.onBeforeCompile = (sh) => {
      sh.uniforms.uXTime = shared.uTime;
      sh.uniforms.uXPulse = shared.uPulse;
      sh.uniforms.uXOrgan = { value: opts.organ };
      sh.uniforms.uXSmoke = shared.uSmoke;
      sh.uniforms.uXQuality = shared.uQuality;
      sh.uniforms.uXSssCol = { value: sssColor };
      sh.uniforms.uXVeinCol = { value: veinColor };
      sh.uniforms.uXKeyDir = shared.uKeyDir;
      sh.uniforms.uXRimDir = shared.uRimDir;

      if (isGlass) {
        sh.uniforms.uRim = mat.userData.rimU || { value: new THREE.Color(0xffb4b0) };
        sh.uniforms.uMin = mat.userData.minU || { value: 0.30 };
      }

      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', `#include <common>\nvarying vec3 vXObjPos;\nvarying vec3 vXWPos;\nvarying vec3 vXWNorm;`)
        .replace('#include <begin_vertex>', GLSL_VERT_INJECT);

      const albedoSnippet = `
        #include <color_fragment>
        float xMottle = xFbm(vXObjPos * 3.1 + vec3(0.0, 0.4, 0.0));
        float xVein = xRidge(vXObjPos * (uXOrgan < 0.5 ? 4.8 : 5.5));

        diffuseColor.rgb *= (0.86 + 0.26 * xMottle);
        diffuseColor.rgb = mix(diffuseColor.rgb, uXVeinCol, clamp(xVein * ${isGlass ? '0.46' : '0.25'}, 0.0, 0.58));

        if (uXOrgan < 0.5) {
          float xFiber = sin(vXObjPos.y * 28.0 + vXObjPos.x * 16.0 + xMottle * 5.2) * 0.5 + 0.5;
          diffuseColor.rgb *= (0.94 + 0.10 * xFiber);
          ${opts.isVentricle ? `
            float xSulcus = exp(-pow((vXObjPos.x - 0.26) / 0.14, 2.0)) * smoothstep(-0.85, 0.58, vXObjPos.y) * smoothstep(0.0, 0.52, vXObjPos.z);
            float xFatMask = xSulcus * smoothstep(0.40, 0.72, xMottle);
            diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.88, 0.74, 0.46), clamp(xFatMask * 0.50, 0.0, 0.50));
          ` : ''}
          diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(1.10, 0.91, 0.93), uXPulse * 0.34);
        } else {
          float xLobule = xRidge(vXObjPos * 6.8 + vec3(1.2, 2.5, 0.7));
          vec3 xSeptaCol = mix(vec3(0.36, 0.17, 0.23), vec3(0.07, 0.08, 0.11), uXSmoke);
          diffuseColor.rgb = mix(diffuseColor.rgb, xSeptaCol, clamp(xLobule * (${isGlass ? '0.36' : '0.18'} + 0.34 * uXSmoke), 0.0, 0.66));
          diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(1.08, 1.03, 1.06), uXPulse * (1.0 - 0.72 * uXSmoke) * 0.28);
        }
      `;

      const roughSnippet = `
        #include <roughnessmap_fragment>
        float xWetNoise = uXQuality > 0.5 ? xNoise(vXObjPos * 9.2) : 0.5;
        roughnessFactor = clamp(roughnessFactor * (0.64 + 0.50 * xWetNoise) * 0.78, 0.09, 0.88);
      `;

      const finalGlassSnippet = `
        vec3 xNv = normalize(vNormal) * (gl_FrontFacing ? 1.0 : -1.0);
        vec3 xVv = normalize(vViewPosition);
        vec3 xNw = normalize(vXWNorm) * (gl_FrontFacing ? 1.0 : -1.0);
        vec3 xVw = normalize(cameraPosition - vXWPos);
        float xNdV = clamp(abs(dot(xNv, xVv)), 0.0, 1.0);
        float xFr = pow(1.0 - xNdV, 2.35);

        float xWrap = clamp((dot(xNw, uXKeyDir) + 0.50) / 1.50, 0.0, 1.0);
        float xTermBleed = smoothstep(0.0, 0.85, xWrap) * (1.0 - smoothstep(0.42, 1.0, max(dot(xNw, uXKeyDir), 0.0)));
        vec3 xBackKey = normalize(-uXKeyDir + xNw * 0.44);
        float xTransKey = pow(clamp(dot(xVw, xBackKey), 0.0, 1.0), 2.7) * (0.42 + 0.58 * xFr);
        vec3 xBackRim = normalize(-uXRimDir + xNw * 0.36);
        float xTransRim = uXQuality > 0.5 ? pow(clamp(dot(xVw, xBackRim), 0.0, 1.0), 3.0) * 0.40 : 0.0;
        vec3 xSss = uXSssCol * (xTermBleed * 0.44 + xTransKey * 0.62 + xTransRim) * (1.0 - 0.55 * uXSmoke);

        vec3 xHalfKey = normalize(uXKeyDir + xVw);
        float xWetSpec = pow(max(dot(xNw, xHalfKey), 0.0), 84.0) * 0.42;
        vec3 xHalfRim = normalize(uXRimDir + xVw);
        float xRimSpec = uXQuality > 0.5 ? pow(max(dot(xNw, xHalfRim), 0.0), 52.0) * 0.24 : 0.0;

        vec3 xDeepTint = mix(vec3(1.0), uXSssCol * 0.68 + vec3(0.32), xFr * 0.52);
        vec3 xCol = outgoingLight * xDeepTint + xSss
                  + vec3(1.0, 0.96, 0.94) * xWetSpec
                  + vec3(0.74, 0.93, 1.0) * xRimSpec
                  + uRim * xFr * (0.46 + 0.14 * uXPulse);

        float xAlpha = clamp(diffuseColor.a * (uMin + (1.0 - uMin) * pow(1.0 - xNdV, 1.72) * 1.55), 0.0, 1.0);
        gl_FragColor = vec4(xCol, xAlpha);
      `;

      const finalSolidSnippet = `
        vec3 xNv = normalize(vNormal) * (gl_FrontFacing ? 1.0 : -1.0);
        vec3 xVv = normalize(vViewPosition);
        vec3 xNw = normalize(vXWNorm) * (gl_FrontFacing ? 1.0 : -1.0);
        vec3 xVw = normalize(cameraPosition - vXWPos);
        float xNdV = clamp(abs(dot(xNv, xVv)), 0.0, 1.0);
        float xFr = pow(1.0 - xNdV, 2.6);

        float xWrap = clamp((dot(xNw, uXKeyDir) + 0.45) / 1.45, 0.0, 1.0);
        float xTermBleed = smoothstep(0.0, 0.82, xWrap) * (1.0 - smoothstep(0.42, 1.0, max(dot(xNw, uXKeyDir), 0.0)));
        vec3 xBackKey = normalize(-uXKeyDir + xNw * 0.40);
        float xTrans = pow(clamp(dot(xVw, xBackKey), 0.0, 1.0), 3.2) * ${opts.sssStrength || '0.32'};
        vec3 xSss = uXSssCol * (xTermBleed * 0.30 + xTrans) * (1.0 - 0.5 * uXSmoke);

        vec3 xHalfKey = normalize(uXKeyDir + xVw);
        float xWetSpec = pow(max(dot(xNw, xHalfKey), 0.0), 72.0) * 0.32;

        vec3 xCol = outgoingLight + xSss + vec3(1.0, 0.96, 0.94) * xWetSpec + uXSssCol * xFr * 0.16;
        gl_FragColor = vec4(xCol, diffuseColor.a);
      `;

      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', `#include <common>\n${isGlass ? 'uniform vec3 uRim;\nuniform float uMin;\n' : ''}${GLSL_NOISE_LIB}`)
        .replace('#include <color_fragment>', albedoSnippet)
        .replace('#include <roughnessmap_fragment>', roughSnippet)
        .replace('#include <opaque_fragment>', isGlass ? finalGlassSnippet : finalSolidSnippet);
    };

    mat.userData._xShaderV11 = true;
    mat.needsUpdate = true;
  }

  function upgradeConductionShader(kit, shared, isLungs) {
    if (!kit || !kit.condMat || !kit.condMat.isShaderMaterial) return;
    const cm = kit.condMat;
    cm.uniforms.uTime = shared.uTime;
    cm.uniforms.uSmoke = shared.uSmoke;
    cm.transparent = false;

    cm.vertexShader = `
      attribute float aDelay;
      varying float vD;
      varying vec3 vN;
      varying vec3 vV;
      void main() {
        vD = aDelay;
        vN = normalize(normalMatrix * normal);
        vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
        vV = normalize(-mvPos.xyz);
        gl_Position = projectionMatrix * mvPos;
      }`;

    if (!isLungs) {
      cm.fragmentShader = `
        uniform float uPhase;
        uniform vec3 uColor;
        uniform float uBoost;
        uniform float uTime;
        varying float vD;
        varying vec3 vN;
        varying vec3 vV;
        void main() {
          float dt = uPhase - vD;
          float head = exp(-dt * dt / 0.0016);
          float tail = dt > 0.0 ? exp(-dt / 0.11) * 0.62 : 0.0;
          float core = pow(clamp(abs(dot(normalize(vN), normalize(vV))), 0.0, 1.0), 1.35);
          float shimmer = 0.92 + 0.08 * sin(uTime * 18.0 - vD * 45.0);
          float energy = (0.28 + (head * 2.85 + tail) * uBoost) * shimmer;
          vec3 col = mix(uColor * 0.75, vec3(0.86, 1.0, 0.98), clamp(head * 0.85 * core + core * 0.25, 0.0, 1.0));
          gl_FragColor = vec4(col * energy * (0.55 + 0.55 * core), 1.0);
        }`;
    } else {
      cm.fragmentShader = `
        uniform float uPhase;
        uniform vec3 uColor;
        uniform float uBoost;
        uniform float uTime;
        uniform float uSmoke;
        varying float vD;
        varying vec3 vN;
        varying vec3 vV;
        void main() {
          float dtIn = uPhase - vD;
          float headIn = exp(-dtIn * dtIn / 0.0024);
          float tailIn = (dtIn > 0.0 && dtIn < 0.45) ? exp(-dtIn / 0.13) * 0.58 : 0.0;
          float revPhase = (1.0 - uPhase) - vD * 0.85;
          float headOut = uPhase > 0.46 ? exp(-revPhase * revPhase / 0.0036) * 0.95 : 0.0;
          float core = pow(clamp(abs(dot(normalize(vN), normalize(vV))), 0.0, 1.0), 1.3);
          float flow = 0.94 + 0.06 * sin(uTime * 12.0 - vD * 30.0);

          vec3 o2Col = mix(vec3(0.08, 0.86, 0.98), vec3(0.85, 0.98, 1.0), clamp(headIn * core, 0.0, 1.0));
          vec3 co2Col = mix(vec3(1.0, 0.42, 0.34), vec3(1.0, 0.82, 0.65), clamp(headOut * core, 0.0, 1.0));
          float outMix = clamp(headOut / max(0.001, headIn + tailIn + headOut + 0.25), 0.0, 1.0);
          vec3 col = mix(o2Col, co2Col, outMix);
          col = mix(col, vec3(0.55, 0.58, 0.62), uSmoke * 0.45);

          float g = (0.28 + (headIn * 2.35 + tailIn + headOut * 1.45) * uBoost) * flow;
          gl_FragColor = vec4(col * g * (0.55 + 0.55 * core), 1.0);
        }`;
    }
    cm.needsUpdate = true;
  }

  /* ============================================================
     PENGALIH KUALITAS GRAFIS GLOBAL:
     1) Pilihan Utama di Menu Home (#homeScreen)
     2) Pintasan Kecil di Layar 3D sebagai Cadangan
     ============================================================ */
  const GFX_STORAGE_KEY = 'labby_gfx_quality';
  const GFX_TIERS = ['high', 'medium', 'low'];
  const GFX_META = {
    high:   { short: 'HD',     badge: 'Tinggi (HD)' },
    medium: { short: 'Sedang', badge: 'Sedang (HP)' },
    low:    { short: 'Ringan', badge: 'Ringan (60 FPS)' }
  };
  const _gfxListeners = [];

  function getSavedQuality() {
    try {
      const q = localStorage.getItem(GFX_STORAGE_KEY);
      if (q === 'high' || q === 'medium' || q === 'low') return q;
    } catch (e) {}
    return 'high';
  }

  function broadcastQuality(tier, showNotify = false) {
    const t = (tier === 'low' || tier === 'medium') ? tier : 'high';
    try { localStorage.setItem(GFX_STORAGE_KEY, t); } catch (e) {}
    _gfxListeners.forEach(fn => { try { fn(t); } catch (e) {} });
    if (showNotify) {
      toast(
        t === 'low'
          ? 'Grafis 3D: Ringan (60 FPS) — hemat baterai & lancar di HP.'
          : t === 'medium'
          ? 'Grafis 3D: Sedang — seimbang antara detail & performa.'
          : 'Grafis 3D: Tinggi (HD) — efek SSS, bloom & partikel penuh.',
        'info'
      );
    }
  }

  function cycleQuality() {
    const cur = getSavedQuality();
    const next = GFX_TIERS[(GFX_TIERS.indexOf(cur) + 1) % GFX_TIERS.length];
    broadcastQuality(next, true);
    return next;
  }

  function mountHomeQualitySelector() {
    injectStyle();
    if ($('xHomeGfxCard')) return true;

    const homeScreen = $('homeScreen');
    if (!homeScreen) return false;

    const homeInner = homeScreen.querySelector('.home-inner') || homeScreen;
    const choices = homeInner.querySelector('.home-choices');
    const footer = homeInner.querySelector('.home-foot');
    if (!choices && !footer) return false;

    const card = document.createElement('section');
    card.className = 'x-home-gfx';
    card.id = 'xHomeGfxCard';
    card.setAttribute('aria-label', 'Pengaturan Kualitas Grafis 3D');
    card.innerHTML = `
      <div class="x-home-gfx-info">
        <span class="x-home-gfx-ico" aria-hidden="true">
          <svg class="ico" style="width:18px;height:18px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICON.gear}</svg>
        </span>
        <div>
          <div class="x-home-gfx-title">Kualitas Grafis 3D</div>
          <div class="x-home-gfx-sub">Pilih sebelum praktikum sesuai kemampuan perangkat / HP</div>
        </div>
      </div>
      <div class="x-home-gfx-btns" role="group" aria-label="Pilih kualitas grafis">
        <button type="button" class="x-gfx-opt" data-q="high" title="Shader SSS penuh, bloom & partikel lengkap">
          <span>✨ Tinggi</span><small>(HD)</small>
        </button>
        <button type="button" class="x-gfx-opt" data-q="medium" title="Seimbang untuk ponsel kelas menengah">
          <span>⚡ Sedang</span><small>(HP)</small>
        </button>
        <button type="button" class="x-gfx-opt" data-q="low" title="Hemat daya & lancar 60 FPS di HP ringan">
          <span>🚀 Ringan</span><small>(60 FPS)</small>
        </button>
      </div>
    `;

    if (choices) {
      choices.after(card);
    } else if (footer) {
      homeInner.insertBefore(card, footer);
    } else {
      homeInner.appendChild(card);
    }

    const syncHomeUI = (tier) => {
      card.querySelectorAll('[data-q]').forEach(btn => {
        const active = btn.dataset.q === tier;
        btn.classList.toggle('active', active);
        btn.setAttribute('aria-pressed', String(active));
      });
    };

    card.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-q]');
      if (!btn) return;
      snd('click');
      broadcastQuality(btn.dataset.q, true);
    });

    _gfxListeners.push(syncHomeUI);
    syncHomeUI(getSavedQuality());
    return true;
  }

  if (!mountHomeQualitySelector() && typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', mountHomeQualitySelector);
    setTimeout(mountHomeQualitySelector, 50);
    setTimeout(mountHomeQualitySelector, 300);
  }

  /* ============================================================
     MODE ISOLASI STRUKTUR (SOLO / FOCUS VIEW)
     ============================================================ */
  function attachIsolationMode(E, cfg) {
    const st = E.state, sc = st.scene, kit = st.kit, cont = $(cfg.sceneId);
    if (!cont || !kit) return;

    let isolated = false;
    let isoKey = null;
    const savedMaterials = new Map();

    const banner = document.createElement('div');
    banner.className = 'x-iso-banner';
    banner.style.display = 'none';
    isolatePointer(banner);
    banner.innerHTML = `<span>🔍 Isolasi: <b data-name></b></span><button type="button" data-exit>Tampilkan Semua</button>`;
    cont.appendChild(banner);
    banner.querySelector('[data-exit]').onclick = () => { snd('click'); exitIsolation(); };

    const infoBox = $(cfg.infoBoxId);
    let isoBtn = null;
    if (infoBox) {
      const bar = document.createElement('div');
      bar.className = 'x-info-actions';
      bar.id = cfg.sceneId + 'InfoActions';
      isoBtn = document.createElement('button');
      isoBtn.type = 'button';
      isoBtn.className = 'x-info-btn';
      isoBtn.innerHTML = `<svg class="ico" style="width:14px;height:14px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICON.focus}</svg><span>Isolasi Struktur</span>`;
      isoBtn.onclick = (e) => {
        e.stopPropagation();
        snd('click');
        const activeKey = st[cfg.selProp];
        if (!activeKey) return;
        if (isolated && isoKey === activeKey) exitIsolation();
        else enterIsolation(activeKey);
      };
      bar.appendChild(isoBtn);
      infoBox.appendChild(bar);
    }

    const syncIsoBtn = () => {
      if (!isoBtn) return;
      const cur = st[cfg.selProp];
      const on = isolated && isoKey === cur;
      isoBtn.classList.toggle('on', on);
      isoBtn.querySelector('span').textContent = on ? 'Tampilkan Semua' : 'Isolasi Struktur';
    };

    const getRelatedKeys = (key) => {
      const rel = new Set([key]);
      if (cfg.exp === 'heart') {
        if (key === 'mitral' || key === 'tri') rel.add('pap');
        if (key === 'pap') { rel.add('mitral'); rel.add('tri'); }
        if (['sa', 'av', 'his', 'lbb', 'rbb'].includes(key)) {
          ['sa', 'av', 'his', 'lbb', 'rbb'].forEach(k => rel.add(k));
        }
        if (key === 'plaque') rel.add('lad');
      } else {
        if (key === 'alveoli') rel.add('bronchiole');
        if (key === 'carina') { rel.add('trachea'); rel.add('rbronch'); rel.add('lbronch'); }
      }
      return rel;
    };

    function restoreAllMaterials() {
      savedMaterials.forEach((orig, mat) => {
        mat.transparent = orig.transparent;
        mat.opacity = orig.opacity;
        mat.depthWrite = orig.depthWrite;
        if (mat.userData && mat.userData.minU && orig.minU !== undefined) {
          mat.userData.minU.value = orig.minU;
        }
        mat.needsUpdate = true;
      });
      savedMaterials.clear();
    }

    function enterIsolation(key) {
      if (!key) return;
      if (E._x && E._x.isMicroscope) return;
      restoreAllMaterials();
      isolated = true;
      isoKey = key;
      E._x.isIsolated = true;
      E._x.isolatedKey = key;

      const keepKeys = getRelatedKeys(key);
      const keepMats = new Set();

      (kit.clickables || []).forEach(obj => {
        const k = obj.userData && obj.userData.key;
        if (k && keepKeys.has(k) && obj.material) {
          keepMats.add(obj.material);
        }
      });

      kit.root.traverse(obj => {
        if (!obj.isMesh || !obj.material) return;
        const m = obj.material;
        if (m.isShaderMaterial || m.visible === false) return;
        if (keepMats.has(m)) return;

        if (!savedMaterials.has(m)) {
          savedMaterials.set(m, {
            transparent: m.transparent,
            opacity: m.opacity,
            depthWrite: m.depthWrite,
            minU: m.userData && m.userData.minU ? m.userData.minU.value : undefined
          });
        }
        m.transparent = true;
        m.depthWrite = false;
        m.opacity = m.userData && m.userData.minU ? 0.11 : 0.14;
        if (m.userData && m.userData.minU) m.userData.minU.value = 0.05;
        m.needsUpdate = true;
      });

      const targets = (kit.clickables || []).filter(o => o.userData && o.userData.key === key && o.visible);
      if (targets.length) {
        const box = new THREE.Box3();
        targets.forEach(o => box.expandByObject(o));
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3()).length();
        const dist = Math.max(3.6, Math.min(7.2, size * 2.4 + 2.8));
        const dir = sc.camera.position.clone().sub(sc.controls.target).normalize();
        if (dir.lengthSq() < 0.01) dir.set(0.2, 0.25, 1).normalize();
        flyCamera(sc, center.clone().addScaledVector(dir, dist), center, 780);
      }

      const title = (E.INFO[key] || [key])[0];
      banner.querySelector('[data-name]').textContent = title;
      banner.style.display = 'flex';
      syncIsoBtn();
      toast(`Mode Isolasi: ${title}. Putar 360° untuk mengamati detailnya.`, 'info');
    }

    function exitIsolation() {
      if (!isolated) return;
      isolated = false;
      isoKey = null;
      E._x.isIsolated = false;
      E._x.isolatedKey = null;
      restoreAllMaterials();
      banner.style.display = 'none';
      syncIsoBtn();
    }

    const origSelect = E.select;
    E.select = function (key, noFocus) {
      const r = origSelect.call(this, key, noFocus);
      if (isolated && isoKey !== key) {
        enterIsolation(key);
      } else {
        syncIsoBtn();
      }
      return r;
    };

    const origClear = E.clearSelection;
    E.clearSelection = function () {
      exitIsolation();
      return origClear.call(this);
    };

    E._x.exitIsolation = exitIsolation;
    E._x.enterIsolation = enterIsolation;
  }

  /* ============================================================
     MODE MIKROSKOP 3D: PERTUKARAN GAS ALVEOLUS – KAPILER DARAH
     ============================================================ */
  function attachAlveolusMicroscope(E) {
    const st = E.state, sc = st.scene, kit = st.kit, cont = $('lungsScene'), T = THREE;
    if (!cont || !sc || !kit) return;

    E.INFO.micro_cavity = ['Rongga Kantung Alveolus (Skala Mikroskopis)',
      'Ruang udara di ujung bronkiolus dengan tekanan parsial oksigen tinggi (<b>PO₂ ≈ 104 mmHg</b>) dan karbon dioksida rendah (<b>PCO₂ ≈ 40 mmHg</b>). Dindingnya tersusun atas sel epitel pipih selapis (pneumosit tipe I) agar gas mudah berdifusi.'];
    E.INFO.micro_membrane = ['Membran Respirasi (Batas Difusi ±0,5 µm)',
      'Sangat tipis (kurang dari 1 mikrometer!), terdiri dari dinding epitel alveolus dan endotel kapiler darah yang berimpitan. Di sini terjadi <b>difusi pasif</b>: O₂ berpindah dari konsentrasi tinggi di alveolus menuju kapiler, sedangkan CO₂ bergerak ke arah sebaliknya.'];
    E.INFO.micro_capillary = ['Pembuluh Kapiler Pulmonal',
      'Jaringan kapiler halus yang membungkus setiap alveolus. Darah yang datang dari arteri pulmonalis (kiri) miskin O₂ (<b>PO₂ ≈ 40 mmHg</b>, merah gelap keunguan), lalu keluar menuju vena pulmonalis (kanan) dalam keadaan kaya O₂ (<b>PO₂ ≈ 100 mmHg</b>, merah cerah).'];
    E.INFO.micro_rbc = ['Eritrosit & Oksihemoglobin (HbO₂)',
      'Sel darah merah bikonkaf mengalir satu per satu melintasi kapiler sempit. Molekul <b>O₂</b> berikatan dengan <i>hemoglobin (Hb)</i> membentuk <b>oksihemoglobin (HbO₂)</b> sehingga warna sel berubah menjadi merah cerah, sementara <b>CO₂</b> dilepaskan ke rongga alveolus.'];

    const microGroup = new T.Group();
    microGroup.visible = false;
    sc.scene.add(microGroup);

    const microClickables = [];
    const regM = (mesh, key, priority = 1) => {
      mesh.userData = { key, priority, isMicro: true };
      microClickables.push(mesh);
      return mesh;
    };

    const alvRadius = 1.48;
    const alvOuterMat = new T.MeshPhysicalMaterial({
      color: 0xff9eb5,
      roughness: 0.28,
      clearcoat: 0.92,
      clearcoatRoughness: 0.16,
      transparent: true,
      opacity: 0.44,
      side: T.DoubleSide,
      depthWrite: false
    });
    const alvDome = new T.Mesh(
      new T.SphereGeometry(alvRadius, 48, 32, 0.72, Math.PI * 2 - 1.44, 0.14, Math.PI - 0.34),
      alvOuterMat
    );
    alvDome.position.set(0, 0.42, 0);
    alvDome.rotation.y = -Math.PI / 2;
    regM(alvDome, 'micro_cavity', 1.2);
    microGroup.add(alvDome);

    const ductMat = new T.MeshPhysicalMaterial({
      color: 0xf4a2b8, roughness: 0.35, clearcoat: 0.8,
      transparent: true, opacity: 0.55, side: T.DoubleSide, depthWrite: false
    });
    const duct = new T.Mesh(new T.CylinderGeometry(0.42, 0.52, 0.95, 32, 1, true), ductMat);
    duct.position.set(0, 2.08, 0);
    regM(duct, 'micro_cavity', 1.1);
    microGroup.add(duct);

    const neighborMat = new T.MeshPhysicalMaterial({
      color: 0xfda4af, roughness: 0.38, clearcoat: 0.7,
      transparent: true, opacity: 0.24, depthWrite: false
    });
    [[-1.68, 0.85, -1.15, 0.82], [1.72, 0.78, -1.12, 0.85], [0, 0.95, -1.78, 0.92]].forEach(([nx, ny, nz, nr]) => {
      const nb = new T.Mesh(new T.SphereGeometry(nr, 28, 20), neighborMat);
      nb.position.set(nx, ny, nz);
      nb.raycast = () => {};
      microGroup.add(nb);
    });

    const memMat = new T.MeshPhysicalMaterial({
      color: 0x38bdf8,
      emissive: 0x0ea5e9,
      emissiveIntensity: 0.35,
      roughness: 0.2,
      transparent: true,
      opacity: 0.42,
      side: T.DoubleSide,
      depthWrite: false
    });
    const membraneArc = new T.Mesh(new T.TorusGeometry(1.46, 0.055, 14, 48, Math.PI * 0.72), memMat);
    membraneArc.position.set(0, 0.42, 0.12);
    membraneArc.rotation.z = Math.PI * 1.14;
    regM(membraneArc, 'micro_membrane', 2.4);
    microGroup.add(membraneArc);

    const tarCoatMat = new T.MeshBasicMaterial({
      color: 0x18181b, transparent: true, opacity: 0.0, side: T.BackSide, depthWrite: false
    });
    const tarCoat = new T.Mesh(
      new T.SphereGeometry(alvRadius * 0.985, 36, 24, 0.72, Math.PI * 2 - 1.44, 0.2, Math.PI - 0.42),
      tarCoatMat
    );
    tarCoat.position.copy(alvDome.position);
    tarCoat.rotation.copy(alvDome.rotation);
    tarCoat.visible = false;
    tarCoat.raycast = () => {};
    microGroup.add(tarCoat);

    const capCurve = new T.CatmullRomCurve3([
      new T.Vector3(-2.85, -0.52, -0.25),
      new T.Vector3(-1.85, -0.82, 0.05),
      new T.Vector3(-0.88, -1.16, 0.24),
      new T.Vector3(0.0,   -1.26, 0.28),
      new T.Vector3(0.88,  -1.16, 0.24),
      new T.Vector3(1.85,  -0.82, 0.05),
      new T.Vector3(2.85,  -0.52, -0.25)
    ]);
    const capGeo = new T.TubeGeometry(capCurve, 64, 0.34, 24, false);
    const cPos = capGeo.attributes.position;
    const cCol = new Float32Array(cPos.count * 3);
    const colVenous = new T.Color(0x4f46e5);
    const colArterial = new T.Color(0xf43f5e);
    const tmpCol = new T.Color();
    for (let i = 0; i < cPos.count; i++) {
      const vx = cPos.getX(i);
      const frac = S(-2.2, 2.2, vx);
      tmpCol.copy(colVenous).lerp(colArterial, frac);
      cCol[i * 3] = tmpCol.r;
      cCol[i * 3 + 1] = tmpCol.g;
      cCol[i * 3 + 2] = tmpCol.b;
    }
    capGeo.setAttribute('color', new T.BufferAttribute(cCol, 3));
    const capMat = new T.MeshPhysicalMaterial({
      vertexColors: true,
      roughness: 0.22,
      clearcoat: 0.95,
      transparent: true,
      opacity: 0.34,
      side: T.DoubleSide,
      depthWrite: false
    });
    const capillaryMesh = new T.Mesh(capGeo, capMat);
    regM(capillaryMesh, 'micro_capillary', 1.4);
    microGroup.add(capillaryMesh);

    const buildRbcGeo = (R) => {
      const k = R / 3.91, pts = [], N = 22;
      const half = (rho) => 0.5 * 3.91 * Math.sqrt(Math.max(0, 1 - rho * rho)) * (0.207161 + 2.002558 * rho * rho - 1.122762 * Math.pow(rho, 4)) * k;
      for (let i = 0; i <= N; i++) { const rho = Math.sin(i / N * Math.PI / 2); pts.push(new T.Vector2(rho * R, -half(rho))); }
      for (let i = N - 1; i >= 0; i--) { const rho = Math.sin(i / N * Math.PI / 2); pts.push(new T.Vector2(rho * R, half(rho))); }
      return new T.LatheGeometry(pts, 20);
    };
    const rbcCount = 18;
    const rbcMat = new T.MeshPhysicalMaterial({
      color: 0xffffff, roughness: 0.32, clearcoat: 0.75, emissive: 0x260408, emissiveIntensity: 0.45
    });
    const rbcInst = new T.InstancedMesh(buildRbcGeo(0.21), rbcMat, rbcCount);
    rbcInst.instanceMatrix.setUsage(T.DynamicDrawUsage);
    rbcInst.frustumCulled = false;
    regM(rbcInst, 'micro_rbc', 2.0);
    microGroup.add(rbcInst);

    const rnd = makeRnd(31415);
    const rbcs = Array.from({ length: rbcCount }, (_, i) => ({
      t: i / rbcCount,
      oy: (rnd() - 0.5) * 0.14,
      oz: (rnd() - 0.5) * 0.14,
      spin: rnd() * Math.PI * 2,
      spinRate: (rnd() - 0.5) * 1.8
    }));

    const mkMolGeo = (atoms) => {
      const pos = [], nor = [], col = [], idx = [];
      let base = 0;
      atoms.forEach(a => {
        const g = new T.SphereGeometry(a.r, 12, 10), p = g.attributes.position, n = g.attributes.normal, c = new T.Color(a.c);
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
    };

    const o2MolGeo = mkMolGeo([{ p: [-0.055, 0, 0], r: 0.052, c: 0x38bdf8 }, { p: [0.055, 0, 0], r: 0.052, c: 0x38bdf8 }]);
    const co2MolGeo = mkMolGeo([{ p: [0, 0, 0], r: 0.044, c: 0x475569 }, { p: [-0.11, 0, 0], r: 0.052, c: 0xf97316 }, { p: [0.11, 0, 0], r: 0.052, c: 0xf97316 }]);
    const gasMat = new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.25, emissive: 0x1e293b, emissiveIntensity: 0.65 });

    const o2Count = 26, co2Count = 22;
    const o2Inst = new T.InstancedMesh(o2MolGeo, gasMat, o2Count);
    const co2Inst = new T.InstancedMesh(co2MolGeo, gasMat, co2Count);
    o2Inst.instanceMatrix.setUsage(T.DynamicDrawUsage); o2Inst.frustumCulled = false; o2Inst.raycast = () => {};
    co2Inst.instanceMatrix.setUsage(T.DynamicDrawUsage); co2Inst.frustumCulled = false; co2Inst.raycast = () => {};
    microGroup.add(o2Inst, co2Inst);

    const o2Seeds = Array.from({ length: o2Count }, () => ({
      t: rnd(), xOff: (rnd() - 0.5) * 1.4, zOff: (rnd() - 0.5) * 0.7, speed: 0.75 + rnd() * 0.45, rot: rnd() * 6.28
    }));
    const co2Seeds = Array.from({ length: co2Count }, () => ({
      t: rnd(), xOff: (rnd() - 0.5) * 1.3, zOff: (rnd() - 0.5) * 0.65, speed: 0.72 + rnd() * 0.45, rot: rnd() * 6.28
    }));

    let microActive = false;
    let microHud = null;

    const sceneBtn = addSceneBtn('lungsScene', {
      id: 'btnMicroAlveolus',
      title: 'Mode Mikroskop 3D: Difusi Gas Alveolus–Kapiler',
      icon: ICON.micro,
      pressed: false,
      onclick: () => { snd('click'); toggleMicroscope(!microActive); }
    });

    const dock = $('lungsSceneDock');
    let dockPill = null;
    if (dock) {
      dockPill = document.createElement('button');
      dockPill.type = 'button';
      dockPill.className = 'x-pill micro-pill';
      dockPill.title = 'Zoom mikroskopis ke dalam Alveolus & Kapiler Darah';
      dockPill.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICON.micro}</svg><span>Mikroskop Alveolus</span>`;
      dockPill.onclick = () => { snd('click'); toggleMicroscope(!microActive); };
      const gfxSep = dock.querySelector('[data-gfx-sep]');
      if (gfxSep) dock.insertBefore(dockPill, gfxSep);
      else dock.appendChild(dockPill);
    }

    const infoActions = $('lungsSceneInfoActions');
    let infoMicroBtn = null;
    if (infoActions) {
      infoMicroBtn = document.createElement('button');
      infoMicroBtn.type = 'button';
      infoMicroBtn.className = 'x-info-btn micro';
      infoMicroBtn.style.display = 'none';
      infoMicroBtn.innerHTML = `🔬 Lihat Difusi Mikroskopis`;
      infoMicroBtn.onclick = (e) => {
        e.stopPropagation();
        snd('click');
        toggleMicroscope(true);
      };
      infoActions.appendChild(infoMicroBtn);
    }

    const origLungsSelect = E.select;
    E.select = function (key, noFocus) {
      const r = origLungsSelect.call(this, key, noFocus);
      if (infoMicroBtn) {
        infoMicroBtn.style.display = (!microActive && (key === 'alveoli' || key === 'pulmv' || key === 'bronchiole')) ? 'inline-flex' : 'none';
      }
      return r;
    };

    const canvas = sc.renderer.domElement;
    let msx = 0, msy = 0;
    canvas.addEventListener('pointerdown', (e) => { msx = e.clientX; msy = e.clientY; });
    canvas.addEventListener('pointerup', (e) => {
      if (!microActive) return;
      if (Math.hypot(e.clientX - msx, e.clientY - msy) > 5) return;
      const rect = canvas.getBoundingClientRect();
      sc.mouse.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
      sc.raycaster.setFromCamera(sc.mouse, sc.camera);
      let best = null;
      for (const h of sc.raycaster.intersectObjects(microClickables, false)) {
        const pr = h.object.userData.priority || 1;
        if (!best || pr > best.pr || (pr === best.pr && h.distance < best.h.distance)) best = { h, u: h.object.userData, pr };
      }
      if (best && best.u.key) {
        E.select(best.u.key, true);
      }
    });

    function toggleMicroscope(on) {
      if (on === microActive) return;
      if (on) {
        if (E._x && E._x.stopTour) E._x.stopTour();
        if (E._x && E._x.stopChallenge) E._x.stopChallenge();
        if (E._x && E._x.exitIsolation) E._x.exitIsolation();
      }
      microActive = !!on;
      E._x.isMicroscope = microActive;

      kit.root.visible = !microActive;
      if (st.lungsGroup) st.lungsGroup.visible = !microActive;
      if ($('lxLayer')) $('lxLayer').style.display = microActive ? 'none' : '';

      microGroup.visible = microActive;
      if (sceneBtn) sceneBtn.setAttribute('aria-pressed', String(microActive));
      if (dockPill) dockPill.classList.toggle('active', microActive);

      if (microActive) {
        E.clearSelection();
        const ov = cont.querySelector('.scene-overlay');
        if (ov) ov.style.display = 'none';
        flyCamera(sc, new T.Vector3(0, 0.25, 6.2), new T.Vector3(0, 0.05, 0), 850);

        microHud = mkHud('lungsScene', 'top');
        microHud.innerHTML = `
          <div class="row sp">
            <b>🔬 Mode Mikroskop: Difusi Alveolus – Kapiler</b>
            <button type="button" class="teal" data-back>← Paru-paru Makro</button>
          </div>
          <div class="x-chips" style="margin-top:.38rem">
            <span class="x-chip on"><i style="color:#38bdf8;font-style:normal">●●</i> O₂ masuk ke Kapiler (PO₂ 104→40)</span>
            <span class="x-chip off"><i style="color:#f97316;font-style:normal">●●●</i> CO₂ keluar ke Alveolus (PCO₂ 45→40)</span>
          </div>
          <div style="font-size:.74rem;opacity:.85;margin-top:.35rem">
            Amati sel darah merah berubah dari <b>merah gelap</b> menjadi <b>merah cerah</b> saat mengikat O₂. Klik struktur untuk penjelasan.
          </div>
        `;
        microHud.querySelector('[data-back]').onclick = () => { snd('click'); toggleMicroscope(false); };
        record('lungs', 'Mode Mikroskop Difusi Alveolus–Kapiler', 'Diamati');
      } else {
        if (microHud) { microHud.remove(); microHud = null; }
        const ov = cont.querySelector('.scene-overlay');
        if (ov) ov.style.display = '';
        E.clearSelection();
        sc.resetCamera(true);
      }
    }

    const resetBtn = $('btnResetLungs');
    if (resetBtn) {
      const prev = resetBtn.onclick;
      resetBtn.onclick = function (e) {
        if (microActive) toggleMicroscope(false);
        if (prev) prev.call(this, e);
      };
    }

    const P0 = new T.Vector3(), P1 = new T.Vector3(), Tn = new T.Vector3(), N = new T.Vector3(), B = new T.Vector3(),
      ref = new T.Vector3(), ax = new T.Vector3(), Z = new T.Vector3(), pos = new T.Vector3(),
      M = new T.Matrix4(), S3 = new T.Vector3(), eu = new T.Euler(),
      cDeoxy = new T.Color(0x6b1d3a), cOxy = new T.Color(0xef233c), cCell = new T.Color();

    let last = 0;
    sc.addAnimation((el) => {
      const dt = Math.min(0.1, Math.max(0, el - last));
      last = el;
      if (!microActive) return;

      const ph = st.phase || 0;
      const breath = S(0.02, 0.42, ph) - S(0.44, 0.88, ph);
      const smk = st.smokeLevel || 0;
      const strength = (st.depth / 100) * (st.type === 'normal' ? 0.65 : st.type === 'dalam' ? 0.88 : 1.15) * (st.smokeFactor || 1);

      const bScale = 1 + 0.085 * breath * strength;
      alvDome.scale.set(bScale, bScale, bScale);
      tarCoat.scale.copy(alvDome.scale);

      tarCoat.visible = smk > 0.02;
      tarCoatMat.opacity = smk * 0.58;

      memMat.emissiveIntensity = (0.25 + 0.45 * Math.max(0, breath)) * (1 - 0.65 * smk);

      const flowSpeed = dt * 0.14 * (st.rpm / 16) * (0.75 + 0.35 * strength);
      for (let i = 0; i < rbcs.length; i++) {
        const r = rbcs[i];
        r.t = (r.t + flowSpeed) % 1;
        const tt = Math.min(r.t, 0.994);
        capCurve.getPointAt(tt, P0);
        capCurve.getPointAt(tt + 0.005, P1);
        Tn.subVectors(P1, P0).normalize();
        ref.set(0, 0, 1);
        N.crossVectors(ref, Tn).normalize();
        B.crossVectors(Tn, N);
        pos.copy(P0).addScaledVector(N, r.oy).addScaledVector(B, r.oz);

        const ang = r.spin + el * r.spinRate;
        ax.copy(N).multiplyScalar(Math.cos(ang)).addScaledVector(B, Math.sin(ang));
        Z.crossVectors(Tn, ax);
        const edgeFade = Math.min(1, r.t / 0.06, (1 - r.t) / 0.06);
        M.makeBasis(Tn, ax, Z);
        M.scale(S3.set(edgeFade, edgeFade, edgeFade));
        M.setPosition(pos);
        rbcInst.setMatrixAt(i, M);

        const oxyFrac = S(0.24, 0.72, r.t) * (1 - 0.62 * smk);
        cCell.copy(cDeoxy).lerp(cOxy, oxyFrac);
        rbcInst.setColorAt(i, cCell);
      }
      rbcInst.instanceMatrix.needsUpdate = true;
      if (rbcInst.instanceColor) rbcInst.instanceColor.needsUpdate = true;

      const diffRate = dt * 0.28 * (st.rpm / 16) * (1 - 0.45 * smk) * (0.65 + 0.45 * strength);
      for (let i = 0; i < o2Seeds.length; i++) {
        const m = o2Seeds[i];
        m.t = (m.t + diffRate * m.speed) % 1;
        let mx, my, mz;
        if (m.t < 0.35) {
          const u = m.t / 0.35;
          mx = m.xOff * u * 0.7;
          my = 2.35 - u * 1.65;
          mz = m.zOff * u * 0.7;
        } else if (m.t < 0.72) {
          const u = (m.t - 0.35) / 0.37;
          mx = m.xOff * 0.7 * (1 - u * 0.25);
          my = 0.70 - u * 1.88;
          mz = m.zOff * 0.7 * (1 - u * 0.5) + u * 0.22;
        } else {
          const u = (m.t - 0.72) / 0.28;
          mx = m.xOff * 0.52 + u * 2.1;
          my = -1.18 + u * 0.55;
          mz = 0.22 - u * 0.35;
        }
        const scMol = Math.min(1, m.t / 0.06, (1 - m.t) / 0.06);
        eu.set(m.rot + el * 1.4, m.rot + el * 1.1, m.rot);
        M.makeRotationFromEuler(eu);
        M.scale(S3.set(scMol, scMol, scMol));
        M.setPosition(pos.set(mx, my, mz));
        o2Inst.setMatrixAt(i, M);
      }
      o2Inst.instanceMatrix.needsUpdate = true;

      for (let i = 0; i < co2Seeds.length; i++) {
        const m = co2Seeds[i];
        m.t = (m.t + diffRate * m.speed * 0.95) % 1;
        let mx, my, mz;
        if (m.t < 0.30) {
          const u = m.t / 0.30;
          mx = -2.4 + u * (1.7 + m.xOff * 0.5);
          my = -0.62 - u * 0.56;
          mz = -0.18 + u * 0.40;
        } else if (m.t < 0.68) {
          const u = (m.t - 0.30) / 0.38;
          mx = (-0.7 + m.xOff * 0.5) * (1 - u * 0.4);
          my = -1.18 + u * 1.85;
          mz = 0.22 * (1 - u) + m.zOff * 0.5 * u;
        } else {
          const u = (m.t - 0.68) / 0.32;
          mx = (-0.42 + m.xOff * 0.3) * (1 - u);
          my = 0.67 + u * 1.75;
          mz = m.zOff * 0.5 * (1 - u);
        }
        const scMol = Math.min(1, m.t / 0.06, (1 - m.t) / 0.06);
        eu.set(m.rot - el * 1.2, m.rot + el * 1.5, m.rot);
        M.makeRotationFromEuler(eu);
        M.scale(S3.set(scMol, scMol, scMol));
        M.setPosition(pos.set(mx, my, mz));
        co2Inst.setMatrixAt(i, M);
      }
      co2Inst.instanceMatrix.needsUpdate = true;
    });
  }

  /* ---------------------------------------------------------- CEGAH DUPLIKASI GRAFIK SAAT PAUSE */
  function guardTraceOnPause(E, methodName) {
    const orig = E[methodName];
    if (typeof orig !== 'function') return;
    let lastEl = -1;
    E[methodName] = function (el) {
      if (this.state.scene && this.state.scene.paused && lastEl === el) return;
      lastEl = el;
      return orig.call(this, el);
    };
  }

  /* ---------------------------------------------------------- HOVER INSPECTOR 3D */
  function attachHoverInspector(E, sceneId) {
    const cont = $(sceneId);
    const st = E.state, sc = st.scene;
    if (!cont || !sc || !sc.renderer) return;
    const canvas = sc.renderer.domElement;

    const tip = document.createElement('div');
    tip.className = 'x-hover-tip';
    cont.appendChild(tip);

    let dragging = false, lastCheck = 0;
    canvas.addEventListener('pointerdown', () => { dragging = true; tip.classList.remove('show'); });
    window.addEventListener('pointerup', () => { dragging = false; });
    canvas.addEventListener('pointerleave', () => {
      tip.classList.remove('show');
      canvas.style.cursor = '';
    });

    canvas.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'touch' || dragging || (E._x && (E._x.challengeActive || E._x.isMicroscope))) {
        tip.classList.remove('show');
        canvas.style.cursor = '';
        return;
      }
      const now = performance.now();
      if (now - lastCheck < 35) return;
      lastCheck = now;

      const rect = canvas.getBoundingClientRect();
      sc.mouse.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
      sc.raycaster.setFromCamera(sc.mouse, sc.camera);

      let best = null;
      const hits = sc.raycaster.intersectObjects(st.clickables || [], false);
      for (let i = 0; i < hits.length; i++) {
        const h = hits[i], u = h.object.userData || {};
        if (!h.object.visible) continue;
        if (u.cond && !st.showCond) continue;
        if (u.dissectable && st.dissect > 0 && st.clipPlane && st.clipPlane.distanceToPoint(h.point) < 0) continue;
        const pr = u.priority !== undefined ? u.priority : 1;
        if (!best || pr > best.pr || (pr === best.pr && h.distance < best.h.distance)) best = { h, u, pr };
      }

      if (!best) {
        tip.classList.remove('show');
        canvas.style.cursor = '';
        return;
      }

      let key = best.u.key;
      if (best.u.resolve && st.kit && st.kit.frame) {
        key = best.u.resolve(st.kit.frame.worldToLocal(best.h.point.clone()));
      }
      const info = E.INFO && E.INFO[key];
      if (!info) {
        tip.classList.remove('show');
        canvas.style.cursor = '';
        return;
      }

      canvas.style.cursor = 'pointer';
      const lx = Math.max(70, Math.min(rect.width - 70, e.clientX - rect.left));
      const ly = Math.max(46, e.clientY - rect.top);
      tip.style.left = lx + 'px';
      tip.style.top = ly + 'px';
      tip.innerHTML = `${info[0]}<small>Klik untuk detail</small>`;
      tip.classList.add('show');
    });
  }

  /* ---------------------------------------------------------- BILAH PLAYBACK + PRESET KAMERA + PINTASAN GRAFIS */
  function attachViewportToolbar(E, cfg) {
    const cont = $(cfg.sceneId);
    const sc = E.state.scene;
    if (!cont || !sc) return;

    const dock = document.createElement('div');
    dock.className = 'x-dock';
    dock.id = cfg.sceneId + 'Dock';
    isolatePointer(dock);

    const speeds = [1, 0.5, 0.25, 1.5];
    let spIdx = 0;

    const presetHtml = cfg.presets.map((p, idx) =>
      `<button type="button" class="x-pill${idx === 0 ? ' active' : ''}" data-preset="${idx}" title="${p.title}">${p.label}</button>`
    ).join('');

    const initQ = getSavedQuality();
    const initMeta = GFX_META[initQ] || GFX_META.high;

    dock.innerHTML = `
      <button type="button" class="x-pill" data-act="pause" title="Jeda / Lanjutkan animasi 3D">
        <svg viewBox="0 0 24 24" aria-hidden="true">${ICON.pause}</svg><span>Jeda</span>
      </button>
      <button type="button" class="x-pill" data-act="speed" title="Kecepatan simulasi (Slow-Motion)">1×</button>
      <span class="x-dock-sep" aria-hidden="true"></span>
      ${presetHtml}
      <span class="x-dock-sep" data-gfx-sep aria-hidden="true"></span>
      <button type="button" class="x-pill gfx-pill${initQ === 'low' ? ' low' : ''}" data-act="gfx" title="Pintasan Kualitas Grafis 3D (klik untuk ganti: Tinggi / Sedang / Ringan)">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON.gear}</svg><span>${initMeta.short}</span>
      </button>
    `;
    cont.appendChild(dock);

    const btnPause = dock.querySelector('[data-act=pause]');
    const btnSpeed = dock.querySelector('[data-act=speed]');
    const btnGfx = dock.querySelector('[data-act=gfx]');
    const presetBtns = Array.from(dock.querySelectorAll('[data-preset]'));

    const updatePauseUI = () => {
      const p = !!sc.paused;
      btnPause.classList.toggle('paused', p);
      btnPause.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${p ? ICON.play : ICON.pause}</svg><span>${p ? 'Lanjut' : 'Jeda'}</span>`;
    };

    const syncGfxShortcut = (tier) => {
      const meta = GFX_META[tier] || GFX_META.high;
      if (btnGfx) {
        btnGfx.classList.toggle('low', tier === 'low');
        const sp = btnGfx.querySelector('span');
        if (sp) sp.textContent = meta.short;
      }
      if (typeof sc.setQuality === 'function') sc.setQuality(tier);
      const u = E._x && E._x.shaderUniforms;
      if (u && u.uXQuality) {
        u.uXQuality.value = tier === 'high' ? 2.0 : tier === 'medium' ? 1.0 : 0.0;
      }
      if (E._x && typeof E._x.onQualityChange === 'function') {
        E._x.onQualityChange(tier);
      }
    };

    _gfxListeners.push(syncGfxShortcut);

    btnPause.onclick = () => {
      snd('click');
      if (typeof sc.togglePause === 'function') sc.togglePause();
      updatePauseUI();
    };

    btnSpeed.onclick = () => {
      snd('click');
      spIdx = (spIdx + 1) % speeds.length;
      const val = speeds[spIdx];
      if (typeof sc.setTimeScale === 'function') sc.setTimeScale(val);
      btnSpeed.textContent = val + '×';
      btnSpeed.classList.toggle('active', val !== 1);
      toast(val < 1 ? `Mode gerak lambat (${val}×) aktif.` : val > 1 ? `Mode cepat (${val}×) aktif.` : 'Kecepatan normal (1×).', 'info');
    };

    btnGfx.onclick = () => {
      snd('click');
      cycleQuality();
    };

    presetBtns.forEach(b => {
      b.onclick = () => {
        snd('click');
        const pr = cfg.presets[Number(b.dataset.preset)];
        if (!pr) return;
        presetBtns.forEach(x => x.classList.remove('active'));
        b.classList.add('active');
        flyCamera(sc, new THREE.Vector3(...pr.pos), new THREE.Vector3(...pr.target), 820);
        if (typeof pr.onEnter === 'function') pr.onEnter(E);
      };
    });

    E._x = E._x || {};
    E._x.setDockHidden = (hide) => dock.classList.toggle('hide-for-hud', !!hide);
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

  /* ---------------------------------------------------------- MODE TANTANGAN (UMUM) */
  function createChallenge(E, cfg) {
    const st = E.state, sc = st.scene, N = 5;
    let active = false, queue = [], results = [], idx = 0, score = 0, tries = 0, lock = false, hud = null, btn = null, prevLabels = true, timer = 0;
    const nameOf = (k) => (E.INFO[k] || [k])[0];
    const pool = () => cfg.pool.filter(k => E.INFO[k] && (st.showCond || !cfg.cond.includes(k)));
    const syncLabels = (v) => { st.showLabels = v; const b = $(cfg.labelBtn); if (b) b.setAttribute('aria-pressed', String(v)); };

    const focusKey = (key) => {
      const kit = st.kit;
      if (!kit) return;
      const arr = kit.clickables.filter(o => o.userData && o.userData.key === key && o.visible);
      if (!arr.length) return;
      const c = new THREE.Vector3();
      new THREE.Box3().setFromObject(arr[0]).getCenter(c);
      const dir = sc.camera.position.clone().sub(sc.controls.target).normalize();
      if (dir.lengthSq() < 0.01) dir.set(0, 0.2, 1).normalize();
      flyCamera(sc, c.clone().addScaledVector(dir, 5.8), c, 700);
    };

    function paint(msg, cls) {
      if (!hud) return;
      hud.classList.remove('ok', 'bad'); void hud.offsetWidth; if (cls) hud.classList.add(cls);
      const dots = queue.map((_, k) => {
        const c = k < idx ? (results[k] ? 'ok' : 'bad') : k === idx ? 'cur' : '';
        return `<span class="x-dot ${c}"></span>`;
      }).join('');
      hud.innerHTML = `
        <div class="row sp">
          <div class="row"><b>Soal ${idx + 1}/${queue.length}</b><div class="x-dots">${dots}</div></div>
          <span>Skor: <b>${score}</b></span>
        </div>
        <div style="margin:.45rem 0;font-size:.94rem">${msg || `Klik bagian: <b>${nameOf(queue[idx])}</b>`}</div>
        <div class="row"><button type="button" data-a="skip">Lewati</button><button type="button" data-a="stop">Selesai</button></div>`;
      hud.querySelector('[data-a=skip]').onclick = () => { if (!lock) { results[idx] = false; advance(); } };
      hud.querySelector('[data-a=stop]').onclick = () => stop(false);
    }

    function start() {
      if (E._x && E._x.stopTour) E._x.stopTour();
      if (E._x && E._x.exitIsolation) E._x.exitIsolation();
      const p = pool();
      queue = (typeof Utils !== 'undefined' ? Utils.shuffle(p) : p).slice(0, N);
      if (!queue.length) return;
      results = [];
      idx = 0; score = 0; tries = 0; lock = false; active = true;
      E._x = E._x || {};
      E._x.challengeActive = true;
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
      if (E._x) E._x.challengeActive = false;
      if (hud) { hud.remove(); hud = null; }
      syncLabels(prevLabels);
      const ov = $(cfg.sceneId).querySelector('.scene-overlay'); if (ov) ov.style.display = '';
      if (btn) btn.setAttribute('aria-pressed', 'false');
      E.clearSelection();
      if (done) {
        record(cfg.exp, 'Tantangan kenali struktur', `${score} dari ${queue.length} benar`);
        const text = `Skormu ${score} dari ${queue.length}. ${score === queue.length ? 'Sempurna! Penguasaan anatomimu luar biasa.' : 'Coba lagi untuk memperbaiki skor.'}`;
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
        results[idx] = true;
        lock = true; snd('success');
        paint(`✔ Benar! Itu <b>${nameOf(key)}</b>.`, 'ok');
        timer = setTimeout(advance, 1450);
      } else {
        tries++; snd('error');
        if (tries >= 2) {
          lock = true; results[idx] = false;
          paint(`✖ Itu <b>${nameOf(key)}</b>. Jawabannya: <b>${nameOf(target)}</b> (kamera diarahkan).`, 'bad');
          E.select(target, true);
          focusKey(target);
          timer = setTimeout(advance, 2500);
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
     INISIALISASI VISUAL & SHADER SUITE
     ============================================================ */
  function enhanceVisuals(E, theme) {
    const st = E.state, sc = st.scene, kit = st.kit, T = THREE;
    const isHeart = theme === 'heart';

    if (typeof sc.enableSurgicalEnvironment === 'function') {
      sc.enableSurgicalEnvironment({
        accentColor: isHeart ? 0x67e8f9 : 0x7dd3fc,
        bounceColor: isHeart ? 0x3a101d : 0x102336
      });
    }

    if (typeof sc.enableStudioBackdrop === 'function') {
      if (isHeart) {
        sc.enableStudioBackdrop({ topColor: 0x1a0d19, midColor: 0x080a14, bottomColor: 0x020306, glowColor: 0x451226, moteColor: 0xfda4af, moteCount: 110 });
      } else {
        sc.enableStudioBackdrop({ topColor: 0x0b1928, midColor: 0x060d17, bottomColor: 0x020408, glowColor: 0x10334d, moteColor: 0x7dd3fc, moteCount: 110 });
      }
    }

    sc.renderer.toneMapping = T.ACESFilmicToneMapping;
    sc.renderer.toneMappingExposure = 1.12;
    if (sc.bloom) {
      sc.bloom.strength = 0.42;
      sc.bloom.radius = 0.52;
      sc.bloom.threshold = 0.90;
    }

    const subLight = new T.PointLight(isHeart ? 0xff3b5c : 0x38bdf8, 1.5, 14, 1.5);
    subLight.position.set(0, -0.35, -2.9);
    sc.scene.add(subLight);

    const initQ = getSavedQuality();
    const shared = {
      uTime: { value: 0 },
      uPulse: { value: 0 },
      uSmoke: { value: 0 },
      uQuality: { value: initQ === 'high' ? 2.0 : initQ === 'medium' ? 1.0 : 0.0 },
      uKeyDir: { value: new T.Vector3(-3, 5, 7).normalize() },
      uRimDir: { value: new T.Vector3(5, 2, -5).normalize() }
    };
    E._x = E._x || {};
    E._x.shaderUniforms = shared;

    const tex = getOrganTextures(theme);
    const seen = new Set();

    if (kit && kit.glass) {
      kit.glass.forEach((m) => {
        if (seen.has(m)) return;
        seen.add(m);
        const isVentricle = isHeart && kit.chambers && kit.chambers.leftVent && kit.chambers.leftVent.material === m;
        applyUltraOrganShader(m, shared, {
          isGlass: true,
          organ: isHeart ? 0 : 1,
          isVentricle,
          variant: isVentricle ? 'vent' : 'glass',
          normalMap: tex ? tex.normalMap : null,
          roughnessMap: tex ? tex.roughnessMap : null,
          normalScale: isVentricle ? 0.65 : 0.45,
          sssHex: isHeart ? 0xff3048 : 0xff6b84,
          veinHex: isHeart ? 0x520a18 : 0x4d1828
        });
      });
    }

    if (kit && kit.root) {
      kit.root.traverse((obj) => {
        if (!obj.isMesh || !obj.material) return;
        const m = obj.material;
        if (seen.has(m) || m.isShaderMaterial || m.isMeshBasicMaterial || (m.userData && m.userData.uTar)) return;
        if (!m.isMeshPhysicalMaterial && !m.isMeshStandardMaterial) return;
        seen.add(m);
        const key = (obj.userData && obj.userData.key) || '';
        const isValveOrCart = ['mitral', 'tri', 'aov', 'pov', 'larynx', 'trachea', 'rbronch', 'lbronch'].includes(key);
        const isAlv = key === 'alveoli';
        applyUltraOrganShader(m, shared, {
          isGlass: false,
          organ: isHeart ? 0 : 1,
          variant: isValveOrCart ? 'cart' : isAlv ? 'alv' : 'solid',
          normalMap: isValveOrCart ? null : (tex ? tex.normalMap : null),
          roughnessMap: tex ? tex.roughnessMap : null,
          normalScale: isAlv ? 0.25 : 0.4,
          sssHex: isValveOrCart ? 0xffe4b5 : isAlv ? 0xff8fab : (isHeart ? 0xc81d38 : 0xe05270),
          veinHex: isValveOrCart ? 0xb59c74 : 0x3b0912,
          sssStrength: isValveOrCart ? '0.45' : isAlv ? '0.52' : '0.26'
        });
      });
    }

    upgradeConductionShader(kit, shared, !isHeart);

    sc.addAnimation((el) => {
      shared.uTime.value = el;
      const ph = st.phase || 0;
      if (isHeart) {
        const pulse = S(0.2, 0.3, ph) - S(0.48, 0.65, ph);
        shared.uPulse.value = Math.max(0, pulse);
        subLight.intensity = 1.25 + 0.95 * Math.max(0, pulse);
      } else {
        const breath = S(0.02, 0.42, ph) - S(0.44, 0.88, ph);
        shared.uPulse.value = Math.max(0, breath);
        shared.uSmoke.value = st.smokeLevel || 0;
        subLight.intensity = 1.05 + 0.80 * Math.max(0, breath);
      }
    });
  }

  /* ============================================================
     JANTUNG — ANIMASI KATUP SEMILUNAR, TUR, INFARK
     ============================================================ */
  function heartSemilunarValves(E) {
    const st = E.state, kit = st.kit, sc = st.scene;
    const findGroup = (key) => {
      const hit = kit.clickables.find(o => o.userData && o.userData.key === key);
      return hit ? hit.parent : null;
    };
    const aovG = findGroup('aov');
    const povG = findGroup('pov');

    sc.addAnimation(() => {
      const ph = st.phase || 0;
      const semiOpen = S(0.23, 0.31, ph) - S(0.49, 0.57, ph);
      const scXZ = 1 + 0.24 * semiOpen;
      const scY = 1 - 0.16 * semiOpen;
      if (aovG) aovG.scale.set(scXZ, scY, scXZ);
      if (povG) povG.scale.set(scXZ, scY, scXZ);
    });
  }

  const HEART_STEPS = [
    { key: 'svc', cam: [-2.4, 2.1, 6.2], text: 'Darah miskin O₂ dari kepala dan tubuh bagian atas masuk lewat vena kava superior menuju jantung.' },
    { key: 'ra', cam: [-3.4, 1.2, 5.5], text: 'Serambi kanan menampung darah miskin O₂. Nodus SA di dindingnya mengirim impuls listrik pemicu setiap detak.' },
    { key: 'tri', cam: [-1.4, 0.9, 5.0], dissect: 46, text: 'Katup trikuspid (3 daun) terbuka saat diastol sehingga darah mengalir dari serambi kanan ke bilik kanan.' },
    { key: 'rv', cam: [-1.6, -0.3, 5.8], dissect: 32, text: 'Bilik kanan berkontraksi memompa darah menuju paru-paru. Dindingnya lebih tipis karena tekanan paru rendah.' },
    { key: 'pov', cam: [0.6, 1.3, 4.8], dissect: 45, text: 'Katup pulmonal terbuka saat sistol bilik, lalu menutup rapat agar darah tidak mengalir balik.' },
    { key: 'pulm', cam: [1.5, 2.3, 6.0], text: 'Arteri pulmonalis membawa darah miskin O₂ menuju paru-paru kiri dan kanan untuk pertukaran gas.' },
    { key: 'pv', cam: [1.6, 1.7, -6.2], text: 'Dari sisi belakang jantung, empat vena pulmonalis membawa darah segar kaya O₂ dari paru-paru kembali ke jantung.' },
    { key: 'la', cam: [1.0, 1.5, -5.6], text: 'Serambi kiri menampung darah kaya O₂, lalu mengalirkannya ke bilik kiri.' },
    { key: 'mitral', cam: [1.5, 0.9, 5.0], dissect: 50, text: 'Katup mitral (bikuspid, 2 daun) terbuka saat bilik relaks dan menutup kuat saat bilik kiri berkontraksi.' },
    { key: 'lv', cam: [2.8, -0.4, 5.6], dissect: 38, text: 'Bilik kiri berdinding otot paling tebal (±10–15 mm) untuk memompa darah ke seluruh tubuh melawan tekanan tinggi.' },
    { key: 'aov', cam: [0.0, 1.2, 4.7], dissect: 48, text: 'Katup aorta terbuka saat bilik kiri berkontraksi dan menutup saat relaksasi.' },
    { key: 'aorta', cam: [0.8, 2.6, 6.6], text: 'Aorta mengedarkan darah kaya O₂ ke seluruh tubuh, termasuk memberi makan otot jantung lewat arteri koroner!' }
  ];

  function heartTour(E) {
    const st = E.state, kit = st.kit, sc = st.scene, T = THREE, info = $('heartClickInfo');
    let active = false, i = 0, hud = null, btn = null, prevDissect = 0;

    const center = (key, all) => {
      const arr = kit.clickables.filter(o => o.userData && o.userData.key === key);
      if (!arr.length) return new T.Vector3(0, 0.4, 0);
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
      if (typeof E.applyDissect === 'function') E.applyDissect(s.dissect || 0);
      E.select(s.key, true);
      if (info) info.classList.remove('show');
      const tgt = target(s.key);
      flyCamera(sc, new T.Vector3(...s.cam), tgt, 920);
      const name = (E.INFO[s.key] || [s.key])[0];
      const pct = Math.round(((i + 1) / HEART_STEPS.length) * 100);
      hud.innerHTML = `
        <div class="row sp"><b>Tur Jantung • Langkah ${i + 1}/${HEART_STEPS.length}</b><span style="color:#93c5fd">${name}</span></div>
        <div class="x-prog"><i style="width:${pct}%"></i></div>
        <div style="margin:.35rem 0 .45rem">${s.text}</div>
        <div class="row">
          <button type="button" data-a="prev" ${i === 0 ? 'disabled' : ''}>◀ Sebelumnya</button>
          <button type="button" class="pri" data-a="next">${i === HEART_STEPS.length - 1 ? 'Selesai ✔' : 'Lanjut ▶'}</button>
          <button type="button" data-a="stop">Keluar</button>
        </div>`;
      hud.querySelector('[data-a=prev]').onclick = () => { if (i > 0) { snd('click'); i--; show(); } };
      hud.querySelector('[data-a=next]').onclick = () => { snd('click'); if (i < HEART_STEPS.length - 1) { i++; show(); } else stop(true); };
      hud.querySelector('[data-a=stop]').onclick = () => { snd('click'); stop(false); };
    }

    function start() {
      if (E._x && E._x.stopChallenge) E._x.stopChallenge();
      if (E._x && E._x.exitIsolation) E._x.exitIsolation();
      prevDissect = st.dissect || 0;
      active = true; i = 0; E.clearSelection();
      if (E._x && E._x.setDockHidden) E._x.setDockHidden(true);
      hud = mkHud('heartScene', 'bottom'); show();
      if (btn) btn.setAttribute('aria-pressed', 'true');
    }

    function stop(done) {
      if (!active) return;
      active = false;
      if (hud) { hud.remove(); hud = null; }
      if (E._x && E._x.setDockHidden) E._x.setDockHidden(false);
      if (btn) btn.setAttribute('aria-pressed', 'false');
      if (typeof E.applyDissect === 'function') E.applyDissect(prevDissect);
      E.clearSelection();
      sc.resetCamera(true);
      if (done) {
        toast('Tur aliran darah selesai! Uji pemahamanmu di Mode Tantangan.', 'success');
        record('heart', 'Tur aliran darah', 'Selesai (12 langkah)');
      }
    }

    btn = addSceneBtn('heartScene', { id: 'btnHeartTour', title: 'Tur berpemandu aliran darah', icon: ICON.tour, onclick: () => { snd('click'); active ? stop(false) : start(); } });
    E._x = E._x || {}; E._x.stopTour = () => stop(false);
  }

  function heartInfarct(E) {
    const st = E.state, kit = st.kit, sc = st.scene, T = THREE, V = (x, y, z) => new T.Vector3(x, y, z);
    const lad = kit.clickables.find(o => o.userData && o.userData.key === 'lad');
    const vent = kit.clickables.find(o => o.userData && o.userData.key === 'vent');
    if (!lad || !vent || typeof HeartKit === 'undefined') return;
    const corGroup = lad.parent, ventMat = vent.material, ventBase = ventMat.color.getHex();

    E.INFO.plaque = ['Plak Aterosklerosis (Penyumbatan Arteri Koroner)',
      'Timbunan lemak, kolesterol, dan kalsium pada dinding arteri koroner menyempitkan pembuluh sehingga aliran darah ke otot jantung terhambat. Area otot yang kekurangan O₂ (tampak gelap) mengalami <i>iskemia</i> dan bisa mati — inilah serangan jantung (infark miokardium). Pada EKG, segmen ST tampak naik.'];

    const surf = (t) => {
      const v = V(0.24 + 0.1 * t, 0.55 - 1.52 * t, 0);
      v.z = Math.sqrt(Math.max(0.02, 1 - v.x * v.x - v.y * v.y));
      const n = v.clone().normalize();
      return { p: HeartKit.vp(n.x, n.y, n.z, 1, 1).multiplyScalar(1.02), n };
    };

    const a = surf(0.3);
    const plaqueMat = new T.MeshPhysicalMaterial({ color: 0xfacc15, roughness: 0.32, clearcoat: 0.9, emissive: 0x854d0e, emissiveIntensity: 0.55 });
    const plaque = new T.Mesh(new T.SphereGeometry(0.09, 24, 16), plaqueMat);
    plaque.scale.set(1, 1.55, 1); plaque.position.copy(a.p); plaque.visible = false;
    plaque.userData = { key: 'plaque', priority: 2.6, dissectable: true };
    corGroup.add(plaque);

    const ringMat = new T.MeshBasicMaterial({ color: 0xfef08a, transparent: true, opacity: 0.8, side: T.DoubleSide, depthWrite: false });
    const ring = new T.Mesh(new T.RingGeometry(0.11, 0.145, 28), ringMat);
    ring.position.copy(a.p).addScaledVector(a.n, 0.04);
    ring.quaternion.setFromUnitVectors(V(0, 0, 1), a.n);
    ring.visible = false;
    ring.raycast = () => {};
    corGroup.add(ring);

    const b = surf(0.62);
    const zoneMat = new T.MeshBasicMaterial({ color: 0x260514, transparent: true, opacity: 0.52, depthWrite: false });
    const zone = new T.Mesh(new T.SphereGeometry(1, 32, 20), zoneMat);
    zone.scale.set(0.52, 0.65, 0.12);
    zone.position.copy(b.p).multiplyScalar(0.97);
    zone.quaternion.setFromUnitVectors(V(0, 0, 1), b.n);
    zone.renderOrder = 6; zone.visible = false;
    kit.frame.add(zone);
    const zOff = V(0, -0.32, -0.18);
    kit.explodables.push({ obj: zone, basePos: zone.position.clone(), targetPos: zone.position.clone().add(zOff), offset: zOff });
    kit.dissectables.push(plaqueMat, zoneMat, ringMat);

    const origEcg = E.ecgValue;
    E.ecgValue = function (ph) {
      let v = origEcg.call(this, ph);
      if (this.state.infarct) v += 0.22 * (S(0.215, 0.25, ph) - S(0.37, 0.43, ph));
      return v;
    };

    const btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'btn btn-primary'; btn.id = 'btnHeartInfarct';
    btn.textContent = 'Simulasikan penyumbatan koroner';
    const reset = $('btnResetHeart');
    if (reset && reset.parentElement) reset.parentElement.insertBefore(btn, reset);

    function setInfarct(on) {
      st.infarct = on; plaque.visible = on; zone.visible = on; ring.visible = on;
      const idx = kit.clickables.indexOf(plaque);
      if (on && idx < 0) kit.clickables.push(plaque);
      if (!on && idx >= 0) kit.clickables.splice(idx, 1);
      ventMat.color.setHex(on ? 0xb8697f : ventBase);
      btn.textContent = on ? 'Pulihkan aliran koroner' : 'Simulasikan penyumbatan koroner';
      if (on) btn.classList.replace('btn-primary', 'btn-secondary'); else btn.classList.replace('btn-secondary', 'btn-primary');
      if (on) {
        E.select('plaque', true);
        const wp = plaque.getWorldPosition(new T.Vector3());
        flyCamera(sc, wp.clone().add(V(0.8, 0.4, 4.6)), wp, 850);
        toast('Arteri koroner tersumbat! Amati area iskemia gelap, cincin kuning, dan segmen ST naik pada EKG.', 'info');
        record('heart', 'Penyumbatan arteri koroner', st.bpm + ' BPM, ST naik');
      } else if (st.selectedChamber === 'plaque') E.clearSelection();
    }
    btn.onclick = () => { snd('click'); setInfarct(!st.infarct); };
    if (reset) { const o = reset.onclick; reset.onclick = function (e) { if (o) o.call(this, e); setInfarct(false); }; }

    sc.addAnimation(() => {
      if (!st.infarct) return;
      const t = performance.now() * 0.004;
      zoneMat.opacity = 0.48 + 0.14 * Math.sin(t);
      const pulse = (t * 0.5) % 1;
      ring.scale.setScalar(1 + pulse * 1.45);
      ringMat.opacity = (1 - pulse) * 0.85;
    });
  }

  /* ============================================================
     PARU-PARU — RANGKA DADA, DIFUSI ALVEOLUS, TUR
     ============================================================ */
  function buildRibCage(kit) {
    const T = THREE, V = (x, y, z) => new T.Vector3(x, y, z), g = new T.Group();
    const bone = new T.MeshPhysicalMaterial({ color: 0xeee2c6, roughness: 0.44, clearcoat: 0.45, transparent: true, opacity: 0.62, depthWrite: false, envMapIntensity: 0.95 });
    const cartilage = new T.MeshPhysicalMaterial({ color: 0xbdd7e8, roughness: 0.28, clearcoat: 0.72, transparent: true, opacity: 0.56, depthWrite: false, envMapIntensity: 1.0 });
    const solidBone = new T.MeshPhysicalMaterial({ color: 0xdccfb0, roughness: 0.52, clearcoat: 0.3 });
    const parts = [];
    const add = (mesh) => { mesh.userData = { key: 'ribs', priority: 1.0, dissectable: true }; mesh.renderOrder = 3; g.add(mesh); parts.push(mesh); return mesh; };

    const ys = [1.28, 0.94, 0.60, 0.26, -0.08, -0.42, -0.76, -1.08];
    const A = (y) => 1.72 + 0.68 * S(1.3, -0.2, y) - 0.16 * S(-0.6, -1.3, y);
    ys.forEach((y0, ri) => [-1, 1].forEach((side) => {
      const a = A(y0), bonePts = [], cartPts = [], n = 18;
      for (let k = 0; k <= n; k++) {
        const f = k / n, phi = f * Math.PI;
        const pt = V(side * (0.22 + (a - 0.22) * Math.sin(phi)), y0 - 0.42 * f + 0.06 * Math.sin(phi), -1.24 * Math.cos(phi));
        if (f <= 0.78) bonePts.push(pt);
        if (f >= 0.72) cartPts.push(pt);
      }
      add(new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(bonePts), 36, 0.036, 8, false), bone));
      if (ri < 7 && cartPts.length >= 2) {
        add(new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(cartPts), 14, 0.032, 8, false), cartilage));
      }
    }));

    const manub = add(new T.Mesh(new T.BoxGeometry(0.68, 0.52, 0.13), bone));
    manub.position.set(0, 1.06, 1.24);
    const body = add(new T.Mesh(new T.BoxGeometry(0.46, 1.48, 0.11), bone));
    body.position.set(0, 0.05, 1.24);
    const xiph = add(new T.Mesh(new T.ConeGeometry(0.14, 0.34, 8), cartilage));
    xiph.rotation.x = Math.PI;
    xiph.position.set(0, -0.82, 1.24);

    for (let k = 0; k < 10; k++) {
      const y = 1.48 - k * 0.31;
      const v = add(new T.Mesh(new T.CylinderGeometry(0.14, 0.14, 0.22, 16), solidBone));
      v.position.set(0, y, -1.24);
      const sp = add(new T.Mesh(new T.BoxGeometry(0.07, 0.14, 0.22), solidBone));
      sp.position.set(0, y - 0.04, -1.42);
      sp.rotation.x = 0.45;
    }

    g.visible = false;
    kit.frame.add(g);
    return { group: g, parts, mats: [bone, cartilage, solidBone], bone, cartilage };
  }

  function lungsRibs(E) {
    const st = E.state, kit = st.kit, sc = st.scene;
    E.INFO.ribs = ['Rangka Dada: Tulang Rusuk, Tulang Rawan Kosta & Sternum',
      'Rongga dada dibentuk oleh tulang rusuk, tulang rawan kosta (biru pucat), tulang dada (sternum), dan ruas tulang belakang. Saat <b>inspirasi</b>, otot interkostal eksternal mengangkat rusuk ke atas dan ke luar (gerak <i>bucket-handle</i> & <i>pump-handle</i>), volume dada membesar, tekanan paru turun, lalu udara masuk.'];
    const rc = buildRibCage(kit);
    rc.mats.forEach(m => kit.dissectables.push(m));
    let on = false, clickable = false;
    const setClickable = (f) => {
      if (f === clickable) return; clickable = f;
      rc.parts.forEach(p => { const i = kit.clickables.indexOf(p); if (f && i < 0) kit.clickables.push(p); if (!f && i >= 0) kit.clickables.splice(i, 1); });
    };
    const btn = addSceneBtn('lungsScene', {
      id: 'btnLungsRibs', title: 'Tampilkan rangka dada', icon: ICON.ribs, pressed: false,
      onclick: () => setVisible(!on, true)
    });

    function setVisible(val, announce = false) {
      on = !!val;
      if (btn) btn.setAttribute('aria-pressed', String(on));
      snd('click');
      if (on && announce) {
        E.select('ribs', true);
        toast('Rangka dada tampil. Amati tulang rusuk terangkat ke luar saat inspirasi.', 'info');
      } else if (!on && st.selectedPart === 'ribs') E.clearSelection();
    }
    E._x = E._x || {};
    E._x.setRibs = setVisible;

    sc.addAnimation(() => {
      const ph = st.phase || 0, breath = S(0.02, 0.42, ph) - S(0.44, 0.88, ph);
      const strength = (st.depth / 100) * (st.type === 'normal' ? 0.65 : st.type === 'dalam' ? 0.88 : 1.15) * (st.smokeFactor || 1);
      const e = breath * strength;
      const f = 1 - (st.explode || 0);
      rc.group.scale.set(1 + 0.042 * e, 1 + 0.015 * e, 1 + 0.048 * e);
      rc.group.position.y = 0.085 * e;
      rc.bone.opacity = 0.62 * f;
      rc.cartilage.opacity = 0.56 * f;
      const vis = on && f > 0.03;
      rc.group.visible = vis; setClickable(vis);
    });
  }

  function lungsAlveolarGlow(E) {
    const st = E.state, kit = st.kit, sc = st.scene, T = THREE;

    const alvCount = kit.alveoli ? kit.alveoli.length : 0;
    const perAlv = 8;
    const total = alvCount * perAlv;
    let diffPts = null, diffSeeds = [];
    if (total > 0) {
      const pos = new Float32Array(total * 3), col = new Float32Array(total * 3);
      const rnd = makeRnd(88421);
      for (let i = 0; i < total; i++) {
        const ai = Math.floor(i / perAlv);
        const th = rnd() * Math.PI * 2, ph = Math.acos(2 * rnd() - 1);
        const dir = new T.Vector3(Math.sin(ph) * Math.cos(th), Math.cos(ph), Math.sin(ph) * Math.sin(th));
        diffSeeds.push({ ai, dir, off: rnd(), isO2: i % 2 === 0 });
        if (i % 2 === 0) { col[i * 3] = 0.35; col[i * 3 + 1] = 0.82; col[i * 3 + 2] = 1.0; }
        else { col[i * 3] = 1.0; col[i * 3 + 1] = 0.36; col[i * 3 + 2] = 0.32; }
      }
      const g = new T.BufferGeometry();
      g.setAttribute('position', new T.BufferAttribute(pos, 3));
      g.setAttribute('color', new T.BufferAttribute(col, 3));
      diffPts = new T.Points(g, new T.PointsMaterial({
        size: 0.075, map: kit.glowTex, vertexColors: true, transparent: true, opacity: 0.85,
        depthWrite: false, blending: T.AdditiveBlending, sizeAttenuation: true
      }));
      diffPts.frustumCulled = false;
      diffPts.raycast = () => {};
      kit.frame.add(diffPts);
    }

    const alvFirst = kit.alveoli && kit.alveoli[0] && kit.alveoli[0].children[0];
    const alvMat = alvFirst ? alvFirst.material : null;
    const cOxy = new T.Color(0x38bdf8), cBase = new T.Color(0xf43f5e);

    sc.addAnimation((el) => {
      const ph = st.phase || 0;
      const breath = S(0.02, 0.42, ph) - S(0.44, 0.88, ph);
      const smk = st.smokeLevel || 0;

      if (alvMat && st.selectedPart !== 'alveoli') {
        const o2Peak = Math.max(0, breath) * (1 - 0.65 * smk);
        alvMat.emissive.copy(cBase).lerp(cOxy, o2Peak * 0.78);
        alvMat.emissiveIntensity = 0.22 + 0.55 * o2Peak;
      }

      if (diffPts) {
        diffPts.visible = st.showCond && (st.explode || 0) < 0.08;
        if (diffPts.visible) {
          const arr = diffPts.geometry.attributes.position.array;
          for (let i = 0; i < diffSeeds.length; i++) {
            const d = diffSeeds[i], alv = kit.alveoli[d.ai];
            const cycle = (el * (0.65 - 0.25 * smk) + d.off) % 1;
            const rad = d.isO2 ? (0.07 + cycle * 0.16) : (0.23 - cycle * 0.16);
            arr[i * 3] = alv.position.x + d.dir.x * rad;
            arr[i * 3 + 1] = alv.position.y + d.dir.y * rad;
            arr[i * 3 + 2] = alv.position.z + d.dir.z * rad;
          }
          diffPts.geometry.attributes.position.needsUpdate = true;
          diffPts.material.opacity = (0.35 + 0.55 * Math.max(0, breath)) * (1 - 0.5 * smk);
        }
      }
    });
  }

  const LUNGS_STEPS = [
    { key: 'larynx', cam: [0, 3.1, 5.2], text: 'Udara masuk melewati laring (kotak suara). Katup epiglotis memastikan makanan tidak salah masuk ke saluran napas.' },
    { key: 'trachea', cam: [-1.4, 2.2, 5.4], text: 'Trakea diperkuat cincin tulang rawan berbentuk huruf C agar saluran tetap terbuka saat tekanan dada berubah.' },
    { key: 'carina', cam: [0.5, 1.4, 4.8], text: 'Di karina trakea, saluran napas bercabang dua menjadi bronkus utama kanan dan kiri.' },
    { key: 'rbronch', cam: [-1.8, 1.0, 5.2], dissect: 42, text: 'Bronkus utama kanan lebih pendek dan lebar, menghantarkan udara menuju 3 lobus paru-paru kanan.' },
    { key: 'bronchiole', cam: [2.2, 0.4, 4.6], dissect: 52, text: 'Di dalam parenkim paru, bronkus bercabang halus menjadi bronkiolus berotot polos yang mengatur distribusi udara.' },
    { key: 'alveoli', cam: [2.3, 0.2, 3.2], dissect: 55, text: 'Di jutaan kantung alveolus inilah terjadi difusi gas: O₂ (biru) masuk ke darah dan CO₂ (merah) dilepaskan untuk dihembuskan!' },
    { key: 'pulmv', cam: [0.2, 0.6, 5.2], dissect: 45, text: 'Arteri pulmonalis membawa darah kaya CO₂ ke kapiler alveolus, sementara vena pulmonalis mengembalikan darah kaya O₂ ke jantung.' },
    { key: 'diaphragm', cam: [0.8, -1.6, 6.2], text: 'Otot diafragma berkontraksi dan mendatar saat inspirasi, memperbesar rongga dada sehingga udara tersedot masuk.' },
    { key: 'ribs', cam: [2.6, 0.7, 7.6], ribs: true, text: 'Rangka dada (rusuk & sternum) melindungi paru sekaligus terangkat ke luar saat inspirasi. Siklus pernapasan selesai!' }
  ];

  function lungsTour(E) {
    const st = E.state, kit = st.kit, sc = st.scene, T = THREE, info = $('lungsClickInfo');
    let active = false, i = 0, hud = null, btn = null, prevDissect = 0;

    const target = (key) => {
      const ancMap = { trachea: 'tracheaL', rbronch: 'rbronchL', carina: 'carina', bronchiole: 'bronchioleL', alveoli: 'alveoliL', pulmv: 'pulmvL', diaphragm: 'diaphragmL' };
      if (ancMap[key] && kit.anchors[ancMap[key]]) return kit.anchors[ancMap[key]].getWorldPosition(new T.Vector3());
      const hit = kit.clickables.find(o => o.userData && o.userData.key === key);
      if (hit) return new T.Box3().setFromObject(hit).getCenter(new T.Vector3());
      return new T.Vector3(0, 0.3, 0);
    };

    function show() {
      const s = LUNGS_STEPS[i];
      if (typeof E.applyDissect === 'function') E.applyDissect(s.dissect || 0);
      if (E._x && E._x.setRibs) E._x.setRibs(!!s.ribs, false);
      E.select(s.key, true);
      if (info) info.classList.remove('show');
      flyCamera(sc, new T.Vector3(...s.cam), target(s.key), 920);
      const name = (E.INFO[s.key] || [s.key])[0];
      const pct = Math.round(((i + 1) / LUNGS_STEPS.length) * 100);
      hud.innerHTML = `
        <div class="row sp"><b>Tur Pernapasan • Langkah ${i + 1}/${LUNGS_STEPS.length}</b><span style="color:#7dd3fc">${name}</span></div>
        <div class="x-prog"><i style="width:${pct}%"></i></div>
        <div style="margin:.35rem 0 .45rem">${s.text}</div>
        <div class="row">
          <button type="button" data-a="prev" ${i === 0 ? 'disabled' : ''}>◀ Sebelumnya</button>
          <button type="button" class="pri" data-a="next">${i === LUNGS_STEPS.length - 1 ? 'Selesai ✔' : 'Lanjut ▶'}</button>
          <button type="button" data-a="stop">Keluar</button>
        </div>`;
      hud.querySelector('[data-a=prev]').onclick = () => { if (i > 0) { snd('click'); i--; show(); } };
      hud.querySelector('[data-a=next]').onclick = () => { snd('click'); if (i < LUNGS_STEPS.length - 1) { i++; show(); } else stop(true); };
      hud.querySelector('[data-a=stop]').onclick = () => { snd('click'); stop(false); };
    }

    function start() {
      if (E._x && E._x.stopChallenge) E._x.stopChallenge();
      if (E._x && E._x.exitIsolation) E._x.exitIsolation();
      prevDissect = st.dissect || 0;
      active = true; i = 0; E.clearSelection();
      if (E._x && E._x.setDockHidden) E._x.setDockHidden(true);
      hud = mkHud('lungsScene', 'bottom'); show();
      if (btn) btn.setAttribute('aria-pressed', 'true');
    }

    function stop(done) {
      if (!active) return;
      active = false;
      if (hud) { hud.remove(); hud = null; }
      if (E._x && E._x.setDockHidden) E._x.setDockHidden(false);
      if (btn) btn.setAttribute('aria-pressed', 'false');
      if (typeof E.applyDissect === 'function') E.applyDissect(prevDissect);
      E.clearSelection();
      sc.resetCamera(true);
      if (done) {
        toast('Tur saluran napas selesai! Coba Mode Tantangan untuk menguji ingatanmu.', 'success');
        record('lungs', 'Tur aliran udara', 'Selesai (9 langkah)');
      }
    }

    btn = addSceneBtn('lungsScene', { id: 'btnLungsTour', title: 'Tur berpemandu aliran udara & difusi', icon: ICON.tour, onclick: () => { snd('click'); active ? stop(false) : start(); } });
    E._x = E._x || {}; E._x.stopTour = () => stop(false);
  }

  /* ============================================================
     PARTIKEL REALISTIS (ERITROSIT HEMOGLOBIN SSS, LEUKOSIT, TROMBOSIT, O2, CO2)
     ============================================================ */
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
    if (!afterEl) return null;
    const card = document.createElement('div');
    card.className = 'x-card';
    card.innerHTML = `<h4>${title}</h4><div class="x-chips">${chipsHtml}</div>
      <div class="x-row" style="margin-top:.6rem"><span style="font-size:.74rem">Gaya tampilan partikel</span>
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
    const instancedMeshes = [];
    const mat = (o) => new T.MeshPhysicalMaterial(Object.assign({ roughness: 0.28, clearcoat: 0.85, clearcoatRoughness: 0.22, envMapIntensity: 1.15, side: T.DoubleSide }, o));

    const rbcMat = mat({ color: 0xffffff, emissive: 0x320508 });
    rbcMat.customProgramCacheKey = () => 'xRbcHemoglobinV11';
    rbcMat.onBeforeCompile = (sh) => {
      sh.fragmentShader = sh.fragmentShader.replace('#include <opaque_fragment>', `
        vec3 rN = normalize(vNormal) * (gl_FrontFacing ? 1.0 : -1.0);
        vec3 rV = normalize(vViewPosition);
        float rNdV = clamp(abs(dot(rN, rV)), 0.0, 1.0);
        float rEdge = pow(1.0 - rNdV, 2.2);
        vec3 rCol = outgoingLight * (0.88 + 0.35 * rNdV) + diffuseColor.rgb * (0.28 * rNdV + 0.32 * rEdge);
        gl_FragColor = vec4(rCol, diffuseColor.a);
      `);
    };

    const make = (geo, material, n, size) => {
      const mesh = new T.InstancedMesh(geo, material, n);
      mesh.instanceMatrix.setUsage(T.DynamicDrawUsage); mesh.frustumCulled = false;
      mesh.raycast = () => {};
      mesh.userData.maxCount = n;
      group.add(mesh);
      instancedMeshes.push(mesh);
      for (let i = 0; i < n; i++) {
        const pi = i % 4, ang = rnd() * Math.PI * 2, rr = Math.sqrt(rnd()) * size.spread;
        items.push({ mesh, i, path: kit.paths[pi], deoxy: pi < 2, t: rnd(), v: 0.75 + rnd() * 0.5,
          ox: Math.cos(ang) * rr, oy: Math.sin(ang) * rr, a0: rnd() * 6.283, ar: (rnd() - 0.5) * 3,
          sc: size.min + rnd() * (size.max - size.min), lam: 1 - 0.5 * Math.pow(rr / size.spread, 2) });
      }
      kit.dissectables.push(material);
      return mesh;
    };

    const rbc = make(rbcGeometry(0.06), rbcMat, 340, { spread: 0.1, min: 0.85, max: 1.15 });
    const OXY = new T.Color(0xe6292e), DEOXY = new T.Color(0x8c1e34), tc = new T.Color();
    items.forEach((it) => { if (it.mesh === rbc) { tc.copy(it.deoxy ? DEOXY : OXY).multiplyScalar(0.88 + rnd() * 0.24); rbc.setColorAt(it.i, tc); } });
    rbc.instanceColor.needsUpdate = true;

    const wGeo = new T.SphereGeometry(0.08, 22, 14), wp = wGeo.attributes.position;
    for (let i = 0; i < wp.count; i++) {
      const x = wp.getX(i), y = wp.getY(i), z = wp.getZ(i), n = 1 + 0.09 * Math.sin(x * 43) * Math.cos(y * 37 + 1) * Math.sin(z * 41 + 2);
      wp.setXYZ(i, x * n, y * n, z * n);
    }
    wGeo.computeVertexNormals();
    make(wGeo, mat({ color: 0xece5d5, roughness: 0.58, clearcoat: 0.35 }), 12, { spread: 0.12, min: 0.9, max: 1.2 });

    const pGeo = new T.SphereGeometry(0.03, 10, 8); pGeo.scale(1, 0.4, 1);
    make(pGeo, mat({ color: 0xcda9ba, roughness: 0.55 }), 54, { spread: 0.12, min: 0.9, max: 1.3 });

    E._x = E._x || {};
    E._x.onQualityChange = (tier) => {
      const ratio = tier === 'high' ? 1.0 : tier === 'medium' ? 0.65 : 0.36;
      instancedMeshes.forEach(m => {
        m.count = Math.max(4, Math.round(m.userData.maxCount * ratio));
      });
    };
    E._x.onQualityChange(getSavedQuality());

    const oldParticles = st.particles.slice();
    st.particles.length = 0;
    let realistic = true;
    const after = $('heartEcg') && $('heartEcg').closest('.control-group');
    const legend = particleLegend(after,
      'Partikel dalam darah',
      `<span class="x-chip"><i style="color:#e6292e;font-style:normal">●</i> Eritrosit kaya O₂</span>
       <span class="x-chip"><i style="color:#8c1e34;font-style:normal">●</i> Eritrosit miskin O₂</span>
       <span class="x-chip"><i style="color:#ece5d5;font-style:normal">●</i> Leukosit</span>
       <span class="x-chip"><i style="color:#cda9ba;font-style:normal">●</i> Trombosit</span>`,
      (v) => { realistic = v; st.particles.length = 0; if (!v) oldParticles.forEach(p => st.particles.push(p)); });
    if (legend) legend.id = 'xHeartLegend';

    const P0 = new T.Vector3(), P1 = new T.Vector3(), Tn = new T.Vector3(), N = new T.Vector3(), B = new T.Vector3(),
      ref = new T.Vector3(), ax = new T.Vector3(), Z = new T.Vector3(), pos = new T.Vector3(), M = new T.Matrix4(), S3 = new T.Vector3();
    let last = 0;
    sc.addAnimation((el) => {
      const dt = Math.min(0.1, Math.max(0, el - last)); last = el;
      st.bloodParticles.visible = !realistic;
      group.visible = realistic && (st.explode || 0) < 0.05;
      if (!group.visible) return;
      const ph = st.phase || 0, pulse = S(0.24, 0.34, ph) - S(0.55, 0.7, ph);
      const infFactor = st.infarct ? 0.78 : 1.0;
      const base = dt * 0.1 * (st.bpm / 75) * (0.75 + 0.85 * pulse) * infFactor;
      for (let k = 0; k < items.length; k++) {
        const it = items[k];
        if (it.i >= it.mesh.count) continue;
        it.t = (it.t + base * it.v * it.lam) % 1;
        const tt = Math.min(it.t, 0.994);
        it.path.curve.getPoint(tt, P0); it.path.curve.getPoint(tt + 0.005, P1);
        Tn.subVectors(P1, P0).normalize();
        ref.set(0, 1, 0); if (Math.abs(Tn.y) > 0.9) ref.set(1, 0, 0);
        N.crossVectors(ref, Tn).normalize(); B.crossVectors(Tn, N);
        pos.copy(P0).addScaledVector(N, it.ox).addScaledVector(B, it.oy);
        const a = it.a0 + el * it.ar;
        ax.copy(N).multiplyScalar(Math.cos(a)).addScaledVector(B, Math.sin(a));
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
    const group = new T.Group(); kit.frame.add(group);
    const o2Geo = atomsGeometry([{ p: [-0.045, 0, 0], r: 0.042, c: 0x59b6ff }, { p: [0.045, 0, 0], r: 0.042, c: 0x59b6ff }]);
    const co2Geo = atomsGeometry([{ p: [0, 0, 0], r: 0.034, c: 0x4a5160 }, { p: [-0.095, 0, 0], r: 0.042, c: 0xff4538 }, { p: [0.095, 0, 0], r: 0.042, c: 0xff4538 }]);
    const mat = new T.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.22, metalness: 0.08, clearcoat: 0.9, clearcoatRoughness: 0.15, emissive: 0x1b2432, emissiveIntensity: 0.55 });
    kit.dissectables.push(mat);
    const items = [];
    const instancedMeshes = [];
    const make = (geo, n, pathIds, kind) => {
      const mesh = new T.InstancedMesh(geo, mat, n);
      mesh.instanceMatrix.setUsage(T.DynamicDrawUsage); mesh.frustumCulled = false;
      mesh.raycast = () => {};
      mesh.userData.maxCount = n;
      group.add(mesh);
      instancedMeshes.push(mesh);
      for (let i = 0; i < n; i++) {
        const ang = rnd() * 6.283, rr = Math.sqrt(rnd()) * 0.05;
        items.push({ mesh, i, kind, path: kit.paths[pathIds[i % pathIds.length]], t: rnd(), v: 0.8 + rnd() * 0.4,
          ox: Math.cos(ang) * rr, oy: Math.sin(ang) * rr, r0: [rnd() * 6.28, rnd() * 6.28, rnd() * 6.28], w: [0.6 + rnd() * 1.4, 0.6 + rnd() * 1.4], ph: rnd() * 6.28 });
      }
    };
    make(o2Geo, 96, [0, 1, 2, 3], 'o2');
    make(co2Geo, 64, [4, 5], 'co2');

    E._x = E._x || {};
    E._x.onQualityChange = (tier) => {
      const ratio = tier === 'high' ? 1.0 : tier === 'medium' ? 0.65 : 0.38;
      instancedMeshes.forEach(m => {
        m.count = Math.max(8, Math.round(m.userData.maxCount * ratio));
      });
    };
    E._x.onQualityChange(getSavedQuality());

    const oldParticles = st.particles.slice();
    st.particles.length = 0;
    let realistic = true;
    const after = afterEl || document.querySelector('#panelLungs .stat-grid');
    particleLegend(after,
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
      group.visible = realistic && st.showCond && (st.explode || 0) < 0.05;
      if (!group.visible) return;
      const ph = st.phase || 0;
      const wi = ph > 0.02 && ph < 0.44 ? Math.sin(Math.PI * (ph - 0.02) / 0.42) : 0;
      const wo = ph > 0.44 && ph < 0.88 ? Math.sin(Math.PI * (ph - 0.44) / 0.44) : 0;
      const strength = (st.depth / 100) * (st.type === 'normal' ? 0.65 : st.type === 'dalam' ? 0.88 : 1.15) * (st.smokeFactor || 1);
      const dph = dt * st.rpm / 60, sF = 0.4 + 0.6 * Math.min(1, strength);
      for (let k = 0; k < items.length; k++) {
        const it = items[k];
        if (it.i >= it.mesh.count) continue;
        const o2 = it.kind === 'o2';
        it.t += dph * 2.6 * (o2 ? wi : wo) * sF * it.v;
        if (it.t >= 1) it.t = 0;
        const tt = Math.min(it.t, 0.994);
        it.path.curve.getPoint(tt, P0); it.path.curve.getPoint(tt + 0.005, P1);
        Tn.subVectors(P1, P0).normalize();
        ref.set(0, 1, 0); if (Math.abs(Tn.y) > 0.9) ref.set(1, 0, 0);
        N.crossVectors(ref, Tn).normalize(); B.crossVectors(Tn, N);
        const jx = 0.012 * Math.sin(el * 3 + it.ph), jy = 0.012 * Math.cos(el * 2.3 + it.ph);
        pos.copy(P0).addScaledVector(N, it.ox + jx).addScaledVector(B, it.oy + jy);
        const narrow = o2 ? 1 - 0.6 * S(0.45, 0.75, it.t) : 0.4 + 0.6 * S(0.25, 0.55, it.t);
        const s = narrow * Math.min(1, it.t / 0.04, (1 - it.t) / 0.04);
        eu.set(it.r0[0] + el * it.w[0], it.r0[1] + el * it.w[1], it.r0[2]);
        M.makeRotationFromEuler(eu); M.scale(S3.set(s, s, s)); M.setPosition(pos);
        it.mesh.setMatrixAt(it.i, M);
      }
      group.children.forEach(m => { m.instanceMatrix.needsUpdate = true; });
    });
  }

  /* ---------------------------------------------------------- ZOOM KE DALAM ORGAN */
  function zoomInside(E) {
    const st = E.state, sc = st.scene, kit = st.kit, cam = sc.camera, ctl = sc.controls;
    if (!ctl || !cam) return;
    ctl.minDistance = 0.14;
    cam.near = 0.03; cam.updateProjectionMatrix();
    if ('zoomSpeed' in ctl) ctl.zoomSpeed = Math.max(ctl.zoomSpeed || 1, 1.15);
    const glass = (kit.glass || []).filter(m => m.userData && m.userData.minU);
    const rec = glass.map(m => ({ op: m.opacity, mu: m.userData.minU.value, wOp: m.opacity, wMu: m.userData.minU.value }));
    let k = 0;
    sc.addAnimation(() => {
      if (E._x && (E._x.isIsolated || E._x.isMicroscope)) return;
      const d = cam.position.distanceTo(ctl.target);
      const goal = 1 - S(0.85, 2.7, d);
      k += (goal - k) * 0.12;
      if (goal === 0 && k < 0.002) k = 0;
      glass.forEach((m, i) => {
        const r = rec[i], u = m.userData.minU;
        if (m.opacity !== r.wOp) r.op = m.opacity;
        if (u.value !== r.wMu) r.mu = u.value;
        r.wOp = Math.min(1, r.op * (1 + 0.35 * k));
        r.wMu = r.mu + (0.8 - r.mu) * k;
        m.opacity = r.wOp; u.value = r.wMu;
      });
    });
  }

  /* ============================================================
     ATTACH KE JANTUNG & PARU-PARU
     ============================================================ */
  function attachHeart(E) {
    injectStyle();
    mountHomeQualitySelector();
    patchBreathAudioPause();
    E._x = E._x || {};
    document.querySelectorAll('#heartScene .scene-controls [id*="ireframe"]').forEach(b => b.remove());
    guardTraceOnPause(E, 'drawEcg');
    enhanceVisuals(E, 'heart');
    attachHoverInspector(E, 'heartScene');
    heartSemilunarValves(E);
    heartTour(E);
    sceneFullscreen('heartScene');
    heartCells(E);
    heartInfarct(E);
    zoomInside(E);
    attachIsolationMode(E, {
      sceneId: 'heartScene', infoBoxId: 'heartClickInfo', selProp: 'selectedChamber', exp: 'heart'
    });
    attachViewportToolbar(E, {
      sceneId: 'heartScene', exp: 'jantung',
      presets: [
        { label: 'Depan', title: 'Tampak depan (Anterior)', pos: [0, 0.6, 9.4], target: [0, 0.55, 0] },
        { label: 'Belakang', title: 'Tampak belakang (Posterior: Vena Pulmonalis)', pos: [0.3, 0.9, -9.0], target: [0, 0.6, 0] },
        { label: 'Atas', title: 'Tampak atas (Aorta & Arteri Pulmonalis)', pos: [0.2, 8.2, 2.8], target: [0, 0.7, 0] },
        { label: 'Dalam', title: 'Endoskopi: masuk melihat katup & bilik', pos: [0.2, 0.5, 2.15], target: [0.1, 0.25, -0.15] }
      ]
    });
    createChallenge(E, {
      sceneId: 'heartScene', labelBtn: 'btnLabels', btnId: 'btnHeartChallenge', exp: 'heart',
      pool: ['lv', 'rv', 'ra', 'la', 'aorta', 'pulm', 'svc', 'ivc', 'pv', 'mitral', 'tri', 'aov', 'pov', 'sa', 'av', 'his'],
      cond: ['sa', 'av', 'his', 'lbb', 'rbb']
    });
  }

  function attachLungs(E) {
    injectStyle();
    mountHomeQualitySelector();
    patchBreathAudioPause();
    E._x = E._x || {};
    guardTraceOnPause(E, 'drawSpirogram');
    enhanceVisuals(E, 'lungs');
    attachHoverInspector(E, 'lungsScene');
    lungsRibs(E);
    lungsAlveolarGlow(E);
    lungsTour(E);
    sceneFullscreen('lungsScene');
    lungsMolecules(E, document.querySelector('#panelLungs .stat-grid'));
    zoomInside(E);
    attachIsolationMode(E, {
      sceneId: 'lungsScene', infoBoxId: 'lungsClickInfo', selProp: 'selectedPart', exp: 'lungs'
    });
    attachViewportToolbar(E, {
      sceneId: 'lungsScene', exp: 'paru',
      presets: [
        { label: 'Depan', title: 'Tampak depan (Anterior)', pos: [0, 0.45, 9.6], target: [0, 0.35, 0] },
        { label: 'Belakang', title: 'Tampak belakang (Posterior)', pos: [0, 0.5, -9.4], target: [0, 0.35, 0] },
        { label: 'Alveolus', title: 'Zoom dekat ke gugus Alveolus', pos: [2.2, 0.15, 3.0], target: [1.3, 0.0, 0.2] },
        { label: 'Bronkus', title: 'Endoskopi: masuk melihat percabangan Karina & Bronkus', pos: [0.15, 1.35, 2.2], target: [0, 0.9, 0] }
      ]
    });
    attachAlveolusMicroscope(E);
    createChallenge(E, {
      sceneId: 'lungsScene', labelBtn: 'btnLungsLabels', btnId: 'btnLungsChallenge', exp: 'lungs',
      pool: ['larynx', 'trachea', 'carina', 'rbronch', 'lbronch', 'bronchiole', 'alveoli', 'rsup', 'rmid', 'rinf', 'lsup', 'linf', 'notch', 'pulmv', 'diaphragm'],
      cond: ['carina', 'bronchiole']
    });
  }

  /* ---------------------------------------------------------- PASANG */
  if (typeof HeartExperiment !== 'undefined') wrapInit(HeartExperiment, attachHeart);
  if (typeof LungsExperiment !== 'undefined') wrapInit(LungsExperiment, attachLungs);
})();
