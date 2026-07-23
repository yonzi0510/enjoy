/* 꼬치 가게 데이터 — 재료 14종(분식 5 · 과일 5 · 색깔 경단 4)과 미션 30개(단계별 10).
 * 각 미션은 세로 꼬치 스틱에 아래에서 위로 꿰는 재료 순서(seq)다. 빵 같은 시작/끝 규칙은 없다.
 * 난이도는 "반복 패턴"으로 준다: 1단계=반복 없는 순서, 2단계=간단 반복(AB·ABAB), 3단계=긴 반복(ABCABC·AABB 등).
 * 재료 그림은 인라인 SVG(외부 이미지 금지). node 검증에서도 문자열만 다루므로 안전하다.
 * ⚠️ 재료 id·미션 id·순서는 아이 진행도(done 키)가 id로 저장되므로 함부로 바꾸지 않는다.
 *
 * ※ 재료 수 메모: 요구 목록(분식5+과일5+경단4)을 그대로 담아 총 14종이다.
 *   (기획 머리말의 "13종"은 목록 합(=14)과 어긋나 목록을 따랐다 — 검증기는 5/5/4 = 14를 계약으로 검사한다.)
 */
window.KkochiData = (() => {

  /* 그라데이션 id 충돌을 막는 uid (한 재료를 카드·스틱·트레이에 여러 번 그린다) */
  let _uid = 0;
  const nextUid = () => 'k' + (_uid++);

  /* ─────────── 재료 14종 ───────────
   * cat: '분식' · '과일' · '경단'  (전부 스틱에 꿰는 알 — 역할 구분은 없다)
   * h: SVG 세로 비율(가로 140 기준)
   * 각 draw(uid)는 세로 스틱이 관통하는 알 모양 <svg> 문자열을 돌려준다 (width 100%). */
  const ING = {

    /* ── 분식 5 ── */
    /* 어묵 — 물결치는 갈색 어묵을 접어 꿴 모양 */
    eomuk: { name: '어묵', say: '어묵', cat: '분식', h: 34, draw(u){ return `
      <svg viewBox="0 0 140 34" width="100%" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
        <defs><linearGradient id="${u}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#E6BB86"/><stop offset=".5" stop-color="#CE9455"/><stop offset="1" stop-color="#A9702F"/>
        </linearGradient></defs>
        <path d="M14,8 Q26,2 40,8 Q54,14 70,8 Q86,2 100,8 Q114,14 126,8 L126,26 Q114,32 100,26 Q86,20 70,26 Q54,32 40,26 Q26,20 14,26 Z" fill="url(#${u})"/>
        <path d="M16,11 Q40,5 70,11 Q100,5 124,11" fill="none" stroke="#F1D5AC" stroke-width="2.4" stroke-linecap="round" opacity=".8"/>
        <path d="M16,22 Q40,28 70,22 Q100,28 124,22" fill="none" stroke="#8A5A24" stroke-width="1.8" stroke-linecap="round" opacity=".5"/>
      </svg>`; } },

    /* 소시지 — 반들반들 빨간 소시지 캡슐 */
    sausage: { name: '소시지', say: '소시지', cat: '분식', h: 40, draw(u){ return `
      <svg viewBox="0 0 140 40" width="100%" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
        <defs><linearGradient id="${u}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#EE6B54"/><stop offset=".5" stop-color="#D8442F"/><stop offset="1" stop-color="#AE2C1B"/>
        </linearGradient></defs>
        <rect x="34" y="3" width="72" height="34" rx="17" fill="url(#${u})"/>
        <rect x="42" y="8" width="14" height="24" rx="7" fill="#F7A492" opacity=".75"/>
        <path d="M56,6 q14,-2 30,0 M56,34 q14,2 30,0" fill="none" stroke="#8E2214" stroke-width="1.6" opacity=".5"/>
      </svg>`; } },

    /* 떡 — 뽀얀 흰 가래떡 원기둥 */
    tteok: { name: '떡', say: '떡', cat: '분식', h: 38, draw(u){ return `
      <svg viewBox="0 0 140 38" width="100%" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
        <defs><linearGradient id="${u}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#FFFFFF"/><stop offset=".55" stop-color="#F4ECE4"/><stop offset="1" stop-color="#DFD1C4"/>
        </linearGradient></defs>
        <rect x="36" y="4" width="68" height="30" rx="15" fill="url(#${u})"/>
        <rect x="44" y="8" width="12" height="22" rx="6" fill="#FFFFFF" opacity=".85"/>
        <ellipse cx="70" cy="19" rx="30" ry="12" fill="none" stroke="#E4D6C8" stroke-width="1.4" opacity=".6"/>
      </svg>`; } },

    /* 만두 — 노릇한 만두, 위에 주름 */
    mandu: { name: '만두', say: '만두', cat: '분식', h: 36, draw(u){ return `
      <svg viewBox="0 0 140 36" width="100%" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
        <defs><radialGradient id="${u}" cx=".5" cy=".7" r=".7"><stop offset="0" stop-color="#F5E4C0"/><stop offset="1" stop-color="#D9B87E"/></radialGradient></defs>
        <path d="M22,30 Q18,14 40,11 Q54,4 70,10 Q86,4 100,11 Q122,14 118,30 Q94,34 70,32 Q46,34 22,30 Z" fill="url(#${u})"/>
        <g fill="none" stroke="#B98F4E" stroke-width="2" stroke-linecap="round" opacity=".7">
          <path d="M40,13 q4,-6 8,0"/><path d="M56,10 q4,-6 8,0"/><path d="M72,10 q4,-6 8,0"/><path d="M88,13 q4,-6 8,0"/>
        </g>
        <ellipse cx="60" cy="24" rx="20" ry="4" fill="#FFF3DA" opacity=".5"/>
      </svg>`; } },

    /* 감자 — 동글동글 노란 감자 튀김 */
    gamja: { name: '감자', say: '감자', cat: '분식', h: 34, draw(u){ return `
      <svg viewBox="0 0 140 34" width="100%" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
        <defs><radialGradient id="${u}" cx=".42" cy=".38" r=".68"><stop offset="0" stop-color="#FBD968"/><stop offset=".7" stop-color="#EDB13A"/><stop offset="1" stop-color="#C98A1E"/></radialGradient></defs>
        <path d="M70,3 Q92,2 100,10 Q114,14 112,24 Q112,32 96,32 Q80,34 70,31 Q58,34 44,32 Q28,32 28,22 Q26,13 40,10 Q48,2 70,3 Z" fill="url(#${u})"/>
        <g fill="#C98A1E" opacity=".5"><circle cx="52" cy="16" r="2"/><circle cx="82" cy="14" r="2.2"/><circle cx="70" cy="24" r="1.8"/><circle cx="94" cy="22" r="1.8"/></g>
        <ellipse cx="56" cy="12" rx="14" ry="5" fill="#FFF0BE" opacity=".6"/>
      </svg>`; } },

    /* ── 과일 5 ── */
    /* 딸기 — 빨간 딸기, 씨와 초록 꼭지 */
    ttalgi: { name: '딸기', say: '딸기', cat: '과일', h: 40, draw(u){ return `
      <svg viewBox="0 0 140 40" width="100%" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
        <defs><radialGradient id="${u}" cx=".5" cy=".35" r=".72"><stop offset="0" stop-color="#FF6E77"/><stop offset=".7" stop-color="#E63946"/><stop offset="1" stop-color="#B8202F"/></radialGradient></defs>
        <path d="M70,9 Q104,9 104,20 Q104,34 70,38 Q36,34 36,20 Q36,9 70,9 Z" fill="url(#${u})"/>
        <g fill="#FFE07A"><ellipse cx="56" cy="18" rx="2" ry="3"/><ellipse cx="70" cy="16" rx="2" ry="3"/><ellipse cx="84" cy="18" rx="2" ry="3"/><ellipse cx="62" cy="26" rx="2" ry="3"/><ellipse cx="78" cy="26" rx="2" ry="3"/><ellipse cx="70" cy="32" rx="2" ry="3"/></g>
        <path d="M56,10 Q62,2 70,7 Q78,2 84,10 Q76,13 70,11 Q64,13 56,10 Z" fill="#5FB84B" stroke="#3E8F2E" stroke-width="1"/>
      </svg>`; } },

    /* 바나나 — 부드러운 바나나 조각 */
    banana: { name: '바나나', say: '바나나', cat: '과일', h: 34, draw(u){ return `
      <svg viewBox="0 0 140 34" width="100%" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
        <defs><linearGradient id="${u}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFE785"/><stop offset="1" stop-color="#F2C63E"/></linearGradient></defs>
        <ellipse cx="70" cy="17" rx="40" ry="14" fill="url(#${u})"/>
        <ellipse cx="70" cy="17" rx="30" ry="9" fill="#FFF1B8" opacity=".7"/>
        <g fill="#D9A82E" opacity=".55"><circle cx="70" cy="17" r="1.8"/><path d="M62,17 h16" stroke="#D9A82E" stroke-width="1.2"/></g>
        <ellipse cx="58" cy="12" rx="12" ry="3.5" fill="#FFFBE0" opacity=".7"/>
      </svg>`; } },

    /* 포도 — 보라색 포도 알뭉치 */
    podo: { name: '포도', say: '포도', cat: '과일', h: 38, draw(u){ return `
      <svg viewBox="0 0 140 38" width="100%" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
        <defs><radialGradient id="${u}" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#A970D8"/><stop offset="1" stop-color="#6A3AA0"/></radialGradient></defs>
        <g>
          <circle cx="52" cy="14" r="9" fill="url(#${u})"/><circle cx="70" cy="12" r="9" fill="url(#${u})"/><circle cx="88" cy="14" r="9" fill="url(#${u})"/>
          <circle cx="60" cy="24" r="9" fill="url(#${u})"/><circle cx="80" cy="24" r="9" fill="url(#${u})"/>
          <circle cx="70" cy="32" r="8.5" fill="url(#${u})"/>
        </g>
        <g fill="#DCC0F0" opacity=".8"><circle cx="49" cy="11" r="2.4"/><circle cx="67" cy="9" r="2.4"/><circle cx="57" cy="21" r="2.2"/></g>
      </svg>`; } },

    /* 키위 — 초록 단면에 검은 씨 */
    kiwi: { name: '키위', say: '키위', cat: '과일', h: 34, draw(u){ return `
      <svg viewBox="0 0 140 34" width="100%" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
        <defs><radialGradient id="${u}" cx=".5" cy=".5" r=".55"><stop offset="0" stop-color="#EAF3C6"/><stop offset=".55" stop-color="#A8CE5E"/><stop offset="1" stop-color="#7FA83F"/></radialGradient></defs>
        <ellipse cx="70" cy="17" rx="34" ry="16" fill="#8A6A2E"/>
        <ellipse cx="70" cy="17" rx="31" ry="14" fill="url(#${u})"/>
        <circle cx="70" cy="17" r="5" fill="#F3F7DE"/>
        <g fill="#3A2E22"><circle cx="70" cy="7" r="1.3"/><circle cx="82" cy="11" r="1.3"/><circle cx="86" cy="20" r="1.3"/><circle cx="78" cy="26" r="1.3"/><circle cx="62" cy="26" r="1.3"/><circle cx="54" cy="20" r="1.3"/><circle cx="58" cy="11" r="1.3"/></g>
      </svg>`; } },

    /* 마시멜로 — 말랑한 흰 마시멜로 (분홍빛 살짝) */
    marsh: { name: '마시멜로', say: '마시멜로', cat: '과일', h: 34, draw(u){ return `
      <svg viewBox="0 0 140 34" width="100%" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
        <defs><linearGradient id="${u}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#FCE7EE"/></linearGradient></defs>
        <rect x="38" y="5" width="64" height="26" rx="11" fill="url(#${u})"/>
        <rect x="38" y="5" width="64" height="26" rx="11" fill="none" stroke="#F3D3DE" stroke-width="1.4"/>
        <ellipse cx="60" cy="13" rx="14" ry="5" fill="#FFFFFF" opacity=".9"/>
        <path d="M38,18 h64" stroke="#F6DBE3" stroke-width="1.4" opacity=".7"/>
      </svg>`; } },

    /* ── 색깔 경단 4 (동글동글 반짝이는 구슬 경단) ── */
    'gd-red':    dango('빨강 경단', '빨강 경단', '#FF7E86', '#E23B48'),
    'gd-yellow': dango('노랑 경단', '노랑 경단', '#FFD75E', '#EDA91F'),
    'gd-green':  dango('초록 경단', '초록 경단', '#8FD46B', '#4E9E39'),
    'gd-pink':   dango('분홍 경단', '분홍 경단', '#FFA9CE', '#E86AA0'),
  };

  /* 색깔 경단 하나 만들기 — 반짝이는 구슬 */
  function dango(name, say, c0, c1) {
    return { name, say, cat: '경단', h: 32, draw(u){ return `
      <svg viewBox="0 0 140 32" width="100%" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
        <defs><radialGradient id="${u}" cx=".4" cy=".34" r=".72"><stop offset="0" stop-color="${c0}"/><stop offset="1" stop-color="${c1}"/></radialGradient></defs>
        <ellipse cx="70" cy="16" rx="24" ry="14" fill="${c1}" opacity=".35"/>
        <ellipse cx="70" cy="16" rx="22" ry="13" fill="url(#${u})"/>
        <ellipse cx="62" cy="10" rx="8" ry="4.5" fill="#FFFFFF" opacity=".65"/>
        <circle cx="80" cy="21" r="2.4" fill="#FFFFFF" opacity=".4"/>
      </svg>`; } };
  }

  const ID_LIST = Object.keys(ING);
  const CATS = { '분식': [], '과일': [], '경단': [] };
  ID_LIST.forEach(id => { if (CATS[ING[id].cat]) CATS[ING[id].cat].push(id); });
  const has = id => Object.prototype.hasOwnProperty.call(ING, id);
  const meta = id => ING[id];

  /* ─────────── 미션 30개 (단계별 10) ───────────
   * seq: 아래에서 위로 스틱에 꿰는 재료 순서.
   * 단계1(3~4알): 반복 없는 순서 — 모든 알이 서로 다르다.
   * 단계2(4~5알): 간단 반복 — AB·ABAB·ABA (알이 다시 등장하는 패턴).
   * 단계3(6~7알): 긴 반복 — ABCABC·AABBCC·ABCABCA 등. */
  const m = (level, id, seq) => ({ level, id, seq });

  const MISSIONS = [
    /* ── 단계1 — 반복 없는 순서 (3~4알, 전부 다른 알) ── */
    m(1, 'l1-a', ['eomuk', 'sausage', 'tteok']),
    m(1, 'l1-b', ['ttalgi', 'banana', 'kiwi']),
    m(1, 'l1-c', ['gd-red', 'gd-yellow', 'gd-green']),
    m(1, 'l1-d', ['mandu', 'gamja', 'podo']),
    m(1, 'l1-e', ['tteok', 'ttalgi', 'gd-pink', 'banana']),
    m(1, 'l1-f', ['sausage', 'kiwi', 'gd-green', 'mandu']),
    m(1, 'l1-g', ['podo', 'marsh', 'gd-red']),
    m(1, 'l1-h', ['eomuk', 'gamja', 'ttalgi', 'gd-yellow']),
    m(1, 'l1-i', ['banana', 'podo', 'kiwi', 'marsh']),
    m(1, 'l1-j', ['gamja', 'tteok', 'sausage']),

    /* ── 단계2 — 간단 반복 (4~5알) ── */
    m(2, 'l2-a', ['ttalgi', 'banana', 'ttalgi', 'banana']),            // ABAB
    m(2, 'l2-b', ['gd-red', 'gd-yellow', 'gd-red', 'gd-yellow']),      // ABAB
    m(2, 'l2-c', ['tteok', 'sausage', 'tteok', 'sausage']),           // ABAB
    m(2, 'l2-d', ['gd-green', 'gd-pink', 'gd-green', 'gd-pink', 'gd-green']), // ABABA
    m(2, 'l2-e', ['kiwi', 'podo', 'kiwi', 'podo']),                   // ABAB
    m(2, 'l2-f', ['eomuk', 'gamja', 'eomuk', 'gamja']),               // ABAB
    m(2, 'l2-g', ['banana', 'marsh', 'banana', 'marsh', 'banana']),   // ABABA
    m(2, 'l2-h', ['gd-yellow', 'gd-green', 'gd-yellow', 'gd-green']), // ABAB
    m(2, 'l2-i', ['mandu', 'tteok', 'mandu', 'tteok', 'mandu']),      // ABABA
    m(2, 'l2-j', ['ttalgi', 'kiwi', 'ttalgi', 'kiwi', 'ttalgi']),     // ABABA

    /* ── 단계3 — 긴 반복 (6~7알) ── */
    m(3, 'l3-a', ['gd-red', 'gd-yellow', 'gd-green', 'gd-red', 'gd-yellow', 'gd-green']),   // ABCABC
    m(3, 'l3-b', ['ttalgi', 'banana', 'kiwi', 'ttalgi', 'banana', 'kiwi']),                 // ABCABC
    m(3, 'l3-c', ['tteok', 'tteok', 'sausage', 'sausage', 'mandu', 'mandu']),               // AABBCC
    m(3, 'l3-d', ['eomuk', 'gamja', 'eomuk', 'gamja', 'eomuk', 'gamja']),                   // ABABAB
    m(3, 'l3-e', ['gd-pink', 'gd-green', 'gd-yellow', 'gd-pink', 'gd-green', 'gd-yellow', 'gd-pink']), // ABCABCA
    m(3, 'l3-f', ['podo', 'kiwi', 'marsh', 'podo', 'kiwi', 'marsh']),                       // ABCABC
    m(3, 'l3-g', ['banana', 'banana', 'ttalgi', 'ttalgi', 'kiwi', 'kiwi']),                 // AABBCC
    m(3, 'l3-h', ['sausage', 'tteok', 'mandu', 'sausage', 'tteok', 'mandu', 'sausage']),    // ABCABCA
    m(3, 'l3-i', ['gd-red', 'gd-yellow', 'gd-red', 'gd-green', 'gd-red', 'gd-yellow']),     // ABACAB (gd-red 반복)
    m(3, 'l3-j', ['ttalgi', 'gd-pink', 'banana', 'ttalgi', 'gd-pink', 'banana', 'ttalgi']), // ABCABCA
  ];

  const LEVELS = [
    { id: 1, icon: '🍢', name: '쉬운 꼬치',  desc: '순서대로 꿰기',   cls: 'c-l1', extra: 2 },
    { id: 2, icon: '🍢', name: '반복 꼬치',  desc: '반복을 이어 꿰기', cls: 'c-l2', extra: 2 },
    { id: 3, icon: '🍢', name: '긴 반복 꼬치', desc: '긴 반복 잇기',    cls: 'c-l3', extra: 3 },
  ];
  const levelDef = id => LEVELS.find(l => l.id === id);
  const missionsOf = level => MISSIONS.filter(x => x.level === level);
  const missionById = id => MISSIONS.find(x => x.id === id) || null;

  const praises = ['우와, 꼬치 완성!', '맛있겠다! 참 잘했어요!', '순서대로 다 꿰었어요!', '멋진 요리사네요!', '냠냠! 최고예요!'];

  return {
    ING, ID_LIST, CATS, has, meta,
    MISSIONS, LEVELS, levelDef, missionsOf, missionById, praises,
  };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = window.KkochiData;
