#!/usr/bin/env node
/* 종단 테스트 — node coloring/tools/e2e.mjs
 * 실제 Chromium으로 홈(그림 고르기) → 색칠(물통·크레용) → 되돌리기·전체지우기 →
 * 보관(축하·펫·갤러리) → 새로고침 후 갤러리 유지 → 3해상도 잘림까지 검증한다.
 * 저장소 루트에서 정적 서버가 떠 있어야 한다 (예: python3 -m http.server 8777)
 */
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');

const BASE = process.env.BASE_URL || 'http://127.0.0.1:8777/coloring/';
let passed = 0, failed = 0;
function ok(name) { passed++; console.log('  ✅ ' + name); }
function fail(name, extra) { failed++; console.error('  ❌ ' + name + (extra ? ' — ' + extra : '')); }
async function check(name, fn) { try { await fn(); ok(name); } catch (e) { fail(name, e.message); } }
function expect(cond, msg) { if (!cond) throw new Error(msg || 'expect 실패'); }

// 캔버스의 그림공간 좌표(0~100)를 화면 좌표로 환산해 클릭/드래그
async function canvasPoint(page, vbx, vby) {
  const b = await page.locator('#paint-canvas').boundingBox();
  return { x: b.x + (vbx / 100) * b.width, y: b.y + (vby / 100) * b.height };
}
async function tapCanvas(page, vbx, vby) {
  const p = await canvasPoint(page, vbx, vby);
  await page.mouse.click(p.x, p.y);
}
async function dragCanvas(page, pts) {
  const a = await canvasPoint(page, pts[0][0], pts[0][1]);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  for (let i = 1; i < pts.length; i++) {
    const p = await canvasPoint(page, pts[i][0], pts[i][1]);
    await page.mouse.move(p.x, p.y, { steps: 6 });
  }
  await page.mouse.up();
}
const dark = px => (px[0] + px[1] + px[2]) < 360;   // 어두운 밑그림 선
const white = px => px[0] > 245 && px[1] > 245 && px[2] > 245;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1180, height: 820 } });
const consoleErrors = [];
page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
page.on('pageerror', e => consoleErrors.push(String(e)));

await page.goto(BASE);

await check('홈: 카테고리 칩 5개 + 썸네일 30장 + 별 0', async () => {
  await page.waitForSelector('#scr-home.on');
  expect(await page.locator('#cat-chips .cat-chip').count() === 5, '칩 수');
  expect(await page.locator('#pic-grid .pic-card').count() === 30, '썸네일 수');
  expect((await page.locator('#home-stars').textContent()) === '0', '별 수');
});

await check('카테고리 필터: 과일·음식 → 8장', async () => {
  await page.locator('.cat-chip', { hasText: '과일' }).click();
  expect(await page.locator('#pic-grid .pic-card').count() === 8, '음식 그림 수');
  await page.locator('.cat-chip', { hasText: '전체' }).click();
  expect(await page.locator('#pic-grid .pic-card').count() === 30, '전체 복귀');
});

// DESIGN.md 「첫 화면 규격」 — 흩뿌리기는 기울기만, **빽빽한 썸네일 격자에는 그마저 안 넣는다**
// (밑그림 30장이라 칸이 촘촘해 기울기·이동·확대가 그대로 옆 칸을 파고들었다).
// 예전에는 이 자리에서 '칸마다 다른 기울기'를 요구했는데, 규격이 바뀌어 반대로 잰다.
await check('썸네일 격자는 반듯하다 (기울기·이동·확대 없음) + 겹침 없음', async () => {
  const r = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('.pic-card')];
    const skewed = cards.filter(c => {
      const s = getComputedStyle(c);
      return (s.transform !== 'none' && s.transform !== 'matrix(1, 0, 0, 1, 0, 0)') ||
             (s.rotate !== 'none' && s.rotate !== '0deg') ||
             (s.scale !== 'none' && s.scale !== '1') ||
             (s.translate !== 'none' && s.translate !== '0px');
    }).length;
    const rects = cards.map(c => c.getBoundingClientRect());
    let overlaps = 0;
    for (let i = 0; i < rects.length; i++) for (let j = i + 1; j < rects.length; j++) {
      const a = rects[i], b = rects[j];
      const ox = Math.min(a.right, b.right) - Math.max(a.left, b.left);
      const oy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      if (ox > 0.5 && oy > 0.5) overlaps++;
    }
    const off = rects.filter(a => a.left < -0.5 || a.right > window.innerWidth + 0.5).length;
    return { skewed, overlaps, off };
  });
  expect(r.skewed === 0, '썸네일 칸에 변형이 걸려 있음: ' + r.skewed + '칸');
  expect(r.overlaps === 0, '칸끼리 겹침: ' + r.overlaps + '쌍');
  expect(r.off === 0, '화면 밖으로 나간 칸: ' + r.off);
});

