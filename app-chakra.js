/*
 * app-chakra.js — Ventana de frecuencias de chakra.
 *
 * Genera los botones de chakra dinámicamente desde data.json,
 * usa SoundEngines para los 12 modos de sonido, y conecta
 * todo al AudioGlobal para que el visualizador pueda reaccionar.
 */

const AppChakra = (() => {
  'use strict';

  let appData = null;

  function init(data) {
    appData = data;
    Windows.registerInit('chakra', initChakra);
    Windows.asegurarIcono('chakra');
  }

  function initChakra(ventana) {
    const defaultIdx = 3; // corazón
    const chakras = appData.chakras;
    const modes = appData.soundModes;

    const state = {
      engine: null,
      gainNode: null,
      playing: false,
      modoIndex: 0,
      selectedChakra: defaultIdx,
      freq: chakras[defaultIdx].freq,
      color: chakras[defaultIdx].color,
      nombre: chakras[defaultIdx].name,
    };
    ventana._state = state;

    // ── build chakra buttons ──
    const chakraRow = ventana.querySelector('.chakra-row');
    const franjaColor = ventana.querySelector('.franja-color');
    const colorNombre = ventana.querySelector('.color-nombre');
    const colorFreq = ventana.querySelector('.color-freq');

    // SVG symbols (black on colored background)
    // All kept within 6-34 range to avoid clipping in viewBox 0-40
    const CHAKRA_SVGS = [
      // 0: Muladhara (root) — square + dot
      `<rect x="10" y="10" width="20" height="20" fill="none" stroke="#000" stroke-width="2.5"/><circle cx="20" cy="20" r="3" fill="#000"/>`,
      // 1: Svadhisthana (sacral) — circle + crescent
      `<circle cx="20" cy="20" r="12" fill="none" stroke="#000" stroke-width="2.5"/><path d="M12 27 Q20 17 28 27" fill="none" stroke="#000" stroke-width="2"/>`,
      // 2: Manipura (solar plexus) — inverted triangle
      `<polygon points="20,30 8,10 32,10" fill="none" stroke="#000" stroke-width="2.5" transform="rotate(180 20 20)"/><circle cx="20" cy="20" r="2.5" fill="#000"/>`,
      // 3: Anahata (heart) — star of David
      `<polygon points="20,8 29,27 11,27" fill="none" stroke="#000" stroke-width="2"/><polygon points="20,32 11,13 29,13" fill="none" stroke="#000" stroke-width="2"/>`,
      // 4: Vishuddha (throat) — concentric circles
      `<circle cx="20" cy="20" r="13" fill="none" stroke="#000" stroke-width="2.5"/><circle cx="20" cy="20" r="6" fill="none" stroke="#000" stroke-width="2"/>`,
      // 5: Ajna (third eye) — eye
      `<ellipse cx="20" cy="20" rx="14" ry="8" fill="none" stroke="#000" stroke-width="2.5"/><circle cx="20" cy="20" r="4" fill="#000"/>`,
      // 6: Sahasrara (crown) — circle with cross
      `<circle cx="20" cy="20" r="12" fill="none" stroke="#000" stroke-width="2"/><line x1="20" y1="8" x2="20" y2="32" stroke="#000" stroke-width="1.5"/><line x1="8" y1="20" x2="32" y2="20" stroke="#000" stroke-width="1.5"/><circle cx="20" cy="20" r="3" fill="#000"/>`,
    ];

    chakras.forEach((ch, i) => {
      const btn = document.createElement('button');
      btn.className = 'chakra-btn' + (i === defaultIdx ? ' selected' : '');
      btn.style.setProperty('--ch-bg', ch.color);
      btn.setAttribute('aria-label', `${ch.sanskrit} – ${ch.name} – ${ch.freq} Hz`);
      btn.setAttribute('title', `${ch.name} – ${ch.freq} Hz`);

      btn.innerHTML = `<svg viewBox="0 0 40 40">${CHAKRA_SVGS[i]}</svg>`;
      chakraRow.appendChild(btn);
    });

    // set initial color
    franjaColor.style.background = state.color;
    colorNombre.textContent = state.nombre;
    colorFreq.textContent = `${state.freq} Hz`;

    // ── chakra selection ──
    const chakraBtns = ventana.querySelectorAll('.chakra-btn');
    chakraBtns.forEach((btn, i) => {
      btn.addEventListener('click', () => {
        chakraBtns.forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');

        const ch = chakras[i];
        state.selectedChakra = i;
        state.freq = ch.freq;
        state.color = ch.color;
        state.nombre = ch.name;

        franjaColor.style.background = state.color;
        colorNombre.textContent = state.nombre;
        colorFreq.textContent = `${state.freq} Hz`;

        if (state.engine) {
          state.engine.setFrequency(state.freq);
        }
      });
    });

    // ── controls ──
    const playBtn = ventana.querySelector('.play-btn');
    const iconPlay = playBtn.querySelector('.icon-play');
    const iconPause = playBtn.querySelector('.icon-pause');
    const modoBtn = ventana.querySelector('.modo-btn');
    const modoLabel = ventana.querySelector('.modo-label');
    const volSlider = ventana.querySelector('.vol-slider');

    // play/pause
    playBtn.addEventListener('click', () => {
      AudioGlobal.resume();

      if (state.playing) {
        if (state.engine) { state.engine.stop(); state.engine = null; }
        state.playing = false;
        iconPlay.style.display = '';
        iconPause.style.display = 'none';
        playBtn.classList.remove('active');
      } else {
        if (!state.gainNode) {
          state.gainNode = AudioGlobal.ctx.createGain();
          state.gainNode.gain.value = +volSlider.value;
          state.gainNode.connect(AudioGlobal.masterGain);
        }

        const modeId = modes[state.modoIndex].id;
        state.engine = SoundEngines.create(modeId, AudioGlobal.ctx, state.freq, state.gainNode);
        state.engine.start();
        state.playing = true;
        iconPlay.style.display = 'none';
        iconPause.style.display = '';
        playBtn.classList.add('active');
      }
    });

    // modo — each mode gets a distinct icon
    const MODE_ICONS = {
      'sine':         `<path d="M4 16 Q10 4 16 16 Q22 28 28 16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>`,
      'triangle':     `<polyline points="4,24 16,8 28,24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>`,
      'binaural':     `<path d="M6 16 Q10 8 14 16 Q18 24 22 16 Q26 8 28 16" fill="none" stroke="currentColor" stroke-width="2"/><line x1="16" y1="6" x2="16" y2="26" stroke="currentColor" stroke-width="1" opacity="0.4"/>`,
      'isochronic':   `<rect x="5" y="10" width="4" height="12" fill="currentColor"/><rect x="13" y="10" width="4" height="12" fill="currentColor"/><rect x="21" y="10" width="4" height="12" fill="currentColor"/>`,
      'om':           `<circle cx="16" cy="16" r="6" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="16" cy="16" r="11" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.5"/>`,
      'whitenoise':   `<line x1="4" y1="16" x2="6" y2="10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="7" y1="20" x2="9" y2="8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="10" y1="22" x2="12" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="13" y1="18" x2="15" y2="6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="16" y1="14" x2="18" y2="24" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="19" y1="10" x2="21" y2="20" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="22" y1="16" x2="24" y2="8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="25" y1="22" x2="27" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>`,
      'pinknoise':    `<path d="M4 20 L8 14 L12 18 L16 12 L20 16 L24 10 L28 15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>`,
      'brownnoise':   `<path d="M4 22 Q10 18 16 16 Q22 14 28 10" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>`,
      'singing-bowl': `<ellipse cx="16" cy="18" rx="12" ry="6" fill="none" stroke="currentColor" stroke-width="2"/><line x1="16" y1="6" x2="16" y2="12" stroke="currentColor" stroke-width="2"/>`,
      'harmonic':     `<line x1="8" y1="24" x2="8" y2="8" stroke="currentColor" stroke-width="2.5"/><line x1="14" y1="24" x2="14" y2="12" stroke="currentColor" stroke-width="2.5"/><line x1="20" y1="24" x2="20" y2="16" stroke="currentColor" stroke-width="2.5"/><line x1="26" y1="24" x2="26" y2="19" stroke="currentColor" stroke-width="2.5"/>`,
      'fm':           `<path d="M4 16 Q8 6 12 16 Q14 20 16 16 Q18 8 20 16 Q22 22 24 16 Q26 12 28 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>`,
      'granular':     `<circle cx="8" cy="12" r="2" fill="currentColor"/><circle cx="14" cy="18" r="1.5" fill="currentColor"/><circle cx="20" cy="10" r="2.5" fill="currentColor"/><circle cx="24" cy="20" r="1.5" fill="currentColor"/><circle cx="11" cy="22" r="1" fill="currentColor"/><circle cx="27" cy="14" r="2" fill="currentColor"/>`,
      'vibrato':      `<path d="M4 16 Q10 4 16 16 Q22 28 28 16" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="3 2" stroke-linecap="round"/>`,
      'resonant':     `<path d="M4 20 Q16 4 28 20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/><line x1="16" y1="8" x2="16" y2="26" stroke="currentColor" stroke-width="1.5" stroke-dasharray="2 2"/>`,
    };

    function updateModoIcon() {
      const modeId = modes[state.modoIndex].id;
      const iconSvg = MODE_ICONS[modeId] || MODE_ICONS['sine'];
      const iconEl = modoBtn.querySelector('.modo-icon');
      if (iconEl) iconEl.innerHTML = `<svg viewBox="0 0 32 32">${iconSvg}</svg>`;
      modoBtn.title = modes[state.modoIndex].label;
    }

    modoBtn.addEventListener('click', () => {
      state.modoIndex = (state.modoIndex + 1) % modes.length;
      updateModoIcon();

      // restart with new engine if playing
      if (state.playing && state.engine) {
        state.engine.stop();
        const modeId = modes[state.modoIndex].id;
        state.engine = SoundEngines.create(modeId, AudioGlobal.ctx, state.freq, state.gainNode);
        state.engine.start();
      }
    });

    // volume
    volSlider.addEventListener('input', () => {
      if (state.gainNode) {
        state.gainNode.gain.setTargetAtTime(+volSlider.value, AudioGlobal.ctx.currentTime, 0.02);
      }
    });
  }

  return { init };
})();
