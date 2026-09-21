/* =========================================================
   복짱구 ♡ 조짱아 결혼준비 대작전 — 게임 로직
   ---------------------------------------------------------
   미션을 더 넣고 싶으면?
   1) 화면의 [＋ 미션 추가] 버튼으로 바로 등록 (권장)
   2) 또는 아래 DEFAULT_MISSIONS 배열에 한 줄 추가
      { id:'고유값', icon:'🍳', name:'미션 이름', owner:'jja'|'bok'|'both',
        target: 목표횟수, unit:'단위', exp: 경험치, meso: 메소 }
   ========================================================= */

const CONFIG = {
  weddingDate: '2026-10-05',   // 결혼식 날짜 (화면에서도 변경 가능)
  storageKey: 'bokjjang-jojjanga-wedding-v1',
  countdownDays: 15,           // 출석부 칸 수 (D-14 ~ D-DAY = 15칸)
};

const CHARS = {
  bok: { name: '복짱구', role: '신랑' },
  jja: { name: '조짱아', role: '신부' },
};

const OWNER_LABEL = { jja: '조짱아', bok: '복짱구', both: '함께' };

const DEFAULT_MISSIONS = [
  // ── 조짱아 다이어트 미션 ──────────────────────────────
  { id: 'jja-egg',   icon: '🥚', name: '계란 4개 먹기',  owner: 'jja', target: 4, unit: '개',        exp: 40, meso: 800 },
  { id: 'jja-water', icon: '💧', name: '물 2L 마시기',   owner: 'jja', target: 8, unit: '컵(250ml)', exp: 40, meso: 800 },

  // ── 복짱구 미션 (예시 — 필요 없으면 🗑 로 삭제) ──────
  { id: 'bok-walk',  icon: '👟', name: '만보 걷기',            owner: 'bok', target: 1, unit: '회', exp: 30, meso: 500 },
  { id: 'bok-cheer', icon: '💌', name: '조짱아 칭찬 한마디',   owner: 'bok', target: 1, unit: '번', exp: 20, meso: 300 },

  // ── 함께 하는 미션 (예시) ────────────────────────────
  { id: 'both-check', icon: '📋', name: '결혼준비 체크리스트 1개 처리', owner: 'both', target: 1, unit: '개', exp: 50, meso: 1000 },
];

const TITLES = [
  { lv: 1,  bok: '예비신랑',       jja: '예비신부' },
  { lv: 3,  bok: '식단 감시자',    jja: '계란 수집가' },
  { lv: 5,  bok: '웨딩 준비생',    jja: '물 2L 마스터' },
  { lv: 8,  bok: '만보의 사나이',  jja: '드레스 핏 장인' },
  { lv: 12, bok: '오르비스 신랑',  jja: '오르비스 신부' },
  { lv: 16, bok: '전설의 남편',    jja: '전설의 아내' },
];

const ACHIEVEMENTS = [
  { id: 'first',   icon: '🌱', name: '첫 발걸음',       desc: '미션 1개 클리어',              test: s => s.totalCleared >= 1 },
  { id: 'egg30',   icon: '🥚', name: '계란 사냥꾼',     desc: '계란 누적 30개',               test: s => (s.missionTotals['jja-egg'] || 0) >= 30 },
  { id: 'water50', icon: '🌊', name: '수분 충전 완료',  desc: '물 누적 50컵',                 test: s => (s.missionTotals['jja-water'] || 0) >= 50 },
  { id: 'streak3', icon: '🔥', name: '작심삼일 격파',   desc: '3일 연속 올클리어',            test: s => s.bestStreak >= 3 },
  { id: 'streak7', icon: '⚡', name: '일주일 완주',     desc: '7일 연속 올클리어',            test: s => s.bestStreak >= 7 },
  { id: 'meso10',  icon: '💰', name: '혼수 자금 마련',  desc: '파티 누적 10만 메소',          test: s => s.totalMeso >= 100000 },
  { id: 'lv10',    icon: '👑', name: '둘 다 Lv.10',     desc: '두 사람 모두 레벨 10 달성',    test: s => s.chars.bok.level >= 10 && s.chars.jja.level >= 10 },
  { id: 'perfect', icon: '💒', name: '완벽한 하루',     desc: '하루 전체 미션 올클리어',      test: s => s.perfectDays >= 1 },
];