await check('크기 위계: 아직 안 한 첫 그림이 크게 (두 칸 × 두 줄)', async () => {
  const r = await page.evaluate(() => {
    const big = [...document.querySelectorAll('.pic-card.next-up')];
    const normal = document.querySelector('.pic-card:not(.next-up)');
    return {
      n: big.length,
      id: big[0] && big[0].dataset.id,
      bw: big[0] ? big[0].getBoundingClientRect().width : 0,
      nw: normal ? normal.getBoundingClientRect().width : 0,
    };
  });
  expect(r.n === 1, '크게 보이는 칸은 딱 하나여야: ' + r.n);
  expect(r.id === 'dog', '아직 안 한 첫 그림이어야: ' + r.id);
  expect(r.bw > r.nw * 1.6, '보통 칸보다 훨씬 커야: ' + r.nw.toFixed(0) + ' → ' + r.bw.toFixed(0));
});

await check('그림 진입: 강아지 색칠 화면', async () => {
  await page.locator('.pic-card[data-id="dog"]').click();
  await page.waitForSelector('#scr-paint.on');
  const d = await page.evaluate(() => App.debug());
  expect(d.picId === 'dog', '그림 id: ' + d.picId);
  expect(d.painted === 0, '처음엔 칠해진 픽셀 0: ' + d.painted);
});

await check('손그림 아이콘: 도구·조작 단추가 이모지 대신 <use> SVG', async () => {
  const r = await page.evaluate(() => {
    // 목소리 설정(#btn-voice)은 부모용이라 놀이 화면에서 감췄다(shared/crayon.css) — 부모님 페이지에서 바꾼다.
    // 안 보이는 단추의 아이콘 모양을 재면 오탐이 나므로 목록에서 뺐다. 나머지 단추는 그대로 잰다.
    const btns = [...document.querySelectorAll('.tool-btn, .act-btn, .back, #btn-gallery')];
    const hrefs = [], noIcon = [], leftoverEmoji = [];
    btns.forEach(b => {
      const u = b.querySelector('use');
      if (!u) { noIcon.push(b.getAttribute('aria-label')); return; }
      hrefs.push(u.getAttribute('href'));
      if (/\p{Extended_Pictographic}/u.test(b.textContent)) leftoverEmoji.push(b.getAttribute('aria-label'));
    });
    const missing = hrefs.filter(h => !h || !h.startsWith('#i-') || !document.querySelector(h));
    // 삐뚤한 손그림을 만드는 필터가 실제로 걸려 있는지
    const rough = [...document.querySelectorAll('.ico-sprite filter feDisplacementMap')].length;
    const turb = [...document.querySelectorAll('.ico-sprite filter feTurbulence')].length;
    return { n: btns.length, noIcon, leftoverEmoji, missing, rough, turb };
  });
  expect(r.n >= 8, '아이콘 단추 수: ' + r.n);
  expect(r.noIcon.length === 0, '아직 이모지인 단추: ' + r.noIcon.join(','));
  expect(r.leftoverEmoji.length === 0, '이모지가 남은 단추: ' + r.leftoverEmoji.join(','));
  expect(r.missing.length === 0, '없는 심볼을 가리킴: ' + r.missing.join(','));
  expect(r.turb > 0 && r.rough > 0, 'feTurbulence + feDisplacementMap 이 있어야: ' + r.turb + '/' + r.rough);
});

