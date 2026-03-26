/*
 * build.js — Construye el DOM de las 3 demos (v6_1, v6_2, v6_3)
 * Cada una tiene representación DISTINTA de chakras e iconos
 */

const CC = ['#ff6b6b','#ffa94d','#ffd43b','#69db7c','#748ffc','#d0bfff','#e599f7'];
const CN = ['raíz','sacro','plexo','corazón','garganta','3er ojo','corona'];
const CF = [396,417,528,639,741,852,963];

// chakra symbol SVGs (just the inner shape, no outer circle)
const CHSYM = [
  c => `<rect x="8" y="8" width="24" height="24" fill="none" stroke="${c}" stroke-width="2.5"/>`,
  c => `<circle cx="20" cy="20" r="13" fill="none" stroke="${c}" stroke-width="2.5"/><path d="M11 28 Q20 16 29 28" fill="none" stroke="${c}" stroke-width="2"/>`,
  c => `<polygon points="20,32 5,8 35,8" fill="none" stroke="${c}" stroke-width="2.5" transform="rotate(180 20 20)"/>`,
  c => `<polygon points="20,6 31,30 9,30" fill="none" stroke="${c}" stroke-width="2"/><polygon points="20,34 9,10 31,10" fill="none" stroke="${c}" stroke-width="2"/>`,
  c => `<circle cx="20" cy="20" r="14" fill="none" stroke="${c}" stroke-width="2.5"/><circle cx="20" cy="20" r="6" fill="none" stroke="${c}" stroke-width="2"/>`,
  c => `<ellipse cx="20" cy="20" rx="16" ry="9" fill="none" stroke="${c}" stroke-width="2.5"/><circle cx="20" cy="20" r="5" fill="${c}"/>`,
  c => `<circle cx="20" cy="20" r="13" fill="none" stroke="${c}" stroke-width="2"/><line x1="20" y1="3" x2="20" y2="37" stroke="${c}" stroke-width="1.5" opacity="0.5"/><line x1="3" y1="20" x2="37" y2="20" stroke="${c}" stroke-width="1.5" opacity="0.5"/><line x1="7" y1="7" x2="33" y2="33" stroke="${c}" stroke-width="1.5" opacity="0.5"/><line x1="33" y1="7" x2="7" y2="33" stroke="${c}" stroke-width="1.5" opacity="0.5"/>`,
];

// ── V6_1: chakras as vertical bars (equalizer) ──
function buildV6_1() {
  const d = document.createElement('div');
  d.id = 'v6_1'; d.className = 'dm on';

  const lbl = document.createElement('div');
  lbl.className = 'dlbl';
  lbl.textContent = 'v6_1 · retro terminal';
  d.appendChild(lbl);

  // icons: ASCII art
  const icos = document.createElement('div');
  icos.className = 'icos';
  [['∿','onda'],['☸','medita'],['◉','visual']].forEach(([g,l]) => {
    icos.innerHTML += `<div style="display:flex;flex-direction:column;align-items:center;gap:2px"><div class="ico-i">${g}</div><div class="ico-l">${l}</div></div>`;
  });
  d.appendChild(icos);

  const row = document.createElement('div');
  row.className = 'drow';

  // freq window
  const w = document.createElement('div');
  w.className = 'wn';
  const heights = [40, 50, 60, 85, 70, 55, 45]; // bar heights
  let chHTML = '';
  CC.forEach((c, i) => {
    chHTML += `<div class="ch-bar${i===3?' sel':''}" style="background:${c}20;color:${c}" data-i="${i}"><div class="ch-inner" style="height:${heights[i]}px"></div></div>`;
  });
  w.innerHTML = `
    <div style="display:flex;flex-direction:column">
      <div class="ch-row" id="cr1">${chHTML}</div>
      <div class="fr-color" style="background:#69db7c" id="fc1"><div style="text-align:center"><div class="c-name">CORAZÓN</div><div class="c-hz">639 Hz</div></div></div>
      <div class="fr-ctrl"><div style="display:flex;align-items:center;gap:10px"><div class="btn">om drone</div><div class="btn btn-play act">▶</div><input type="range" class="sl" disabled></div></div>
      <div class="rb"></div>
    </div>`;
  row.appendChild(w);

  // medi window
  const wm = document.createElement('div');
  wm.className = 'wn wn-sm';
  wm.innerHTML = `
    <div style="display:flex;flex-direction:column">
      <div class="m-item act"><span>relajación guiada</span><span>0:26</span></div>
      <div class="m-item"><span>respiración consciente</span><span>0:40</span></div>
      <div class="m-item"><span>body scan</span><span>0:35</span></div>
      <div class="m-ctrl"><span class="m-now">relajación guiada</span><div class="btn btn-play">▶</div></div>
      <div class="rb"></div>
    </div>`;
  row.appendChild(wm);
  d.appendChild(row);
  document.body.appendChild(d);

  // interactivity
  d.querySelectorAll('.ch-bar').forEach(bar => {
    bar.onclick = () => {
      d.querySelectorAll('.ch-bar').forEach(b => b.classList.remove('sel'));
      bar.classList.add('sel');
      const i = +bar.dataset.i;
      const fc = d.querySelector('#fc1');
      fc.style.background = CC[i];
      fc.querySelector('.c-name').textContent = CN[i].toUpperCase();
      fc.querySelector('.c-hz').textContent = CF[i] + ' Hz';
    };
  });
}

