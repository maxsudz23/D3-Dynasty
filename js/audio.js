/* Web Audio synth effects (no audio files) and an optional Speech Synthesis
   race announcer. Both degrade silently when the browser lacks support. */
(function (XC) {
  'use strict';

  const Audio = {};
  let ctx = null;
  let muted = false;
  let announcer = false;

  const AudioCtor = window.AudioContext || window.webkitAudioContext;
  Audio.supported = Boolean(AudioCtor);
  Audio.speechSupported = 'speechSynthesis' in window && typeof window.SpeechSynthesisUtterance === 'function';

  function ensure() {
    if (muted || !AudioCtor) return null;
    if (!ctx) {
      try {
        ctx = new AudioCtor();
      } catch (err) {
        return null;
      }
    }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  }

  function tone(freq, duration, { type = 'square', gain = 0.04, delay = 0, slideTo = null } = {}) {
    const ac = ensure();
    if (!ac) return;
    const start = ac.currentTime + delay;
    const osc = ac.createOscillator();
    const amp = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, start + duration);
    amp.gain.setValueAtTime(0.0001, start);
    amp.gain.exponentialRampToValueAtTime(gain, start + 0.008);
    amp.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(amp).connect(ac.destination);
    osc.start(start);
    osc.stop(start + duration + 0.02);
  }

  function noise(duration, { gain = 0.3, filterFrom = 4000, filterTo = 300 } = {}) {
    const ac = ensure();
    if (!ac) return;
    const length = Math.floor(ac.sampleRate * duration);
    const buffer = ac.createBuffer(1, length, ac.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 3;
    const src = ac.createBufferSource();
    src.buffer = buffer;
    const filter = ac.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(filterFrom, ac.currentTime);
    filter.frequency.exponentialRampToValueAtTime(filterTo, ac.currentTime + duration);
    const amp = ac.createGain();
    amp.gain.value = gain;
    src.connect(filter).connect(amp).connect(ac.destination);
    src.start();
  }

  Audio.nav = () => tone(520, 0.045, { gain: 0.025 });
  Audio.select = () => {
    tone(784, 0.06, { gain: 0.035 });
    tone(1175, 0.09, { gain: 0.03, delay: 0.055 });
  };
  Audio.back = () => tone(392, 0.08, { gain: 0.03, slideTo: 300 });
  Audio.tick = () => tone(1900, 0.018, { gain: 0.02, type: 'triangle' });
  Audio.error = () => tone(180, 0.18, { gain: 0.04, type: 'sawtooth' });
  Audio.gun = () => {
    noise(0.45, { gain: 0.55, filterFrom: 6000, filterTo: 200 });
    tone(90, 0.25, { type: 'sine', gain: 0.25, slideTo: 40 });
  };
  Audio.reveal = () => {
    [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.12, { gain: 0.03, delay: i * 0.07, type: 'triangle' }));
  };
  Audio.fanfare = () => {
    [392, 523, 659, 784, 659, 1047].forEach((f, i) => tone(f, 0.16, { gain: 0.035, delay: i * 0.11, type: 'square' }));
  };
  Audio.finish = () => tone(1320, 0.25, { gain: 0.03, type: 'triangle' });

  Audio.setMuted = (value) => {
    muted = Boolean(value);
    if (muted && ctx && ctx.state === 'running') ctx.suspend().catch(() => {});
  };
  Audio.isMuted = () => muted;

  Audio.setAnnouncer = (value) => {
    announcer = Boolean(value) && Audio.speechSupported;
    if (!announcer && Audio.speechSupported) window.speechSynthesis.cancel();
  };
  Audio.announcerOn = () => announcer;

  Audio.say = function (text, { interrupt = false } = {}) {
    if (!announcer || muted) return;
    try {
      if (interrupt) window.speechSynthesis.cancel();
      const line = new window.SpeechSynthesisUtterance(text);
      line.rate = 1.08;
      line.pitch = 0.9;
      window.speechSynthesis.speak(line);
    } catch (err) {
      /* speech is a nice-to-have */
    }
  };

  Audio.hush = () => {
    if (Audio.speechSupported) window.speechSynthesis.cancel();
  };

  XC.audio = Audio;
})(window.XC = window.XC || {});