await check('색칠 좌표 안전: 캔버스에 변형·테두리가 없다 (물통이 새지 않게)', async () => {
  const r = await page.evaluate(() => {
    const c = document.querySelector('#paint-canvas');
    const s = getComputedStyle(c);
    const w = document.querySelector('.canvas-wrap');
    return {
      t: s.transform, ws: getComputedStyle(w).transform,
      bl: parseFloat(s.borderLeftWidth), bt: parseFloat(s.borderTopWidth),
      pl: parseFloat(s.paddingLeft), pt: parseFloat(s.paddingTop),
      box: c.getBoundingClientRect().width, res: c.width,
    };
  });
  expect(r.t === 'none', '캔버스에 transform 이 걸리면 좌표가 틀어진다: ' + r.t);
  expect(r.ws === 'none', '캔버스 감싼 칸에도 transform 금지: ' + r.ws);
  expect(r.bl === 0 && r.bt === 0, '테두리는 getBoundingClientRect 를 밀어 좌표를 어긋나게 한다: ' + r.bl + '/' + r.bt);
  expect(r.pl === 0 && r.pt === 0, '캔버스 안쪽 여백 금지: ' + r.pl + '/' + r.pt);
  expect(r.res === 500, '내부 래스터 한 변: ' + r.res);
});

await check('물통 채우기: 얼굴 영역이 색으로 차오른다 (픽셀 확인)', async () => {
  // 기본 도구=물통, 기본 색=빨강. 얼굴 안쪽(눈 위)을 탭.
  await page.evaluate(() => App._setTool('fill'));
  await tapCanvas(page, 50, 40);
  await page.waitForTimeout(120);
  const px = await page.evaluate(() => App._painter().pixelAt(50, 40));
  expect(!white(px), '탭한 자리가 흰색이 아니어야: ' + px);
  expect(px[0] > 180 && px[1] < 130, '빨강 계열로 채워져야: ' + px); // #E8483F
  const d = await page.evaluate(() => App.debug());
  expect(d.painted > 2000, '채워진 픽셀 수: ' + d.painted);
});

await check('물통 채우기가 선을 넘지 않는다: 바깥 배경은 아직 흰색', async () => {
  const px = await page.evaluate(() => App._painter().pixelAt(4, 4)); // 그림 바깥 구석
  expect(white(px), '바깥은 흰색이어야 (새지 않음): ' + px);
});

await check('크레용 드래그: 자유롭게 칠하면 색이 더 늘어난다', async () => {
  const before = (await page.evaluate(() => App.debug())).painted;
  await page.evaluate(() => { App._setTool('crayon'); App._setColor('#3B6FE0'); }); // 파랑 크레용
  await dragCanvas(page, [[35, 46], [45, 48], [55, 46], [62, 50]]);
  await page.waitForTimeout(120);
  const after = (await page.evaluate(() => App.debug())).painted;
  expect(after > before, '크레용 후 픽셀 증가: ' + before + ' → ' + after);
  // 파랑이 실제로 찍혔는지 (드래그 경로 위)
  const px = await page.evaluate(() => App._painter().pixelAt(45, 48));
  expect(px[2] > 150 && px[0] < 150, '파랑 크레용 자국: ' + px);
});

await check('밑그림 안내선이 흐린 점선으로 남아있다 (따라 그리기용)', async () => {
  // 안내선은 아이가 따라 그리도록 흐린 점선 — 보이되(픽셀 존재) 진하지 않아야(어두운 픽셀 0) 한다
  const g = await page.evaluate(() => App._painter().guideStats());
  expect(g.count > 500, '안내선 점선이 보여야(픽셀 존재): ' + g.count);
  expect(g.dark === 0, '안내선은 흐려야 하는데 진한 픽셀이 있음: ' + g.dark);
});

