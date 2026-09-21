/* =========================================================
   픽셀 스프라이트 — 사진 속 두 사람을 메이플풍 도트로
   ---------------------------------------------------------
   캔버스 규격 : 36(가로) x 48(세로)
   중심선 cx   : 18   /  발바닥 FOOT_Y : 47
   머리가 크고 몸이 작은 메이플 비율로 그린다.
   ========================================================= */
(function (global) {
  'use strict';

  const CHAR_W = 36, CHAR_H = 48, CX = 18, FOOT_Y = 47;

  function px(ctx, x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }

  /** 가로폭 목록으로 좌우대칭 실루엣을 그린다 */
  function profile(ctx, cx, y0, widths, color) {
    widths.forEach((w, i) => {
      if (w > 0) px(ctx, Math.round(cx - w / 2), y0 + i, Math.round(w), 1, color);
    });
  }

  function roundBox(ctx, x, y, w, h, r, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x + r, y, w - r * 2, h);
    ctx.fillRect(x, y + r, w, h - r * 2);
    for (let i = 0; i < r; i += 1) {
      const step = Math.max(0, r - i - 1);
      ctx.fillRect(x + step, y + i, w - step * 2, 1);
      ctx.fillRect(x + step, y + h - 1 - i, w - step * 2, 1);
    }
  }

  /* ── 색 ─────────────────────────────────────────────── */
  const SKIN = '#ffe0c4';
  const SKIN_S = '#f0bf9b';
  const SKIN_D = '#d99f7c';
  const BLUSH = 'rgba(247,140,158,.55)';
  const IRIS = '#3b2733';
  const LASH = '#2a1c26';
  const BROW = '#4a342c';
  const LIP = '#c4636c';
  const OUTLINE = '#4b352f';

  const COSTUMES = {
    bok: {
      hair: '#241a18', hair2: '#3d2c26', hair3: '#4f3a31',
      suit: [
        { key: 'cream', name: '크림 수트', coat: '#f7eeda', coat2: '#e2d2b2', coat3: '#cbb894',
          shirt: '#ffffff', tie: '#5b4436', bow: false, pants: '#f3e7cd', pants2: '#d9c8a4', shoes: '#3a322c', shoes2: '#241f1b' },
        { key: 'tux', name: '블랙 턱시도', coat: '#2f2f3a', coat2: '#20202a', coat3: '#171720',
          shirt: '#fcfcff', tie: '#12121a', bow: true, pants: '#2a2a34', pants2: '#1b1b24', shoes: '#14141a', shoes2: '#0b0b10' },
      ],
    },
    jja: {
      hair: '#241b1d', hair2: '#3c2b2e', hair3: '#4e3a3d',
      suit: [
        { key: 'pink', name: '핑크 드레스', dress: '#f9c2d6', light: '#ffe3ee', shade: '#e39cb9',
          sash: '#ee8cb0', shoes: '#f3dde6', bouquet: false },
        { key: 'white', name: '웨딩드레스', dress: '#fdfaf4', light: '#ffffff', shade: '#e3d6c4',
          sash: '#f0e5d3', shoes: '#f6f0e6', bouquet: true },
      ],
    },
  };

  /* ── 외곽선 (메이플 특유의 1px 라인) ──────────────────── */
  const _scratch = [];
  function scratch(i, w, h) {
    if (!_scratch[i]) _scratch[i] = document.createElement('canvas');
    const c = _scratch[i];
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    const x = c.getContext('2d');
    x.setTransform(1, 0, 0, 1, 0, 0);
    x.clearRect(0, 0, w, h);
    x.imageSmoothingEnabled = false;
    return c;
  }

  function outlined(ctx, w, h, drawFn, color) {
    const art = scratch(0, w + 2, h + 2);
    const a = art.getContext('2d');
    a.save();
    a.translate(1, 1);
    drawFn(a);
    a.restore();

    const sil = scratch(1, w + 2, h + 2);
    const s = sil.getContext('2d');
    s.drawImage(art, 0, 0);
    s.globalCompositeOperation = 'source-in';
    s.fillStyle = color || OUTLINE;
    s.fillRect(0, 0, w + 2, h + 2);

    ctx.save();
    ctx.translate(-1, -1);
    ctx.drawImage(sil, -1, 0);
    ctx.drawImage(sil, 1, 0);
    ctx.drawImage(sil, 0, -1);
    ctx.drawImage(sil, 0, 1);
    ctx.drawImage(art, 0, 0);
    ctx.restore();
  }

  /* ── 얼굴 ─────────────────────────────────────────────
     얼굴 실루엣: y5 ~ y20 (턱), 눈은 y12~y17 에 크게
     ─────────────────────────────────────────────────── */
  const FACE = [11, 14, 16, 18, 19, 19, 19, 19, 19, 19, 19, 18, 18, 17, 15, 12, 8];

  function drawFaceShape(ctx) {
    profile(ctx, CX, 4, FACE, SKIN);
    px(ctx, CX - 10, 16, 2, 2, SKIN_S);    // 볼 그림자
    px(ctx, CX + 8, 16, 2, 2, SKIN_S);
    profile(ctx, CX, 19, [15, 12, 8], SKIN_S);
    profile(ctx, CX, 20, [12, 8], SKIN);
  }

  function drawEyes(ctx, o) {
    const ex = [CX - 8, CX + 4];          // 두 눈의 왼쪽 x (4px 폭)
    if (o.blink) {
      ex.forEach(x => {
        px(ctx, x, 14, 4, 1, LASH);
        px(ctx, x + 1, 15, 2, 1, LASH);
      });
    } else {
      ex.forEach(x => {
        // 크고 까만 아몬드형 눈 + 반짝임 (메이플식)
        px(ctx, x, 12, 4, 1, LASH);
        px(ctx, x, 13, 4, 3, IRIS);
        px(ctx, x + 1, 16, 2, 1, IRIS);
        px(ctx, x + 1, 13, 1, 1, '#ffffff');
        px(ctx, x + 2, 15, 1, 1, '#a88bb8');
        px(ctx, x, 17, 4, 1, SKIN_S);     // 아래 눈꺼풀
      });
    }
    px(ctx, CX - 9, 18, 2, 1, BLUSH);     // 볼터치
    px(ctx, CX + 7, 18, 2, 1, BLUSH);
    px(ctx, CX - 1, 20, 2, 1, LIP);       // 작은 미소
    px(ctx, CX - 2, 19, 1, 1, LIP);
    px(ctx, CX + 1, 19, 1, 1, LIP);
  }

  /* ── 복짱구 ─────────────────────────────────────────── */
  function drawBok(ctx, o) {
    const c = COSTUMES.bok;
    const s = c.suit[o.costume % c.suit.length];
    const f = o.frame | 0;
    const jump = o.state === 'jump';
    const walk = o.state === 'walk';
    const bob = walk ? [0, 1, 0, 1][f] : o.state === 'idle' ? [0, 0, 1, 0][f] : 0;
    const swing = walk ? [3, 0, -3, 0][f] : 0;

    outlined(ctx, CHAR_W, CHAR_H, a => {
      a.save();
      a.translate(0, bob);

      /* 다리 · 구두 */
      if (jump) {
        px(a, CX - 7, 34, 5, 7, s.pants);
        px(a, CX + 2, 34, 5, 6, s.pants);
        px(a, CX - 9, 40, 8, 4, s.shoes);
        px(a, CX + 1, 39, 8, 4, s.shoes);
      } else {
        const l = Math.round(swing * 0.6);
        px(a, CX - 7 - l, 34, 5, 9, s.pants);
        px(a, CX + 2 + l, 34, 5, 9, s.pants);
        px(a, CX - 7 - l, 34, 1, 9, s.pants2);
        px(a, CX + 2 + l, 34, 1, 9, s.pants2);
        px(a, CX - 9 - l, 43, 8, 4, s.shoes);
        px(a, CX + 1 + l, 43, 8, 4, s.shoes);
        px(a, CX - 9 - l, 46, 8, 1, s.shoes2);
        px(a, CX + 1 + l, 46, 8, 1, s.shoes2);
      }

      /* 목 */
      px(a, CX - 2, 20, 4, 3, SKIN_S);

      /* 재킷 */
      profile(a, CX, 22, [13, 15, 15, 15, 15, 15, 15, 14, 14, 13, 13, 13], s.coat);
      px(a, CX - 7, 23, 2, 11, s.coat2);
      px(a, CX + 5, 23, 2, 11, s.coat2);
      px(a, CX - 7, 33, 14, 1, s.coat3);
      /* 셔츠 + 라펠 */
      px(a, CX - 3, 22, 6, 3, s.shirt);
      px(a, CX - 2, 25, 4, 3, s.shirt);
      px(a, CX - 1, 28, 2, 2, s.shirt);
      px(a, CX - 5, 22, 2, 5, s.coat3);
      px(a, CX + 3, 22, 2, 5, s.coat3);
      /* 넥타이 / 보타이 */
      if (s.bow) {
        px(a, CX - 4, 23, 3, 3, s.tie);
        px(a, CX + 1, 23, 3, 3, s.tie);
        px(a, CX - 1, 24, 2, 1, s.tie);
      } else {
        px(a, CX - 1, 23, 2, 8, s.tie);
        px(a, CX - 2, 22, 4, 2, s.tie);
      }
      px(a, CX + 2, 31, 1, 1, s.coat3);   // 단추

      /* 팔 */
      const armL = jump ? 15 : 24 + swing;
      const armR = jump ? 15 : 24 - swing;
      px(a, CX - 11, armL, 4, 8, s.coat);
      px(a, CX - 11, armL, 1, 8, s.coat2);
      px(a, CX + 7, armR, 4, 8, s.coat);
      px(a, CX + 10, armR, 1, 8, s.coat2);
      px(a, CX - 11, armL + 8, 4, 3, SKIN);   // 손
      px(a, CX + 7, armR + 8, 4, 3, SKIN);

      /* 머리 */
      profile(a, CX, 1, [9, 14, 17, 19, 20, 21, 21, 21, 21, 21], c.hair);   // 헤어 덩어리
      drawFaceShape(a);
      /* 앞머리 — 왼쪽 가르마, 오른쪽으로 흐르는 숏컷 */
      px(a, CX - 10, 4, 8, 7, c.hair);
      px(a, CX - 3, 4, 6, 6, c.hair);
      px(a, CX + 3, 4, 7, 7, c.hair);
      px(a, CX - 4, 10, 4, 1, c.hair);
      px(a, CX + 6, 11, 4, 2, c.hair);
      px(a, CX - 10, 11, 3, 3, c.hair);       // 구레나룻
      px(a, CX + 9, 13, 2, 2, c.hair);
      px(a, CX - 11, 13, 1, 3, SKIN_S);       // 귀
      px(a, CX + 10, 14, 1, 3, SKIN_S);
      /* 머릿결 하이라이트 */
      px(a, CX - 6, 2, 8, 1, c.hair3);
      px(a, CX - 8, 3, 5, 1, c.hair2);
      px(a, CX + 2, 3, 6, 1, c.hair2);
      px(a, CX + 4, 6, 4, 1, c.hair2);

      drawEyes(a, o);
      a.restore();
    });
  }

  /* ── 조짱아 ─────────────────────────────────────────── */
  function drawJja(ctx, o) {
    const c = COSTUMES.jja;
    const s = c.suit[o.costume % c.suit.length];
    const f = o.frame | 0;
    const jump = o.state === 'jump';
    const walk = o.state === 'walk';
    const bob = walk ? [0, 1, 0, 1][f] : o.state === 'idle' ? [0, 0, 1, 0][f] : 0;
    const sway = walk ? [1, 0, -1, 0][f] : 0;
    const swing = walk ? [2, 0, -2, 0][f] : 0;

    outlined(ctx, CHAR_W, CHAR_H, a => {
      a.save();
      a.translate(0, bob);

      /* 뒤로 흐르는 긴 머리 */
      profile(a, CX, 2, [10, 15, 18, 20, 22, 23, 24, 24, 24, 24, 24, 24, 24, 23, 22, 21, 20], c.hair);
      px(a, CX - 12, 19, 4, 14, c.hair);
      px(a, CX + 8, 19, 4, 14, c.hair);
      px(a, CX - 11, 33, 3, 3, c.hair);
      px(a, CX + 8, 33, 3, 3, c.hair);

      /* 드레스 — 뷔스티에 */
      px(a, CX - 6, 23, 12, 7, s.dress);
      px(a, CX - 6, 23, 12, 1, s.light);
      px(a, CX - 2, 23, 4, 1, SKIN);            // 하트 네크라인
      px(a, CX - 6, 26, 1, 4, s.shade);
      px(a, CX + 5, 26, 1, 4, s.shade);
      px(a, CX - 6, 30, 12, 1, s.sash);         // 허리 리본
      px(a, CX - 1, 30, 3, 2, s.sash);
      /* 오프숄더 퍼프 소매 */
      px(a, CX - 9, 23, 4, 3, s.light);
      px(a, CX + 5, 23, 4, 3, s.light);
      px(a, CX - 9, 25, 4, 1, s.shade);
      px(a, CX + 5, 25, 4, 1, s.shade);

      /* 치마 — A라인 + 세로 주름 */
      for (let i = 0; i < 16; i += 1) {
        const w = 12 + i * 1.05;
        const x = CX - w / 2 + sway * (i / 16);
        px(a, x, 31 + i, w, 1, s.dress);
        if (i > 2) {
          px(a, x + w * 0.22, 31 + i, 1, 1, s.shade);
          px(a, x + w * 0.52, 31 + i, 1, 1, s.light);
          px(a, x + w * 0.8, 31 + i, 1, 1, s.shade);
        }
      }
      px(a, CX - 13 + sway, 46, 26, 1, s.light);
      px(a, CX - 4, 45, 3, 2, s.shoes);
      px(a, CX + 1, 45, 3, 2, s.shoes);

      /* 팔 */
      const armL = jump ? 16 : 25 + swing;
      const armR = jump ? 16 : 25 - swing;
      px(a, CX - 9, armL, 3, 9, SKIN);
      px(a, CX - 9, armL, 1, 9, SKIN_S);
      px(a, CX + 6, armR, 3, 9, SKIN);
      px(a, CX + 8, armR, 1, 9, SKIN_S);

      /* 부케 (웨딩드레스일 때) */
      if (s.bouquet) {
        const by = (jump ? 24 : 33) - swing;
        px(a, CX + 5, by, 6, 5, '#8fd39b');
        px(a, CX + 6, by - 3, 5, 4, '#ffffff');
        px(a, CX + 5, by - 1, 2, 2, '#fff2f7');
        px(a, CX + 9, by + 1, 2, 2, '#ffe1ec');
        px(a, CX + 7, by + 4, 1, 3, '#8fd39b');
      }

      drawFaceShape(a);

      /* 앞머리 — 가운데 가르마 + 얼굴을 감싸는 긴 머리 */
      px(a, CX - 11, 3, 9, 7, c.hair);
      px(a, CX + 2, 3, 9, 7, c.hair);
      px(a, CX - 2, 3, 4, 3, c.hair);
      px(a, CX - 5, 4, 3, 5, c.hair);
      px(a, CX + 2, 4, 3, 5, c.hair);
      px(a, CX - 12, 9, 3, 11, c.hair);
      px(a, CX + 9, 9, 3, 11, c.hair);
      px(a, CX - 11, 19, 3, 2, c.hair);
      px(a, CX + 8, 19, 3, 2, c.hair);
      px(a, CX - 9, 3, 6, 1, c.hair3);          // 머릿결
      px(a, CX + 2, 4, 6, 1, c.hair2);
      px(a, CX - 10, 6, 3, 1, c.hair2);
      /* 면사포 (웨딩드레스) */
      if (s.bouquet) {
        px(a, CX - 13, 6, 3, 26, 'rgba(255,255,255,.72)');
        px(a, CX + 10, 6, 3, 26, 'rgba(255,255,255,.72)');
        px(a, CX - 13, 30, 4, 4, 'rgba(255,255,255,.6)');
        px(a, CX + 9, 30, 4, 4, 'rgba(255,255,255,.6)');
        px(a, CX - 9, 2, 18, 2, '#ffffff');
        px(a, CX - 7, 1, 14, 1, '#fff6fa');
        px(a, CX - 8, 3, 3, 3, '#ffe9f1');   // 머리 위 꽃
        px(a, CX + 5, 3, 3, 3, '#ffe9f1');
      }

      /* 진주 헤어핀 */
      px(a, CX + 5, 7, 4, 1, '#f6dca6');
      px(a, CX + 6, 6, 1, 1, '#fff7e2');
      /* 귀걸이 */
      px(a, CX - 9, 18, 1, 2, '#ffeec2');
      px(a, CX + 8, 18, 1, 2, '#ffeec2');

      drawEyes(a, o);
      a.restore();
    });
  }

  /* ── 웨딩플래너 NPC (오르비스 요정) ───────────────────── */
  function drawPlanner(ctx, o) {
    const bob = [0, 1, 2, 1][o.frame | 0];
    outlined(ctx, CHAR_W, CHAR_H, a => {
      a.save();
      a.translate(0, bob);
      // 날개
      px(a, CX - 15, 22, 6, 9, 'rgba(198,228,255,.9)');
      px(a, CX + 9, 22, 6, 9, 'rgba(198,228,255,.9)');
      px(a, CX - 14, 24, 4, 5, 'rgba(255,255,255,.95)');
      px(a, CX + 10, 24, 4, 5, 'rgba(255,255,255,.95)');
      // 드레스
      px(a, CX - 6, 23, 12, 8, '#c39ae8');
      px(a, CX - 6, 23, 12, 1, '#ddc3f5');
      for (let i = 0; i < 14; i += 1) {
        const w = 12 + i * 0.95;
        px(a, CX - w / 2, 31 + i, w, 1, i % 4 === 3 ? '#a377cf' : '#c39ae8');
      }
      px(a, CX - 3, 45, 3, 2, '#8e63b8');
      px(a, CX + 1, 45, 3, 2, '#8e63b8');
      // 팔 + 클립보드
      px(a, CX - 9, 25, 3, 9, SKIN);
      px(a, CX + 6, 25, 3, 9, SKIN);
      px(a, CX - 14, 29, 8, 9, '#eadcbb');
      px(a, CX - 13, 31, 6, 1, '#9b8a68');
      px(a, CX - 13, 33, 6, 1, '#9b8a68');
      px(a, CX - 13, 35, 4, 1, '#9b8a68');
      drawFaceShape(a);
      // 보라 머리 + 티아라
      profile(a, CX, 2, [10, 15, 18, 20, 21, 22, 22, 22], '#7a54a6');
      px(a, CX - 11, 8, 3, 8, '#7a54a6');
      px(a, CX + 8, 8, 3, 8, '#7a54a6');
      px(a, CX - 10, 5, 9, 4, '#7a54a6');
      px(a, CX + 1, 5, 9, 4, '#7a54a6');
      px(a, CX - 8, 3, 6, 1, '#9a74c6');
      px(a, CX - 3, 1, 6, 2, '#ffe9a8');
      px(a, CX - 1, 0, 2, 2, '#fff6d4');
      drawEyes(a, o);
      a.restore();
    });
  }

  /* ── 아이템 ─────────────────────────────────────────── */
  function item(ctx, fn) { outlined(ctx, 16, 16, fn); }

  function drawEgg(ctx) {
    item(ctx, a => {
      profile(a, 8, 2, [5, 7, 8, 9, 9, 10, 10, 10, 10, 9, 8, 6], '#fffaf0');
      px(a, 5, 4, 2, 3, '#ffffff');
      px(a, 10, 8, 2, 4, '#eadfc8');
      px(a, 5, 12, 6, 1, '#ddd0b8');
    });
  }

  function drawWater(ctx) {
    item(ctx, a => {
      profile(a, 8, 1, [1, 3, 4, 6, 7, 8, 9, 10, 10, 10, 9, 8, 6], '#6cbdee');
      px(a, 5, 6, 2, 4, '#d5f0ff');
      px(a, 6, 5, 1, 1, '#ffffff');
      px(a, 5, 11, 7, 2, '#4ba4d8');
    });
  }

  function drawStar(ctx) {
    item(ctx, a => {
      px(a, 6, 1, 4, 13, '#ffd75e');
      px(a, 1, 5, 14, 4, '#ffd75e');
      px(a, 3, 3, 10, 8, '#ffd75e');
      px(a, 2, 6, 12, 3, '#ffe587');
      px(a, 5, 4, 3, 3, '#fff3bd');
    });
  }

  function drawHeartItem(ctx) {
    item(ctx, a => {
      px(a, 2, 3, 5, 4, '#ff8fb1');
      px(a, 9, 3, 5, 4, '#ff8fb1');
      px(a, 1, 5, 14, 3, '#ff8fb1');
      px(a, 2, 8, 12, 2, '#ff7ba3');
      px(a, 4, 10, 8, 2, '#ff7ba3');
      px(a, 6, 12, 4, 2, '#f26691');
      px(a, 3, 4, 3, 2, '#ffd0de');
    });
  }

  /* ── 배경 오브젝트 ──────────────────────────────────── */
  function drawPlatform(ctx, w) {
    const h = 18;
    roundBox(ctx, 0, 0, w, 6, 2, '#86dc92');
    px(ctx, 0, 0, w, 1, '#a5eeae');
    px(ctx, 0, 4, w, 2, '#5cb573');
    roundBox(ctx, 1, 6, w - 2, h - 8, 3, '#c79a63');
    px(ctx, 1, 6, w - 2, 2, '#dcb079');
    for (let i = 4; i < w - 6; i += 9) {
      px(ctx, i, 10, 2, 2, '#a97d4c');
      px(ctx, i + 4, 13, 2, 2, '#a97d4c');
    }
    px(ctx, 3, h - 3, w - 6, 2, '#a97d4c');
    px(ctx, 5, -2, 2, 3, '#86dc92');
    px(ctx, w - 8, -2, 2, 3, '#86dc92');
  }

  /** 발판 위 작은 꽃 (kind 0~2) */
  function drawFlower(ctx, kind) {
    const petal = ['#ff9dc0', '#ffe27a', '#ffffff'][kind % 3];
    const core = ['#ffd9e8', '#ffb347', '#ffe27a'][kind % 3];
    px(ctx, 2, 4, 1, 3, '#4fa85f');
    px(ctx, 0, 5, 2, 1, '#69c27a');
    px(ctx, 1, 1, 3, 3, petal);
    px(ctx, 0, 2, 5, 1, petal);
    px(ctx, 2, 0, 1, 1, petal);
    px(ctx, 2, 2, 1, 1, core);
  }

  /** 길 안내 표지판 */
  function drawSign(ctx) {
    px(ctx, 7, 8, 2, 12, '#a9764a');
    px(ctx, 7, 8, 1, 12, '#8a5d38');
    roundBox(ctx, 0, 0, 16, 10, 2, '#e8c38d');
    px(ctx, 1, 1, 14, 2, '#f6dcb0');
    px(ctx, 3, 4, 10, 1, '#8a5d38');
    px(ctx, 3, 6, 7, 1, '#8a5d38');
  }

  function drawArch(ctx, t) {
    const stone = '#fdf6ea', stone2 = '#e6d8c2', stone3 = '#cbb99e';
    const petals = ['#ffc2d6', '#ffe1eb', '#f6a9c4', '#ffffff'];
    const leaf = ['#7fd18b', '#5cb573'];

    /* 기둥 */
    [4, 48].forEach(x => {
      px(ctx, x, 14, 8, 56, stone);
      px(ctx, x, 14, 2, 56, stone2);
      px(ctx, x + 6, 14, 2, 56, stone3);
      px(ctx, x - 1, 66, 10, 4, stone);
      px(ctx, x - 1, 68, 10, 2, stone2);
    });

    /* 아치 곡선 */
    roundBox(ctx, 2, 2, 56, 14, 6, stone);
    px(ctx, 8, 12, 44, 3, stone2);

    /* 꽃 넝쿨 */
    for (let i = 0; i < 16; i += 1) {
      const ang = (i / 15) * Math.PI;
      const x = 30 - Math.cos(ang) * 28 - 3;
      const y = 8 - Math.sin(ang) * 8 + Math.sin(t / 420 + i) * 1.2;
      px(ctx, x - 1, y + 4, 7, 3, leaf[i % 2]);
      px(ctx, x, y, 5, 5, petals[i % petals.length]);
      px(ctx, x + 1, y + 1, 2, 2, '#fff6fa');
    }
    for (let i = 0; i < 5; i += 1) {
      px(ctx, 3, 18 + i * 11, 6, 5, petals[i % petals.length]);
      px(ctx, 2, 22 + i * 11, 5, 3, leaf[i % 2]);
      px(ctx, 50, 22 + i * 10, 6, 5, petals[(i + 1) % petals.length]);
      px(ctx, 52, 26 + i * 10, 5, 3, leaf[(i + 1) % 2]);
    }

    /* 핑크 리본 */
    px(ctx, 24, 3, 5, 5, '#ff9fc2');
    px(ctx, 31, 3, 5, 5, '#ff9fc2');
    px(ctx, 28, 5, 4, 3, '#ff7fae');
    px(ctx, 22, 8, 4, 8, '#ffb6d2');
    px(ctx, 34, 8, 4, 8, '#ffb6d2');

    /* 금색 종 */
    const swingY = Math.sin(t / 300) * 1;
    const by = 12 + swingY;
    profile(ctx, 30, by, [4, 6, 8, 9, 10, 11, 12, 12], '#f7c94a');
    px(ctx, 24, by + 8, 12, 2, '#ffe387');
    px(ctx, 25, by + 2, 2, 6, '#ffe9a6');
    px(ctx, 33, by + 3, 2, 5, '#d79f28');
    px(ctx, 29, by + 10, 3, 3, '#d79f28');
    px(ctx, 28, by + 5, 5, 4, '#ff9fc2');   // 종에 하트
    px(ctx, 29, by + 4, 1, 1, '#ff9fc2');
    px(ctx, 31, by + 4, 1, 1, '#ff9fc2');

    /* 베일처럼 흐르는 천 */
    px(ctx, 18, 10, 3, 16, 'rgba(255,255,255,.75)');
    px(ctx, 39, 10, 3, 16, 'rgba(255,255,255,.75)');
  }

  /** 오르비스 비행선 (레퍼런스 아트의 그 비행선) */
  function drawBlimp(ctx, t) {
    const bob = Math.sin(t / 700) * 1.5;
    ctx.save();
    ctx.translate(0, bob);
    profile(ctx, 34, 0, [18, 30, 40, 46, 50, 52, 52, 50, 46, 40, 30, 18], '#bfe4fb');
    profile(ctx, 34, 0, [18, 30, 40, 46, 22, 20, 20, 18], '#e6f5ff');
    px(ctx, 10, 6, 48, 1, '#8fc9ea');
    px(ctx, 24, 3, 3, 8, '#a8d8f2');
    px(ctx, 44, 3, 3, 8, '#a8d8f2');
    // 곰돌이 얼굴
    px(ctx, 16, 4, 10, 8, '#ffffff');
    px(ctx, 15, 3, 4, 4, '#ffffff');
    px(ctx, 23, 3, 4, 4, '#ffffff');
    px(ctx, 18, 6, 2, 2, '#4a3530');
    px(ctx, 22, 6, 2, 2, '#4a3530');
    px(ctx, 20, 9, 2, 1, '#f0a0b8');
    px(ctx, 17, 9, 2, 1, 'rgba(247,140,158,.6)');
    px(ctx, 23, 9, 2, 1, 'rgba(247,140,158,.6)');
    // 곤돌라
    px(ctx, 28, 12, 14, 5, '#e3c58f');
    px(ctx, 28, 12, 14, 1, '#f3dbb0');
    px(ctx, 30, 14, 3, 2, '#8fc9ea');
    px(ctx, 36, 14, 3, 2, '#8fc9ea');
    px(ctx, 6, 8, 6, 2, '#d7a86a');
    ctx.restore();
  }

  /** 하늘에 떠 있는 오르비스 성 (배경) */
  function drawCastle(ctx, scale) {
    const w = '#f2f8ff', b = '#9ec9ec', b2 = '#79aede', gold = '#f3d380';
    ctx.save();
    ctx.scale(scale || 1, scale || 1);
    px(ctx, 6, 26, 52, 22, w);
    px(ctx, 6, 26, 52, 3, b);
    px(ctx, 14, 32, 6, 9, b2);
    px(ctx, 28, 32, 6, 9, b2);
    px(ctx, 42, 32, 6, 9, b2);
    [8, 26, 46].forEach((x, i) => {
      const h = [16, 22, 18][i];
      px(ctx, x, 26 - h, 10, h, w);
      px(ctx, x + 1, 26 - h, 2, h, b);
      profile(ctx, x + 5, 26 - h - 9, [2, 4, 6, 8, 9, 10, 11, 12, 12], b);
      px(ctx, x + 4, 26 - h - 12, 2, 4, gold);
    });
    // 아래쪽 바위섬
    profile(ctx, 32, 48, [50, 46, 40, 32, 24, 16, 10, 5], '#b9d7a4');
    profile(ctx, 32, 50, [46, 40, 32, 24, 16, 10, 5], '#a07e57');
    ctx.restore();
  }

  /** 하트 배너가 달린 가로등 */
  function drawLamp(ctx, t) {
    const gold = '#f0cd7c', gold2 = '#c9a049';
    px(ctx, 7, 10, 4, 34, gold);
    px(ctx, 7, 10, 1, 34, gold2);
    px(ctx, 4, 42, 10, 4, gold);
    profile(ctx, 9, 0, [6, 9, 10, 10, 10, 9, 7], '#fff3c9');
    px(ctx, 6, 3, 2, 4, '#ffe9a0');
    px(ctx, 5, 9, 8, 2, gold2);
    // 핑크 배너
    const sway = Math.sin(t / 620) * 0.6;
    px(ctx, 2 + sway, 14, 12, 14, '#f8a3c1');
    px(ctx, 2 + sway, 14, 12, 2, '#ffd0e2');
    profile(ctx, 8 + sway, 28, [12, 10, 8, 6, 4, 2], '#f8a3c1');
    px(ctx, 5 + sway, 18, 3, 3, '#fff2f7');
    px(ctx, 9 + sway, 18, 3, 3, '#fff2f7');
    px(ctx, 4 + sway, 20, 9, 3, '#fff2f7');
    px(ctx, 6 + sway, 23, 5, 2, '#fff2f7');
  }

  /** 귀여운 버섯 친구 */
  function drawMushroom(ctx, t) {
    const bob = Math.sin(t / 500) * 1;
    ctx.save();
    ctx.translate(0, bob);
    profile(ctx, 9, 0, [6, 10, 14, 16, 16], '#f0803c');
    px(ctx, 2, 5, 14, 2, '#d9662c');
    px(ctx, 5, 1, 3, 2, '#ffd9b0');
    px(ctx, 11, 2, 2, 2, '#ffd9b0');
    px(ctx, 3, 7, 12, 7, '#fbe8c9');
    px(ctx, 3, 12, 12, 2, '#e8cfa6');
    px(ctx, 5, 9, 2, 2, '#4a3530');
    px(ctx, 11, 9, 2, 2, '#4a3530');
    px(ctx, 8, 11, 2, 1, '#e08a9a');
    px(ctx, 4, 11, 2, 1, 'rgba(247,140,158,.55)');
    px(ctx, 12, 11, 2, 1, 'rgba(247,140,158,.55)');
    ctx.restore();
  }

  /** 하얀 솜뭉치 친구 */
  function drawFluff(ctx, t) {
    const bob = Math.sin(t / 430 + 1) * 1;
    ctx.save();
    ctx.translate(0, bob);
    profile(ctx, 8, 1, [8, 12, 14, 14, 14, 14, 12, 8], '#ffffff');
    px(ctx, 1, 6, 2, 3, '#ffffff');
    px(ctx, 13, 6, 2, 3, '#ffffff');
    px(ctx, 5, 5, 2, 2, '#4a3530');
    px(ctx, 10, 5, 2, 2, '#4a3530');
    px(ctx, 7, 7, 2, 1, '#e08a9a');
    px(ctx, 3, 7, 2, 1, 'rgba(247,140,158,.55)');
    px(ctx, 11, 7, 2, 1, 'rgba(247,140,158,.55)');
    px(ctx, 6, 2, 4, 1, '#ffe3ee');
    ctx.restore();
  }

  /** 꽃으로 덮인 돌 난간 (바닥 장식) */
  function drawRailing(ctx, w, t) {
    px(ctx, 0, 0, w, 5, '#f6ecd9');
    px(ctx, 0, 0, w, 1, '#fffaf0');
    px(ctx, 0, 4, w, 1, '#d9c8a8');
    for (let x = 2; x < w - 4; x += 12) {
      px(ctx, x, 5, 3, 7, '#eadfc8');
      px(ctx, x + 6, 5, 3, 7, '#eadfc8');
      const heart = x + 2;
      px(ctx, heart, 6, 5, 3, '#ffd9e6');
      px(ctx, heart + 1, 9, 3, 1, '#ffd9e6');
    }
    const petals = ['#ffc2d6', '#ffffff', '#ffe1eb', '#ff9fc2'];
    for (let x = 0; x < w; x += 9) {
      const y = Math.sin((x + t / 40) / 18) * 1;
      px(ctx, x, -3 + y, 5, 4, '#7fd18b');
      px(ctx, x + 2, -5 + y, 4, 4, petals[(x / 9) % petals.length]);
      px(ctx, x + 3, -4 + y, 2, 2, '#fff6fa');
    }
  }

  function drawTower(ctx, h) {
    const body = 'rgba(255,255,255,.92)';
    const shade = 'rgba(207,225,245,.92)';
    px(ctx, 34, 40, 52, h, body);
    for (let y = 40; y < h + 40; y += 26) {
      px(ctx, 34, y, 52, 4, shade);
      px(ctx, 44, y + 8, 8, 12, 'rgba(160,205,240,.75)');
      px(ctx, 68, y + 8, 8, 12, 'rgba(160,205,240,.75)');
    }
    px(ctx, 28, 30, 64, 12, body);
    for (let i = 0; i < 7; i += 1) px(ctx, 24 + i * 9, 18, 6, 14, body);
    px(ctx, 44, 0, 32, 20, body);
    px(ctx, 52, 4, 16, 12, 'rgba(160,205,240,.85)');
    px(ctx, 58, 6, 2, 6, body);
    px(ctx, 58, 10, 6, 2, body);
  }

  global.Sprites = {
    px, profile, roundBox, outlined, OUTLINE, COSTUMES,
    drawBok, drawJja, drawPlanner,
    drawEgg, drawWater, drawStar, drawHeartItem,
    drawPlatform, drawArch, drawTower, drawFlower, drawSign,
    drawBlimp, drawCastle, drawLamp, drawMushroom, drawFluff, drawRailing,
    CHAR_W, CHAR_H, CX, FOOT_Y,
  };
})(window);
