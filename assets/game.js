/* =========================================================
   복짱구 ♡ 조짱아 결혼준비 RPG — 게임 엔진
   ---------------------------------------------------------
   맵을 돌아다니며 🥚 계란 · 💧 물 · ⭐ 아이템을 먹어
   오늘의 결혼준비 퀘스트를 클리어하는 메이플풍 횡스크롤 RPG.

   새 퀘스트는 게임 안 [＋ 미션 추가] 버튼으로 등록하거나,
   아래 DEFAULT_MISSIONS 배열에 한 줄 추가하면 된다.
   ========================================================= */
(function () {
  'use strict';

  /* ========== 설정 ========== */
  const CONFIG = {
    weddingDate: '2026-10-05',
    storageKey: 'bokjjang-rpg-v1',
    countdownDays: 15,
  };

  const DEFAULT_MISSIONS = [
    // 조짱아 다이어트 퀘스트
    { id: 'jja-egg',   icon: '🥚', item: 'egg',   name: '계란 4개 먹기', owner: 'jja', target: 4, unit: '개',        exp: 40, meso: 800 },
    { id: 'jja-water', icon: '💧', item: 'water', name: '물 2L 마시기',  owner: 'jja', target: 8, unit: '컵(250ml)', exp: 40, meso: 800 },
    // 복짱구 퀘스트 (예시 — 필요 없으면 게임 안에서 삭제)
    { id: 'bok-walk',  icon: '👟', item: 'star',  name: '만보 걷기',          owner: 'bok', target: 2, unit: '회', exp: 30, meso: 500 },
    { id: 'bok-cheer', icon: '💌', item: 'heart', name: '조짱아 칭찬 한마디', owner: 'bok', target: 1, unit: '번', exp: 20, meso: 300 },
    // 함께 하는 퀘스트
    { id: 'both-check', icon: '📋', item: 'star', name: '결혼준비 체크리스트 1개', owner: 'both', target: 1, unit: '개', exp: 50, meso: 1000 },
  ];

  const CHARS = {
    bok: { name: '복짱구', role: '신랑' },
    jja: { name: '조짱아', role: '신부' },
  };
  const OWNER_LABEL = { jja: '조짱아', bok: '복짱구', both: '함께' };

  const TITLES = [
    { lv: 1,  bok: '예비신랑',      jja: '예비신부' },
    { lv: 3,  bok: '식단 감시자',   jja: '계란 수집가' },
    { lv: 5,  bok: '웨딩 준비생',   jja: '물 2L 마스터' },
    { lv: 8,  bok: '만보의 사나이', jja: '드레스 핏 장인' },
    { lv: 12, bok: '오르비스 신랑', jja: '오르비스 신부' },
    { lv: 16, bok: '전설의 남편',   jja: '전설의 아내' },
  ];

  const ACHIEVEMENTS = [
    { id: 'first',   icon: '🌱', name: '첫 발걸음',      desc: '퀘스트 1개 클리어',         test: s => s.totalCleared >= 1 },
    { id: 'egg30',   icon: '🥚', name: '계란 사냥꾼',    desc: '계란 누적 30개',            test: s => (s.missionTotals['jja-egg'] || 0) >= 30 },
    { id: 'water50', icon: '🌊', name: '수분 충전 완료', desc: '물 누적 50컵',              test: s => (s.missionTotals['jja-water'] || 0) >= 50 },
    { id: 'streak3', icon: '🔥', name: '작심삼일 격파',  desc: '3일 연속 올클리어',         test: s => s.bestStreak >= 3 },
    { id: 'streak7', icon: '⚡', name: '일주일 완주',    desc: '7일 연속 올클리어',         test: s => s.bestStreak >= 7 },
    { id: 'meso10',  icon: '💰', name: '혼수 자금 마련', desc: '파티 누적 10만 메소',       test: s => s.totalMeso >= 100000 },
    { id: 'lv10',    icon: '👑', name: '둘 다 Lv.10',    desc: '두 사람 모두 레벨 10',      test: s => s.chars.bok.level >= 10 && s.chars.jja.level >= 10 },
    { id: 'arch',    icon: '💒', name: '웨딩 아치',      desc: '하루 올클리어 후 아치 통과', test: s => s.perfectDays >= 1 },
  ];

  /* ========== 맵 ========== */
  const MAP_NAME = '오르비스 하늘정원';
  const WORLD = { w: 1760, h: 542 };
  const GROUND_Y = 470;
  const PLATFORMS = [
    { x: -20, y: GROUND_Y, w: WORLD.w + 40, ground: true },
    { x: 140, y: 396, w: 120 },
    { x: 320, y: 330, w: 110 },
    { x: 180, y: 250, w: 100 },
    { x: 500, y: 288, w: 110 },
    { x: 680, y: 356, w: 120 },
    { x: 860, y: 300, w: 110 },
    { x: 1040, y: 382, w: 120 },
    { x: 1210, y: 312, w: 110 },
    { x: 1400, y: 250, w: 120 },
    { x: 1560, y: 372, w: 140 },
    { x: 700, y: 196, w: 190 },   // 웨딩 아치 발판
  ];
  const ARCH = { x: 748, y: 90, w: 90, h: 105 };   // 웨딩 아치 (1.5배로 그림)
  const LAMPS = [70, 470, 980, 1480];                       // 하트 배너 가로등
  const CRITTERS = [                                         // 귀여운 친구들
    { x: 190, y: 396, kind: 'fluff' }, { x: 380, y: 330, kind: 'mushroom' },
    { x: 720, y: 356, kind: 'fluff' }, { x: 1090, y: 382, kind: 'mushroom' },
    { x: 1450, y: 250, kind: 'fluff' }, { x: 620, y: GROUND_Y, kind: 'mushroom' },
    { x: 1240, y: GROUND_Y, kind: 'fluff' },
  ];
  const CASTLES = [                                          // 배경에 뜬 성
    { x: 120, y: 120, s: 0.9 }, { x: 760, y: 70, s: 1.15 }, { x: 1380, y: 130, s: 0.8 },
  ];
  const NPC_POS = { x: 178, y: GROUND_Y };   // x: 중심, y: 발바닥

  /* 아이템이 놓이는 자리 (발판 위) */
  const ITEM_SPOTS = (function () {
    const spots = [];
    PLATFORMS.forEach(p => {
      if (p.ground) return;
      [0.25, 0.55, 0.8].forEach(f => spots.push({ x: Math.round(p.x + p.w * f) - 8, y: p.y - 24 }));
    });
    for (let x = 420; x < WORLD.w - 200; x += 190) spots.push({ x, y: GROUND_Y - 24 });
    // 맵 전체에 골고루 퍼지도록 섞기
    const mixed = [];
    for (let i = 0; i < spots.length; i += 1) mixed.push(spots[(i * 7) % spots.length]);
    return mixed;
  })();

  /* ========== 유틸 ========== */
  const $ = sel => document.querySelector(sel);
  const $$ = sel => [...document.querySelectorAll(sel)];
  const pad = n => String(n).padStart(2, '0');
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const dateKey = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const todayKey = () => dateKey(new Date());
  const parseKey = k => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
  const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
  const daysBetween = (a, b) => Math.round((parseKey(b) - parseKey(a)) / 86400000);
  const fmtNum = n => Number(n).toLocaleString('ko-KR');
  const expNeed = lv => 50 + (lv - 1) * 30;

  function levelFromExp(total) {
    let lv = 1;
    let rest = Math.max(0, Math.floor(total));
    while (rest >= expNeed(lv) && lv < 200) { rest -= expNeed(lv); lv += 1; }
    return { level: lv, exp: rest, need: expNeed(lv) };
  }

  function titleFor(key, lv) {
    let t = TITLES[0][key];
    for (const row of TITLES) if (lv >= row.lv) t = row[key];
    return t;
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  /* ========== 상태 ========== */
  function freshState() {
    return {
      version: 2,
      weddingDate: CONFIG.weddingDate,
      missions: DEFAULT_MISSIONS.map(m => ({ ...m })),
      progress: {},
      costume: { bok: 1, jja: 1 },
      active: 'jja',
      sound: true,
      createdAt: todayKey(),
    };
  }

  let state = (function load() {
    try {
      const raw = localStorage.getItem(CONFIG.storageKey);
      if (!raw) return freshState();
      const p = JSON.parse(raw);
      const base = freshState();
      return {
        ...base,
        ...p,
        missions: Array.isArray(p.missions) && p.missions.length ? p.missions : base.missions,
        progress: p.progress && typeof p.progress === 'object' ? p.progress : {},
        costume: { ...base.costume, ...(p.costume || {}) },
      };
    } catch (e) {
      return freshState();
    }
  })();

  function save() {
    try { localStorage.setItem(CONFIG.storageKey, JSON.stringify(state)); } catch (e) { /* 저장 실패해도 진행 */ }
  }

  const missionById = id => state.missions.find(m => m.id === id);
  const missionsFor = key => state.missions.filter(m => m.owner === key || m.owner === 'both');
  const countOf = (day, id) => (state.progress[day] && state.progress[day][id]) || 0;

  function dayRate(day, key) {
    const list = key ? missionsFor(key) : state.missions;
    if (!list.length) return 0;
    let sum = 0;
    for (const m of list) sum += Math.min(1, countOf(day, m.id) / m.target);
    return sum / list.length;
  }

  function streakOf(key) {
    if (!missionsFor(key).length) return 0;
    const cur = new Date();
    if (dayRate(dateKey(cur), key) < 1) cur.setDate(cur.getDate() - 1);
    let n = 0;
    for (let i = 0; i < 400; i += 1) {
      if (dayRate(dateKey(cur), key) < 1) break;
      n += 1;
      cur.setDate(cur.getDate() - 1);
    }
    return n;
  }

  function bestStreakAll() {
    const days = Object.keys(state.progress).filter(d => dayRate(d, null) >= 1).sort();
    let best = 0, run = 0, prev = null;
    for (const d of days) {
      run = prev && daysBetween(prev, d) === 1 ? run + 1 : 1;
      best = Math.max(best, run);
      prev = d;
    }
    return best;
  }

  /** 기록으로부터 EXP·메소·레벨을 매번 다시 계산 */
  function computeStats() {
    const st = {
      chars: { bok: { totalExp: 0, meso: 0 }, jja: { totalExp: 0, meso: 0 } },
      missionTotals: {}, totalCleared: 0, totalMeso: 0, perfectDays: 0, bestStreak: 0,
    };
    for (const day of Object.keys(state.progress)) {
      for (const [mid, raw] of Object.entries(state.progress[day] || {})) {
        const m = missionById(mid);
        if (!m) continue;
        const count = clamp(Number(raw) || 0, 0, m.target);
        if (!count) continue;
        st.missionTotals[mid] = (st.missionTotals[mid] || 0) + count;
        const ratio = count / m.target;
        const done = count >= m.target;
        if (done) st.totalCleared += 1;
        const exp = m.exp * ratio + (done ? m.exp * 0.5 : 0);
        const meso = m.meso * ratio + (done ? m.meso * 0.5 : 0);
        (m.owner === 'both' ? ['bok', 'jja'] : [m.owner]).forEach(o => {
          if (!st.chars[o]) return;
          st.chars[o].totalExp += exp;
          st.chars[o].meso += meso;
        });
      }
      if (state.missions.length && dayRate(day, null) >= 1) st.perfectDays += 1;
    }
    ['bok', 'jja'].forEach(k => {
      const c = st.chars[k];
      c.totalExp = Math.round(c.totalExp);
      c.meso = Math.round(c.meso);
      Object.assign(c, levelFromExp(c.totalExp));
      c.streak = streakOf(k);
      st.totalMeso += c.meso;
    });
    st.bestStreak = bestStreakAll();
    return st;
  }

  let stats = computeStats();

  /* ========== 캔버스 ========== */
  const canvas = $('#screen');
  const ctx = canvas.getContext('2d');
  let VIEW_W = 480, VIEW_H = 270;

  function resize() {
    const aspect = Math.max(0.4, window.innerWidth / Math.max(1, window.innerHeight));
    const h = clamp(Math.round(Math.sqrt((480 * 270) / aspect)), 230, 560);
    const w = clamp(Math.round(h * aspect), 240, 1000);
    VIEW_W = w; VIEW_H = h;
    canvas.width = w; canvas.height = h;
    ctx.imageSmoothingEnabled = false;
    skyGrad = null;
  }
  window.addEventListener('resize', resize);

  /* ========== 입력 ========== */
  const keys = { left: false, right: false, jump: false, down: false, action: false };
  let jumpEdge = false, actionEdge = false;

  const KEYMAP = {
    ArrowLeft: 'left', KeyA: 'left',
    ArrowRight: 'right', KeyD: 'right',
    ArrowDown: 'down', KeyS: 'down',
    ArrowUp: 'jump', KeyW: 'jump', Space: 'jump',
    KeyZ: 'action', Enter: 'action',
  };

  window.addEventListener('keydown', e => {
    if (!$('#titleScreen').hidden) { e.preventDefault(); startGame(); return; }
    if (!$('#cutscene').hidden) {
      if (e.code === 'KeyZ' || e.code === 'Enter' || e.code === 'Escape' || e.code === 'Space') {
        e.preventDefault();
        $('#cutscene').hidden = true;
      }
      return;
    }
    if (e.code === 'Escape') { closeAllWindows(); return; }
    if (anyWindowOpen()) return;
    if (e.code === 'Tab') { e.preventDefault(); swapChar(); return; }
    if (e.code === 'KeyQ') { openWindow('questWindow'); return; }
    if (e.code === 'KeyC') { cycleCostume(); return; }
    if (e.code === 'KeyH') { openWindow('helpModal'); return; }
    const k = KEYMAP[e.code];
    if (!k) return;
    e.preventDefault();
    if (k === 'jump' && !keys.jump) jumpEdge = true;
    if (k === 'action' && !keys.action) actionEdge = true;
    keys[k] = true;
  });

  window.addEventListener('keyup', e => {
    const k = KEYMAP[e.code];
    if (k) keys[k] = false;
  });

  $$('.touch-pad button').forEach(btn => {
    const k = btn.dataset.key;
    const on = e => { e.preventDefault(); if (k === 'jump' && !keys.jump) jumpEdge = true; if (k === 'action' && !keys.action) actionEdge = true; keys[k] = true; };
    const off = e => { e.preventDefault(); keys[k] = false; };
    btn.addEventListener('touchstart', on, { passive: false });
    btn.addEventListener('touchend', off);
    btn.addEventListener('touchcancel', off);
    btn.addEventListener('mousedown', on);
    btn.addEventListener('mouseup', off);
    btn.addEventListener('mouseleave', off);
  });

  /* ========== 엔티티 ========== */
  const GRAVITY = 0.42, MOVE_SPEED = 1.6, JUMP_V = -7.8, HITBOX = { w: 16, h: 36 };

  function makeChar(kind, x) {
    return { kind, x, y: GROUND_Y - HITBOX.h, vx: 0, vy: 0, dir: 1, onGround: false, state: 'idle', frame: 0, anim: 0, dropTimer: 0 };
  }

  const actors = { bok: makeChar('bok', 330), jja: makeChar('jja', 296) };
  let activeKey = state.active === 'bok' ? 'bok' : 'jja';
  const player = () => actors[activeKey];
  const partner = () => actors[activeKey === 'bok' ? 'jja' : 'bok'];

  function physics(ch, wantLeft, wantRight, wantJump, wantDown) {
    if (wantLeft && !wantRight) { ch.vx = -MOVE_SPEED; ch.dir = -1; }
    else if (wantRight && !wantLeft) { ch.vx = MOVE_SPEED; ch.dir = 1; }
    else ch.vx *= 0.55;

    if (wantJump && ch.onGround) {
      if (wantDown) { ch.dropTimer = 12; ch.y += 2; }
      else { ch.vy = JUMP_V; sfx('jump'); }
      ch.onGround = false;
    }

    ch.vy = Math.min(ch.vy + GRAVITY, 9);
    const prevBottom = ch.y + HITBOX.h;
    ch.x = clamp(ch.x + ch.vx, 0, WORLD.w - HITBOX.w);
    ch.y += ch.vy;
    if (ch.dropTimer > 0) ch.dropTimer -= 1;

    ch.onGround = false;
    if (ch.vy >= 0 && ch.dropTimer <= 0) {
      for (const p of PLATFORMS) {
        const bottom = ch.y + HITBOX.h;
        if (bottom >= p.y && prevBottom <= p.y + 6 &&
            ch.x + HITBOX.w > p.x + 2 && ch.x < p.x + p.w - 2) {
          ch.y = p.y - HITBOX.h;
          ch.vy = 0;
          ch.onGround = true;
          break;
        }
      }
    }
    if (ch.y > WORLD.h + 60) { ch.x = 260; ch.y = GROUND_Y - HITBOX.h - 40; ch.vy = 0; }

    // 애니메이션 상태
    const moving = Math.abs(ch.vx) > 0.25;
    ch.state = !ch.onGround ? 'jump' : moving ? 'walk' : 'idle';
    ch.anim += ch.state === 'walk' ? 0.22 : 0.06;
    ch.frame = Math.floor(ch.anim) % 4;
  }

  function followAI(ch, target) {
    const dx = (target.x - ch.x) - target.dir * 34;
    const far = Math.abs(dx);
    const wantLeft = dx < -6 && far > 8;
    const wantRight = dx > 6 && far > 8;
    const wantJump = ch.onGround && (target.y + 20 < ch.y || (far > 40 && Math.abs(ch.vx) < 0.4 && Math.random() < 0.05));
    if (far > 460) { ch.x = target.x - target.dir * 34; ch.y = target.y - 20; ch.vy = 0; }
    physics(ch, wantLeft, wantRight, wantJump, false);
  }

  /* ========== 아이템 ========== */
  let items = [];

  function rebuildItems() {
    const day = todayKey();
    items = [];
    let si = 0;
    for (const m of state.missions) {
      const remain = Math.max(0, m.target - countOf(day, m.id));
      for (let i = 0; i < remain; i += 1) {
        const spot = ITEM_SPOTS[si % ITEM_SPOTS.length];
        si += 1;
        items.push({ x: spot.x, y: spot.y, mid: m.id, type: m.item || 'star', bob: Math.random() * 6.28 });
      }
    }
  }

  let wrongOwnerCooldown = 0;

  function tryCollect(ch, key) {
    for (let i = items.length - 1; i >= 0; i -= 1) {
      const it = items[i];
      if (ch.x + HITBOX.w < it.x + 2 || ch.x > it.x + 14) continue;
      if (ch.y + HITBOX.h < it.y + 2 || ch.y > it.y + 16) continue;
      const m = missionById(it.mid);
      if (!m) { items.splice(i, 1); continue; }
      if (m.owner !== 'both' && m.owner !== key) {
        if (wrongOwnerCooldown <= 0) {
          showHint(`${OWNER_LABEL[m.owner]}의 퀘스트예요! Tab 으로 바꿔보세요`);
          wrongOwnerCooldown = 90;
          sfx('deny');
        }
        continue;
      }
      items.splice(i, 1);
      gain(m, ch);
      return;
    }
  }

  function gain(m, ch) {
    const day = todayKey();
    const before = computeStats();
    const next = clamp(countOf(day, m.id) + 1, 0, m.target);
    state.progress[day] = state.progress[day] || {};
    state.progress[day][m.id] = next;
    save();
    stats = computeStats();

    const owners = m.owner === 'both' ? ['bok', 'jja'] : [m.owner];
    const dExp = owners.reduce((a, o) => Math.max(a, stats.chars[o].totalExp - before.chars[o].totalExp), 0);
    const dMeso = owners.reduce((a, o) => Math.max(a, stats.chars[o].meso - before.chars[o].meso), 0);
    floatText(ch.x + 8, ch.y - 4, `+${fmtNum(dExp)} EXP`, '#b6ffcf');
    floatText(ch.x + 8, ch.y - 16, `+${fmtNum(dMeso)} 메소`, '#ffe08a', 22);
    burst(ch.x + 8, ch.y + 10, m.item === 'water' ? '#8ed6f7' : m.item === 'egg' ? '#fff6e0' : '#ffd75e');

    const done = next >= m.target;
    if (done) {
      floatText(ch.x + 8, ch.y - 30, `${m.name} 완료!`, '#ffffff', 44);
      showHint(`✨ ${m.name} 클리어!`);
    }
    sfx(done ? 'clear' : 'pick');

    for (const k of ['bok', 'jja']) {
      if (stats.chars[k].level > before.chars[k].level) {
        levelUpFx(`${CHARS[k].name} LEVEL UP!`);
        break;
      }
    }
    rebuildItems();
    syncHud();
    if (!$('#questWindow').hidden) renderQuestPane();
  }

  /* ========== 연출 ========== */
  const floats = [];
  const particles = [];

  function floatText(x, y, text, color, delay) {
    floats.push({ x, y, text, color, life: 0, max: 70, delay: delay || 0 });
  }

  function burst(x, y, color) {
    for (let i = 0; i < 10; i += 1) {
      particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 2.4,
        vy: -Math.random() * 2.2 - 0.4,
        life: 0, max: 26 + Math.random() * 12,
        color, size: Math.random() < 0.4 ? 2 : 1,
      });
    }
  }

  function hearts(x, y) {
    for (let i = 0; i < 26; i += 1) {
      particles.push({
        x: x + (Math.random() - 0.5) * 40, y: y + (Math.random() - 0.5) * 20,
        vx: (Math.random() - 0.5) * 1.4, vy: -Math.random() * 1.6 - 0.6,
        life: 0, max: 70 + Math.random() * 40,
        color: ['#ff8fb1', '#ffd0de', '#ffffff', '#ffd75e'][i % 4], size: 2, heart: true,
      });
    }
  }

  function levelUpFx(text) {
    const el = $('#levelup');
    el.querySelector('span').textContent = text;
    el.hidden = false;
    clearTimeout(levelUpFx.t);
    levelUpFx.t = setTimeout(() => { el.hidden = true; }, 1800);
    const p = player();
    for (let i = 0; i < 24; i += 1) {
      particles.push({
        x: p.x + 8, y: p.y + 30,
        vx: (Math.random() - 0.5) * 1.2, vy: -Math.random() * 3 - 1,
        life: 0, max: 50, color: '#ffe066', size: 2,
      });
    }
    sfx('levelup');
  }

  let hintTimer = 0;
  function showHint(text) {
    const el = $('#hint');
    el.textContent = text;
    el.hidden = false;
    hintTimer = 150;
  }

  /* ========== 사운드 ========== */
  let actx = null;
  function sfx(kind) {
    if (!state.sound) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      const map = {
        jump: [[660, 0.06]], pick: [[880, 0.07]], clear: [[784, 0.07], [1047, 0.1]],
        levelup: [[523, 0.09], [659, 0.09], [784, 0.09], [1047, 0.16]],
        deny: [[220, 0.09]], talk: [[520, 0.04]],
      };
      (map[kind] || map.pick).forEach(([freq, dur], i) => {
        const osc = actx.createOscillator();
        const g = actx.createGain();
        osc.type = 'square';
        osc.frequency.value = freq;
        osc.connect(g).connect(actx.destination);
        const t = actx.currentTime + i * 0.075;
        g.gain.setValueAtTime(0.035, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + dur);
        osc.start(t);
        osc.stop(t + dur + 0.02);
      });
    } catch (e) { /* 무음 환경 */ }
  }

  /* ========== 대사 ========== */
  let dialogueQueue = [];
  function say(name, face, lines) {
    dialogueQueue = lines.slice();
    $('#dlgName').textContent = name;
    $('#dlgFace').textContent = face;
    nextDialogue();
    sfx('talk');
  }

  function nextDialogue() {
    if (!dialogueQueue.length) { $('#dialogue').hidden = true; return; }
    $('#dlgText').textContent = dialogueQueue.shift();
    $('#dialogue').hidden = false;
  }
  $('#dlgNext').addEventListener('click', () => { nextDialogue(); sfx('talk'); });

  const NPC_LINES = [
    ['오르비스에 온 걸 환영해요!', '오늘의 준비 퀘스트를 확인해 볼까요?'],
    ['계란은 조짱아만, 만보 아이템은 복짱구만 먹을 수 있어요.', 'Tab 으로 캐릭터를 바꿔가며 모아보세요!'],
    ['오늘 퀘스트를 모두 끝내면', '꼭대기 웨딩 아치가 반짝일 거예요 ✨'],
  ];
  let npcLine = 0;

  /* ========== 상호작용 ========== */
  function interact() {
    const p = player();
    if (!$('#dialogue').hidden) { nextDialogue(); return; }

    if (Math.abs(p.x + HITBOX.w / 2 - NPC_POS.x) < 36 && Math.abs(p.y + HITBOX.h - NPC_POS.y) < 60) {
      say('웨딩플래너 오르비', '🧚', NPC_LINES[npcLine % NPC_LINES.length].concat(['[Q] 를 누르면 퀘스트 노트가 열려요.']));
      npcLine += 1;
      return;
    }

    const acx = ARCH.x + ARCH.w / 2;
    if (Math.abs((p.x + 8) - acx) < 54 && Math.abs(p.y + HITBOX.h - (ARCH.y + ARCH.h)) < 70) {
      const rate = dayRate(todayKey(), null);
      if (rate >= 1) {
        hearts(acx, ARCH.y + 30);
        const left = Math.max(0, daysBetween(todayKey(), state.weddingDate));
        showCutscene(left > 0
          ? `${CHARS.bok.name} ♡ ${CHARS.jja.name} · 결혼식까지 ${left}일! 오늘도 고생 많았어요 💍`
          : `${CHARS.bok.name} ♡ ${CHARS.jja.name} · 오늘이 바로 그날! 결혼 축하해요 💒`);
      } else {
        say('웨딩 아치', '💒', [
          `아직 오늘 퀘스트가 ${Math.round(rate * 100)}% 남아 있어요.`,
          '맵에 있는 아이템을 모두 먹고 다시 와주세요!',
        ]);
      }
      return;
    }
    showHint('주변에 대화할 상대가 없어요');
  }

  function swapChar() {
    activeKey = activeKey === 'bok' ? 'jja' : 'bok';
    state.active = activeKey;
    save();
    showHint(`${CHARS[activeKey].name} (으)로 전환!`);
    sfx('talk');
    syncHud();
  }

  function cycleCostume() {
    const list = Sprites.COSTUMES[activeKey].suit;
    state.costume[activeKey] = (state.costume[activeKey] + 1) % list.length;
    save();
    showHint(`${CHARS[activeKey].name} 의상: ${list[state.costume[activeKey]].name}`);
    sfx('pick');
  }

  /* ========== 배경 ========== */
  let skyGrad = null;
  const STARS = Array.from({ length: 60 }, (_, i) => ({
    x: (i * 137) % (WORLD.w + 400), y: (i * 89) % 240, s: i % 5 === 0 ? 2 : 1,
  }));
  const CLOUDS = Array.from({ length: 16 }, (_, i) => ({
    x: (i * 173) % (WORLD.w + 300), y: 40 + ((i * 67) % 320), s: 0.7 + ((i % 4) * 0.35), d: 0.25 + (i % 3) * 0.14,
  }));
  const ISLANDS = Array.from({ length: 7 }, (_, i) => ({
    x: 120 + i * 260, y: 120 + ((i * 97) % 260), w: 40 + (i % 3) * 22,
  }));

  function drawCloud(x, y, s) {
    ctx.fillStyle = 'rgba(255,255,255,.92)';
    ctx.fillRect(x, y + 4 * s, 26 * s, 7 * s);
    ctx.fillRect(x + 5 * s, y, 15 * s, 8 * s);
    ctx.fillRect(x + 14 * s, y + 2 * s, 12 * s, 6 * s);
    ctx.fillStyle = 'rgba(214,236,255,.9)';
    ctx.fillRect(x + 2 * s, y + 9 * s, 22 * s, 2 * s);
  }

  /** 땅 아래를 채우는 오르비스 구름 바다 */
  function drawCloudSea(t) {
    const top = GROUND_Y + 30;
    ctx.fillStyle = '#e8f3ff';
    ctx.fillRect(cam.x - 20, top + 8, VIEW_W + 40, WORLD.h - top);
    const startX = Math.floor((cam.x - 40) / 34) * 34;
    for (let x = startX; x < cam.x + VIEW_W + 40; x += 34) {
      const y = top + Math.sin((x + t / 26) / 60) * 3;
      ctx.fillStyle = 'rgba(255,255,255,.95)';
      ctx.fillRect(x, y + 4, 30, 10);
      ctx.fillRect(x + 6, y, 18, 8);
      ctx.fillStyle = 'rgba(214,236,255,.9)';
      ctx.fillRect(x + 2, y + 12, 26, 3);
    }
  }

  function drawBackground(cam, t) {
    if (!skyGrad) {
      skyGrad = ctx.createLinearGradient(0, 0, 0, VIEW_H);
      skyGrad.addColorStop(0, '#9ed9fb');
      skyGrad.addColorStop(0.45, '#bfe7fd');
      skyGrad.addColorStop(0.75, '#dbe6ff');
      skyGrad.addColorStop(1, '#f2e8ff');
    }
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);

    // 별
    const tw = 0.5 + Math.sin(t / 700) * 0.35;
    ctx.fillStyle = `rgba(255,255,255,${tw})`;
    STARS.forEach(s => {
      const x = s.x - cam.x * 0.12;
      if (x < -4 || x > VIEW_W + 4) return;
      ctx.fillRect(Math.round(x), Math.round(s.y - cam.y * 0.12), s.s, s.s);
    });

    // 하늘에 뜬 오르비스 성
    CASTLES.forEach(c => {
      const x = Math.round(c.x - cam.x * 0.34);
      if (x < -120 || x > VIEW_W + 120) return;
      ctx.save();
      ctx.globalAlpha = 0.9;
      ctx.translate(x, Math.round(c.y - cam.y * 0.3 + Math.sin(t / 1600 + c.x) * 2));
      Sprites.drawCastle(ctx, c.s);
      ctx.restore();
      ctx.globalAlpha = 1;
    });

    // 오르비스 비행선
    const blimpX = ((t / 36) % (WORLD.w + 700)) - 350 - cam.x * 0.28;
    if (blimpX > -140 && blimpX < VIEW_W + 40) {
      ctx.save();
      ctx.translate(Math.round(blimpX), Math.round(40 - cam.y * 0.25));
      Sprites.drawBlimp(ctx, t);
      ctx.restore();
    }

    // 떠다니는 하트
    for (let i = 0; i < 9; i += 1) {
      const hx = ((i * 197 + t / 90) % (VIEW_W + 60)) - 30;
      const hy = 60 + ((i * 83) % 200) + Math.sin(t / 600 + i) * 10;
      ctx.globalAlpha = 0.5 + Math.sin(t / 500 + i) * 0.25;
      ctx.fillStyle = i % 2 ? '#ffb3cd' : '#ffffff';
      ctx.fillRect(hx, hy, 2, 2);
      ctx.fillRect(hx + 3, hy, 2, 2);
      ctx.fillRect(hx + 1, hy + 2, 3, 2);
    }
    ctx.globalAlpha = 1;

    // 오르비스 시계탑
    ctx.save();
    ctx.translate(Math.round(1080 - cam.x * 0.42), Math.round(70 - cam.y * 0.3));
    ctx.globalAlpha = 0.85;
    Sprites.drawTower(ctx, 210);
    ctx.restore();
    ctx.globalAlpha = 1;

    // 배경 섬
    ISLANDS.forEach(is => {
      const x = Math.round(is.x - cam.x * 0.5);
      if (x < -80 || x > VIEW_W + 80) return;
      const y = Math.round(is.y - cam.y * 0.42 + Math.sin(t / 900 + is.x) * 3);
      ctx.globalAlpha = 0.75;
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(0.75, 0.75);
      Sprites.drawPlatform(ctx, is.w);
      ctx.restore();
      ctx.globalAlpha = 1;
    });

    // 구름
    CLOUDS.forEach(c => {
      const x = Math.round(((c.x - cam.x * c.d) % (WORLD.w + 300) + WORLD.w + 300) % (WORLD.w + 300) - 100);
      if (x < -80 || x > VIEW_W + 40) return;
      drawCloud(x, Math.round(c.y - cam.y * c.d + Math.sin(t / 1400 + c.x) * 2), c.s);
    });
  }

  /* ========== 텍스트 ========== */
  function pixelText(text, x, y, color, opt) {
    const o = opt || {};
    ctx.font = `${o.size || 9}px "Galmuri9", "Galmuri11", monospace`;
    ctx.textAlign = o.align || 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = o.stroke === undefined ? 3 : o.stroke;
    ctx.lineJoin = 'round';
    if (ctx.lineWidth > 0) {
      ctx.strokeStyle = o.strokeColor || 'rgba(30,24,40,.9)';
      ctx.strokeText(text, x, y);
    }
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
  }

  function nameTag(ch, key, offset) {
    const label = CHARS[key].name;
    ctx.font = '9px "Galmuri9", "Galmuri11", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const w = Math.max(28, ctx.measureText(label).width + 8);
    const x = Math.round(ch.x + 8);
    const y = Math.round(ch.y + HITBOX.h + 7 + (offset || 0));
    ctx.fillStyle = 'rgba(20,18,30,.62)';
    ctx.fillRect(x - w / 2, y - 6, w, 12);
    ctx.fillStyle = key === activeKey ? '#ffe9a8' : '#dfe8f2';
    ctx.fillText(label, x, y);
  }

  /* ========== 렌더 ========== */
  const cam = { x: 0, y: 0 };
  let tick = 0;

  function drawChar(ch, key) {
    const blink = (tick + (key === 'bok' ? 40 : 0)) % 240 < 9;
    const opts = { state: ch.state, frame: ch.frame, costume: state.costume[key] || 0, blink };
    ctx.save();
    ctx.translate(Math.round(ch.x + HITBOX.w / 2 - cam.x), Math.round(ch.y + HITBOX.h - cam.y));
    if (ch.dir < 0) ctx.scale(-1, 1);
    ctx.translate(-Sprites.CX, -Sprites.FOOT_Y);
    (key === 'bok' ? Sprites.drawBok : Sprites.drawJja)(ctx, opts);
    ctx.restore();
  }

  function render(t) {
    drawBackground(cam, t);
    ctx.save();
    ctx.translate(-Math.round(cam.x), -Math.round(cam.y));

    // 발판 + 꽃 장식
    PLATFORMS.forEach((p, pi) => {
      if (p.x - cam.x > VIEW_W + 40 || p.x + p.w - cam.x < -40) return;
      ctx.save();
      ctx.translate(p.x, p.y);
      Sprites.drawPlatform(ctx, p.w);
      ctx.restore();
      const step = p.ground ? 150 : Math.round(p.w / 3);
      for (let dx = 14; dx < p.w - 10; dx += step) {
        const fx = p.x + dx + (pi * 7) % 11;
        if (fx - cam.x < -10 || fx - cam.x > VIEW_W + 10) continue;
        ctx.save();
        ctx.translate(fx, p.y - 6);
        Sprites.drawFlower(ctx, (pi + dx) % 3);
        ctx.restore();
      }
    });

    // 바닥 꽃 난간
    const railStart = Math.floor((cam.x - 60) / 60) * 60;
    for (let x = railStart; x < cam.x + VIEW_W + 60; x += 60) {
      ctx.save();
      ctx.translate(x, GROUND_Y + 15);
      Sprites.drawRailing(ctx, 60, t + x);
      ctx.restore();
    }

    // 하트 배너 가로등
    LAMPS.forEach(lx => {
      if (lx - cam.x < -40 || lx - cam.x > VIEW_W + 40) return;
      ctx.save();
      ctx.translate(lx, GROUND_Y - 46);
      Sprites.drawLamp(ctx, t);
      ctx.restore();
    });

    // 귀여운 친구들
    CRITTERS.forEach(cr => {
      if (cr.x - cam.x < -30 || cr.x - cam.x > VIEW_W + 30) return;
      ctx.save();
      ctx.translate(cr.x, cr.y - (cr.kind === 'mushroom' ? 14 : 12));
      (cr.kind === 'mushroom' ? Sprites.drawMushroom : Sprites.drawFluff)(ctx, t + cr.x * 7);
      ctx.restore();
    });

    // 시작 지점 표지판
    ctx.save();
    ctx.translate(112, GROUND_Y - 20);
    Sprites.drawSign(ctx);
    ctx.restore();

    // 지면 아래 구름 바다
    drawCloudSea(t);

    // 웨딩 아치
    const allDone = dayRate(todayKey(), null) >= 1;
    ctx.save();
    ctx.translate(ARCH.x, ARCH.y);
    ctx.scale(1.5, 1.5);
    if (allDone) {
      ctx.shadowColor = 'rgba(255,214,102,.95)';
      ctx.shadowBlur = 12;
    }
    Sprites.drawArch(ctx, t);
    ctx.restore();
    if (allDone && tick % 40 < 20) pixelText('♡ 축하해요 ♡', ARCH.x + ARCH.w / 2, ARCH.y - 14, '#fff2b8');

    // NPC
    ctx.save();
    ctx.translate(NPC_POS.x - Sprites.CX, NPC_POS.y - Sprites.FOOT_Y);
    Sprites.drawPlanner(ctx, { frame: Math.floor(tick / 14) % 4, blink: tick % 200 < 8 });
    ctx.restore();
    ctx.fillStyle = 'rgba(20,18,30,.6)';
    ctx.fillRect(NPC_POS.x - 24, NPC_POS.y + 1, 48, 12);
    pixelText('오르비', NPC_POS.x, NPC_POS.y + 7, '#cfe9ff');

    // 아이템
    items.forEach(it => {
      if (it.x - cam.x > VIEW_W + 20 || it.x - cam.x < -20) return;
      const bob = Math.sin(t / 260 + it.bob) * 2.5;
      ctx.save();
      ctx.translate(Math.round(it.x), Math.round(it.y + bob));
      const fn = it.type === 'egg' ? Sprites.drawEgg
        : it.type === 'water' ? Sprites.drawWater
        : it.type === 'heart' ? Sprites.drawHeartItem : Sprites.drawStar;
      fn(ctx);
      ctx.restore();
      // 반짝임
      if ((tick + it.bob * 10) % 70 < 6) {
        ctx.fillStyle = 'rgba(255,255,255,.9)';
        ctx.fillRect(Math.round(it.x + 13), Math.round(it.y + bob - 1), 2, 2);
      }
    });

    // 캐릭터 (뒤에 있는 파트너 먼저)
    const pk = activeKey === 'bok' ? 'jja' : 'bok';
    ctx.restore();
    ctx.save();
    drawChar(actors[pk], pk);
    drawChar(actors[activeKey], activeKey);
    ctx.restore();

    ctx.save();
    ctx.translate(-Math.round(cam.x), -Math.round(cam.y));
    nameTag(actors[pk], pk, 13);            // 파트너 이름표는 한 줄 아래
    nameTag(actors[activeKey], activeKey, 0);

    // 파티클
    particles.forEach(p => {
      const a = 1 - p.life / p.max;
      ctx.globalAlpha = Math.max(0, a);
      ctx.fillStyle = p.color;
      if (p.heart) {
        ctx.fillRect(p.x, p.y, 2, 2);
        ctx.fillRect(p.x + 3, p.y, 2, 2);
        ctx.fillRect(p.x + 1, p.y + 2, 3, 2);
      } else {
        ctx.fillRect(p.x, p.y, p.size, p.size);
      }
    });
    ctx.globalAlpha = 1;

    // 떠오르는 글자
    floats.forEach(f => {
      if (f.delay > 0) return;
      const prog = f.life / f.max;
      ctx.globalAlpha = Math.max(0, 1 - prog * prog);
      pixelText(f.text, f.x, f.y - prog * 26, f.color);
    });
    ctx.globalAlpha = 1;

    // 상호작용 안내 (아치/NPC 근처)
    const p = player();
    const nearNpc = Math.abs(p.x + HITBOX.w / 2 - NPC_POS.x) < 36 && Math.abs(p.y + HITBOX.h - NPC_POS.y) < 60;
    const nearArch = Math.abs((p.x + 8) - (ARCH.x + ARCH.w / 2)) < 54 && Math.abs(p.y + HITBOX.h - (ARCH.y + ARCH.h)) < 70;
    if (nearNpc || nearArch) {
      const tx = nearNpc ? NPC_POS.x : ARCH.x + ARCH.w / 2;
      const ty = (nearNpc ? NPC_POS.y - 56 : ARCH.y - 6) + Math.sin(t / 220) * 2;
      pixelText('Z 대화', tx, ty, '#fff8d0');
    }
    ctx.restore();

    drawMinimap();
  }

  /** 메이플식 미니맵 */
  function drawMinimap() {
    if (VIEW_W < 360) return;
    const W = 92, H = 32, X = VIEW_W - W - 8, Y = 76;
    const sx = W / WORLD.w, sy = H / WORLD.h;
    ctx.fillStyle = 'rgba(22,32,54,.62)';
    ctx.fillRect(X, Y, W, H);
    ctx.strokeStyle = 'rgba(255,255,255,.55)';
    ctx.lineWidth = 1;
    ctx.strokeRect(X + 0.5, Y + 0.5, W - 1, H - 1);

    PLATFORMS.forEach(p => {
      ctx.fillStyle = p.ground ? 'rgba(150,220,160,.85)' : 'rgba(190,235,200,.75)';
      ctx.fillRect(X + p.x * sx, Y + p.y * sy, Math.max(2, p.w * sx), 1);
    });
    // 아이템
    ctx.fillStyle = 'rgba(255,225,120,.9)';
    items.forEach(it => ctx.fillRect(X + it.x * sx, Y + it.y * sy - 1, 1, 1));
    // 아치
    ctx.fillStyle = '#ffb3cd';
    ctx.fillRect(X + (ARCH.x + 20) * sx, Y + ARCH.y * sy - 1, 3, 3);
    // 캐릭터
    const pk = activeKey === 'bok' ? 'jja' : 'bok';
    ctx.fillStyle = '#cfe0f5';
    ctx.fillRect(X + actors[pk].x * sx - 1, Y + actors[pk].y * sy - 2, 2, 3);
    ctx.fillStyle = '#ffe066';
    ctx.fillRect(X + player().x * sx - 1, Y + player().y * sy - 2, 3, 4);
    ctx.fillStyle = 'rgba(22,32,54,.72)';
    ctx.fillRect(X, Y - 11, W, 11);
    pixelText(MAP_NAME, X + W / 2, Y - 5, '#dceaff', { size: 8, stroke: 0 });
  }

  /* ========== 루프 ========== */
  let lastDay = todayKey();

  function step(t) {
    tick += 1;
    const winOpen = anyWindowOpen() || !$('#dialogue').hidden || introOpen();

    if (winOpen) {
      player().vx *= 0.5;
      physics(player(), false, false, false, false);
    } else {
      physics(player(), keys.left, keys.right, jumpEdge, keys.down);
      if (actionEdge) interact();
    }
    followAI(partner(), player());
    jumpEdge = false;
    actionEdge = false;
    if (wrongOwnerCooldown > 0) wrongOwnerCooldown -= 1;

    tryCollect(player(), activeKey);
    tryCollect(partner(), activeKey === 'bok' ? 'jja' : 'bok');

    // 카메라
    const p = player();
    const targetX = clamp(p.x + 8 - VIEW_W / 2, 0, Math.max(0, WORLD.w - VIEW_W));
    const targetY = clamp(p.y + 18 - VIEW_H * 0.5, 0, Math.max(0, WORLD.h - VIEW_H));
    cam.x += (targetX - cam.x) * 0.12;
    cam.y += (targetY - cam.y) * 0.1;

    // 파티클/텍스트
    for (let i = particles.length - 1; i >= 0; i -= 1) {
      const q = particles[i];
      q.x += q.vx; q.y += q.vy; q.vy += 0.07; q.life += 1;
      if (q.life > q.max) particles.splice(i, 1);
    }
    for (let i = floats.length - 1; i >= 0; i -= 1) {
      const f = floats[i];
      if (f.delay > 0) { f.delay -= 1; continue; }
      f.life += 1;
      if (f.life > f.max) floats.splice(i, 1);
    }

    if (hintTimer > 0) { hintTimer -= 1; if (hintTimer === 0) $('#hint').hidden = true; }

    // 날짜가 바뀌면 새 하루
    if (tick % 120 === 0 && todayKey() !== lastDay) {
      lastDay = todayKey();
      stats = computeStats();
      rebuildItems();
      syncHud();
      showHint('새로운 하루가 시작됐어요! 퀘스트가 초기화됐습니다');
    }

    render(t);
    requestAnimationFrame(step);
  }

  /* ========== HUD ========== */
  function syncHud() {
    const key = activeKey;
    const c = stats.chars[key];
    const day = todayKey();
    const rate = dayRate(day, key);
    const hp = Math.round(30 + 70 * rate);

    $('#hudPortrait').className = `hud-portrait portrait-${key}`;
    $('#hudName').textContent = CHARS[key].name;
    $('#hudTitle').textContent = titleFor(key, c.level);
    $('#hudLevel').textContent = c.level;
    $('#hudHp').style.width = `${hp}%`;
    $('#hudHpText').textContent = `HP ${hp}/100`;
    const expPct = Math.round((c.exp / c.need) * 100);
    $('#hudExp').style.width = `${expPct}%`;
    $('#hudExpText').textContent = `EXP ${fmtNum(c.exp)}/${fmtNum(c.need)} (${expPct}%)`;
    $('#hudMeso').textContent = fmtNum(c.meso);
    $('#hudStreak').textContent = c.streak;
    $('#hudPartner').textContent = CHARS[key === 'bok' ? 'jja' : 'bok'].name;
    $('#hudActive').dataset.char = key;

    const left = daysBetween(day, state.weddingDate);
    $('#hudDday').textContent = left > 0 ? `D-${left}` : left === 0 ? 'D-DAY' : `D+${Math.abs(left)}`;
    const t = parseKey(day);
    $('#hudDate').textContent = `${t.getFullYear()}.${pad(t.getMonth() + 1)}.${pad(t.getDate())} (${WEEKDAYS[t.getDay()]})`;

    const done = state.missions.filter(m => countOf(day, m.id) >= m.target).length;
    const total = dayRate(day, null);
    $('#hudDaily').style.width = `${Math.round(total * 100)}%`;
    $('#hudDailyText').textContent = `오늘 ${done}/${state.missions.length}`;
  }

  /* ========== 타이틀 / 컷신 ========== */
  const titleEl = () => $('#titleScreen');
  const cutEl = () => $('#cutscene');
  const introOpen = () => !titleEl().hidden || !cutEl().hidden;

  function startGame() {
    if (titleEl().hidden) return;
    titleEl().hidden = true;
    sfx('levelup');
    showHint(`🌤 ${MAP_NAME} · ← → 이동 · Space 점프 · Z 대화 · Tab 전환`);
  }

  function showCutscene(text) {
    $('#cutText').textContent = text;
    cutEl().hidden = false;
    hearts(player().x + 8, player().y);
    sfx('levelup');
  }

  $('#startBtn').addEventListener('click', startGame);
  $('#cutCloseBtn').addEventListener('click', () => { cutEl().hidden = true; });
  titleEl().addEventListener('click', startGame);

  /* ========== 창 ========== */
  const WINDOWS = ['questWindow', 'missionModal', 'helpModal'];
  const anyWindowOpen = () => WINDOWS.some(id => !$(`#${id}`).hidden);

  function openWindow(id) {
    closeAllWindows();
    $(`#${id}`).hidden = false;
    if (id === 'questWindow') { renderQuestPane(); renderCalendar(); renderAchievements(); renderEtc(); }
    keys.left = keys.right = keys.jump = keys.down = false;
  }

  function closeAllWindows() {
    WINDOWS.forEach(id => { $(`#${id}`).hidden = true; });
    $('#dialogue').hidden = true;
    dialogueQueue = [];
  }

  $$('[data-close]').forEach(b => b.addEventListener('click', () => { $(`#${b.dataset.close}`).hidden = true; }));
  $$('.modal-backdrop').forEach(bd => bd.addEventListener('click', e => { if (e.target === bd) bd.hidden = true; }));
  $$('.quickbar button').forEach(b => b.addEventListener('click', () => {
    const a = b.dataset.act;
    if (a === 'quest') openWindow('questWindow');
    else if (a === 'swap') swapChar();
    else if (a === 'costume') cycleCostume();
    else if (a === 'help') openWindow('helpModal');
  }));
  $$('.wtab').forEach(tab => tab.addEventListener('click', () => {
    $$('.wtab').forEach(t => t.classList.toggle('is-active', t === tab));
    $$('.wpane').forEach(p => { p.hidden = p.dataset.pane !== tab.dataset.wtab; });
  }));

  function renderQuestPane() {
    const day = todayKey();
    const list = $('#questList');
    list.innerHTML = '';
    if (!state.missions.length) {
      list.innerHTML = '<li class="quest-empty">퀘스트가 없어요. [＋ 미션 추가]로 만들어 보세요!</li>';
    }
    state.missions.forEach(m => {
      const count = countOf(day, m.id);
      const done = count >= m.target;
      const pct = Math.round((count / m.target) * 100);
      const li = document.createElement('li');
      li.className = `quest${done ? ' is-done' : ''}`;
      li.innerHTML = `
        <span class="q-icon">${done ? '✅' : escapeHtml(m.icon || '⭐')}</span>
        <span class="q-main">
          <span class="q-name"><i class="owner ${m.owner}">${OWNER_LABEL[m.owner]}</i> ${escapeHtml(m.name)}</span>
          <span class="q-reward">${fmtNum(m.exp)} EXP · ${fmtNum(m.meso)} 메소${done ? ' · 완료보너스 +50%' : ''}</span>
          <span class="q-bar"><i style="width:${pct}%"></i></span>
        </span>
        <span class="q-count"><b>${count}</b>/${m.target}<br>${escapeHtml(m.unit || '')}</span>
        <button type="button" class="q-del" data-del="${m.id}" aria-label="삭제">🗑</button>`;
      list.append(li);
    });
    const rate = dayRate(day, null);
    const done = state.missions.filter(m => countOf(day, m.id) >= m.target).length;
    $('#paneDaily').style.width = `${Math.round(rate * 100)}%`;
    $('#paneDailyText').textContent = `오늘 ${done}/${state.missions.length} 완료 · ${Math.round(rate * 100)}%`;
  }

  $('#questList').addEventListener('click', e => {
    const del = e.target.closest('[data-del]');
    if (!del) return;
    const m = missionById(del.dataset.del);
    if (!m || !window.confirm(`'${m.name}' 퀘스트를 삭제할까요?\n(지난 기록에서도 사라져요)`)) return;
    state.missions = state.missions.filter(x => x.id !== m.id);
    Object.keys(state.progress).forEach(d => { delete state.progress[d][m.id]; });
    save();
    stats = computeStats();
    rebuildItems();
    renderQuestPane();
    renderAchievements();
    syncHud();
  });

  function renderCalendar() {
    const cal = $('#calendar');
    const day = todayKey();
    const end = parseKey(state.weddingDate);
    const start = new Date(end);
    start.setDate(start.getDate() - (CONFIG.countdownDays - 1));
    cal.innerHTML = '';
    const cur = new Date(start);
    for (let i = 0; i < CONFIG.countdownDays; i += 1) {
      const key = dateKey(cur);
      const rate = dayRate(key, null);
      const isToday = key === day;
      const isWed = key === state.weddingDate;
      const future = daysBetween(day, key) > 0;
      const cls = ['cal-cell'];
      if (isWed) cls.push('is-wed');
      else if (rate >= 1) cls.push('is-full');
      else if (rate > 0) cls.push('is-part');
      if (isToday) cls.push('is-today');
      if (future && !isWed) cls.push('is-future');
      const left = daysBetween(key, state.weddingDate);
      const mark = isWed ? '💒' : rate >= 1 ? '⭐' : rate > 0 ? '🌤' : isToday ? '🎯' : future ? '·' : '💤';
      const cell = document.createElement('div');
      cell.className = cls.join(' ');
      cell.innerHTML = `<b>${left === 0 ? 'D-DAY' : `D-${left}`}</b><span>${cur.getMonth() + 1}/${cur.getDate()}</span><i>${mark}</i>`;
      cal.append(cell);
      cur.setDate(cur.getDate() + 1);
    }
    $('#calRange').textContent = `${start.getMonth() + 1}/${start.getDate()} ~ ${end.getMonth() + 1}/${end.getDate()} · 결혼식까지 달려요!`;
  }

  function renderAchievements() {
    const list = $('#achievementList');
    list.innerHTML = '';
    ACHIEVEMENTS.forEach(a => {
      const on = !!a.test(stats);
      const li = document.createElement('li');
      li.className = `achievement${on ? ' is-on' : ''}`;
      li.innerHTML = `<span class="a-icon">${a.icon}</span>
        <span class="a-main"><b>${escapeHtml(a.name)}</b><i>${escapeHtml(a.desc)}</i></span>
        <span class="a-state">${on ? '획득!' : '🔒'}</span>`;
      list.append(li);
    });
    $('#totalMeso').textContent = `${fmtNum(stats.totalMeso)} 메소`;
  }

  function renderEtc() {
    $('#weddingDateText').textContent = state.weddingDate;
    $('#soundBtn').textContent = state.sound ? '켜짐' : '꺼짐';
  }

  /* 설정 버튼들 */
  $('#addMissionBtn').addEventListener('click', () => { $('#questWindow').hidden = true; $('#missionModal').hidden = false; });
  $('#resetTodayBtn').addEventListener('click', () => {
    if (!window.confirm('오늘 기록을 모두 지울까요?')) return;
    delete state.progress[todayKey()];
    save();
    stats = computeStats();
    rebuildItems();
    renderQuestPane();
    syncHud();
  });
  $('#editDateBtn').addEventListener('click', () => {
    const v = window.prompt('결혼식 날짜 (YYYY-MM-DD)', state.weddingDate);
    if (!v || !/^\d{4}-\d{2}-\d{2}$/.test(v.trim())) return;
    state.weddingDate = v.trim();
    save();
    renderEtc();
    renderCalendar();
    syncHud();
  });
  $('#soundBtn').addEventListener('click', () => { state.sound = !state.sound; save(); renderEtc(); sfx('pick'); });
  $('#resetAllBtn').addEventListener('click', () => {
    if (!window.confirm('모든 기록과 퀘스트를 초기화할까요?')) return;
    state = freshState();
    save();
    stats = computeStats();
    rebuildItems();
    renderQuestPane(); renderCalendar(); renderAchievements(); renderEtc(); syncHud();
  });
  $('#exportBtn').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `wedding-rpg-${todayKey()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  });
  $('#importBtn').addEventListener('click', () => $('#importFile').click());
  $('#importFile').addEventListener('change', e => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const data = JSON.parse(r.result);
        if (!data || !Array.isArray(data.missions)) throw new Error('bad');
        state = { ...freshState(), ...data };
        save();
        stats = computeStats();
        rebuildItems();
        renderQuestPane(); renderCalendar(); renderAchievements(); renderEtc(); syncHud();
        window.alert('기록을 불러왔어요!');
      } catch (err) {
        window.alert('백업 파일을 읽지 못했어요.');
      }
    };
    r.readAsText(file);
    e.target.value = '';
  });

  $('#missionForm').addEventListener('submit', e => {
    e.preventDefault();
    const f = e.currentTarget.elements;
    const name = f.name.value.trim();
    if (!name) return;
    const icons = { egg: '🥚', water: '💧', heart: '💗', star: '⭐' };
    const item = f.item.value;
    state.missions.push({
      id: `m-${Date.now().toString(36)}`,
      icon: icons[item] || '⭐',
      item,
      name,
      owner: f.owner.value,
      target: clamp(Number(f.target.value) || 1, 1, 20),
      unit: (f.unit.value || '회').trim(),
      exp: clamp(Number(f.exp.value) || 10, 1, 999),
      meso: clamp(Number(f.meso.value) || 0, 0, 99999),
    });
    save();
    stats = computeStats();
    rebuildItems();
    e.currentTarget.reset();
    $('#missionModal').hidden = true;
    openWindow('questWindow');
    showHint(`새 퀘스트 '${name}' 등록! 맵에 아이템이 나타났어요`);
    syncHud();
  });

  /* ========== 시작 ========== */
  resize();
  rebuildItems();
  syncHud();
  actors.bok.x = 330;
  actors.jja.x = 296;
  cam.x = clamp(player().x - VIEW_W / 2, 0, WORLD.w - VIEW_W);
  cam.y = clamp(player().y - VIEW_H * 0.5, 0, Math.max(0, WORLD.h - VIEW_H));
  (function initTitle() {
    const left = daysBetween(todayKey(), state.weddingDate);
    $('#titleDday').textContent = left > 0 ? `D-${left}` : left === 0 ? 'D-DAY' : `D+${Math.abs(left)}`;
  })();
  requestAnimationFrame(step);

  window.GAME = { state, stats: () => stats, items: () => items, actors, openWindow, rebuild: rebuildItems, refresh: () => { stats = computeStats(); syncHud(); } };
})();
