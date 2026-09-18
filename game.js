// Catering One — the top-down tarmac driving game, plus the main loop.
(function () {
  const { W, H, ctx, C, rect, px, text, bubble, tint, keys, takeAction, Sound } = window.C1;
  const T = window.Top;

  const RL = 56, RR = 456;      // tarmac edges; grass outside
  const PW = T.TW, PH = T.TH;   // truck footprint
  const HUD = 28;
  const MIN_SPEED = 80, CRUISE = 160, MAX_SPEED = 360;

  let g;

  function newGame() {
    g = {
      state: 'ready', t: 0, readyT: 2.2,
      x: W / 2 - PW / 2, y: H - PH - 52, vx: 0, speed: CRUISE,
      dist: 0, score: 0, bonus: 0, lives: 3, invuln: 0, shake: 0,
      level: 1, levelFlash: 0, spawnT: 1.2,
      objs: [], parts: [], popups: [],
      hi: window.C1.loadHighScore(), newHi: false, quip: null
    };
  }

  // ---------- spawning ----------
  const BAG = [C.red, C.blue, C.green, C.orange, C.brown, C.afNavy, C.yellow, C.suitGray];
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function rand(a, b) { return a + Math.random() * (b - a); }

  function spawn() {
    const L = g.level;
    const table = [
      ['pile', 3], ['carts', 2 + L * 0.3], ['truck', 3], ['plane', 0.6 + L * 0.35],
      ['meal', 1.6], ['wrench', g.lives < 3 ? 0.35 : 0]
    ];
    let total = 0; table.forEach(function (e) { total += e[1]; });
    let r = Math.random() * total, kind = 'pile';
    for (const e of table) { if ((r -= e[1]) <= 0) { kind = e[0]; break; } }

    const o = { kind: kind, vx: 0 };
    if (kind === 'pile') {
      o.w = 32; o.h = 24; o.x = rand(RL + 4, RR - 36); o.y = -28;
      o.bags = T.pileBags(pick, BAG);
      o.hits = [[2, 2, 28, 20]];
    } else if (kind === 'carts') {
      o.n = 2 + Math.floor(Math.random() * Math.min(3, L)); o.w = (o.n + 1) * 24 - 4; o.h = 20;
      const dir = Math.random() < 0.5 ? 1 : -1;
      o.vx = dir * rand(56, 80 + L * 12); o.x = dir > 0 ? -o.w : W; o.y = rand(-80, -24);
      o.bags = []; for (let i = 0; i <= o.n; i++) o.bags.push([pick(BAG), pick(BAG), pick(BAG)]);
      o.hits = [[0, 2, o.w, 16]];
    } else if (kind === 'truck') {
      o.w = PW; o.h = PH; o.x = rand(RL + 8, RR - PW - 8);
      o.down = Math.random() < 0.4 + L * 0.05;
      o.own = o.down ? rand(30, 60 + L * 8) : rand(50, 110);
      o.y = -PH - 4; o.cab = pick([C.orange, C.green, C.red, C.suitGray]); o.stripe = pick([C.green, C.blue, C.orange]);
      o.wobble = rand(0, 6);
      o.hits = [[2, 2, 20, 40]];
    } else if (kind === 'plane') {
      o.tail = pick([C.red, C.green, C.orange, C.blue, C.afNavy]);
      const cross = Math.random() < 0.45;
      o.dir = cross ? (Math.random() < 0.5 ? 'right' : 'left') : 'down';
      if (cross) {
        o.w = T.PL_L; o.h = T.PL_W; o.vx = (o.dir === 'right' ? 1 : -1) * rand(44, 60 + L * 6);
        o.x = o.dir === 'right' ? -80 : W - 48; o.y = -o.h - 80;
      } else {
        o.w = T.PL_W; o.h = T.PL_L; o.own = rand(20, 40 + L * 6); o.x = rand(RL - 40, RR - 104); o.y = -o.h - 100;
      }
      o.hits = T.PLANE_HITS.map(function (h) { return T.orient(h, o.dir); });
    } else {
      o.w = 20; o.h = kind === 'meal' ? 16 : 20; o.x = rand(RL + 12, RR - 32); o.y = -24; o.pickup = true;
      o.hits = [[-4, -4, o.w + 8, o.h + 8]];
    }
    g.objs.push(o);
  }

  // ---------- helpers ----------
  function overlap(ax, ay, aw, ah, bx, by, bw, bh) { return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by; }
  function hitsPlayer(o) {
    const px0 = g.x + 4, py0 = g.y + 3, pw = PW - 8, ph = PH - 6;
    return o.hits.some(function (h) { return overlap(px0, py0, pw, ph, o.x + h[0], o.y + h[1], h[2], h[3]); });
  }
  function burst(x, y, colors, n) {
    for (let i = 0; i < n; i++) g.parts.push({ x: x, y: y, vx: rand(-120, 120), vy: rand(-160, 40), life: rand(0.4, 0.9), c: pick(colors), s: pick([2, 3, 4]) });
  }
  function popup(str, x, y, c) { g.popups.push({ str: str, x: x, y: y, life: 1, c: c }); }

  const QUIPS = ['LUNCH IS CANCELED.', 'NOT THE PUDDING CUPS!', 'I WANTED THE FISH.', 'CALL THE MOTORCADE.'];
  const HIT_LINES = ['OOF!', 'MY SALAD!', 'WATCH IT!', 'HOLD THE MAYO!'];
  const LEVEL_NAMES = ['', 'GATE AREA', 'RAMP RUSH', 'TAXIWAY TANGO', 'HEAVY TRAFFIC', 'FULL GROUND STOP'];

  // ---------- update ----------
  let scrollY = 0;

  function update(dt) {
    g.t += dt;
    if (g.state === 'ready') {
      g.readyT -= dt; scrollY += CRUISE * dt;
      if (g.readyT <= 0) g.state = 'run';
      Sound.setEngine(true, CRUISE / 2);
      takeAction();
      return;
    }
    if (g.state === 'over') {
      Sound.setEngine(false);
      g.overT += dt;
      tickParts(dt);
      if (takeAction() && g.overT > 1) newGame();
      return;
    }
    takeAction();

    // throttle and steering
    if (keys.up) g.speed += 180 * dt;
    else if (keys.down) g.speed -= 300 * dt;
    else g.speed += (CRUISE - g.speed) * Math.min(1, dt * 0.8);
    const onGrass = g.x < RL - 4 || g.x + PW > RR + 4;
    g.speed = Math.max(MIN_SPEED, Math.min(onGrass ? 140 : MAX_SPEED, g.speed));
    const steer = (keys.left ? -1 : 0) + (keys.right ? 1 : 0);
    const target = steer * (140 + g.speed * 0.35);
    g.vx += (target - g.vx) * Math.min(1, dt * 9);
    g.x = Math.max(8, Math.min(W - PW - 8, g.x + g.vx * dt));
    Sound.setEngine(true, g.speed / 2);

    scrollY += g.speed * dt;
    g.dist += g.speed * dt;
    g.score = Math.floor(g.dist / 8) + g.bonus;

    const newLevel = 1 + Math.floor(g.dist / 10400);
    if (newLevel > g.level) { g.level = newLevel; g.levelFlash = 2.5; Sound.levelUp(); }
    g.levelFlash = Math.max(0, g.levelFlash - dt);

    g.spawnT -= dt * (g.speed / CRUISE);
    if (g.spawnT <= 0) { spawn(); g.spawnT = rand(0.6, 1.3) / (1 + 0.18 * (g.level - 1)); }

    g.objs.forEach(function (o) {
      if (o.kind === 'truck') { o.y += (o.down ? g.speed + o.own : g.speed - o.own) * dt; o.x += Math.sin(g.t * 1.3 + o.wobble) * 12 * dt; }
      else if (o.kind === 'plane' && o.dir === 'down') o.y += (g.speed + o.own) * dt;
      else o.y += g.speed * dt;
      o.x += o.vx * dt;
    });
    g.objs = g.objs.filter(function (o) { return o.y < H + 40 && o.y > -600 && o.x > -240 && o.x < W + 240; });

    g.invuln = Math.max(0, g.invuln - dt);
    g.shake = Math.max(0, g.shake - dt);
    for (const o of g.objs) {
      if (!hitsPlayer(o)) continue;
      if (o.pickup) {
        o.dead = true;
        if (o.kind === 'meal') { g.bonus += 250; popup('+250', o.x, o.y, C.yellow); }
        else { g.lives = Math.min(3, g.lives + 1); popup('+1 HP', o.x, o.y, C.red); }
        Sound.pickup();
        continue;
      }
      if (g.invuln > 0) continue;
      crash(o);
      break;
    }
    g.objs = g.objs.filter(function (o) { return !o.dead; });
    tickParts(dt);
  }

  function crash(o) {
    g.lives -= 1; g.invuln = 2; g.shake = 0.35; g.speed = Math.max(MIN_SPEED, g.speed * 0.4);
    Sound.crash();
    burst(g.x + PW / 2, g.y + 8, [C.orange, C.green, C.brownLight, C.white, C.red], 26);
    if (o.kind === 'pile') { o.dead = true; burst(o.x + 16, o.y + 12, BAG, 16); }
    g.hitLine = { str: pick(HIT_LINES), life: 1.2 };
    if (g.lives <= 0) {
      g.state = 'over'; g.overT = 0; g.quip = pick(QUIPS); Sound.gameOver();
      if (g.score > g.hi) { g.hi = g.score; g.newHi = true; window.C1.saveHighScore(g.score); }
    }
  }

  function tickParts(dt) {
    g.parts.forEach(function (p) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 320 * dt; p.life -= dt; });
    g.parts = g.parts.filter(function (p) { return p.life > 0; });
    g.popups.forEach(function (p) { p.y -= 40 * dt; p.life -= dt; });
    g.popups = g.popups.filter(function (p) { return p.life > 0; });
    if (g.hitLine) { g.hitLine.life -= dt; if (g.hitLine.life <= 0) g.hitLine = null; }
  }

  // ---------- draw ----------
  function wrapY(v, period) { return ((v % period) + period) % period; }
  function drawGround() {
    const off = scrollY;
    rect(0, 0, W, H, C.tarmac);
    // concrete slabs: joints, patches, a few oil stains
    for (let y = Math.round(wrapY(off, 64)) - 64; y < H; y += 64) { rect(RL, y, RR - RL, 1, C.tarmacDark); rect(RL, y + 1, RR - RL, 1, C.tarmacLight); }
    for (let x = RL + 80; x < RR; x += 80) { rect(x, 0, 1, H, C.tarmacDark); rect(x + 1, 0, 1, H, C.tarmacLight); }
    for (let i = 0; i < 6; i++) {
      const sy = Math.round(wrapY(off + i * 173, H + 80)) - 40, sx = RL + 30 + (i * 97) % (RR - RL - 80);
      rect(sx, sy, 22, 8, C.tarmacDark); rect(sx + 4, sy - 3, 14, 3, C.tarmacDark); rect(sx + 6, sy + 8, 10, 2, C.tarmacDark);
    }
    // skid marks
    const sk = Math.round(wrapY(off + 300, 700)) - 120;
    rect(RL + 150, sk, 3, 90, tint(C.tarmac, 0.8)); rect(RL + 166, sk + 6, 3, 90, tint(C.tarmac, 0.8));
    // grass with tufts
    rect(0, 0, RL, H, C.grass); rect(RR, 0, W - RR, H, C.grass);
    for (let i = 0; i < 28; i++) {
      const yy = Math.round(wrapY(i * 37 + off, H + 20)) - 10;
      const lx = (i * 13) % (RL - 12) + 4, rx = RR + 6 + (i * 23) % (W - RR - 14);
      rect(lx, yy, 5, 1, C.grassDark); rect(lx + 1, yy - 2, 1, 2, C.grassDark); rect(lx + 3, yy - 3, 1, 3, C.grassDark);
      rect(rx, (yy + 120) % H, 5, 1, C.grassDark); rect(rx + 2, (yy + 117) % H, 1, 3, C.grassDark);
    }
    rect(RL - 2, 0, 2, H, C.grassDark); rect(RR, 0, 2, H, C.grassDark);
    // edge lights with glow
    for (let y = Math.round(wrapY(off, 48)) - 48; y < H; y += 48) {
      [RL - 12, RR + 8].forEach(function (lx) {
        rect(lx - 1, y - 1, 6, 6, tint(C.edgeLight, 0.45)); rect(lx, y, 4, 4, C.edgeLight); px(lx + 1, y + 1, C.white);
      });
    }
    // edge lines and dashed centerline
    rect(RL + 6, 0, 2, H, C.line); rect(RL + 10, 0, 2, H, C.line);
    rect(RR - 12, 0, 2, H, C.line); rect(RR - 8, 0, 2, H, C.line);
    for (let y = Math.round(wrapY(off, 48)) - 48; y < H; y += 48) { rect(W / 2 - 2, y, 4, 24, C.line); rect(W / 2 - 2, y + 23, 4, 1, tint(C.line, 0.7)); }
    // hold-short markings every so often
    const hy = Math.round(wrapY(off, 1800)) - 80;
    if (hy > -24 && hy < H) {
      rect(RL + 12, hy, RR - RL - 24, 2, C.line); rect(RL + 12, hy + 6, RR - RL - 24, 2, C.line);
      for (let x = RL + 12; x < RR - 12; x += 16) { rect(x, hy + 14, 8, 2, C.line); rect(x, hy + 20, 8, 2, C.line); }
      text('HOLD', W / 2 - 64, hy + 30, C.line, { shadow: false }); text('SHORT', W / 2 + 8, hy + 30, C.line, { shadow: false });
    }
    // taxiway sign on the grass
    const period = 840, sy = Math.round(wrapY(off + 240, period)) - 60;
    const n = Math.floor((off + 240) / period);
    rect(6, sy, 44, 22, C.black); rect(7, sy + 1, 42, 20, C.black); rect(6, sy, 44, 1, C.metal);
    text('ABCDEFGHJK'[n % 10] + (1 + n % 9), 11, sy + 3, C.yellow, { shadow: false });
    rect(18, sy + 22, 3, 8, C.metal); rect(36, sy + 22, 3, 8, C.metal);
  }

  function heart(x, y, full) {
    const c = full ? C.red : C.suitGray, hi = full ? tint(C.red, 1.4) : C.metal;
    rect(x + 1, y + 1, 5, 5, c); rect(x + 8, y + 1, 5, 5, c); rect(x, y + 2, 14, 5, c);
    rect(x + 1, y + 7, 12, 2, c); rect(x + 3, y + 9, 8, 2, c); rect(x + 5, y + 11, 4, 2, c); rect(x + 6, y + 13, 2, 1, c);
    rect(x + 2, y + 2, 2, 2, hi);
  }
  function drawHud() {
    rect(0, 0, W, HUD, C.black); rect(0, HUD - 2, W, 2, C.afNavy);
    text(String(g.score).padStart(6, '0'), 8, 6, C.white, { shadow: false });
    text('LV' + g.level, 120, 6, C.yellow, { shadow: false });
    rect(188, 9, 104, 10, C.night); rect(188, 9, 104, 1, C.suitGray);
    const f = (g.speed - MIN_SPEED) / (MAX_SPEED - MIN_SPEED);
    for (let i = 0; i < 13; i++) if (i / 13 < f) rect(190 + i * 8, 11, 6, 6, i > 9 ? C.red : i > 6 ? C.yellow : C.green);
    text(Math.round(g.speed / 6) + 'MPH', 300, 6, C.shade, { shadow: false });
    for (let i = 0; i < 3; i++) heart(W - 58 + i * 18, 7, i < g.lives);
  }

  function draw() {
    ctx.save();
    if (g.shake > 0) ctx.translate(Math.round(rand(-6, 6)), Math.round(rand(-4, 4)));
    drawGround();
    const order = { pile: 0, meal: 1, wrench: 1, carts: 2, truck: 3, plane: 5 };
    g.objs.slice().sort(function (a, b) { return order[a.kind] - order[b.kind]; }).forEach(function (o) {
      if (o.kind === 'pile') T.pile(o);
      else if (o.kind === 'carts') T.carts(o);
      else if (o.kind === 'truck') T.truck(o.x, o.y, o.cab, o.stripe, o.down, null);
      else if (o.kind === 'meal') T.meal(o.x, o.y, g.t);
      else if (o.kind === 'wrench') T.wrench(o.x, o.y, g.t);
    });
    if (g.state !== 'over' && (g.invuln === 0 || Math.floor(g.t * 14) % 2)) T.truck(g.x, g.y, C.blue, C.red, false, C.hairGray);
    g.objs.forEach(function (o) { if (o.kind === 'plane') T.plane(o.x, o.y, o.tail, o.dir, g.t); });
    g.parts.forEach(function (p) { rect(p.x, p.y, p.s, p.s, p.c); });
    ctx.restore();

    // incoming-plane warnings
    g.objs.forEach(function (o) {
      if (o.kind === 'plane' && o.y + o.h < HUD + 4 && Math.floor(g.t * 6) % 2) {
        const cx = Math.max(12, Math.min(W - 28, o.x + o.w / 2 - 8));
        rect(cx, HUD + 6, 16, 20, C.red); rect(cx + 2, HUD + 8, 12, 16, C.redDark);
        text('!', cx + 1, HUD + 8, C.white, { shadow: false });
      }
    });
    g.popups.forEach(function (p) { text(p.str, p.x, p.y, p.c); });
    if (g.hitLine && g.state === 'run') bubble(g.hitLine.str, g.x + PW / 2, g.y - 4);

    drawHud();

    if (g.state === 'ready') {
      bubble("WHERE'S THE DRIVE-THRU?", g.x + PW / 2, g.y - 4);
      text('GET READY', W / 2, 150, C.yellow, { align: 'center', size: 32 });
      text('DODGE PLANES, CARTS,', W / 2, 206, C.white, { align: 'center' });
      text('BAGS AND TRUCKS', W / 2, 230, C.white, { align: 'center' });
    }
    if (g.levelFlash > 0 && Math.floor(g.levelFlash * 4) % 2) {
      text('LEVEL ' + g.level, W / 2, 140, C.yellow, { align: 'center', size: 32 });
      text(LEVEL_NAMES[Math.min(g.level, LEVEL_NAMES.length - 1)], W / 2, 184, C.white, { align: 'center' });
    }
    if (g.state === 'over') drawGameOver();
  }

  function drawGameOver() {
    ctx.globalAlpha = 0.82; rect(0, 80, W, 264, C.black); ctx.globalAlpha = 1;
    rect(0, 80, W, 2, C.red); rect(0, 342, W, 2, C.red);
    text('GAME OVER', W / 2, 104, C.red, { align: 'center', size: 32 });
    text('"' + g.quip + '"', W / 2, 160, C.white, { align: 'center' });
    text('- THE PRESIDENT', W / 2, 184, C.shade, { align: 'center' });
    text('SCORE ' + String(g.score).padStart(6, '0'), W / 2, 228, C.white, { align: 'center' });
    text((g.newHi ? 'NEW HI ' : 'HI ') + String(g.hi).padStart(6, '0'), W / 2, 256, C.yellow, { align: 'center' });
    if (g.overT > 1 && Math.floor(g.overT * 2) % 2 === 0) text('SPACE / TAP TO RETRY', W / 2, 304, C.white, { align: 'center' });
  }

  // ---------- main loop ----------
  let mode = 'intro', last = 0;
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000 || 0);
    last = now;
    if (mode === 'intro') {
      window.Intro.update(dt); window.Intro.draw();
      if (window.Intro.isDone()) { mode = 'game'; newGame(); takeAction(); }
    } else { update(dt); draw(); }
    requestAnimationFrame(frame);
  }
  function boot() { window.Intro.start(false); requestAnimationFrame(function (t) { last = t; requestAnimationFrame(frame); }); }

  let booted = false;
  function bootOnce() { if (!booted) { booted = true; boot(); } }
  if (document.fonts && document.fonts.load) {
    document.fonts.load('16px "Press Start 2P"').then(bootOnce, bootOnce);
    setTimeout(bootOnce, 1500);
  } else bootOnce();
})();
