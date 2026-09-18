// Catering One — top-down sprites for the driving game (512 x 448 fine grid).
(function () {
  const { ctx, C, rect, px, tint } = window.C1;

  // Bake a drawing into an offscreen canvas once, keyed by its parameters.
  // mono replaces every color, for drop shadows.
  const baked = new Map();
  function bake(key, w, h, draw, mono) {
    const k = key + (mono ? '|m' : '');
    let cv = baked.get(k);
    if (cv) return cv;
    cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const c2 = cv.getContext('2d');
    draw(function (x, y, rw, rh, col) {
      c2.fillStyle = mono || col;
      c2.fillRect(Math.round(x), Math.round(y), Math.round(rw), Math.round(rh));
    });
    baked.set(k, cv);
    return cv;
  }
  function blit(cv, x, y, alpha) {
    if (alpha !== undefined) ctx.globalAlpha = alpha;
    ctx.drawImage(cv, Math.round(x), Math.round(y));
    ctx.globalAlpha = 1;
  }

  // ---------- catering truck: 24 x 44, facing up (or down) ----------
  const TW = 24, TH = 44;
  function truckArt(cab, stripe, down, driver) {
    return function (r0) {
      const r = down ? function (x, y, w, h, c) { r0(x, TH - y - h, w, h, c); } : r0;
      [[0, 4, 7], [22, 4, 7], [0, 30, 8], [22, 30, 8]].forEach(function (wh) { r(wh[0], wh[1], 2, wh[2], C.rubber); r(wh[0], wh[1] + 2, 2, 1, C.metal); });
      // cab
      r(2, 0, 20, 14, cab);
      r(3, 0, 18, 1, C.metal);
      r(3, 1, 3, 2, C.yellow); r(18, 1, 3, 2, C.yellow);
      r(4, 3, 16, 5, C.glass); r(5, 3, 5, 1, C.white); r(5, 4, 1, 2, C.white);
      if (driver) { r(13, 5, 4, 3, driver); r(12, 7, 6, 1, C.suitNavy); }
      r(4, 8, 16, 5, tint(cab, 0.82)); r(10, 9, 4, 2, C.orange); r(11, 9, 2, 1, C.yellow);
      r(0, 5, 2, 3, C.black); r(22, 5, 2, 3, C.black);
      r(3, 14, 18, 1, C.black);
      // box roof
      r(1, 15, 22, 29, C.white);
      r(0, 16, 1, 27, stripe); r(23, 16, 1, 27, stripe);
      r(1, 15, 1, 29, C.shade); r(22, 15, 1, 29, C.shadeDark);
      for (let y = 19; y < 42; y += 5) r(3, y, 18, 1, '#e2e3e6');
      r(8, 25, 8, 7, C.shadeDark); r(9, 26, 6, 5, C.metal);
      for (let y = 27; y < 31; y += 2) r(9, y, 6, 1, C.shadeDark);
      r(2, 43, 20, 1, C.metal); r(2, 42, 3, 1, C.red); r(19, 42, 3, 1, C.red);
    };
  }
  function truck(x, y, cab, stripe, down, driver) {
    const key = 'truck' + cab + stripe + down + driver;
    const art = truckArt(cab, stripe, down, driver);
    blit(bake(key, TW, TH, art, '#000'), x + 3, y + 4, 0.28);
    blit(bake(key, TW, TH, art), x, y);
  }

  // ---------- airliner, baked nose-down in a 144 x 128 box ----------
  const PL_W = 144, PL_L = 128;
  function planeArt(tail) {
    return function (r) {
      // horizontal stabilizers
      for (let i = 0; i <= 40; i++) {
        const t = i / 40, y0 = 4 + t * 8, y1 = 10 + t * 14;
        r(32 + i, y0, 1, y1 - y0, C.shade); r(111 - i, y0, 1, y1 - y0, C.shade);
        r(32 + i, y1 - 1, 1, 1, C.white); r(111 - i, y1 - 1, 1, 1, C.white);
      }
      // swept wings
      for (let i = 0; i <= 62; i++) {
        const t = i / 62, yTop = 40 + t * 16, yBot = 48 + t * 32;
        [i, 143 - i].forEach(function (x) {
          r(x, yTop, 1, yBot - yTop, C.shade);
          r(x, yTop, 1, 2, C.shadeDark);                       // flaps
          r(x, yTop + (yBot - yTop) * 0.55, 1, 1, tint(C.shade, 0.92));
          r(x, yBot - 1, 1, 1, C.white);                       // leading edge
        });
      }
      // engines hung ahead of the wing
      [16, 38, 106 - 8, 128 - 8].forEach(function (ex) {
        const i = ex < 72 ? ex + 4 : 143 - ex - 4, yBot = 48 + (i / 62) * 32;
        r(ex, yBot - 8, 8, 20, C.metal); r(ex + 1, yBot - 8, 2, 20, C.shade);
        r(ex, yBot + 10, 8, 2, C.black); r(ex + 2, yBot + 10, 4, 1, C.shadeDark);
        r(ex + 2, yBot - 10, 4, 2, C.rubber);
      });
      // fuselage
      for (let y = 0; y < PL_L; y++) {
        let hw = 10;
        if (y < 18) hw = 3 + y * 0.4;
        else if (y > 106) hw = 10 * Math.sqrt(Math.max(0, 1 - Math.pow((y - 106) / 22, 2)));
        hw = Math.round(hw);
        if (hw < 1) continue;
        r(72 - hw, y, hw * 2, 1, C.white);
        r(72 - hw, y, 1, 1, C.shade); r(71 + hw, y, 1, 1, C.shadeDark);
      }
      for (let y = 22; y < 104; y += 4) { r(63, y, 1, 2, C.window); r(80, y, 1, 2, C.window); }
      r(66, 112, 12, 3, C.window); r(71, 112, 2, 3, C.white); r(66, 112, 12, 1, tint(C.window, 1.5));
      r(70, 20, 4, 86, '#e8e9ec');
      // tail fin seen from above, in the airline's color
      r(70, 0, 4, 22, tail); r(71, 0, 2, 22, tint(tail, 1.25));
      r(64, 18, 16, 3, tail);
    };
  }
  // dir: 'down' | 'right' | 'left'
  function plane(x, y, tail, dir, t) {
    const art = planeArt(tail);
    const img = bake('plane' + tail, PL_W, PL_L, art), sh = bake('plane' + tail, PL_W, PL_L, art, '#000');
    function place(ox, oy) {
      ctx.save(); ctx.translate(Math.round(x + ox), Math.round(y + oy));
      if (dir === 'right') ctx.transform(0, 1, 1, 0, 0, 0);
      else if (dir === 'left') ctx.transform(0, 1, -1, 0, PL_L, 0);
    }
    place(10, 12); ctx.globalAlpha = 0.28; ctx.drawImage(sh, 0, 0); ctx.globalAlpha = 1; ctx.restore();
    place(0, 0); ctx.drawImage(img, 0, 0);
    if (Math.floor(t * 3) % 2) { ctx.fillStyle = C.red; ctx.fillRect(0, 44, 2, 3); ctx.fillStyle = C.green; ctx.fillRect(142, 44, 2, 3); }
    if (Math.floor(t * 1.5) % 2) { ctx.fillStyle = C.red; ctx.fillRect(71, 60, 2, 2); }
    ctx.restore();
  }
  // Transform a nose-down rect into the plane's facing.
  function orient(rc, dir) {
    if (dir === 'down') return rc;
    const [x, y, w, h] = rc;
    if (dir === 'right') return [y, x, h, w];
    return [PL_L - y - h, x, h, w];
  }
  const PLANE_HITS = [[62, 2, 20, 124], [8, 44, 128, 14], [30, 56, 84, 20], [32, 4, 80, 14]];

  // ---------- baggage tug and carts ----------
  function carts(o) {
    const n = o.n, dir = o.vx > 0 ? 1 : -1;
    for (let i = 0; i <= n; i++) {
      const slot = dir > 0 ? n - i : i;               // tug leads in the direction of travel
      const cx = Math.round(o.x + slot * 24), cy = Math.round(o.y);
      ctx.globalAlpha = 0.28; rect(cx + 3, cy + 4, 20, 20, '#000'); ctx.globalAlpha = 1;
      if (i === 0) {
        rect(cx, cy, 20, 20, C.yellow); rect(cx, cy, 20, 2, tint(C.yellow, 1.2)); rect(cx, cy + 18, 20, 2, tint(C.yellow, 0.75));
        const front = dir > 0 ? cx + 14 : cx;
        rect(front, cy + 2, 6, 16, tint(C.yellow, 0.85));
        for (let gy = cy + 5; gy < cy + 16; gy += 3) rect(front + (dir > 0 ? 4 : 0), gy, 2, 1, C.black);
        const seat = dir > 0 ? cx + 4 : cx + 8;
        rect(seat, cy + 4, 8, 12, C.black); rect(seat + 2, cy + 7, 5, 5, C.hairBrown); rect(seat + 3, cy + 8, 3, 3, C.orange);
        rect(cx + 2, cy - 1, 4, 2, C.rubber); rect(cx + 14, cy - 1, 4, 2, C.rubber); rect(cx + 2, cy + 19, 4, 2, C.rubber); rect(cx + 14, cy + 19, 4, 2, C.rubber);
      } else {
        rect(cx, cy, 20, 20, C.metal); rect(cx + 1, cy + 1, 18, 18, C.shadeDark);
        [[1, 1], [17, 1], [1, 17], [17, 17]].forEach(function (p) { rect(cx + p[0], cy + p[1], 2, 2, C.shade); });
        const b = o.bags[i];
        bag(cx + 2, cy + 2, 8, 7, b[0]); bag(cx + 10, cy + 3, 8, 7, b[1]); bag(cx + 3, cy + 10, 10, 7, b[2]);
        rect(cx + 2, cy - 1, 4, 2, C.rubber); rect(cx + 14, cy - 1, 4, 2, C.rubber); rect(cx + 2, cy + 19, 4, 2, C.rubber); rect(cx + 14, cy + 19, 4, 2, C.rubber);
      }
      if (i < n) rect(dir > 0 ? cx - 4 : cx + 20, cy + 9, 4, 2, C.black);
    }
  }
  function bag(x, y, w, h, c) {
    rect(x, y, w, h, c);
    rect(x, y, w, 1, tint(c, 1.35)); rect(x, y + h - 1, w, 1, tint(c, 0.7)); rect(x + w - 1, y, 1, h, tint(c, 0.8));
    rect(x + Math.floor(w / 2) - 1, y + 1, 3, 1, C.black);                  // handle
    if (w > 7) rect(x + 2, y + Math.floor(h / 2), w - 4, 1, tint(c, 0.8));  // strap
  }

  // ---------- luggage pile: 32 x 24 ----------
  function pile(o) {
    const x = Math.round(o.x), y = Math.round(o.y);
    ctx.globalAlpha = 0.28; rect(x + 3, y + 4, 32, 22, '#000'); ctx.globalAlpha = 1;
    o.bags.forEach(function (b) { bag(x + b[0], y + b[1], b[2], b[3], b[4]); });
    // a duffel on top
    rect(x + 10, y + 1, 12, 7, C.afNavy); rect(x + 11, y, 10, 1, C.afNavy); rect(x + 10, y + 3, 12, 1, tint(C.afNavy, 1.4));
    rect(x + 14, y - 1, 4, 1, C.black); px(x + 12, y + 5, C.yellow);
  }
  function pileBags(pick, colors) {
    return [[0, 10, 14, 11, pick(colors)], [13, 12, 16, 11, pick(colors)], [4, 4, 12, 8, pick(colors)], [18, 5, 12, 8, pick(colors)]];
  }

  // ---------- pickups ----------
  function meal(x, y, t) {
    x = Math.round(x); y = Math.round(y + Math.sin(t * 6 + x) * 2);
    if (Math.floor(t * 4) % 2) rect(x - 2, y - 2, 24, 20, C.yellow);
    rect(x, y, 20, 16, C.shade); rect(x, y + 15, 20, 1, C.shadeDark);
    rect(x + 1, y + 1, 10, 8, C.white); rect(x + 2, y + 2, 8, 6, C.brownLight); rect(x + 3, y + 3, 5, 3, C.orange);
    rect(x + 12, y + 1, 7, 8, C.white); rect(x + 13, y + 3, 2, 2, C.green); rect(x + 16, y + 4, 2, 2, C.green); rect(x + 14, y + 6, 2, 2, C.green);
    rect(x + 1, y + 10, 6, 5, C.white); rect(x + 2, y + 11, 4, 3, C.red);
    rect(x + 8, y + 10, 5, 5, C.hairBlond);
    rect(x + 14, y + 10, 5, 5, C.white); rect(x + 15, y + 11, 1, 3, C.metal); rect(x + 17, y + 11, 1, 3, C.metal);
  }
  function wrench(x, y, t) {
    x = Math.round(x); y = Math.round(y + Math.sin(t * 6) * 2);
    rect(x, y, 20, 20, C.red); rect(x, y, 20, 2, tint(C.red, 1.3)); rect(x, y + 18, 20, 2, C.redDark);
    rect(x + 8, y + 7, 4, 10, C.white);
    rect(x + 5, y + 3, 10, 5, C.white); rect(x + 8, y + 3, 4, 2, C.red);
  }

  window.Top = { truck: truck, TW: TW, TH: TH, plane: plane, orient: orient, PLANE_HITS: PLANE_HITS, PL_W: PL_W, PL_L: PL_L,
    carts: carts, pile: pile, pileBags: pileBags, meal: meal, wrench: wrench, bag: bag };
})();
