/* ═══════════ 공용 학습 펫 (다마고치) ═══════════
 * 학습 보상으로 받은 간식·식사를 먹여 펫을 키우고, 매일 들러 돌보는 공용 모듈.
 * - 알 → 아기 → 어린이 → 어른으로 자라고, 다 크면 📖 도감에 등록 + 새 알 도착 (16종 수집)
 * - 부화하면 기본 이름이 저절로 붙고(예: 돌고래 → 퐁퐁이), 언제든 ✏️ 로 바꾼다
 * - 먹이를 8번 줄 때마다 🎁 꾸미기 선물(모자·리본 등 12종)을 받아 입혀 준다
 * - 🏠 펫 방: 펫은 아늑한 방(벽지·바닥·창문·러그) 안에 살고,
 *   도감에 등록한 친구들이 미니 펫으로 방 곳곳에 놀러 나온다
 * - 🛋️ 방 꾸미기: 장식 14종을 먹이 4번째·12번째·20번째…(8번마다, 꾸미기 선물과 어긋나게)
 *   선물로 받고, 방의 자리(벽 3·창가 1·바닥 4)를 탭해 배치·교체·빼기
 * - 🍪 간식 조르기: 방을 열면 가끔 도감 친구가 "간식 줘~" 하고 조른다.
 *   탭하면 간식 1개를 나눠 주고, 친구가 고마움 선물(장식)을 주기도 한다
 *
 * ── 돌보기 (다마고치식) ──────────────────────────────────────────
 * 하루가 지나면 🍚 배고픔·😊 기분 하트가 줄고 💩 응가가 생기며, 오래 거르면 감기에 걸린다.
 * 하지만 이것은 "벌"이 아니라 **한 번 눌러 고치는 할 일**이다 —
 *   · 죽음·무덤 없음. 어떤 경우에도 펫은 죽지 않는다.
 *   · 도감·꾸미기·장식·성장점수는 나쁜 상태 때문에 절대 줄지 않는다.
 *   · 죄책감을 주는 말은 하지 않는다. 오랜만에 오면 "보고 싶었어!".
 *   · 응가는 톡 누르면 치워지고, 감기는 🍵 차 한 잔이면 바로 낫는다.
 * 세기는 부모 설정 ParentSettings.get('petCare') 로 고른다 — soft(응가만) / normal / tama.
 *
 * 저장: localStorage 'enjoy-pet-v1' (Profile.key 적용 — 은아·서하 각자 키움)
 * { g 현재 펫 성장점수, meals, snacks, species 종 id(null=알), name,
 *   fed 지금까지 먹인 총 횟수(선물 기준), collection [{sp,name,at}], acc {head,side}, accOwned [id],
 *   deco {자리id: 장식id} 방 배치, decoOwned [장식id], lastBeg 마지막 조르기 시각,
 *   hunger 0~4, mood 0~4, poop 0~6, sick, lastSeen 마지막으로 방을 연 시각(ms),
 *   streak 연속 도장 일수, stampDay 마지막 도장 날짜 'YYYY-MM-DD', shield 봐주기 장수 0~3 }
 * 예전 형식 { g, meals, snacks } · deco 없는 형식 · 돌보기 필드가 없는 형식은
 * 모두 **건강한 상태**로 채워 이어받는다 (lastSeen = 지금 → 오랜만에 열어도 아프지 않다).
 *
 * 사용법 — 각 앱에서:
 *   <link rel="stylesheet" href="../shared/pet.css">
 *   헤더에 <span id="pet-slot"></span>  (없으면 화면 오른쪽 아래 떠 있는 버튼)
 *   <script src="../shared/pet.js"></script>  (profile.js 뒤)
 * 학습 보상 지점에서:
 *   if (window.Pet) Pet.awardSnack(1);   // 작은 완료 (페이지·카드 등)
 *   if (window.Pet) Pet.awardMeal(1);    // 큰 완료 (챕터·도안 등)
 */
