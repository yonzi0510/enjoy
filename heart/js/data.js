/* 마음 놀이터 데이터 — 얼굴 부품(눈썹5·눈6·입6) · 마음 12종 · 장면 27개(묶음 3 × 9) · 도움 카드 108장
 *
 * ⚠️ 이 놀이에는 **정답이 없다.**
 *   - 어떤 얼굴을 만들어도 통한다. 부품에 '맞는 조합' 이 없다.
 *   - 어떤 도움 카드를 줘도 통한다. 카드마다 친구의 대답(reply)만 달라진다.
 *   - 그래서 데이터에는 `answer` 같은 필드가 아예 없다. 새로 넣지 마라.
 *   - 대사에 부정 표현(틀렸/아니야/안 돼/잘못)을 쓰지 마라 — validate-data.js 가 전수로 막는다.
 *
 * 그림은 전부 인라인 SVG(외부 이미지 금지). 얼굴 부품은 **반드시 <path>** 다 —
 * 이모지로는 눈썹·눈·입을 따로 갈아 끼울 수 없다.
 *
 * ⚠️ 장면 id·마음 id·부품 id 는 아이 진행도(도감에 저장된 얼굴)가 그대로 물고 있다.
 *    함부로 바꾸면 아이가 만든 얼굴이 사라진다.
 */
