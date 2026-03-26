/*
 * meditest — app.js
 *
 * Sistema de escritorio con ventanas arrastrables multi-instancia.
 * - Ventana Chakra: genera frecuencias solfeggio con Web Audio API
 * - Ventana Meditaciones: reproduce archivos de meditación guiada
 * Todas las instancias pueden sonar simultáneamente.
 */

(() => {
  'use strict';

  // ── estado global ──
  let windowZ = 10;          // z-index counter
  let windowCount = 0;       // para offset cascada
  const CASCADE_OFFSET = 28; // px offset entre ventanas nuevas

  const MODOS = ['sine', 'triangle', 'sawtooth', 'square'];

  // ── utilidades ──
  function clamp(val, min, max) { return Math.max(min, Math.min(max, val)); }

  // ── gestión de iconos ──
  const iconosContainer = document.getElementById('iconos');

  function asegurarIcono(tipo) {
    // tipo: 'chakra' | 'medi'
    const id = `icono-${tipo}`;
    if (document.getElementById(id)) return;

    const icono = document.createElement('div');
    icono.className = 'icono';
    icono.id = id;

    const img = document.createElement('div');
    img.className = 'icono-img';

    const label = document.createElement('span');
    label.className = 'icono-label';

    if (tipo === 'chakra') {
      img.style.background = '#d0bfff';
      img.textContent = '~';
      label.textContent = 'frecuencias';
    } else {
      img.style.background = '#99e9f2';
      img.textContent = '▶';
      label.textContent = 'meditaciones';
    }

    icono.appendChild(img);
    icono.appendChild(label);
    icono.addEventListener('click', () => abrirVentana(tipo));
    iconosContainer.appendChild(icono);
  }

  // crear iconos al inicio
  asegurarIcono('chakra');
  asegurarIcono('medi');

  // ── abrir ventana ──
  function abrirVentana(tipo) {
    const tmpl = document.getElementById(tipo === 'chakra' ? 'tmpl-chakra' : 'tmpl-medi');
    const clone = tmpl.content.cloneNode(true);
    const ventana = clone.querySelector('.ventana');

    // posición cascada
    const existingOfType = document.querySelectorAll(`.ventana[data-type="${tipo}"]`).length;
    const offset = existingOfType * CASCADE_OFFSET;
    const vw = window.innerWidth;
    const baseTop = 40 + offset;
    const baseLeft = tipo === 'chakra'
      ? Math.min(110 + offset, vw - 340)
      : Math.min(vw * 0.55 + offset, vw - 280);
    ventana.style.top = `${baseTop + offset}px`;
    ventana.style.left = `${baseLeft + offset}px`;
    ventana.style.zIndex = ++windowZ;
    windowCount++;

    document.body.appendChild(ventana);

    // drag
    initDrag(ventana);

    // focus on click
    ventana.addEventListener('mousedown', () => {
      ventana.style.zIndex = ++windowZ;
    });

    // cerrar
    const cerrarBtn = ventana.querySelector('.ventana-cerrar-btn');
    cerrarBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      cerrarVentana(ventana);
    });

    // init tipo-específico
    if (tipo === 'chakra') initChakra(ventana);
    else initMedi(ventana);

    return ventana;
  }

  function cerrarVentana(ventana) {
    // limpiar audio si existe
    const state = ventana._state;
    if (state) {
      if (state.osc) { try { state.osc.stop(); } catch(_) {} }
      if (state.audioCtx) { try { state.audioCtx.close(); } catch(_) {} }
      if (state.audio) { state.audio.pause(); state.audio.src = ''; }
    }

    ventana.classList.add('closing');
    ventana.addEventListener('animationend', () => ventana.remove(), { once: true });
  }

  // ── drag ──
  function initDrag(ventana) {
    const titlebar = ventana.querySelector('.ventana-titlebar');
    let dragging = false;
    let startX, startY, origLeft, origTop;

    function onDown(e) {
      // ignorar si es botón cerrar
      if (e.target.closest('.ventana-cerrar-btn')) return;
      dragging = true;
      const ev = e.touches ? e.touches[0] : e;
      startX = ev.clientX;
      startY = ev.clientY;
      origLeft = ventana.offsetLeft;
      origTop = ventana.offsetTop;
      ventana.style.zIndex = ++windowZ;
      e.preventDefault();
    }

    function onMove(e) {
      if (!dragging) return;
      const ev = e.touches ? e.touches[0] : e;
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      ventana.style.left = `${origLeft + dx}px`;
      ventana.style.top = `${origTop + dy}px`;
    }

    function onUp() { dragging = false; }

    titlebar.addEventListener('mousedown', onDown);
    titlebar.addEventListener('touchstart', onDown, { passive: false });
    window.addEventListener('mousemove', onMove);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchend', onUp);
  }

  // ══════════════════════════════════
  // CHAKRA — Web Audio API
  // ══════════════════════════════════

  function initChakra(ventana) {
    const state = {
      audioCtx: null,
      osc: null,
      gainNode: null,
      playing: false,
      modoIndex: 0,
      selectedChakra: 3, // corazón por defecto
      freq: 639,
      color: '#69db7c',
      nombre: 'corazón',
    };
    ventana._state = state;

    const chakraBtns = ventana.querySelectorAll('.chakra-btn');
    const franjaColor = ventana.querySelector('.franja-color');
    const colorNombre = ventana.querySelector('.color-nombre');
    const colorFreq = ventana.querySelector('.color-freq');
    const playBtn = ventana.querySelector('.play-btn');
    const iconPlay = playBtn.querySelector('.icon-play');
    const iconPause = playBtn.querySelector('.icon-pause');
    const modoBtn = ventana.querySelector('.modo-btn');
    const modoLabel = ventana.querySelector('.modo-label');
    const volSlider = ventana.querySelector('.vol-slider');

    // seleccionar chakra
    chakraBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        chakraBtns.forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');

        state.selectedChakra = +btn.dataset.chakra;
        state.freq = +btn.dataset.freq;
        state.color = btn.dataset.color;
        state.nombre = btn.dataset.name;

        franjaColor.style.background = state.color;
        colorNombre.textContent = state.nombre;
        colorFreq.textContent = `${state.freq} Hz`;

        // actualizar frecuencia en tiempo real si está sonando
        if (state.osc) {
          state.osc.frequency.setTargetAtTime(state.freq, state.audioCtx.currentTime, 0.05);
        }
      });
    });

    // play/pause
    playBtn.addEventListener('click', () => {
      if (!state.audioCtx) {
        state.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        state.gainNode = state.audioCtx.createGain();
        state.gainNode.gain.value = +volSlider.value;
        state.gainNode.connect(state.audioCtx.destination);
      }

      if (state.playing) {
        // pause: parar oscilador
        if (state.osc) { try { state.osc.stop(); } catch(_) {} state.osc = null; }
        state.playing = false;
        iconPlay.style.display = '';
        iconPause.style.display = 'none';
        playBtn.classList.remove('active');
      } else {
        // play: crear oscilador
        if (state.audioCtx.state === 'suspended') state.audioCtx.resume();
        state.osc = state.audioCtx.createOscillator();
        state.osc.type = MODOS[state.modoIndex];
        state.osc.frequency.value = state.freq;
        state.osc.connect(state.gainNode);
        state.osc.start();
        state.playing = true;
        iconPlay.style.display = 'none';
        iconPause.style.display = '';
        playBtn.classList.add('active');
      }
    });

    // modo
    modoBtn.addEventListener('click', () => {
      state.modoIndex = (state.modoIndex + 1) % MODOS.length;
      modoLabel.textContent = MODOS[state.modoIndex];
      if (state.osc) {
        state.osc.type = MODOS[state.modoIndex];
      }
    });

    // volumen
    volSlider.addEventListener('input', () => {
      if (state.gainNode) {
        state.gainNode.gain.setTargetAtTime(+volSlider.value, state.audioCtx.currentTime, 0.02);
      }
    });
  }

  // ══════════════════════════════════
  // MEDITACIONES — Audio element
  // ══════════════════════════════════

  function initMedi(ventana) {
    const audio = new Audio();
    const state = {
      audio,
      playing: false,
      currentSrc: null,
    };
    ventana._state = state;

    const items = ventana.querySelectorAll('.medi-item');
    const playBtn = ventana.querySelector('.medi-play');
    const iconPlay = playBtn.querySelector('.icon-play');
    const iconPause = playBtn.querySelector('.icon-pause');
    const mediNow = ventana.querySelector('.medi-now');

    // seleccionar item
    items.forEach(item => {
      item.addEventListener('click', () => {
        items.forEach(i => i.classList.remove('active'));
        item.classList.add('active');

        const src = item.dataset.src;
        const name = item.querySelector('.medi-name').textContent;
        state.currentSrc = src;
        mediNow.textContent = name;

        audio.src = src;
        audio.play().catch(() => {});
        state.playing = true;
        iconPlay.style.display = 'none';
        iconPause.style.display = '';
        playBtn.classList.add('active');
      });
    });

    // play/pause
    playBtn.addEventListener('click', () => {
      if (!state.currentSrc) return;
      if (state.playing) {
        audio.pause();
        state.playing = false;
        iconPlay.style.display = '';
        iconPause.style.display = 'none';
        playBtn.classList.remove('active');
      } else {
        audio.play().catch(() => {});
        state.playing = true;
        iconPlay.style.display = 'none';
        iconPause.style.display = '';
        playBtn.classList.add('active');
      }
    });

    audio.addEventListener('ended', () => {
      state.playing = false;
      iconPlay.style.display = '';
      iconPause.style.display = 'none';
      playBtn.classList.remove('active');
    });
  }

  // ── abrir una de cada al inicio ──
  abrirVentana('chakra');
  abrirVentana('medi');

})();
