/* 동물 주사위 찾기 데이터 — 동물 8종과 라운드 30개(단계별 10).
 * 각 라운드는 "굴린 주사위들(dice)" 배열과 "찾을 동물(find)"을 고정 데이터로 정의한다.
 * 결정성(e2e·validate)을 위해 주사위 얼굴은 랜덤이 아니라 이 고정 배열대로 나온다.
 *   단계1: 주사위 6개 · 찾을 동물 1종
 *   단계2: 주사위 8개 · 찾을 동물 2종
 *   단계3: 주사위 9개 · 찾을 동물 2~3종
 * 동물 얼굴은 인라인 SVG(외부 이미지 금지). node 검증은 문자열만 다룬다.
 * ⚠️ 동물 id·라운드 id는 아이 진행도(done 키)가 id로 저장되므로 함부로 바꾸지 않는다.
 */
window.DiceData = (() => {

  /* ─────────── 동물 8종 ───────────
   * 각 draw(uid)는 주사위 눈에 들어갈 얼굴 <svg> 문자열(viewBox 0 0 100 100)을 돌려준다.
   * uid는 그라데이션 id 충돌을 막는다(한 동물을 카드·주사위 여러 곳에 그린다). */
  const ANIMALS = {

    /* 🐷 돼지 — 분홍 얼굴, 큰 코와 콧구멍 */
    pig: { name: '돼지', say: '돼지', emoji: '🐷', draw(u){ return `
      <svg viewBox="0 0 100 100" width="100%" xmlns="http://www.w3.org/2000/svg">
        <defs><radialGradient id="${u}" cx=".5" cy=".42" r=".62"><stop offset="0" stop-color="#FBC3D6"/><stop offset="1" stop-color="#F29CB8"/></radialGradient></defs>
        <path d="M28,30 L24,16 L40,26 Z" fill="#F29CB8" stroke="#D9739B" stroke-width="2.4" stroke-linejoin="round"/>
        <path d="M72,30 L76,16 L60,26 Z" fill="#F29CB8" stroke="#D9739B" stroke-width="2.4" stroke-linejoin="round"/>
        <circle cx="50" cy="52" r="34" fill="url(#${u})" stroke="#D9739B" stroke-width="2.6"/>
        <circle cx="38" cy="46" r="4.6" fill="#5A3242"/><circle cx="62" cy="46" r="4.6" fill="#5A3242"/>
        <ellipse cx="50" cy="62" rx="16" ry="11" fill="#EC86A8" stroke="#D9739B" stroke-width="2"/>
        <ellipse cx="44" cy="62" rx="2.8" ry="4" fill="#B85878"/><ellipse cx="56" cy="62" rx="2.8" ry="4" fill="#B85878"/>
      </svg>`; } },

    /* 🐼 판다 — 흰 얼굴, 검은 귀·눈 패치 */
    panda: { name: '판다', say: '판다', emoji: '🐼', draw(u){ return `
      <svg viewBox="0 0 100 100" width="100%" xmlns="http://www.w3.org/2000/svg">
        <defs><radialGradient id="${u}" cx=".5" cy=".42" r=".62"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#EDEDED"/></radialGradient></defs>
        <circle cx="28" cy="24" r="12" fill="#2E2E2E"/><circle cx="72" cy="24" r="12" fill="#2E2E2E"/>
        <circle cx="50" cy="52" r="34" fill="url(#${u})" stroke="#C9C9C9" stroke-width="2"/>
        <ellipse cx="37" cy="48" rx="9" ry="12" fill="#2E2E2E" transform="rotate(-16 37 48)"/>
        <ellipse cx="63" cy="48" rx="9" ry="12" fill="#2E2E2E" transform="rotate(16 63 48)"/>
        <circle cx="37" cy="49" r="3.6" fill="#fff"/><circle cx="63" cy="49" r="3.6" fill="#fff"/>
        <ellipse cx="50" cy="64" rx="5.5" ry="4" fill="#2E2E2E"/>
        <path d="M50,68 Q44,74 39,71 M50,68 Q56,74 61,71" fill="none" stroke="#7A7A7A" stroke-width="2" stroke-linecap="round"/>
      </svg>`; } },

    /* 🐱 고양이 — 주황 얼굴, 뾰족 귀, 수염 */
    cat: { name: '고양이', say: '고양이', emoji: '🐱', draw(u){ return `
      <svg viewBox="0 0 100 100" width="100%" xmlns="http://www.w3.org/2000/svg">
        <defs><radialGradient id="${u}" cx=".5" cy=".42" r=".62"><stop offset="0" stop-color="#FAC98A"/><stop offset="1" stop-color="#EFA959"/></radialGradient></defs>
        <path d="M22,44 L20,14 L46,32 Z" fill="#EFA959" stroke="#D18A38" stroke-width="2.4" stroke-linejoin="round"/>
        <path d="M78,44 L80,14 L54,32 Z" fill="#EFA959" stroke="#D18A38" stroke-width="2.4" stroke-linejoin="round"/>
        <circle cx="50" cy="54" r="32" fill="url(#${u})" stroke="#D18A38" stroke-width="2.6"/>
        <ellipse cx="38" cy="50" rx="4.4" ry="6" fill="#4A3320"/><ellipse cx="62" cy="50" rx="4.4" ry="6" fill="#4A3320"/>
        <path d="M50,60 l-4,4 h8 Z" fill="#C86A52"/>
        <path d="M50,66 Q45,71 40,69 M50,66 Q55,71 60,69" fill="none" stroke="#8A5A38" stroke-width="2" stroke-linecap="round"/>
        <path d="M22,56 h14 M22,62 h13 M78,56 h-14 M78,62 h-13" stroke="#C79355" stroke-width="1.8" stroke-linecap="round"/>
      </svg>`; } },

    /* 🐶 강아지 — 갈색 얼굴, 늘어진 귀 */
    dog: { name: '강아지', say: '강아지', emoji: '🐶', draw(u){ return `
      <svg viewBox="0 0 100 100" width="100%" xmlns="http://www.w3.org/2000/svg">
        <defs><radialGradient id="${u}" cx=".5" cy=".42" r=".62"><stop offset="0" stop-color="#E4C49B"/><stop offset="1" stop-color="#CBA073"/></radialGradient></defs>
        <ellipse cx="24" cy="46" rx="12" ry="22" fill="#9E6B3E" stroke="#7E5228" stroke-width="2.4" transform="rotate(12 24 46)"/>
        <ellipse cx="76" cy="46" rx="12" ry="22" fill="#9E6B3E" stroke="#7E5228" stroke-width="2.4" transform="rotate(-12 76 46)"/>
        <circle cx="50" cy="52" r="32" fill="url(#${u})" stroke="#B08A5E" stroke-width="2.6"/>
        <circle cx="39" cy="48" r="4.6" fill="#4A3320"/><circle cx="61" cy="48" r="4.6" fill="#4A3320"/>
        <ellipse cx="50" cy="60" rx="7" ry="5" fill="#4A3320"/>
        <path d="M50,65 v6 M50,71 Q44,74 41,70 M50,71 Q56,74 59,70" fill="none" stroke="#8A5A38" stroke-width="2" stroke-linecap="round"/>
      </svg>`; } },

    /* 🐰 토끼 — 흰 얼굴, 긴 귀(분홍 안쪽), 볼 */
    rabbit: { name: '토끼', say: '토끼', emoji: '🐰', draw(u){ return `
      <svg viewBox="0 0 100 100" width="100%" xmlns="http://www.w3.org/2000/svg">
        <defs><radialGradient id="${u}" cx=".5" cy=".45" r=".62"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#F2E4EA"/></radialGradient></defs>
        <ellipse cx="38" cy="26" rx="8" ry="22" fill="#FFF4F8" stroke="#E6A9C2" stroke-width="2.4" transform="rotate(-10 38 26)"/>
        <ellipse cx="62" cy="26" rx="8" ry="22" fill="#FFF4F8" stroke="#E6A9C2" stroke-width="2.4" transform="rotate(10 62 26)"/>
        <ellipse cx="38" cy="26" rx="3.4" ry="14" fill="#FBB9D0" transform="rotate(-10 38 26)"/>
        <ellipse cx="62" cy="26" rx="3.4" ry="14" fill="#FBB9D0" transform="rotate(10 62 26)"/>
        <circle cx="50" cy="56" r="30" fill="url(#${u})" stroke="#E6A9C2" stroke-width="2.4"/>
        <circle cx="39" cy="53" r="4.4" fill="#5A3242"/><circle cx="61" cy="53" r="4.4" fill="#5A3242"/>
        <ellipse cx="32" cy="61" rx="6" ry="4" fill="#FBC0D5" opacity=".8"/><ellipse cx="68" cy="61" rx="6" ry="4" fill="#FBC0D5" opacity=".8"/>
        <path d="M50,60 l-3,3 h6 Z" fill="#EC86A8"/>
      </svg>`; } },

    /* 🐻 곰 — 갈색 얼굴, 둥근 귀, 주둥이 */
    bear: { name: '곰', say: '곰', emoji: '🐻', draw(u){ return `
      <svg viewBox="0 0 100 100" width="100%" xmlns="http://www.w3.org/2000/svg">
        <defs><radialGradient id="${u}" cx=".5" cy=".42" r=".62"><stop offset="0" stop-color="#C69566"/><stop offset="1" stop-color="#A5773F"/></radialGradient></defs>
        <circle cx="26" cy="26" r="13" fill="#A5773F" stroke="#835C2C" stroke-width="2.4"/><circle cx="74" cy="26" r="13" fill="#A5773F" stroke="#835C2C" stroke-width="2.4"/>
        <circle cx="26" cy="26" r="6" fill="#C69566"/><circle cx="74" cy="26" r="6" fill="#C69566"/>
        <circle cx="50" cy="54" r="33" fill="url(#${u})" stroke="#835C2C" stroke-width="2.6"/>
        <circle cx="39" cy="49" r="4.4" fill="#3E2A16"/><circle cx="61" cy="49" r="4.4" fill="#3E2A16"/>
        <ellipse cx="50" cy="64" rx="16" ry="12" fill="#E7CFA6"/>
        <ellipse cx="50" cy="60" rx="5.5" ry="4" fill="#3E2A16"/>
        <path d="M50,64 v5" stroke="#3E2A16" stroke-width="2" stroke-linecap="round"/>
      </svg>`; } },

    /* 🐤 병아리 — 노란 얼굴, 볏 깃털, 주황 부리 */
    chick: { name: '병아리', say: '병아리', emoji: '🐤', draw(u){ return `
      <svg viewBox="0 0 100 100" width="100%" xmlns="http://www.w3.org/2000/svg">
        <defs><radialGradient id="${u}" cx=".5" cy=".42" r=".62"><stop offset="0" stop-color="#FFE27A"/><stop offset="1" stop-color="#FCC932"/></radialGradient></defs>
        <path d="M42,20 Q46,8 50,20 Q54,8 58,20 Z" fill="#FCC932" stroke="#E6A81E" stroke-width="2" stroke-linejoin="round"/>
        <circle cx="50" cy="54" r="33" fill="url(#${u})" stroke="#E6A81E" stroke-width="2.4"/>
        <circle cx="39" cy="49" r="4.8" fill="#4A3714"/><circle cx="61" cy="49" r="4.8" fill="#4A3714"/>
        <circle cx="40.5" cy="47.5" r="1.6" fill="#fff"/><circle cx="62.5" cy="47.5" r="1.6" fill="#fff"/>
        <path d="M43,60 L57,60 L50,70 Z" fill="#F2952A" stroke="#D97E18" stroke-width="1.6" stroke-linejoin="round"/>
        <ellipse cx="31" cy="60" rx="5.5" ry="3.6" fill="#F7A98F" opacity=".7"/><ellipse cx="69" cy="60" rx="5.5" ry="3.6" fill="#F7A98F" opacity=".7"/>
      </svg>`; } },

    /* 🐸 개구리 — 초록 얼굴, 위로 튀어나온 눈, 넓은 입 */
    frog: { name: '개구리', say: '개구리', emoji: '🐸', draw(u){ return `
      <svg viewBox="0 0 100 100" width="100%" xmlns="http://www.w3.org/2000/svg">
        <defs><radialGradient id="${u}" cx=".5" cy=".5" r=".62"><stop offset="0" stop-color="#A6D95C"/><stop offset="1" stop-color="#7FB93A"/></radialGradient></defs>
        <circle cx="30" cy="30" r="14" fill="url(#${u})" stroke="#5F9628" stroke-width="2.4"/>
        <circle cx="70" cy="30" r="14" fill="url(#${u})" stroke="#5F9628" stroke-width="2.4"/>
        <circle cx="30" cy="30" r="6" fill="#2E2E2E"/><circle cx="70" cy="30" r="6" fill="#2E2E2E"/>
        <circle cx="32" cy="28" r="2" fill="#fff"/><circle cx="72" cy="28" r="2" fill="#fff"/>
        <circle cx="50" cy="56" r="30" fill="url(#${u})" stroke="#5F9628" stroke-width="2.6"/>
        <path d="M28,58 Q50,74 72,58" fill="none" stroke="#4E7E22" stroke-width="3" stroke-linecap="round"/>
        <circle cx="38" cy="56" r="2.4" fill="#4E7E22"/><circle cx="62" cy="56" r="2.4" fill="#4E7E22"/>
      </svg>`; } },
  };

  const ID_LIST = Object.keys(ANIMALS);
  const has = id => Object.prototype.hasOwnProperty.call(ANIMALS, id);
  const meta = id => ANIMALS[id];

  /* ─────────── 라운드 30개 (단계별 10) ───────────
   * r(level, id, find[], dice[]) — dice는 굴려 나온 주사위 얼굴들(고정),
   * find는 카드가 보여줄 "찾을 동물". 정답 주사위 = dice 중 find에 든 것 전부. */
  const r = (level, id, find, dice) => ({ level, id, find, dice });

  const ROUNDS = [
    /* 단계1 — 주사위 6개, 찾을 동물 1종 */
    r(1, 'l1-1',  ['pig'],    ['pig','cat','dog','panda','pig','frog']),
    r(1, 'l1-2',  ['cat'],    ['dog','cat','bear','rabbit','chick','panda']),
    r(1, 'l1-3',  ['dog'],    ['dog','pig','dog','cat','frog','bear']),
    r(1, 'l1-4',  ['rabbit'], ['bear','rabbit','panda','cat','dog','chick']),
    r(1, 'l1-5',  ['bear'],   ['bear','frog','bear','pig','cat','rabbit']),
    r(1, 'l1-6',  ['chick'],  ['chick','dog','panda','frog','cat','bear']),
    r(1, 'l1-7',  ['frog'],   ['frog','pig','cat','frog','dog','panda']),
    r(1, 'l1-8',  ['panda'],  ['panda','bear','chick','rabbit','cat','dog']),
    r(1, 'l1-9',  ['pig'],    ['pig','panda','frog','pig','chick','bear']),
    r(1, 'l1-10', ['cat'],    ['cat','dog','rabbit','bear','cat','frog']),

    /* 단계2 — 주사위 8개, 찾을 동물 2종 */
    r(2, 'l2-1',  ['pig','cat'],     ['pig','cat','dog','panda','pig','frog','cat','bear']),
    r(2, 'l2-2',  ['dog','rabbit'],  ['dog','rabbit','bear','cat','dog','chick','panda','rabbit']),
    r(2, 'l2-3',  ['bear','chick'],  ['bear','chick','pig','frog','bear','cat','chick','dog']),
    r(2, 'l2-4',  ['frog','panda'],  ['frog','panda','cat','dog','frog','rabbit','panda','bear']),
    r(2, 'l2-5',  ['pig','rabbit'],  ['pig','rabbit','cat','bear','pig','frog','rabbit','dog']),
    r(2, 'l2-6',  ['cat','bear'],    ['cat','bear','dog','panda','cat','chick','bear','frog']),
    r(2, 'l2-7',  ['dog','chick'],   ['dog','chick','pig','cat','dog','bear','chick','panda']),
    r(2, 'l2-8',  ['panda','frog'],  ['panda','frog','rabbit','cat','panda','dog','frog','bear']),
    r(2, 'l2-9',  ['pig','bear'],    ['pig','bear','cat','dog','pig','frog','bear','chick']),
    r(2, 'l2-10', ['cat','rabbit'],  ['cat','rabbit','panda','dog','cat','bear','rabbit','frog']),

    /* 단계3 — 주사위 9개, 찾을 동물 2~3종 */
    r(3, 'l3-1',  ['pig','cat','dog'],    ['pig','cat','dog','panda','pig','frog','cat','bear','dog']),
    r(3, 'l3-2',  ['rabbit','bear'],      ['rabbit','bear','cat','dog','rabbit','chick','panda','bear','frog']),
    r(3, 'l3-3',  ['chick','frog','panda'],['chick','frog','panda','cat','chick','dog','frog','panda','bear']),
    r(3, 'l3-4',  ['pig','rabbit'],       ['pig','rabbit','cat','bear','pig','frog','rabbit','dog','panda']),
    r(3, 'l3-5',  ['cat','bear','chick'], ['cat','bear','chick','dog','cat','frog','bear','chick','pig']),
    r(3, 'l3-6',  ['dog','panda'],        ['dog','panda','pig','cat','dog','bear','rabbit','panda','frog']),
    r(3, 'l3-7',  ['pig','frog','rabbit'],['pig','frog','rabbit','cat','pig','dog','frog','rabbit','bear']),
    r(3, 'l3-8',  ['cat','dog'],          ['cat','dog','panda','bear','cat','frog','chick','dog','pig']),
    r(3, 'l3-9',  ['bear','chick','frog'],['bear','chick','frog','cat','bear','dog','chick','frog','panda']),
    r(3, 'l3-10', ['panda','pig'],        ['panda','pig','cat','dog','panda','bear','rabbit','pig','frog']),
  ];

  const LEVELS = [
    { id: 1, icon: '🎲', name: '쉬운 주사위', desc: '주사위 6개 · 1마리 찾기', cls: 'c-l1', dice: 6 },
    { id: 2, icon: '🎲', name: '보통 주사위', desc: '주사위 8개 · 2마리 찾기', cls: 'c-l2', dice: 8 },
    { id: 3, icon: '🎲', name: '어려운 주사위', desc: '주사위 9개 · 2~3마리 찾기', cls: 'c-l3', dice: 9 },
  ];
  const levelDef = id => LEVELS.find(l => l.id === id);
  const roundsOf = level => ROUNDS.filter(x => x.level === level);
  const roundById = id => ROUNDS.find(x => x.id === id) || null;

  // 라운드의 정답 주사위 인덱스(카드 동물이 실제로 나온 주사위들)
  const targetIndices = round => round.dice.map((a, i) => (round.find.indexOf(a) >= 0 ? i : -1)).filter(i => i >= 0);

  const praises = ['우와, 다 찾았어요!', '눈이 반짝반짝! 참 잘했어요!', '동물을 전부 찾았어요!', '멋진 탐정이네요!', '냠냠! 최고예요!'];

  return {
    ANIMALS, ID_LIST, has, meta,
    ROUNDS, LEVELS, levelDef, roundsOf, roundById, targetIndices, praises,
  };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = window.DiceData;