await check('되돌리기: 마지막 크레용 획이 사라진다', async () => {
  const before = (await page.evaluate(() => App.debug())).painted;
  await page.click('#btn-undo');
  await page.waitForTimeout(80);
  const after = (await page.evaluate(() => App.debug())).painted;
  expect(after < before, '되돌리기 후 픽셀 감소: ' + before + ' → ' + after);
});

await check('전체 지우기: 두 번 눌러 확인 → 모두 지워진다', async () => {
  await page.click('#btn-clear');
  let d = await page.evaluate(() => App.debug());
  expect(d.clearArmed === true, '첫 클릭에 확인 대기여야');
  await page.click('#btn-clear');
  await page.waitForTimeout(80);
  d = await page.evaluate(() => App.debug());
  expect(d.painted === 0, '전체 지우기 후 0: ' + d.painted);
});

await check('보관: 축하 + 별 + 펫 간식 + 갤러리 저장', async () => {
  await tapCanvas(page, 50, 40); // 한 번 칠하고
  await page.waitForTimeout(80);
  await page.click('#btn-save');
  await page.waitForSelector('#reward.on', { timeout: 4000 });
  const d = await page.evaluate(() => App.debug());
  expect(d.stars === 1, '별: ' + d.stars);
  expect(d.galleryCount === 1, '갤러리 수: ' + d.galleryCount);
  expect(d.doneCount === 1, '완성 그림 수: ' + d.doneCount);
  const pet = await page.evaluate(() => window.Pet && Pet.state());
  expect(pet && pet.snacks === 1, '펫 간식: ' + JSON.stringify(pet));
});

await check('갤러리 보기: 완성작 1장이 보인다', async () => {
  await page.click('#reward-next'); // 갤러리 보기
  await page.waitForSelector('#scr-gallery.on');
  expect(await page.locator('#gallery-grid .art-card').count() === 1, '갤러리 카드 수');
  const src = await page.locator('#gallery-grid .art-img').first().getAttribute('src');
  expect(src && src.startsWith('data:image/png'), '작품 이미지 dataURL');
});

await check('새로고침 후 갤러리·별 유지', async () => {
  await page.goto(BASE);
  await page.waitForSelector('#scr-home.on');
  expect((await page.locator('#home-stars').textContent()) === '1', '별 유지');
  expect((await page.locator('#gallery-badge').textContent()) === '1', '갤러리 배지');
  expect(await page.locator('.pic-card[data-id="dog"] .pc-done').count() === 1, '완성 별 표시');
  await page.click('#btn-gallery');
  await page.waitForSelector('#scr-gallery.on');
  expect(await page.locator('#gallery-grid .art-card').count() === 1, '갤러리 복원');
});

await check('3해상도 잘림 없음 (가로 넘침·세로 넘침 검사)', async () => {
  const views = [
    { w: 1180, h: 820, name: '패드 가로', noVScrollPaint: true },
    { w: 844, h: 390, name: '폰 가로', noVScrollPaint: true },
    { w: 390, h: 844, name: '폰 세로', noVScrollPaint: false },
  ];
  for (const v of views) {
    await page.setViewportSize({ width: v.w, height: v.h });
    await page.goto(BASE);
    await page.waitForSelector('#scr-home.on');
    // 홈: 가로 넘침 없음
    let of = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
    expect(of.sw <= of.cw + 1, v.name + ' 홈 가로 넘침: ' + JSON.stringify(of));
    // 색칠 화면
    await page.locator('.pic-card[data-id="cat"]').click();
    await page.waitForSelector('#scr-paint.on');
    of = await page.evaluate(() => {
      const el = document.querySelector('#scr-paint');
      return { sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, sh: el.scrollHeight, ch: el.clientHeight };
    });
    expect(of.sw <= of.cw + 1, v.name + ' 색칠 가로 넘침: ' + JSON.stringify(of));
    if (v.noVScrollPaint) expect(of.sh <= of.ch + 2, v.name + ' 색칠 세로 넘침(가로모드 잘림): ' + JSON.stringify(of));
    // 캔버스가 화면 안에 있는지
    const cb = await page.locator('#paint-canvas').boundingBox();
    expect(cb.x >= -1 && cb.y >= -1 && cb.x + cb.width <= v.w + 1 && cb.y + cb.height <= v.h + 1,
      v.name + ' 캔버스 화면 밖: ' + JSON.stringify(cb));
  }
  await page.setViewportSize({ width: 1180, height: 820 });
});

