/* 시계 놀이터 데이터 — 방 3개 · 단계 4개 · 판 40개 · 친구 12종 · 한국어 시각 읽기.
 *
 * ── 상태는 「총 분」 정수 하나다 ────────────────────────────────────
 * 판 하나가 가진 것은 `minutes`(0~719 정수) 뿐이다. 분침각·시침각은 이 하나에서
 * 계산해 낸다(js/clock.js). 두 바늘을 따로 적어 두면 "3시 반인데 시침이 3에 딱 붙은"
 * 실물에 없는 그림이 만들어지고, 그게 다섯 살에게 오개념을 심는다.
 *
 * ⚠️ 파생 필드를 넣지 마라 — angle·handAngle·text·answer·score.
 *    시각 읽기도 글로 적어 두지 않는다(readTime 이 만든다). tools/validate-data.js 가 막는다.
 * ⚠️ 판 id 는 아이 진행도(done 키)로 저장되므로 함부로 바꾸지 않는다.
 *
 * ── 한국어 시각 읽기 ────────────────────────────────────────────
 * **시는 순우리말**이다 — 네 시(○) / 사 시(×). "4시"를 그냥 TTS 에 넘기면 기기에 따라
 * "사 시"로 읽는다. 그래서 읽을 글자를 여기서 직접 만든다.
 * 분은 한자어(삼십오 분), 30분은 되도록 "반".
 */
