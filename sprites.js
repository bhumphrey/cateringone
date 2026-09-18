// Catering One — shared side-view sprites: people and the catering truck (512 x 448 fine grid).
(function () {
  const { C, rect, px, line, text, tint, spr } = window.C1;

  // ---------- people: 12 x 24, facing right; flipped when facing left ----------
  const BODY = [
    '....hhhhh...',
    '...hhhhhhhh.',
    '..hhhhhhhhh.',
    '..hhhhsssss.',
    '..hhhsssses.',
    '..HhSsssssss',
    '...Hsssssm..',
    '....Sssss...',
    '.....jwwj...',
    '...jjJwtwJj.',
    '...jjjwtwjj.',
    '...jjjjtjjj.',
    '...jjjjtjjj.',
    '...jjjjjjjj.',
    '...jjjjjjjj.',
    '...JJJJJJJJ.'
  ];
  const LEGS = [
    [
      '....pppppp..',
      '....pppppp..',
      '....pp..pp..',
      '....pp..pp..',
      '....pp..pp..',
      '....PP..PP..',
      '....kk..kk..',
      '....kkk.kkk.'
    ],
    [
      '....pppppp..',
      '...ppp..ppp.',
      '...pp....pp.',
      '..pp.....pp.',
      '..pp......pp',
      '.PP.......PP',
      '.kk.......kk',
      'kkk......kkk'
    ]
  ];

  // look: { suit, hair, skin, shirt, tie, pants, item, dir, long, pin }
  // item: 'wave' | 'camera' | 'clipboard' | 'mic' | 'shades'
  function person(x, y, look, frame) {
    x = Math.round(x); y = Math.round(y);
    const top = y - 24, dir = look.dir || 1, flip = dir < 0;
    const skin = look.skin || C.skin, suit = look.suit, shirt = look.shirt || C.white;
    const pal = {
      h: look.hair, H: tint(look.hair, 0.75), s: skin, S: tint(skin, 0.8), e: C.black, m: tint(skin, 0.65),
      j: suit, J: tint(suit, 0.7), w: shirt, t: look.tie || shirt,
      p: look.pants || suit, P: tint(look.pants || suit, 0.7), k: C.black
    };
    // R draws a rect in the sprite's own facing-right coordinates.
    const R = function (dx, dy, w, h, c) { rect(flip ? x + 12 - dx - w : x + dx, top + dy, w, h, c); };
    const stride = frame % 2;

    if (look.long) { R(2, 3, 2, 8, pal.H); R(3, 9, 2, 2, pal.H); }
    spr(LEGS[stride], pal, x, top + 16, flip);
    spr(BODY, pal, x, top, flip);
    if (look.pin) { R(5, 10, 1, 1, C.red); R(5, 11, 1, 1, C.afNavy); }

    const armC = pal.J;
    switch (look.item) {
      case 'wave':
        R(8, 2, 2, 8, armC); R(9, 0, 2, 2, armC); R(9, -3, 3, 3, skin); R(11, -4, 1, 2, skin);
        break;
      case 'camera':
        R(6, 9, 2, 3, armC); R(7, 7, 3, 3, armC);
        R(7, 2, 5, 5, C.black); R(8, 3, 1, 1, C.metal); R(12, 3, 2, 3, C.suitGray); R(8, 1, 2, 1, C.shadeDark);
        break;
      case 'clipboard':
        R(5, 9, 2, 4, armC); R(6, 12, 3, 2, armC); R(9, 12, 2, 2, skin);
        R(9, 8, 3, 7, C.brownLight); R(9, 9, 2, 5, C.white); R(10, 8, 1, 1, C.metal);
        break;
      case 'mic':
        R(6, 9, 2, 3, armC); R(7, 11, 3, 2, armC); R(9, 10, 2, 2, skin);
        R(10, 6, 1, 5, C.black); R(10, 4, 2, 2, C.metal); R(11, 4, 1, 1, C.shade);
        break;
      default:
        if (stride) { R(6, 9, 2, 3, armC); R(7, 12, 2, 2, armC); R(8, 14, 2, 2, skin); }
        else { R(5, 9, 2, 5, armC); R(5, 14, 2, 2, skin); }
    }
    if (look.item === 'shades') { R(7, 4, 4, 1, C.black); R(8, 5, 1, 1, C.black); R(3, 6, 1, 1, C.white); R(4, 7, 1, 1, C.white); R(3, 8, 1, 1, C.white); }
  }

  // ---------- catering truck, side view ----------
  const WHEEL = [
    '...kkkk...',
    '.kkkkkkkk.',
    '.kkggggkk.',
    'kkgmmmmgkk',
    'kkgmwmmgkk',
    'kkgmmmmgkk',
    'kkgmmmmgkk',
    '.kkggggkk.',
    '.kkkkkkkk.',
    '...kkkk...'
  ];
  const WHEEL_PAL = { k: C.rubber, g: C.metal, m: C.shade, w: C.white };
  function wheel(x, y) { spr(WHEEL, WHEEL_PAL, x, y); }

  // (x, y) = ground contact at the truck's left edge. lift = how far the box is raised.
  // Returns the y of the box floor, so people can step onto it.
  function cateringTruckSide(x, y, lift, opts) {
    opts = opts || {};
    x = Math.round(x); y = Math.round(y); lift = Math.round(lift);
    const chassisY = y - 18;

    rect(x - 2, y - 2, 106, 3, 'rgba(0,0,0,0.3)');
    rect(x, chassisY, 100, 8, C.shadeDark); rect(x, chassisY, 100, 2, C.shade);
    rect(x + 4, chassisY + 8, 92, 2, C.metal);
    // cab
    rect(x + 76, y - 44, 26, 26, C.blue);
    rect(x + 76, y - 44, 26, 2, C.afNavy); rect(x + 100, y - 40, 2, 20, tint(C.blue, 0.75));
    rect(x + 86, y - 40, 13, 11, C.glass); rect(x + 86, y - 40, 13, 2, C.white); rect(x + 87, y - 38, 2, 5, C.white);
    rect(x + 78, y - 40, 7, 11, tint(C.glass, 0.85));
    rect(x + 84, y - 42, 1, 22, tint(C.blue, 0.7));
    rect(x + 79, y - 27, 4, 1, C.black);
    rect(x + 80, y - 47, 6, 3, C.orange); rect(x + 81, y - 48, 4, 1, C.yellow);
    rect(x + 102, y - 36, 3, 7, C.black);
    rect(x + 100, y - 24, 4, 3, C.yellow); rect(x + 98, y - 20, 8, 3, C.metal);
    if (opts.driver) { rect(x + 91, y - 37, 5, 6, C.skin); rect(x + 91, y - 37, 5, 2, C.hairGray); rect(x + 95, y - 34, 1, 1, C.black); rect(x + 89, y - 31, 9, 2, C.suitNavy); }
    // scissor lift
    const floorY = chassisY - 2 - lift;
    if (lift > 2) {
      const n = Math.max(1, Math.round(lift / 12));
      for (let i = 0; i < n; i++) {
        const y0 = chassisY - (lift / n) * i, y1 = chassisY - (lift / n) * (i + 1);
        [0, 1].forEach(function (o) {
          line(x + 12, y0 - o, x + 60, y1 - o, o ? C.shade : C.metal);
          line(x + 60, y0 - o, x + 12, y1 - o, o ? C.shade : C.metal);
        });
      }
      rect(x + 10, chassisY - 2, 4, 2, C.black); rect(x + 58, chassisY - 2, 4, 2, C.black);
    }
    // box
    const bx = x - 4, bw = 76, bh = 44, bt = floorY - bh;
    rect(bx, bt, bw, bh, C.white);
    rect(bx, bt, bw, 3, C.shade); rect(bx, floorY - 3, bw, 3, C.shadeDark);
    for (let rx = bx + 10; rx < bx + bw - 4; rx += 12) rect(rx, bt + 4, 1, bh - 8, '#e2e3e6');
    rect(bx, floorY - 17, bw, 6, C.red); rect(bx, floorY - 11, bw, 1, C.redDark);
    text('C1', bx + 22, bt + 6, C.redDark, { size: 16, shadow: false });
    text('CATERING', bx + 6, bt + 25, C.afNavy, { size: 8, shadow: false });
    if (opts.doorOpen) { rect(bx, bt + 6, 10, bh - 10, C.night); rect(bx + 10, bt + 6, 1, bh - 10, C.shadeDark); }
    else rect(bx + 2, bt + 6, 1, bh - 10, C.shadeDark);
    // platform that bridges to the aircraft door
    if (lift > 20) {
      rect(bx - 14, floorY - 2, 14, 4, C.metal); rect(bx - 14, floorY + 2, 14, 1, C.black);
      rect(bx - 14, floorY - 16, 2, 14, C.yellow); rect(bx - 14, floorY - 16, 14, 2, C.yellow);
    }
    wheel(x + 10, y - 10); wheel(x + 48, y - 10); wheel(x + 82, y - 10);
    return floorY;
  }

  window.C1.person = person;
  window.C1.cateringTruckSide = cateringTruckSide;
  window.C1.wheel = wheel;
})();
