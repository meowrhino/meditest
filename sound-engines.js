/*
 * sound-engines.js — Generadores de sonido para la ventana de chakras.
 *
 * Cada engine expone: { start(), stop(), setFrequency(f), setVolume(v) }
 * Todos reciben (audioCtx, freq, outputNode) en su constructor.
 */

const SoundEngines = (() => {
  'use strict';

  // ── helpers ──

  function makeNoise(ctx, type) {
    // type: 'white' | 'pink' | 'brown'
    const sr = ctx.sampleRate;
    const len = sr * 4; // 4 seconds, looped
    const buf = ctx.createBuffer(1, len, sr);
    const data = buf.getChannelData(0);

    if (type === 'white') {
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    } else if (type === 'pink') {
      let b0=0, b1=0, b2=0, b3=0, b4=0, b5=0, b6=0;
      for (let i = 0; i < len; i++) {
        const w = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + w * 0.0555179;
        b1 = 0.99332 * b1 + w * 0.0750759;
        b2 = 0.96900 * b2 + w * 0.1538520;
        b3 = 0.86650 * b3 + w * 0.3104856;
        b4 = 0.55000 * b4 + w * 0.5329522;
        b5 = -0.7616 * b5 - w * 0.0168980;
        data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
        b6 = w * 0.115926;
      }
    } else { // brown
      let last = 0;
      for (let i = 0; i < len; i++) {
        const w = Math.random() * 2 - 1;
        last = (last + (0.02 * w)) / 1.02;
        data[i] = last * 3.5;
      }
    }
    return buf;
  }

  // ── engine: basic oscillator (sine, triangle, sawtooth, square) ──

  function createBasic(type) {
    return (ctx, freq, output) => {
      let osc = null;
      return {
        start() {
          osc = ctx.createOscillator();
          osc.type = type;
          osc.frequency.value = freq;
          osc.connect(output);
          osc.start();
        },
        stop() {
          if (osc) { try { osc.stop(); } catch(_) {} osc = null; }
        },
        setFrequency(f) {
          freq = f;
          if (osc) osc.frequency.setTargetAtTime(f, ctx.currentTime, 0.05);
        },
      };
    };
  }

  // ── engine: binaural beat ──
  // Two oscillators panned L/R with ~6Hz difference

  function createBinaural(ctx, freq, output) {
    let oscL = null, oscR = null, panL = null, panR = null;
    const BEAT_HZ = 6;

    return {
      start() {
        panL = ctx.createStereoPanner(); panL.pan.value = -1;
        panR = ctx.createStereoPanner(); panR.pan.value = 1;

        oscL = ctx.createOscillator(); oscL.type = 'sine';
        oscR = ctx.createOscillator(); oscR.type = 'sine';
        oscL.frequency.value = freq;
        oscR.frequency.value = freq + BEAT_HZ;

        oscL.connect(panL); panL.connect(output);
        oscR.connect(panR); panR.connect(output);
        oscL.start(); oscR.start();
      },
      stop() {
        [oscL, oscR].forEach(o => { if (o) try { o.stop(); } catch(_) {} });
        oscL = oscR = panL = panR = null;
      },
      setFrequency(f) {
        freq = f;
        if (oscL) oscL.frequency.setTargetAtTime(f, ctx.currentTime, 0.05);
        if (oscR) oscR.frequency.setTargetAtTime(f + BEAT_HZ, ctx.currentTime, 0.05);
      },
    };
  }

  // ── engine: isochronic tones ──
  // Single tone pulsing on/off via LFO modulating gain

  function createIsochronic(ctx, freq, output) {
    let osc = null, lfo = null, lfoGain = null;
    const PULSE_HZ = 7;

    return {
      start() {
        osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = freq;

        lfoGain = ctx.createGain();
        lfoGain.gain.value = 0.5; // base level

        lfo = ctx.createOscillator();
        lfo.type = 'square';
        lfo.frequency.value = PULSE_HZ;
        const lfoDepth = ctx.createGain();
        lfoDepth.gain.value = 0.5; // modulation depth
        lfo.connect(lfoDepth);
        lfoDepth.connect(lfoGain.gain);

        osc.connect(lfoGain);
        lfoGain.connect(output);
        osc.start(); lfo.start();
      },
      stop() {
        [osc, lfo].forEach(o => { if (o) try { o.stop(); } catch(_) {} });
        osc = lfo = lfoGain = null;
      },
      setFrequency(f) {
        freq = f;
        if (osc) osc.frequency.setTargetAtTime(f, ctx.currentTime, 0.05);
      },
    };
  }

  // ── engine: om drone ──
  // Fundamental + 5th + octave, all sine, slight detune

  function createOm(ctx, freq, output) {
    let oscs = [];
    const RATIOS = [1, 1.5, 2]; // fundamental, 5th, octave
    const GAINS = [0.5, 0.3, 0.2];

    return {
      start() {
        RATIOS.forEach((ratio, i) => {
          const osc = ctx.createOscillator();
          osc.type = 'sine';
          osc.frequency.value = freq * ratio + (Math.random() * 2 - 1); // slight detune
          const g = ctx.createGain();
          g.gain.value = GAINS[i];
          osc.connect(g);
          g.connect(output);
          osc.start();
          oscs.push({ osc, gain: g, ratio });
        });
      },
      stop() {
        oscs.forEach(({ osc }) => { try { osc.stop(); } catch(_) {} });
        oscs = [];
      },
      setFrequency(f) {
        freq = f;
        oscs.forEach(({ osc, ratio }) => {
          osc.frequency.setTargetAtTime(f * ratio, ctx.currentTime, 0.05);
        });
      },
    };
  }

  // ── engine: noise (white, pink, brown) ──
  // Noise buffer + bandpass filter centered on chakra freq

  function createNoiseEngine(noiseType) {
    return (ctx, freq, output) => {
      let src = null, filter = null;
      return {
        start() {
          const buf = makeNoise(ctx, noiseType);
          src = ctx.createBufferSource();
          src.buffer = buf;
          src.loop = true;
          filter = ctx.createBiquadFilter();
          filter.type = 'bandpass';
          filter.frequency.value = freq;
          filter.Q.value = 2.5;
          src.connect(filter);
          filter.connect(output);
          src.start();
        },
        stop() {
          if (src) { try { src.stop(); } catch(_) {} src = null; }
          filter = null;
        },
        setFrequency(f) {
          freq = f;
          if (filter) filter.frequency.setTargetAtTime(f, ctx.currentTime, 0.05);
        },
      };
    };
  }

  // ── engine: singing bowl ──
  // Multiple partials with slow attack + slight vibrato

  function createSingingBowl(ctx, freq, output) {
    let oscs = [];
    const PARTIALS = [1, 2.71, 4.76, 7.1]; // bowl harmonics (approx)
    const GAINS = [0.45, 0.25, 0.15, 0.1];

    return {
      start() {
        const now = ctx.currentTime;
        PARTIALS.forEach((partial, i) => {
          const osc = ctx.createOscillator();
          osc.type = 'sine';
          osc.frequency.value = freq * partial;

          // slow vibrato
          const vibrato = ctx.createOscillator();
          vibrato.type = 'sine';
          vibrato.frequency.value = 4 + i; // slight variation
          const vibratoDepth = ctx.createGain();
          vibratoDepth.gain.value = freq * partial * 0.003;
          vibrato.connect(vibratoDepth);
          vibratoDepth.connect(osc.frequency);

          const g = ctx.createGain();
          g.gain.setValueAtTime(0, now);
          g.gain.linearRampToValueAtTime(GAINS[i], now + 1.5); // slow attack

          osc.connect(g);
          g.connect(output);
          osc.start(); vibrato.start();
          oscs.push({ osc, vibrato, gain: g, partial });
        });
      },
      stop() {
        oscs.forEach(({ osc, vibrato }) => {
          try { osc.stop(); } catch(_) {}
          try { vibrato.stop(); } catch(_) {}
        });
        oscs = [];
      },
      setFrequency(f) {
        freq = f;
        oscs.forEach(({ osc, partial }) => {
          osc.frequency.setTargetAtTime(f * partial, ctx.currentTime, 0.1);
        });
      },
    };
  }

  // ── engine: harmonic stack ──
  // Fundamental + harmonics 2x, 3x, 4x with decreasing volume

  function createHarmonic(ctx, freq, output) {
    let oscs = [];
    const HARMONICS = [1, 2, 3, 4];
    const GAINS = [0.4, 0.25, 0.18, 0.12];

    return {
      start() {
        HARMONICS.forEach((h, i) => {
          const osc = ctx.createOscillator();
          osc.type = 'sine';
          osc.frequency.value = freq * h;
          const g = ctx.createGain();
          g.gain.value = GAINS[i];
          osc.connect(g);
          g.connect(output);
          osc.start();
          oscs.push({ osc, gain: g, harmonic: h });
        });
      },
      stop() {
        oscs.forEach(({ osc }) => { try { osc.stop(); } catch(_) {} });
        oscs = [];
      },
      setFrequency(f) {
        freq = f;
        oscs.forEach(({ osc, harmonic }) => {
          osc.frequency.setTargetAtTime(f * harmonic, ctx.currentTime, 0.05);
        });
      },
    };
  }

  // ── engine: FM synthesis (bell-like, organic metallic tones) ──

  function createFM(ctx, freq, output) {
    let carrier = null, modulator = null, modGain = null;

    return {
      start() {
        carrier = ctx.createOscillator();
        carrier.type = 'sine';
        carrier.frequency.value = freq;

        modulator = ctx.createOscillator();
        modulator.type = 'sine';
        modulator.frequency.value = freq * 2; // harmonic ratio

        modGain = ctx.createGain();
        modGain.gain.value = freq * 1.5; // modulation index

        modulator.connect(modGain);
        modGain.connect(carrier.frequency);

        carrier.connect(output);
        modulator.start();
        carrier.start();
      },
      stop() {
        [carrier, modulator].forEach(o => { if (o) try { o.stop(); } catch(_) {} });
        carrier = modulator = modGain = null;
      },
      setFrequency(f) {
        freq = f;
        if (carrier) carrier.frequency.setTargetAtTime(f, ctx.currentTime, 0.05);
        if (modulator) modulator.frequency.setTargetAtTime(f * 2, ctx.currentTime, 0.05);
        if (modGain) modGain.gain.setTargetAtTime(f * 1.5, ctx.currentTime, 0.05);
      },
    };
  }

  // ── engine: granular (cloud-like, shimmering texture) ──

  function createGranular(ctx, freq, output) {
    let grainBuffer = null, intervalId = null;
    const activeGrains = [];

    function buildBuffer(f) {
      const sr = ctx.sampleRate;
      const len = Math.floor(sr * 0.5); // 0.5s buffer
      const buf = ctx.createBuffer(1, len, sr);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) {
        data[i] = Math.sin(2 * Math.PI * f * i / sr);
      }
      return buf;
    }

    function spawnGrain() {
      if (!grainBuffer) return;
      const src = ctx.createBufferSource();
      src.buffer = grainBuffer;

      // random grain duration 30-80ms
      const dur = 0.03 + Math.random() * 0.05;
      // random start position within the buffer
      const offset = Math.random() * Math.max(0, grainBuffer.duration - dur);
      // slight pitch variation ±5%
      src.playbackRate.value = 0.95 + Math.random() * 0.1;

      // grain envelope
      const env = ctx.createGain();
      const now = ctx.currentTime;
      env.gain.setValueAtTime(0, now);
      env.gain.linearRampToValueAtTime(0.6, now + dur * 0.3);
      env.gain.linearRampToValueAtTime(0, now + dur);

      src.connect(env);
      env.connect(output);
      src.start(now, offset, dur);
      activeGrains.push(src);

      // cleanup reference after grain ends
      setTimeout(() => {
        const idx = activeGrains.indexOf(src);
        if (idx !== -1) activeGrains.splice(idx, 1);
      }, dur * 1000 + 50);
    }

    return {
      start() {
        grainBuffer = buildBuffer(freq);
        intervalId = setInterval(spawnGrain, 40);
      },
      stop() {
        if (intervalId != null) { clearInterval(intervalId); intervalId = null; }
        activeGrains.forEach(s => { try { s.stop(); } catch(_) {} });
        activeGrains.length = 0;
        grainBuffer = null;
      },
      setFrequency(f) {
        freq = f;
        grainBuffer = buildBuffer(f);
      },
    };
  }

  // ── engine: vibrato sine (warm, alive pure tone) ──

  function createVibrato(ctx, freq, output) {
    let osc = null, lfo = null, lfoGain = null;

    return {
      start() {
        osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = freq;

        // LFO: 4 Hz modulating ±2% of frequency
        lfo = ctx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.value = 4;

        lfoGain = ctx.createGain();
        lfoGain.gain.value = freq * 0.02; // ±2%

        lfo.connect(lfoGain);
        lfoGain.connect(osc.frequency);

        osc.connect(output);
        lfo.start();
        osc.start();
      },
      stop() {
        [osc, lfo].forEach(o => { if (o) try { o.stop(); } catch(_) {} });
        osc = lfo = lfoGain = null;
      },
      setFrequency(f) {
        freq = f;
        if (osc) osc.frequency.setTargetAtTime(f, ctx.currentTime, 0.05);
        if (lfoGain) lfoGain.gain.setTargetAtTime(f * 0.02, ctx.currentTime, 0.05);
      },
    };
  }

  // ── engine: resonant sweep (ethereal, singing bowl-like digital wash) ──

  function createResonant(ctx, freq, output) {
    let src = null, filter = null, lfo = null, lfoGain = null;

    return {
      start() {
        // white noise source
        const buf = makeNoise(ctx, 'white');
        src = ctx.createBufferSource();
        src.buffer = buf;
        src.loop = true;

        // bandpass filter centered on chakra freq, high Q
        filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = freq;
        filter.Q.value = 12;

        // very slow LFO (0.1 Hz) sweeping filter freq ±30%
        lfo = ctx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.value = 0.1;

        lfoGain = ctx.createGain();
        lfoGain.gain.value = freq * 0.3; // ±30%

        lfo.connect(lfoGain);
        lfoGain.connect(filter.frequency);

        src.connect(filter);
        filter.connect(output);
        src.start();
        lfo.start();
      },
      stop() {
        if (src) { try { src.stop(); } catch(_) {} src = null; }
        if (lfo) { try { lfo.stop(); } catch(_) {} lfo = null; }
        filter = lfoGain = null;
      },
      setFrequency(f) {
        freq = f;
        if (filter) filter.frequency.setTargetAtTime(f, ctx.currentTime, 0.05);
        if (lfoGain) lfoGain.gain.setTargetAtTime(f * 0.3, ctx.currentTime, 0.05);
      },
    };
  }

  // ── registry ──

  const engines = {
    'sine':         createBasic('sine'),
    'triangle':     createBasic('triangle'),
    'sawtooth':     createBasic('sawtooth'),
    'square':       createBasic('square'),
    'binaural':     createBinaural,
    'isochronic':   createIsochronic,
    'om':           createOm,
    'whitenoise':   createNoiseEngine('white'),
    'pinknoise':    createNoiseEngine('pink'),
    'brownnoise':   createNoiseEngine('brown'),
    'singing-bowl': createSingingBowl,
    'harmonic':     createHarmonic,
    'fm':           createFM,
    'granular':     createGranular,
    'vibrato':      createVibrato,
    'resonant':     createResonant,
  };

  return {
    create(id, ctx, freq, output) {
      const factory = engines[id];
      if (!factory) throw new Error(`Unknown sound engine: ${id}`);
      return factory(ctx, freq, output);
    },
    has(id) { return id in engines; },
  };
})();
