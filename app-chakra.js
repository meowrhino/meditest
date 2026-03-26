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

    // SVG symbols for each chakra (classic sacred geometry)
    const CHAKRA_SVGS = [
      // 0: Muladhara (root) — square
      `<circle cx="20" cy="20" r="17" fill="none" stroke="CCC" stroke-width="1.2" opacity="0.5"/>
       <rect x="11" y="11" width="18" height="18" fill="none" stroke="CCC" stroke-width="1.8" transform="rotate(0 20 20)"/>
       <circle cx="20" cy="20" r="4" fill="CCC"/>`,
      // 1: Svadhisthana (sacral) — circle + crescent
      `<circle cx="20" cy="20" r="17" fill="none" stroke="CCC" stroke-width="1.2" opacity="0.5"/>
       <circle cx="20" cy="20" r="10" fill="none" stroke="CCC" stroke-width="1.8"/>
       <path d="M14 26 Q20 18 26 26" fill="none" stroke="CCC" stroke-width="1.5"/>`,
      // 2: Manipura (solar plexus) — downward triangle
      `<circle cx="20" cy="20" r="17" fill="none" stroke="CCC" stroke-width="1.2" opacity="0.5"/>
       <polygon points="20,30 8,12 32,12" fill="none" stroke="CCC" stroke-width="1.8" transform="rotate(180 20 20)"/>
       <circle cx="20" cy="20" r="3" fill="CCC"/>`,
      // 3: Anahata (heart) — two interlocking triangles (star)
      `<circle cx="20" cy="20" r="17" fill="none" stroke="CCC" stroke-width="1.2" opacity="0.5"/>
       <polygon points="20,9 28,27 12,27" fill="none" stroke="CCC" stroke-width="1.5"/>
       <polygon points="20,31 12,13 28,13" fill="none" stroke="CCC" stroke-width="1.5"/>`,
      // 4: Vishuddha (throat) — circle in circle
      `<circle cx="20" cy="20" r="17" fill="none" stroke="CCC" stroke-width="1.2" opacity="0.5"/>
       <circle cx="20" cy="20" r="11" fill="none" stroke="CCC" stroke-width="1.8"/>
       <circle cx="20" cy="20" r="5" fill="none" stroke="CCC" stroke-width="1.2"/>`,
      // 5: Ajna (third eye) — eye / two petals
      `<circle cx="20" cy="20" r="17" fill="none" stroke="CCC" stroke-width="1.2" opacity="0.5"/>
       <ellipse cx="20" cy="20" rx="13" ry="7" fill="none" stroke="CCC" stroke-width="1.5"/>
       <circle cx="20" cy="20" r="4" fill="CCC"/>`,
      // 6: Sahasrara (crown) — lotus / radiating circle
      `<circle cx="20" cy="20" r="17" fill="none" stroke="CCC" stroke-width="1.2" opacity="0.5"/>
       <circle cx="20" cy="20" r="10" fill="none" stroke="CCC" stroke-width="1.2"/>
       <circle cx="20" cy="20" r="3" fill="CCC"/>
       <line x1="20" y1="3" x2="20" y2="37" stroke="CCC" stroke-width="0.8" opacity="0.5"/>
       <line x1="3" y1="20" x2="37" y2="20" stroke="CCC" stroke-width="0.8" opacity="0.5"/>
       <line x1="8" y1="8" x2="32" y2="32" stroke="CCC" stroke-width="0.8" opacity="0.5"/>
       <line x1="32" y1="8" x2="8" y2="32" stroke="CCC" stroke-width="0.8" opacity="0.5"/>`,
    ];

    chakras.forEach((ch, i) => {
      const btn = document.createElement('button');
      btn.className = 'chakra-btn' + (i === defaultIdx ? ' selected' : '');
      btn.style.setProperty('--chakra-color', ch.color);
      btn.style.setProperty('--chakra-glow', ch.color + '55');
      btn.setAttribute('aria-label', `${ch.sanskrit} – ${ch.name} – ${ch.freq} Hz`);
      btn.setAttribute('title', `${ch.name} – ${ch.freq} Hz`);

      const svgContent = CHAKRA_SVGS[i].replace(/CCC/g, ch.color);
      btn.innerHTML = `<svg viewBox="0 0 40 40">${svgContent}</svg>`;
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

    // modo
    modoBtn.addEventListener('click', () => {
      state.modoIndex = (state.modoIndex + 1) % modes.length;
      modoLabel.textContent = modes[state.modoIndex].label;

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