/* =========================================================
   유틸
   ========================================================= */
const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const pad = n => String(n).padStart(2, '0');
const dateKey = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const todayKey = () => dateKey(new Date());
const parseKey = key => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
};
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
const daysBetween = (a, b) => Math.round((parseKey(b) - parseKey(a)) / 86400000);
const fmtNum = n => Number(n).toLocaleString('ko-KR');

/* 레벨 곡선: Lv.n → Lv.n+1 에 필요한 EXP */
const expNeed = level => 50 + (level - 1) * 30;

function levelFromExp(totalExp) {
  let level = 1;
  let rest = Math.max(0, Math.floor(totalExp));
  while (rest >= expNeed(level) && level < 200) {
    rest -= expNeed(level);
    level += 1;
  }
  return { level, exp: rest, need: expNeed(level) };
}

function titleFor(charKey, level) {
  let title = TITLES[0][charKey];
  for (const t of TITLES) if (level >= t.lv) title = t[charKey];
  return title;
}

/* =========================================================
   상태 저장 / 불러오기
   ========================================================= */
let state = loadState();
let activeTab = 'jja';
let lastRenderedDay = todayKey();

function freshState() {
  return {
    version: 1,
    weddingDate: CONFIG.weddingDate,
    missions: DEFAULT_MISSIONS.map(m => ({ ...m })),
    progress: {},            // { '2026-09-21': { 'jja-egg': 4, ... } }
    createdAt: todayKey(),
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(CONFIG.storageKey);
    if (!raw) return freshState();
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return freshState();
    return {
      ...freshState(),
      ...parsed,
      missions: Array.isArray(parsed.missions) && parsed.missions.length
        ? parsed.missions
        : DEFAULT_MISSIONS.map(m => ({ ...m })),
      progress: parsed.progress && typeof parsed.progress === 'object' ? parsed.progress : {},
    };
  } catch (err) {
    console.warn('저장된 기록을 읽지 못했어요. 새로 시작합니다.', err);
    return freshState();
  }
}

function saveState() {
  try {
    localStorage.setItem(CONFIG.storageKey, JSON.stringify(state));
  } catch (err) {
    console.warn('저장 실패', err);
  }
}

/* =========================================================
   집계
   ========================================================= */
function missionById(id) {
  return state.missions.find(m => m.id === id);
}

function missionsFor(charKey) {
  return state.missions.filter(m => m.owner === charKey || m.owner === 'both');
}

function countOf(dayKey, missionId) {
  return (state.progress[dayKey] && state.progress[dayKey][missionId]) || 0;
}

/** 하루 달성률: 0~1 (해당 캐릭터 / 전체) */
function dayRate(dayKey, charKey) {
  const list = charKey ? missionsFor(charKey) : state.missions;
  if (!list.length) return 0;
  let sum = 0;
  for (const m of list) sum += Math.min(1, countOf(dayKey, m.id) / m.target);
  return sum / list.length;
}

/** 전체 통계를 진행 기록으로부터 매번 다시 계산 (항상 정합) */
function computeStats() {
  const stats = {
    chars: {
      bok: { totalExp: 0, meso: 0, level: 1, exp: 0, need: 50, streak: 0 },
      jja: { totalExp: 0, meso: 0, level: 1, exp: 0, need: 50, streak: 0 },
    },
    missionTotals: {},
    totalCleared: 0,
    totalMeso: 0,
    perfectDays: 0,
    bestStreak: 0,
  };

  const days = Object.keys(state.progress).sort();

  for (const day of days) {
    for (const [mid, rawCount] of Object.entries(state.progress[day] || {})) {
      const m = missionById(mid);
      if (!m) continue;                       // 삭제된 미션은 무시
      const count = Math.max(0, Math.min(m.target, Number(rawCount) || 0));
      if (!count) continue;

      stats.missionTotals[mid] = (stats.missionTotals[mid] || 0) + count;

      const ratio = count / m.target;
      const done = count >= m.target;
      const gainedExp = m.exp * ratio + (done ? m.exp * 0.5 : 0);   // 완료 시 50% 보너스
      const gainedMeso = m.meso * ratio + (done ? m.meso * 0.5 : 0);
      if (done) stats.totalCleared += 1;

      const owners = m.owner === 'both' ? ['bok', 'jja'] : [m.owner];
      for (const o of owners) {
        if (!stats.chars[o]) continue;
        stats.chars[o].totalExp += gainedExp;
        stats.chars[o].meso += gainedMeso;
      }
    }

    if (state.missions.length && dayRate(day, null) >= 1) stats.perfectDays += 1;
  }

  for (const key of ['bok', 'jja']) {
    const c = stats.chars[key];
    c.totalExp = Math.round(c.totalExp);
    c.meso = Math.round(c.meso);
    Object.assign(c, levelFromExp(c.totalExp));
    c.streak = streakOf(key);
    stats.totalMeso += c.meso;
  }

  stats.bestStreak = bestStreakAll();
  return stats;
}