window.ClockData = (() => {

  /* ─────────── 방 3개 ───────────
   * 이번 차수는 방① 만 만든다. ②③ 은 카드만 두고 「곧 만들어요」 상태다. */
  const ROOMS = [
    { id: 'cuckoo', name: '뻐꾸기 시계', desc: '시각 맞추고 새 만나기', cls: 'c-r1', ready: true },
    { id: 'wake',   name: '잠꾸러기 깨우기', desc: '곧 만들어요',        cls: 'c-r2', ready: false },
    { id: 'day',    name: '내 하루 만들기', desc: '곧 만들어요',        cls: 'c-r3', ready: false },
  ];
  const roomDef = id => ROOMS.find(r => r.id === id) || null;

  /* ─────────── 단계 4개 ───────────
   * unit = 자석이 붙는 눈금 단위(분). **5분이 상한이다** —
   * 1분 눈금은 폰에서 간격이 17px 라 다섯 살 손가락으로 못 집는다. */
  const STAGES = [
    { id: 1, unit: 60, name: '정각',  desc: '긴바늘을 12에', cls: 'c-l1' },
    { id: 2, unit: 30, name: '반',    desc: '긴바늘을 6에',  cls: 'c-l2' },
    { id: 3, unit: 15, name: '십오 분', desc: '3 · 6 · 9 · 12', cls: 'c-l3' },
    { id: 4, unit: 5,  name: '오 분',  desc: '숫자 하나씩',   cls: 'c-l4' },
  ];
  const stageDef = id => STAGES.find(s => s.id === id) || null;
  const unitOf = stage => { const s = stageDef(stage); return s ? s.unit : 1; };

  /* ─────────── 판 40개 (단계별 10) ───────────
   * b(stage, id, minutes) — minutes 는 목표 시각의 총 분(0~719).
   * 12시는 총분 0 이다. 0/360 경계를 실제로 겪는 자리라 반드시 한 판은 들어간다(s1-1).
   * 단계 안에서 시각이 겹치지 않고, 40판을 합치면 1~12시가 모두 한 번은 나온다
   * (친구 도감 12칸을 다 채울 수 있어야 한다). */
  const b = (stage, id, minutes) => ({ stage, id, minutes });

  const BOARDS = [
    /* 단계1 — 정각 (60분 단위) */
    b(1, 's1-1',  0),    // 12시 ← 0/360 경계
    b(1, 's1-2',  180),  // 3시
    b(1, 's1-3',  480),  // 8시
    b(1, 's1-4',  60),   // 1시
    b(1, 's1-5',  360),  // 6시
    b(1, 's1-6',  600),  // 10시
    b(1, 's1-7',  120),  // 2시
    b(1, 's1-8',  420),  // 7시
    b(1, 's1-9',  660),  // 11시
    b(1, 's1-10', 240),  // 4시 ← "네 시!"(순우리말) 읽기를 실제로 겪는 자리

    /* 단계2 — 반 (30분 단위) */
    b(2, 's2-1',  90),   // 1시 30분
    b(2, 's2-2',  270),  // 4시 30분
    b(2, 's2-3',  570),  // 9시 30분
    b(2, 's2-4',  150),  // 2시 30분
    b(2, 's2-5',  390),  // 6시 30분
    b(2, 's2-6',  690),  // 11시 30분
    b(2, 's2-7',  210),  // 3시 30분
    b(2, 's2-8',  480),  // 8시
    b(2, 's2-9',  330),  // 5시 30분
    b(2, 's2-10', 30),   // 12시 30분

    /* 단계3 — 십오 분 (15분 단위) */
    b(3, 's3-1',  135),  // 2시 15분
    b(3, 's3-2',  345),  // 5시 45분
    b(3, 's3-3',  555),  // 9시 15분
    b(3, 's3-4',  705),  // 11시 45분 ← 끌다 보면 12를 지난다
    b(3, 's3-5',  225),  // 3시 45분
    b(3, 's3-6',  435),  // 7시 15분
    b(3, 's3-7',  15),   // 12시 15분
    b(3, 's3-8',  645),  // 10시 45분
    b(3, 's3-9',  255),  // 4시 15분
    b(3, 's3-10', 405),  // 6시 45분

    /* 단계4 — 오 분 (5분 단위) */
    b(4, 's4-1',  65),   // 1시 5분
    b(4, 's4-2',  200),  // 3시 20분
    b(4, 's4-3',  515),  // 8시 35분
    b(4, 's4-4',  625),  // 10시 25분
    b(4, 's4-5',  350),  // 5시 50분
    b(4, 's4-6',  40),   // 12시 40분
    b(4, 's4-7',  430),  // 7시 10분
    b(4, 's4-8',  295),  // 4시 55분
    b(4, 's4-9',  560),  // 9시 20분
    b(4, 's4-10', 365),  // 6시 5분
  ];

  const boardsOf = stage => BOARDS.filter(x => x.stage === stage);
  const boardById = id => BOARDS.find(x => x.id === id) || null;

  /* 판을 열었을 때 바늘이 서 있는 자리 (목표보다 **뒤**에 두어 시계 방향으로 끌게 한다).
   * 되돌아 갈 만큼(unit 의 절반, 자석이 붙는 거리)보다 멀고 한 바퀴(60분)보다는 가깝다 —
   * 열자마자 정답이거나, 몇 바퀴를 돌려야 하는 판이 생기지 않게. */
  const START_BACK = {
    1: [40, 50, 35, 55, 45],
    2: [20, 25, 40, 35, 50],
    3: [10, 20, 25, 35, 40],
    4: [8, 12, 17, 23, 28],
  };
  function startOf(board) {
    const list = boardsOf(board.stage);
    const i = list.findIndex(x => x.id === board.id);
    const back = START_BACK[board.stage][(i < 0 ? 0 : i) % 5];
    return ((board.minutes - back) % 720 + 720) % 720;
  }

  /* ─────────── 한국어 시각 읽기 ───────────
   * 시 = 순우리말, 분 = 한자어, 30분 = 반. */
  const NATIVE_HOUR = ['열두', '한', '두', '세', '네', '다섯', '여섯', '일곱', '여덟', '아홉', '열', '열한'];
  const SINO_MIN = {
    5: '오', 10: '십', 15: '십오', 20: '이십', 25: '이십오',
    35: '삼십오', 40: '사십', 45: '사십오', 50: '오십', 55: '오십오',
  };
  const hourOf = total => Math.floor((((total % 720) + 720) % 720) / 60);
  const minuteOf = total => (((total % 60) + 60) % 60);
  const hour12 = total => { const h = hourOf(total); return h === 0 ? 12 : h; };

  // 읽을 글자 — "네 시" · "네 시 반" · "네 시 십오 분"
  function readTime(total) {
    const h = hourOf(total), m = minuteOf(total);
    const head = NATIVE_HOUR[h] + ' 시';
    if (m === 0) return head;
    if (m === 30) return head + ' 반';
    const s = SINO_MIN[m];
    return s ? head + ' ' + s + ' 분' : head;
  }
  // 화면에 크게 적는 숫자 — 2단계 이후의 목표 제시(글이 아니라 숫자다)
  function digitOf(total) {
    const m = minuteOf(total);
    return hour12(total) + ':' + (m < 10 ? '0' + m : m);
  }

  /* ─────────── 친구 12종 ───────────
   * 시각(1~12시)마다 다른 친구가 문에서 나온다. 도감 12칸이 이 차례다.
   * 이모지를 쓰지 않는다 — 기기마다 모양이 달라진다. 전부 인라인 SVG.
   * crest 0 없음 · 1 귀깃 · 2 뾰족 · 3 부채,  tail 0 짧게 · 1 길게 · 2 부채 */
  const BIRDS = [
    { h: 1,  id: 'cuckoo',  name: '뻐꾸기',   body: '#9AA7B5', belly: '#EDF2F7', wing: '#6E7C8C', beak: '#E8A33D', crest: 1, tail: 1 },
    { h: 2,  id: 'sparrow', name: '참새',     body: '#B98A5A', belly: '#F3E4CE', wing: '#8E6337', beak: '#6B5334', crest: 0, tail: 0 },
    { h: 3,  id: 'owl',     name: '부엉이',   body: '#8B6A4F', belly: '#E5D3BC', wing: '#6B4E38', beak: '#E0A040', crest: 1, tail: 0 },
    { h: 4,  id: 'chick',   name: '병아리',   body: '#F7D65A', belly: '#FFF0AE', wing: '#E4BE38', beak: '#EE8B32', crest: 2, tail: 0 },
    { h: 5,  id: 'duck',    name: '오리',     body: '#F3F1E6', belly: '#FFFFFF', wing: '#D8D4C2', beak: '#EE9A2E', crest: 0, tail: 0 },
    { h: 6,  id: 'parrot',  name: '앵무새',   body: '#6BC46A', belly: '#CBEFBE', wing: '#3E9B5B', beak: '#E8683C', crest: 3, tail: 1 },
    { h: 7,  id: 'magpie',  name: '까치',     body: '#4A4A55', belly: '#FFFFFF', wing: '#2F2F3A', beak: '#3A3A44', crest: 0, tail: 1 },
    { h: 8,  id: 'hummer',  name: '벌새',     body: '#46B6C0', belly: '#CFF0F3', wing: '#2E8C96', beak: '#5B4636', crest: 0, tail: 0 },
    { h: 9,  id: 'flamingo',name: '홍학',     body: '#F29CB8', belly: '#FFDCE6', wing: '#DE7397', beak: '#3A3A44', crest: 0, tail: 0 },
    { h: 10, id: 'peacock', name: '공작',     body: '#4A72C8', belly: '#BFD2F5', wing: '#2F51A0', beak: '#D8A23A', crest: 3, tail: 2 },
    { h: 11, id: 'dove',    name: '비둘기',   body: '#C3C8D2', belly: '#F2F4F8', wing: '#9AA1AE', beak: '#D8A23A', crest: 0, tail: 0 },
    { h: 12, id: 'pecker',  name: '딱따구리', body: '#C8503C', belly: '#F6E3D2', wing: '#93392A', beak: '#4A3A2C', crest: 2, tail: 1 },
  ];
  const birdOfHour = h12 => BIRDS[(((h12 - 1) % 12) + 12) % 12];

  /* 새 한 마리 — viewBox 0 0 100 100, 오른쪽을 본다.
   * ⚠️ transform 을 쓰지 않는다. 좌표로만 그린다(놀이판 무변형 계약). */
  function birdSVG(h12, uid) {
    const d = birdOfHour(h12);
    const u = 'bd-' + (uid || d.id);
    let crest = '';
    if (d.crest === 1) {
      crest = '<path d="M56 22 L52 10 L64 18 Z" fill="' + d.wing + '"/>' +
              '<path d="M80 22 L86 10 L74 17 Z" fill="' + d.wing + '"/>';
    } else if (d.crest === 2) {
      crest = '<path d="M66 18 L70 4 L76 19 Z" fill="' + d.wing + '"/>';
    } else if (d.crest === 3) {
      crest = '<path d="M62 18 L60 5 L67 16 Z" fill="' + d.wing + '"/>' +
              '<path d="M70 15 L71 2 L76 15 Z" fill="' + d.wing + '"/>' +
              '<path d="M78 17 L84 6 L83 19 Z" fill="' + d.wing + '"/>';
    }
    let tail = '';
    if (d.tail === 1) tail = '<path d="M26 56 L4 44 L10 62 L4 74 L26 68 Z" fill="' + d.wing + '"/>';
    else if (d.tail === 2) tail = '<path d="M28 58 L6 36 L2 60 L8 84 L28 70 Z" fill="' + d.wing + '"/>' +
                                  '<circle cx="12" cy="48" r="4" fill="' + d.body + '"/>' +
                                  '<circle cx="10" cy="70" r="4" fill="' + d.body + '"/>';
    else tail = '<path d="M28 56 L10 50 L12 70 L28 68 Z" fill="' + d.wing + '"/>';

    return '<svg viewBox="0 0 100 100" width="100%" xmlns="http://www.w3.org/2000/svg">' +
      '<defs><radialGradient id="' + u + '" cx=".42" cy=".36" r=".72">' +
        '<stop offset="0" stop-color="' + d.belly + '"/><stop offset="1" stop-color="' + d.body + '"/>' +
      '</radialGradient></defs>' +
      tail +
      '<ellipse cx="48" cy="62" rx="26" ry="22" fill="url(#' + u + ')" stroke="' + d.wing + '" stroke-width="2.4"/>' +
      '<path d="M34 58 C44 52, 58 56, 62 68 C52 74, 38 70, 34 58 Z" fill="' + d.wing + '" opacity=".85"/>' +
      crest +
      '<circle cx="70" cy="34" r="17" fill="url(#' + u + ')" stroke="' + d.wing + '" stroke-width="2.4"/>' +
      '<path d="M85 30 L98 36 L85 42 Z" fill="' + d.beak + '"/>' +
      '<circle cx="76" cy="30" r="4.4" fill="#2E2A24"/><circle cx="77.4" cy="28.6" r="1.5" fill="#fff"/>' +
      '<path d="M42 83 L40 94 M56 83 L58 94" stroke="' + d.beak + '" stroke-width="3.4" stroke-linecap="round" fill="none"/>' +
      '</svg>';
  }

  return {
    ROOMS, roomDef,
    STAGES, stageDef, unitOf,
    BOARDS, boardsOf, boardById, startOf,
    NATIVE_HOUR, SINO_MIN, hourOf, minuteOf, hour12, readTime, digitOf,
    BIRDS, birdOfHour, birdSVG,
  };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = window.ClockData;
