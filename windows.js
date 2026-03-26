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

  // SVG icons for desktop (unique drawings, no text boxes)
  const ICON_SVGS = {
    chakra: `<svg viewBox="0 0 32 32" width="32" height="32"><path d="M4 16 Q8 4 12 16 Q16 28 20 16 Q24 4 28 16" fill="none" stroke="#ff00ff" stroke-width="2.5" stroke-linecap="round"/></svg>`,
    medi:   `<svg viewBox="0 0 32 32" width="32" height="32"><path d="M16 24 Q10 18 8 10 Q16 14 16 14 Q16 14 24 10 Q22 18 16 24Z" fill="#00ffff" stroke="none"/></svg>`,
    viz:    `<svg viewBox="0 0 32 32" width="32" height="32"><path d="M2 16 Q16 4 30 16 Q16 28 2 16Z" fill="none" stroke="#ffff00" stroke-width="2"/><circle cx="16" cy="16" r="4" fill="#ffff00"/></svg>`,
  };

  const ICON_LABELS = {
    chakra: 'onda',
    medi:   'guía',
    viz:    'visión',
  };

  function asegurarIcono(tipo) {
    const id = `icono-${tipo}`;
    if (document.getElementById(id)) return;

    const icono = document.createElement('div');
    icono.className = 'icono';
    icono.id = id;

    const img = document.createElement('div');
    img.className = 'icono-img';
    img.innerHTML = ICON_SVGS[tipo] || '';

    const label = document.createElement('span');
    label.className = 'icono-label';
    label.textContent = ICON_LABELS[tipo] || tipo;

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

    const cerrarBtn = ventana.querySelector('.ventana-cerrar-btn') || ventana.querySelector('.ventana-cerrar');
    if (cerrarBtn) {
      cerrarBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        cerrar(ventana);
      });
    }

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
    // drag from titlebar if exists, otherwise from the franja-color or franja-chakras
    const dragHandle = ventana.querySelector('.ventana-titlebar') || ventana.querySelector('.franja-color') || ventana;
    let dragging = false;
    let startX, startY, origLeft, origTop;

    function onDown(e) {
      if (e.target.closest('.ventana-cerrar-btn') || e.target.closest('.ventana-cerrar')) return;
      if (e.target.closest('button') || e.target.closest('input') || e.target.closest('canvas')) return;
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

    dragHandle.addEventListener('mousedown', onDown);
    dragHandle.addEventListener('touchstart', onDown, { passive: false });
    window.addEventListener('mousemove', onMove);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchend', onUp);
  }

  return { asegurarIcono, abrir, cerrar, registerInit };
})();
