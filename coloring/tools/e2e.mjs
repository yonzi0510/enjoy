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

await check('그림 진입: 강아지 색칠 화면', async () => {
  await page.locator('.pic-card[data-id="dog"]').click();
  await page.waitForSelector('#scr-paint.on');
  const d = await page.evaluate(() => App.debug());
  expect(d.picId === 'dog', '그림 id: ' + d.picId);
  expect(d.painted === 0, '처음엔 칠해진 픽셀 0: ' + d.painted);
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

await check('콘솔 오류 0', async () => {
  expect(consoleErrors.length === 0, consoleErrors.join(' | '));
});

await browser.close();
console.log(`\n${failed ? '❌' : '✅'} 통과 ${passed} · 실패 ${failed}`);
process.exit(failed ? 1 : 0);
