#!/usr/bin/env node
/* 종단 테스트 — node lab/tools/e2e.mjs
 * 실제 Chromium으로 홈 → 미션 실험(방울 드래그·혼색·오답 힌트·물 비우기·정답 축하·도감 저장) →
 * 자유 실험(섞기·이름표·선반 담기) → 새로고침 후 진행도 유지까지 검증한다.
 * 저장소 루트에서 정적 서버를 띄운 뒤 실행 (예: python3 -m http.server 8777)
 */
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');

const BASE = process.env.BASE_URL || 'http://127.0.0.1:8777/lab/';
let passed = 0, failed = 0;
function ok(name) { passed++; console.log('  ✅ ' + name); }
function fail(name, extra) { failed++; console.error('  ❌ ' + name + (extra ? ' — ' + extra : '')); }
async function check(name, fn) {
  try { await fn(); ok(name); }
  catch (e) { fail(name, e.message); }
}
function expect(cond, msg) { if (!cond) throw new Error(msg || 'expect 실패'); }

// 물감 방울을 병까지 드래그 (실제 마우스 → 포인터 이벤트)
async function dragPaint(page, paintId) {
  const db = await page.locator('.drop[data-paint="' + paintId + '"]').boundingBox();
  const jb = await page.locator('#jar-wrap').boundingBox();
  await page.mouse.move(db.x + db.width / 2, db.y + db.height / 2);
  await page.mouse.down();
  await page.mouse.move(jb.x + jb.width / 2, jb.y + jb.height / 2, { steps: 8 });
  await page.mouse.up();
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1180, height: 820 } });
const consoleErrors = [];
page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
page.on('pageerror', e => consoleErrors.push(String(e)));

await page.goto(BASE);

await check('홈: 모드 카드 3개 + 별 0', async () => {
  await page.waitForSelector('#scr-home.on');
  expect(await page.locator('#menu .menu-card').count() === 3, '카드 수');
  expect((await page.locator('#home-stars').textContent()) === '0', '별 수');
});

await check('미션 실험: 미션 12개 목록', async () => {
  await page.click('.menu-card.c-mission');
  await page.waitForSelector('#scr-missions.on');
  expect(await page.locator('#missions-list .mission-card').count() === 12, '미션 수');
});

await check('미션 진입: 목표색 제시 + 방울 드래그 → 병 색이 변한다', async () => {
  await page.click('.mission-card[data-id="orange"]');
  await page.waitForSelector('#scr-lab.on');
  expect(!(await page.locator('#target-chip').isHidden()), '목표 견본이 보여야 함');
  const before = (await page.evaluate(() => App.debug())).jarColor;
  await dragPaint(page, 'red');
  const d = await page.evaluate(() => App.debug());
  expect(d.drops.length === 1 && d.drops[0] === 'red', '방울 기록: ' + JSON.stringify(d.drops));
  expect(d.hex === '#FF0000', '혼합색: ' + d.hex);
  await page.waitForTimeout(700); // 출렁이며 색이 번진다
  const after = (await page.evaluate(() => App.debug())).jarColor;
  expect(after !== before, '병 물색이 변해야 함: ' + before + ' → ' + after);
});

await check('오답 혼색(빨+검): 축하 없이 힌트가 나온다', async () => {
  await dragPaint(page, 'black');
  const d0 = await page.evaluate(() => App.debug());
  expect(d0.drops.length === 2, '방울 2개');
  expect(d0.dist > 70, '오답인데 목표와 가까움: ' + d0.dist);
  await page.waitForTimeout(1300); // 판정(0.9초) 후 힌트
  const d = await page.evaluate(() => App.debug());
  expect(d.hinted === true, '힌트 상태');
  expect(d.lock === false, '오답인데 성공 처리됨');
  expect(!(await page.evaluate(() => document.getElementById('reward').classList.contains('on'))), '오답인데 축하가 뜸');
});

await check('물 비우기: 방울이 사라지고 맹물로 돌아간다', async () => {
  await page.click('#btn-empty');
  const d = await page.evaluate(() => App.debug());
  expect(d.drops.length === 0, '방울: ' + JSON.stringify(d.drops));
  expect(d.hinted === false, '힌트 상태 초기화');
});

