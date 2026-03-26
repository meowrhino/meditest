/*
 * app-medi.js — Ventana de meditaciones guiadas.
 *
 * Genera la lista dinámicamente desde data.json.
 * Conecta el audio al AudioGlobal para que el
 * visualizador pueda reaccionar.
 */

const AppMedi = (() => {
  'use strict';

  let appData = null;

  function init(data) {
    appData = data;
    Windows.registerInit('medi', initMedi);
    Windows.asegurarIcono('medi');
  }

  function initMedi(ventana) {
    const meditations = appData.meditations;
    const audio = new Audio();
    audio.crossOrigin = 'anonymous';

    const state = {
      audio,
      playing: false,
      currentSrc: null,
      mediaSource: null, // MediaElementSourceNode (can only create once per audio element)
    };
    ventana._state = state;

    // ── build list ──
    const lista = ventana.querySelector('.medi-lista');
    meditations.forEach(m => {
      const li = document.createElement('li');
      li.className = 'medi-item';
      li.dataset.src = `meditations/${m.slug}.mp3`;
      li.innerHTML = `
        <span class="medi-name">${m.name}</span>
        <span class="medi-dur">${m.duration}</span>
      `;
      lista.appendChild(li);
    });

    const items = ventana.querySelectorAll('.medi-item');
    const playBtn = ventana.querySelector('.medi-play');
    const iconPlay = playBtn.querySelector('.icon-play');
    const iconPause = playBtn.querySelector('.icon-pause');
    const mediNow = ventana.querySelector('.medi-now');

    function setPlayingUI(isPlaying) {
      state.playing = isPlaying;
      iconPlay.style.display = isPlaying ? 'none' : '';
      iconPause.style.display = isPlaying ? '' : 'none';
      playBtn.classList.toggle('active', isPlaying);
    }

    // connect audio to global analyser
    function ensureConnected() {
      if (state.mediaSource) return;
      AudioGlobal.resume();
      try {
        state.mediaSource = AudioGlobal.ctx.createMediaElementSource(audio);
        state.mediaSource.connect(AudioGlobal.masterGain);
      } catch(_) {
        // fallback: play without routing (won't show in visualizer)
      }
    }

    // select item
    items.forEach(item => {
      item.addEventListener('click', () => {
        items.forEach(i => i.classList.remove('active'));
        item.classList.add('active');

        const src = item.dataset.src;
        const name = item.querySelector('.medi-name').textContent;
        state.currentSrc = src;
        mediNow.textContent = name;

        ensureConnected();
        audio.src = src;
        audio.play().catch(() => {});
        setPlayingUI(true);
      });
    });

    // play/pause
    playBtn.addEventListener('click', () => {
      if (!state.currentSrc) return;
      if (state.playing) {
        audio.pause();
        setPlayingUI(false);
      } else {
        ensureConnected();
        audio.play().catch(() => {});
        setPlayingUI(true);
      }
    });

    audio.addEventListener('ended', () => setPlayingUI(false));
  }

  return { init };
})();
