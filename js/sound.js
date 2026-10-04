/**
 * SMART GROCERY - Audio & Haptic Feedback Engine
 * Realistic supermarket scanner beep, tactile clicks, and budget alerts using Web Audio API
 */

const SoundEngine = {
  audioCtx: null,
  isMuted: false,

  init() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.audioCtx = new AudioContext();
      }
      const savedMute = localStorage.getItem('sg_sound_muted');
      if (savedMute !== null) {
        this.isMuted = savedMute === 'true';
      }
    } catch (e) {
      console.warn('AudioContext not supported:', e);
    }
  },

  ensureContext() {
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  },

  toggleMute() {
    this.isMuted = !this.isMuted;
    localStorage.setItem('sg_sound_muted', this.isMuted);
    return !this.isMuted;
  },

  // Realistic Supermarket Barcode Scanner Beep
  playScanBeep() {
    if (this.isMuted) return;
    try {
      this.ensureContext();
      if (!this.audioCtx) return;
      
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1760, this.audioCtx.currentTime); // High crisp A6 note
      gain.gain.setValueAtTime(0.15, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.12);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start();
      osc.stop(this.audioCtx.currentTime + 0.12);

      this.haptic(40);
    } catch (e) {}
  },

  // Soft tactile tick for steppers (+/-)
  playTick() {
    if (this.isMuted) return;
    try {
      this.ensureContext();
      if (!this.audioCtx) return;

      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(800, this.audioCtx.currentTime);
      gain.gain.setValueAtTime(0.06, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.04);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start();
      osc.stop(this.audioCtx.currentTime + 0.04);

      this.haptic(20);
    } catch (e) {}
  },

  // Budget Safety Cap Alert Buzz (When approaching or exceeding limit)
  playWarningBuzz() {
    if (this.isMuted) return;
    try {
      this.ensureContext();
      if (!this.audioCtx) return;

      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(320, this.audioCtx.currentTime);
      osc.frequency.setValueAtTime(240, this.audioCtx.currentTime + 0.1);

      gain.gain.setValueAtTime(0.12, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.35);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start();
      osc.stop(this.audioCtx.currentTime + 0.35);

      this.haptic([100, 50, 150]);
    } catch (e) {}
  },

  // Success / Checkout Chime
  playSuccessChime() {
    if (this.isMuted) return;
    try {
      this.ensureContext();
      if (!this.audioCtx) return;

      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6 arpeggio
      notes.forEach((freq, idx) => {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime + (idx * 0.07));

        gain.gain.setValueAtTime(0.1, this.audioCtx.currentTime + (idx * 0.07));
        gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + (idx * 0.07) + 0.25);

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc.start(this.audioCtx.currentTime + (idx * 0.07));
        osc.stop(this.audioCtx.currentTime + (idx * 0.07) + 0.25);
      });

      this.haptic([50, 50, 80]);
    } catch (e) {}
  },

  // Haptic feedback simulation via Navigator Vibrate API
  haptic(pattern) {
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch (e) {}
    }
  }
};

window.SoundEngine = SoundEngine;