const SPEC_HOME = '#scr-home.on';
const SPEC_BOXES = 'h1, .stats, #cat-chips > *, #pic-grid > *';
const SPEC_GRID = '#pic-grid';
/* ═══════════ 첫 화면 규격 (DESIGN.md 「첫 화면 규격 (놀이 고르는 화면)」) ═══════════
 * 지난 라운드에 29개 앱의 첫 화면이 제각각 갈린 진짜 까닭은 **규격을 지킬 검사가
 * 없었기 때문**이다. 그래서 숫자를 여기에 못 박는다 — 세 화면(패드 가로·폰 가로·
 * 폰 세로)에서 제목 크기·가운데·칸 간격·겹침·터치 하한을 잰다.
 * (콘솔 오류 0 은 이 세 번의 이동까지 포함해 맨 아래 검사가 함께 본다) */
const SPEC_VIEWS = [
  { w: 1180, h: 820, name: '패드 가로' },
  { w: 844, h: 390, name: '폰 가로' },
  { w: 390, h: 844, name: '폰 세로' },
];
// CSS clamp(min, 비율×vw, max) 를 그대로 계산한다
const clampVw = (min, ratio, max, vw) => Math.min(Math.max(min, ratio * vw), max);

for (const v of SPEC_VIEWS) {
  await check(`첫 화면 규격 · ${v.name} — 제목·배지 줄·칸 간격·겹침·터치 46px`, async () => {
    await page.setViewportSize({ width: v.w, height: v.h });
    await page.goto(BASE);
    await page.waitForSelector(SPEC_HOME);
    await page.waitForTimeout(250);
    const m = await page.evaluate(([boxSel, gridSel]) => {
      const scr = document.querySelector('.screen.on, .screen.active');
      const h1 = scr.querySelector('h1');
      const r = h1.getBoundingClientRect();
      // 오른쪽 위 공용 집 단추(shared/home-button.js)가 머리줄을 그만큼 왼쪽으로 민다.
      // 29개 앱이 다 같이 밀려 있으므로 그 절반까지는 '가운데'로 친다.
      const hb = document.querySelector('.enjoy-home-btn');
      const reserve = hb ? hb.getBoundingClientRect().width + 22 : 0;
      const g = getComputedStyle(document.querySelector(gridSel));
      const boxes = [...scr.querySelectorAll(boxSel)].filter(e => {
        const b = e.getBoundingClientRect();
        return b.width > 0 && b.height > 0;
      });
      const over = [];
      for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i].getBoundingClientRect(), b = boxes[j].getBoundingClientRect();
        const ox = Math.min(a.right, b.right) - Math.max(a.left, b.left);
        const oy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
        if (ox > 1 && oy > 1) {
          over.push((boxes[i].className || boxes[i].tagName) + '×' + (boxes[j].className || boxes[j].tagName));
        }
      }
      const small = [...scr.querySelectorAll('button, a[href], [role="button"]')]
        .map(e => [e, e.getBoundingClientRect()])
        .filter(([, b]) => b.width > 0 && b.height > 0 && (b.width < 45.5 || b.height < 45.5))
        .map(([e, b]) => (e.className || e.tagName) + ' ' + Math.round(b.width) + '×' + Math.round(b.height));
      return {
        fs: parseFloat(getComputedStyle(h1).fontSize),
        cx: r.left + r.width / 2, mid: window.innerWidth / 2, reserve,
        rowGap: parseFloat(g.rowGap) || 0, colGap: parseFloat(g.columnGap) || 0,
        over: over.slice(0, 3), small: small.slice(0, 3),
      };
    }, [SPEC_BOXES, SPEC_GRID]);

    // ① DESIGN.md 「첫 화면 규격」 — 제목 clamp(26px, 3.4vw, 36px)
    const wantFs = clampVw(26, 0.034, 36, v.w);
    expect(m.fs >= 26 && m.fs <= 36, `제목 크기가 규격 범위(26~36px) 밖: ${m.fs}px`);
    expect(Math.abs(m.fs - wantFs) <= 1, `제목 크기 ${m.fs}px — 규격은 ${wantFs.toFixed(1)}px`);
    // ② 제목은 가운데 (집 단추가 차지한 자리의 절반 + 손그림 여유까지만 봐준다)
    const slack = m.reserve / 2 + 26;
    expect(Math.abs(m.cx - m.mid) <= slack,
      `제목이 가운데에서 ${Math.round(Math.abs(m.cx - m.mid))}px 벗어남 (허용 ${Math.round(slack)}px)`);
    // ③ DESIGN.md 「첫 화면 규격」 — 칸 사이 간격 clamp(18px, 2.4vw, 32px)
    const wantGap = clampVw(18, 0.024, 32, v.w);
    expect(Math.abs(m.rowGap - wantGap) <= 1 && Math.abs(m.colGap - wantGap) <= 1,
      `칸 간격 ${m.rowGap}/${m.colGap}px — 규격은 ${wantGap.toFixed(1)}px`);
    // ④ 첫 화면 요소끼리 겹치지 않는다 (기울인 칸이 이웃을 파고들면 여기서 잡힌다)
    expect(m.over.length === 0, '겹침: ' + m.over.join(' | '));
    // ⑤ DESIGN.md 「첫 화면 규격」 — 터치 하한 46px
    expect(m.small.length === 0, '46px 미만 터치 대상: ' + m.small.join(' | '));
  });
}
await page.setViewportSize({ width: 1180, height: 820 });

