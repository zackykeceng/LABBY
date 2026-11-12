/* APP.JS - Main Application & Navigation */
const App = {
  experiments: {},
  currentExp: 0,

  init() {
    Progress.init();
    console.log('Labby - memulai');
    
    if (typeof Sound !== 'undefined') {
      Sound.setEnabled(false);
    }

    this.setupAudioUnlock();
    this.registerExperiments();
    this.renderAllExperiments();
    this.bindTabs();
    this.bindHeaderButtons();
    this.bindScrollTop();
    this.hideLoading();
    this.bindSliderFill();
    updateHomeProgress();
    Progress.updateHeaderProgress();

    const btnBack = document.getElementById('btnBackToHome');
    if (btnBack) {
      btnBack.addEventListener('click', () => this.goHome());
    }

    // Hover sound & "Wake Up" Audio untuk kartu di Home
    document.querySelectorAll('.subject-card').forEach(card => {
      card.addEventListener('mouseenter', () => {
        if (typeof Sound !== 'undefined') Sound.wakeUp(); // Bangunkan audio
      });
    });

    console.log('Labby siap');
  },

  openExperiment(index) {
    // 1. Bunyikan suara klik (sama persis dengan di materi)
    if (typeof Sound !== 'undefined') {
      Sound.click(true);
    }

    // 2. Jalankan transisi visual
    const transition = document.getElementById('pageTransition');
    transition.classList.add('active');

    setTimeout(() => {
      document.getElementById('homeScreen').style.display = 'none';
      document.getElementById('appScreen').style.display = 'block';
      window.scrollTo(0, 0);

      document.querySelectorAll('.tab-item').forEach(btn => {
        const expId = parseInt(btn.dataset.exp, 10);
        btn.style.display = (expId === index) ? 'flex' : 'none';
      });

      if (typeof Sound !== 'undefined') {
        Sound.setEnabled(true);
        Sound.init();
        Sound.resume();
        
        setTimeout(() => {
          Sound.playAmbient(index === 0 ? 'heart' : 'lungs');
          if (this.experiments[index] && typeof this.experiments[index].updateResult === 'function') {
             this.experiments[index].updateResult();
          }
        }, 100);
      }

      this.switchTab(index);

      setTimeout(() => {
        transition.classList.remove('active');
      }, 800);
    }, 1000);
  },

  goHome() {
    if (typeof Sound !== 'undefined') {
      Sound.click(true);
    }

    const transition = document.getElementById('pageTransition');
    transition.classList.add('active');

    setTimeout(() => {
      document.getElementById('appScreen').style.display = 'none';
      document.getElementById('homeScreen').style.display = 'flex';
      window.scrollTo(0, 0);
      
      if (this.experiments[this.currentExp] && typeof this.experiments[this.currentExp].setVisible === 'function') {
        this.experiments[this.currentExp].setVisible(false);
      }
      
      if (typeof Sound !== 'undefined') {
        Sound.setEnabled(false);
      }

      document.querySelectorAll('.tab-item').forEach(btn => {
        btn.style.display = 'flex';
      });

      setTimeout(() => {
        transition.classList.remove('active');
      }, 500);

    }, 600);
  },

  // Isian warna pada slider (CSS memakai variabel --p)
  bindSliderFill() {
    const paint = (el) => {
      const min = +el.min || 0, max = +el.max || 100;
      el.style.setProperty('--p', ((el.value - min) / (max - min)) * 100 + '%');
    };
    const paintAll = () => document.querySelectorAll('.range-slider').forEach(paint);
    document.addEventListener('input', (e) => { if (e.target.matches?.('.range-slider')) paint(e.target); });
    // Nilai yang diubah lewat kode (tombol reset, pilihan aktivitas) tidak memicu event input
    document.addEventListener('click', () => setTimeout(paintAll, 60));
    document.addEventListener('change', () => setTimeout(paintAll, 60));
    paintAll();
  },

  setupAudioUnlock() {
    if (typeof Sound === 'undefined') return;
    window._audioUnlocked = false;
    const unlock = () => {
      if (window._audioUnlocked) return;
      Sound.init(); 
      Sound.resume();
      setTimeout(() => {
        if (Sound.ctx && Sound.ctx.state === 'running') {
          window._audioUnlocked = true;
          ['click', 'touchstart', 'keydown'].forEach(evt => document.removeEventListener(evt, unlock));
        }
      }, 50);
    };
    ['click', 'touchstart', 'keydown'].forEach(evt => document.addEventListener(evt, unlock, { passive: true }));
  },

  registerExperiments() {
    if (typeof HeartExperiment !== 'undefined') this.experiments[0] = HeartExperiment;
    if (typeof LungsExperiment !== 'undefined') this.experiments[1] = LungsExperiment;
  },

  renderAllExperiments() {
    Object.entries(this.experiments).forEach(([i, exp]) => {
      try {
        if (typeof exp.render === 'function') exp.render();
      } catch (err) {
        console.error(`❌ Render GAGAL:`, err);
        const panel = document.getElementById(i === '0' ? 'panelHeart' : 'panelLungs');
        if (panel) panel.innerHTML = `<div class="exp-header"><div class="info-box red"><div>⚠️</div><div><b>Gagal memuat eksperimen.</b><br>${err.message}</div></div></div>`;
      }
    });
  },

  hideLoading() {
    const o = document.getElementById('loadingOverlay');
    if (o) { o.style.opacity = '0'; o.style.pointerEvents = 'none'; setTimeout(() => o.remove(), 400); }
  },

  bindScrollTop() {
    const btn = document.getElementById('btnScrollTop');
    if (!btn) return;
    const onScroll = () => {
      if (window.scrollY > 300) btn.classList.add('visible');
      else btn.classList.remove('visible');
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    btn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  },

  bindTabs() {
    document.querySelectorAll('.tab-item').forEach((btn) => {
      const newBtn = btn.cloneNode(true);
      btn.replaceWith(newBtn);
    });

    document.querySelectorAll('.tab-item').forEach((btn) => {
      const color = btn.dataset.color;
      if (color) btn.style.setProperty('--tab-color', color);
      btn.addEventListener('click', () => {
        if (typeof Sound !== 'undefined') Sound.click();
        this.switchTab(parseInt(btn.dataset.exp, 10));
      });
    });
  },

  switchTab(index) {
    if (index === this.currentExp) {
      if (this.experiments[index] && typeof this.experiments[index].setVisible === 'function') {
        this.experiments[index].setVisible(true);
      }
      return;
    }
    if (!this.experiments[index]) return;

    if (typeof Sound !== 'undefined') Sound.tabSwitch();

    const oldExp = this.experiments[this.currentExp];
    if (oldExp && typeof oldExp.setVisible === 'function') oldExp.setVisible(false);

    document.querySelectorAll('.tab-item').forEach((btn) => {
      btn.classList.toggle('active', parseInt(btn.dataset.exp, 10) === index);
    });
    document.querySelectorAll('.experiment-panel').forEach((p) => {
      p.classList.toggle('active', parseInt(p.dataset.panel, 10) === index);
    });

    this.currentExp = index;

    const newExp = this.experiments[index];
    if (newExp && typeof newExp.setVisible === 'function') newExp.setVisible(true);
    if (newExp && newExp.state && newExp.state.scene && typeof newExp.state.scene.resetCamera === 'function') {
      newExp.state.scene.resetCamera();
    }

    if (typeof Sound !== 'undefined' && Sound.isEnabled()) {
      Sound.playAmbient(index === 0 ? 'heart' : 'lungs');
    }

    setTimeout(() => {
      if (newExp && newExp.state && newExp.state.scene) {
        const scene = newExp.state.scene;
        const container = scene.container;
        if (container && container.clientWidth > 0) {
          scene.camera.aspect = container.clientWidth / container.clientHeight;
          scene.camera.updateProjectionMatrix();
          scene.renderer.setSize(container.clientWidth, container.clientHeight);
        }
      }
    }, 100);

    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  bindHeaderButtons() {
    const btnResetData = document.getElementById('btnResetData');
    if (btnResetData) {
      btnResetData.setAttribute('aria-label', 'Hapus semua progres');
      btnResetData.addEventListener('click', () => {
        if (confirm('Hapus semua progres (misi, kuis, lembar kerja) dan mulai dari awal?')) {
          localStorage.removeItem('biolab_progress');
          localStorage.removeItem('biolab_tutorial_seen_heart');
          localStorage.removeItem('biolab_tutorial_seen_lungs');
          if (typeof Utils !== 'undefined') Utils.toast('Semua data dihapus. Memuat ulang…', 'success');
          setTimeout(() => location.reload(), 800);
        }
      });
    }

    const btnSound = document.getElementById('btnSound');
    if (btnSound && typeof Sound !== 'undefined') {
      btnSound.setAttribute('aria-label', 'Suara');
      btnSound.setAttribute('aria-pressed', 'true');
      let soundOn = true;
      btnSound.addEventListener('click', () => {
        soundOn = !soundOn;
        Sound.setEnabled(soundOn);
                btnSound.setAttribute('aria-pressed', String(soundOn));
        if (soundOn) {
          Sound.info();
          setTimeout(() => {
            if (document.getElementById('appScreen').style.display !== 'none') {
              Sound.playAmbient(this.currentExp === 0 ? 'heart' : 'lungs');
            }
          }, 300);
        } else { Sound.stopAmbient(); }
      });
    }

    const btnFullscreen = document.getElementById('btnFullscreen');
    if (btnFullscreen) {
      btnFullscreen.setAttribute('aria-label', 'Layar penuh');
      btnFullscreen.addEventListener('click', () => {
        if (typeof Sound !== 'undefined') Sound.click();
        try {
          if (!document.fullscreenElement) document.documentElement.requestFullscreen();
          else document.exitFullscreen();
        } catch (e) { console.warn('Fullscreen error:', e); }
      });
    }
  }
};

// Ringkasan progres pada kartu di beranda
function updateHomeProgress() {
  if (typeof Progress === 'undefined') return;
  document.querySelectorAll('.exp-progress').forEach((el) => {
    const exp = el.dataset.exp;
    const done = (Progress.state.missions[exp] || []).length;
    const fill = el.querySelector('i'), txt = el.querySelector('.txt');
    if (fill) fill.style.width = Math.min(100, (done / 3) * 100) + '%';
    if (txt) txt.textContent = done === 0 ? 'Belum dimulai' : done >= 3 ? 'Semua misi selesai' : `${done} dari 3 misi selesai`;
  });
}
