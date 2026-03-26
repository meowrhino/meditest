/*
 * windows.js — Gestión de ventanas del escritorio.
 *
 * Maneja: abrir, cerrar, drag, z-index, cascada,
 * iconos de escritorio y multi-instancia.
 */

const Windows = (() => {
  'use strict';

  let windowZ = 10;
  let windowCounts = {}; // por tipo
  const CASCADE_OFFSET = 28;
  const iconosContainer = document.getElementById('iconos');

  // ── iconos ──

  const ICON_CONFIG = {
    chakra: { glyph: '~', label: 'frecuencias', glow: '#d0bfff' },
    medi:   { glyph: '▶', label: 'meditaciones', glow: '#06b6d4' },
    viz:    { glyph: '✦', label: 'visualizer', glow: '#7c3aed' },
  };

  function asegurarIcono(tipo) {
    const id = `icono-${tipo}`;
    if (document.getElementById(id)) return;

    const cfg = ICON_CONFIG[tipo] || { glyph: '?', label: tipo, glow: '#888' };
    const icono = document.createElement('div');
    icono.className = 'icono';
    icono.id = id;

    const img = document.createElement('div');
    img.className = 'icono-img';
    img.textContent = cfg.glyph;

    const label = document.createElement('span');
    label.className = 'icono-label';
    label.textContent = cfg.label;

    icono.appendChild(img);
    icono.appendChild(label);
    icono.addEventListener('click', () => abrir(tipo));
    iconosContainer.appendChild(icono);
  }

  // ── abrir ventana ──

  // callbacks registrados por cada app module
  const initCallbacks = {};

  function registerInit(tipo, cb) {
    initCallbacks[tipo] = cb;
  }

  function abrir(tipo) {
    const tmplId = `tmpl-${tipo}`;
    const tmpl = document.getElementById(tmplId);
    if (!tmpl) { console.warn(`No template: ${tmplId}`); return null; }

    const clone = tmpl.content.cloneNode(true);
    const ventana = clone.querySelector('.ventana');

    // cascada
    windowCounts[tipo] = (windowCounts[tipo] || 0) + 1;
    const count = windowCounts[tipo] - 1;
    const offset = count * CASCADE_OFFSET;
    const vw = window.innerWidth;

    const baseTops  = { chakra: 30, medi: 30, viz: 80 };
    const baseLefts = { chakra: 100, medi: vw * 0.52, viz: vw * 0.22 };
    const baseLeft = Math.min((baseLefts[tipo] || 200) + offset, vw - 340);
    ventana.style.top = `${(baseTops[tipo] || 40) + offset}px`;
    ventana.style.left = `${baseLeft}px`;
    ventana.style.zIndex = ++windowZ;

    document.body.appendChild(ventana);

    initDrag(ventana);

    ventana.addEventListener('mousedown', () => {
      ventana.style.zIndex = ++windowZ;
    });

    const cerrarBtn = ventana.querySelector('.ventana-cerrar-btn');
    cerrarBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      cerrar(ventana);
    });

    // llamar init específico
    const cb = initCallbacks[tipo];
    if (cb) cb(ventana);

    return ventana;
  }

  function cerrar(ventana) {
    // limpiar audio si existe
    const state = ventana._state;
    if (state) {
      if (state.engine) { try { state.engine.stop(); } catch(_) {} }
      if (state.osc) { try { state.osc.stop(); } catch(_) {} }
      if (state.gainNode) { try { state.gainNode.disconnect(); } catch(_) {} }
      if (state.audio) { state.audio.pause(); state.audio.src = ''; }
      if (state.cleanup) { try { state.cleanup(); } catch(_) {} }
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
      ventana.style.left = `${origLeft + ev.clientX - startX}px`;
      ventana.style.top = `${origTop + ev.clientY - startY}px`;
    }

    function onUp() { dragging = false; }

    titlebar.addEventListener('mousedown', onDown);
    titlebar.addEventListener('touchstart', onDown, { passive: false });
    window.addEventListener('mousemove', onMove);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchend', onUp);
  }

  return { asegurarIcono, abrir, cerrar, registerInit };
})();