/* 목소리 설정 단추는 부모용이라 놀이 화면에서 감췄다(shared/crayon.css, 2026-08).
 * 부모님이 아이패드에서 "저 메세지 아이콘은 뭐야"라고 물으셨고, 아이는 읽지 못하는 단추였다.
 * 예전에 이 자리에서 재던 「손그림 아이콘이다」·「터치 46px 이다」를 방향만 뒤집는다 —
 * 이제 지켜야 할 것은 "놀이 화면 어디에도 안 보인다"다. 바꾸는 곳은 부모님 페이지. */
await check('목소리 단추: 놀이 화면에 안 보인다 (부모님 페이지에서 바꾼다)', async () => {
  await page.goto(BASE);
  await page.waitForSelector('#scr-home.on');
  const m = await page.evaluate(() => {
    const el = document.querySelector('#btn-voice');
    if (!el) return { gone: true };
    const cs = getComputedStyle(el), r = el.getBoundingClientRect();
    return { display: cs.display, visibility: cs.visibility, laidOut: el.offsetParent !== null,
      w: Math.round(r.width), h: Math.round(r.height) };
  });
  expect(m.gone || (m.display === 'none' && !m.laidOut && !m.w && !m.h),
    '목소리 단추가 아직 놀이 화면에 보인다: ' + JSON.stringify(m));
  // 길게 눌러 여는 방식(shared/voice-settings.js)은 그대로 살려 뒀다 — CSS 규칙만 걷어내면 되돌아온다
});

await check('콘솔 오류 0', async () => {
  expect(consoleErrors.length === 0, consoleErrors.join(' | '));
});

await browser.close();
console.log(`\n${failed ? '❌' : '✅'} 통과 ${passed} · 실패 ${failed}`);
process.exit(failed ? 1 : 0);
