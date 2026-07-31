/* 돌림 블록 데이터 — 나무 막대에 꿰인 원통(실린더) 2~4개를 돌려 카드 그림과 맞추는 퍼즐 30개(단계별 10).
 * 각 퍼즐은 실린더 배열을 갖고, 실린더마다 얼굴(그림) 목록과 정답 얼굴 인덱스(target)를 고정 데이터로 둔다.
 * 결정성(e2e·validate)을 위해 얼굴 구성은 랜덤이 아니라 이 파일의 고정 규칙대로 만든다.
 *   단계1: 실린더 2개 · 얼굴 4개 · 동물만
 *   단계2: 실린더 3개 · 얼굴 4~5개 · 동물+공룡
 *   단계3: 실린더 4개 · 얼굴 5~6개 · 동물+공룡+도형 섞어서
 * 그림은 전부 이모지(외부 이미지 금지).
 * ⚠️ 퍼즐 id는 아이 진행도(done 키)가 id로 저장되므로 함부로 바꾸지 않는다.
 */
window.TwistData = (() => {

  /* ─────────── 그림 풀(테마별) ─────────── */
  const POOLS = {
    animals:   ['🦌', '🐘', '🦊', '🦁', '🐰', '🐻', '🐯', '🐨', '🐵', '🐮'],
    dinosaurs: ['🦕', '🦖', '🐉', '🦎', '🐊', '🐢'],
    shapes:    ['⭐', '🔷', '🔴', '🔺', '🟢', '🟨'],
  };
  const THEME_IDS = Object.keys(POOLS); // ['animals','dinosaurs','shapes']
  const THEME_NAME = { animals: '동물', dinosaurs: '공룡', shapes: '도형' };

  // 테마 풀에서 offset부터 count개를 순환으로 뽑는다 — count <= 풀 길이면 항상 서로 다른 그림
  function pick(theme, offset, count) {
    const pool = POOLS[theme];
    const out = [];
    for (let k = 0; k < count; k++) out.push(pool[(offset + k) % pool.length]);
    return out;
  }

  // 실린더 하나 정의: theme, 얼굴 시작offset, 얼굴 수, 정답 얼굴이 될 목표offset
  function cyl(theme, offset, count, targetOffset) {
    const faces = pick(theme, offset, count);
    const target = ((targetOffset % count) + count) % count;
    return { theme, faces, target };
  }

  const PUZZLES = [];

  /* ── 단계1 — 실린더 2개, 얼굴 4개, 동물만, 10개 ── */
  for (let i = 0; i < 10; i++) {
    PUZZLES.push({
      id: 's1-' + (i + 1), stage: 1, theme: 'animals',
      cylinders: [
        cyl('animals', i, 4, i + 1),
        cyl('animals', i + 4, 4, i + 2),
      ],
    });
  }

  /* ── 단계2 — 실린더 3개, 얼굴 4~5개, 동물+공룡 섞어서, 10개 ── */
  for (let i = 0; i < 10; i++) {
    const n0 = 4 + (i % 2);
    const n1 = 4 + ((i + 1) % 2);
    const n2 = 4 + ((i + 1) % 2 === 0 ? 1 : 0);
    PUZZLES.push({
      id: 's2-' + (i + 1), stage: 2, theme: 'mixed',
      cylinders: [
        cyl('animals', i, n0, i + 1),
        cyl('dinosaurs', i, n1, i + 2),
        cyl('animals', i + 3, n2, i + 3),
      ],
    });
  }

  /* ── 단계3 — 실린더 4개, 얼굴 5~6개, 동물+공룡+도형 섞어서, 10개 ── */
  const THEME_CYCLE = ['animals', 'dinosaurs', 'shapes', 'animals'];
  for (let i = 0; i < 10; i++) {
    const cylinders = THEME_CYCLE.map((theme, ci) => {
      const pool = POOLS[theme];
      const n = Math.min(pool.length, 5 + ((i + ci) % 2));
      return cyl(theme, i + ci, n, i + ci + 1);
    });
    PUZZLES.push({ id: 's3-' + (i + 1), stage: 3, theme: 'mixed', cylinders });
  }

  /* ─────────── 단계 정의 3개 ─────────── */
  const LEVELS = [
    { id: 1, icon: '🎡', name: '쉬운 돌림 블록', desc: '블록 2개 · 동물',        cls: 'c-l1', cylinders: 2 },
    { id: 2, icon: '🎡', name: '보통 돌림 블록', desc: '블록 3개 · 동물+공룡',   cls: 'c-l2', cylinders: 3 },
    { id: 3, icon: '🎡', name: '어려운 돌림 블록', desc: '블록 4개 · 섞어서',    cls: 'c-l3', cylinders: 4 },
  ];
  const levelDef = id => LEVELS.find(l => l.id === id);
  const puzzlesOf = stage => PUZZLES.filter(p => p.stage === stage);
  const puzzleById = id => PUZZLES.find(p => p.id === id) || null;

  const praises = ['우와, 딱 맞췄어요!', '돌리기 대장이네요!', '똑같이 맞췄어요!', '참 잘했어요!', '냠냠! 최고예요!'];

  return {
    POOLS, THEME_IDS, THEME_NAME,
    PUZZLES, LEVELS, levelDef, puzzlesOf, puzzleById, praises,
  };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = window.TwistData;
