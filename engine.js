// Catering One — shared engine: screen, palette, input, sound, text, shared sprites.
(function () {
  const W = 512, H = 448;   // fine pixel grid (2x the original 256 x 224)
  const canvas = document.getElementById('screen');
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  const C = {
    black: '#0c0b11', night: '#1b1830',
    sky1: '#f7b267', sky2: '#f79d65', sky3: '#f4845f', sky4: '#c9667a', sky5: '#7d5a94',
    sun: '#fff1b8', sunEdge: '#ffd36e',
    city: '#4b3f6b', cityLit: '#ffd36e',
    tarmac: '#4a4e57', tarmacDark: '#3c3f47', tarmacLight: '#5a5f69',
    line: '#f2c230', lineWhite: '#e9e6dc',
    grass: '#3d7a3a', grassDark: '#2f6230',
    edgeLight: '#4fa3ff',
    white: '#f4f4f0', shade: '#c9ccd4', shadeDark: '#9aa0ab',
    afBlue: '#8fc1e8', afNavy: '#1d3a6e', afGold: '#d9a441',
    window: '#2b3f66',
    skin: '#f0c09a', skin2: '#c98b62', skin3: '#8a5a3c',
    hairGray: '#d8d8d8', hairBrown: '#5b3a24', hairBlack: '#1f1a1a', hairBlond: '#e8c872',
    suit: '#1f2433', suitGray: '#50586b', suitNavy: '#24365e', suitTan: '#9a7b54',
    red: '#d6353a', redDark: '#a0242a', green: '#3fae5a', blue: '#3b6fd4', yellow: '#f2c230',
    orange: '#e8742f', brown: '#7a4a2a', brownLight: '#a86b3c',
    glass: '#9fd3f0', rubber: '#1a1a1f', metal: '#7d8594'
  };

  // ---------- drawing helpers ----------
  function rect(x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }
  function px(x, y, c) { rect(x, y, 1, 1, c); }

  // Darken (f < 1) or lighten (f > 1) a #rrggbb color.
  function tint(hex, f) {
    const n = parseInt(hex.slice(1), 16);
    const ch = function (v) { return Math.max(0, Math.min(255, Math.round(f < 1 ? v * f : v + (255 - v) * (f - 1)))); };
    return '#' + [n >> 16, (n >> 8) & 255, n & 255].map(function (v) { return ch(v).toString(16).padStart(2, '0'); }).join('');
  }

  const FONT = '"Press Start 2P", ui-monospace, Menlo, monospace';
  function text(str, x, y, c, opts) {
    opts = opts || {};
    const size = opts.size || 16;
    const off = Math.max(1, Math.round(size / 8));
    ctx.font = size + 'px ' + FONT;
    ctx.textBaseline = 'top';
    ctx.textAlign = opts.align || 'left';
    if (opts.shadow !== false) {
      ctx.fillStyle = opts.shadowColor || C.black;
      ctx.fillText(str, Math.round(x) + off, Math.round(y) + off);
    }
    ctx.fillStyle = c || C.white;
    ctx.fillText(str, Math.round(x), Math.round(y));
  }

  // Speech bubble whose tail points at (x, y), the speaker's head top.
  function bubble(str, x, y) {
    ctx.font = '16px ' + FONT;
    const w = Math.ceil(ctx.measureText(str).width) + 16;
    let bx = Math.round(x - w / 2);
    bx = Math.max(4, Math.min(W - w - 4, bx));
    const by = Math.round(y - 38);
    rect(bx - 2, by - 2, w + 4, 30, C.black);
    rect(bx, by, w, 26, C.white);
    rect(bx, by + 22, w, 4, C.shade);
    rect(x - 4, by + 26, 8, 4, C.white); rect(x - 2, by + 30, 4, 3, C.white);
    rect(x - 6, by + 26, 2, 4, C.black); rect(x + 4, by + 26, 2, 4, C.black);
    text(str, bx + 8, by + 5, C.black, { shadow: false });
  }

  // Pixel-map sprites: rows of characters looked up in a palette ('.' = clear).
  // Each (map, palette, flip) combination is rendered once to an offscreen canvas.
  const sprCache = new Map();
  function sprCanvas(rows, pal, flip) {
    const key = rows.join('/') + '|' + Object.keys(pal).map(function (k) { return k + pal[k]; }).join(',') + (flip ? '|f' : '');
    let cv = sprCache.get(key);
    if (cv) return cv;
    const w = rows.reduce(function (m, r) { return Math.max(m, r.length); }, 0);
    cv = document.createElement('canvas'); cv.width = w; cv.height = rows.length;
    const c2 = cv.getContext('2d');
    rows.forEach(function (row, y) {
      for (let x = 0; x < row.length; x++) {
        const col = pal[row[x]];
        if (!col) continue;
        c2.fillStyle = col; c2.fillRect(flip ? w - 1 - x : x, y, 1, 1);
      }
    });
    sprCache.set(key, cv);
    return cv;
  }
  function spr(rows, pal, x, y, flip) { ctx.drawImage(sprCanvas(rows, pal, flip), Math.round(x), Math.round(y)); }

  function line(x0, y0, x1, y1, c) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    ctx.fillStyle = c;
    for (let i = 0; i < 400; i++) {
      ctx.fillRect(x0, y0, 1, 1);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }

  // ---------- input ----------
  const keys = { left: false, right: false, up: false, down: false };
  let actionQueued = false;
  const KEYMAP = {
    ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
    ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down'
  };
  window.addEventListener('keydown', function (e) {
    Sound.unlock();
    const k = KEYMAP[e.code];
    if (k) { keys[k] = true; e.preventDefault(); }
    if (e.code === 'Space' || e.code === 'Enter') { actionQueued = true; e.preventDefault(); }
    if (e.code === 'KeyM') Sound.toggleMute();
  });
  window.addEventListener('keyup', function (e) {
    const k = KEYMAP[e.code];
    if (k) keys[k] = false;
  });
  canvas.addEventListener('pointerdown', function () { Sound.unlock(); actionQueued = true; });
  document.querySelectorAll('#pad button').forEach(function (b) {
    const k = b.dataset.key;
    const on = function (e) { e.preventDefault(); Sound.unlock(); keys[k] = true; b.classList.add('on'); actionQueued = true; };
    const off = function (e) { e.preventDefault(); keys[k] = false; b.classList.remove('on'); };
    b.addEventListener('pointerdown', on);
    b.addEventListener('pointerup', off);
    b.addEventListener('pointercancel', off);
    b.addEventListener('pointerleave', off);
  });
  function takeAction() { const a = actionQueued; actionQueued = false; return a; }

  // ---------- sound ----------
  const Sound = (function () {
    let ac = null, muted = false, engine = null, engineGain = null;
    function unlock() {
      if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
      try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ac = null; }
    }
    function tone(freq, dur, type, vol, when, slideTo) {
      if (!ac || muted) return;
      const t = ac.currentTime + (when || 0);
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = type || 'square';
      o.frequency.setValueAtTime(freq, t);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
      g.gain.setValueAtTime(vol || 0.06, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(ac.destination);
      o.start(t); o.stop(t + dur + 0.02);
    }
    function noise(dur, vol) {
      if (!ac || muted) return;
      const len = Math.floor(ac.sampleRate * dur);
      const buf = ac.createBuffer(1, len, ac.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const s = ac.createBufferSource(), g = ac.createGain();
      s.buffer = buf; g.gain.value = vol || 0.15;
      s.connect(g).connect(ac.destination); s.start();
    }
    function melody(notes, step, type, vol) {
      notes.forEach(function (n, i) { if (n) tone(n, step * 0.9, type || 'square', vol || 0.05, i * step); });
    }
    function setEngine(on, speed) {
      if (!ac) return;
      if (on && !muted) {
        if (!engine) {
          engine = ac.createOscillator(); engineGain = ac.createGain();
          engine.type = 'sawtooth'; engineGain.gain.value = 0.018;
          engine.connect(engineGain).connect(ac.destination); engine.start();
        }
        engine.frequency.setTargetAtTime(45 + speed * 0.5, ac.currentTime, 0.1);
      } else if (engine) {
        engine.stop(); engine.disconnect(); engine = null;
      }
    }
    function toggleMute() { muted = !muted; if (muted) setEngine(false); }
    return {
      unlock: unlock, tone: tone, noise: noise, melody: melody, setEngine: setEngine, toggleMute: toggleMute,
      isMuted: function () { return muted; },
      fanfare: function () { melody([392, 392, 523, 0, 523, 659, 784, 0, 659, 784], 0.14, 'square', 0.045); },
      flash: function () { tone(1800, 0.05, 'square', 0.02); },
      step: function () { tone(140, 0.03, 'triangle', 0.03); },
      crash: function () { noise(0.35, 0.2); tone(180, 0.3, 'sawtooth', 0.06, 0, 40); },
      pickup: function () { melody([880, 1175, 1568], 0.06, 'square', 0.04); },
      gameOver: function () { melody([392, 330, 262, 196], 0.22, 'triangle', 0.08); },
      levelUp: function () { melody([523, 659, 784, 1047], 0.08, 'square', 0.04); }
    };
  })();

  // ---------- fit to screen ----------
  function fit() {
    const pad = document.getElementById('pad');
    const padH = getComputedStyle(pad).display === 'none' ? 0 : pad.offsetHeight + 12;
    const helpH = 40;
    const availW = window.innerWidth - 32 - 20;
    const availH = window.innerHeight - 24 - 20 - padH - helpH;
    const s = Math.max(0.25, Math.min(availW / W, availH / H, 2.5));
    canvas.style.width = Math.floor(W * s) + 'px';
    canvas.style.height = Math.floor(H * s) + 'px';
    // Back the canvas at the screen's real pixel density so text and edges stay sharp;
    // all drawing still happens on the 256 x 224 logical grid.
    const k = Math.max(1, Math.ceil(s * (window.devicePixelRatio || 1)));
    if (canvas.width !== W * k) { canvas.width = W * k; canvas.height = H * k; }
    ctx.setTransform(k, 0, 0, k, 0, 0);
    ctx.imageSmoothingEnabled = false;
  }
  window.addEventListener('resize', fit);
  fit();

  function loadHighScore() { try { return parseInt(localStorage.getItem('c1-hi') || '0', 10) || 0; } catch (e) { return 0; } }
  function saveHighScore(v) { try { localStorage.setItem('c1-hi', String(v)); } catch (e) { /* storage unavailable */ } }

  window.C1 = {
    W: W, H: H, ctx: ctx, C: C, rect: rect, px: px, line: line, text: text, bubble: bubble,
    tint: tint, spr: spr, sprCanvas: sprCanvas,
    keys: keys, takeAction: takeAction, Sound: Sound,
    loadHighScore: loadHighScore, saveHighScore: saveHighScore, FONT: FONT
  };
})();
