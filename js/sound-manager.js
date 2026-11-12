class SoundManager {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.masterVolume = 0.5;
    this.initialized = false;
    this._unlocked = false;
    
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
    if (!this.enabled) return;
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
      this.breathClock.startTime = Date.now();
    }

    if (expName === 'heart') {
      this._ambientGain = this.ctx.createGain();
      this._ambientGain.gain.value = 0.08 * this.masterVolume; 
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

      this._breathLfo = this.ctx.createOscillator();
      this._breathLfo.type = 'sine';
      this._breathLfo.frequency.value = 0.25; 

      this._breathLfoGain = this.ctx.createGain();
      this._breathLfoGain.gain.value = 0;

      this._breathLfo.connect(this._breathLfoGain);
      this._breathLfoGain.connect(this._breathGain.gain);

      this._breathSource.connect(this._breathFilter);
      this._breathFilter.connect(this._breathGain);
      this._breathGain.connect(this.ctx.destination);

      this._breathSource.start();
      this._breathLfo.start();
      
      if (this._currentAmbient === 'lungs') {
          const targetFreq = 0.8; 
          this.breathClock.cycleDuration = 1 / targetFreq;
          this._breathLfo.frequency.setValueAtTime(targetFreq, this.ctx.currentTime);
          this._breathLfoGain.gain.setValueAtTime(0.15, this.ctx.currentTime);
          this._breathFilter.frequency.setValueAtTime(1100, this.ctx.currentTime);
      }
    }
  }

  setLungsDepth(depth, type) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const d = depth / 100; 
    
    let baseSpeed = type === 1 ? 1.0 : type === 2 ? 0.7 : 0.4;
    const targetFreq = baseSpeed * (1.2 - d * 0.5);
    
    this.breathClock.cycleDuration = 1 / targetFreq;

    if (this._currentAmbient !== 'lungs') return;

    this._breathLfo.frequency.setTargetAtTime(targetFreq, now, 0.1);
    const targetVol = 0.05 + (d * 0.20);
    this._breathLfoGain.gain.setTargetAtTime(targetVol, now, 0.1);
    const targetFilter = 1500 - (d * 800);
    this._breathFilter.frequency.setTargetAtTime(targetFilter, now, 0.1);
  }

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