await check('정답 혼색(빨+노=주황): 축하 + 별 + 펫 간식 + 도감 저장', async () => {
  await dragPaint(page, 'red');
  await dragPaint(page, 'yellow');
  const d0 = await page.evaluate(() => App.debug());
  expect(d0.dist <= 70, '빨+노가 주황과 멀다: ' + d0.dist + ' (' + d0.hex + ')');
  await page.waitForSelector('#reward.on', { timeout: 5000 }); // 판정 → 반짝·나비 → 축하
  const d = await page.evaluate(() => App.debug());
  expect(d.lock === true, '성공 잠금');
  expect(d.stars === 1, '별: ' + d.stars);
  expect(d.bookCount === 1, '도감 수: ' + d.bookCount);
  const pet = await page.evaluate(() => window.Pet && Pet.state());
  expect(pet && pet.snacks === 1, '펫 간식: ' + JSON.stringify(pet));
});

await check('미션 목록에 완성 표시 + 도감에 1색 등록', async () => {
  await page.click('#reward-close'); // 그만할래 → 미션 목록
  await page.waitForSelector('#scr-missions.on');
  expect(await page.locator('#missions-list .mission-card.done').count() === 1, '완성 미션 수');
  expect((await page.locator('#missions-count').textContent()).includes('1 / 12'), '미션 수 표기');
  await page.click('#scr-missions .back');
  await page.waitForSelector('#scr-home.on');
  await page.click('.menu-card.c-book');
  await page.waitForSelector('#scr-book.on');
  expect(await page.locator('#book-grid .book-cell').count() === 12, '도감 칸 수');
  expect(await page.locator('#book-grid .book-cell.done').count() === 1, '도감 완성 수');
  expect((await page.locator('#book-count').textContent()).includes('1 / 12'), '도감 수 표기');
});

await check('자유 실험: 섞은 색에 이름표가 붙는다', async () => {
  await page.click('#scr-book .back');
  await page.waitForSelector('#scr-home.on');
  await page.click('.menu-card.c-free');
  await page.waitForSelector('#scr-lab.on');
  expect(await page.locator('#target-chip').isHidden(), '자유 실험엔 목표가 없어야 함');
  expect(!(await page.locator('#btn-keep').isHidden()), '병에 담기 버튼이 보여야 함');
  await dragPaint(page, 'blue');
  await dragPaint(page, 'yellow');
  const name = await page.locator('#mix-name').textContent();
  expect(name.includes('🎨') && !name.includes('맹물'), '이름표: ' + name);
});

await check('병에 담기: 선반에 병 + 이름 저장', async () => {
  await page.click('#btn-keep');
  const d = await page.evaluate(() => App.debug());
  expect(d.shelfLen === 1, '선반 병 수: ' + d.shelfLen);
  expect(d.drops.length === 0, '담은 뒤 새 물로 비워져야 함');
  expect(await page.locator('#shelf-row .shelf-jar').count() === 1, '선반 병 요소');
  const label = await page.locator('#shelf-row .sj-name').first().textContent();
  expect(label.trim().length > 0, '병 이름표');
});

await check('새로고침 후 진행도 유지', async () => {
  await page.goto(BASE);
  await page.waitForSelector('#scr-home.on');
  expect((await page.locator('#home-stars').textContent()) === '2', '별 수');
  const m = await page.locator('.menu-card.c-mission .mc-prog').textContent();
  expect(m.includes('1 / 12'), '미션 진행: ' + m);
  const f = await page.locator('.menu-card.c-free .mc-prog').textContent();
  expect(f.includes('1개'), '선반 병 수: ' + f);
  await page.click('.menu-card.c-free');
  await page.waitForSelector('#scr-lab.on');
  expect(await page.locator('#shelf-row .shelf-jar').count() === 1, '선반 복원');
  await page.click('#btn-lab-back');
});

await check('가득 찬 병: 최대 방울을 넘으면 더 안 들어간다', async () => {
  await page.click('.menu-card.c-mission');
  await page.waitForSelector('#scr-missions.on');
  await page.click('.mission-card[data-id="navy"]');
  await page.waitForSelector('#scr-lab.on');
  for (let i = 0; i < 9; i++) await dragPaint(page, 'white'); // 최대 8방울
  const d = await page.evaluate(() => App.debug());
  expect(d.drops.length === 8, '최대 방울 수: ' + d.drops.length);
  await page.click('#btn-lab-back');
  await page.waitForSelector('#scr-missions.on');
});

await check('콘솔 오류 0', async () => {
  expect(consoleErrors.length === 0, consoleErrors.join(' | '));
});

await browser.close();
console.log(`\n${failed ? '❌' : '✅'} 통과 ${passed} · 실패 ${failed}`);
process.exit(failed ? 1 : 0);
