/*
 * audio-global.js — Audio context y analyser compartido.
 *
 * Todas las ventanas conectan su audio a un AnalyserNode global
 * para que el visualizador butterchurn pueda reaccionar a todo.
 */

const AudioGlobal = (() => {
  'use strict';

  let ctx = null;
  let analyser = null;
  let masterGain = null;

  function ensure() {
    if (ctx) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.8;
    masterGain = ctx.createGain();
    masterGain.gain.value = 1;
    masterGain.connect(analyser);
    analyser.connect(ctx.destination);
  }

  function resume() {
    ensure();
    if (ctx.state === 'suspended') ctx.resume();
  }

  return {
    get ctx()       { ensure(); return ctx; },
    get analyser()  { ensure(); return analyser; },
    get masterGain(){ ensure(); return masterGain; },
    resume,
    ensure,
  };
})();
