// Catering One — opening cutscene: the President boards, then slips out the back into the catering truck.
(function () {
  const { W, H, ctx, C, rect, px, line, text, bubble, person, cateringTruckSide, Sound } = window.C1;

  const WALK = 192;          // feet line in front of the plane
  const FRONT = 200;         // second row (press pool, agents)
  const STAIR_BASE = { x: 36, y: WALK };
  const STAIR_TOP = { x: 64, y: 164 };
  const REAR_DOOR = { x: 186, y: 164 };
  const TRUCK_X = 202, TRUCK_Y = 190, LIFT_UP = 16;

  // ---------- looks ----------
  const PRES = { suit: C.suitNavy, hair: C.hairGray, tie: C.red, dir: 1 };
  const AGENT = { suit: C.suit, hair: C.hairBlack, tie: C.black, item: 'shades', dir: 1 };
  const STAFF = [
    { suit: C.suitGray, hair: C.hairBrown, tie: C.blue, item: 'clipboard' },
    { suit: C.suitTan, hair: C.hairBlond, shirt: C.afBlue, item: 'clipboard' },
    { suit: C.suit, hair: C.hairBlack, tie: C.green },
    { suit: C.suitNavy, hair: C.hairBrown, shirt: C.white, item: 'clipboard', skin: C.skin2 }
  ];
  const PRESS = [
    { suit: C.brown, hair: C.hairBlack, shirt: C.yellow, item: 'camera', skin: C.skin3, pants: C.suit },
    { suit: C.orange, hair: C.hairBlond, item: 'camera', pants: C.afNavy },
    { suit: C.green, hair: C.hairBrown, item: 'mic', pants: C.suit, skin: C.skin2 },
    { suit: C.suitGray, hair: C.hairGray, shirt: C.red, item: 'camera', pants: C.suitNavy }
  ];

  // ---------- actors ----------
  function actor(look, x, y, queue) {
    return { look: Object.assign({ dir: 1 }, look), x: x, y: y, queue: queue, hidden: false, say: null, walked: 0, t0: 0 };
  }
  function climb(extra) {
    // walk to the red carpet, up the airstairs, and in the door
    return [
      { to: [STAIR_BASE.x, STAIR_BASE.y], v: 24 },
      { to: [STAIR_TOP.x, STAIR_TOP.y], v: 18 }
    ].concat(extra || [], [{ to: [STAIR_TOP.x + 4, STAIR_TOP.y], v: 16 }, { hide: true }]);
  }

  let actors, s, flashes;

  function buildScene() {
    s = {
      phase: 'title', t: 0, frontOpen: true, rearOpen: false,
      truckX: TRUCK_X, truckV: 0, lift: LIFT_UP, boxOpen: false, driver: false,
      truckSay: null, fade: 0, done: false, fanfared: false
    };
    flashes = [];

    const pres = actor(PRES, -12, WALK, [
      { to: [STAIR_BASE.x, WALK], v: 22 }, { to: [STAIR_TOP.x, STAIR_TOP.y], v: 16 },
      { set: { dir: -1, item: 'wave' } }, { say: 'THANK YOU!', t: 2.4 },
      { set: { dir: 1, item: null } }, { to: [STAIR_TOP.x + 4, STAIR_TOP.y], v: 16 }, { hide: true },
      // ...and out the back
      { wait: 1.6 }, { fn: function () { s.rearOpen = true; } }, { wait: 0.5 },
      { place: [REAR_DOOR.x, REAR_DOOR.y] }, { set: { dir: -1 } }, { wait: 0.6 }, { set: { dir: 1 } },
      { say: 'SHHH...', t: 1.4 },
      { fn: function () { s.boxOpen = true; } }, { to: [REAR_DOOR.x + 18, REAR_DOOR.y], v: 14 }, { hide: true },
      { fn: function () { s.boxOpen = false; s.rearOpen = false; s.lowering = true; } }
    ]);
    pres.isPres = true;

    const agents = [
      actor(AGENT, -24, FRONT, [{ to: [10, FRONT], v: 22 }, { set: { dir: 1 } }, { wait: 10.5 }].concat(climb())),
      actor(AGENT, -36, FRONT, [{ to: [24, FRONT], v: 22 }, { wait: 11.4 }].concat(climb()))
    ];

    const staff = STAFF.map(function (look, i) {
      return actor(look, -12, WALK, [{ wait: 6 + i * 1.2 }].concat(climb()));
    });

    const pressStart = [96, 112, 128, 144];
    const press = PRESS.map(function (look, i) {
      const l = Object.assign({ dir: -1 }, look);
      return actor(l, pressStart[i], FRONT + (i % 2) * 6, [
        { wait: 15 + i * 1.8 }, { to: [STAIR_BASE.x, WALK], v: 26 }, { set: { dir: 1 } }
      ].concat(climb()));
    });
    press.forEach(function (p) { p.isPress = true; });

    actors = [pres].concat(agents, staff, press);
    s.pres = pres;
  }

  function stepActor(a, dt) {
    let guard = 0;
    while (a.queue.length && guard++ < 20) {
      const q = a.queue[0];
      if (q.wait !== undefined) {
        q.wait -= dt; dt = 0;
        if (q.wait > 0) return; a.queue.shift(); continue;
      }
      if (q.to) {
        const dx = q.to[0] - a.x, dy = q.to[1] - a.y, d = Math.hypot(dx, dy);
        const stepLen = q.v * dt;
        if (Math.abs(dx) > 0.5) a.look.dir = dx > 0 ? 1 : -1;
        if (d <= stepLen || d < 0.01) {
          a.x = q.to[0]; a.y = q.to[1]; a.walked += d; a.queue.shift(); dt = Math.max(0, dt - d / q.v); continue;
        }
        a.x += dx / d * stepLen; a.y += dy / d * stepLen; a.walked += stepLen;
        return;
      }
      if (q.say !== undefined) {
        a.say = q.say; q.t -= dt; dt = 0;
        if (q.t > 0) return; a.say = null; a.queue.shift(); continue;
      }
      if (q.set) { Object.assign(a.look, q.set); a.queue.shift(); continue; }
      if (q.place) { a.x = q.place[0]; a.y = q.place[1]; a.hidden = false; a.queue.shift(); continue; }
      if (q.hide) { a.hidden = true; a.queue.shift(); continue; }
      if (q.fn) { q.fn(); a.queue.shift(); continue; }
      a.queue.shift();
    }
  }

  // ---------- background ----------
  function drawSky() {
    const bands = [C.sky5, C.sky4, C.sky3, C.sky2, C.sky1];
    const bh = 28;
    for (let i = 0; i < bands.length; i++) {
      rect(0, i * bh, W, bh, bands[i]);
      if (i > 0) { // dithered seam
        ctx.fillStyle = bands[i - 1];
        for (let x = 0; x < W; x += 2) { ctx.fillRect(x + (i % 2), i * bh, 1, 1); ctx.fillRect(x + 1 - (i % 2), i * bh + 2, 1, 1); }
      }
    }
    // sun sinking behind the terminal
    const sx = 168, sy = 92, r = 16;
    for (let y = -r; y <= r; y++) {
      const w = Math.round(Math.sqrt(r * r - y * y));
      rect(sx - w, sy + y, w * 2, 1, (y % 4 === 0 && y > 2) ? C.sky2 : (Math.abs(y) > r - 3 ? C.sunEdge : C.sun));
    }
    // clouds
    rect(20, 38, 34, 3, C.sky3); rect(28, 35, 18, 3, C.sky3);
    rect(196, 52, 40, 3, C.sky4); rect(204, 49, 22, 3, C.sky4);
  }
  function drawTerminal() {
    // tower
    rect(122, 64, 6, 50, C.city); rect(116, 58, 18, 8, C.city); rect(117, 60, 16, 3, C.cityLit); rect(124, 52, 2, 6, C.city);
    // skyline
    const blocks = [[0, 104, 60], [56, 110, 40], [94, 100, 70], [160, 108, 44], [202, 102, 60]];
    blocks.forEach(function (b) {
      rect(b[0], b[1], b[2], 140 - b[1], C.city);
      for (let wx = b[0] + 3; wx < b[0] + b[2] - 3; wx += 5)
        for (let wy = b[1] + 4; wy < 136; wy += 6)
          if (((wx * 7 + wy * 3) % 11) < 5) rect(wx, wy, 2, 2, C.cityLit);
    });
    rect(0, 138, W, 2, C.black);
  }
  function drawTarmac() {
    rect(0, 140, W, H - 140, C.tarmac);
    for (let y = 150; y < H; y += 9) for (let x = (y * 13) % 17; x < W; x += 23) rect(x, y, 6, 1, C.tarmacDark);
    for (let x = 4; x < W; x += 16) rect(x, 143, 2, 1, C.edgeLight);
    rect(0, 212, W, 2, C.line);
    // red carpet to the stairs
    rect(0, WALK - 2, STAIR_BASE.x + 2, 4, C.red); rect(0, WALK + 2, STAIR_BASE.x + 2, 1, C.redDark);
  }

  // ---------- the plane ----------
  function rowColor(y) {
    if (y < 145) return C.white;
    if (y < 147) return C.afNavy;
    if (y < 148) return C.afGold;
    return C.afBlue;
  }
  function drawPlane() {
    const top = 128, bot = 168;
    // horizontal stabilizer (far side)
    rect(210, 122, 36, 3, C.shade);
    // tail fin
    for (let y = 64; y < top; y++) {
      const lx = Math.round(214 + (top - y) * 0.3), rx = Math.round(242 + (top - y) * 0.06);
      rect(lx, y, rx - lx, 1, y < 70 ? C.afNavy : C.white);
    }
    // flag on the fin
    for (let i = 0; i < 7; i++) rect(231, 76 + i * 2, 12, 1, i % 2 ? C.white : C.red);
    rect(231, 76, 5, 7, C.afNavy); px(232, 78, C.white); px(234, 80, C.white);
    // tail cone
    for (let x = 226; x < 244; x++) {
      const t0 = Math.round(top + (x - 226) * 0.35), b0 = Math.round(bot - (x - 226) * 1.6);
      for (let y = t0; y < b0; y++) px(x, y, rowColor(y));
    }
    // fuselage
    for (let y = top; y < bot; y++) rect(30, y, 196, 1, rowColor(y));
    rect(30, bot - 1, 196, 1, C.afNavy);
    // nose
    for (let y = top; y < bot; y++) {
      const dy = (y - 150) / (y < 150 ? 22 : 18);
      const lx = Math.round(32 - 16 * Math.sqrt(Math.max(0, 1 - dy * dy)));
      rect(lx, y, 32 - lx, 1, rowColor(y));
    }
    rect(20, 134, 10, 3, C.window); rect(18, 137, 3, 1, C.window);
    // upper-deck hump
    for (let y = 114; y < top; y++) {
      const k = (y - 114) / 14;
      const lx = Math.round(66 - 34 * Math.sqrt(k)), rx = Math.round(100 + 16 * k);
      rect(lx, y, rx - lx, 1, C.white);
    }
    for (let x = 60; x < 104; x += 6) rect(x, 120, 3, 3, C.window);
    // cabin windows
    for (let x = 40; x < 222; x += 6) {
      if ((x > 60 && x < 76) || (x > 182 && x < 198)) continue;
      rect(x, 134, 3, 3, C.window);
    }
    // wing root + engines
    rect(96, 164, 80, 4, C.shadeDark);
    [[104, 166], [142, 168]].forEach(function (e) {
      rect(e[0], e[1], 24, 10, C.shade); rect(e[0], e[1], 24, 1, C.white);
      rect(e[0], e[1] + 1, 3, 8, C.black); rect(e[0] + 20, e[1] + 2, 6, 6, C.shadeDark);
      rect(e[0] + 8, e[1] - 2, 8, 2, C.shadeDark);
    });
    // landing gear
    [[42, 1], [128, 2], [164, 2]].forEach(function (g) {
      rect(g[0] + 2, bot, 2, 10, C.metal);
      for (let i = 0; i < g[1]; i++) rect(g[0] + i * 7 - 1, bot + 9, 7, 7, C.rubber);
    });
    // doors
    drawDoor(64, s.frontOpen);
    drawDoor(REAR_DOOR.x, s.rearOpen);
  }
  function drawDoor(x, open) {
    if (open) { rect(x, 146, 9, 18, C.black); rect(x + 1, 147, 7, 16, C.night); }
    else { rect(x, 146, 9, 1, C.shadeDark); rect(x, 146, 1, 18, C.shadeDark); rect(x + 8, 146, 1, 18, C.shadeDark); rect(x, 163, 9, 1, C.shadeDark); }
  }
  function drawStairs() {
    rect(44, 180, 30, 8, C.shadeDark); rect(44, 180, 30, 1, C.shade);
    rect(48, 187, 6, 6, C.rubber); rect(64, 187, 6, 6, C.rubber);
    for (let i = 0; i <= 14; i++) rect(STAIR_BASE.x - 2 + i * 2, WALK - i * 2, 5, 1, C.metal);
    line(STAIR_BASE.x, WALK - 10, STAIR_TOP.x, STAIR_TOP.y - 10, C.white);
    for (let i = 0; i <= 28; i += 7) line(STAIR_BASE.x + i, WALK - i, STAIR_BASE.x + i, WALK - i - 10, C.white);
    rect(STAIR_TOP.x - 2, STAIR_TOP.y, 10, 2, C.metal);
  }

  // ---------- update / draw ----------
  function update(dt) {
    if (s.phase === 'title') {
      s.t += dt;
      if (window.C1.takeAction()) { s.phase = 'play'; s.t = 0; Sound.fanfare(); }
      return;
    }
    if (window.C1.takeAction() && s.t > 0.5) { s.done = true; return; }
    s.t += dt;
    actors.forEach(function (a) { stepActor(a, dt); });

    // press pool fires flashes while the President is in view
    const p = s.pres;
    if (!p.hidden && p.y < WALK + 1 && s.t < 9) {
      actors.forEach(function (a) {
        if (a.isPress && a.queue.length && a.queue[0].wait !== undefined && a.look.item === 'camera' && Math.random() < dt * 1.6) {
          flashes.push({ x: a.x - 2, y: a.y - 9, life: 0.12 }); Sound.flash();
        }
      });
    }
    flashes.forEach(function (f) { f.life -= dt; });
    flashes = flashes.filter(function (f) { return f.life > 0; });

    if (s.lowering) { s.lift = Math.max(0, s.lift - dt * 8); if (s.lift === 0) { s.lowering = false; s.driver = true; } }

    const boarded = actors.every(function (a) { return a.hidden && !a.queue.length; });
    if (boarded && !s.boardedAt) { s.boardedAt = s.t; }
    if (s.boardedAt) {
      const k = s.t - s.boardedAt;
      if (k > 0.6) s.frontOpen = false;
      s.truckSay = (k > 1.2 && k < 3.2) ? 'FLOOR IT!' : null;
      if (k > 3.2) { s.truckV += 70 * dt; s.truckX += s.truckV * dt; }
      if (k > 5.2) s.fade = Math.min(1, (k - 5.2) / 1.2);
      if (k > 8.5) s.done = true;
    }
  }

  function draw() {
    drawSky(); drawTerminal(); drawTarmac(); drawPlane(); drawStairs();
    cateringTruckSide(s.truckX, TRUCK_Y, s.lift, { doorOpen: s.boxOpen, driver: s.driver });
    if (s.boardedAt && s.truckV > 20) { // exhaust puffs
      for (let i = 0; i < 3; i++) rect(s.truckX - 6 - i * 7 - (s.t * 40 % 6), TRUCK_Y - 6 - i, 4 - i, 3 - i > 0 ? 3 - i : 1, C.shade);
    }

    const visible = actors.filter(function (a) { return !a.hidden; }).sort(function (a, b) { return a.y - b.y; });
    visible.forEach(function (a) { person(a.x, a.y, a.look, Math.floor(a.walked / 3)); });
    flashes.forEach(function (f) {
      rect(f.x - 3, f.y, 7, 1, C.white); rect(f.x, f.y - 3, 1, 7, C.white); rect(f.x - 1, f.y - 1, 3, 3, C.sun);
    });
    visible.forEach(function (a) { if (a.say) bubble(a.say, a.x + 2, a.y - 12); });
    if (s.truckSay) bubble(s.truckSay, s.truckX + 46, TRUCK_Y - 22);

    if (s.phase === 'title') drawTitle();
    else if (s.t < 3) caption('ANDREWS FIELD  18:42', s.t);
    if (s.fade > 0) {
      ctx.globalAlpha = s.fade; rect(0, 0, W, H, C.black); ctx.globalAlpha = 1;
      if (s.fade >= 1) {
        text('THE PRESIDENT IS', W / 2, 88, C.white, { align: 'center' });
        text('LOOSE ON THE TARMAC!', W / 2, 102, C.yellow, { align: 'center' });
      }
    }
    if (s.phase === 'play' && !s.boardedAt) text('SPACE: SKIP', W - 4, H - 10, C.shade, { align: 'right', size: 8 });
  }

  function caption(str, t) {
    const a = Math.min(1, t * 2, (3 - t) * 2);
    ctx.globalAlpha = Math.max(0, a);
    rect(0, 6, W, 14, C.black);
    text(str, W / 2, 9, C.white, { align: 'center', shadow: false });
    ctx.globalAlpha = 1;
  }

  function drawTitle() {
    ctx.globalAlpha = 0.72; rect(0, 18, W, 76, C.black); ctx.globalAlpha = 1;
    text('CATERING', W / 2, 26, C.white, { align: 'center', size: 16 });
    text('ONE', W / 2, 46, C.yellow, { align: 'center', size: 16, shadowColor: C.redDark });
    text('A TARMAC GETAWAY', W / 2, 68, C.afBlue, { align: 'center' });
    if (Math.floor(s.t * 2) % 2 === 0) text('PRESS SPACE OR TAP', W / 2, 80, C.white, { align: 'center' });
    const hi = window.C1.loadHighScore();
    if (hi) text('HI ' + String(hi).padStart(6, '0'), W / 2, 100, C.yellow, { align: 'center' });
  }

  window.Intro = {
    start: function (skipTitle) { buildScene(); if (skipTitle) { s.phase = 'play'; Sound.fanfare(); } },
    update: update, draw: draw,
    isDone: function () { return s.done; }
  };
})();
