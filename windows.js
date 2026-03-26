/*
 * windows.js — Gestión de ventanas del escritorio.
 *
 * Maneja: abrir, cerrar, drag, z-index, cascada,
 * iconos de escritorio y multi-instancia.
 */

const Windows = (() => {
  'use strict';

  let windowZ = 10;
  let windowCounts = {};
  const CASCADE_OFFSET = 28;
  const iconosContainer = document.getElementById('iconos');

  // ── snap grid system ──
  // divides viewport into 3 slots (vertical if wider, horizontal if taller)
  const snapSlots = [null, null, null]; // which ventana occupies each slot

  function getSlotRects() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const isWide = vw >= vh;
    const rects = [];

    if (isWide) {
      // 3 vertical columns
      const w = Math.floor(vw / 3);
      for (let i = 0; i < 3; i++) {
        rects.push({ left: i * w, top: 0, width: w, height: vh });
      }
    } else {
      // 3 horizontal rows
      const h = Math.floor(vh / 3);
      for (let i = 0; i < 3; i++) {
        rects.push({ left: 0, top: i * h, width: vw, height: h });
      }
    }
    return rects;
  }

  function snapToGrid(ventana) {
    // find first free slot
    let slotIdx = -1;
    for (let i = 0; i < 3; i++) {
      if (!snapSlots[i] || !document.body.contains(snapSlots[i])) {
        snapSlots[i] = null; // clean stale refs
      }
      if (!snapSlots[i]) { slotIdx = i; break; }
    }

    if (slotIdx === -1) return; // all full

    // if already snapped, unsnap first
    const prevSlot = snapSlots.indexOf(ventana);
    if (prevSlot !== -1) snapSlots[prevSlot] = null;

    snapSlots[slotIdx] = ventana;
    const rects = getSlotRects();
    const r = rects[slotIdx];

    ventana.classList.add('is-snapped');
    ventana.style.top = r.top + 'px';
    ventana.style.left = r.left + 'px';
    ventana.style.width = r.width + 'px';
    ventana.style.height = r.height + 'px';
    ventana.style.zIndex = ++windowZ;

    updateAllSnapButtons();
  }

  function updateAllSnapButtons() {
    // clean stale
    for (let i = 0; i < 3; i++) {
      if (snapSlots[i] && !document.body.contains(snapSlots[i])) snapSlots[i] = null;
    }
    const allFull = snapSlots.every(s => s !== null);
    document.querySelectorAll('.ventana-snap').forEach(btn => {
      const vent = btn.closest('.ventana');
      const isSnapped = snapSlots.includes(vent);
      // disable if all slots full AND this window isn't already snapped
      btn.classList.toggle('disabled', allFull && !isSnapped);
    });
  }

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

    const cerrarBtn = ventana.querySelector('.ventana-cerrar');
    if (cerrarBtn) {
      cerrarBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        cerrar(ventana);
      });
    }

    // snap-to-grid (yellow button)
    const snapBtn = ventana.querySelector('.ventana-snap');
    if (snapBtn) {
      snapBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        snapToGrid(ventana);
      });
    }

    // llamar init específico
    const cb = initCallbacks[tipo];
    if (cb) cb(ventana);

    return ventana;
  }

  function cerrar(ventana) {
    // free snap slot
    const si = snapSlots.indexOf(ventana);
    if (si !== -1) snapSlots[si] = null;
    setTimeout(updateAllSnapButtons, 50);

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
    const dragHandle = ventana.querySelector('.ventana-titlebar') || ventana;
    let dragging = false;
    let startX, startY, origLeft, origTop;

    function onDown(e) {
      if (e.target.closest('.ventana-cerrar')) return;
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