window.HeartData = (() => {

  const INK = '#3A2E26';

  /* 부품 띠에서만 쓰는 부위별 색 — 눈썹과 눈이 자리 없이 조각만 보면 헷갈린다는
   * 지적(2026-08)에 색으로 답한다. **완성된 얼굴은 여기 안 쓴다** — faceInner 는
   * partPaths 를 색 없이 불러 항상 INK(검정) 로 그린다. 조각 고를 때만 색이 붙는다. */
  const SLOT_COLOR = { brow: '#8A5A2E', eyes: '#2E2A26', mouth: '#C24E6E' };

  /* ═══════════ 얼굴 부품 ═══════════
   * 좌표계는 얼굴 SVG 와 같은 viewBox 0 0 100 100 (머리 = 중심 50,52 반지름 38).
   *   d  = 선으로 긋는 path (fill:none, stroke)
   *   fd = 칠하는 path (fill, stroke:none)  — 동그란 눈처럼 속이 찬 부품
   * vb = 부품 띠에서 이 부위만 잘라 보여 줄 viewBox
   *
   * ── 2026-08 다시 그림: 눈썹과 눈이 조각만 보면 헷갈린다는 지적 ──
   * "가만한 눈썹"(짧은 선 두 개)과 "실눈"(짧은 선 두 개)이 똑같은 모양 언어를 썼다.
   * 눈썹은 **속이 찬 쐐기꼴**(코 옆이 두껍고 관자놀이 쪽으로 가늘어지는 진짜 눈썹
   * 실루엣)로 다시 그렸다 — 이제 선이 아니라 면이라 눈과 실루엣부터 다르다.
   * 선으로 남은 눈(웃는·실눈·내리깐) 셋에는 바깥쪽 끝에 짧은 속눈썹 획을 하나씩
   * 붙였다 — 눈썹에는 없는 표시라 헷갈릴 자리가 없다. */
  const PARTS = {
    brow: {
      name: '눈썹', vb: '22 18 56 24',
      list: [
        { id: 'flat',  name: '가만한 눈썹',
          fd: 'M28 34 L30.17 34.32 L32.33 34.63 L34.5 34.95 L36.67 35.27 L38.83 35.58 L41 35.9 L41 30.1 L38.83 30.42 L36.67 30.73 L34.5 31.05 L32.33 31.37 L30.17 31.68 L28 32 Z ' +
              'M72 34 L69.83 34.32 L67.67 34.63 L65.5 34.95 L63.33 35.27 L61.17 35.58 L59 35.9 L59 30.1 L61.17 30.42 L63.33 30.73 L65.5 31.05 L67.67 31.37 L69.83 31.68 L72 32 Z' },
        { id: 'up',    name: '치켜뜬 눈썹',
          fd: 'M28.42 36.91 L30.72 36.2 L33.02 35.48 L35.32 34.77 L37.62 34.06 L39.92 33.35 L42.22 32.63 L39.78 27.37 L37.75 28.65 L35.72 29.94 L33.68 31.23 L31.65 32.52 L29.61 33.8 L27.58 35.09 Z ' +
              'M71.58 36.91 L69.28 36.2 L66.98 35.48 L64.68 34.77 L62.38 34.06 L60.08 33.35 L57.78 32.63 L60.22 27.37 L62.25 28.65 L64.28 29.94 L66.32 31.23 L68.35 32.52 L70.39 33.8 L72.42 35.09 Z' },
        { id: 'down',  name: '처진 눈썹',
          fd: 'M27.58 30.91 L29.61 32.2 L31.65 33.48 L33.68 34.77 L35.72 36.06 L37.75 37.35 L39.78 38.63 L42.22 33.37 L39.92 32.65 L37.62 31.94 L35.32 31.23 L33.02 30.52 L30.72 29.8 L28.42 29.09 Z ' +
              'M72.42 30.91 L70.39 32.2 L68.35 33.48 L66.32 34.77 L64.28 36.06 L62.25 37.35 L60.22 38.63 L57.78 33.37 L60.08 32.65 L62.38 31.94 L64.68 31.23 L66.98 30.52 L69.28 29.8 L71.58 29.09 Z' },
        { id: 'curve', name: '둥근 눈썹',
          fd: 'M28.68 34.73 L30.86 33.45 L32.81 32.89 L34.5 32.95 L36 33.5 L37.48 34.53 L39.03 36.13 L42.97 31.87 L40.19 30.13 L37.33 29.17 L34.5 29.05 L31.85 29.77 L29.48 31.21 L27.32 33.27 Z ' +
              'M71.32 34.73 L69.14 33.45 L67.19 32.89 L65.5 32.95 L64 33.5 L62.52 34.53 L60.97 36.13 L57.03 31.87 L59.81 30.13 L62.67 29.17 L65.5 29.05 L68.15 29.77 L70.52 31.21 L72.68 33.27 Z' },
        { id: 'high',  name: '번쩍 눈썹',
          fd: 'M27.62 26.78 L30.12 25.5 L32.42 24.91 L34.5 24.95 L36.42 25.52 L38.28 26.61 L40.19 28.26 L43.81 23.74 L40.72 22.05 L37.58 21.14 L34.5 21.05 L31.58 21.76 L28.88 23.17 L26.38 25.22 Z ' +
              'M72.38 26.78 L69.88 25.5 L67.58 24.91 L65.5 24.95 L63.58 25.52 L61.72 26.61 L59.81 28.26 L56.19 23.74 L59.28 22.05 L62.42 21.14 L65.5 21.05 L68.42 21.76 L71.12 23.17 L73.62 25.22 Z' },
      ],
    },
    eyes: {
      name: '눈', vb: '22 36 56 26',
      list: [
        { id: 'open',   name: '동그란 눈', fd: 'M27.5 47 a6.5 6.5 0 1 0 13 0 a6.5 6.5 0 1 0 -13 0 M59.5 47 a6.5 6.5 0 1 0 13 0 a6.5 6.5 0 1 0 -13 0' },
        { id: 'wide',   name: '커다란 눈', fd: 'M25 47 a9 9 0 1 0 18 0 a9 9 0 1 0 -18 0 M57 47 a9 9 0 1 0 18 0 a9 9 0 1 0 -18 0' },
        { id: 'smile',  name: '웃는 눈',
          d: 'M27 50 Q34 41 41 50 M59 50 Q66 41 73 50 M25.5 49 L22.7 45.8 M74.5 49 L77.3 45.8' },
        { id: 'teary',  name: '눈물 눈',   fd: 'M28 46 a6 6 0 1 0 12 0 a6 6 0 1 0 -12 0 M60 46 a6 6 0 1 0 12 0 a6 6 0 1 0 -12 0', d: 'M40 54 q3.5 4.5 0 7.5' },
        { id: 'squint', name: '실눈',
          d: 'M28 48.3 Q34.5 46.6 41 48.3 M59 48.3 Q65.5 46.6 72 48.3 M26.2 47.8 L23.2 45 M73.8 47.8 L76.8 45' },
        { id: 'shy',    name: '내리깐 눈',
          d: 'M27 46 Q34 52 41 46 M59 46 Q66 52 73 46 M25.3 45.4 L22.4 42.6 M74.7 45.4 L77.6 42.6' },
      ],
    },
    mouth: {
      name: '입', vb: '32 58 36 24',
      list: [
        { id: 'smile', name: '웃는 입',   d: 'M36 64 Q50 77 64 64' },
        { id: 'frown', name: '처진 입',   d: 'M36 73 Q50 61 64 73' },
        { id: 'open',  name: '벌린 입',   fd: 'M39 66 a11 9 0 1 0 22 0 a11 9 0 1 0 -22 0' },
        { id: 'flat',  name: '일자 입',   d: 'M38 68 H62' },
        { id: 'wave',  name: '삐죽 입',   d: 'M36 68 q4.7 -5 9.3 0 t9.3 0 t9.3 0' },
        { id: 'small', name: '작은 입',   d: 'M44 66 q6 7 12 0' },
      ],
    },
  };
  const SLOTS = ['brow', 'eyes', 'mouth'];

  function partMeta(slot, id) {
    const g = PARTS[slot];
    if (!g) return null;
    return g.list.find(p => p.id === id) || null;
  }

  /* 부품 하나를 그리는 <path> 조각. ink 를 주면 그 색으로(부품 띠 전용) —
   * 안 주면 항상 INK(검정): 완성된 얼굴은 부위 색을 안 쓴다. */
  function partPaths(slot, id, ink) {
    const p = partMeta(slot, id);
    if (!p) return '';
    const c = ink || INK;
    let out = '';
    if (p.fd) out += `<path class="pt pt-${slot}" data-part="${id}" d="${p.fd}" fill="${c}"/>`;
    if (p.d) out += `<path class="pt pt-${slot}" data-part="${id}" d="${p.d}" fill="none" stroke="${c}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`;
    return out;
  }

  /* ═══════════ 얼굴 한 장 ═══════════
   * sel = { brow, eyes, mouth } — 빈 칸(null)은 그리지 않는다(아직 안 붙인 부품).
   * data-brow/eyes/mouth 를 겉에 적어 둔다 — 테스트가 "붙인 부품이 화면에 반영됐나" 를 이걸로 본다.
   */
  // 얼굴 알맹이(머리 + 붙인 부품)만. <svg> 를 씌우지 않는다 —
  // 장면 안에 얹을 때 <svg> 를 겹쳐 넣으면 preserveAspectRatio 가 제멋대로 가운데 정렬해
  // 머리가 몸통 옆으로 밀려난다(실제로 그렇게 어긋났었다).
  function faceInner(sel, opts) {
    const o = opts || {};
    sel = sel || {};
    return `<path class="face-head" d="M12 52 a38 38 0 1 0 76 0 a38 38 0 1 0 -76 0" fill="${o.skin || '#FFF0D2'}" stroke="${INK}" stroke-width="3.4"/>` +
      SLOTS.map(s => sel[s] ? partPaths(s, sel[s]) : '').join('');
  }
  const faceAttrs = sel => ` data-brow="${(sel && sel.brow) || ''}" data-eyes="${(sel && sel.eyes) || ''}" data-mouth="${(sel && sel.mouth) || ''}"`;

  function faceSvg(sel, opts) {
    const o = opts || {};
    const cls = 'face-svg' + (o.cls ? ' ' + o.cls : '');
    return `<svg class="${cls}" viewBox="0 0 100 100" width="100%" xmlns="http://www.w3.org/2000/svg"` +
      faceAttrs(sel) + `>` + faceInner(sel, o) + `</svg>`;
  }

  /* ═══════════ 마음 12종 (도감) ═══════════ */
  const MOODS = [
    { id: 'joy',     name: '기쁨',     color: '#FFE08A', say: '기쁜 마음' },
    { id: 'sad',     name: '속상',     color: '#BFD7F2', say: '속상한 마음' },
    { id: 'angry',   name: '화남',     color: '#FBC4B4', say: '화난 마음' },
    { id: 'scared',  name: '무서움',   color: '#D5CDF0', say: '무서운 마음' },
    { id: 'envy',    name: '부러움',   color: '#C8E6C2', say: '부러운 마음' },
    { id: 'sorry',   name: '미안',     color: '#F6D9C0', say: '미안한 마음' },
    { id: 'bored',   name: '심심',     color: '#D9D9CF', say: '심심한 마음' },
    { id: 'excited', name: '설렘',     color: '#FFD3E4', say: '설레는 마음' },
    { id: 'shy',     name: '부끄러움', color: '#F7C9D8', say: '부끄러운 마음' },
    { id: 'proud',   name: '뿌듯',     color: '#FFEBAF', say: '뿌듯한 마음' },
    { id: 'hurt',    name: '서운',     color: '#CFE2E8', say: '서운한 마음' },
    { id: 'thanks',  name: '고마움',   color: '#FFE2B8', say: '고마운 마음' },
  ];
  const moodMeta = id => MOODS.find(m => m.id === id) || null;

  /* ═══════════ 도움 카드 그림 16종 ═══════════
   * 카드마다 이름·대사는 장면이 정하고, 그림은 여기서 고른다. viewBox 0 0 48 48. */
  const ICONS = {
    hug:   `<path d="M24 30 c-9 0 -14 -6 -14 -11 a7 7 0 0 1 14 -3 a7 7 0 0 1 14 3 c0 5 -5 11 -14 11 Z" fill="#F79EB4" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/><path d="M14 34 q10 8 20 0" fill="none" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/>`,
    hand:  `<path d="M18 40 V22 a3 3 0 0 1 6 0 v-5 a3 3 0 0 1 6 0 v5 a3 3 0 0 1 6 0 v14 a8 8 0 0 1 -8 8 h-4 a6 6 0 0 1 -6 -4 Z" fill="#FFD9B0" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/>`,
    talk:  `<path d="M8 12 H40 V32 H22 L14 40 V32 H8 Z" fill="#BFE3F5" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/><path d="M16 22 h.5 M24 22 h.5 M32 22 h.5" stroke="${INK}" stroke-width="3.4" stroke-linecap="round"/>`,
    play:  `<path d="M24 8 a16 16 0 1 0 .01 0" fill="#FFE08A" stroke="${INK}" stroke-width="2.6"/><path d="M8 24 h32 M24 8 v32" stroke="${INK}" stroke-width="2.4"/>`,
    // 나눠 주기 — 하나를 반으로 갈라 둘로 (선물 상자와 헷갈리지 않게)
    share: `<path d="M21 8 a16 16 0 0 0 0 32 Z" fill="#F9D7A0" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/><path d="M27 8 a16 16 0 0 1 0 32 Z" fill="#F9D7A0" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/><path d="M14 20 h.5 M17 30 h.5 M32 20 h.5 M34 30 h.5" stroke="${INK}" stroke-width="3.4" stroke-linecap="round"/>`,
    // 도와주기 — 조각을 다시 올려 주는 그림 (네모 + 위로 향한 화살표)
    help:  `<path d="M12 28 h24 v14 h-24 Z" fill="#C8E6C2" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/><path d="M24 22 V6 M15 14 L24 5 L33 14" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`,
    wait:  `<path d="M24 8 a16 16 0 1 0 .01 0" fill="#EFEAE0" stroke="${INK}" stroke-width="2.6"/><path d="M24 15 v10 l7 5" fill="none" stroke="${INK}" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>`,
    draw:  `<path d="M12 36 L30 12 l7 5 L19 41 Z" fill="#FFD3E4" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/><path d="M12 36 L19 41" stroke="${INK}" stroke-width="2.6"/>`,
    water: `<path d="M16 12 H32 L30 40 H18 Z" fill="#BFE3F5" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/><path d="M17 26 H31" stroke="${INK}" stroke-width="2.4"/>`,
    smile: `<path d="M24 8 a16 16 0 1 0 .01 0" fill="#FFE08A" stroke="${INK}" stroke-width="2.6"/><path d="M17 20 h.5 M31 20 h.5" stroke="${INK}" stroke-width="4" stroke-linecap="round"/><path d="M16 28 q8 8 16 0" fill="none" stroke="${INK}" stroke-width="2.8" stroke-linecap="round"/>`,
    band:  `<path d="M14 20 h20 a6 6 0 0 1 0 12 h-20 a6 6 0 0 1 0 -12 Z" fill="#FBC4B4" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/><path d="M21 24 h.5 M27 24 h.5 M21 29 h.5 M27 29 h.5" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`,
    doll:  `<path d="M24 10 a8 8 0 1 0 .01 0" fill="#F7C9D8" stroke="${INK}" stroke-width="2.6"/><path d="M16 26 h16 v14 h-16 Z" fill="#F7C9D8" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/><path d="M20 16 h.5 M28 16 h.5" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`,
    clap:  `<path d="M20 40 V22 a3 3 0 0 1 6 0 v-6 a3 3 0 0 1 6 0 v18 a8 8 0 0 1 -8 8 Z" fill="#FFD9B0" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/><path d="M10 12 l4 4 M8 22 h5 M12 32 l4 -3" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/>`,
    song:  `<path d="M20 34 a5 4 0 1 0 .01 0" fill="#D5CDF0" stroke="${INK}" stroke-width="2.6"/><path d="M25 34 V12 l12 -4 v20" fill="none" stroke="${INK}" stroke-width="2.8" stroke-linejoin="round"/><path d="M32 30 a5 4 0 1 0 .01 0" fill="#D5CDF0" stroke="${INK}" stroke-width="2.6"/>`,
    // 이야기 들어 주기 — 귀 + 소리 물결
    listen:`<path d="M26 8 C15 8 10 17 10 27 C10 35 14 42 20 42 C26 42 28 37 28 32 C28 27 24 25 21 27" fill="#FFD9B0" stroke="${INK}" stroke-width="2.8" stroke-linejoin="round" stroke-linecap="round"/><path d="M34 16 q5 8 0 16 M41 11 q8 13 0 26" fill="none" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/>`,
    gift:  `<path d="M10 22 H38 V40 H10 Z" fill="#C8E6C2" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/><path d="M8 14 H40 V22 H8 Z" fill="#FFE08A" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/><path d="M24 14 V40 M24 14 q-8 -8 -2 -8 q4 0 2 8 q8 -8 2 -8 q-4 0 -2 8" fill="none" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/>`,
  };
  function iconSvg(name) {
    return `<svg class="hc-ico" viewBox="0 0 48 48" width="100%" xmlns="http://www.w3.org/2000/svg">${ICONS[name] || ''}</svg>`;
  }

  /* ═══════════ 장면 배경 3종 ═══════════ viewBox 0 0 200 120 */
  const BG = {
    room: `<path d="M0 0 H200 V120 H0 Z" fill="#FDF4E4"/>
      <path d="M0 88 H200 V120 H0 Z" fill="#EBD6B4"/>
      <path d="M0 88 H200" stroke="#C6AC84" stroke-width="2"/>
      <path d="M140 16 H184 V50 H140 Z" fill="#DCEFF8" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/>
      <path d="M162 16 V50 M140 33 H184" stroke="${INK}" stroke-width="1.8"/>`,
    park: `<path d="M0 0 H200 V120 H0 Z" fill="#DFF1FA"/>
      <path d="M0 84 H200 V120 H0 Z" fill="#CFE9B8"/>
      <path d="M0 84 H200" stroke="#8FBE72" stroke-width="2"/>
      <path d="M16 22 a9 9 0 1 0 18 0 a9 9 0 1 0 -18 0" fill="#FFE08A" stroke="${INK}" stroke-width="2.2"/>
      <path d="M172 84 V42 L152 84 Z" fill="#F7C9D8" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/>
      <path d="M172 42 h8 v42" fill="none" stroke="${INK}" stroke-width="2.4"/>`,
    room2: `<path d="M0 0 H200 V120 H0 Z" fill="#F6F1E6"/>
      <path d="M0 86 H200 V120 H0 Z" fill="#DCC9A8"/>
      <path d="M0 86 H200" stroke="#BFA57D" stroke-width="2"/>
      <path d="M126 14 H188 V50 H126 Z" fill="#CDE3D2" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/>
      <path d="M134 24 h32 M134 32 h44 M134 40 h24" stroke="#FFFFFF" stroke-width="2.6" stroke-linecap="round"/>`,
  };

  /* ═══════════ 친구 그림 ═══════════
   * 머리(얼굴 부품 그대로)를 얹은 몸통. 얼굴은 상태에 따라 갈아 끼운다.
   * 얼굴 좌표(100×100)를 0.42배로 줄여 (36,4) 자리에 놓는다 — SVG 안쪽 transform 이라
   * DOM 끌어놓기 좌표에는 아무 영향이 없다. */
  function friendSvg(sel, u) {
    // 머리(얼굴 100×100 을 0.56배)를 몸통 위에 얹는다 — 목이 벌어지지 않게 살짝 겹친다
    return `<g class="friend">
      <path d="M60 112 C47 112 41 90 45 72 C49 50 71 50 75 72 C79 90 73 112 60 112 Z" fill="#9FD3E8" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/>
      <path d="M46 80 L32 94 M74 80 L88 94" fill="none" stroke="${INK}" stroke-width="2.8" stroke-linecap="round"/>
      <g class="face-svg friend-face"${faceAttrs(sel)} data-uid="${u || ''}" transform="translate(32,14) scale(0.56)">${faceInner(sel)}</g>
    </g>`;
  }

  /* 장면 한 장 — 배경 + 소품 + 친구 */
  function sceneSvg(scene, sel, u) {
    if (!scene) return '';
    return `<svg class="scene-svg" viewBox="0 0 200 120" width="100%" xmlns="http://www.w3.org/2000/svg">` +
      (BG[scene.bg] || '') + (scene.prop || '') + friendSvg(sel || scene.look, u) + `</svg>`;
  }

  /* 도움을 받은 뒤 친구 얼굴 — 어느 카드를 줘도 밝아진다 */
  const HAPPY = { brow: 'curve', eyes: 'smile', mouth: 'smile' };

  /* ═══════════ 묶음 3개 ═══════════ */
  const GROUPS = [
    { id: 'home',   name: '집',       desc: '집에서 있는 일', cls: 'c-l1', bg: 'room' },
    { id: 'park',   name: '놀이터',   desc: '밖에서 있는 일', cls: 'c-l2', bg: 'park' },
    { id: 'kinder', name: '유치원',   desc: '유치원에서 있는 일', cls: 'c-l3', bg: 'room2' },
  ];
  const groupDef = id => GROUPS.find(g => g.id === id) || null;

  /* 소품 몇 가지 (장면마다 하나씩) */
  const P = {
    blocks:  `<path d="M112 76 h20 v14 h-20 Z" fill="#F79EB4" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/>
      <path d="M138 80 h18 v10 h-18 Z" fill="#FFE08A" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round" transform="rotate(14 147 85)"/>
      <path d="M160 78 h16 v12 h-16 Z" fill="#9FD3E8" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round" transform="rotate(-10 168 84)"/>`,
    crayon:  `<path d="M120 84 l24 -8 l4 8 l-24 8 Z" fill="#F79EB4" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/>
      <path d="M148 76 l8 4 l-4 8 Z" fill="#FFE08A" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/>`,
    rain:    `<path d="M144 22 q-8 0 -8 8 q-8 2 -6 9 h34 q3 -8 -5 -10 q-2 -9 -15 -7 Z" fill="#EAF3F8" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/>
      <path d="M142 44 v8 M152 42 v10 M162 44 v8" stroke="#7FB6D8" stroke-width="2.8" stroke-linecap="round"/>`,
    lamp:    `<path d="M150 46 l16 0 l8 18 h-32 Z" fill="#FFE08A" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/>
      <path d="M158 64 v20 M148 88 h20" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/>`,
    shoes:   `<path d="M118 82 q0 -8 8 -8 q6 0 8 6 l10 4 v6 h-26 Z" fill="#9FD3E8" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/>
      <path d="M150 82 q0 -8 8 -8 q6 0 8 6 l10 4 v6 h-26 Z" fill="#F79EB4" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/>`,
    spill:   `<path d="M128 62 h16 v16 h-16 Z" fill="#EAF3F8" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round" transform="rotate(28 136 70)"/>
      <path d="M124 88 q10 -8 24 -4 q12 4 20 2 q-6 8 -22 8 q-16 0 -22 -6 Z" fill="#BFE3F5" stroke="${INK}" stroke-width="2.2" stroke-linejoin="round"/>`,
    plate:   `<path d="M124 86 a22 8 0 1 0 44 0 a22 8 0 1 0 -44 0" fill="#FFFFFF" stroke="${INK}" stroke-width="2.4"/>
      <path d="M136 82 a10 6 0 1 0 20 0 a10 6 0 1 0 -20 0" fill="#F9D7A0" stroke="${INK}" stroke-width="2.2"/>`,
    bag:     `<path d="M126 62 h34 v28 h-34 Z" fill="#C8E6C2" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/>
      <path d="M136 62 q7 -12 14 0" fill="none" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/>`,
    book:    `<path d="M120 66 h24 v24 h-24 Z" fill="#F9D7A0" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/>
      <path d="M144 66 h24 v24 h-24 Z" fill="#FFF4DC" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/>
      <path d="M150 74 h12 M150 80 h12" stroke="${INK}" stroke-width="1.8" stroke-linecap="round"/>`,
    // 떨어진 아이스크림 — 콘이 옆으로 넘어져 있고 아래에 자국이 남았다
    icecream:`<g transform="rotate(52 150 62)">
      <path d="M140 40 a10 10 0 1 0 20 0 a10 10 0 1 0 -20 0" fill="#F7C9D8" stroke="${INK}" stroke-width="2.4"/>
      <path d="M142 48 l8 22 l8 -22 Z" fill="#F9D7A0" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/></g>
      <path d="M128 86 q14 -7 26 -2" fill="none" stroke="#E2A8BC" stroke-width="4.5" stroke-linecap="round"/>`,
    bike:    `<path d="M126 78 a9 9 0 1 0 18 0 a9 9 0 1 0 -18 0 M158 78 a9 9 0 1 0 18 0 a9 9 0 1 0 -18 0" fill="none" stroke="${INK}" stroke-width="2.6"/>
      <path d="M135 78 L150 62 h12 M150 62 L167 78 M144 62 h12" fill="none" stroke="#F79EB4" stroke-width="3" stroke-linecap="round"/>`,
    ladder:  `<path d="M140 84 V38 M164 84 V38 M140 46 h24 M140 58 h24 M140 70 h24" fill="none" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/>`,
    swing:   `<path d="M124 18 h52 M136 18 v40 M164 18 v40 M130 58 h40 v6 h-40 Z" fill="#F9D7A0" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/>`,
    sand:    `<path d="M120 88 q14 -22 30 -22 q16 0 30 22 Z" fill="#F1DDB0" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/>
      <path d="M142 66 v-10 h16 v10" fill="#F1DDB0" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/>`,
    bar:     `<path d="M128 84 V36 M176 84 V36 M124 36 H180" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>
      <path d="M150 36 v14" fill="none" stroke="#F79EB4" stroke-width="3" stroke-linecap="round"/>`,
    wave:    `<path d="M116 60 a9 9 0 1 0 18 0 a9 9 0 1 0 -18 0" fill="#FFE0BF" stroke="${INK}" stroke-width="2.4"/>
      <path d="M121 60 h.5 M129 60 h.5" stroke="${INK}" stroke-width="2.8" stroke-linecap="round"/>
      <path d="M119 66 q6 5 12 0" fill="none" stroke="${INK}" stroke-width="2.2" stroke-linecap="round"/>
      <path d="M125 70 v14 M125 74 l-12 -8 M125 74 l12 -8" fill="none" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/>`,
    bench:   `<path d="M118 70 h60 v8 h-60 Z" fill="#D9B98C" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/>
      <path d="M124 78 v10 M172 78 v10" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/>`,
    mic:     `<path d="M154 34 a8 8 0 0 1 16 0 v12 a8 8 0 0 1 -16 0 Z" fill="#D5CDF0" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/>
      <path d="M162 58 v22 M150 82 h24" fill="none" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/>`,
    tower:   `<path d="M132 76 h18 v12 h-18 Z" fill="#9FD3E8" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/>
      <path d="M134 64 h14 v12 h-14 Z" fill="#FFE08A" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/>
      <path d="M158 78 h14 v10 h-14 Z" fill="#F79EB4" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round" transform="rotate(16 165 83)"/>`,
    two:     `<path d="M132 62 a8 8 0 1 0 16 0 a8 8 0 1 0 -16 0" fill="#FFE0BF" stroke="${INK}" stroke-width="2.4"/>
      <path d="M126 88 q0 -18 14 -18 q14 0 14 18 Z" fill="#C8E6C2" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/>
      <path d="M160 62 a8 8 0 1 0 16 0 a8 8 0 1 0 -16 0" fill="#FFE0BF" stroke="${INK}" stroke-width="2.4"/>
      <path d="M154 88 q0 -18 14 -18 q14 0 14 18 Z" fill="#F7C9D8" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/>`,
    lunch:   `<path d="M124 64 h48 v24 h-48 Z" fill="#F79EB4" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/>
      <path d="M124 72 h48" stroke="${INK}" stroke-width="2"/>
      <path d="M142 60 h12 v4 h-12 Z" fill="#F79EB4" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/>`,
    brush:   `<path d="M120 88 L152 56 l8 8 l-32 32 Z" fill="#FFF4DC" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/>
      <path d="M152 56 l10 -10 l8 8 l-10 10 Z" fill="#9FD3E8" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/>`,
    sticker: `<path d="M126 60 h44 v30 h-44 Z" fill="#FFFFFF" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/>
      <path d="M136 70 a5 5 0 1 0 10 0 a5 5 0 1 0 -10 0 M152 70 a5 5 0 1 0 10 0 a5 5 0 1 0 -10 0 M144 82 a5 5 0 1 0 10 0 a5 5 0 1 0 -10 0" fill="#FFE08A" stroke="${INK}" stroke-width="2"/>`,
    plane:   `<path d="M118 84 L176 62 L150 88 L142 76 Z" fill="#FFFFFF" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/>
      <path d="M176 62 L142 76" fill="none" stroke="${INK}" stroke-width="2"/>`,
    note:    `<path d="M126 58 h44 v34 h-44 Z" fill="#FFFDF2" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/>
      <path d="M134 68 h28 M134 76 h28 M134 84 h18" stroke="#9FB6C6" stroke-width="2" stroke-linecap="round"/>`,
    milk:    `<path d="M104 56 h20 v10 l6 34 h-32 l6 -34 Z" fill="#FFFFFF" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/>
      <path d="M104 78 h20" stroke="#9FB6C6" stroke-width="2.4"/>`,
  };

  /* ═══════════ 장면 27개 ═══════════
   * line = 아이에게 보여 주고 읽어 주는 상황 한 줄
   * look = 도움을 받기 전 친구 얼굴 (아이가 만드는 얼굴과는 상관없다 — 정답이 아니다)
   * cards = 도움 카드 4장. 카드마다 reply(친구의 대답 1~2줄). 어느 것을 줘도 통한다.
   */
  const SCENES = [
    /* ───────── 집 ───────── */
    { id: 'h1', group: 'home', mood: 'sad', bg: 'room', prop: P.tower,
      look: { brow: 'down', eyes: 'teary', mouth: 'wave' },
      line: '한참 쌓은 블록 탑이 와르르 무너졌어.',
      cards: [
        { id: 'a', icon: 'hug',  name: '꼭 안아 주기', reply: ['안아 주니까 마음이 따뜻해졌어.', '이제 조금 괜찮아.'] },
        { id: 'b', icon: 'help', name: '같이 다시 쌓기', reply: ['같이 쌓으면 더 높이 올라갈 것 같아!'] },
        { id: 'c', icon: 'listen', name: '이야기 들어 주기', reply: ['들어 줘서 고마워.', '말하고 나니 마음이 가벼워.'] },
        { id: 'd', icon: 'talk', name: '괜찮다고 말해 주기', reply: ['네 말을 들으니 힘이 나.', '다시 해 볼래.'] },
      ] },
    { id: 'h2', group: 'home', mood: 'angry', bg: 'room', prop: P.crayon,
      look: { brow: 'up', eyes: 'squint', mouth: 'flat' },
      line: '내가 쓰던 크레용을 동생이 쓱 가져갔어.',
      cards: [
        { id: 'a', icon: 'listen', name: '화난 마음 들어 주기', reply: ['속에 있던 말을 다 했더니 시원해.'] },
        { id: 'b', icon: 'share', name: '하나씩 나눠 주기', reply: ['나눠 쓰니까 둘 다 그릴 수 있네!'] },
        { id: 'c', icon: 'wait',  name: '잠깐 쉬었다 하기', reply: ['숨을 크게 쉬니 마음이 가라앉아.'] },
        { id: 'd', icon: 'draw',  name: '같이 그림 그리기', reply: ['같이 그리니까 기분이 스르르 풀렸어.'] },
      ] },
    { id: 'h3', group: 'home', mood: 'bored', bg: 'room', prop: P.rain,
      look: { brow: 'flat', eyes: 'shy', mouth: 'flat' },
      line: '창밖에 비가 내려. 오늘은 종일 집에 있어.',
      cards: [
        { id: 'a', icon: 'play', name: '같이 놀자고 하기', reply: ['같이 놀 사람이 생기니 신난다!'] },
        { id: 'b', icon: 'draw', name: '그림 그리자고 하기', reply: ['비 오는 그림을 그려 볼래!'] },
        { id: 'c', icon: 'song', name: '노래 불러 주기', reply: ['노래를 들으니 마음이 통통 뛰어.'] },
        { id: 'd', icon: 'talk', name: '재미난 이야기 하기', reply: ['이야기가 재미있어서 시간이 훌쩍 갔어.'] },
      ] },
    { id: 'h4', group: 'home', mood: 'scared', bg: 'room', prop: P.lamp,
      look: { brow: 'high', eyes: 'wide', mouth: 'small' },
      line: '밤이 되어 방이 어둑해졌어.',
      cards: [
        { id: 'a', icon: 'hand', name: '손 잡아 주기', reply: ['손을 잡으니 마음이 놓여.'] },
        { id: 'b', icon: 'help', name: '작은 불 켜 주기', reply: ['불빛이 있으니 방이 포근해졌어.'] },
        { id: 'c', icon: 'doll', name: '인형 갖다 주기', reply: ['인형이랑 같이 있으니 든든해.'] },
        { id: 'd', icon: 'song', name: '자장 노래 해 주기', reply: ['노래를 들으니 스르르 편안해져.'] },
      ] },
    { id: 'h5', group: 'home', mood: 'proud', bg: 'room', prop: P.shoes,
      look: { brow: 'high', eyes: 'smile', mouth: 'open' },
      line: '혼자 힘으로 신발을 신었어!',
      cards: [
        { id: 'a', icon: 'clap',  name: '박수 쳐 주기', reply: ['박수 소리에 어깨가 으쓱해졌어!'] },
        { id: 'b', icon: 'talk',  name: '대단하다고 말하기', reply: ['그 말을 들으니 더 뿌듯해.'] },
        { id: 'c', icon: 'smile', name: '활짝 웃어 주기', reply: ['웃어 주니까 나도 웃음이 나와.'] },
        { id: 'd', icon: 'hug',   name: '꼭 안아 주기', reply: ['안아 주니 마음이 꽉 차는 것 같아.'] },
      ] },
    { id: 'h6', group: 'home', mood: 'sorry', bg: 'room', prop: P.spill,
      look: { brow: 'down', eyes: 'shy', mouth: 'wave' },
      line: '동생 그림 위에 물을 쏟았어.',
      cards: [
        { id: 'a', icon: 'talk',  name: '미안하다고 말하기', reply: ['말하고 나니 마음이 한결 가벼워.'] },
        { id: 'b', icon: 'help',  name: '같이 닦아 주기', reply: ['같이 치우니 금방 깨끗해졌어.'] },
        { id: 'c', icon: 'draw',  name: '새 그림 같이 그리기', reply: ['새 그림이 더 예쁘게 나왔어!'] },
        { id: 'd', icon: 'hug',   name: '꼭 안아 주기', reply: ['안아 주니 무거웠던 마음이 스르르 풀려.'] },
      ] },
    { id: 'h7', group: 'home', mood: 'thanks', bg: 'room', prop: P.plate,
      look: { brow: 'curve', eyes: 'smile', mouth: 'smile' },
      line: '엄마가 내가 좋아하는 간식을 만들어 주셨어.',
      cards: [
        { id: 'a', icon: 'talk',  name: '고맙다고 말하기', reply: ['고맙다고 말하니 마음이 반짝여.'] },
        { id: 'b', icon: 'hug',   name: '꼭 안아 주기', reply: ['안아 주니 마음이 폭신폭신해.'] },
        { id: 'c', icon: 'share', name: '나눠 먹기', reply: ['같이 먹으니 두 배로 맛있어!'] },
        { id: 'd', icon: 'draw',  name: '고마운 그림 그리기', reply: ['그림으로 마음을 전할 수 있어 좋아.'] },
      ] },
    { id: 'h8', group: 'home', mood: 'excited', bg: 'room', prop: P.bag,
      look: { brow: 'high', eyes: 'wide', mouth: 'open' },
      line: '내일은 할머니 댁에 가는 날이야.',
      cards: [
        { id: 'a', icon: 'talk', name: '같이 이야기 나누기', reply: ['이야기하니 내일이 더 기다려져!'] },
        { id: 'b', icon: 'help', name: '가방 같이 싸기', reply: ['같이 싸니까 훨씬 빨랐어!'] },
        { id: 'c', icon: 'draw', name: '갈 곳 그려 보기', reply: ['그림을 보니 벌써 간 것 같아.'] },
        { id: 'd', icon: 'song', name: '신나는 노래 하기', reply: ['노래를 부르니 마음이 통통 뛰어!'] },
      ] },
    { id: 'h9', group: 'home', mood: 'hurt', bg: 'room', prop: P.book,
      look: { brow: 'down', eyes: 'shy', mouth: 'frown' },
      line: '같이 놀자고 했는데 형은 책만 보고 있어.',
      cards: [
        { id: 'a', icon: 'listen', name: '마음 들어 주기', reply: ['들어 줘서 마음이 편해졌어.'] },
        { id: 'b', icon: 'talk',   name: '내 마음 말하기', reply: ['말하고 나니 속이 후련해.'] },
        { id: 'c', icon: 'play',   name: '같이 놀아 주기', reply: ['같이 노니까 기분이 확 좋아졌어!'] },
        { id: 'd', icon: 'wait',   name: '기다려 주기', reply: ['기다려 준 덕분에 이제 같이 놀 수 있어.'] },
      ] },

    /* ───────── 놀이터 ───────── */
    { id: 'p1', group: 'park', mood: 'sad', bg: 'park', prop: P.icecream,
      look: { brow: 'down', eyes: 'teary', mouth: 'wave' },
      line: '들고 있던 아이스크림이 툭 떨어졌어.',
      cards: [
        { id: 'a', icon: 'hug',    name: '꼭 안아 주기', reply: ['안아 주니 눈물이 쏙 들어갔어.'] },
        { id: 'b', icon: 'share',  name: '내 것 나눠 주기', reply: ['나눠 줘서 고마워. 같이 먹으니 더 맛있다!'] },
        { id: 'c', icon: 'listen', name: '이야기 들어 주기', reply: ['속상한 마음을 말했더니 가벼워졌어.'] },
        { id: 'd', icon: 'talk',   name: '괜찮다고 말해 주기', reply: ['네 말을 들으니 마음이 놓여.'] },
      ] },
    { id: 'p2', group: 'park', mood: 'envy', bg: 'park', prop: P.bike,
      look: { brow: 'down', eyes: 'squint', mouth: 'flat' },
      line: '친구가 새 자전거를 타고 씽씽 달려.',
      cards: [
        { id: 'a', icon: 'listen', name: '마음 들어 주기', reply: ['부러운 마음을 말했더니 시원해.'] },
        { id: 'b', icon: 'talk',   name: '같이 타 보자 하기', reply: ['같이 타자고 하니 신이 나!'] },
        { id: 'c', icon: 'play',   name: '다른 놀이 같이 하기', reply: ['같이 노니까 금세 즐거워졌어.'] },
        { id: 'd', icon: 'smile',  name: '멋지다고 말해 주기', reply: ['말해 주니 마음이 환해졌어.'] },
      ] },
    { id: 'p3', group: 'park', mood: 'scared', bg: 'park', prop: P.ladder,
      look: { brow: 'high', eyes: 'wide', mouth: 'small' },
      line: '미끄럼틀 사다리가 아주 높아 보여.',
      cards: [
        { id: 'a', icon: 'hand', name: '손 잡아 주기', reply: ['손을 잡으니 한 칸 올라갈 힘이 나.'] },
        { id: 'b', icon: 'wait', name: '천천히 기다려 주기', reply: ['천천히 하니 마음이 놓여.'] },
        { id: 'c', icon: 'talk', name: '옆에 있다고 말하기', reply: ['옆에 있어 주니 든든해.'] },
        { id: 'd', icon: 'help', name: '같이 올라가 주기', reply: ['같이 올라가니 무섭던 게 작아졌어!'] },
      ] },
    { id: 'p4', group: 'park', mood: 'joy', bg: 'park', prop: P.swing,
      look: { brow: 'high', eyes: 'smile', mouth: 'open' },
      line: '그네를 하늘까지 높이 탔어!',
      cards: [
        { id: 'a', icon: 'clap',  name: '박수 쳐 주기', reply: ['박수 소리에 더 신이 나!'] },
        { id: 'b', icon: 'play',  name: '같이 타기', reply: ['둘이 타니 웃음이 계속 나와!'] },
        { id: 'c', icon: 'smile', name: '같이 웃어 주기', reply: ['같이 웃으니 마음이 두 배로 커져.'] },
        { id: 'd', icon: 'song',  name: '신나는 노래 하기', reply: ['노래하며 타니까 하늘까지 닿을 것 같아!'] },
      ] },
    { id: 'p5', group: 'park', mood: 'angry', bg: 'park', prop: P.sand,
      look: { brow: 'up', eyes: 'squint', mouth: 'frown' },
      line: '공들여 쌓은 모래성이 폭삭 무너졌어.',
      cards: [
        { id: 'a', icon: 'listen', name: '화난 마음 들어 주기', reply: ['말하고 나니 화가 스르르 작아졌어.'] },
        { id: 'b', icon: 'wait',   name: '숨 크게 쉬기', reply: ['숨을 쉬니 마음이 차분해져.'] },
        { id: 'c', icon: 'help',   name: '같이 다시 쌓기', reply: ['같이 쌓으니 더 큰 성이 됐어!'] },
        { id: 'd', icon: 'water',  name: '물 떠다 주기', reply: ['물을 부으니 모래가 잘 뭉쳐져. 고마워!'] },
      ] },
    { id: 'p6', group: 'park', mood: 'proud', bg: 'park', prop: P.bar,
      look: { brow: 'high', eyes: 'smile', mouth: 'smile' },
      line: '처음으로 철봉에 매달렸어!',
      cards: [
        { id: 'a', icon: 'clap',  name: '박수 쳐 주기', reply: ['박수를 받으니 어깨가 쭉 펴져!'] },
        { id: 'b', icon: 'talk',  name: '멋지다고 말하기', reply: ['그 말에 마음이 반짝반짝해.'] },
        { id: 'c', icon: 'smile', name: '활짝 웃어 주기', reply: ['웃는 얼굴을 보니 나도 웃음이 나.'] },
        { id: 'd', icon: 'play',  name: '같이 해 보기', reply: ['같이 매달리니 더 재미있어!'] },
      ] },
    { id: 'p7', group: 'park', mood: 'shy', bg: 'park', prop: P.wave,
      look: { brow: 'curve', eyes: 'shy', mouth: 'small' },
      line: '처음 보는 친구가 이름을 물어봤어.',
      cards: [
        { id: 'a', icon: 'hand',  name: '손 잡아 주기', reply: ['손을 잡으니 용기가 조금 생겨.'] },
        { id: 'b', icon: 'wait',  name: '천천히 기다려 주기', reply: ['천천히 하니 말이 나왔어!'] },
        { id: 'c', icon: 'talk',  name: '대신 인사해 주기', reply: ['먼저 인사해 줘서 마음이 편해졌어.'] },
        { id: 'd', icon: 'smile', name: '옆에서 웃어 주기', reply: ['웃어 주니 부끄러움이 살살 녹아.'] },
      ] },
    { id: 'p8', group: 'park', mood: 'thanks', bg: 'park', prop: P.bench,
      look: { brow: 'curve', eyes: 'smile', mouth: 'small' },
      line: '넘어져서 무릎이 아팠는데 친구가 일으켜 줬어.',
      cards: [
        { id: 'a', icon: 'band',  name: '밴드 붙여 주기', reply: ['밴드를 붙이니 무릎이 한결 나아.'] },
        { id: 'b', icon: 'talk',  name: '고맙다고 말하기', reply: ['고맙다고 말하니 마음이 따뜻해.'] },
        { id: 'c', icon: 'hand',  name: '손 잡고 걷기', reply: ['손 잡고 걸으니 든든해.'] },
        { id: 'd', icon: 'gift',  name: '작은 선물 주기', reply: ['마음을 담은 선물이라 더 좋아!'] },
      ] },
    { id: 'p9', group: 'park', mood: 'bored', bg: 'park', prop: P.bench,
      look: { brow: 'flat', eyes: 'shy', mouth: 'flat' },
      line: '놀이터에 아무도 없어서 혼자 앉아 있어.',
      cards: [
        { id: 'a', icon: 'play',   name: '같이 놀자고 하기', reply: ['같이 놀 친구가 생겨서 신나!'] },
        { id: 'b', icon: 'talk',   name: '말 걸어 주기', reply: ['말을 걸어 줘서 반가웠어.'] },
        { id: 'c', icon: 'listen', name: '옆에 앉아 주기', reply: ['옆에 같이 앉아 주니 마음이 든든해.'] },
        { id: 'd', icon: 'song',   name: '노래 불러 주기', reply: ['노래를 들으니 심심함이 사라졌어!'] },
      ] },

    /* ───────── 유치원 ───────── */
    { id: 'k1', group: 'kinder', mood: 'shy', bg: 'room2', prop: P.mic,
      look: { brow: 'curve', eyes: 'shy', mouth: 'small' },
      line: '앞에 나가서 노래할 차례가 됐어.',
      cards: [
        { id: 'a', icon: 'hand',  name: '손 잡아 주기', reply: ['손을 잡으니 떨림이 조금 줄었어.'] },
        { id: 'b', icon: 'song',  name: '같이 불러 주기', reply: ['같이 부르니 목소리가 커졌어!'] },
        { id: 'c', icon: 'talk',  name: '잘한다고 말해 주기', reply: ['그 말에 용기가 생겨.'] },
        { id: 'd', icon: 'smile', name: '앞에서 웃어 주기', reply: ['웃는 얼굴을 보니 마음이 놓여.'] },
      ] },
    { id: 'k2', group: 'kinder', mood: 'sorry', bg: 'room2', prop: P.blocks,
      look: { brow: 'down', eyes: 'shy', mouth: 'wave' },
      line: '지나가다 친구 블록을 실수로 건드렸어.',
      cards: [
        { id: 'a', icon: 'talk',  name: '미안하다고 말하기', reply: ['말해 줘서 마음이 풀렸어.'] },
        { id: 'b', icon: 'help',  name: '같이 다시 쌓기', reply: ['같이 쌓으니 금방 원래대로!'] },
        { id: 'c', icon: 'hand',  name: '손 내밀기', reply: ['손을 잡으니 우리 다시 친구야.'] },
        { id: 'd', icon: 'gift',  name: '블록 하나 주기', reply: ['이 블록으로 더 멋지게 만들래!'] },
      ] },
    { id: 'k3', group: 'kinder', mood: 'hurt', bg: 'room2', prop: P.two,
      look: { brow: 'down', eyes: 'teary', mouth: 'frown' },
      line: '짝꿍이 오늘은 다른 친구랑만 놀아.',
      cards: [
        { id: 'a', icon: 'listen', name: '마음 들어 주기', reply: ['들어 줘서 마음이 한결 나아.'] },
        { id: 'b', icon: 'talk',   name: '내 마음 말해 주기', reply: ['말하고 나니 속이 시원해.'] },
        { id: 'c', icon: 'play',   name: '셋이 같이 놀기', reply: ['셋이 노니까 더 재미있어!'] },
        { id: 'd', icon: 'hug',    name: '꼭 안아 주기', reply: ['안아 주니 서운함이 살살 녹아.'] },
      ] },
    { id: 'k4', group: 'kinder', mood: 'excited', bg: 'room2', prop: P.lunch,
      look: { brow: 'high', eyes: 'wide', mouth: 'open' },
      line: '내일은 기다리던 소풍 가는 날이야.',
      cards: [
        { id: 'a', icon: 'talk',  name: '같이 이야기하기', reply: ['이야기하니 내일이 더 기다려져!'] },
        { id: 'b', icon: 'draw',  name: '소풍 그림 그리기', reply: ['그림을 그리니 벌써 소풍 온 것 같아.'] },
        { id: 'c', icon: 'song',  name: '소풍 노래 하기', reply: ['노래하니 마음이 폴짝폴짝 뛰어!'] },
        { id: 'd', icon: 'share', name: '간식 나누기로 하기', reply: ['같이 먹을 생각에 더 신나!'] },
      ] },
    { id: 'k5', group: 'kinder', mood: 'joy', bg: 'room2', prop: P.brush,
      look: { brow: 'curve', eyes: 'smile', mouth: 'open' },
      line: '제일 좋아하는 그림 그리기 시간이야!',
      cards: [
        { id: 'a', icon: 'draw',  name: '같이 그리기', reply: ['같이 그리니 그림이 두 배로 커졌어!'] },
        { id: 'b', icon: 'smile', name: '같이 웃어 주기', reply: ['웃음이 그림에도 묻어나는 것 같아.'] },
        { id: 'c', icon: 'share', name: '색 나눠 주기', reply: ['이 색을 기다렸어. 고마워!'] },
        { id: 'd', icon: 'clap',  name: '박수 쳐 주기', reply: ['박수를 받으니 더 신나게 그릴래!'] },
      ] },
    { id: 'k6', group: 'kinder', mood: 'envy', bg: 'room2', prop: P.sticker,
      look: { brow: 'down', eyes: 'squint', mouth: 'flat' },
      line: '친구 그림에는 스티커가 많이 붙었어.',
      cards: [
        { id: 'a', icon: 'listen', name: '마음 들어 주기', reply: ['부러운 마음을 말하니 편해졌어.'] },
        { id: 'b', icon: 'share',  name: '스티커 나눠 주기', reply: ['나눠 줘서 내 그림도 반짝여!'] },
        { id: 'c', icon: 'smile',  name: '멋지다고 말해 주기', reply: ['내 그림도 멋지다니 기분이 좋아.'] },
        { id: 'd', icon: 'draw',   name: '같이 꾸며 주기', reply: ['같이 꾸미니 그림이 더 예뻐졌어!'] },
      ] },
    { id: 'k7', group: 'kinder', mood: 'sad', bg: 'room2', prop: P.plane,
      look: { brow: 'down', eyes: 'teary', mouth: 'wave' },
      line: '접은 종이비행기가 쭉 찢어졌어.',
      cards: [
        { id: 'a', icon: 'hug',   name: '꼭 안아 주기', reply: ['안아 주니 눈물이 쏙 들어갔어.'] },
        { id: 'b', icon: 'help',  name: '새로 접어 주기', reply: ['새 비행기가 더 멀리 날아!'] },
        { id: 'c', icon: 'talk',  name: '괜찮다고 말해 주기', reply: ['그 말을 들으니 마음이 놓여.'] },
        { id: 'd', icon: 'share', name: '내 종이 나눠 주기', reply: ['종이를 나눠 줘서 다시 만들 수 있어!'] },
      ] },
    { id: 'k8', group: 'kinder', mood: 'proud', bg: 'room2', prop: P.note,
      look: { brow: 'high', eyes: 'smile', mouth: 'smile' },
      line: '내 이름을 혼자서 끝까지 썼어!',
      cards: [
        { id: 'a', icon: 'clap',  name: '박수 쳐 주기', reply: ['박수 소리에 마음이 두둥실!'] },
        { id: 'b', icon: 'talk',  name: '대단하다고 말하기', reply: ['그 말에 더 크게 쓰고 싶어져.'] },
        { id: 'c', icon: 'smile', name: '활짝 웃어 주기', reply: ['웃어 주니 뿌듯함이 더 커져.'] },
        { id: 'd', icon: 'gift',  name: '칭찬 도장 주기', reply: ['도장을 보니 하루 종일 기분이 좋아!'] },
      ] },
    { id: 'k9', group: 'kinder', mood: 'thanks', bg: 'room2', prop: P.milk,
      look: { brow: 'curve', eyes: 'smile', mouth: 'small' },
      line: '선생님이 우유를 열어 주셨어.',
      cards: [
        { id: 'a', icon: 'talk',  name: '고맙다고 말하기', reply: ['고맙다고 말하니 마음이 반짝여.'] },
        { id: 'b', icon: 'draw',  name: '고마운 그림 그리기', reply: ['그림으로 마음을 전할 수 있어 좋아.'] },
        { id: 'c', icon: 'help',  name: '친구 것도 열어 주기', reply: ['받은 마음을 나누니 더 따뜻해.'] },
        { id: 'd', icon: 'smile', name: '활짝 웃어 주기', reply: ['웃으니 고마운 마음이 그대로 전해져.'] },
      ] },
  ];

  const scenesOf = gid => SCENES.filter(s => s.group === gid);
  const sceneById = id => SCENES.find(s => s.id === id) || null;

  /* 얼굴을 다 만들었을 때 들려주는 말 — 어떤 얼굴이든 받아 준다 */
  const facePraises = [
    '그런 마음이구나. 잘 알아줬어!',
    '친구 마음을 이렇게 봤구나.',
    '네가 만든 얼굴, 참 잘 어울려.',
    '마음을 얼굴로 그려 줬구나!',
  ];
  /* 카드를 건넸을 때의 칭찬 */
  const praises = [
    '따뜻한 마음이야!',
    '친구가 고마워하네!',
    '마음을 잘 나눠 줬어.',
    '네 덕분에 친구가 웃었어!',
  ];

  return {
    PARTS, SLOTS, SLOT_COLOR, partMeta, partPaths, faceSvg,
    MOODS, moodMeta,
    ICONS, iconSvg,
    BG, friendSvg, sceneSvg, HAPPY,
    GROUPS, groupDef,
    SCENES, scenesOf, sceneById,
    facePraises, praises,
    // 그라데이션 id 충돌을 막을 일련번호 (얼굴을 여러 곳에 그린다)
    nextUid: (() => { let n = 0; return () => 'hf' + (++n); })(),
  };
})();