/** 오늘(또는 어제)부터 거슬러 올라가며 연속 올클리어 일수 */
function streakOf(charKey) {
  if (!missionsFor(charKey).length) return 0;
  const cursor = new Date();
  if (dayRate(dateKey(cursor), charKey) < 1) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  for (let i = 0; i < 400; i += 1) {
    if (dayRate(dateKey(cursor), charKey) < 1) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

/** 기록 전체에서 가장 길었던 전체 올클리어 연속 기록 */
function bestStreakAll() {
  const days = Object.keys(state.progress).filter(d => dayRate(d, null) >= 1).sort();
  let best = 0;
  let run = 0;
  let prev = null;
  for (const d of days) {
    run = prev && daysBetween(prev, d) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  }
  return best;
}

/* =========================================================
   진행도 변경
   ========================================================= */
function setCount(missionId, next, sourceEl) {
  const m = missionById(missionId);
  if (!m) return;

  const day = todayKey();
  const before = computeStats();
  const prev = countOf(day, missionId);
  const value = Math.max(0, Math.min(m.target, next));
  if (value === prev) return;

  state.progress[day] = state.progress[day] || {};
  if (value === 0) delete state.progress[day][missionId];
  else state.progress[day][missionId] = value;
  if (!Object.keys(state.progress[day]).length) delete state.progress[day];

  saveState();
  const after = computeStats();

  if (value > prev) {
    const owners = m.owner === 'both' ? ['bok', 'jja'] : [m.owner];
    const gainedExp = owners.reduce((max, o) => Math.max(max, after.chars[o].totalExp - before.chars[o].totalExp), 0);
    const gainedMeso = owners.reduce((max, o) => Math.max(max, after.chars[o].meso - before.chars[o].meso), 0);
    if (gainedExp) popFx(`+${fmtNum(gainedExp)} EXP`, 'exp', sourceEl);
    if (gainedMeso) popFx(`+${fmtNum(gainedMeso)} 메소`, 'meso', sourceEl, 220);
    blip(value >= m.target ? 'clear' : 'tick');
  }

  render();

  for (const key of ['bok', 'jja']) {
    if (after.chars[key].level > before.chars[key].level) {
      showLevelUp(`${CHARS[key].name} LEVEL UP!`);
      break;
    }
  }
}

/* =========================================================
   렌더링
   ========================================================= */
function render() {
  const stats = computeStats();
  renderHeader();
  renderChars(stats);
  renderQuests(stats);
  renderCalendar();
  renderAchievements(stats);
  lastRenderedDay = todayKey();
}

function renderHeader() {
  const today = todayKey();
  const left = daysBetween(today, state.weddingDate);
  const ddayEl = $('#ddayValue');
  ddayEl.textContent = left > 0 ? `D-${left}` : left === 0 ? 'D-DAY' : `D+${Math.abs(left)}`;

  const w = parseKey(state.weddingDate);
  $('#weddingDateText').textContent = `${w.getFullYear()}년 ${w.getMonth() + 1}월 ${w.getDate()}일 (${WEEKDAYS[w.getDay()]})`;

  const t = parseKey(today);
  $('#todayText').textContent = `${t.getFullYear()}.${pad(t.getMonth() + 1)}.${pad(t.getDate())} (${WEEKDAYS[t.getDay()]})`;
}

function renderChars(stats) {
  const today = todayKey();
  for (const key of ['bok', 'jja']) {
    const c = stats.chars[key];
    const rate = dayRate(today, key);
    const hp = Math.round(30 + 70 * rate);

    setBind(`${key}-level`, c.level);
    setBind(`${key}-title`, titleFor(key, c.level));
    setBind(`${key}-meso`, fmtNum(c.meso));
    setBind(`${key}-streak`, c.streak);

    const expPct = Math.min(100, Math.round((c.exp / c.need) * 100));
    setWidth(`${key}-expbar`, expPct);
    setBind(`${key}-exptext`, `EXP ${fmtNum(c.exp)}/${fmtNum(c.need)} (${expPct}%)`);

    setWidth(`${key}-hpbar`, hp);
    setBind(`${key}-hptext`, `HP ${hp}/100`);
  }
}

function setBind(name, value) {
  const el = $(`[data-bind="${name}"]`);
  if (el) el.textContent = value;
}

function setWidth(name, pct) {
  const el = $(`[data-bind="${name}"]`);
  if (el) el.style.width = `${Math.max(0, Math.min(100, pct))}%`;
}

function renderQuests(stats) {
  const list = $('#questList');
  const today = todayKey();
  const filtered = state.missions.filter(m => {
    if (activeTab === 'all') return true;
    if (activeTab === 'both') return m.owner === 'both';
    return m.owner === activeTab || m.owner === 'both';
  });

  list.innerHTML = '';

  if (!filtered.length) {
    const li = document.createElement('li');
    li.className = 'quest-empty';
    li.textContent = '등록된 미션이 없어요. [＋ 미션 추가]로 새 퀘스트를 만들어 보세요!';
    list.append(li);
  }

  for (const m of filtered) {
    const count = countOf(today, m.id);
    const done = count >= m.target;
    const pct = Math.min(100, Math.round((count / m.target) * 100));

    const li = document.createElement('li');
    li.className = `quest${done ? ' is-done' : ''}`;
    li.innerHTML = `
      <div class="quest-icon">${done ? '✅' : escapeHtml(m.icon || '⭐')}</div>
      <div class="quest-main">
        <p class="quest-name">
          <span class="owner-chip ${m.owner}">${OWNER_LABEL[m.owner]}</span>
          ${escapeHtml(m.name)}
          <button type="button" class="quest-del" data-del="${m.id}" title="미션 삭제" aria-label="${escapeHtml(m.name)} 삭제">🗑</button>
        </p>
        <p class="quest-reward">보상 ${fmtNum(m.exp)} EXP · ${fmtNum(m.meso)} 메소${done ? ' <strong>(완료 보너스 +50%)</strong>' : ''}</p>
        <div class="quest-progress"><span style="width:${pct}%"></span></div>
      </div>
      <div class="quest-controls">
        <button type="button" class="count-btn minus" data-minus="${m.id}" aria-label="${escapeHtml(m.name)} 1 줄이기">−</button>
        <span class="count-value"><strong>${count}</strong>/${m.target}<br>${escapeHtml(m.unit || '')}</span>
        <button type="button" class="count-btn plus" data-plus="${m.id}" aria-label="${escapeHtml(m.name)} 1 늘리기">＋</button>
      </div>
    `;
    list.append(li);
  }

  const totalRate = dayRate(today, null);
  const doneCount = state.missions.filter(m => countOf(today, m.id) >= m.target).length;
  $('#dailyBar').style.width = `${Math.round(totalRate * 100)}%`;
  $('#dailyText').textContent = state.missions.length
    ? `오늘 ${doneCount}/${state.missions.length} 완료 · 달성률 ${Math.round(totalRate * 100)}%`
    : '미션을 추가해 주세요';

  $('#totalMeso').textContent = `${fmtNum(stats.totalMeso)} 메소`;
}

function renderCalendar() {
  const cal = $('#calendar');
  const today = todayKey();
  const end = parseKey(state.weddingDate);
  const start = new Date(end);
  start.setDate(start.getDate() - (CONFIG.countdownDays - 1));

  cal.innerHTML = '';
  const cursor = new Date(start);
  for (let i = 0; i < CONFIG.countdownDays; i += 1) {
    const key = dateKey(cursor);
    const rate = dayRate(key, null);
    const isToday = key === today;
    const isFuture = daysBetween(today, key) > 0;
    const isWedding = key === state.weddingDate;
    const dleft = daysBetween(key, state.weddingDate);

    const cls = ['cal-cell'];
    if (isWedding) cls.push('is-wedding');
    else if (rate >= 1) cls.push('is-full');
    else if (rate > 0) cls.push('is-part');
    if (isToday) cls.push('is-today');
    if (isFuture && !isWedding) cls.push('is-future');

    const mark = isWedding ? '💒' : rate >= 1 ? '⭐' : rate > 0 ? '🌤' : isToday ? '🎯' : isFuture ? '·' : '💤';

    const cell = document.createElement('div');
    cell.className = cls.join(' ');
    cell.innerHTML = `
      <span class="cal-dday">${dleft === 0 ? 'D-DAY' : `D-${dleft}`}</span>
      <span class="cal-date">${cursor.getMonth() + 1}/${cursor.getDate()}</span>
      <span class="cal-mark">${mark}</span>
    `;
    cell.title = isWedding ? '결혼식 🎉' : `${key} · 달성률 ${Math.round(rate * 100)}%`;
    cal.append(cell);
    cursor.setDate(cursor.getDate() + 1);
  }

  $('#calRange').textContent = `${start.getMonth() + 1}/${start.getDate()} ~ ${end.getMonth() + 1}/${end.getDate()}`;
}

function renderAchievements(stats) {
  const list = $('#achievementList');
  list.innerHTML = '';
  for (const a of ACHIEVEMENTS) {
    const unlocked = !!a.test(stats);
    const li = document.createElement('li');
    li.className = `achievement${unlocked ? ' is-unlocked' : ''}`;
    li.innerHTML = `
      <span class="ach-icon">${a.icon}</span>
      <span class="ach-name">${escapeHtml(a.name)}<span class="ach-desc">${escapeHtml(a.desc)}</span></span>
      <span class="ach-state">${unlocked ? '획득!' : '🔒'}</span>
    `;
    list.append(li);
  }
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, ch => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]
  ));
}

