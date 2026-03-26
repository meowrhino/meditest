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

    // SVG symbols (black on colored background — arcade pixel art style)
    const CHAKRA_SVGS = [
      `<rect x="8" y="8" width="24" height="24" fill="none" stroke="#000" stroke-width="2.5"/>`,
      `<circle cx="20" cy="20" r="13" fill="none" stroke="#000" stroke-width="2.5"/><path d="M11 28 Q20 16 29 28" fill="none" stroke="#000" stroke-width="2"/>`,
      `<polygon points="20,32 5,8 35,8" fill="none" stroke="#000" stroke-width="2.5" transform="rotate(180 20 20)"/>`,
      `<polygon points="20,6 31,30 9,30" fill="none" stroke="#000" stroke-width="2"/><polygon points="20,34 9,10 31,10" fill="none" stroke="#000" stroke-width="2"/>`,
      `<circle cx="20" cy="20" r="14" fill="none" stroke="#000" stroke-width="2.5"/><circle cx="20" cy="20" r="6" fill="none" stroke="#000" stroke-width="2"/>`,
      `<ellipse cx="20" cy="20" rx="16" ry="9" fill="none" stroke="#000" stroke-width="2.5"/><circle cx="20" cy="20" r="5" fill="#000"/>`,
      `<circle cx="20" cy="20" r="13" fill="none" stroke="#000" stroke-width="2"/><line x1="20" y1="3" x2="20" y2="37" stroke="#000" stroke-width="1.5" opacity="0.5"/><line x1="3" y1="20" x2="37" y2="20" stroke="#000" stroke-width="1.5" opacity="0.5"/><line x1="7" y1="7" x2="33" y2="33" stroke="#000" stroke-width="1.5" opacity="0.5"/><line x1="33" y1="7" x2="7" y2="33" stroke="#000" stroke-width="1.5" opacity="0.5"/>`,
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

    // modo
    modoBtn.addEventListener('click', () => {
      state.modoIndex = (state.modoIndex + 1) % modes.length;
      // label hidden, but update title for hover tooltip
      modoBtn.title = modes[state.modoIndex].label;

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
