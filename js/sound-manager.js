class SoundManager {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.masterVolume = 0.5;
    this.initialized = false;
    this._unlocked = false;
    this._simPaused = false;
    
    this._ambientOsc = null;
    this._ambientGain = null;
    this._ambientLfo = null;
    
    this._breathSource = null;
    this._breathFilter = null;
    this._breathGain = null;
    this._breathLfo = null;
    this._breathLfoGain = null;

    this._currentAmbient = null;
    this._pendingSounds = [];

    this.breathClock = {
      startTime: Date.now(),
      cycleDuration: 4, 
      phaseOffset: 0
    };
  }

  getBreathWave() {
    const elapsed = (Date.now() - this.breathClock.startTime) / 1000;
    const cycle = this.breathClock.cycleDuration;
    const angle = (elapsed / cycle) * Math.PI * 2;
    return (Math.sin(angle - Math.PI / 2) + 1) / 2; 
  }

  init() {
    if (this.initialized) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) { this.enabled = false; return; }
      this.ctx = new AC();
      this.initialized = true;
      console.log('🔊 Sound ready');
      this._setupUnlock();
    } catch (e) { this.enabled = false; }
  }

  _setupUnlock() {
    const events = ['click', 'touchstart', 'keydown'];
    const unlock = () => {
      this._tryResume();
      this._unlocked = true;
    };
    events.forEach(evt => document.addEventListener(evt, unlock, { passive: true }));
    this._tryResume();
  }

  _tryResume() {
    if (!this.ctx) return;
    if (this.ctx.state === 'running') {
      this._unlocked = true;
      this._flushPending();
      return;
    }
    this.ctx.resume().then(() => {
      if (this.ctx.state === 'running') {
        this._unlocked = true;
        if (this._currentAmbient) this.playAmbient(this._currentAmbient);
        this._flushPending();
      }
    }).catch(() => {});
  }

  _flushPending() {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const queue = this._pendingSounds.splice(0);
    queue.forEach(({ fn, args }) => this[fn](...args));
  }

  setEnabled(v) {
    this.enabled = v;
    if (v) {
      this.init();
      this._tryResume();
      if (this._currentAmbient) this.playAmbient(this._currentAmbient);
    } else {
      this.stopAmbient();
    }
  }
  isEnabled() { return this.enabled && this.initialized && this.ctx && this.ctx.state === 'running'; }
  resume() { this._tryResume(); }

  // Dipanggil otomatis saat tombol Jeda / Lanjut pada viewport 3D ditekan
  setSimulationPaused(paused) {
    this._simPaused = !!paused;
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    if (this._simPaused) {
      if (this._breathGain) {
        this._breathGain.gain.cancelScheduledValues(now);
        this._breathGain.gain.setTargetAtTime(0, now, 0.025);
      }
      if (this._ambientGain) {
        this._ambientGain.gain.cancelScheduledValues(now);
        this._ambientGain.gain.setTargetAtTime(0, now, 0.025);
      }
    } else {
      if (this._currentAmbient === 'heart' && this._ambientGain) {
        this._ambientGain.gain.cancelScheduledValues(now);
        this._ambientGain.gain.setTargetAtTime(0.08 * this.masterVolume, now, 0.04);
      }
    }
  }

  _isLungsScenePaused() {
    if (this._simPaused) return true;
    try {
      return !!(
        typeof LungsExperiment !== 'undefined' &&
        LungsExperiment.state &&
        LungsExperiment.state.scene &&
        LungsExperiment.state.scene.paused
      );
    } catch (e) {
      return false;
    }
  }

  _isHeartScenePaused() {
    if (this._simPaused) return true;
    try {
      return !!(
        typeof HeartExperiment !== 'undefined' &&
        HeartExperiment.state &&
        HeartExperiment.state.scene &&
        HeartExperiment.state.scene.paused
      );
    } catch (e) {
      return false;
    }
  }

  _playTone(freq, duration, opts = {}) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx || this.ctx.state !== 'running') {
      this._tryResume();
      this._pendingSounds.push({ fn: '_playTone', args: [freq, duration, opts] });
      return;
    }
    
    const { type='sine', volume=0.3, attack=0.005, sustain=0.7,
            release=0.1, freqEnd=null, delay=0 } = opts;
    const now = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (freqEnd !== null) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), now + duration);
    }
    
    const vol = volume * this.masterVolume;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(vol, now + attack);
    gain.gain.exponentialRampToValueAtTime(vol * sustain, now + attack + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration + release);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + duration + release + 0.05);
  }

  // Fungsi Bangunkan Audio (Suara sangat kecil)
  wakeUp() {
    if (!this.enabled) return;
    this.init();
    this._tryResume();
    // Mainkan nada 1ms dengan volume sangat rendah
    this._playTone(20000, 0.01, { type: 'sine', volume: 0.001 });
  }

  click(force = false) {
    if (!this.enabled && !force) return;
    this._playTone(900, 0.04, { type: 'square', volume: 0.12, freqEnd: 600 });
  }
  
  success() {
    if (!this.enabled) return;
    this._playTone(523.25, 0.1, { type: 'sine', volume: 0.28 });
    this._playTone(659.25, 0.1, { type: 'sine', volume: 0.28, delay: 0.09 });
    this._playTone(783.99, 0.18, { type: 'sine', volume: 0.3, delay: 0.18 });
  }
  
  error() {
    if (!this.enabled) return;
    this._playTone(350, 0.15, { type: 'sawtooth', volume: 0.22, freqEnd: 140 });
  }
  
  info() { 
    if (!this.enabled) return;
    this._playTone(700, 0.06, { type: 'sine', volume: 0.15 }); 
  }
  
  tabSwitch() { 
    if (!this.enabled) return;
    this._playTone(440, 0.05, { type: 'sine', volume: 0.15, freqEnd: 660 }); 
  }
  
  sliderMove() { 
    if (!this.enabled) return;
    this._playTone(600 + Math.random() * 200, 0.015, { type: 'sine', volume: 0.05 }); 
  }
  
  hover() { 
    if (!this.enabled) return;
    this._playTone(1200, 0.02, { type: 'sine', volume: 0.03 }); 
  }
  
  fanfare() {
    if (!this.enabled) return;
    const n = [523.25, 659.25, 783.99, 1046.5];
    n.forEach((f, i) => this._playTone(f, 0.35, { type: 'triangle', volume: 0.25, delay: i * 0.12 }));
  }

  heartbeat() {
    if (!this.enabled || this._isHeartScenePaused()) return;
    this._playTone(85, 0.09, { type: 'sine', volume: 0.8, freqEnd: 60 });
    this._playTone(70, 0.11, { type: 'sine', volume: 0.6, freqEnd: 50, delay: 0.12 });
  }

  playAmbient(expName) {
    if (!this.enabled) return;
    this._currentAmbient = expName;
    this.init();
    if (!this.ctx || this.ctx.state !== 'running') return;
    this.stopAmbient();

    if (expName === 'lungs') {
      this._simPaused = this._isLungsScenePaused();
      this.breathClock.startTime = Date.now();
    } else if (expName === 'heart') {
      this._simPaused = this._isHeartScenePaused();
    } else {
      this._simPaused = false;
    }

    if (expName === 'heart') {
      this._ambientGain = this.ctx.createGain();
      this._ambientGain.gain.value = this._simPaused ? 0 : (0.08 * this.masterVolume); 
      this._ambientGain.connect(this.ctx.destination);
      this._ambientOsc = this.ctx.createOscillator();
      this._ambientOsc.type = 'sine';
      this._ambientOsc.frequency.value = 50;
      this._ambientLfo = this.ctx.createOscillator();
      this._ambientLfo.type = 'sine';
      this._ambientLfo.frequency.value = 1; 
      const lfoGain = this.ctx.createGain();
      lfoGain.gain.value = 0.05; 
      this._ambientLfo.connect(lfoGain);
      lfoGain.connect(this._ambientGain.gain);
      this._ambientOsc.connect(this._ambientGain);
      this._ambientOsc.start();
      this._ambientLfo.start();
      
    } else if (expName === 'lungs') {
      // Noise napas: volume & warna suara digerakkan langsung oleh updateBreath()
      // (disinkronkan dengan fase napas dan kedalaman napas pada animasi 3D).
      const bufferSize = this.ctx.sampleRate * 3;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

      this._breathSource = this.ctx.createBufferSource();
      this._breathSource.buffer = buffer;
      this._breathSource.loop = true;

      this._breathFilter = this.ctx.createBiquadFilter();
      this._breathFilter.type = 'bandpass';
      this._breathFilter.frequency.value = 1000;
      this._breathFilter.Q.value = 1.0;

      this._breathGain = this.ctx.createGain();
      this._breathGain.gain.value = 0;

      this._breathSource.connect(this._breathFilter);
      this._breathFilter.connect(this._breathGain);
      this._breathGain.connect(this.ctx.destination);
      this._breathSource.start();
    }
  }

  // Dipanggil tiap frame dari animasi paru-paru.
  // ph       : fase siklus napas 0..1 (sama dengan st.phase)
  // strength : kekuatan napas (kedalaman x jenis aktivitas), sama dengan yang menggerakkan paru-paru 3D
  // rpm      : napas per menit
  updateBreath(ph, strength, rpm) {
    if (rpm > 0) this.breathClock.cycleDuration = 60 / rpm;
    if (!this.ctx || this._currentAmbient !== 'lungs' || !this._breathGain || !this._breathFilter) return;
    if (this.ctx.state !== 'running') return;

    const now = this.ctx.currentTime;

    // Senyapkan suara napas segera ketika simulasi dijeda
    if (this._isLungsScenePaused()) {
      this._breathGain.gain.setTargetAtTime(0, now, 0.025);
      return;
    }

    const BREATH_PEAK = 0.18;                       // volume maksimum (turunkan untuk lebih pelan)
    const s = Math.min(1, Math.max(0, strength));
    let kind = 0, env = 0;
    if (ph > 0.02 && ph < 0.44) { kind = 1; env = Math.sin(Math.PI * (ph - 0.02) / 0.42); }          // inspirasi
    else if (ph >= 0.44 && ph < 0.88) { kind = 2; env = 0.8 * Math.sin(Math.PI * (ph - 0.44) / 0.44); } // ekspirasi, sedikit lebih lembut

    // napas dangkal -> pelan & tipis; napas dalam -> lebih keras, rendah, dan "berisi"
    const peak = (0.03 + (BREATH_PEAK - 0.03) * Math.pow(s, 0.8)) * (this.masterVolume / 0.5);
    const base = 1500 - s * 800;
    const freq = kind === 2 ? base * 0.85 * (0.8 + 0.3 * env) : base * (0.8 + 0.4 * env);
    const q = 1.2 - 0.5 * s;

    this._breathGain.gain.setTargetAtTime(peak * env, now, 0.04);
    this._breathFilter.frequency.setTargetAtTime(freq, now, 0.06);
    this._breathFilter.Q.setTargetAtTime(q, now, 0.1);
  }

  // Dipertahankan agar pemanggil lama tidak error; suara napas kini diatur oleh updateBreath().
  setLungsDepth(depth, type) {}

  setAmbientRate(rate) {
    if (!this.ctx) return;
    const safeRate = Math.max(0.2, Math.min(3.0, rate));
    const now = this.ctx.currentTime;
    if (this._currentAmbient === 'heart' && this._ambientLfo) {
      this._ambientLfo.frequency.setValueAtTime(safeRate, now);
    }
  }

  stopAmbient() {
    if (this._ambientOsc) { try { this._ambientOsc.stop(); this._ambientOsc.disconnect(); } catch (e) {} this._ambientOsc = null; }
    if (this._ambientLfo) { try { this._ambientLfo.stop(); this._ambientLfo.disconnect(); } catch (e) {} this._ambientLfo = null; }
    if (this._ambientGain) { try { this._ambientGain.disconnect(); } catch (e) {} this._ambientGain = null; }

    if (this._breathSource) { try { this._breathSource.stop(); this._breathSource.disconnect(); } catch (e) {} this._breathSource = null; }
    if (this._breathFilter) { try { this._breathFilter.disconnect(); } catch (e) {} this._breathFilter = null; }
    if (this._breathGain) { try { this._breathGain.disconnect(); } catch (e) {} this._breathGain = null; }
    if (this._breathLfo) { try { this._breathLfo.stop(); this._breathLfo.disconnect(); } catch (e) {} this._breathLfo = null; }
    if (this._breathLfoGain) { try { this._breathLfoGain.disconnect(); } catch (e) {} this._breathLfoGain = null; }
  }
}
const Sound = new SoundManager();
