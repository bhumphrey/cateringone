// Catering One — the top-down tarmac driving game, plus the main loop.
(function () {
  const { W, H, ctx, C, rect, px, text, bubble, keys, takeAction, Sound } = window.C1;

  const RL = 28, RR = 228;      // tarmac edges; grass outside
  const PW = 12, PH = 22;       // truck footprint
  const HUD = 14;
  const MIN_SPEED = 40, CRUISE = 80, MAX_SPEED = 180;

  let g;

  function newGame() {
    g = {
      state: 'ready', t: 0, readyT: 2.2,
      x: W / 2 - PW / 2, y: H - PH - 26, vx: 0, speed: CRUISE,
      dist: 0, score: 0, bonus: 0, lives: 3, invuln: 0, shake: 0,
      level: 1, levelFlash: 0, spawnT: 1.2,
      objs: [], parts: [], popups: [],
      hi: window.C1.loadHighScore(), newHi: false, quip: null
    };
  }

  // ---------- sprites (top-down) ----------
  function truck(x, y, cab, stripe, facingDown, driverHair) {
    x = Math.round(x); y = Math.round(y);
    const cabY = facingDown ? y + PH - 7 : y, boxY = facingDown ? y : y + 7;
    rect(x + 2, y + 3, PW, PH, 'rgba(0,0,0,0.25)');                     // shadow
    [[x - 1, y + 2], [x + PW, y + 2], [x - 1, y + PH - 6], [x + PW, y + PH - 6]].forEach(function (w) { rect(w[0], w[1], 1, 4, C.rubber); });
    rect(x, cabY, PW, 7, cab);
    rect(x + 2, facingDown ? cabY + 4 : cabY + 1, PW - 4, 2, C.glass);
    if (driverHair) rect(x + 7, facingDown ? cabY + 2 : cabY + 3, 2, 2, driverHair);
    rect(x, boxY, PW, 15, C.white);
    rect(x, boxY, 1, 15, stripe); rect(x + PW - 1, boxY, 1, 15, stripe);
    rect(x + 2, boxY + 3, PW - 4, 1, C.shade); rect(x + 2, boxY + 7, PW - 4, 1, C.shade); rect(x + 2, boxY + 11, PW - 4, 1, C.shade);
  }

  // Airliner drawn nose-down as rects in a 72 x 64 box, then transposed for sideways taxiing.
  function planeRects(tail) {
    const r = [];
    [[0, 22, 72, 3], [4, 25, 64, 3], [10, 28, 52, 3], [16, 31, 40, 3]].forEach(function (a) { r.push(a.concat(C.shade)); });
    [[10, 28, 4, 9], [20, 30, 4, 9], [48, 30, 4, 9], [58, 28, 4, 9]].forEach(function (a) { r.push(a.concat(C.metal)); });
    r.push([22, 4, 28, 3, C.shade], [26, 7, 20, 2, C.shade]);
    r.push([31, 4, 10, 56, C.white], [32, 60, 8, 3, C.white], [34, 63, 4, 1, C.white]);
    r.push([35, 8, 2, 48, C.shade], [33, 56, 6, 2, C.window]);
    r.push([35, 0, 2, 9, tail]);
    return r;
  }
  const PLANE_HITS = [[31, 2, 10, 62], [2, 22, 68, 9], [14, 31, 44, 5], [22, 3, 28, 6]];
  function orient(rc, dir) {        // dir: 'down' | 'right' | 'left'
    if (dir === 'down') return rc;
    const [x, y, w, h] = rc;
    if (dir === 'right') return [y, x, h, w].concat(rc.slice(4));
    return [64 - y - h, x, h, w].concat(rc.slice(4));
  }
  function drawPlane(o) {
    const rs = planeRects(o.tail).map(function (rc) { return orient(rc, o.dir); });
    rs.forEach(function (rc) { rect(o.x + rc[0] + 5, o.y + rc[1] + 6, rc[2], rc[3], 'rgba(0,0,0,0.25)'); });
    rs.forEach(function (rc) { rect(o.x + rc[0], o.y + rc[1], rc[2], rc[3], rc[4]); });
    // blinking nav lights on the wingtips
    if (Math.floor(g.t * 3) % 2) {
      const a = orient([0, 22, 1, 1], o.dir), b = orient([71, 22, 1, 1], o.dir);
      px(o.x + a[0], o.y + a[1], C.red); px(o.x + b[0], o.y + b[1], C.green);
    }
  }
  function drawCarts(o) {
    const n = o.n, dir = o.vx > 0 ? 1 : -1;
    for (let i = 0; i <= n; i++) {
      // tug leads in the direction of travel
      const slot = dir > 0 ? n - i : i;
      const cx = Math.round(o.x + slot * 12), cy = Math.round(o.y);
      rect(cx + 2, cy + 2, 10, 10, 'rgba(0,0,0,0.25)');
      if (i === 0) {
        rect(cx, cy, 10, 10, C.yellow); rect(cx + 2, cy + 2, 6, 4, C.black); rect(cx + 3, cy + 3, 2, 2, C.hairBrown);
      } else {
        rect(cx, cy, 10, 10, C.metal); rect(cx + 1, cy + 1, 8, 8, C.shadeDark);
        const bags = o.bags[i];
        rect(cx + 1, cy + 1, 4, 3, bags[0]); rect(cx + 5, cy + 2, 4, 3, bags[1]); rect(cx + 2, cy + 5, 5, 3, bags[2]);
      }
      if (i < n) rect(dir > 0 ? cx - 2 : cx + 10, cy + 4, 2, 1, C.black);
    }
  }
  function drawPile(o) {
    const x = Math.round(o.x), y = Math.round(o.y);
    rect(x + 2, y + 2, 16, 12, 'rgba(0,0,0,0.25)');
    o.bags.forEach(function (b) { rect(x + b[0], y + b[1], b[2], b[3], b[4]); rect(x + b[0], y + b[1], b[2], 1, C.white); });
  }
  function drawMeal(o) {
    const x = Math.round(o.x), y = Math.round(o.y + Math.sin(g.t * 6 + o.x) * 1.5);
    rect(x - 1, y - 1, 12, 10, C.yellow);
    rect(x, y, 10, 8, C.shade); rect(x + 1, y + 1, 4, 3, C.orange); rect(x + 6, y + 1, 3, 3, C.green); rect(x + 1, y + 5, 8, 2, C.brownLight);
  }
  function drawWrench(o) {
    const x = Math.round(o.x), y = Math.round(o.y + Math.sin(g.t * 6) * 1.5);
    rect(x - 1, y - 1, 12, 12, C.red);
    rect(x + 1, y + 3, 8, 4, C.white); rect(x + 3, y + 1, 4, 8, C.white);
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

    const o = { kind: kind, vx: 0, vy: 0 };
    if (kind === 'pile') {
      o.w = 16; o.h = 12; o.x = rand(RL + 2, RR - 18); o.y = -14;
      o.bags = [[0, 5, 8, 6, pick(BAG)], [7, 6, 9, 6, pick(BAG)], [3, 1, 9, 5, pick(BAG)]];
      o.hits = [[1, 1, 14, 10]];
    } else if (kind === 'carts') {
      o.n = 2 + Math.floor(Math.random() * Math.min(3, L)); o.w = (o.n + 1) * 12 - 2; o.h = 10;
      const dir = Math.random() < 0.5 ? 1 : -1;
      o.vx = dir * rand(28, 40 + L * 6); o.x = dir > 0 ? -o.w : W; o.y = rand(-40, -12);
      o.bags = []; for (let i = 0; i <= o.n; i++) o.bags.push([pick(BAG), pick(BAG), pick(BAG)]);
      o.hits = [[0, 1, o.w, 8]];
    } else if (kind === 'truck') {
      o.w = PW; o.h = PH; o.x = rand(RL + 4, RR - PW - 4);
      o.down = Math.random() < 0.4 + L * 0.05;
      o.own = o.down ? rand(15, 30 + L * 4) : rand(25, 55);
      o.y = -PH - 2; o.cab = pick([C.orange, C.green, C.red, C.suitGray]); o.stripe = pick([C.green, C.blue, C.orange]);
      o.wobble = rand(0, 6);
      o.hits = [[1, 1, 10, 20]];
    } else if (kind === 'plane') {
      o.tail = pick([C.red, C.green, C.orange, C.blue, C.afNavy]);
      const cross = Math.random() < 0.45;
      o.dir = cross ? (Math.random() < 0.5 ? 'right' : 'left') : 'down';
      if (cross) {
        o.w = 64; o.h = 72; o.vx = (o.dir === 'right' ? 1 : -1) * rand(22, 30 + L * 3);
        o.x = o.dir === 'right' ? -40 : W - 24; o.y = -o.h - 40;
      } else {
        o.w = 72; o.h = 64; o.own = rand(10, 20 + L * 3); o.x = rand(RL - 20, RR - 52); o.y = -o.h - 50;
      }
      o.hits = PLANE_HITS.map(function (h) { return orient(h, o.dir); });
    } else if (kind === 'meal' || kind === 'wrench') {
      o.w = 10; o.h = kind === 'meal' ? 8 : 10; o.x = rand(RL + 6, RR - 16); o.y = -12; o.pickup = true;
      o.hits = [[-2, -2, o.w + 4, o.h + 4]];
    }
    g.objs.push(o);
  }

  // ---------- helpers ----------
  function overlap(ax, ay, aw, ah, bx, by, bw, bh) { return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by; }
  function hitsPlayer(o) {
    const px0 = g.x + 2, py0 = g.y + 2, pw = PW - 4, ph = PH - 3;
    return o.hits.some(function (h) { return overlap(px0, py0, pw, ph, o.x + h[0], o.y + h[1], h[2], h[3]); });
  }
  function burst(x, y, colors, n) {
    for (let i = 0; i < n; i++) g.parts.push({ x: x, y: y, vx: rand(-60, 60), vy: rand(-80, 20), life: rand(0.4, 0.9), c: pick(colors) });
  }
  function popup(str, x, y, c) { g.popups.push({ str: str, x: x, y: y, life: 1, c: c }); }

  const QUIPS = ['LUNCH IS CANCELED.', 'NOT THE PUDDING CUPS!', 'I WANTED THE FISH.', 'CALL THE MOTORCADE.'];
  const HIT_LINES = ['OOF!', 'MY SALAD!', 'WATCH IT!', 'HOLD THE MAYO!'];
  const LEVEL_NAMES = ['', 'GATE AREA', 'RAMP RUSH', 'TAXIWAY TANGO', 'HEAVY TRAFFIC', 'FULL GROUND STOP'];

  // ---------- update ----------
  function update(dt) {
    g.t += dt;
    if (g.state === 'ready') {
      g.readyT -= dt; scroll(dt, CRUISE);
      if (g.readyT <= 0) g.state = 'run';
      Sound.setEngine(true, CRUISE);
      takeAction();
      return;
    }
    if (g.state === 'over') {
      Sound.setEngine(false);
      g.overT += dt;
      tickParts(dt);
      if (takeAction() && g.overT > 1) { newGame(); }
      return;
    }
    takeAction();

    // throttle and steering
    if (keys.up) g.speed += 90 * dt;
    else if (keys.down) g.speed -= 150 * dt;
    else g.speed += (CRUISE - g.speed) * Math.min(1, dt * 0.8);
    const onGrass = g.x < RL - 2 || g.x + PW > RR + 2;
    g.speed = Math.max(MIN_SPEED, Math.min(onGrass ? 70 : MAX_SPEED, g.speed));
    const steer = (keys.left ? -1 : 0) + (keys.right ? 1 : 0);
    const target = steer * (70 + g.speed * 0.35);
    g.vx += (target - g.vx) * Math.min(1, dt * 9);
    g.x = Math.max(4, Math.min(W - PW - 4, g.x + g.vx * dt));
    Sound.setEngine(true, g.speed);

    scroll(dt, g.speed);
    g.dist += g.speed * dt;
    g.score = Math.floor(g.dist / 4) + g.bonus;

    const newLevel = 1 + Math.floor(g.dist / 5200);
    if (newLevel > g.level) { g.level = newLevel; g.levelFlash = 2.5; Sound.levelUp(); }
    g.levelFlash = Math.max(0, g.levelFlash - dt);

    g.spawnT -= dt * (g.speed / CRUISE);
    if (g.spawnT <= 0) { spawn(); g.spawnT = rand(0.6, 1.3) / (1 + 0.18 * (g.level - 1)); }

    // world objects
    g.objs.forEach(function (o) {
      if (o.kind === 'truck') { o.y += (o.down ? g.speed + o.own : g.speed - o.own) * dt; o.x += Math.sin(g.t * 1.3 + o.wobble) * 6 * dt; }
      else if (o.kind === 'plane' && o.dir === 'down') o.y += (g.speed + o.own) * dt;
      else o.y += g.speed * dt;
      o.x += o.vx * dt;
    });
    g.objs = g.objs.filter(function (o) { return o.y < H + 20 && o.y > -300 && o.x > -120 && o.x < W + 120; });

    g.invuln = Math.max(0, g.invuln - dt);
    g.shake = Math.max(0, g.shake - dt);
    for (const o of g.objs) {
      if (!hitsPlayer(o)) continue;
      if (o.pickup) {
        o.dead = true;
        if (o.kind === 'meal') { g.bonus += 250; popup('+250', o.x, o.y, C.yellow); Sound.pickup(); }
        else { g.lives = Math.min(3, g.lives + 1); popup('+1 HP', o.x, o.y, C.red); Sound.pickup(); }
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
    burst(g.x + PW / 2, g.y + 4, [C.orange, C.green, C.brownLight, C.white, C.red], 18);
    if (o.kind === 'pile') { o.dead = true; burst(o.x + 8, o.y + 6, BAG, 10); }
    g.hitLine = { str: pick(HIT_LINES), life: 1.2 };
    if (g.lives <= 0) {
      g.state = 'over'; g.overT = 0; g.quip = pick(QUIPS); Sound.gameOver();
      if (g.score > g.hi) { g.hi = g.score; g.newHi = true; window.C1.saveHighScore(g.score); }
    }
  }

  function tickParts(dt) {
    g.parts.forEach(function (p) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 160 * dt; p.life -= dt; });
    g.parts = g.parts.filter(function (p) { return p.life > 0; });
    g.popups.forEach(function (p) { p.y -= 20 * dt; p.life -= dt; });
    g.popups = g.popups.filter(function (p) { return p.life > 0; });
    if (g.hitLine) { g.hitLine.life -= dt; if (g.hitLine.life <= 0) g.hitLine = null; }
  }

  let scrollY = 0;
  function scroll(dt, speed) { scrollY += speed * dt; }

  // ---------- draw ----------
  function drawGround() {
    const off = scrollY;
    rect(0, 0, W, H, C.tarmac);
    // concrete slab joints
    for (let y = Math.round(off % 32) - 32; y < H; y += 32) rect(RL, y, RR - RL, 1, C.tarmacDark);
    for (let x = RL + 40; x < RR; x += 40) rect(x, 0, 1, H, C.tarmacDark);
    // grass
    rect(0, 0, RL, H, C.grass); rect(RR, 0, W - RR, H, C.grass);
    for (let i = 0; i < 14; i++) {
      const yy = Math.round((i * 37 + off) % (H + 20)) - 10;
      rect((i * 7) % (RL - 6) + 2, yy, 3, 1, C.grassDark);
      rect(RR + 4 + (i * 11) % (W - RR - 8), (yy + 60) % H, 3, 1, C.grassDark);
    }
    // edge lights
    for (let y = Math.round(off % 24) - 24; y < H; y += 24) { rect(RL - 5, y, 2, 2, C.edgeLight); rect(RR + 3, y, 2, 2, C.edgeLight); }
    // edge and center lines
    rect(RL + 3, 0, 1, H, C.line); rect(RR - 4, 0, 1, H, C.line);
    for (let y = Math.round(off % 24) - 24; y < H; y += 24) rect(W / 2, y, 2, 12, C.line);
    // hold-short markings every so often
    const hs = 900, hy = Math.round(off % hs) - 40;
    if (hy > -12 && hy < H) {
      rect(RL + 4, hy, RR - RL - 8, 1, C.line); rect(RL + 4, hy + 3, RR - RL - 8, 1, C.line);
      for (let x = RL + 4; x < RR - 4; x += 8) { rect(x, hy + 7, 4, 1, C.line); rect(x, hy + 10, 4, 1, C.line); }
    }
    // taxiway signs on the grass
    const sy = Math.round((off + 120) % 420) - 30;
    const letter = 'ABCDEFGHJK'[Math.floor((off + 120) / 420) % 10];
    rect(4, sy, 20, 11, C.black); rect(5, sy + 1, 18, 9, C.black);
    text(letter + (1 + Math.floor(off / 420) % 9), 6, sy + 2, C.yellow, { shadow: false });
    rect(12, sy + 11, 2, 4, C.metal);
  }

  function drawHud() {
    rect(0, 0, W, HUD, C.black);
    text(String(g.score).padStart(6, '0'), 4, 3, C.white, { shadow: false });
    text('LV' + g.level, 64, 3, C.yellow, { shadow: false });
    // speed gauge
    rect(98, 5, 52, 5, C.night);
    rect(98, 5, Math.round(52 * (g.speed - MIN_SPEED) / (MAX_SPEED - MIN_SPEED)), 5, g.speed > 150 ? C.red : C.green);
    text(Math.round(g.speed / 3) + 'MPH', 154, 3, C.shade, { shadow: false });
    for (let i = 0; i < 3; i++) heart(W - 34 + i * 10, 3, i < g.lives);
  }
  function heart(x, y, full) {
    const c = full ? C.red : C.suitGray;
    rect(x, y + 1, 3, 3, c); rect(x + 4, y + 1, 3, 3, c); rect(x + 1, y + 3, 5, 3, c); rect(x + 2, y + 6, 3, 1, c); px(x + 3, y + 7, c);
  }

  function draw() {
    ctx.save();
    if (g.shake > 0) ctx.translate(Math.round(rand(-3, 3)), Math.round(rand(-2, 2)));
    drawGround();
    const order = { pile: 0, meal: 1, wrench: 1, carts: 2, truck: 3, plane: 5 };
    g.objs.slice().sort(function (a, b) { return order[a.kind] - order[b.kind]; }).forEach(function (o) {
      if (o.kind === 'pile') drawPile(o);
      else if (o.kind === 'carts') drawCarts(o);
      else if (o.kind === 'truck') truck(o.x, o.y, o.cab, o.stripe, o.down, null);
      else if (o.kind === 'meal') drawMeal(o);
      else if (o.kind === 'wrench') drawWrench(o);
    });
    if (g.state !== 'over' && (g.invuln === 0 || Math.floor(g.t * 14) % 2)) truck(g.x, g.y, C.blue, C.red, false, C.hairGray);
    g.objs.forEach(function (o) { if (o.kind === 'plane') drawPlane(o); });
    g.parts.forEach(function (p) { rect(p.x, p.y, 2, 2, p.c); });
    ctx.restore();

    // incoming-plane warnings
    g.objs.forEach(function (o) {
      if (o.kind === 'plane' && o.y + o.h < HUD + 2 && Math.floor(g.t * 6) % 2) {
        const cx = Math.max(6, Math.min(W - 12, o.x + o.w / 2 - 3));
        rect(cx, HUD + 3, 7, 9, C.red); text('!', cx, HUD + 4, C.white, { shadow: false });
      }
    });
    g.popups.forEach(function (p) { text(p.str, p.x, p.y, p.c); });
    if (g.hitLine && g.state === 'run') bubble(g.hitLine.str, g.x + PW / 2, g.y - 2);

    drawHud();

    if (g.state === 'ready') {
      bubble("WHERE'S THE DRIVE-THRU?", g.x + PW / 2, g.y - 2);
      text('GET READY', W / 2, 80, C.yellow, { align: 'center', size: 16 });
      text('AVOID PLANES, CARTS', W / 2, 106, C.white, { align: 'center' });
      text('BAGS AND TRUCKS', W / 2, 118, C.white, { align: 'center' });
    }
    if (g.levelFlash > 0 && Math.floor(g.levelFlash * 4) % 2) {
      text('LEVEL ' + g.level, W / 2, 70, C.yellow, { align: 'center', size: 16 });
      text(LEVEL_NAMES[Math.min(g.level, LEVEL_NAMES.length - 1)], W / 2, 90, C.white, { align: 'center' });
    }
    if (g.state === 'over') drawGameOver();
  }

  function drawGameOver() {
    ctx.globalAlpha = 0.8; rect(0, 40, W, 132, C.black); ctx.globalAlpha = 1;
    text('GAME OVER', W / 2, 52, C.red, { align: 'center', size: 16 });
    text('"' + g.quip + '"', W / 2, 78, C.white, { align: 'center' });
    text('- THE PRESIDENT', W / 2, 90, C.shade, { align: 'center' });
    text('SCORE ' + String(g.score).padStart(6, '0'), W / 2, 112, C.white, { align: 'center' });
    text((g.newHi ? 'NEW HI ' : 'HI ') + String(g.hi).padStart(6, '0'), W / 2, 126, C.yellow, { align: 'center' });
    if (g.overT > 1 && Math.floor(g.overT * 2) % 2 === 0) text('SPACE / TAP TO RETRY', W / 2, 152, C.white, { align: 'center' });
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
    document.fonts.load('8px "Press Start 2P"').then(bootOnce, bootOnce);
    setTimeout(bootOnce, 1500);
  } else bootOnce();
})();
