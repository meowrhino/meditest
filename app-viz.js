/*
 * app-viz.js — Ventana del visualizador Butterchurn.
 *
 * Carga el preset configurado en data.json y renderiza
 * en un canvas WebGL. Lee audio del AudioGlobal.analyser.
 */

const AppViz = (() => {
  'use strict';

  let appData = null;
  let butterchurnReady = false;
  const pendingInits = [];

  // listen for butterchurn module load
  window.addEventListener('butterchurn-ready', () => {
    butterchurnReady = true;
    pendingInits.forEach(fn => fn());
    pendingInits.length = 0;
  });

  function init(data) {
    appData = data;
    Windows.registerInit('viz', initViz);
    Windows.asegurarIcono('viz');
  }

  function initViz(ventana) {
    const canvas = ventana.querySelector('.viz-canvas');
    const presetLabel = ventana.querySelector('.viz-preset-name');
    const noAudioMsg = ventana.querySelector('.viz-no-audio');

    const state = { cleanup: null };
    ventana._state = state;

    function setup() {
      if (!window.butterchurn) {
        // queue for when butterchurn loads
        pendingInits.push(setup);
        return;
      }

      AudioGlobal.ensure();

      const body = ventana.querySelector('.viz-body');
      const w = body.clientWidth || 400;
      const h = body.clientHeight || 300;
      canvas.width = w;
      canvas.height = h;

      let visualizer;
      try {
        visualizer = window.butterchurn.createVisualizer(AudioGlobal.ctx, canvas, {
          width: w,
          height: h,
          pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
          textureRatio: 1,
        });
      } catch(e) {
        console.warn('Butterchurn init failed:', e);
        noAudioMsg.textContent = 'webgl not available';
        return;
      }

      // connect audio
      visualizer.connectAudio(AudioGlobal.analyser);

      // load preset
      const presetName = appData.visualizer.activePreset;
      const allPresets = window.base?.default || {};
      const presetData = allPresets[presetName];

      if (presetData) {
        visualizer.loadPreset(presetData, appData.visualizer.blendSeconds);
        presetLabel.textContent = presetName;
      } else {
        presetLabel.textContent = 'preset not found';
        console.warn(`Preset "${presetName}" not found in butterchurn-presets`);
      }

      // render loop
      let animId = null;
      let lastResize = 0;

      function render() {
        animId = requestAnimationFrame(render);

        // check resize every ~500ms
        const now = performance.now();
        if (now - lastResize > 500) {
          lastResize = now;
          const bw = body.clientWidth;
          const bh = body.clientHeight;
          if (bw !== canvas.width || bh !== canvas.height) {
            canvas.width = bw;
            canvas.height = bh;
            visualizer.setRendererSize(bw, bh);
          }
        }

        // hide "no audio" message if there's sound
        const data = new Uint8Array(AudioGlobal.analyser.frequencyBinCount);
        AudioGlobal.analyser.getByteFrequencyData(data);
        const hasAudio = data.some(v => v > 10);
        noAudioMsg.style.display = hasAudio ? 'none' : '';

        visualizer.render();
      }

      render();

      state.cleanup = () => {
        if (animId) cancelAnimationFrame(animId);
        try { visualizer.disconnectAudio(AudioGlobal.analyser); } catch(_) {}
      };
    }

    if (butterchurnReady) {
      setup();
    } else {
      pendingInits.push(setup);
    }
  }

  return { init };
})();