// ── V6_2: chakras as overlapping orbs ──
function buildV6_2() {
  const d = document.createElement('div');
  d.id = 'v6_2'; d.className = 'dm';

  const lbl = document.createElement('div');
  lbl.className = 'dlbl';
  lbl.textContent = 'v6_2 · grimorio';
  d.appendChild(lbl);

  // icons: arcane symbols
  const icos = document.createElement('div');
  icos.className = 'icos';
  [['⚶','sonido'],['❦','guía'],['◈','visión']].forEach(([g,l]) => {
    icos.innerHTML += `<div style="display:flex;flex-direction:column;align-items:center;gap:2px"><div class="ico-i">${g}</div><div class="ico-l">${l}</div></div>`;
  });
  d.appendChild(icos);

  const row = document.createElement('div');
  row.className = 'drow';

  // freq window
  const w = document.createElement('div');
  w.className = 'wn';
  let orbsHTML = '';
  CC.forEach((c, i) => {
    orbsHTML += `<div class="ch-orb${i===3?' sel':''}" style="color:${c};border-color:${c}" data-i="${i}"><svg viewBox="0 0 40 40">${CHSYM[i](c)}</svg></div>`;
  });
  w.innerHTML = `
    <div style="display:flex;flex-direction:column">
      <div class="ch-row" id="cr2">${orbsHTML}</div>
      <div class="fr-color" style="background:#69db7c" id="fc2"><div style="text-align:center"><div class="c-name">corazón</div><div class="c-hz">639 Hz</div></div></div>
      <div class="fr-ctrl"><div style="display:flex;align-items:center;gap:10px"><div class="btn">om drone</div><div class="btn btn-play act">▶</div><input type="range" class="sl" disabled></div></div>
      <div class="rb"></div>
    </div>`;
  row.appendChild(w);

  // medi
  const wm = document.createElement('div');
  wm.className = 'wn wn-sm';
  wm.innerHTML = `
    <div style="display:flex;flex-direction:column">
      <div class="m-item act"><span>relajación guiada</span><span>0:26</span></div>
      <div class="m-item"><span>respiración consciente</span><span>0:40</span></div>
      <div class="m-item"><span>body scan</span><span>0:35</span></div>
      <div class="m-ctrl"><span class="m-now">relajación guiada</span><div class="btn btn-play">▶</div></div>
      <div class="rb"></div>
    </div>`;
  row.appendChild(wm);
  d.appendChild(row);
  document.body.appendChild(d);

  d.querySelectorAll('.ch-orb').forEach(orb => {
    orb.onclick = () => {
      d.querySelectorAll('.ch-orb').forEach(o => o.classList.remove('sel'));
      orb.classList.add('sel');
      const i = +orb.dataset.i;
      const fc = d.querySelector('#fc2');
      fc.style.background = CC[i];
      fc.querySelector('.c-name').textContent = CN[i];
      fc.querySelector('.c-hz').textContent = CF[i] + ' Hz';
    };
  });
}

