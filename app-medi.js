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
    const mediNow = ventana.querySelector('.medi-now'); // may be null, that's OK

    function setPlayingUI(isPlaying) {
      state.playing = isPlaying;
      iconPlay.style.display = isPlaying ? 'none' : '';
      iconPause.style.display = isPlaying ? '' : 'none';
      playBtn.classList.toggle('active', isPlaying);
    }

    // connect audio to global analyser with LPF + HPF chain
    function ensureConnected() {
      if (state.mediaSource) return;
      AudioGlobal.resume();
      try {
        state.mediaSource = AudioGlobal.ctx.createMediaElementSource(audio);

        // LPF: low pass filter (cuts highs)
        state.lpf = AudioGlobal.ctx.createBiquadFilter();
        state.lpf.type = 'lowpass';
        state.lpf.frequency.value = 20000;
        state.lpf.Q.value = 0.7;

        // HPF: high pass filter (cuts lows)
        state.hpf = AudioGlobal.ctx.createBiquadFilter();
        state.hpf.type = 'highpass';
        state.hpf.frequency.value = 20;
        state.hpf.Q.value = 0.7;

        // chain: source → LPF → HPF → master
        state.mediaSource.connect(state.lpf);
        state.lpf.connect(state.hpf);
        state.hpf.connect(AudioGlobal.masterGain);
      } catch(_) {
        // fallback: play without routing
      }
    }

    // XY filter pads — X = cutoff frequency (log), Y = Q/resonance
    function initFilterPad(padEl, filter, freqRange) {
      if (!padEl || !filter) return;
      const cursor = padEl.querySelector('.pad-cursor');
      let active = false;

      function setFromEvent(e) {
        const rect = padEl.getBoundingClientRect();
        const ev = e.touches ? e.touches[0] : e;
        const px = Math.max(0, Math.min(1, (ev.clientX - rect.left) / rect.width));
        const py = Math.max(0, Math.min(1, (ev.clientY - rect.top) / rect.height));

        // position cursor with %
        if (cursor) {
          cursor.style.left = (px * 100) + '%';
          cursor.style.top = (py * 100) + '%';
          cursor.style.right = 'auto';
          cursor.style.bottom = 'auto';
          cursor.style.transform = 'translate(-50%, -50%)';
        }

        // X → freq (log scale)
        const minF = Math.log2(freqRange[0]);
        const maxF = Math.log2(freqRange[1]);
        const freq = Math.pow(2, minF + px * (maxF - minF));

        // Y → Q exponential (top=very resonant 25, bottom=gentle 0.3)
        // exponential makes it more perceptible across the range
        const q = 0.3 * Math.pow(25 / 0.3, 1 - py);

        const t = AudioGlobal.ctx.currentTime;
        filter.frequency.setTargetAtTime(freq, t, 0.03);
        filter.Q.setTargetAtTime(q, t, 0.03);
      }

      padEl.addEventListener('mousedown', (e) => { active = true; setFromEvent(e); e.preventDefault(); });
      padEl.addEventListener('touchstart', (e) => { active = true; setFromEvent(e); e.preventDefault(); }, { passive: false });
      window.addEventListener('mousemove', (e) => { if (active) setFromEvent(e); });
      window.addEventListener('touchmove', (e) => { if (active) setFromEvent(e); }, { passive: false });
      window.addEventListener('mouseup', () => { active = false; });
      window.addEventListener('touchend', () => { active = false; });
    }

    const lpfPad = ventana.querySelector('.lpf-pad');
    const hpfPad = ventana.querySelector('.hpf-pad');

    // init pads after first audio connection (filters exist)
    function initPads() {
      if (state.lpf) initFilterPad(lpfPad, state.lpf, [200, 20000]);
      if (state.hpf) initFilterPad(hpfPad, state.hpf, [20, 2000]);
      state._padsInit = true;
    }

    // select item
    items.forEach(item => {
      item.addEventListener('click', () => {
        items.forEach(i => i.classList.remove('active'));
        item.classList.add('active');

        const src = item.dataset.src;
        const name = item.querySelector('.medi-name').textContent;
        state.currentSrc = src;
        if (mediNow) mediNow.textContent = name;

        ensureConnected();
        if (!state._padsInit) initPads();
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
