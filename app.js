/*
 * app.js — Punto de entrada de meditest.
 *
 * Carga data.json e inicializa los módulos:
 * - AppChakra (frecuencias)
 * - AppMedi (meditaciones)
 * - AppViz (visualizador butterchurn)
 *
 * Cada módulo se encarga de registrar su icono y su init
 * en el sistema de ventanas (Windows).
 */

(async () => {
  'use strict';

  // cargar datos
  let data;
  try {
    const res = await fetch('data.json');
    data = await res.json();
  } catch(e) {
    console.error('Error cargando data.json:', e);
    return;
  }

  // inicializar módulos
  AppChakra.init(data);
  AppMedi.init(data);
  AppViz.init(data);

  // abrir una de cada al inicio (viz primero para que quede detrás)
  Windows.abrir('viz');
  Windows.abrir('chakra');
  Windows.abrir('medi');
})();