// ── V6_3: chakras as solid color blocks (pixel art) ──
function buildV6_3() {
  const d = document.createElement('div');
  d.id = 'v6_3'; d.className = 'dm';

  const lbl = document.createElement('div');
  lbl.className = 'dlbl';
  lbl.textContent = 'v6_3 · arcade cósmico';
  d.appendChild(lbl);

  // icons: colorful symbols
  const icos = document.createElement('div');
  icos.className = 'icos';
  [
    [`<svg viewBox="0 0 32 32" width="30" height="30"><path d="M4 16 Q8 4 12 16 Q16 28 20 16 Q24 4 28 16" fill="none" stroke="#ff00ff" stroke-width="3" stroke-linecap="round"/></svg>`,'onda'],
    [`<svg viewBox="0 0 32 32" width="30" height="30"><path d="M16 24 Q10 18 8 10 Q16 14 16 14 Q16 14 24 10 Q22 18 16 24Z" fill="#00ffff" stroke="none"/></svg>`,'guía'],
    [`<svg viewBox="0 0 32 32" width="30" height="30"><path d="M2 16 Q16 4 30 16 Q16 28 2 16Z" fill="none" stroke="#ffff00" stroke-width="2.5"/><circle cx="16" cy="16" r="4" fill="#ffff00"/></svg>`,'visión'],
  ].forEach(([svg,l]) => {
    icos.innerHTML += `<div style="display:flex;flex-direction:column;align-items:center;gap:2px"><div class="ico-i">${svg}</div><div class="ico-l">${l}</div></div>`;
  });
  d.appendChild(icos);

  const row = document.createElement('div');
  row.className = 'drow';

  // freq window
  const w = document.createElement('div');
  w.className = 'wn';
  let blocksHTML = '';
  CC.forEach((c, i) => {
    // symbol in BLACK on colored background
    blocksHTML += `<div class="ch-block${i===3?' sel':''}" style="background:${c}" data-i="${i}"><svg viewBox="0 0 40 40">${CHSYM[i]('#000')}</svg></div>`;
  });
  w.innerHTML = `
    <div style="display:flex;flex-direction:column">
      <div class="ch-row" id="cr3">${blocksHTML}</div>
      <div class="fr-color" style="background:#69db7c" id="fc3"><div style="text-align:center"><div class="c-name">CORAZÓN</div><div class="c-hz">639 Hz</div></div></div>
      <div class="fr-ctrl"><div style="display:flex;align-items:center;gap:10px"><div class="btn">om drone</div><div class="btn btn-play act">▶</div><input type="range" class="sl" disabled></div></div>
      <div class="rb"></div>
    </div>`;
  row.appendChild(w);

  // medi
  const wm = document.createElement('div');
  wm.className = 'wn wn-sm';
  wm.innerHTML = `
    <div style="display:flex;flex-direction:column">
      <div class="m-item act"><span>relajación guiada</span><span>0:26</span></div>
      <div class="m-item"><span>respiración consciente</span><span>0:40</span></div>
      <div class="m-item"><span>body scan</span><span>0:35</span></div>
      <div class="m-ctrl"><span class="m-now">relajación guiada</span><div class="btn btn-play">▶</div></div>
      <div class="rb"></div>
    </div>`;
  row.appendChild(wm);
  d.appendChild(row);
  document.body.appendChild(d);

  d.querySelectorAll('.ch-block').forEach(block => {
    block.onclick = () => {
      d.querySelectorAll('.ch-block').forEach(b => b.classList.remove('sel'));
      block.classList.add('sel');
      const i = +block.dataset.i;
      const fc = d.querySelector('#fc3');
      fc.style.background = CC[i];
      fc.querySelector('.c-name').textContent = CN[i].toUpperCase();
      fc.querySelector('.c-hz').textContent = CF[i] + ' Hz';
    };
  });
}

// BUILD ALL
buildV6_1();
buildV6_2();
buildV6_3();