window.Pet = (() => {
  // 아이 프로필별로 각자 펫을 키운다 (은아 = 원래 키, 서하 = p2: 접두어)
  const KEY = window.Profile ? Profile.key('enjoy-pet-v1') : 'enjoy-pet-v1';
  const MEAL_PTS = 3, SNACK_PTS = 1;
  const HATCH = 3, KID = 10, ADULT = 18, DONE = 24; // 성장 문턱 (성장점수)
  const GIFT_EVERY = 8;   // 먹이 8번마다 꾸미기 선물
  const DECO_OFFSET = 4;  // 먹이 4·12·20…번째(꾸미기 선물과 어긋나게)에 장식 선물
  const BEG_CHANCE = 0.4;                     // 방을 열 때 친구가 조를 확률
  const BEG_COOLDOWN = 3 * 60 * 60 * 1000;    // 이만큼 지났으면 확률과 상관없이 조른다
  /* 돌보기 상한 */
  const HUNGER_MAX = 4, MOOD_MAX = 4, POOP_MAX = 6, SHIELD_MAX = 3;
  const POOP_PER_FEED = 3;   // 먹이 3번마다 응가 하나
  const STREAK_SHIELD = 5;   // 도장 5·10·15…일마다 봐주기 한 장

  /* ─────────── 펫 도감 (16종) ─────────── */
  const SPECIES = [
    { id: 'chick',   e: '🐥', name: '병아리', def: '삐약이' },
    { id: 'puppy',   e: '🐶', name: '강아지', def: '멍멍이' },
    { id: 'kitty',   e: '🐱', name: '고양이', def: '나비' },
    { id: 'rabbit',  e: '🐰', name: '토끼',   def: '토실이' },
    { id: 'bear',    e: '🐻', name: '곰',     def: '곰돌이' },
    { id: 'panda',   e: '🐼', name: '판다',   def: '푸푸' },
    { id: 'koala',   e: '🐨', name: '코알라', def: '코코' },
    { id: 'fox',     e: '🦊', name: '여우',   def: '여우비' },
    { id: 'frog',    e: '🐸', name: '개구리', def: '폴짝이' },
    { id: 'turtle',  e: '🐢', name: '거북이', def: '엉금이' },
    { id: 'lion',    e: '🦁', name: '사자',   def: '어흥이' },
    { id: 'tiger',   e: '🐯', name: '호랑이', def: '호야' },
    { id: 'pig',     e: '🐷', name: '돼지',   def: '꿀꿀이' },
    { id: 'hamster', e: '🐹', name: '햄스터', def: '햄햄이' },
    { id: 'dolphin', e: '🐬', name: '돌고래', def: '퐁퐁이' },
    { id: 'unicorn', e: '🦄', name: '유니콘', def: '유니' },
  ];
  const spOf = id => SPECIES.find(s => s.id === id) || null;

  /* ─────────── 꾸미기 (12종: 머리 6 + 곁 6) ─────────── */
  const ACCS = [
    { id: 'crown',  e: '👑', name: '왕관',   slot: 'head' },
    { id: 'hat',    e: '🎩', name: '모자',   slot: 'head' },
    { id: 'cap',    e: '🧢', name: '캡모자', slot: 'head' },
    { id: 'ribbon', e: '🎀', name: '리본',   slot: 'head' },
    { id: 'flower', e: '🌸', name: '꽃',     slot: 'head' },
    { id: 'star',   e: '⭐', name: '별핀',   slot: 'head' },
    { id: 'balloon', e: '🎈', name: '풍선',   slot: 'side' },
    { id: 'candy',   e: '🍭', name: '사탕',   slot: 'side' },
    { id: 'note',    e: '🎵', name: '음표',   slot: 'side' },
    { id: 'fly',     e: '🦋', name: '나비 친구', slot: 'side' },
    { id: 'ball',    e: '⚽', name: '공',     slot: 'side' },
    { id: 'teddy',   e: '🧸', name: '곰인형', slot: 'side' },
  ];
  const accOf = id => ACCS.find(a => a.id === id) || null;

  /* ─────────── 방 꾸미기 장식 (14종: 벽 4 + 창가 2 + 바닥 8) ───────────
   * 이모지가 어울리지 않는 것(러그·스탠드·커튼·가랜드)은 직접 그린 인라인 SVG를 쓴다. */
  const DECO_SVG = {
    garland: '<svg class="deco" viewBox="0 0 60 34" aria-hidden="true">' +
      '<path d="M2 5 Q30 21 58 5" fill="none" stroke="#C9A46A" stroke-width="2.5"/>' +
      '<path d="M8 8 L17 10 L11 20 Z" fill="#F7A8C4"/>' +
      '<path d="M21 13 L30 14 L25 24 Z" fill="#8ED9B5"/>' +
      '<path d="M35 14 L44 12 L40 23 Z" fill="#8FC9EA"/>' +
      '<path d="M47 9 L56 6 L53 18 Z" fill="#FFD93D"/>' +
      '<circle cx="13" cy="6.5" r="2.2" fill="#FFD93D"/><circle cx="30" cy="10.5" r="2.2" fill="#FFD93D"/>' +
      '<circle cx="47" cy="7" r="2.2" fill="#FFD93D"/></svg>',
    curtain: '<svg class="deco" viewBox="0 0 60 60" aria-hidden="true">' +
      '<rect x="2" y="2" width="56" height="6" rx="3" fill="#D9739B"/>' +
      '<path d="M6 8 Q14 30 7 54 L22 54 Q15 30 20 8 Z" fill="#F7A8C4"/>' +
      '<path d="M54 8 Q46 30 53 54 L38 54 Q45 30 40 8 Z" fill="#F7A8C4"/>' +
      '<circle cx="13" cy="34" r="3" fill="#FFD93D"/><circle cx="47" cy="34" r="3" fill="#FFD93D"/></svg>',
    rug: '<svg class="deco" viewBox="0 0 60 30" aria-hidden="true">' +
      '<ellipse cx="30" cy="15" rx="28" ry="13" fill="#FBD3E0"/>' +
      '<ellipse cx="30" cy="15" rx="20" ry="9" fill="#CDEBD8"/>' +
      '<ellipse cx="30" cy="15" rx="12" ry="5" fill="#FFF3C9"/></svg>',
    lamp: '<svg class="deco" viewBox="0 0 60 60" aria-hidden="true">' +
      '<ellipse cx="30" cy="55" rx="12" ry="4" fill="#C9A46A"/>' +
      '<rect x="28" y="22" width="4" height="33" fill="#C9A46A"/>' +
      '<path d="M16 25 L44 25 L37 6 L23 6 Z" fill="#FFDF8E"/>' +
      '<ellipse cx="30" cy="25" rx="14" ry="3.5" fill="#F5C55C"/></svg>',
  };
  const DECOS = [
    { id: 'frame',    e: '🖼️', name: '액자',        zone: 'wall' },
    { id: 'clock',    e: '⏰', name: '시계',        zone: 'wall' },
    { id: 'garland',  e: '🚩', name: '별 가랜드',   zone: 'wall', svg: DECO_SVG.garland },
    { id: 'mobile',   e: '🎐', name: '모빌',        zone: 'wall' },
    { id: 'curtain',  e: '🎀', name: '커튼',        zone: 'win',  svg: DECO_SVG.curtain },
    { id: 'cactus',   e: '🌵', name: '창가 화분',   zone: 'win' },
    { id: 'rug',      e: '🌈', name: '무지개 러그', zone: 'floor', svg: DECO_SVG.rug },
    { id: 'lamp',     e: '💡', name: '스탠드',      zone: 'floor', svg: DECO_SVG.lamp },
    { id: 'plant',    e: '🪴', name: '화분',        zone: 'floor' },
    { id: 'toybox',   e: '🧺', name: '장난감 상자', zone: 'floor' },
    { id: 'bounce',   e: '🏀', name: '통통 공',     zone: 'floor' },
    { id: 'books',    e: '📚', name: '책꽂이',      zone: 'floor' },
    { id: 'fishbowl', e: '🐠', name: '어항',        zone: 'floor' },
    { id: 'teddybig', e: '🧸', name: '곰인형',      zone: 'floor' },
  ];
  const decoOf = id => DECOS.find(d => d.id === id) || null;
  // 방의 꾸미기 자리 — 벽 3 · 창가 1 · 바닥 4 (위치는 pet.css의 .ps-* 클래스)
  const DECO_SLOTS = [
    { id: 'w1', zone: 'wall' }, { id: 'w2', zone: 'wall' }, { id: 'w3', zone: 'wall' },
    { id: 'n1', zone: 'win' },
    { id: 'f1', zone: 'floor' }, { id: 'f2', zone: 'floor' }, { id: 'f3', zone: 'floor' }, { id: 'f4', zone: 'floor' },
  ];
  const ZONE_NAME = { wall: '🧱 벽', win: '🪟 창가', floor: '🟫 바닥' };
  // 도감 친구(미니 펫) 자리 — 겹치지 않게 미리 정한 6곳 (l 왼쪽%, b 바닥%, w 너비%)
  const MINI_SPOTS = [
    { l: 15, b: 1, w: 22 }, { l: 63, b: 1, w: 22 },
    { l: 1, b: 14, w: 19 }, { l: 80, b: 13, w: 19 },
    { l: 30, b: 27, w: 14 }, { l: 56, b: 27, w: 14 },
  ];

  // ✏️ 이름 바꾸기 판에 띄우는 추천 이름 (기본 이름과 합쳐 6개까지 보여 준다)
  const NAME_IDEAS = ['별이', '콩이', '솜사탕', '복덩이', '반짝이', '초코'];
  const PRAISES = ['냠냠! 맛있다!', '고마워!', '냠냠, 힘이 나요!', '우와, 잘 먹을게!'];

  /* ─────────── 돌보기 그림 (직접 그린 인라인 SVG) ─────────── */
  // 💩 응가 — 웃는 얼굴을 달아 "무섭지 않은 할 일"로 보이게 한다
  const POOP_SVG = '<svg viewBox="0 0 40 36" aria-hidden="true">' +
    '<ellipse cx="20" cy="33" rx="15" ry="3" fill="#8A6430" opacity=".18"/>' +
    '<path d="M20 5 Q26.5 5 26.8 10.5 Q27 12.6 24.6 13 L15.4 13 Q13 12.6 13.2 10.5 Q13.5 5 20 5 Z" fill="#B9803F"/>' +
    '<path d="M13.6 13 Q29 12.4 30.6 19 Q31 21.2 28.4 21.6 L11.6 21.6 Q9 21.2 9.4 19 Q10 14.4 13.6 13 Z" fill="#A66F35"/>' +
    '<path d="M9 21.6 Q32.6 20.8 34.8 28.4 Q35.3 31 31.8 31.3 L8.2 31.3 Q4.7 31 5.2 28.4 Q5.9 23 9 21.6 Z" fill="#8E5C2C"/>' +
    '<circle cx="15" cy="26.4" r="2.6" fill="#FFF"/><circle cx="25" cy="26.4" r="2.6" fill="#FFF"/>' +
    '<circle cx="15.4" cy="26.8" r="1.3" fill="#4A3A2A"/><circle cx="25.4" cy="26.8" r="1.3" fill="#4A3A2A"/>' +
    '<path d="M17.4 29.4 Q20 31.4 22.6 29.4" fill="none" stroke="#4A3A2A" stroke-width="1.4" stroke-linecap="round"/>' +
    '</svg>';
  // 🍵 약(따뜻한 차) — 아플 때만 방 오른쪽 아래에 뜬다
  const MED_SVG = '<svg viewBox="0 0 44 42" aria-hidden="true">' +
    '<path d="M11 6 Q14 9.5 11 13" fill="none" stroke="#9CC4A8" stroke-width="2.2" stroke-linecap="round"/>' +
    '<path d="M19 4 Q22 8 19 12" fill="none" stroke="#9CC4A8" stroke-width="2.2" stroke-linecap="round"/>' +
    '<path d="M27 6 Q30 9.5 27 13" fill="none" stroke="#9CC4A8" stroke-width="2.2" stroke-linecap="round"/>' +
    '<path d="M32 20 q7 0.5 6.6 5 -0.4 4.5 -7 4.3" fill="none" stroke="#7FA98A" stroke-width="2.6" stroke-linecap="round"/>' +
    '<path d="M6.5 17.5 h26 v7.5 a13 13 0 0 1 -26 0 z" fill="#F3FAF4" stroke="#7FA98A" stroke-width="2.6" stroke-linejoin="round"/>' +
    '<ellipse cx="19.5" cy="17.8" rx="12.4" ry="3.4" fill="#BFE0A2" stroke="#7FA98A" stroke-width="2"/>' +
    '<ellipse cx="19.5" cy="37" rx="16.5" ry="3.6" fill="#E4F2E7" stroke="#7FA98A" stroke-width="2.2"/>' +
    '</svg>';
  // 하트 칸 (찬 칸 / 빈 칸) — 삐뚤빼뚤 손그림 결
  const HEART_FULL = '<svg viewBox="0 0 24 22" aria-hidden="true">' +
    '<path d="M12 20.2 C4.2 14.6 2.1 10.4 3.9 6.9 C5.8 3.2 10.4 3.6 12 7 C13.8 3.5 18.4 3.4 20.2 7.1 C21.9 10.7 19.6 14.8 12 20.2 Z" ' +
    'fill="#FF7BA9" stroke="#D9557F" stroke-width="1.6" stroke-linejoin="round"/></svg>';
  const HEART_EMPTY = '<svg viewBox="0 0 24 22" aria-hidden="true">' +
    '<path d="M12 20.2 C4.2 14.6 2.1 10.4 3.9 6.9 C5.8 3.2 10.4 3.6 12 7 C13.8 3.5 18.4 3.4 20.2 7.1 C21.9 10.7 19.6 14.8 12 20.2 Z" ' +
    'fill="#F1EAF5" stroke="#CDBBD9" stroke-width="1.6" stroke-linejoin="round"/></svg>';

  /* 💩 응가 자리 — 방 바닥에 겹치지 않게 미리 정한 6곳 (l 왼쪽%, b 바닥%).
   * 꾸미기 자리(.ps-f1~f4)와 도감 친구 자리(MINI_SPOTS)의 한가운데를 피해 두었다 —
   * 응가가 위에 떠 있어도 그 단추들을 삼키지 않는다. */
  const POOP_SPOTS = [
    { l: 28, b: 1 }, { l: 59, b: 1 }, { l: 20, b: 21 },
    { l: 66, b: 21 }, { l: 44, b: 1 }, { l: 44, b: 21 },
  ];

  /* ─────────── 날짜 도우미 (시·분은 무시하고 날짜 경계로만 센다) ─────────── */
  function dayKey(ts) {
    const d = new Date(ts);
    const p = n => (n < 10 ? '0' : '') + n;
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  }
  function dayStart(ts) { const d = new Date(ts); d.setHours(0, 0, 0, 0); return d.getTime(); }
  // 두 시각의 날짜 차이(정수). 0 = 같은 날, 1 = 어제, 2 = 하루 걸렀음
  function dayGap(a, b) { return Math.round((dayStart(b) - dayStart(a)) / 86400000); }

  /* ─────────── 저장 (+ 예전 형식 마이그레이션) ─────────── */
  // 돌보기 필드가 없는 옛 데이터는 **건강한 상태**로 채운다.
  // lastSeen 을 지금으로 두어야 옛 사용자가 열자마자 아프지 않다 (gap 0).
  function careDefaults(now) {
    return {
      hunger: HUNGER_MAX, mood: MOOD_MAX, poop: 0, sick: false,
      lastSeen: now, streak: 1, stampDay: dayKey(now), shield: 1,
    };
  }
  function load() {
    const now = Date.now();
    try {
      const raw = JSON.parse(localStorage.getItem(KEY));
      if (raw && typeof raw === 'object') {
        if (!('fed' in raw)) { // 예전 형식 {g, meals, snacks} — 성장·먹이를 이어받는다
          const g = Math.min(raw.g || 0, DONE - 1);
          return Object.assign({
            g, meals: raw.meals || 0, snacks: raw.snacks || 0,
            species: g >= HATCH ? 'chick' : null, name: '',
            fed: g, collection: [], acc: {}, accOwned: [],
            deco: {}, decoOwned: [], lastBeg: 0,
          }, careDefaults(now));
        }
        // deco·돌보기 필드가 없는 형식도 기본값으로 채워 이어받는다 (필드 추가만 — 기존 의미 변경 없음)
        const care = 'hunger' in raw ? {
          hunger: clamp(raw.hunger, 0, HUNGER_MAX, HUNGER_MAX),
          mood: clamp(raw.mood, 0, MOOD_MAX, MOOD_MAX),
          poop: clamp(raw.poop, 0, POOP_MAX, 0),
          sick: !!raw.sick,
          lastSeen: Number(raw.lastSeen) || now,
          streak: Math.max(1, Number(raw.streak) || 1),
          stampDay: raw.stampDay || dayKey(now),
          shield: clamp(raw.shield, 0, SHIELD_MAX, 1),
        } : careDefaults(now);
        return Object.assign({
          g: raw.g || 0, meals: raw.meals || 0, snacks: raw.snacks || 0,
          species: raw.species || null, name: raw.name || '',
          fed: raw.fed || 0, collection: raw.collection || [],
          acc: raw.acc || {}, accOwned: raw.accOwned || [],
          deco: raw.deco || {}, decoOwned: raw.decoOwned || [], lastBeg: raw.lastBeg || 0,
        }, care);
      }
    } catch (e) { /* 손상 데이터 초기화 */ }
    return Object.assign({
      g: 0, meals: 0, snacks: 0, species: null, name: '', fed: 0, collection: [],
      acc: {}, accOwned: [], deco: {}, decoOwned: [], lastBeg: 0,
    }, careDefaults(now));
  }
  function clamp(v, lo, hi, dflt) {
    const n = Number(v);
    if (!isFinite(n)) return dflt;
    return Math.max(lo, Math.min(hi, Math.round(n)));
  }
  let state = load();
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }

  /* ─────────── 시간 경과 · 도장 ─────────── */
  function careLevel() { // 부모 설정이 없을 수도 있으니 안전하게 읽는다
    const v = window.ParentSettings ? ParentSettings.get('petCare') : null;
    return v === 'soft' || v === 'tama' ? v : 'normal';
  }
  let lastGap = 0; // 이번에 방을 열었을 때의 날짜 차이 (인사말·도장에서 쓴다)

  // 마지막 방문 이후 흐른 날짜만큼 배고픔·기분을 줄이고 응가를 쌓는다.
  // 성장점수·도감·꾸미기·장식은 절대 건드리지 않는다.
  function applyElapsed() {
    const now = Date.now();
    const gap = dayGap(state.lastSeen || now, now);
    lastGap = gap;
    if (gap <= 0) { state.lastSeen = now; save(); return; }
    const care = careLevel();
    const mult = care === 'tama' ? 2 : 1;
    if (care !== 'soft') { // soft 는 응가만 생기고 하트는 줄지 않는다
      state.hunger = Math.max(0, state.hunger - gap * mult);
      state.mood = Math.max(0, state.mood - gap * mult);
    }
    state.poop = Math.min(POOP_MAX, state.poop + gap * mult);
    if (care !== 'soft' && (gap >= 2 || state.poop >= 3)) state.sick = true;
    state.lastSeen = now;
    save();
  }

  // 하루 한 번 도장 — 거른 날은 '봐주기'로 갚는다. streak 는 0으로 떨어지지 않는다.
  function stampToday(gap) {
    const today = dayKey(Date.now());
    if (state.stampDay === today) return;
    let used = 0;
    if (gap <= 1) state.streak++;
    else {
      const miss = gap - 1;                 // 실제로 거른 날 수
      if (state.shield >= miss) { state.shield -= miss; used = miss; state.streak++; }
      else { state.shield = 0; state.streak = 1; }
    }
    state.stampDay = today;
    const gotShield = state.streak % STREAK_SHIELD === 0 && state.shield < SHIELD_MAX;
    if (gotShield) state.shield++;
    save();
    // 안내는 방을 여는 인사말이 끝난 뒤에 (speak 는 앞의 말을 끊는다)
    if (used) {
      toast('🛡️ 봐주기를 한 장 썼어요');
      setTimeout(() => speak('걱정 마! 봐주기로 채워 뒀어.'), 2800);
    }
    if (gotShield) {
      setTimeout(() => {
        sfxGift();
        toast('🛡️ 봐주기 한 장을 받았어요!');
        speak('와! 봐주기 한 장을 받았어요!');
      }, used ? 5200 : 2800);
    }
  }

  function stageName() {
    if (!state.species) return '알';
    if (state.g < KID) return '아기';
    if (state.g < ADULT) return '어린이';
    return '어른';
  }
  function petEmoji() { return state.species ? spOf(state.species).e : '🥚'; }
  function petName() {
    if (!state.species) return '알';
    return state.name || spOf(state.species).def;
  }
  function collectedIds() {
    const ids = state.collection.map(c => c.sp);
    if (state.species) ids.push(state.species);
    return ids;
  }

  /* ─────────── 소리 (독립 WebAudio + 공용 목소리) ─────────── */
  let ctx = null;
  function ac() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  function tone(freq, startAt, dur, vol, type) {
    const c = ac(); if (!c) return;
    const t = c.currentTime + startAt;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type || 'triangle';
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(vol, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain).connect(c.destination);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }
  const sfxMunch = () => { tone(340, 0, 0.08, 0.2, 'square'); tone(300, 0.1, 0.08, 0.2, 'square'); tone(420, 0.22, 0.12, 0.2, 'sine'); };
  const sfxGrow = () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.12, 0.22, 0.25)); tone(1319, 0.5, 0.45, 0.25); };
  const sfxGift = () => { tone(880, 0, 0.12, 0.2); tone(1175, 0.12, 0.12, 0.2); tone(1568, 0.24, 0.25, 0.2); };
  const sfxTap = () => tone(660, 0, 0.09, 0.2);
  // 쓱싹 — 응가를 치울 때. 톱니파를 빠르게 떨어뜨려 비질 소리에 가깝게 만든다
  const sfxSweep = () => {
    const c = ac(); if (!c) return;
    const t = c.currentTime;
    const osc = c.createOscillator(), gain = c.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(900, t);
    osc.frequency.exponentialRampToValueAtTime(180, t + 0.22);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.13, t + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.26);
    osc.connect(gain).connect(c.destination);
    osc.start(t);
    osc.stop(t + 0.3);
    tone(1200, 0.24, 0.1, 0.12, 'sine'); // 마무리 반짝
  };
  // 부드러운 상승 2음 — 약(따뜻한 차)을 줄 때
  const sfxHeal = () => { tone(523, 0, 0.28, 0.18, 'sine'); tone(784, 0.2, 0.42, 0.18, 'sine'); };

  function speak(text) {
    if (!window.speechSynthesis) return;
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'ko-KR';
      u.rate = 0.95 * (window.VoiceSettings ? VoiceSettings.rateFactor() : 1);
      u.pitch = 1.2;
      const v = (window.VoiceSettings && VoiceSettings.koVoice()) ||
        speechSynthesis.getVoices().find(x => x.lang && x.lang.replace('_', '-').toLowerCase().indexOf('ko') === 0);
      if (v) u.voice = v;
      speechSynthesis.speak(u);
    } catch (e) {}
  }

  /* ─────────── UI ─────────── */
  let btn = null, mounted = false;
  const $ = id => document.getElementById(id);

  /* 방 배경 — 벽지·바닥·창문·러그를 직접 그린 인라인 SVG */
  function roomBg() {
    const b = [];
    b.push('<svg viewBox="0 0 400 300" preserveAspectRatio="none" aria-hidden="true">');
    b.push('<rect x="0" y="0" width="400" height="204" fill="#FBEEDA"/>'); // 벽
    for (let y = 18; y < 190; y += 34) {                                   // 벽지 물방울 무늬
      for (let x = 14 + ((y / 34) % 2 ? 17 : 0); x < 400; x += 34) {
        b.push('<circle cx="' + x + '" cy="' + y + '" r="3" fill="#F3E0BF"/>');
      }
    }
    b.push('<rect x="0" y="196" width="400" height="104" fill="#F3DDBA"/>'); // 바닥
    b.push('<path d="M0 232 H400 M0 264 H400" stroke="#EACFA2" stroke-width="2" opacity=".7"/>');
    b.push('<path d="M66 196 V232 M200 196 V232 M333 196 V232 M133 232 V264 M266 232 V264 M66 264 V300 M200 264 V300 M333 264 V300" stroke="#EACFA2" stroke-width="2" opacity=".55"/>');
    b.push('<rect x="0" y="192" width="400" height="9" rx="4.5" fill="#EAD3AC"/>'); // 걸레받이
    // 창문 (오른쪽 위) — 하늘·해·구름
    b.push('<rect x="268" y="24" width="112" height="96" rx="12" fill="#C2E7F8" stroke="#FFFFFF" stroke-width="9"/>');
    b.push('<circle cx="296" cy="50" r="11" fill="#FFE082"/>');
    b.push('<ellipse cx="336" cy="80" rx="17" ry="7" fill="#FFFFFF"/><ellipse cx="324" cy="74" rx="10" ry="6" fill="#FFFFFF"/>');
    b.push('<path d="M324 28 V116 M272 72 H376" stroke="#FFFFFF" stroke-width="6"/>');
    b.push('<rect x="258" y="116" width="132" height="11" rx="5.5" fill="#EAD3AC"/>'); // 창턱
    // 기본 러그 (내 펫이 서는 자리)
    b.push('<ellipse cx="200" cy="268" rx="118" ry="26" fill="#F6CFDD"/>');
    b.push('<ellipse cx="200" cy="268" rx="92" ry="19" fill="#FBE3EC"/>');
    b.push('<ellipse cx="200" cy="268" rx="60" ry="12" fill="#FDF0F5"/>');
    b.push('</svg>');
    return b.join('');
  }

  function html() {
    const box = document.createElement('div');
    box.innerHTML =
      '<div class="pet-overlay" id="pet-overlay">' +
      '  <div class="pet-card">' +
      '    <button type="button" class="pet-close" id="pet-close" aria-label="닫기">✕</button>' +
      '    <div class="pet-stage-name" id="pet-stage-name"></div>' +
      '    <div class="pet-name-row">' +
      '      <span class="pet-name" id="pet-name"></span>' +
      '      <button type="button" class="pet-rename" id="pet-rename" aria-label="이름 바꾸기">✏️</button>' +
      '    </div>' +
      '    <div class="pet-meters" id="pet-meters">' +
      '      <span class="pet-meter"><i>🍚</i><span class="pet-hearts" id="pet-hearts-hunger"></span></span>' +
      '      <span class="pet-meter"><i>😊</i><span class="pet-hearts" id="pet-hearts-mood"></span></span>' +
      '    </div>' +
      '    <div class="pet-room" id="pet-room">' +
      '      <div class="pet-room-bg">' + roomBg() + '</div>' +
      DECO_SLOTS.map(s =>
        '      <button type="button" class="pet-deco-slot ps-' + s.id + '" data-slot="' + s.id + '" aria-label="꾸미기 자리"></button>'
      ).join('') +
      '      <div class="pet-minis" id="pet-minis"></div>' +
      '      <div class="pet-avatar">' +
      '        <div class="pet-svg" id="pet-svg"></div>' +
      '        <span class="pet-emoji" id="pet-emoji" hidden></span>' +
      '        <span class="pet-acc-head" id="pet-acc-head"></span>' +
      '        <span class="pet-acc-side" id="pet-acc-side"></span>' +
      '      </div>' +
      '      <div class="pet-poops" id="pet-poops"></div>' +
      '      <button type="button" class="pet-med" id="pet-med" hidden aria-label="따뜻한 차 주기">' + MED_SVG + '</button>' +
      '    </div>' +
      '    <div class="pet-bar"><div class="pet-bar-fill" id="pet-bar-fill"></div></div>' +
      '    <div class="pet-bar-label" id="pet-bar-label"></div>' +
      '    <div class="pet-foods">' +
      '      <button type="button" class="pet-food" id="pet-feed-meal">🍚<span>식사</span><b id="pet-meal-n">0</b></button>' +
      '      <button type="button" class="pet-food" id="pet-feed-snack">🍪<span>간식</span><b id="pet-snack-n">0</b></button>' +
      '    </div>' +
      '    <div class="pet-dressup-box">' +
      '      <div class="pet-dressup-title" id="pet-gift-label">🎁 꾸미기</div>' +
      '      <div class="pet-dressup" id="pet-dressup"></div>' +
      '    </div>' +
      '    <button type="button" class="pet-book-btn" id="pet-book-btn">📖 펫 도감 <b id="pet-book-n"></b></button>' +
      '    <div class="pet-hint" id="pet-hint"></div>' +
      '  </div>' +
      '</div>' +
      '<div class="pet-overlay" id="pet-name-overlay">' +
      '  <div class="pet-card pet-card-slim">' +
      '    <button type="button" class="pet-close" id="pet-name-close" aria-label="닫기">✕</button>' +
      '    <div class="pet-stage-name">✏️ 이름 바꾸기</div>' +
      '    <div class="pet-name-chips" id="pet-name-chips"></div>' +
      '    <div class="pet-name-form">' +
      '      <input type="text" id="pet-name-input" maxlength="6" placeholder="직접 짓기" autocomplete="off">' +
      '      <button type="button" id="pet-name-ok">좋아!</button>' +
      '    </div>' +
      '  </div>' +
      '</div>' +
      '<div class="pet-overlay" id="pet-book-overlay">' +
      '  <div class="pet-card">' +
      '    <button type="button" class="pet-close" id="pet-book-close" aria-label="닫기">✕</button>' +
      '    <div class="pet-stage-name">📖 펫 도감</div>' +
      '    <div class="pet-book-grid" id="pet-book-grid"></div>' +
      '  </div>' +
      '</div>' +
      '<div class="pet-overlay" id="pet-deco-overlay">' +
      '  <div class="pet-card">' +
      '    <button type="button" class="pet-close" id="pet-deco-close" aria-label="닫기">✕</button>' +
      '    <div class="pet-stage-name" id="pet-deco-title">🛋️ 방 꾸미기</div>' +
      '    <div class="pet-deco-grid" id="pet-deco-grid"></div>' +
      '    <div class="pet-deco-hint" id="pet-deco-hint"></div>' +
      '  </div>' +
      '</div>' +
      '<div class="pet-toast" id="pet-toast"></div>';
    while (box.firstChild) document.body.appendChild(box.firstChild);
  }

  function render() {
    if (btn) {
      btn.querySelector('.pet-btn-emoji').textContent = petEmoji();
      const pantry = state.meals + state.snacks;
      const badge = btn.querySelector('.pet-badge');
      badge.textContent = pantry;
      badge.style.display = pantry > 0 ? '' : 'none';
    }
    if (!$('pet-overlay')) return;

    const sp = state.species ? spOf(state.species) : null;
    $('pet-stage-name').textContent = sp ? (stageName() + ' ' + sp.name) : '🥚 신비한 알';
    $('pet-name').textContent = petName();
    $('pet-rename').hidden = !sp;
    renderPet();
    renderRoomDeco();
    // 착용한 꾸미기
    const head = accOf(state.acc.head), side = accOf(state.acc.side);
    $('pet-acc-head').textContent = sp && head ? head.e : '';
    $('pet-acc-side').textContent = sp && side ? side.e : '';

    $('pet-meal-n').textContent = state.meals;
    $('pet-snack-n').textContent = state.snacks;

    const next = !sp ? HATCH : state.g < KID ? KID : state.g < ADULT ? ADULT : DONE;
    const prev = !sp ? 0 : state.g < KID ? HATCH : state.g < ADULT ? KID : ADULT;
    $('pet-bar-fill').style.width = Math.min(100, (state.g - prev) / (next - prev) * 100) + '%';
    $('pet-bar-label').textContent = !sp
      ? '태어날 때까지 ' + (HATCH - state.g) + ' 🌱'
      : state.g < ADULT ? '다음 모습까지 ' + (next - state.g) + ' 🌱'
      : '도감 등록까지 ' + (DONE - state.g) + ' ✨';

    // 꾸미기 목록 (받은 것만) + 다음 선물 안내
    const dress = $('pet-dressup');
    dress.innerHTML = '';
    state.accOwned.forEach(id => {
      const a = accOf(id);
      if (!a) return;
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'pet-acc-btn' + (state.acc[a.slot] === id ? ' on' : '');
      b.textContent = a.e;
      b.setAttribute('aria-label', a.name);
      b.addEventListener('click', () => {
        sfxTap();
        state.acc[a.slot] = state.acc[a.slot] === id ? null : id; // 다시 누르면 벗기
        save();
        render();
        if (state.acc[a.slot]) speak(a.name + '! 잘 어울려!');
      });
      dress.appendChild(b);
    });
    const toGift = GIFT_EVERY - (state.fed % GIFT_EVERY);
    $('pet-gift-label').textContent = state.accOwned.length >= ACCS.length
      ? '🎁 꾸미기 (다 모았어요!)'
      : '🎁 꾸미기 · 다음 선물까지 ' + toGift;

    $('pet-book-n').textContent = state.collection.length + ' / ' + SPECIES.length;
    renderMeters();
    renderPoops();
    renderMed();
    renderTodo();
  }

  /* ─────────── 돌보기 표시 (하트 줄 · 응가 · 약 · 도장 줄) ─────────── */
  function hearts(box, n, max) {
    if (!box) return;
    let h = '';
    for (let i = 0; i < max; i++) h += (i < n ? HEART_FULL : HEART_EMPTY);
    box.innerHTML = h;
  }
  function renderMeters() {
    hearts($('pet-hearts-hunger'), state.hunger, HUNGER_MAX);
    hearts($('pet-hearts-mood'), state.mood, MOOD_MAX);
  }

  // 방 바닥의 응가 — 누르면 하나씩 치워진다
  function renderPoops() {
    const box = $('pet-poops');
    if (!box) return;
    const n = Math.max(0, Math.min(POOP_MAX, state.poop));
    if (box.childElementCount === n) return; // 개수가 그대로면 다시 그리지 않는다 (반짝임 유지)
    box.innerHTML = '';
    for (let i = 0; i < n; i++) {
      const spot = POOP_SPOTS[i];
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'pet-poop pet-todo';
      b.style.left = spot.l + '%';
      b.style.bottom = spot.b + '%';
      b.setAttribute('aria-label', '응가 치우기');
      b.innerHTML = POOP_SVG;
      b.addEventListener('click', cleanPoop);
      box.appendChild(b);
    }
  }
  function renderMed() {
    const el = $('pet-med');
    if (el) el.hidden = !state.sick;
  }
  // 아래 한 줄은 "지금 할 일" 또는 "며칠째 함께" 도장 줄로 쓴다 (줄 수는 늘리지 않는다)
  function todoCount() {
    return state.poop + (state.sick ? 1 : 0) + (state.hunger === 0 ? 1 : 0);
  }
  function renderTodo() {
    const n = todoCount();
    const hint = $('pet-hint');
    if (hint) {
      hint.textContent = n > 0
        ? '✋ 눌러 줄 것이 ' + n + '개 있어요'
        : '🌤️ ' + state.streak + '일째 함께 ' +
          '⭐'.repeat(Math.min(3, state.streak)) + '🛡️'.repeat(state.shield);
    }
    // 배가 고프면 먹이 단추에 "할 일" 반짝임
    ['pet-feed-meal', 'pet-feed-snack'].forEach(id => {
      const el = $(id);
      if (el) el.classList.toggle('pet-todo', state.hunger === 0);
    });
  }

  // 응가 치우기 — 기분 하트가 한 칸 찬다
  function cleanPoop() {
    if (state.poop <= 0) return;
    state.poop--;
    state.mood = Math.min(MOOD_MAX, state.mood + 1);
    save();
    sfxSweep();
    renderPoops();
    renderMeters();
    renderTodo();
    if (state.poop === 0 && av) av.happy();
    speak('쓱싹! 깨끗해졌다!');
  }
  // 약(따뜻한 차) — 한 번이면 바로 낫는다
  function heal() {
    if (!state.sick) return;
    state.sick = false;
    state.mood = Math.min(MOOD_MAX, state.mood + 1);
    save();
    sfxHeal();
    renderMed();
    renderMeters();
    renderTodo();
    renderPet();          // 아픈 표정을 건강한 표정으로
    if (av) av.celebrate();
    speak('다 나았어! 고마워!');
  }

  /* ─────────── ✏️ 이름 바꾸기 (작은 오버레이 — 평소 화면 높이를 차지하지 않는다) ─────────── */
  function openNamePicker() {
    if (!state.species) return;
    sfxTap();
    const box = $('pet-name-chips');
    box.innerHTML = '';
    const def = spOf(state.species).def;
    [def].concat(NAME_IDEAS.filter(n => n !== def)).slice(0, 6).forEach(n => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'pet-name-chip';
      b.textContent = n;
      b.addEventListener('click', () => setName(n));
      box.appendChild(b);
    });
    $('pet-name-input').value = '';
    $('pet-name-overlay').classList.add('on');
    speak('어떤 이름이 좋을까?');
  }
  function closeNamePicker() { $('pet-name-overlay').classList.remove('on'); }

  function setName(n) {
    const name = String(n || '').replace(/[^가-힣a-zA-Z0-9 ]/g, '').trim().slice(0, 6);
    if (!name) { speak('이름을 골라 줄래?'); return; }
    state.name = name;
    save();
    closeNamePicker();
    sfxGift();
    speak(name + '! 정말 예쁜 이름이야!');
    render();
  }

  function bounce(el, cls) {
    el.classList.remove(cls);
    void el.offsetWidth;
    el.classList.add(cls);
  }

  /* SVG 캐릭터(pet-avatar.js)로 그린다 — 모듈이 없으면 이모지로 대체(안전망) */
  let av = null;
  function renderPet() {
    if (av) {
      if (!state.species) av.render({ species: 'egg', crack: Math.min(1, state.g / HATCH) });
      else av.render({
        species: state.species,
        stage: state.g < KID ? 1 : state.g < ADULT ? 2 : 3,
        sick: state.sick, // 아프면 발그레한 볼 + 처진 눈 + 열 표시
      });
      return;
    }
    // 이모지 안전망: 빈 SVG 무대는 숨기고, 예전 크기 클래스로 큼직하게
    $('pet-svg').style.display = 'none';
    const emojiEl = $('pet-emoji');
    emojiEl.hidden = false;
    emojiEl.textContent = petEmoji();
    emojiEl.classList.remove('pet-sz-0', 'pet-sz-1', 'pet-sz-2', 'pet-sz-3');
    emojiEl.classList.add('pet-sz-' + (state.species ? (state.g < KID ? 1 : state.g < ADULT ? 2 : 3) : 0));
  }
  // 펫을 만지면 좋아한다 (알은 흔들흔들)
  const GIGGLES = ['히히, 간지러워!', '까르르!', '좋아 좋아!', '나랑 놀자!'];
  function petTouch() {
    if (state.sick) { heal(); return; } // 아픈 펫을 눌러도 약을 준 것과 같다
    sfxTap();
    if (!state.species) {
      if (av) av.celebrate();
      speak('알이 흔들흔들! 곧 태어날 것 같아!');
      return;
    }
    state.mood = Math.min(MOOD_MAX, state.mood + 1); // 쓰다듬으면 기분이 좋아진다
    save();
    renderMeters();
    renderTodo();
    if (av) av.happy();
    speak(GIGGLES[Math.floor(Math.random() * GIGGLES.length)]);
  }

  /* ─────────── 방 꾸미기 (장식 배치) ─────────── */
  function decoMarkup(d) { return d.svg || '<span class="pet-deco-e">' + d.e + '</span>'; }

  function renderRoomDeco() {
    DECO_SLOTS.forEach(s => {
      const el = document.querySelector('#pet-room .pet-deco-slot[data-slot="' + s.id + '"]');
      if (!el) return;
      const d = decoOf(state.deco[s.id]);
      el.innerHTML = d ? decoMarkup(d) : '<span class="pet-slot-empty">＋</span>';
      el.classList.toggle('filled', !!d);
    });
  }

  // 장식을 자리에 놓는다 (같은 장식이 다른 자리에 있으면 옮겨 온다). id가 null이면 빼기
  function placeDeco(slotId, id) {
    if (id) DECO_SLOTS.forEach(s => { if (state.deco[s.id] === id) delete state.deco[s.id]; });
    if (id) state.deco[slotId] = id;
    else delete state.deco[slotId];
    save();
    renderRoomDeco();
  }

  function closeDecoPicker() { $('pet-deco-overlay').classList.remove('on'); }

  // 자리를 탭하면 보유 장식 고르기 판 — 못 받은 장식은 실루엣+? 로 보여 준다
  function openDecoPicker(slotId) {
    const slot = DECO_SLOTS.find(s => s.id === slotId);
    if (!slot) return;
    sfxTap();
    $('pet-deco-title').textContent = '🛋️ ' + ZONE_NAME[slot.zone] + ' 꾸미기';
    const grid = $('pet-deco-grid');
    grid.innerHTML = '';
    if (state.deco[slotId]) { // 지금 놓인 장식 빼기
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'pet-deco-cell';
      b.innerHTML = '<span class="pd-icon">🚫</span><span class="pd-name">빼기</span>';
      b.addEventListener('click', () => {
        sfxTap();
        placeDeco(slotId, null);
        closeDecoPicker();
        speak('깨끗하게 치웠어!');
      });
      grid.appendChild(b);
    }
    DECOS.filter(d => d.zone === slot.zone).forEach(d => {
      const owned = state.decoOwned.indexOf(d.id) >= 0;
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'pet-deco-cell' + (owned ? '' : ' lock') + (state.deco[slotId] === d.id ? ' on' : '');
      b.setAttribute('aria-label', owned ? d.name : '아직 못 받은 장식');
      b.innerHTML = '<span class="pd-icon">' + decoMarkup(d) + '</span>' +
        '<span class="pd-name">' + (owned ? d.name : '???') + '</span>' +
        (owned ? '' : '<span class="pd-q">?</span>');
      b.addEventListener('click', () => {
        if (!owned) { sfxTap(); speak('공부하면 선물로 받을 수 있어!'); return; }
        sfxGift();
        placeDeco(slotId, d.id);
        closeDecoPicker();
        speak(d.name + '! 방이 예뻐졌다!');
      });
      grid.appendChild(b);
    });
    // 다음 장식 선물 안내
    const r = state.fed % GIFT_EVERY;
    const toDeco = r < DECO_OFFSET ? DECO_OFFSET - r : GIFT_EVERY + DECO_OFFSET - r;
    $('pet-deco-hint').textContent = state.decoOwned.length >= DECOS.length
      ? '장식을 다 모았어요!'
      : '🎁 다음 장식 선물까지 ' + toDeco;
    $('pet-deco-overlay').classList.add('on');
    speak('무엇을 놓을까?');
  }

  /* ─────────── 도감 친구들 (미니 펫) + 간식 조르기 ─────────── */
  let minis = [];          // [{ sp, name, av, el }]
  let begMini = null;      // 지금 간식을 조르는 친구
  let begTimer = null;

  // 방을 열 때마다 도감의 친구들을 새로 배치한다 (종 중복 제거, 6자리 넘으면 매번 랜덤으로 놀러 나옴)
  function buildMinis() {
    const box = $('pet-minis');
    if (!box) return;
    endBeg();
    minis.forEach(m => { if (m.av) m.av.destroy(); });
    minis = [];
    box.innerHTML = '';
    const seen = {};
    const friends = [];
    for (let i = state.collection.length - 1; i >= 0; i--) { // 최근에 다 키운 이름을 쓴다
      const c = state.collection[i];
      if (!c || seen[c.sp] || !spOf(c.sp)) continue;
      seen[c.sp] = 1;
      friends.push({ sp: c.sp, name: c.name || spOf(c.sp).def });
    }
    if (friends.length > MINI_SPOTS.length) { // 자리보다 많으면 섞어서 — 열 때마다 다른 친구가 나온다
      for (let i = friends.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const t = friends[i]; friends[i] = friends[j]; friends[j] = t;
      }
    }
    friends.slice(0, MINI_SPOTS.length).forEach((f, i) => {
      const spot = MINI_SPOTS[i];
      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'pet-mini';
      el.style.left = spot.l + '%';
      el.style.bottom = spot.b + '%';
      el.style.width = spot.w + '%';
      el.setAttribute('aria-label', f.name);
      el.innerHTML = '<span class="pet-beg-bubble" hidden>🍪 간식 줘~</span>' +
        (window.PetAvatar ? '<span class="pet-mini-svg"></span>'
          : '<span class="pet-mini-e">' + spOf(f.sp).e + '</span>'); // SVG 모듈이 없으면 이모지 안전망
      let mav = null;
      if (window.PetAvatar) {
        mav = PetAvatar.create(el.querySelector('.pet-mini-svg'));
        mav.stopIdle(); // 잔동작은 방이 열려 있는 동안만 (open/close에서 켜고 끈다)
        mav.render({ species: f.sp, stage: 2 });
      }
      const m = { sp: f.sp, name: f.name, av: mav, el };
      el.addEventListener('click', () => miniTap(m));
      minis.push(m);
      box.appendChild(el);
    });
  }

  function miniTap(m) {
    if (begMini === m) { shareSnack(m); return; }
    sfxTap();
    if (m.av) m.av.happy();
    speak(m.name + '! 안녕!');
  }

  // 친구가 간식을 조르기 시작 — 말풍선 + 목소리
  function startBeg(m) {
    if (!m) return;
    begMini = m;
    state.lastBeg = Date.now();
    save();
    const bub = m.el.querySelector('.pet-beg-bubble');
    if (bub) bub.hidden = false;
    m.el.classList.add('beg');
    speak('나도 간식 줘~');
  }
  function endBeg() {
    if (begTimer) { clearTimeout(begTimer); begTimer = null; }
    if (!begMini) return;
    const bub = begMini.el && begMini.el.querySelector('.pet-beg-bubble');
    if (bub) bub.hidden = true;
    if (begMini.el) begMini.el.classList.remove('beg');
    begMini = null;
  }
  // 방을 열면 가끔 조른다 — 간식이 없으면 조르지 않는다 (좌절 금지)
  function maybeBeg() {
    if (begMini || begTimer || !minis.length || state.snacks <= 0) return;
    const since = Date.now() - (state.lastBeg || 0);
    if (Math.random() >= BEG_CHANCE && since < BEG_COOLDOWN) return;
    begTimer = setTimeout(() => {
      begTimer = null;
      // 앞줄 친구(내 펫에 덜 가려지는 자리)가 조른다 — 아이가 탭하기 쉽게
      const n = Math.min(minis.length, 4);
      startBeg(minis[Math.floor(Math.random() * n)]);
    }, 1500);
  }

  // 조르는 친구를 탭 → 간식 1개 나눠 주기 (성장점수와 무관, 보유 간식만 소모)
  function shareSnack(m) {
    if (state.snacks <= 0) { // 그 사이 간식이 떨어졌으면 부드럽게 안내만
      endBeg();
      speak('간식이 없네. 공부해서 간식을 모아 오자!');
      return;
    }
    state.snacks--;
    save();
    endBeg();
    sfxMunch();
    if (m.av) m.av.happy();
    render();
    // 가끔 고마움 선물로 장식을 떨어뜨린다
    const unowned = DECOS.filter(d => state.decoOwned.indexOf(d.id) < 0);
    if (unowned.length && Math.random() < 0.35) {
      const d = unowned[Math.floor(Math.random() * unowned.length)];
      state.decoOwned.push(d.id);
      save();
      setTimeout(() => {
        sfxGift();
        toast('💝 ' + m.name + '의 고마움 선물! ' + d.e + ' ' + d.name + '!');
        speak('고마워! 이거 선물이야! ' + d.name + '!');
        render();
      }, 700);
    } else {
      speak('냠냠! 고마워!');
    }
  }

  function open() {
    if (!mounted) return;
    applyElapsed();      // 흐른 날짜만큼 배고픔·기분·응가 반영 (맨 앞에서 한 번)
    stampToday(lastGap); // 오늘의 도장 · 봐주기
    sfxTap();
    buildMinis();
    $('pet-overlay').classList.add('on');
    render();
    if (av) av.startIdle();
    minis.forEach(m => { if (m.av) m.av.startIdle(); }); // 잔동작은 방이 열려 있을 때만
    speak(greeting());
    maybeBeg();
  }
  // 인사말 — 오랜만에 와도 나무라지 않는다. 할 일이 있으면 하나만 부드럽게 알려 준다.
  function greeting() {
    let g;
    if (lastGap >= 2) g = '보고 싶었어! ' + (state.species ? petName() + '가 기다렸어요!' : '알이 기다렸어요!');
    else g = state.species ? petName() + '가 기다리고 있어요!' : '알이 콕콕! 먹이를 주면 태어날 거예요!';
    if (state.sick) g += ' 따뜻한 차를 주면 금방 나을 거야!';
    else if (state.poop > 0) g += ' 응가를 톡 눌러서 치워 줄래?';
    else if (state.hunger === 0) g += ' 배가 고파! 밥을 줄래?';
    return g;
  }
  function close() {
    $('pet-overlay').classList.remove('on');
    if (av) av.stopIdle();
    minis.forEach(m => { if (m.av) m.av.stopIdle(); });
    endBeg();
    if (window.speechSynthesis) speechSynthesis.cancel();
  }

  /* ─────────── 먹이기 → 부화·성장·선물·도감 ─────────── */
  function maybeGift() { // 호출부에서 fed가 8의 배수일 때만 부른다
    const unowned = ACCS.filter(a => state.accOwned.indexOf(a.id) < 0);
    if (!unowned.length) return;
    const a = unowned[Math.floor(Math.random() * unowned.length)];
    state.accOwned.push(a.id);
    if (!state.acc[a.slot]) state.acc[a.slot] = a.id; // 첫 선물은 바로 입혀 준다
    save();
    setTimeout(() => {
      sfxGift();
      toast('🎁 선물! ' + a.e + ' ' + a.name + '을 받았어요!');
      speak('선물이 왔어요! ' + a.name + '!');
      render();
    }, 900);
  }

  function maybeDecoGift() { // 호출부에서 fed % 8 === 4 일 때만 부른다 (꾸미기 선물과 번갈아)
    const unowned = DECOS.filter(d => state.decoOwned.indexOf(d.id) < 0);
    if (!unowned.length) return;
    const d = unowned[Math.floor(Math.random() * unowned.length)];
    state.decoOwned.push(d.id);
    save();
    setTimeout(() => {
      sfxGift();
      toast('🎁 방 꾸미기 선물! ' + d.e + ' ' + d.name + '!');
      speak('방 꾸미기 선물이 왔어요! ' + d.name + '! 방을 꾸며 보자!');
      render();
    }, 900);
  }

  function feed(kind) {
    const isMeal = kind === 'meal';
    if ((isMeal ? state.meals : state.snacks) <= 0) {
      sfxTap();
      bounce($(isMeal ? 'pet-feed-meal' : 'pet-feed-snack'), 'pet-shake');
      speak('공부하고 ' + (isMeal ? '식사' : '간식') + '를 가져다줄래?');
      return;
    }
    const gBefore = state.g;
    if (isMeal) { state.meals--; state.g += MEAL_PTS; state.hunger = Math.min(HUNGER_MAX, state.hunger + 2); }
    else { state.snacks--; state.g += SNACK_PTS; state.hunger = Math.min(HUNGER_MAX, state.hunger + 1); }
    state.fed++;
    if (state.fed % POOP_PER_FEED === 0) state.poop = Math.min(POOP_MAX, state.poop + 1); // 많이 먹으면 응가도 나온다
    save();

    // 상태 변화(부화·성장·도감)는 즉시 반영하고, 연출만 먹기 애니메이션 뒤에 이어 붙인다
    let after = null;
    if (!state.species && state.g >= HATCH) { // 🐣 부화 — 아직 없는 종 중에서 태어난다
      const have = collectedIds();
      const pool = SPECIES.filter(s => have.indexOf(s.id) < 0);
      const sp = (pool.length ? pool : SPECIES)[Math.floor(Math.random() * (pool.length ? pool.length : SPECIES.length))];
      state.species = sp.id;
      state.name = sp.def;  // 기본 이름을 바로 붙여 준다 (✏️ 로 언제든 바꿀 수 있다)
      save();
      after = () => {
        render();
        if (av) av.celebrate();
        sfxGrow();
        speak('우와! ' + sp.def + '가 태어났어요!');
      };
    } else if (state.g >= DONE) { // 🎓 다 컸다 — 도감 등록 + 새 알
      const sp = spOf(state.species);
      state.collection.push({ sp: state.species, name: petName(), at: Date.now() });
      const grownName = petName();
      state.g = 0;
      state.species = null;
      state.name = '';
      state.acc = {}; // 다음 펫에게 새로 입혀 준다 (받은 선물은 그대로 보관)
      save();
      after = () => {
        render();
        if (av) av.celebrate();
        sfxGrow();
        speak('와! ' + grownName + '가 다 컸어요! 도감에 쏙! 새로운 알이 도착했어요!');
        toast('📖 ' + sp.e + ' ' + grownName + ' 도감 등록!');
      };
    } else if ((state.g >= KID && gBefore < KID) || (state.g >= ADULT && gBefore < ADULT)) { // 성장
      after = () => {
        render();
        if (av) av.celebrate();
        sfxGrow();
        speak('우와! ' + petName() + '가 ' + stageName() + '가 됐어요!');
      };
    } else {
      after = () => {
        if (av && state.species) av.happy(); // 방긋 + 하트
        speak(PRAISES[Math.floor(Math.random() * PRAISES.length)]);
      };
    }
    if (state.accOwned.length < ACCS.length && state.fed % GIFT_EVERY === 0) maybeGift();
    if (state.fed % GIFT_EVERY === DECO_OFFSET) maybeDecoGift(); // 장식 선물 (4·12·20…번째)

    // 연출: 먹이가 날아가 입으로 쏙 → 오물오물 → 다음 연출. 연달아 누르면 연출은 생략(상태는 이미 반영됨).
    // after는 슬롯 하나에만 담는다 — 연타 시 최신(성장·부화) 연출이 남고,
    // 뒤늦게 끝난 먹기의 칭찬말이 중요한 안내 음성을 끊지 않는다.
    pendingAfter = after;
    if (feedBusy || !av) {
      sfxMunch();
      if (!av) bounce($('pet-emoji'), 'pet-munch');
      render();
      runAfter();
      return;
    }
    feedBusy = true;
    flyFood(isMeal ? '🍚' : '🍪', isMeal ? 'pet-feed-meal' : 'pet-feed-snack', () => {
      sfxMunch();
      render();
      av.eat(() => {
        feedBusy = false;
        runAfter();
      });
    });
  }

  let feedBusy = false;
  let pendingAfter = null;
  function runAfter() {
    const f = pendingAfter;
    pendingAfter = null;
    if (f) f();
  }
  // 먹이가 버튼에서 펫 입가로 포물선처럼 날아간다
  function flyFood(emoji, fromId, onArrive) {
    const fromEl = $(fromId), toEl = $('pet-svg');
    if (!fromEl || !toEl) { onArrive(); return; }
    const from = fromEl.getBoundingClientRect();
    const to = toEl.getBoundingClientRect();
    const s = document.createElement('span');
    s.className = 'pet-fly';
    s.textContent = emoji;
    s.style.left = (from.left + from.width / 2) + 'px';
    s.style.top = from.top + 'px';
    document.body.appendChild(s);
    requestAnimationFrame(() => {
      const dx = (to.left + to.width / 2) - (from.left + from.width / 2);
      const dy = (to.top + to.height * 0.62) - from.top;
      s.style.transform = 'translate(' + dx + 'px,' + dy + 'px) scale(.5)';
      s.style.opacity = '0';
    });
    setTimeout(() => { s.remove(); onArrive(); }, 520);
  }

  /* ─────────── 도감 ─────────── */
  function openBook() {
    sfxTap();
    const grid = $('pet-book-grid');
    grid.innerHTML = '';
    SPECIES.forEach(sp => {
      const got = state.collection.filter(c => c.sp === sp.id);
      const isCur = state.species === sp.id;
      const cell = document.createElement('div');
      cell.className = 'pet-book-cell' + (got.length || isCur ? ' got' : '');
      cell.innerHTML =
        '<span class="pb-emoji">' + (got.length || isCur ? sp.e : '❓') + '</span>' +
        '<span class="pb-name">' + (got.length ? got[0].name : isCur ? petName() + ' (키우는 중)' : '???') + '</span>';
      if (got.length || isCur) {
        cell.addEventListener('click', () => { sfxTap(); speak(sp.name + ', ' + (got.length ? got[0].name : petName()) + '!'); });
      }
      grid.appendChild(cell);
    });
    $('pet-book-overlay').classList.add('on');
    speak('펫 도감! ' + state.collection.length + '마리를 다 키웠어요.');
  }

  let toastTimer = null;
  function toast(msg) {
    const el = $('pet-toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('on'), 2200);
  }

  function award(kind, n) {
    if (kind === 'meal') state.meals += n;
    else state.snacks += n;
    save();
    render();
    toast(kind === 'meal' ? '🍚 펫 식사가 생겼어요!' : '🍪 펫 간식이 생겼어요!');
  }

  function mount() {
    if (mounted) return;
    mounted = true;
    html();
    if (window.PetAvatar) { // SVG 캐릭터 장착 (없으면 이모지 안전망)
      av = PetAvatar.create($('pet-svg'));
      av.stopIdle(); // 잔동작은 펫 화면이 열려 있는 동안만 (open/close에서 켜고 끈다)
      $('pet-svg').addEventListener('click', petTouch); // 만지면 좋아한다
    }
    const slot = $('pet-slot');
    btn = document.createElement('button');
    btn.type = 'button';
    btn.className = slot ? 'pet-btn' : 'pet-btn pet-fab';
    btn.setAttribute('aria-label', '내 펫');
    btn.innerHTML = '<span class="pet-btn-emoji"></span><b class="pet-badge"></b>';
    btn.addEventListener('click', ev => { ev.preventDefault(); open(); });
    if (slot) slot.appendChild(btn);
    else document.body.appendChild(btn);

    $('pet-close').addEventListener('click', close);
    $('pet-overlay').addEventListener('click', ev => { if (ev.target.id === 'pet-overlay') close(); });
    $('pet-feed-meal').addEventListener('click', () => feed('meal'));
    $('pet-feed-snack').addEventListener('click', () => feed('snack'));
    $('pet-rename').addEventListener('click', openNamePicker);
    $('pet-name-ok').addEventListener('click', () => setName($('pet-name-input').value));
    $('pet-name-close').addEventListener('click', closeNamePicker);
    $('pet-name-overlay').addEventListener('click', ev => {
      if (ev.target.id === 'pet-name-overlay') closeNamePicker();
    });
    $('pet-med').addEventListener('click', heal); // 🍵 약 — 한 번이면 낫는다
    $('pet-book-btn').addEventListener('click', openBook);
    $('pet-book-close').addEventListener('click', () => $('pet-book-overlay').classList.remove('on'));
    $('pet-book-overlay').addEventListener('click', ev => {
      if (ev.target.id === 'pet-book-overlay') $('pet-book-overlay').classList.remove('on');
    });
    // 방 꾸미기 — 자리를 탭하면 고르기 판
    document.querySelectorAll('#pet-room .pet-deco-slot').forEach(el => {
      el.addEventListener('click', () => openDecoPicker(el.getAttribute('data-slot')));
    });
    $('pet-deco-close').addEventListener('click', closeDecoPicker);
    $('pet-deco-overlay').addEventListener('click', ev => {
      if (ev.target.id === 'pet-deco-overlay') closeDecoPicker();
    });
    render();
  }

  // 스크립트가 body 끝에서 로드되므로 바로 붙인다
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();

  return {
    awardSnack(n) { award('snack', n || 1); },
    awardMeal(n) { award('meal', n || 1); },
    open,
    // 종단 테스트용 — 도감 친구 하나가 간식을 조르게 한다 (원래는 방을 열 때 확률)
    forceBeg() {
      if (!minis.length) return false;
      endBeg();
      startBeg(minis[0]);
      return true;
    },
    // 부모님 페이지의 "펫 지금 다 낫게 하기" — 나쁜 상태만 싹 지운다 (성장·도감은 그대로)
    healAll() {
      state.poop = 0;
      state.sick = false;
      state.hunger = HUNGER_MAX;
      state.mood = MOOD_MAX;
      save();
      render();
    },
    // 종단 테스트용 — 마지막 방문 시각만 바꾼다 (연출 없음)
    _setLastSeen(ms) { state.lastSeen = Number(ms) || 0; save(); },
    // 종단 테스트용
    state: () => ({
      g: state.g, meals: state.meals, snacks: state.snacks,
      species: state.species, name: petName(), fed: state.fed,
      stage: stageName(), collection: state.collection.length, accOwned: state.accOwned.length,
      decoOwned: state.decoOwned.length,
      decoPlaced: Object.keys(state.deco).filter(k => state.deco[k]).length,
      begging: !!begMini,
      hunger: state.hunger, mood: state.mood, poop: state.poop, sick: state.sick,
      streak: state.streak, shield: state.shield, todo: todoCount(),
    }),
  };
})();
