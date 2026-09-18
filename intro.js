// Catering One — opening cutscene: the President boards, then slips out the back into the catering truck.
(function () {
  const { W, H, ctx, C, rect, px, line, text, bubble, tint, person, cateringTruckSide, wheel, Sound } = window.C1;

  const WALK = 384;          // feet line in front of the plane
  const FRONT = 400;         // second row (press pool, agents)
  const STAIR_BASE = { x: 72, y: WALK };
  const STAIR_TOP = { x: 128, y: 328 };
  const FRONT_DOOR = 130, REAR_DOOR = { x: 372, y: 328 };
  const TRUCK_X = 406, TRUCK_Y = 380, LIFT_UP = 32;
  const TOP = 256, BOT = 336; // fuselage

  // ---------- looks ----------
  const PRES = { suit: C.suitNavy, hair: C.hairGray, tie: C.red, pin: true, dir: 1 };
  const AGENT = { suit: C.suit, hair: C.hairBlack, tie: C.black, item: 'shades', dir: 1 };
  const STAFF = [
    { suit: C.suitGray, hair: C.hairBrown, tie: C.blue, item: 'clipboard' },
    { suit: C.suitTan, hair: C.hairBlond, shirt: C.afBlue, item: 'clipboard', long: true },
    { suit: C.suit, hair: C.hairBlack, tie: C.green, skin: C.skin3 },
    { suit: C.suitNavy, hair: C.hairBrown, shirt: C.white, item: 'clipboard', skin: C.skin2, long: true }
  ];
  const PRESS = [
    { suit: C.brown, hair: C.hairBlack, shirt: C.yellow, item: 'camera', skin: C.skin3, pants: C.suit },
    { suit: C.orange, hair: C.hairBlond, item: 'camera', pants: C.afNavy, long: true },
    { suit: C.green, hair: C.hairBrown, item: 'mic', pants: C.suit, skin: C.skin2 },
    { suit: C.suitGray, hair: C.hairGray, shirt: C.red, item: 'camera', pants: C.suitNavy }
  ];

  // ---------- actors ----------
  function actor(look, x, y, queue) {
    return { look: Object.assign({ dir: 1 }, look), x: x, y: y, queue: queue, hidden: false, say: null, walked: 0 };
  }
  function climb() {
    // walk to the red carpet, up the airstairs, and in the door
    return [
      { to: [STAIR_BASE.x, STAIR_BASE.y], v: 48 },
      { to: [STAIR_TOP.x, STAIR_TOP.y], v: 36 },
      { to: [STAIR_TOP.x + 8, STAIR_TOP.y], v: 32 }, { hide: true }
    ];
  }

  let actors, s, flashes;

  function buildScene() {
    s = {
      phase: 'title', t: 0, frontOpen: true, rearOpen: false,
      truckX: TRUCK_X, truckV: 0, lift: LIFT_UP, boxOpen: false, driver: false,
      truckSay: null, fade: 0, done: false
    };
    flashes = [];

    const pres = actor(PRES, -24, WALK, [
      { to: [STAIR_BASE.x, WALK], v: 44 }, { to: [STAIR_TOP.x, STAIR_TOP.y], v: 32 },
      { set: { dir: -1, item: 'wave' } }, { say: 'THANK YOU!', t: 2.4 },
      { set: { dir: 1, item: null } }, { to: [STAIR_TOP.x + 8, STAIR_TOP.y], v: 32 }, { hide: true },
      // ...and out the back
      { wait: 1.6 }, { fn: function () { s.rearOpen = true; } }, { wait: 0.5 },
      { place: [REAR_DOOR.x + 3, REAR_DOOR.y] }, { set: { dir: -1 } }, { wait: 0.6 }, { set: { dir: 1 } },
      { say: 'SHHH...', t: 1.4 },
      { fn: function () { s.boxOpen = true; } }, { to: [REAR_DOOR.x + 38, REAR_DOOR.y], v: 28 }, { hide: true },
      { fn: function () { s.boxOpen = false; s.rearOpen = false; s.lowering = true; } }
    ]);

    const agents = [
      actor(AGENT, -48, FRONT, [{ to: [20, FRONT], v: 44 }, { wait: 10.5 }].concat(climb())),
      actor(AGENT, -72, FRONT, [{ to: [48, FRONT], v: 44 }, { wait: 11.4 }].concat(climb()))
    ];
    const staff = STAFF.map(function (look, i) {
      return actor(look, -24, WALK, [{ wait: 6 + i * 1.2 }].concat(climb()));
    });
    const pressStart = [192, 224, 256, 288];
    const press = PRESS.map(function (look, i) {
      const a = actor(Object.assign({ dir: -1 }, look), pressStart[i], FRONT + (i % 2) * 12, [
        { wait: 15 + i * 1.8 }, { to: [STAIR_BASE.x, WALK], v: 52 }, { set: { dir: 1 } }
      ].concat(climb()));
      a.isPress = true;
      return a;
    });

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
  function disc(cx, cy, r, colorAt) {
    for (let y = -r; y <= r; y++) {
      const w = Math.round(Math.sqrt(r * r - y * y));
      rect(cx - w, cy + y, w * 2, 1, colorAt(y, w));
    }
  }
  function drawSky() {
    const bands = [C.night, C.sky5, tint(C.sky4, 0.9), C.sky4, C.sky3, C.sky2, C.sky1];
    const bh = 40;
    for (let i = 0; i < bands.length; i++) {
      rect(0, i * bh, W, bh, bands[i]);
      if (i > 0) { // dithered seam
        ctx.fillStyle = bands[i - 1];
        for (let x = 0; x < W; x += 2) { ctx.fillRect(x, i * bh, 1, 1); ctx.fillRect(x + 1, i * bh + 2, 1, 1); ctx.fillRect(x, i * bh + 4, 1, 1); }
      }
    }
    // first stars
    [[30, 12], [90, 28], [150, 8], [260, 20], [330, 34], [410, 10], [470, 26]].forEach(function (p, i) {
      px(p[0], p[1], (Math.floor(s.t * 2 + i) % 5) ? C.white : C.sky5);
    });
    // setting sun with retro scanline cuts
    disc(336, 206, 34, function (y) {
      if (y > 6 && (y % 6 === 0 || y % 6 === 1)) return C.sky1;
      return Math.abs(y) > 30 ? C.sunEdge : C.sun;
    });
    function cloud(x, y, w, c, hi) {
      rect(x, y, w, 5, c); rect(x + 10, y - 4, w - 24, 4, c); rect(x + 18, y - 7, w - 44, 3, c);
      rect(x + 4, y + 5, w - 8, 2, hi);
    }
    cloud(30, 78, 80, C.sky3, C.sky2); cloud(390, 104, 96, C.sky4, C.sky3); cloud(210, 132, 60, C.sky3, C.sky1);
  }
  function drawTerminal() {
    // control tower with a blinking beacon
    rect(242, 124, 14, 104, C.city); rect(240, 124, 2, 104, tint(C.city, 0.8));
    rect(228, 110, 42, 16, C.city); rect(231, 114, 36, 7, C.cityLit);
    for (let x = 235; x < 266; x += 6) rect(x, 114, 1, 7, C.city);
    rect(224, 108, 50, 3, tint(C.city, 0.8)); rect(248, 94, 2, 14, C.city);
    if (Math.floor(s.t * 1.5) % 2) rect(247, 91, 4, 3, C.red);
    // skyline
    const blocks = [[0, 208, 120], [112, 220, 80], [188, 200, 140], [320, 216, 88], [404, 204, 108]];
    blocks.forEach(function (b) {
      rect(b[0], b[1], b[2], 280 - b[1], C.city);
      rect(b[0], b[1], b[2], 2, tint(C.city, 1.15));
      for (let wx = b[0] + 6; wx < b[0] + b[2] - 6; wx += 10)
        for (let wy = b[1] + 8; wy < 250; wy += 12)
          if (((wx * 7 + wy * 3) % 11) < 5) { rect(wx, wy, 4, 5, C.cityLit); rect(wx, wy + 4, 4, 1, tint(C.cityLit, 0.8)); }
    });
    // glass concourse
    rect(0, 256, W, 22, tint(C.city, 0.85));
    for (let x = 4; x < W; x += 8) rect(x, 260, 5, 12, tint(C.sky2, 0.75));
    rect(0, 256, W, 2, tint(C.city, 1.2));
    // parked airliner far away
    rect(20, 262, 90, 10, C.shadeDark); rect(20, 270, 90, 2, tint(C.shadeDark, 0.8));
    rect(92, 240, 12, 22, C.shadeDark); rect(96, 244, 6, 4, C.red); rect(14, 264, 8, 6, C.shadeDark);
    for (let x = 30; x < 88; x += 6) rect(x, 265, 2, 2, C.window);
    rect(0, 276, W, 4, C.black);
  }
  function drawTarmac() {
    rect(0, 280, W, H - 280, C.tarmac);
    rect(0, 280, W, 12, C.tarmacDark);
    for (let y = 300; y < H; y += 18) for (let x = (y * 13) % 34; x < W; x += 46) rect(x, y, 12, 1, C.tarmacDark);
    [[160, 420, 26], [300, 396, 18], [460, 432, 30]].forEach(function (o) { rect(o[0], o[1], o[2], 4, C.tarmacDark); rect(o[0] + 4, o[1] - 2, o[2] - 8, 2, C.tarmacDark); });
    for (let x = 8; x < W; x += 32) { rect(x, 286, 4, 2, C.edgeLight); rect(x - 1, 288, 6, 1, tint(C.edgeLight, 0.5)); }
    rect(0, 424, W, 4, C.line); rect(0, 428, W, 1, tint(C.line, 0.6));
    // red carpet with gold edging
    rect(0, WALK - 5, STAIR_BASE.x + 6, 8, C.red); rect(0, WALK - 5, STAIR_BASE.x + 6, 1, tint(C.red, 1.3));
    rect(0, WALK + 3, STAIR_BASE.x + 6, 2, C.redDark);
    ctx.fillStyle = C.afGold;
    for (let x = 0; x < STAIR_BASE.x + 6; x += 6) ctx.fillRect(x, WALK - 4, 2, 1);
  }

  // ---------- the plane ----------
  function rowColor(y) {
    if (y < TOP + 2) return C.shade;
    if (y < 290) return C.white;
    if (y < 294) return C.afNavy;
    if (y < 296) return C.afGold;
    if (y > BOT - 6) return tint(C.afBlue, 0.82);
    return C.afBlue;
  }
  function drawPlane() {
    rect(40, 360, 440, 8, 'rgba(0,0,0,0.25)');
    // far horizontal stabilizer
    for (let i = 0; i < 6; i++) rect(422 + i * 2, 242 + i, 74 - i * 3, 1, i < 2 ? C.white : C.shade);
    // tail fin
    for (let y = 128; y < TOP; y++) {
      const lx = Math.round(428 + (TOP - y) * 0.3), rx = Math.round(484 + (TOP - y) * 0.06);
      rect(lx, y, rx - lx, 1, y < 140 ? C.afNavy : C.white);
      px(lx, y, y < 140 ? C.afNavy : C.shade);
    }
    // flag: 13 stripes, starred canton
    for (let i = 0; i < 13; i++) rect(462, 150 + i, 26, 1, i % 2 ? C.white : C.red);
    rect(462, 150, 11, 7, C.afNavy);
    for (let y = 151; y < 157; y += 2) for (let x = 463 + ((y - 151) % 4 ? 1 : 0); x < 472; x += 2) px(x, y, C.white);
    // tail cone
    for (let x = 452; x < 490; x++) {
      const t0 = Math.round(TOP + (x - 452) * 0.35), b0 = Math.round(BOT - (x - 452) * 1.6);
      for (let y = t0; y < b0; y++) px(x, y, rowColor(y));
    }
    rect(486, 262, 6, 6, C.shadeDark);
    // fuselage body with panel seams
    for (let y = TOP; y < BOT; y++) rect(60, y, 392, 1, rowColor(y));
    rect(60, BOT - 1, 392, 1, C.afNavy);
    for (let x = 96; x < 452; x += 40) rect(x, 297, 1, BOT - 300, tint(C.afBlue, 0.9));
    // nose
    for (let y = TOP; y < BOT; y++) {
      const dy = (y - 300) / (y < 300 ? 44 : 36);
      const lx = Math.round(64 - 32 * Math.sqrt(Math.max(0, 1 - dy * dy)));
      rect(lx, y, 64 - lx, 1, rowColor(y));
    }
    rect(40, 270, 22, 7, C.window); rect(36, 274, 5, 3, C.window);
    for (let x = 44; x < 62; x += 6) rect(x, 270, 1, 7, C.white);
    // upper-deck hump
    for (let y = 228; y < TOP; y++) {
      const k = (y - 228) / 28;
      const lx = Math.round(132 - 68 * Math.sqrt(k)), rx = Math.round(200 + 32 * k);
      rect(lx, y, rx - lx, 1, y < 230 ? C.shade : C.white);
    }
    for (let x = 120; x < 208; x += 12) { rect(x, 240, 5, 7, C.window); rect(x, 240, 5, 1, tint(C.window, 1.4)); }
    // lettering and cabin windows
    text('UNITED STATES OF AMERICA', 160, 262, C.afNavy, { size: 8, shadow: false });
    for (let x = 80; x < 446; x += 12) {
      if ((x > 118 && x < 152) || (x > 362 && x < 396)) continue;
      rect(x, 278, 5, 7, C.window); rect(x, 278, 5, 1, tint(C.window, 1.4)); px(x + 1, 279, C.glass);
    }
    // seal by the front door
    disc(100, 312, 7, function (y) { return Math.abs(y) > 5 ? C.afGold : C.afNavy; });
    rect(98, 309, 5, 5, C.afGold); rect(99, 310, 3, 3, C.white);
    // wing root and blade
    rect(192, 322, 176, 14, tint(C.afBlue, 0.85));
    rect(196, 332, 168, 6, C.shade); rect(196, 338, 168, 2, C.shadeDark);
    // engines
    [[208, 334], [288, 338]].forEach(function (e) {
      const ex = e[0], ey = e[1];
      rect(ex + 16, ey - 6, 22, 8, C.shadeDark);
      for (let y = 0; y < 22; y++) {
        const inset = Math.round(Math.abs(y - 11) * Math.abs(y - 11) / 20);
        rect(ex + inset, ey + y, 50 - inset * 2, 1, y < 3 ? C.white : (y > 18 ? C.shadeDark : C.shade));
      }
      rect(ex + 2, ey + 3, 5, 16, C.black);
      for (let y = 4; y < 18; y += 3) rect(ex + 3, ey + y, 3, 1, C.metal);
      rect(ex + 46, ey + 6, 8, 10, C.metal); rect(ex + 52, ey + 8, 4, 6, C.shadeDark);
      rect(ex + 12, ey + 10, 30, 1, tint(C.shade, 0.9));
    });
    // landing gear
    [[84, 1], [250, 2], [322, 2]].forEach(function (g) {
      rect(g[0] + 4, BOT, 4, 22, C.metal); rect(g[0] + 3, BOT + 8, 6, 2, C.shadeDark);
      for (let i = 0; i < g[1]; i++) gearWheel(g[0] - 2 + i * 16, BOT + 20);
    });
    drawDoor(FRONT_DOOR, s.frontOpen);
    drawDoor(REAR_DOOR.x, s.rearOpen);
  }
  function gearWheel(x, y) {
    disc(x + 7, y + 7, 7, function () { return C.rubber; });
    disc(x + 7, y + 7, 3, function () { return C.metal; });
    px(x + 6, y + 6, C.white);
  }
  function drawDoor(x, open) {
    const y = 292, w = 18, h = 36;
    if (open) {
      rect(x, y, w, h, C.black); rect(x + 2, y + 2, w - 4, h - 2, C.night);
      rect(x + 4, y + 4, w - 8, 3, tint(C.cityLit, 0.6));
      rect(x + w, y, 4, h, C.shade); // door swung open
    } else {
      rect(x, y + 2, 1, h - 2, C.shadeDark); rect(x + w - 1, y + 2, 1, h - 2, C.shadeDark);
      rect(x + 2, y, w - 4, 1, C.shadeDark); rect(x, y + h - 1, w, 1, C.shadeDark);
      rect(x + 6, y + 6, 6, 7, C.window); rect(x + w - 5, y + 18, 3, 1, C.shadeDark);
    }
  }
  function drawStairs() {
    // stair truck
    rect(84, 356, 70, 16, C.shadeDark); rect(84, 356, 70, 2, C.shade);
    rect(134, 344, 20, 14, C.white); rect(140, 346, 12, 7, C.glass); rect(134, 344, 20, 2, C.shade);
    rect(88, 362, 40, 3, C.yellow);
    wheel(92, 368); wheel(136, 368);
    // flight of steps
    for (let i = 0; i <= 28; i++) {
      rect(STAIR_BASE.x - 4 + i * 2, WALK - i * 2 - 1, 10, 1, C.shade);
      rect(STAIR_BASE.x - 4 + i * 2, WALK - i * 2, 10, 1, C.metal);
    }
    line(STAIR_BASE.x + 2, WALK + 1, STAIR_TOP.x + 6, STAIR_TOP.y + 1, C.shadeDark);
    // handrail and posts
    line(STAIR_BASE.x, WALK - 20, STAIR_TOP.x, STAIR_TOP.y - 20, C.white);
    line(STAIR_BASE.x, WALK - 21, STAIR_TOP.x, STAIR_TOP.y - 21, C.shade);
    for (let i = 0; i <= 56; i += 14) line(STAIR_BASE.x + i, WALK - i, STAIR_BASE.x + i, WALK - i - 20, C.white);
    rect(STAIR_TOP.x - 4, STAIR_TOP.y, 20, 4, C.metal); rect(STAIR_TOP.x - 4, STAIR_TOP.y + 4, 20, 1, C.black);
  }
  function drawStanchions() {
    for (let x = 6; x < STAIR_BASE.x; x += 22) {
      rect(x, WALK + 8, 2, 14, C.afGold); rect(x - 2, WALK + 21, 6, 2, C.afGold); rect(x - 1, WALK + 6, 4, 3, C.sunEdge);
      if (x + 22 < STAIR_BASE.x) for (let i = 0; i < 20; i++) px(x + 2 + i, WALK + 10 + Math.round(Math.sin(i / 20 * Math.PI) * 4), C.redDark);
    }
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
    if (!s.pres.hidden && s.t < 9) {
      actors.forEach(function (a) {
        if (a.isPress && a.queue.length && a.queue[0].wait !== undefined && a.look.item === 'camera' && Math.random() < dt * 1.6) {
          flashes.push({ x: a.look.dir < 0 ? a.x - 2 : a.x + 14, y: a.y - 20, life: 0.12 }); Sound.flash();
        }
      });
    }
    flashes.forEach(function (f) { f.life -= dt; });
    flashes = flashes.filter(function (f) { return f.life > 0; });

    if (s.lowering) { s.lift = Math.max(0, s.lift - dt * 16); if (s.lift === 0) { s.lowering = false; s.driver = true; } }

    const boarded = actors.every(function (a) { return a.hidden && !a.queue.length; });
    if (boarded && !s.boardedAt) s.boardedAt = s.t;
    if (s.boardedAt) {
      const k = s.t - s.boardedAt;
      if (k > 0.6) s.frontOpen = false;
      s.truckSay = (k > 1.2 && k < 3.2) ? 'FLOOR IT!' : null;
      if (k > 3.2) { s.truckV += 140 * dt; s.truckX += s.truckV * dt; }
      if (k > 5.2) s.fade = Math.min(1, (k - 5.2) / 1.2);
      if (k > 8.5) s.done = true;
    }
  }

  function draw() {
    drawSky(); drawTerminal(); drawTarmac(); drawPlane(); drawStairs();
    cateringTruckSide(s.truckX, TRUCK_Y, s.lift, { doorOpen: s.boxOpen, driver: s.driver });
    if (s.boardedAt && s.truckV > 40) {
      for (let i = 0; i < 4; i++) {
        const ox = s.truckX - 10 - i * 14 - (s.t * 80 % 12);
        disc(ox, TRUCK_Y - 10 - i * 3, 4 + i * 2, function () { return i > 1 ? tint(C.shade, 0.9) : C.shade; });
      }
    }
    drawStanchions();

    const visible = actors.filter(function (a) { return !a.hidden; }).sort(function (a, b) { return a.y - b.y; });
    visible.forEach(function (a) { person(a.x, a.y, a.look, Math.floor(a.walked / 6)); });
    flashes.forEach(function (f) {
      rect(f.x - 8, f.y, 17, 1, C.white); rect(f.x, f.y - 8, 1, 17, C.white);
      rect(f.x - 3, f.y - 3, 7, 7, C.sun); rect(f.x - 1, f.y - 1, 3, 3, C.white);
    });
    visible.forEach(function (a) { if (a.say) bubble(a.say, a.x + 6, a.y - 26); });
    if (s.truckSay) bubble(s.truckSay, s.truckX + 92, TRUCK_Y - 48);

    if (s.phase === 'title') drawTitle();
    else if (s.t < 3) caption('ANDREWS FIELD  18:42', s.t);
    if (s.fade > 0) {
      ctx.globalAlpha = s.fade; rect(0, 0, W, H, C.black); ctx.globalAlpha = 1;
      if (s.fade >= 1) {
        text('THE PRESIDENT IS', W / 2, 176, C.white, { align: 'center' });
        text('LOOSE ON THE TARMAC!', W / 2, 204, C.yellow, { align: 'center' });
      }
    }
    if (s.phase === 'play' && !s.boardedAt) text('SPACE: SKIP', W - 8, H - 20, C.shade, { align: 'right' });
  }

  function caption(str, t) {
    ctx.globalAlpha = Math.max(0, Math.min(1, t * 2, (3 - t) * 2));
    rect(0, 12, W, 28, C.black);
    text(str, W / 2, 18, C.white, { align: 'center', shadow: false });
    ctx.globalAlpha = 1;
  }

  function drawTitle() {
    ctx.globalAlpha = 0.75; rect(0, 36, W, 152, C.black); ctx.globalAlpha = 1;
    rect(0, 36, W, 2, C.afGold); rect(0, 186, W, 2, C.afGold);
    text('CATERING', W / 2, 52, C.white, { align: 'center', size: 32, shadowColor: C.afNavy });
    text('ONE', W / 2, 92, C.yellow, { align: 'center', size: 32, shadowColor: C.redDark });
    text('A TARMAC GETAWAY', W / 2, 136, C.afBlue, { align: 'center' });
    if (Math.floor(s.t * 2) % 2 === 0) text('PRESS SPACE OR TAP', W / 2, 160, C.white, { align: 'center' });
    const hi = window.C1.loadHighScore();
    if (hi) text('HI ' + String(hi).padStart(6, '0'), W / 2, 200, C.yellow, { align: 'center' });
  }

  window.Intro = {
    start: function (skipTitle) { buildScene(); if (skipTitle) { s.phase = 'play'; Sound.fanfare(); } },
    update: update, draw: draw,
    isDone: function () { return s.done; }
  };
})();
