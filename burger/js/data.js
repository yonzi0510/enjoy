/* 햄버거 가게 데이터 — 재료 12종(빵 2 + 속재료 10)과 미션 30개(단계별 10).
 * 각 미션은 "아래빵으로 시작 → 속재료 → 윗빵으로 끝"의 유효한 쌓기 순서.
 * 재료 그림은 인라인 SVG(외부 이미지 금지). node 검증에서도 문자열만 다루므로 안전하다.
 * ⚠️ 재료 id·미션 id·순서는 아이 진행도(done 키)가 id로 저장되므로 함부로 바꾸지 않는다.
 */
window.BurgerData = (() => {

  /* 그라데이션 등 id 충돌을 막는 uid 카운터 (한 재료를 카드·꼬치·트레이에 여러 번 그린다) */
  let _uid = 0;
  const nextUid = () => 'b' + (_uid++);

  /* ─────────── 재료 12종 ───────────
   * role: 'bottom' 아래빵 · 'top' 윗빵 · 'fill' 속재료
   * h: SVG 세로 비율(가로 140 기준) — 꼬치에 쌓을 때 층 두께로 쓴다
   * 각 draw(uid)는 <svg> 문자열을 돌려준다 (width 100%, viewBox 0 0 140 h) */
  const ING = {

    /* 아래빵 — 위는 부드러운 빵살(크림빛 단면), 아래·옆은 노릇한 크러스트 */
    'bun-bottom': { name: '아래빵', say: '아래 빵', role: 'bottom', h: 46, draw(u){ return `
      <svg viewBox="0 0 140 46" width="100%" preserveAspectRatio="xMidYMax meet" xmlns="http://www.w3.org/2000/svg">
        <defs><linearGradient id="${u}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#F6C883"/><stop offset=".55" stop-color="#E3A24E"/><stop offset="1" stop-color="#CE8734"/>
        </linearGradient></defs>
        <path d="M8,22 C8,10 30,8 70,8 C110,8 132,10 132,22 L132,30 C132,42 116,44 70,44 C24,44 8,42 8,30 Z" fill="url(#${u})"/>
        <path d="M8,22 C8,10 30,8 70,8 C110,8 132,10 132,22 C132,29 108,32 70,32 C32,32 8,29 8,22 Z" fill="#FBE7BF"/>
        <ellipse cx="70" cy="20" rx="56" ry="8" fill="#FFF3DC" opacity=".7"/>
        <path d="M14,30 C40,36 100,36 126,30" fill="none" stroke="#B9752A" stroke-width="2.4" stroke-linecap="round" opacity=".45"/>
      </svg>`; } },

    /* 윗빵 — 둥근 돔에 참깨. 아래는 평평한 단면 */
    'bun-top': { name: '윗빵', say: '윗 빵', role: 'top', h: 56, draw(u){ return `
      <svg viewBox="0 0 140 56" width="100%" preserveAspectRatio="xMidYMin meet" xmlns="http://www.w3.org/2000/svg">
        <defs><linearGradient id="${u}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#F8CD86"/><stop offset=".6" stop-color="#E7A950"/><stop offset="1" stop-color="#D68F38"/>
        </linearGradient>
        <radialGradient id="${u}s" cx=".38" cy=".3" r=".8"><stop offset="0" stop-color="#FFF0CE" stop-opacity=".9"/><stop offset="1" stop-color="#FFF0CE" stop-opacity="0"/></radialGradient></defs>
        <path d="M6,52 C6,24 30,8 70,8 C110,8 134,24 134,52 Z" fill="url(#${u})"/>
        <ellipse cx="70" cy="52" rx="64" ry="6" fill="#E7A950"/>
        <path d="M6,52 C6,24 30,8 70,8 C110,8 134,24 134,52 Z" fill="url(#${u}s)"/>
        <g fill="#FBEFCF" stroke="#E4C88C" stroke-width=".8">
          <ellipse cx="52" cy="26" rx="5.4" ry="3.1" transform="rotate(-18 52 26)"/>
          <ellipse cx="82" cy="22" rx="5.4" ry="3.1" transform="rotate(14 82 22)"/>
          <ellipse cx="66" cy="34" rx="5.4" ry="3.1" transform="rotate(-6 66 34)"/>
          <ellipse cx="98" cy="34" rx="5.2" ry="3" transform="rotate(24 98 34)"/>
          <ellipse cx="38" cy="38" rx="5.2" ry="3" transform="rotate(-30 38 38)"/>
          <ellipse cx="112" cy="42" rx="5" ry="2.9" transform="rotate(16 112 42)"/>
          <ellipse cx="28" cy="44" rx="4.8" ry="2.8" transform="rotate(-10 28 44)"/>
        </g>
      </svg>`; } },

    /* 패티 — 두툼한 갈색 고기, 도톨한 윗면과 결 */
    patty: { name: '패티', say: '패티', role: 'fill', h: 40, draw(u){ return `
      <svg viewBox="0 0 140 40" width="100%" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
        <defs><linearGradient id="${u}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#7E4E2C"/><stop offset=".5" stop-color="#61391F"/><stop offset="1" stop-color="#432615"/>
        </linearGradient></defs>
        <path d="M6,20 C6,10 30,7 70,7 C110,7 134,10 134,20 C134,31 110,35 70,35 C30,35 6,31 6,20 Z" fill="url(#${u})"/>
        <path d="M10,15 C34,10 106,10 130,15 C110,13 30,13 10,15 Z" fill="#9A6238" opacity=".7"/>
        <g fill="#3A2113" opacity=".55">
          <ellipse cx="42" cy="22" rx="4" ry="2"/><ellipse cx="72" cy="26" rx="4.6" ry="2.2"/>
          <ellipse cx="100" cy="21" rx="4" ry="2"/><ellipse cx="58" cy="18" rx="3" ry="1.6"/><ellipse cx="88" cy="29" rx="3.4" ry="1.7"/>
        </g>
        <ellipse cx="60" cy="14" rx="30" ry="3" fill="#B37A48" opacity=".4"/>
      </svg>`; } },

    /* 치즈 — 반짝이는 노란 슬라이스, 흘러내린 모서리와 구멍 */
    cheese: { name: '치즈', say: '치즈', role: 'fill', h: 26, draw(u){ return `
      <svg viewBox="0 0 140 26" width="100%" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
        <defs><linearGradient id="${u}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#FFD64C"/><stop offset="1" stop-color="#F2A828"/>
        </linearGradient></defs>
        <path d="M6,6 Q6,3 10,3 H130 Q134,3 134,6 V11 Q134,14 130,14 Q120,26 112,20 Q106,15 98,20 Q92,25 86,19 Q82,14 74,17 Q70,19 60,14 L14,14 Q6,14 6,10 Z" fill="url(#${u})"/>
        <rect x="8" y="4.4" width="120" height="3.2" rx="1.6" fill="#FFEB9E" opacity=".85"/>
        <circle cx="40" cy="10" r="2.2" fill="#E79521"/><circle cx="96" cy="9" r="1.8" fill="#E79521"/>
      </svg>`; } },

    /* 토마토 — 빨간 슬라이스, 연한 속살과 씨 */
    tomato: { name: '토마토', say: '토마토', role: 'fill', h: 28, draw(u){ return `
      <svg viewBox="0 0 140 28" width="100%" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
        <defs><radialGradient id="${u}" cx=".5" cy=".45" r=".62"><stop offset="0" stop-color="#F58A72"/><stop offset=".7" stop-color="#E85742"/><stop offset="1" stop-color="#CE3B2C"/></radialGradient></defs>
        <ellipse cx="70" cy="14" rx="64" ry="12.5" fill="url(#${u})"/>
        <ellipse cx="70" cy="14" rx="52" ry="9" fill="#F4A48F" opacity=".55"/>
        <g fill="#F7D9A6" stroke="#E9B877" stroke-width=".6">
          <ellipse cx="46" cy="14" rx="3" ry="4.4"/><ellipse cx="70" cy="9.5" rx="3" ry="4.2"/>
          <ellipse cx="94" cy="14" rx="3" ry="4.4"/><ellipse cx="70" cy="18.5" rx="3" ry="4.2"/>
          <ellipse cx="58" cy="11" rx="2.6" ry="3.6"/><ellipse cx="82" cy="17" rx="2.6" ry="3.6"/>
        </g>
        <ellipse cx="70" cy="14" rx="6" ry="4" fill="#F7C9B4" opacity=".6"/>
      </svg>`; } },

    /* 양상추 — 초록 물결 잎, 잎맥 */
    lettuce: { name: '양상추', say: '양상추', role: 'fill', h: 30, draw(u){ return `
      <svg viewBox="0 0 140 30" width="100%" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
        <defs><linearGradient id="${u}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#A6DC63"/><stop offset="1" stop-color="#6FB233"/></linearGradient></defs>
        <path d="M4,20 Q10,6 22,12 Q30,4 42,12 Q52,3 64,12 Q74,4 86,12 Q98,3 110,12 Q122,5 132,12 Q140,16 134,24 Q120,30 92,27 Q70,31 44,27 Q20,31 6,26 Q0,22 4,20 Z" fill="url(#${u})"/>
        <path d="M14,20 Q30,15 46,20 M52,21 Q70,15 88,21 M96,20 Q112,15 126,20" fill="none" stroke="#C6EA95" stroke-width="2" stroke-linecap="round" opacity=".8"/>
        <path d="M8,22 Q40,27 70,25 Q104,27 132,21" fill="none" stroke="#5B9A28" stroke-width="1.6" opacity=".5"/>
      </svg>`; } },

    /* 양파 — 보라빛 링 슬라이스 */
    onion: { name: '양파', say: '양파', role: 'fill', h: 24, draw(u){ return `
      <svg viewBox="0 0 140 24" width="100%" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
        <defs><linearGradient id="${u}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F3E5F1"/><stop offset="1" stop-color="#DFC7DC"/></linearGradient></defs>
        <ellipse cx="70" cy="12" rx="64" ry="10.5" fill="url(#${u})"/>
        <ellipse cx="70" cy="12" rx="64" ry="10.5" fill="none" stroke="#B478AE" stroke-width="2.4"/>
        <ellipse cx="70" cy="12" rx="52" ry="7.6" fill="none" stroke="#C99BC6" stroke-width="2"/>
        <ellipse cx="70" cy="12" rx="40" ry="5.2" fill="none" stroke="#D9B6D6" stroke-width="1.8"/>
        <ellipse cx="70" cy="12" rx="27" ry="3.2" fill="none" stroke="#E7CFE5" stroke-width="1.6"/>
        <ellipse cx="70" cy="9" rx="46" ry="2.4" fill="#FFFFFF" opacity=".5"/>
      </svg>`; } },

    /* 계란 프라이 — 흰자 물결 + 노른자 */
    egg: { name: '계란', say: '계란 프라이', role: 'fill', h: 34, draw(u){ return `
      <svg viewBox="0 0 140 34" width="100%" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
        <defs><radialGradient id="${u}" cx=".5" cy=".4" r=".6"><stop offset="0" stop-color="#FFCF48"/><stop offset="1" stop-color="#F5A623"/></radialGradient></defs>
        <path d="M18,18 Q10,6 26,8 Q34,0 48,8 Q60,2 74,8 Q92,2 108,10 Q126,8 128,20 Q134,30 116,29 Q96,34 72,30 Q44,34 26,29 Q10,28 18,18 Z" fill="#FFFDF4"/>
        <path d="M18,18 Q10,6 26,8 Q34,0 48,8 Q60,2 74,8 Q92,2 108,10 Q126,8 128,20 Q134,30 116,29 Q96,34 72,30 Q44,34 26,29 Q10,28 18,18 Z" fill="none" stroke="#F3E6C4" stroke-width="1.2"/>
        <ellipse cx="66" cy="18" rx="16" ry="12" fill="url(#${u})"/>
        <ellipse cx="61" cy="14" rx="6" ry="4" fill="#FFE79B" opacity=".85"/>
      </svg>`; } },

    /* 피클 — 오돌토돌 초록 오이 슬라이스 */
    pickle: { name: '피클', say: '피클', role: 'fill', h: 24, draw(u){ return `
      <svg viewBox="0 0 140 24" width="100%" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
        <defs><radialGradient id="${u}" cx=".5" cy=".45" r=".6"><stop offset="0" stop-color="#B7D86A"/><stop offset="1" stop-color="#7DA83C"/></radialGradient></defs>
        <path d="M8,12 Q8,7 16,6 Q24,2 40,5 Q56,2 70,5 Q86,2 100,5 Q116,2 124,6 Q132,7 132,12 Q132,17 124,18 Q116,22 100,19 Q86,22 70,19 Q56,22 40,19 Q24,22 16,18 Q8,17 8,12 Z" fill="url(#${u})"/>
        <g fill="#DCEBA8" opacity=".85"><circle cx="44" cy="12" r="2.4"/><circle cx="70" cy="10" r="2.6"/><circle cx="96" cy="13" r="2.4"/><circle cx="58" cy="14" r="1.8"/><circle cx="84" cy="14" r="1.8"/></g>
        <path d="M14,10 Q70,5 126,10" fill="none" stroke="#5F8A2C" stroke-width="1.4" opacity=".4"/>
      </svg>`; } },

    /* 베이컨 — 물결치는 붉은 살과 지방 줄무늬 */
    bacon: { name: '베이컨', say: '베이컨', role: 'fill', h: 24, draw(u){ return `
      <svg viewBox="0 0 140 24" width="100%" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
        <defs><linearGradient id="${u}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#CF5236"/><stop offset="1" stop-color="#A5361F"/></linearGradient></defs>
        <path d="M6,10 Q22,2 40,10 Q58,18 76,10 Q94,2 112,10 Q126,16 134,10 L134,16 Q126,22 112,16 Q94,8 76,16 Q58,24 40,16 Q22,8 6,16 Z" fill="url(#${u})"/>
        <path d="M6,10 Q22,2 40,10 Q58,18 76,10 Q94,2 112,10 Q126,16 134,10" fill="none" stroke="#F0A98F" stroke-width="3" stroke-linecap="round" opacity=".9"/>
        <path d="M6,14 Q22,6 40,14 Q58,22 76,14 Q94,6 112,14 Q126,20 134,14" fill="none" stroke="#EA9077" stroke-width="2" stroke-linecap="round" opacity=".7"/>
      </svg>`; } },

    /* 햄 — 분홍 슬라이스, 살짝 마블링 */
    ham: { name: '햄', say: '햄', role: 'fill', h: 24, draw(u){ return `
      <svg viewBox="0 0 140 24" width="100%" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
        <defs><linearGradient id="${u}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F7B7C1"/><stop offset="1" stop-color="#E88497"/></linearGradient></defs>
        <ellipse cx="70" cy="12" rx="64" ry="10" fill="url(#${u})"/>
        <ellipse cx="70" cy="12" rx="64" ry="10" fill="none" stroke="#DD6E85" stroke-width="2"/>
        <g fill="#FBD6DD" opacity=".8"><ellipse cx="50" cy="10" rx="8" ry="2.4"/><ellipse cx="92" cy="14" rx="7" ry="2.2"/><ellipse cx="72" cy="9" rx="5" ry="1.8"/></g>
        <ellipse cx="66" cy="8" rx="40" ry="2" fill="#FFFFFF" opacity=".4"/>
      </svg>`; } },

    /* 아보카도 — 연둣빛 반달 슬라이스 */
    avocado: { name: '아보카도', say: '아보카도', role: 'fill', h: 26, draw(u){ return `
      <svg viewBox="0 0 140 26" width="100%" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
        <defs><linearGradient id="${u}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#C3E082"/><stop offset="1" stop-color="#9AC451"/></linearGradient></defs>
        <path d="M8,14 Q8,6 24,6 Q46,3 70,6 Q94,3 116,6 Q132,6 132,14 Q132,21 116,21 Q94,24 70,21 Q46,24 24,21 Q8,21 8,14 Z" fill="url(#${u})"/>
        <path d="M8,14 Q8,6 24,6 Q46,3 70,6 Q94,3 116,6 Q132,6 132,14 Q132,21 116,21 Q94,24 70,21 Q46,24 24,21 Q8,21 8,14 Z" fill="none" stroke="#5C8A2E" stroke-width="2.6"/>
        <path d="M14,13 Q70,8 126,13 Q70,18 14,13 Z" fill="#E4F2C4" opacity=".7"/>
      </svg>`; } },
  };

  const ID_LIST = Object.keys(ING);
  const FILLS = ID_LIST.filter(id => ING[id].role === 'fill');
  const has = id => Object.prototype.hasOwnProperty.call(ING, id);
  const meta = id => ING[id];

  /* ─────────── 미션 30개 (단계별 10) ───────────
   * layers: 아래에서 위로 쌓는 순서. [0]='bun-bottom', 마지막='bun-top'.
   * 단계1=3층(빵-속1-빵), 단계2=5층(빵-속3-빵), 단계3=7층(빵-속5-빵).
   * 속재료는 한 미션 안에서 서로 다르다(트레이 재료가 겹치지 않게). */
  const B0 = 'bun-bottom', B1 = 'bun-top';
  const m = (level, id, mids) => ({ level, id, layers: [B0, ...mids, B1] });

  const MISSIONS = [
    /* 단계1 — 3층: 속재료 하나씩 (10종 전부) */
    m(1, 'l1-patty',   ['patty']),
    m(1, 'l1-cheese',  ['cheese']),
    m(1, 'l1-tomato',  ['tomato']),
    m(1, 'l1-lettuce', ['lettuce']),
    m(1, 'l1-egg',     ['egg']),
    m(1, 'l1-bacon',   ['bacon']),
    m(1, 'l1-ham',     ['ham']),
    m(1, 'l1-onion',   ['onion']),
    m(1, 'l1-pickle',  ['pickle']),
    m(1, 'l1-avocado', ['avocado']),

    /* 단계2 — 5층: 속재료 3개 */
    m(2, 'l2-a', ['patty', 'cheese', 'tomato']),
    m(2, 'l2-b', ['patty', 'lettuce', 'onion']),
    m(2, 'l2-c', ['egg', 'ham', 'tomato']),
    m(2, 'l2-d', ['bacon', 'cheese', 'lettuce']),
    m(2, 'l2-e', ['patty', 'tomato', 'pickle']),
    m(2, 'l2-f', ['ham', 'cheese', 'avocado']),
    m(2, 'l2-g', ['egg', 'bacon', 'onion']),
    m(2, 'l2-h', ['lettuce', 'tomato', 'cheese']),
    m(2, 'l2-i', ['patty', 'egg', 'lettuce']),
    m(2, 'l2-j', ['avocado', 'tomato', 'onion']),

    /* 단계3 — 7층: 속재료 5개 */
    m(3, 'l3-a', ['patty', 'cheese', 'tomato', 'onion', 'lettuce']),
    m(3, 'l3-b', ['bacon', 'egg', 'cheese', 'tomato', 'lettuce']),
    m(3, 'l3-c', ['patty', 'ham', 'cheese', 'pickle', 'onion']),
    m(3, 'l3-d', ['egg', 'bacon', 'avocado', 'tomato', 'lettuce']),
    m(3, 'l3-e', ['patty', 'cheese', 'egg', 'onion', 'tomato']),
    m(3, 'l3-f', ['ham', 'lettuce', 'tomato', 'cheese', 'pickle']),
    m(3, 'l3-g', ['patty', 'bacon', 'cheese', 'lettuce', 'onion']),
    m(3, 'l3-h', ['avocado', 'egg', 'ham', 'tomato', 'lettuce']),
    m(3, 'l3-i', ['patty', 'tomato', 'pickle', 'cheese', 'onion']),
    m(3, 'l3-j', ['bacon', 'ham', 'egg', 'cheese', 'lettuce']),
  ];

  const LEVELS = [
    { id: 1, icon: '🍔', name: '작은 햄버거', desc: '재료 3개 쌓기', cls: 'c-l1', extra: 1 },
    { id: 2, icon: '🍔', name: '보통 햄버거', desc: '재료 5개 쌓기', cls: 'c-l2', extra: 2 },
    { id: 3, icon: '🍔', name: '왕 햄버거',   desc: '재료 7개 쌓기', cls: 'c-l3', extra: 2 },
  ];
  const levelDef = id => LEVELS.find(l => l.id === id);
  const missionsOf = level => MISSIONS.filter(x => x.level === level);
  const missionById = id => MISSIONS.find(x => x.id === id) || null;

  const praises = ['우와, 햄버거 완성!', '맛있겠다! 참 잘했어요!', '순서대로 다 쌓았어요!', '멋진 요리사네요!', '냠냠! 최고예요!'];

  return {
    ING, ID_LIST, FILLS, has, meta,
    MISSIONS, LEVELS, levelDef, missionsOf, missionById, praises,
  };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = window.BurgerData;