/* =========================================================
   연출 (데미지 스킨 / 레벨업 / 사운드)
   ========================================================= */
function popFx(text, kind, sourceEl, delay = 0) {
  const layer = $('#fxLayer');
  const rect = sourceEl && sourceEl.getBoundingClientRect
    ? sourceEl.getBoundingClientRect()
    : { left: window.innerWidth / 2, top: window.innerHeight / 2, width: 0, height: 0 };

  window.setTimeout(() => {
    const el = document.createElement('span');
    el.className = `fx-text ${kind}`;
    el.textContent = text;
    el.style.left = `${rect.left + rect.width / 2}px`;
    el.style.top = `${rect.top}px`;
    layer.append(el);
    window.setTimeout(() => el.remove(), 1200);
  }, delay);
}

function showLevelUp(text) {
  const el = $('#levelup');
  el.querySelector('span').textContent = text;
  el.hidden = false;
  blip('levelup');
  window.clearTimeout(showLevelUp._t);
  showLevelUp._t = window.setTimeout(() => { el.hidden = true; }, 1700);
}

let audioCtx = null;
function blip(kind) {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const notes = kind === 'levelup' ? [523, 659, 784, 1047] : kind === 'clear' ? [659, 880] : [880];
    notes.forEach((freq, i) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'square';
      osc.frequency.value = freq;
      gain.gain.value = 0.04;
      osc.connect(gain).connect(audioCtx.destination);
      const t = audioCtx.currentTime + i * 0.09;
      osc.start(t);
      gain.gain.setValueAtTime(0.04, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      osc.stop(t + 0.13);
    });
  } catch (err) { /* 소리는 없어도 게임은 계속된다 */ }
}

