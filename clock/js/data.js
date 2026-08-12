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
   * 셋 다 열려 있다. ①은 시각을 「읽고 맞추는」 방, ②는 「맞춰 두고 기다리는」 방,
   * ③은 「정답이 없는」 방이다. 방마다 성격이 달라야 아이가 셋을 다 돈다. */
  const ROOMS = [
    { id: 'cuckoo', name: '뻐꾸기 시계', desc: '시각 맞추고 새 만나기', cls: 'c-r1', ready: true },
    { id: 'wake',   name: '잠꾸러기 깨우기', desc: '알람 맞추고 깨우기', cls: 'c-r2', ready: true },
    { id: 'day',    name: '내 하루 만들기', desc: '마음대로 놓고 재생', cls: 'c-r3', ready: true },
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

  /* ══════════════════════════════════════════════════════════════════
   *                     방② ⏰ 잠꾸러기 깨우기
   * ══════════════════════════════════════════════════════════════════
   * 자는 친구가 그림 카드를 놓고 "나 일곱 시에 깨워 줘" 한다. 아이는 알람 바늘을
   * 맞추고 큰 단추를 누른다 — 밤이 되고 바늘이 째깍째깍 돌다가 알람 자리에 닿으면 따르릉.
   *
   * ⚠️ **틀린 시각이 없다.** 카드와 다른 시각에 맞춰도 알람은 울리고 친구는 깨어난다.
   *    카드와 같으면 폭죽이 더 터지고 그 친구가 앨범에 들어올 뿐이다.
   *    "늦었어"·"지각이야" 같은 말은 데이터 어디에도 없다 — validate 가 낱말로 막는다.
   *
   * ── 단계를 둘만 둔 까닭 ──────────────────────────────────────────
   * 방① 은 넷(정각·반·십오 분·오 분)이지만 방② 는 **정각과 반 둘뿐**이다.
   * 여기서 아이가 하는 일은 「시각 읽기」가 아니라 「맞춰 두고 기다리기」다.
   * 한 판이 맞추기 → 단추 → 시간 흐름 → 깨어남으로 길어서, 그 위에 5분 정밀도까지
   * 얹으면 놀이의 중심이 손끝 정확도로 옮겨 간다. 잔 눈금은 방① 이 맡는다. */
  const WAKE_STAGES = [
    { id: 1, unit: 60, name: '정각', desc: '긴바늘을 12에', cls: 'c-w1' },
    { id: 2, unit: 30, name: '반',   desc: '긴바늘을 6에',  cls: 'c-w2' },
  ];
  const wakeStageDef = id => WAKE_STAGES.find(s => s.id === id) || null;
  const wakeUnitOf = stage => { const s = wakeStageDef(stage); return s ? s.unit : 1; };

  /* ─────────── 잠꾸러기 10종 ───────────
   * 이모지를 쓰지 않는다 — 전부 인라인 SVG(sleeperSVG). 얼굴·귀·색만 다르고 뼈대는 같다.
   *
   * wakes: 깨어나는 장면 4개. **차례가 곧 이야기다** —
   *   처음엔 깜짝 놀라고, 두 번째엔 미리 대비하고, 세 번째엔 아예 기다리고 있고,
   *   네 번째엔 신이 나서 논다. 같은 친구를 또 깨우는 것이 재미가 되도록.
   * say 는 **장면 대사**다. 시각을 섞지 않는다(아래 SPEECH 계약). */
  const SLEEPERS = [
    { id: 'bear', name: '곰', fur: '#B98A5A', belly: '#EFDCBE', ear: 'round', nose: '#5A4632', wakes: [
      { pose: 'jump',    say: '잘 잤다!' },
      { pose: 'ears',    say: '들었어!' },
      { pose: 'ready',   say: '따르릉!' },
      { pose: 'dance',   say: '또 만났네!' },
    ] },
    { id: 'rabbit', name: '토끼', fur: '#F2E7E4', belly: '#FFFFFF', ear: 'long', nose: '#E08FA0', wakes: [
      { pose: 'stretch', say: '쭈욱!' },
      { pose: 'jump',    say: '깜짝이야!' },
      { pose: 'ready',   say: '기다렸어!' },
      { pose: 'dance',   say: '깡충깡충!' },
    ] },
    { id: 'cat', name: '고양이', fur: '#C8A87E', belly: '#F4E7D2', ear: 'point', nose: '#D98C7A', wakes: [
      { pose: 'stretch', say: '야옹!' },
      { pose: 'ears',    say: '조용조용!' },
      { pose: 'jump',    say: '벌써야?' },
      { pose: 'ready',   say: '알고 있었어!' },
    ] },
    { id: 'dog', name: '강아지', fur: '#E0B071', belly: '#F8E7C6', ear: 'flop', nose: '#4A3A2C', wakes: [
      { pose: 'jump',    say: '멍멍!' },
      { pose: 'dance',   say: '신난다!' },
      { pose: 'ready',   say: '기다렸어!' },
      { pose: 'stretch', say: '하아암!' },
    ] },
    { id: 'panda', name: '판다', fur: '#F3F1EC', belly: '#FFFFFF', ear: 'round', nose: '#3A3A44', wakes: [
      { pose: 'stretch', say: '으음!' },
      { pose: 'ears',    say: '조금만 더!' },
      { pose: 'jump',    say: '일어났어!' },
      { pose: 'dance',   say: '데굴데굴!' },
    ] },
    { id: 'fox', name: '여우', fur: '#E2864A', belly: '#FBE7D0', ear: 'point', nose: '#4A3A2C', wakes: [
      { pose: 'jump',    say: '깨어났다!' },
      { pose: 'ready',   say: '따르릉!' },
      { pose: 'ears',    say: '살금살금!' },
      { pose: 'dance',   say: '같이 놀자!' },
    ] },
    { id: 'lion', name: '사자', fur: '#EFC05A', belly: '#FCEAC0', ear: 'mane', nose: '#6B4E38', wakes: [
      { pose: 'stretch', say: '어흥!' },
      { pose: 'jump',    say: '누구야?' },
      { pose: 'dance',   say: '멋지다!' },
      { pose: 'ready',   say: '준비 끝!' },
    ] },
    { id: 'pig', name: '돼지', fur: '#F5B9C4', belly: '#FFE0E6', ear: 'small', nose: '#E08FA0', wakes: [
      { pose: 'jump',    say: '꿀꿀!' },
      { pose: 'stretch', say: '배고파!' },
      { pose: 'ready',   say: '밥 먹자!' },
      { pose: 'dance',   say: '룰루랄라!' },
    ] },
    { id: 'frog', name: '개구리', fur: '#7CC471', belly: '#DBF2CB', ear: 'none', nose: '#3E7A44', wakes: [
      { pose: 'jump',    say: '개굴!' },
      { pose: 'dance',   say: '폴짝폴짝!' },
      { pose: 'ready',   say: '알고 있었지!' },
      { pose: 'ears',    say: '쉿쉿!' },
    ] },
    { id: 'penguin', name: '펭귄', fur: '#5B6470', belly: '#FFFFFF', ear: 'none', nose: '#E8A33D', wakes: [
      { pose: 'stretch', say: '뒤뚱!' },
      { pose: 'jump',    say: '차가워!' },
      { pose: 'dance',   say: '뒤뚱뒤뚱!' },
      { pose: 'ready',   say: '준비 끝!' },
    ] },
  ];
  const sleeperOf = id => SLEEPERS.find(s => s.id === id) || SLEEPERS[0];
  // 몇 번째로 깨우는가 → 그때의 장면. 넘치면 마지막 장면이 계속된다(줄어드는 것이 없다).
  function wakeSceneOf(palId, count) {
    const p = sleeperOf(palId);
    const i = Math.max(0, Math.min(p.wakes.length - 1, (count || 0)));
    return p.wakes[i];
  }

  /* ─────────── 방② 판 24개 (단계별 12) ───────────
   * w(stage, id, ask, pal) — ask 는 카드가 부탁한 시각(총 분).
   * 단계1 은 1~12시 정각을 한 번씩, 단계2 는 열두 시각의 「반」을 한 번씩 돈다.
   * 친구 10종이 저마다 두 번 넘게 나오도록 어긋나게 배치했다 —
   * 같은 친구를 또 만나야 두 번째·세 번째 장면을 볼 수 있다. */
  const w = (stage, id, ask, pal) => ({ stage, id, ask, pal });
  const PAL_ORDER = SLEEPERS.map(s => s.id);
  const WAKE_BOARDS = [];
  for (let i = 0; i < 12; i++) {
    const ask = ((i + 1) % 12) * 60;                 // 1시 … 11시, 12시(총분 0)
    WAKE_BOARDS.push(w(1, 'w1-' + (i + 1), ask, PAL_ORDER[i % PAL_ORDER.length]));
  }
  for (let i = 0; i < 12; i++) {
    const ask = ((i + 1) % 12) * 60 + 30;            // 1시 반 … 12시 반
    WAKE_BOARDS.push(w(2, 'w2-' + (i + 1), ask, PAL_ORDER[(i + 5) % PAL_ORDER.length]));
  }
  const wakeBoardsOf = stage => WAKE_BOARDS.filter(x => x.stage === stage);
  const wakeBoardById = id => WAKE_BOARDS.find(x => x.id === id) || null;

  /* 알람 바늘이 처음 서 있는 자리 — 방① 과 같은 규칙(부탁한 시각보다 뒤, 한 바퀴 안쪽) */
  const WAKE_BACK = { 1: [40, 50, 35, 55, 45], 2: [20, 25, 40, 35, 50] };
  function wakeStartOf(board) {
    const list = wakeBoardsOf(board.stage);
    const i = list.findIndex(x => x.id === board.id);
    const back = WAKE_BACK[board.stage][(i < 0 ? 0 : i) % 5];
    return ((board.ask - back) % 720 + 720) % 720;
  }
  /* 단추를 누르면 시계는 **알람보다 세 시간 앞**에서 출발해 알람까지 돈다.
   * 아이가 어디에 맞췄든 도는 거리가 같아서, 기다리는 시간이 늘 비슷하다.
   * (아이가 맞춘 시각에서 재는 것이지 카드 시각에서 재지 않는다 — 그래야 무벌점이다) */
  const WAKE_RUN = 180;
  const wakeRunFrom = alarmTotal => (((alarmTotal - WAKE_RUN) % 720) + 720) % 720;

  /* ══════════════════════════════════════════════════════════════════
   *                     방③ 🍚 내 하루 만들기
   * ══════════════════════════════════════════════════════════════════
   * 하루 그림 카드를 시계 둘레 열두 자리에 끌어다 놓고 ▶ 를 누르면
   * 바늘이 한 바퀴 돌며 아이가 만든 하루가 재생된다.
   *
   * ⚠️ **정답이 없다.** answer·correct·score 필드를 만들지 마라(validate 가 막는다).
   *    마음 놀이터(heart/)와 같은 결이다. 어디에 놓아도 되고, 이상하게 놓을수록 웃기다.
   *
   * ── 낮 자리와 밤 자리 ────────────────────────────────────────────
   * 한 바퀴가 하루다. 시계는 열두 자리뿐이라 「낮 세 시」와 「새벽 세 시」를 나눌 수 없다.
   * 그래서 **자리마다 낮이냐 밤이냐를 못 박았다** — 5~10 은 낮, 11·12·1~4 는 밤.
   * 아이는 규칙을 배우는 것이 아니라, 놓고 나서 그림이 캄캄해지는 것을 보고 웃는다.
   *   · 낮 것을 밤 자리에 놓으면 → 캄캄한 방에 혼자 + 창밖에서 부엉이가 쳐다본다
   *   · 잠을 낮 자리에 놓으면 → 해가 쨍쨍한데 쿨쿨, 새들이 갸웃한다
   *   · 밥을 여러 자리에 놓으면 → 재생하는 동안 배가 점점 빵빵해진다 */
  const NIGHT_HOURS = [11, 12, 1, 2, 3, 4];
  const isNightHour = h => NIGHT_HOURS.indexOf(((h - 1) % 12 + 12) % 12 + 1) >= 0;
  // 재생 차례 — 아침(다섯 시)부터 돌아 새벽(네 시)에서 끝난다
  const DAY_ORDER = [5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3, 4];

  /* 하루 카드 14종. say 는 **장면 대사**다 — 시각을 섞지 않는다.
   * kind: 'day' 낮에 하는 것 · 'night' 밤에 하는 것. food: 배가 불러지는 것. */
  const DAY_CARDS = [
    { id: 'wake',      name: '일어나기', say: '일어나!',   kind: 'day',   food: false },
    { id: 'breakfast', name: '아침밥',   say: '아침밥!',   kind: 'day',   food: true  },
    { id: 'teeth',     name: '이 닦기',  say: '치카치카!', kind: 'day',   food: false },
    { id: 'kinder',    name: '유치원',   say: '유치원!',   kind: 'day',   food: false },
    { id: 'lunch',     name: '점심',     say: '점심밥!',   kind: 'day',   food: true  },
    { id: 'nap',       name: '낮잠',     say: '쿨쿨!',     kind: 'day',   food: false },
    { id: 'snack',     name: '간식',     say: '냠냠!',     kind: 'day',   food: true  },
    { id: 'play',      name: '놀이',     say: '신난다!',   kind: 'day',   food: false },
    { id: 'walk',      name: '산책',     say: '산책!',     kind: 'day',   food: false },
    { id: 'dinner',    name: '저녁',     say: '저녁밥!',   kind: 'day',   food: true  },
    { id: 'bath',      name: '목욕',     say: '첨벙첨벙!', kind: 'day',   food: false },
    { id: 'book',      name: '책',       say: '그림책!',   kind: 'day',   food: false },
    { id: 'tv',        name: '티비',     say: '티비!',     kind: 'day',   food: false },
    { id: 'sleep',     name: '잠',       say: '잘 자!',    kind: 'night', food: false },
  ];
  const dayCardOf = id => DAY_CARDS.find(c => c.id === id) || null;

  /* ══════════ 말 계약 — 두 갈래뿐이다 ══════════
   * ① **시각 안내**: readTime(t) 한마디(끝에 ! 가 붙을 수 있다). 그것뿐이다.
   *    부모님이 "그냥 간단하게 몇시! 라고만 알려줘, 헷갈려" 라고 하셨다.
   *    시각을 알려 주는 자리에서 시각 말고 다른 말을 **한 마디도** 붙이지 않는다.
   * ② **장면 대사**: 깨어난 친구의 한마디("잘 잤다!"), 하루 카드 이름("첨벙첨벙!").
   *    이것은 시각 안내가 아니라 **장면의 일부**다. 그래서 시각과 절대 섞지 않는다 —
   *    숫자도 '시'도 '분'도 들어갈 수 없고, 짧다.
   * 두 집합을 여기서 그대로 낸다. tools/e2e.mjs 는 앱이 말한 것을 전부 받아 적어
   * **이 집합과 대조**한다(느슨하게 훑는 것이 아니라 집합 대조다). */
  const SPEECH = {
    times() {
      const set = [];
      for (let t = 0; t < 720; t += 5) { const s = readTime(t); set.push(s); set.push(s + '!'); }
      return set;
    },
    scenes() {
      const set = [];
      SLEEPERS.forEach(p => p.wakes.forEach(wk => set.push(wk.say)));
      DAY_CARDS.forEach(c => set.push(c.say));
      return set;
    },
    all() { return this.times().concat(this.scenes()); },
  };

  /* ─────────── 잠꾸러기 그림 ───────────
   * viewBox 0 0 120 100. ⚠️ transform 을 쓰지 않는다 — 좌표로만 그린다.
   * 자세는 표 하나로 정한다(머리 자리·눈·팔·이불·덧그림). */
  const POSES = {
    sleep:   { hx: 46, hy: 60, eye: 'shut',   arm: 'down', blanket: 'over',   extra: 'zzz' },
    jump:    { hx: 60, hy: 26, eye: 'wide',   arm: 'up',   blanket: 'fly',    extra: 'burst' },
    ears:    { hx: 58, hy: 38, eye: 'squint', arm: 'ears', blanket: 'lap',    extra: '' },
    ready:   { hx: 58, hy: 34, eye: 'open',   arm: 'bell', blanket: 'folded', extra: 'bell' },
    dance:   { hx: 58, hy: 30, eye: 'open',   arm: 'wide', blanket: 'lap',    extra: 'notes' },
    stretch: { hx: 58, hy: 34, eye: 'half',   arm: 'up',   blanket: 'lap',    extra: 'yawn' },
  };
  const poseDef = id => POSES[id] || POSES.sleep;

  function earsSVG(d, hx, hy, r) {
    const s = d.fur, k = d.nose;
    if (d.ear === 'round') return '<circle cx="' + (hx - r * 0.78) + '" cy="' + (hy - r * 0.78) + '" r="' + (r * 0.42) + '" fill="' + s + '"/>' +
      '<circle cx="' + (hx + r * 0.78) + '" cy="' + (hy - r * 0.78) + '" r="' + (r * 0.42) + '" fill="' + s + '"/>';
    if (d.ear === 'long') return '<ellipse cx="' + (hx - r * 0.44) + '" cy="' + (hy - r * 1.5) + '" rx="' + (r * 0.24) + '" ry="' + (r * 0.86) + '" fill="' + s + '"/>' +
      '<ellipse cx="' + (hx + r * 0.44) + '" cy="' + (hy - r * 1.5) + '" rx="' + (r * 0.24) + '" ry="' + (r * 0.86) + '" fill="' + s + '"/>';
    if (d.ear === 'point') return '<path d="M' + (hx - r * 0.9) + ' ' + (hy - r * 0.5) + ' L' + (hx - r * 0.78) + ' ' + (hy - r * 1.5) + ' L' + (hx - r * 0.16) + ' ' + (hy - r * 0.86) + ' Z" fill="' + s + '"/>' +
      '<path d="M' + (hx + r * 0.9) + ' ' + (hy - r * 0.5) + ' L' + (hx + r * 0.78) + ' ' + (hy - r * 1.5) + ' L' + (hx + r * 0.16) + ' ' + (hy - r * 0.86) + ' Z" fill="' + s + '"/>';
    if (d.ear === 'flop') return '<ellipse cx="' + (hx - r * 0.95) + '" cy="' + (hy - r * 0.1) + '" rx="' + (r * 0.3) + '" ry="' + (r * 0.66) + '" fill="' + k + '" opacity=".55"/>' +
      '<ellipse cx="' + (hx + r * 0.95) + '" cy="' + (hy - r * 0.1) + '" rx="' + (r * 0.3) + '" ry="' + (r * 0.66) + '" fill="' + k + '" opacity=".55"/>';
    if (d.ear === 'mane') {
      let out = '';
      for (let i = 0; i < 10; i++) {
        const a = i * 36 * Math.PI / 180;
        out += '<circle cx="' + (hx + Math.sin(a) * r * 1.12).toFixed(2) + '" cy="' + (hy - Math.cos(a) * r * 1.12).toFixed(2) +
          '" r="' + (r * 0.34).toFixed(2) + '" fill="' + k + '" opacity=".5"/>';
      }
      return out;
    }
    if (d.ear === 'small') return '<path d="M' + (hx - r * 0.86) + ' ' + (hy - r * 0.62) + ' L' + (hx - r * 0.4) + ' ' + (hy - r * 1.06) + ' L' + (hx - r * 0.22) + ' ' + (hy - r * 0.6) + ' Z" fill="' + s + '"/>' +
      '<path d="M' + (hx + r * 0.86) + ' ' + (hy - r * 0.62) + ' L' + (hx + r * 0.4) + ' ' + (hy - r * 1.06) + ' L' + (hx + r * 0.22) + ' ' + (hy - r * 0.6) + ' Z" fill="' + s + '"/>';
    return '';
  }
  function eyesSVG(kind, hx, hy, r) {
    const lx = hx - r * 0.4, rx = hx + r * 0.4, ey = hy - r * 0.12;
    const ln = (x) => '<path d="M' + (x - r * 0.24) + ' ' + ey + ' q ' + (r * 0.24) + ' ' + (r * 0.26) + ' ' + (r * 0.48) + ' 0" stroke="#2E2A24" stroke-width="2" fill="none" stroke-linecap="round"/>';
    if (kind === 'shut' || kind === 'squint') return ln(lx) + ln(rx);
    const rr = kind === 'wide' ? r * 0.26 : r * 0.19;
    let out = '';
    [lx, rx].forEach(x => {
      out += '<circle cx="' + x + '" cy="' + ey + '" r="' + rr + '" fill="#2E2A24"/>' +
        '<circle cx="' + (x + rr * 0.34) + '" cy="' + (ey - rr * 0.36) + '" r="' + (rr * 0.36) + '" fill="#fff"/>';
    });
    if (kind === 'half') out += '<path d="M' + (lx - r * 0.3) + ' ' + (ey - r * 0.24) + ' h ' + (r * 0.6) +
      ' M' + (rx - r * 0.3) + ' ' + (ey - r * 0.24) + ' h ' + (r * 0.6) + '" stroke="#2E2A24" stroke-width="2.4" stroke-linecap="round" fill="none"/>';
    return out;
  }
  function mouthSVG(kind, hx, hy, r) {
    const my = hy + r * 0.46;
    if (kind === 'yawn') return '<ellipse cx="' + hx + '" cy="' + (my + r * 0.06) + '" rx="' + (r * 0.3) + '" ry="' + (r * 0.36) + '" fill="#B4543F"/>';
    if (kind === 'shut') return '<path d="M' + (hx - r * 0.2) + ' ' + my + ' q ' + (r * 0.2) + ' ' + (r * 0.16) + ' ' + (r * 0.4) + ' 0" stroke="#2E2A24" stroke-width="2" fill="none" stroke-linecap="round"/>';
    return '<path d="M' + (hx - r * 0.32) + ' ' + my + ' q ' + (r * 0.32) + ' ' + (r * 0.4) + ' ' + (r * 0.64) + ' 0" stroke="#2E2A24" stroke-width="2.4" fill="none" stroke-linecap="round"/>';
  }

  /* 잠꾸러기 한 마리 — pose 로 자세가 바뀐다. */
  function sleeperSVG(palId, pose, uid) {
    const d = sleeperOf(palId);
    const p = poseDef(pose);
    const u = 'sl-' + (uid || d.id);
    const hx = p.hx, hy = p.hy, r = 15;
    const bx = hx, by = hy + 26;
    let s = '<svg viewBox="0 0 120 100" width="100%" xmlns="http://www.w3.org/2000/svg">' +
      '<defs><radialGradient id="' + u + '" cx=".4" cy=".34" r=".76">' +
      '<stop offset="0" stop-color="' + d.belly + '"/><stop offset="1" stop-color="' + d.fur + '"/>' +
      '</radialGradient></defs>';

    // 침대 — 언제나 있다(자던 자리다)
    s += '<rect x="6" y="72" width="108" height="22" rx="7" fill="#C8A87E"/>' +
         '<rect x="10" y="66" width="34" height="16" rx="7" fill="#FFF6E4" stroke="#B79A78" stroke-width="1.6"/>';

    // 몸 — 이불 아래 자세에 따라
    s += '<ellipse cx="' + bx + '" cy="' + by + '" rx="19" ry="16" fill="url(#' + u + ')" stroke="' + d.nose + '" stroke-width="2"/>';

    // 팔
    const armStroke = ' stroke="' + d.fur + '" stroke-width="6" stroke-linecap="round" fill="none"';
    if (p.arm === 'up') s += '<path d="M' + (bx - 15) + ' ' + (by - 6) + ' L' + (bx - 24) + ' ' + (by - 24) +
      ' M' + (bx + 15) + ' ' + (by - 6) + ' L' + (bx + 24) + ' ' + (by - 24) + '"' + armStroke + '/>';
    else if (p.arm === 'wide') s += '<path d="M' + (bx - 15) + ' ' + (by - 2) + ' L' + (bx - 30) + ' ' + (by - 12) +
      ' M' + (bx + 15) + ' ' + (by - 2) + ' L' + (bx + 30) + ' ' + (by + 6) + '"' + armStroke + '/>';
    else if (p.arm === 'ears') s += '<path d="M' + (bx - 13) + ' ' + (by - 6) + ' L' + (hx - r * 0.95) + ' ' + (hy - r * 0.3) +
      ' M' + (bx + 13) + ' ' + (by - 6) + ' L' + (hx + r * 0.95) + ' ' + (hy - r * 0.3) + '"' + armStroke + '/>';
    else if (p.arm === 'bell') s += '<path d="M' + (bx - 15) + ' ' + (by - 2) + ' L' + (bx - 26) + ' ' + (by - 10) +
      ' M' + (bx + 15) + ' ' + (by - 2) + ' L' + (bx + 27) + ' ' + (by - 14) + '"' + armStroke + '/>';
    else s += '<path d="M' + (bx - 15) + ' ' + (by - 2) + ' L' + (bx - 25) + ' ' + (by + 4) +
      ' M' + (bx + 15) + ' ' + (by - 2) + ' L' + (bx + 25) + ' ' + (by + 4) + '"' + armStroke + '/>';

    // 머리
    s += earsSVG(d, hx, hy, r);
    s += '<circle cx="' + hx + '" cy="' + hy + '" r="' + r + '" fill="url(#' + u + ')" stroke="' + d.nose + '" stroke-width="2"/>';
    s += eyesSVG(p.eye, hx, hy, r);
    s += '<ellipse cx="' + hx + '" cy="' + (hy + r * 0.2) + '" rx="' + (r * 0.22) + '" ry="' + (r * 0.16) + '" fill="' + d.nose + '"/>';
    s += mouthSVG(p.extra === 'yawn' ? 'yawn' : (p.eye === 'shut' ? 'shut' : 'smile'), hx, hy, r);

    // 이불
    if (p.blanket === 'over') s += '<path d="M8 74 Q' + bx + ' 44, 112 74 L112 92 L8 92 Z" fill="#8FBEE0" stroke="#5D8FB5" stroke-width="2"/>';
    else if (p.blanket === 'fly') s += '<path d="M14 30 Q60 6, 106 30 Q92 44, 60 38 Q28 44, 14 30 Z" fill="#8FBEE0" stroke="#5D8FB5" stroke-width="2"/>';
    else if (p.blanket === 'folded') s += '<rect x="80" y="70" width="30" height="18" rx="4" fill="#8FBEE0" stroke="#5D8FB5" stroke-width="2"/>';
    else s += '<path d="M8 80 Q60 66, 112 80 L112 92 L8 92 Z" fill="#8FBEE0" stroke="#5D8FB5" stroke-width="2"/>';

    // 덧그림
    if (p.extra === 'zzz') s += '<path d="M78 34 h10 l-10 11 h10 M92 20 h8 l-8 9 h8" stroke="#7F8FA6" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>';
    if (p.extra === 'burst') s += '<path d="M18 20 l6 8 M102 20 l-6 8 M60 6 v9 M30 44 l8 4 M90 44 l-8 4" stroke="#E8A33D" stroke-width="3" stroke-linecap="round" fill="none"/>';
    if (p.extra === 'notes') s += '<path d="M20 24 v14 M20 24 h9 v12" stroke="#B57CE0" stroke-width="2.6" fill="none" stroke-linecap="round"/>' +
      '<circle cx="17" cy="39" r="3.4" fill="#B57CE0"/><circle cx="26" cy="37" r="3.4" fill="#B57CE0"/>';
    if (p.extra === 'bell') s += '<path d="M96 34 a9 9 0 0 1 18 0 v9 h-18 z" fill="#FFC24E" stroke="#2E2A24" stroke-width="2"/>' +
      '<circle cx="105" cy="47" r="3" fill="#2E2A24"/>';
    if (p.extra === 'yawn') s += '<path d="M96 26 h8 l-8 9 h8" stroke="#7F8FA6" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>';
    return s + '</svg>';
  }

  /* ─────────── 하루 장면 그림 ───────────
   * viewBox 0 0 120 100. ⚠️ transform 금지 — 좌표로만 그린다.
   * opt: { hour: 1~12 자리, tummy: 지금까지 먹은 횟수 }
   * 웃음은 여기서 난다 — 낮 것을 밤 자리에 놓으면 캄캄해지고 창밖에 부엉이가 온다. */
  function dayPropSVG(id) {
    switch (id) {
      case 'wake': return '<rect x="76" y="62" width="36" height="10" rx="3" fill="#C8A87E"/>' +
        '<rect x="78" y="52" width="16" height="10" rx="4" fill="#FFF6E4" stroke="#B79A78" stroke-width="1.4"/>' +
        '<path d="M94 62 q9 -8 18 0" stroke="#5D8FB5" stroke-width="3" fill="#8FBEE0"/>';
      case 'breakfast': return '<path d="M78 56 h30 l-4 14 h-22 z" fill="#F3F1E6" stroke="#8B7B66" stroke-width="1.8"/>' +
        '<path d="M80 56 q13 -9 26 0" fill="#FFFDF6" stroke="#8B7B66" stroke-width="1.6"/>' +
        '<path d="M88 44 q4 -5 0 -9 M98 44 q4 -5 0 -9" stroke="#C6B79E" stroke-width="2" fill="none" stroke-linecap="round"/>';
      case 'teeth': return '<rect x="80" y="60" width="26" height="5" rx="2.5" fill="#5CB8E8"/>' +
        '<rect x="76" y="57" width="9" height="11" rx="3" fill="#FFFDF6" stroke="#8B7B66" stroke-width="1.4"/>' +
        '<circle cx="74" cy="50" r="4" fill="#DFF1FA"/><circle cx="83" cy="45" r="3" fill="#DFF1FA"/>';
      case 'kinder': return '<path d="M76 56 L94 42 L112 56 V74 H76 Z" fill="#F6D6A8" stroke="#8B7B66" stroke-width="1.8"/>' +
        '<rect x="86" y="60" width="14" height="14" fill="#8FBEE0" stroke="#5D8FB5" stroke-width="1.4"/>' +
        '<path d="M94 42 v-8 h6" stroke="#D9543B" stroke-width="2.4" fill="none"/>';
      case 'lunch': return '<rect x="76" y="52" width="34" height="22" rx="4" fill="#F29CB8" stroke="#8B7B66" stroke-width="1.8"/>' +
        '<rect x="80" y="56" width="12" height="14" rx="2" fill="#FFFDF6"/>' +
        '<rect x="95" y="56" width="11" height="6" rx="2" fill="#A9E0AE"/><rect x="95" y="64" width="11" height="6" rx="2" fill="#FFD34E"/>';
      case 'nap': return '<rect x="74" y="60" width="38" height="14" rx="5" fill="#8FBEE0" stroke="#5D8FB5" stroke-width="1.8"/>' +
        '<rect x="76" y="52" width="18" height="11" rx="5" fill="#FFF6E4" stroke="#B79A78" stroke-width="1.4"/>' +
        '<path d="M98 46 h7 l-7 8 h7" stroke="#7F8FA6" stroke-width="2.2" fill="none" stroke-linecap="round"/>';
      case 'snack': return '<circle cx="92" cy="62" r="13" fill="#E4BE84" stroke="#8B7B66" stroke-width="1.8"/>' +
        '<circle cx="87" cy="58" r="2.4" fill="#6B4E38"/><circle cx="96" cy="60" r="2.4" fill="#6B4E38"/><circle cx="91" cy="68" r="2.4" fill="#6B4E38"/>';
      case 'play': return '<circle cx="92" cy="62" r="13" fill="#FFD34E" stroke="#8B7B66" stroke-width="1.8"/>' +
        '<path d="M79 62 h26 M92 49 v26" stroke="#D9543B" stroke-width="2.4" fill="none"/>';
      case 'walk': return '<ellipse cx="96" cy="64" rx="14" ry="9" fill="#E0B071" stroke="#8B7B66" stroke-width="1.8"/>' +
        '<circle cx="108" cy="56" r="7" fill="#E0B071" stroke="#8B7B66" stroke-width="1.8"/>' +
        '<circle cx="110" cy="55" r="1.8" fill="#2E2A24"/>' +
        '<path d="M76 44 q10 8 24 8" stroke="#D9543B" stroke-width="2.2" fill="none"/>';
      case 'dinner': return '<path d="M76 56 h34 l-4 18 h-26 z" fill="#9AA7B5" stroke="#6E7C8C" stroke-width="1.8"/>' +
        '<rect x="72" y="50" width="42" height="6" rx="3" fill="#C3C8D2" stroke="#6E7C8C" stroke-width="1.6"/>' +
        '<path d="M86 42 q4 -6 0 -10 M100 42 q4 -6 0 -10" stroke="#C6B79E" stroke-width="2" fill="none" stroke-linecap="round"/>';
      case 'bath': return '<path d="M74 56 h40 v10 a10 10 0 0 1 -10 10 h-20 a10 10 0 0 1 -10 -10 z" fill="#DFF1FA" stroke="#5D8FB5" stroke-width="1.8"/>' +
        '<path d="M76 62 q6 -4 12 0 t12 0 t12 0" stroke="#5CB8E8" stroke-width="2.4" fill="none"/>' +
        '<circle cx="84" cy="47" r="4.4" fill="#DFF1FA" stroke="#8FBEE0" stroke-width="1.4"/>' +
        '<circle cx="96" cy="42" r="3.2" fill="#DFF1FA" stroke="#8FBEE0" stroke-width="1.2"/>';
      case 'book': return '<path d="M74 54 q12 -6 20 0 v20 q-8 -5 -20 0 z" fill="#FFFDF6" stroke="#8B7B66" stroke-width="1.8"/>' +
        '<path d="M114 54 q-12 -6 -20 0 v20 q8 -5 20 0 z" fill="#FFFDF6" stroke="#8B7B66" stroke-width="1.8"/>' +
        '<path d="M94 54 v20" stroke="#8B7B66" stroke-width="1.8"/>';
      case 'tv': return '<rect x="74" y="50" width="40" height="26" rx="4" fill="#4A4A55" stroke="#2E2A24" stroke-width="1.8"/>' +
        '<rect x="78" y="54" width="32" height="18" rx="2" fill="#8FBEE0"/>' +
        '<path d="M88 50 l-6 -9 M100 50 l6 -9" stroke="#2E2A24" stroke-width="2.2" fill="none" stroke-linecap="round"/>';
      case 'sleep': return '<path d="M72 62 q22 -10 44 0 v12 h-44 z" fill="#8FBEE0" stroke="#5D8FB5" stroke-width="1.8"/>' +
        '<rect x="74" y="54" width="18" height="11" rx="5" fill="#FFF6E4" stroke="#B79A78" stroke-width="1.4"/>' +
        '<path d="M98 46 h8 l-8 9 h8" stroke="#FFFDF6" stroke-width="2.4" fill="none" stroke-linecap="round"/>';
      default: return '';
    }
  }

  function daySceneSVG(cardId, opt) {
    const o = opt || {};
    const card = dayCardOf(cardId);
    if (!card) return '';
    const hour = o.hour || 12;
    const night = isNightHour(hour);
    const tummy = Math.max(0, Math.min(5, o.tummy || 0));
    // 웃음 자리 — 낮 것이 밤에 왔나 / 잠이 낮에 왔나
    const owl = night && card.kind === 'day';
    const sunny = !night && card.kind === 'night';

    let s = '<svg viewBox="0 0 120 100" width="100%" xmlns="http://www.w3.org/2000/svg">';
    s += '<rect x="0" y="0" width="120" height="100" rx="6" fill="' + (night ? '#2A3358' : '#CFEAF7') + '"/>';
    if (night) {
      s += '<path d="M100 12 a11 11 0 1 1 -8 -10.6 a9 9 0 0 0 8 10.6 z" fill="#FFE9A8"/>';
      [[14, 14], [30, 8], [46, 18], [64, 10], [22, 30], [78, 24]].forEach(p => {
        s += '<path d="M' + p[0] + ' ' + (p[1] - 3.4) + ' l1.2 2.6 l2.8 .4 l-2 2 l.5 2.8 l-2.5 -1.4 l-2.5 1.4 l.5 -2.8 l-2 -2 l2.8 -.4 z" fill="#FFF6D0"/>';
      });
    } else {
      s += '<circle cx="100" cy="14" r="10" fill="#FFD34E"/>';
      for (let i = 0; i < 8; i++) {
        const a = i * 45 * Math.PI / 180;
        s += '<path d="M' + (100 + Math.sin(a) * 13).toFixed(1) + ' ' + (14 - Math.cos(a) * 13).toFixed(1) +
          ' L' + (100 + Math.sin(a) * 18).toFixed(1) + ' ' + (14 - Math.cos(a) * 18).toFixed(1) +
          '" stroke="#FFD34E" stroke-width="2.6" stroke-linecap="round"/>';
      }
    }
    s += '<rect x="0" y="78" width="120" height="22" fill="' + (night ? '#1F2743' : '#BFE0A8') + '"/>';

    // 창밖에서 부엉이가 쳐다본다 (밤에 낮 것을 할 때)
    if (owl) {
      s += '<rect x="2" y="16" width="34" height="34" rx="3" fill="#12182C" stroke="#8B7B66" stroke-width="2.4"/>' +
        '<path d="M19 16 v34 M2 33 h34" stroke="#8B7B66" stroke-width="2"/>' +
        '<ellipse cx="19" cy="38" rx="11" ry="10" fill="#8B6A4F"/>' +
        '<circle cx="15" cy="35" r="4.4" fill="#FFF6D0"/><circle cx="23" cy="35" r="4.4" fill="#FFF6D0"/>' +
        '<circle cx="15" cy="35" r="2" fill="#2E2A24"/><circle cx="23" cy="35" r="2" fill="#2E2A24"/>' +
        '<path d="M19 39 l-3 3 h6 z" fill="#E0A040"/>' +
        '<path d="M11 29 l3 -6 l4 5 M27 29 l-3 -6 l-4 5" fill="#6B4E38"/>';
    }
    // 해가 쨍쨍한데 쿨쿨 — 새들이 갸웃한다
    if (sunny) {
      s += '<ellipse cx="16" cy="30" rx="8" ry="6" fill="#C8503C"/><circle cx="23" cy="25" r="5" fill="#C8503C"/>' +
        '<circle cx="25" cy="24" r="1.6" fill="#2E2A24"/><path d="M28 25 l6 2 l-6 2 z" fill="#E8A33D"/>' +
        '<ellipse cx="36" cy="44" rx="6.6" ry="5" fill="#46B6C0"/><circle cx="42" cy="40" r="4.2" fill="#46B6C0"/>' +
        '<circle cx="43.6" cy="39.2" r="1.4" fill="#2E2A24"/><path d="M46 40 l5 1.6 l-5 1.6 z" fill="#E8A33D"/>';
    }

    // 아이 — 배는 먹은 만큼 부푼다(밥을 여러 자리에 놓으면 빵빵해진다)
    const bellyR = 12 + tummy * 3.2;
    s += '<path d="M40 96 v-8 M52 96 v-8" stroke="#4A3A2C" stroke-width="4" stroke-linecap="round"/>';
    s += '<ellipse cx="46" cy="72" rx="' + bellyR.toFixed(1) + '" ry="14" fill="#FFC7A8" stroke="#C08A6A" stroke-width="2"/>';
    s += '<circle cx="46" cy="50" r="14" fill="#FFD9BE" stroke="#C08A6A" stroke-width="2"/>';
    s += '<path d="M34 44 q12 -12 24 0 q-12 -5 -24 0 z" fill="#6B4E38"/>';
    if (card.id === 'sleep' || card.id === 'nap') {
      s += '<path d="M38 50 q4 4 8 0 M50 50 q4 4 8 0" stroke="#2E2A24" stroke-width="2" fill="none" stroke-linecap="round"/>';
    } else {
      s += '<circle cx="41" cy="50" r="2.4" fill="#2E2A24"/><circle cx="52" cy="50" r="2.4" fill="#2E2A24"/>';
    }
    s += '<path d="M41 57 q5 5 10 0" stroke="#2E2A24" stroke-width="2.2" fill="none" stroke-linecap="round"/>';
    if (tummy >= 3) s += '<path d="M' + (46 - bellyR + 3).toFixed(1) + ' 72 q' + bellyR.toFixed(1) + ' 6 ' + (bellyR * 2 - 6).toFixed(1) +
      ' 0" stroke="#C08A6A" stroke-width="1.6" fill="none"/>';

    s += dayPropSVG(card.id);
    return s + '</svg>';
  }

  return {
    ROOMS, roomDef,
    STAGES, stageDef, unitOf,
    BOARDS, boardsOf, boardById, startOf,
    NATIVE_HOUR, SINO_MIN, hourOf, minuteOf, hour12, readTime, digitOf,
    BIRDS, birdOfHour, birdSVG,
    // 방②
    WAKE_STAGES, wakeStageDef, wakeUnitOf,
    WAKE_BOARDS, wakeBoardsOf, wakeBoardById, wakeStartOf, wakeRunFrom, WAKE_RUN,
    SLEEPERS, sleeperOf, wakeSceneOf, POSES, poseDef, sleeperSVG,
    // 방③
    DAY_CARDS, dayCardOf, NIGHT_HOURS, isNightHour, DAY_ORDER, daySceneSVG, dayPropSVG,
    // 말 계약
    SPEECH,
  };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = window.ClockData;