/* =========================================================
   이벤트 연결
   ========================================================= */
function bindEvents() {
  // 탭
  $$('.tab').forEach(tab => tab.addEventListener('click', () => {
    activeTab = tab.dataset.tab;
    $$('.tab').forEach(t => t.classList.toggle('is-active', t === tab));
    render();
  }));

  // 퀘스트 +/- / 삭제 (이벤트 위임)
  $('#questList').addEventListener('click', e => {
    const plus = e.target.closest('[data-plus]');
    const minus = e.target.closest('[data-minus]');
    const del = e.target.closest('[data-del]');
    const day = todayKey();

    if (plus) setCount(plus.dataset.plus, countOf(day, plus.dataset.plus) + 1, plus);
    else if (minus) setCount(minus.dataset.minus, countOf(day, minus.dataset.minus) - 1, minus);
    else if (del) {
      const m = missionById(del.dataset.del);
      if (m && window.confirm(`'${m.name}' 미션을 삭제할까요?\n(지난 기록에서도 사라져요)`)) {
        state.missions = state.missions.filter(x => x.id !== m.id);
        for (const d of Object.keys(state.progress)) delete state.progress[d][m.id];
        saveState();
        render();
      }
    }
  });

  // 미션 추가 모달
  const modal = $('#missionModal');
  const openModal = () => { modal.hidden = false; $('#missionForm').elements.name.focus(); };
  const closeModal = () => { modal.hidden = true; $('#missionForm').reset(); };

  $('#addMissionBtn').addEventListener('click', openModal);
  $('#modalCloseBtn').addEventListener('click', closeModal);
  $('#modalCancelBtn').addEventListener('click', closeModal);
  modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !modal.hidden) closeModal(); });

  $('#missionForm').addEventListener('submit', e => {
    e.preventDefault();
    const f = e.currentTarget.elements;
    const mission = {
      id: `m-${Date.now().toString(36)}`,
      icon: (f.icon.value || '⭐').trim(),
      name: f.name.value.trim(),
      owner: f.owner.value,
      target: Math.max(1, Number(f.target.value) || 1),
      unit: (f.unit.value || '회').trim(),
      exp: Math.max(1, Number(f.exp.value) || 10),
      meso: Math.max(0, Number(f.meso.value) || 0),
    };
    if (!mission.name) return;
    state.missions.push(mission);
    saveState();
    activeTab = mission.owner === 'both' ? 'both' : mission.owner;
    $$('.tab').forEach(t => t.classList.toggle('is-active', t.dataset.tab === activeTab));
    closeModal();
    render();
    popFx('새 퀘스트 등록!', 'exp', $('#addMissionBtn'));
  });

  // 결혼식 날짜 변경
  $('#editDateBtn').addEventListener('click', () => {
    const input = window.prompt('결혼식 날짜를 입력해 주세요 (YYYY-MM-DD)', state.weddingDate);
    if (!input) return;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.trim()) || Number.isNaN(parseKey(input.trim()).getTime())) {
      window.alert('날짜 형식이 올바르지 않아요. 예) 2026-10-05');
      return;
    }
    state.weddingDate = input.trim();
    saveState();
    render();
  });

  // 오늘 기록 초기화
  $('#resetTodayBtn').addEventListener('click', () => {
    if (!window.confirm('오늘 기록을 모두 지울까요?')) return;
    delete state.progress[todayKey()];
    saveState();
    render();
  });

  // 전체 초기화
  $('#resetAllBtn').addEventListener('click', () => {
    if (!window.confirm('정말 전부 초기화할까요? 모든 기록과 미션이 사라져요.')) return;
    state = freshState();
    saveState();
    render();
  });

  // 백업 내보내기 / 불러오기
  $('#exportBtn').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `wedding-quest-${todayKey()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  });

  $('#importBtn').addEventListener('click', () => $('#importFile').click());
  $('#importFile').addEventListener('change', e => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (!data || !Array.isArray(data.missions)) throw new Error('형식 오류');
        state = { ...freshState(), ...data };
        saveState();
        render();
        window.alert('기록을 불러왔어요!');
      } catch (err) {
        window.alert('백업 파일을 읽지 못했어요.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  });

  // 자정이 지나면 자동으로 새 날짜 적용
  window.setInterval(() => { if (todayKey() !== lastRenderedDay) render(); }, 30000);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && todayKey() !== lastRenderedDay) render();
  });
}

/* =========================================================
   시작
   ========================================================= */
bindEvents();
render();

console.log('%c💍 복짱구 ♡ 조짱아 결혼준비 대작전 — 오르비스에서 시작!', 'color:#e0648f;font-weight:bold');
