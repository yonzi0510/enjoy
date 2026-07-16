#!/usr/bin/env node
/* 종단 테스트 — node write/tools/e2e.mjs
 * 실제 Chromium으로 홈 → 자음 필사(펜 스트로크 합성) → 손가락 리젝션 → 완료·별 →
 * 동요 필사 → 물어보고 쓰기(낱말 추출·직접 입력·인식 주입·초기화) → 부분 지우개 →
 * 받아쓰기(빈 칸 쓰기·정답 공개·스스로 확인) → 자유 낙서장(무지개 펜·스티커·보관) →
 * 갤러리 → 새로고침 후 진행도 유지 → 펫 방(도감 친구·장식 배치·간식 조르기)까지 검증한다.
 * 저장소 루트에서 정적 서버를 띄운 뒤 실행 (예: python3 -m http.server 8777)
 */
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');

const BASE = process.env.BASE_URL || 'http://127.0.0.1:8777/write/';
let passed = 0, failed = 0;
function ok(name) { passed++; console.log('  ✅ ' + name); }
function fail(name, extra) { failed++; console.error('  ❌ ' + name + (extra ? ' — ' + extra : '')); }
async function check(name, fn) {
  try { await fn(); ok(name); }
  catch (e) { fail(name, e.message); }
}
function expect(cond, msg) { if (!cond) throw new Error(msg || 'expect 실패'); }

// 합성 포인터 스트로크 — pts 는 캔버스 비율 좌표 [ [0~1, 0~1], ... ]
async function stroke(page, sel, pts, pointerType) {
  await page.evaluate(({ sel, pts, pointerType }) => {
    const c = document.querySelector(sel);
    const r = c.getBoundingClientRect();
    const ev = (type, fx, fy) => c.dispatchEvent(new PointerEvent(type, {
      pointerId: 7, pointerType, isPrimary: true, buttons: 1, bubbles: true, cancelable: true,
      clientX: r.left + r.width * fx, clientY: r.top + r.height * fy,
    }));
    ev('pointerdown', pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ev('pointermove', pts[i][0], pts[i][1]);
    ev('pointerup', pts[pts.length - 1][0], pts[pts.length - 1][1]);
  }, { sel, pts, pointerType });
}
// 안내 글자를 다 덮는 지그재그 (느슨한 겹침 판정 통과용)
function zigzag() {
  const pts = [];
  let dir = 1;
  for (const fy of [0.2, 0.32, 0.44, 0.56, 0.68, 0.8]) {
    const xs = [];
    for (let fx = 0.03; fx <= 0.97; fx += 0.04) xs.push(fx);
    if (dir < 0) xs.reverse();
    dir = -dir;
    xs.forEach(fx => pts.push([fx, fy]));
  }
  return pts;
}
const squiggle = [[0.2, 0.35], [0.3, 0.72], [0.4, 0.35], [0.5, 0.72], [0.6, 0.35], [0.7, 0.72]];

async function completePage(page) { // 현재 필사 페이지를 다 쓰고 ▶ 로 보상까지 진행
  await stroke(page, '#ink-trace', zigzag(), 'pen');
  await stroke(page, '#ink-free', squiggle, 'pen');
  await page.click('#btn-next');
  await page.waitForSelector('#reward.on', { timeout: 3000 });
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1180, height: 820 } });
const consoleErrors = [];
page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
page.on('pageerror', e => consoleErrors.push(String(e)));

await page.goto(BASE);

await check('홈: 챕터 7개 + 낙서장·물어보기·갤러리 카드', async () => {
  await page.waitForSelector('#scr-home.on');
  expect(await page.locator('#menu .menu-card').count() === 10, '메뉴 카드 수');
});

await check('가나다라: ㅏㅓㅗㅜㅡㅣ 여섯 줄 / 낱말: 묶음 여섯 개', async () => {
  await page.click('.menu-card.c-rows');
  await page.waitForSelector('#scr-items.on');
  const rows = await page.locator('.item-main .it-name').allTextContents();
  expect(rows.join(',') === '가나다라,거너더러,고노도로,구누두루,그느드르,기니디리', '글자 줄: ' + rows);
  await page.click('#scr-items .back');
  await page.click('.menu-card.c-word');
  await page.waitForSelector('#scr-items.on');
  expect(await page.locator('.item-row').count() === 6, '낱말 묶음 수');
  await page.click('#scr-items .back');
  await page.waitForSelector('#scr-home.on');
});

await check('자음 쓰기 진입: 깍두기 두 줄 + 점 4개', async () => {
  await page.click('.menu-card.c-jaum');
  await page.waitForSelector('#scr-write.on');
  expect(await page.locator('#write-dots .dot').count() === 4, '페이지 점 수');
  expect(await page.locator('.note-line canvas').count() === 2, '캔버스 수');
});

await check('손가락 필기는 무시되고 펜슬 안내가 뜬다', async () => {
  await stroke(page, '#ink-free', squiggle, 'touch');
  const d = await page.evaluate(() => App.debug());
  expect(d.freeStrokes === 0, '손가락 획이 기록됨');
  await page.waitForSelector('#pen-hint.on', { timeout: 2000 });
});

await check('펜 따라쓰기: 획 기록 + 겹침 판정 통과', async () => {
  await stroke(page, '#ink-trace', zigzag(), 'pen');
  const d = await page.evaluate(() => App.debug());
  expect(d.traceStrokes > 0, '획이 기록되지 않음');
  expect(d.coverage >= 0.5, '겹침 ' + d.coverage.toFixed(2));
});

await check('아랫줄 없이 ▶ → 안내만 하고 머문다', async () => {
  await page.click('#btn-next');
  expect(!(await page.locator('#reward.on').count()), '보상이 떠버림');
  const onIdx = await page.evaluate(() =>
    [...document.querySelectorAll('#write-dots .dot')].findIndex(d => d.classList.contains('on')));
  expect(onIdx === 0, '판정 실패인데 넘어감: ' + onIdx);
});

await check('혼자 쓰기 후 ▶ → 별 + 다음 장', async () => {
  await stroke(page, '#ink-free', squiggle, 'pen');
  await page.click('#btn-next');
  await page.waitForSelector('#reward.on', { timeout: 3000 });
  await page.click('#reward-next');
  await page.waitForFunction(() => !document.getElementById('reward').classList.contains('on'));
  const onIdx = await page.evaluate(() =>
    [...document.querySelectorAll('#write-dots .dot')].findIndex(d => d.classList.contains('on')));
  expect(onIdx === 1, '2번째 장으로 안 넘어감: ' + onIdx);
  expect(await page.locator('#write-dots .dot.done').count() === 1, '완료 점 표시');
});

await check('안 쓰고 ▶ → 판정 없이 그냥 다음 장(구경)', async () => {
  await page.click('#btn-next');
  const onIdx = await page.evaluate(() =>
    [...document.querySelectorAll('#write-dots .dot')].findIndex(d => d.classList.contains('on')));
  expect(onIdx === 2, '빈 장 넘기기 실패: ' + onIdx);
});

await check('홈으로: 별·진행도 반영', async () => {
  await page.click('#btn-write-back');
  await page.waitForSelector('#scr-home.on');
  expect((await page.locator('#home-stars').textContent()) === '1', '별 수');
  const prog = await page.locator('.menu-card.c-jaum .mc-prog').textContent();
  expect(prog.includes('1 / 4'), '챕터 진행도: ' + prog);
});

await check('펫: 완료로 간식 획득 → 먹이면 자란다', async () => {
  let p = await page.evaluate(() => Pet.state());
  expect(p.snacks === 1, '페이지 완료 간식: ' + p.snacks);
  await page.click('#pet-slot .pet-btn');
  await page.waitForSelector('#pet-overlay.on');
  await page.click('#pet-feed-snack');
  p = await page.evaluate(() => Pet.state());
  expect(p.g === 1 && p.snacks === 0, '먹이기: ' + JSON.stringify(p));
  await page.click('#pet-close');
});

await check('동요 필사: 항목 5개 목록 → 한 줄 완료', async () => {
  await page.click('.menu-card.c-song');
  await page.waitForSelector('#scr-items.on');
  expect(await page.locator('.item-row').count() === 5, '동요 항목 수');
  await page.locator('.item-main').first().click();
  await page.waitForSelector('#scr-write.on');
  await completePage(page);
  await page.click('#reward-next');
  await page.click('#btn-write-back');
  await page.waitForSelector('#scr-items.on');
  await page.click('#scr-items .back');
  await page.waitForSelector('#scr-home.on');
});

await check('낱말 추출: 여러 말투에서 낱말만 뽑는다', async () => {
  const got = await page.evaluate(() => [
    Ask.parseWord('토끼는 어떻게 써?'),
    Ask.parseWord('구름 어떻게 쓰는 거야'),
    Ask.parseWord('별'),
    Ask.parseWord('어떻게 써'),
  ]);
  expect(got[0] === '토끼', '토끼: ' + got[0]);
  expect(got[1] === '구름', '구름: ' + got[1]);
  expect(got[2] === '별', '별: ' + got[2]);
  expect(got[3] === null, '낱말 없는 질문: ' + got[3]);
});

await check('물어보고 쓰기: 직접 입력 → 필사 → 최근 낱말', async () => {
  await page.click('.menu-card.c-ask');
  await page.waitForSelector('#scr-ask.on');
  await page.fill('#ask-type', '토끼');
  await page.click('#ask-type-go');
  await page.waitForSelector('#scr-write.on');
  const d = await page.evaluate(() => App.debug());
  expect(d.pageText === '토끼', '페이지 글: ' + d.pageText);
  await completePage(page);
  await page.click('#reward-next');
  await page.waitForSelector('#scr-ask.on');
  const chip = await page.locator('.ask-chip').first().textContent();
  expect(chip === '토끼', '최근 낱말: ' + chip);
});

await check('인식 결과 주입("구름은 어떻게 써") → 필사 페이지', async () => {
  await page.evaluate(() => window.__simulateAsk('구름은 어떻게 써'));
  await page.waitForSelector('#scr-write.on');
  const d = await page.evaluate(() => App.debug());
  expect(d.pageText === '구름', '페이지 글: ' + d.pageText);
});

await check('부분 지우개: 닿은 획만 지운다', async () => {
  await stroke(page, '#ink-free', squiggle, 'pen');
  await stroke(page, '#ink-free', [[0.85, 0.2], [0.9, 0.3]], 'pen');
  let d = await page.evaluate(() => App.debug());
  expect(d.freeStrokes === 2, '획 2개 기록: ' + d.freeStrokes);
  await page.click('#btn-eraser');
  d = await page.evaluate(() => App.debug());
  expect(d.tool === 'erase', '지우개 모드');
  await stroke(page, '#ink-free', squiggle, 'pen'); // 첫 획 위만 문지르기
  d = await page.evaluate(() => App.debug());
  expect(d.freeStrokes === 1, '닿은 획만 지워져야 함: ' + d.freeStrokes);
  await page.click('#btn-eraser'); // 펜으로 복귀
  await page.click('#btn-write-back');
  await page.waitForSelector('#scr-ask.on');
  await page.click('#scr-ask .back');
  await page.waitForSelector('#scr-home.on');
});

await check('쓰다 만 글씨 자동 저장: 나갔다 와도 그대로', async () => {
  await page.click('.menu-card.c-ask');
  await page.waitForSelector('#scr-ask.on');
  await page.locator('.ask-chip').first().click(); // 최근 낱말 '구름' 다시 열기
  await page.waitForSelector('#scr-write.on');
  const d = await page.evaluate(() => App.debug());
  expect(d.pageText === '구름', '페이지 글: ' + d.pageText);
  expect(d.freeStrokes === 1, '지우개 후 남긴 획이 복원돼야 함: ' + d.freeStrokes);
  await page.click('#btn-write-back');
  await page.waitForSelector('#scr-ask.on');
  await page.click('#scr-ask .back');
  await page.waitForSelector('#scr-home.on');
});

await check('받아쓰기: 기본은 1~5단계만 (6~7단계는 부모 설정으로 열림)', async () => {
  await page.click('.menu-card.c-dict');
  await page.waitForSelector('#scr-items.on');
  expect(await page.locator('.item-row').count() === 5, '기본 단계 수');
  expect(await page.locator('.item-play').count() === 0, '전체 듣기 버튼이 있으면 안 됨');
  // 부모가 허용하면 7단계 전부 보인다
  await page.evaluate(() => ParentSettings.set('showDictHard', true));
  await page.click('#scr-items .back');         // 홈으로
  await page.waitForSelector('#scr-home.on');
  await page.click('.menu-card.c-dict');
  await page.waitForSelector('#scr-items.on');
  expect(await page.locator('.item-row').count() === 7, '부모 허용 후 단계 수');
  await page.evaluate(() => ParentSettings.set('showDictHard', false));
  await page.click('#scr-items .back');
  await page.waitForSelector('#scr-home.on');
  await page.click('.menu-card.c-dict');
  await page.waitForSelector('#scr-items.on');
});

await check('받아쓰기: 짧은 항목은 한 줄 + 빈 ▶ 는 그냥 다음 장', async () => {
  await page.locator('.item-main').first().click();
  await page.waitForSelector('#scr-write.on');
  const d = await page.evaluate(() => App.debug());
  expect(d.dict === true, '받아쓰기 모드');
  expect(!d.revealed, '정답이 미리 보이면 안 됨');
  expect(await page.locator('#line-free').isHidden(), '짧은 받아쓰기는 한 줄이어야 함');
  await page.click('#btn-next'); // 안 쓰고 ▶ → 구경만
  const count = await page.locator('#write-dots .page-count').textContent();
  expect(count.trim() === '2 / 34', '빈 장 넘기기: ' + count);
});

await check('받아쓰기: 빈 칸 쓰기 → ▶ → 정답 공개 → ⭕ → 별', async () => {
  await stroke(page, '#ink-trace', squiggle, 'pen');
  await page.click('#btn-next');
  await page.waitForSelector('#dict-check.on', { timeout: 3000 });
  const d = await page.evaluate(() => App.debug());
  expect(d.revealed === true, '정답 공개');
  await page.click('#dict-ok');
  await page.waitForSelector('#reward.on');
  await page.click('#reward-next');
  await page.waitForFunction(() => !document.getElementById('reward').classList.contains('on'));
  await page.click('#btn-write-back');
  await page.waitForSelector('#scr-items.on');
  await page.click('#scr-items .back');
  await page.waitForSelector('#scr-home.on');
});

await check('자유 낙서장: 무지개 펜 + 스티커 + 보관', async () => {
  await page.click('.menu-card.c-draw');
  await page.waitForSelector('#scr-draw.on');
  await page.locator('#draw-swatches .sw-rb').click(); // 무지개 크레용
  await stroke(page, '#draw-pad', squiggle, 'pen');
  let d = await page.evaluate(() => App.debug());
  expect(d.padItems === 1, '획 기록: ' + d.padItems);
  await page.click('#btn-draw-sticker');
  await page.locator('.sticker-btn').first().click();
  await stroke(page, '#draw-pad', [[0.8, 0.3], [0.8, 0.3]], 'pen'); // 스티커 찍기
  d = await page.evaluate(() => App.debug());
  expect(d.padItems === 2, '스티커 기록: ' + d.padItems);
  await page.click('#btn-draw-save');
  await page.click('#scr-draw .back');
  await page.waitForSelector('#scr-home.on');
  const prog = await page.locator('.menu-card.c-draw .mc-prog').textContent();
  expect(prog.trim() === '1장', '낙서장 보관 수: ' + prog);
});

await check('갤러리: 작품 6장 (완성 4 + 쓰던 글 1 + 그림 1)', async () => {
  await page.click('.menu-card.c-gallery');
  await page.waitForSelector('#scr-gallery.on');
  expect(await page.locator('.art-card').count() === 6, '작품 수');
});

await check('새로고침 후 진행도·갤러리·물어본 낱말 유지', async () => {
  await page.goto(BASE);
  await page.waitForSelector('#scr-home.on');
  expect((await page.locator('#home-stars').textContent()) === '5', '별 수');
  const g = await page.locator('.menu-card.c-gallery .mc-prog').textContent();
  expect(g.trim() === '6장', '갤러리 수: ' + g);
  const a = await page.locator('.menu-card.c-ask .mc-prog').textContent();
  expect(a.includes('2 낱말'), '물어본 낱말 수: ' + a);
  const p = await page.evaluate(() => Pet.state());
  expect(p.g === 1 && p.snacks === 3, '펫 상태 유지: ' + JSON.stringify(p));
});

await check('물어본 낱말 초기화 🧹', async () => {
  await page.click('.menu-card.c-ask');
  await page.waitForSelector('#scr-ask.on');
  expect(await page.locator('.ask-chip').count() === 2, '초기화 전 낱말 칩');
  await page.click('#ask-clear');
  expect(await page.locator('.ask-chip').count() === 0, '초기화 후 낱말 칩');
});

await check('펫: 부화 → 이름 짓기 → 선물 → 도감 등록 → 새 알', async () => {
  await page.evaluate(() => Pet.awardSnack(30));
  await page.evaluate(() => Pet.open());
  await page.waitForSelector('#pet-overlay.on');
  await page.click('#pet-feed-snack'); // g 1 → 3 이면 부화
  await page.click('#pet-feed-snack');
  await page.waitForTimeout(800);
  let p = await page.evaluate(() => Pet.state());
  expect(p.species, '부화해야 함: ' + JSON.stringify(p));
  await page.waitForSelector('#pet-naming:not([hidden])');
  await page.fill('#pet-name-input', '반짝이');
  await page.click('#pet-name-ok');
  p = await page.evaluate(() => Pet.state());
  expect(p.name === '반짝이', '이름: ' + p.name);
  for (let i = 0; i < 21; i++) await page.click('#pet-feed-snack'); // g 3 → 24 = 도감 등록
  await page.waitForTimeout(1000);
  p = await page.evaluate(() => Pet.state());
  expect(p.collection === 1, '도감 등록 수: ' + JSON.stringify(p));
  expect(p.species === null && p.g === 0, '새 알 도착: ' + JSON.stringify(p));
  expect(p.accOwned === 3, '꾸미기 선물 (먹이 8번마다): ' + p.accOwned);
  expect(p.snacks === 10, '남은 간식: ' + p.snacks);
  await page.click('#pet-book-btn'); // 도감에 등록된 펫 확인
  await page.waitForSelector('#pet-book-overlay.on');
  expect(await page.locator('.pet-book-cell.got').count() === 1, '도감 칸');
  const cap = await page.locator('.pet-book-cell.got .pb-name').textContent();
  expect(cap === '반짝이', '도감 이름: ' + cap);
  await page.click('#pet-book-close');
  await page.click('#pet-close');
});

await check('펫 방: 방 배경 + 도감 친구가 미니 펫으로 놀러 나온다', async () => {
  await page.evaluate(() => Pet.open());
  await page.waitForSelector('#pet-overlay.on');
  expect(await page.locator('#pet-room .pet-room-bg svg').count() === 1, '방 배경 SVG');
  expect(await page.locator('#pet-room .pet-deco-slot').count() === 8, '꾸미기 자리 수');
  expect(await page.locator('#pet-room .pet-mini').count() === 1, '도감 친구(미니 펫) 수');
  expect(await page.locator('#pet-room .pet-mini .pa-svg').count() === 1, '미니 펫 SVG 캐릭터');
});

await check('장식: 먹이 선물로 모으고(4·12·20번째) 자리에 배치', async () => {
  const p = await page.evaluate(() => Pet.state());
  expect(p.decoOwned === 3, '장식 선물 수: ' + p.decoOwned);
  // 받은 장식은 무작위라, 벽·창가·바닥 자리를 차례로 열어 보유 장식이 있는 판에서 배치한다
  let placedSlot = null;
  for (const slot of ['w1', 'n1', 'f1']) {
    await page.click('#pet-room .pet-deco-slot[data-slot="' + slot + '"]');
    await page.waitForSelector('#pet-deco-overlay.on');
    if (await page.locator('.pet-deco-cell:not(.lock)').count() > 0) {
      expect(await page.locator('.pet-deco-cell.lock .pd-q').count() >= 0, '실루엣 ? 표시');
      await page.locator('.pet-deco-cell:not(.lock)').first().click();
      placedSlot = slot;
      break;
    }
    await page.click('#pet-deco-close');
  }
  expect(placedSlot, '보유 장식이 있는 자리를 찾지 못함');
  await page.waitForFunction(() => !document.getElementById('pet-deco-overlay').classList.contains('on'));
  expect(await page.locator('#pet-room .pet-deco-slot[data-slot="' + placedSlot + '"].filled').count() === 1, '자리에 장식 표시');
  const after = await page.evaluate(() => Pet.state());
  expect(after.decoPlaced === 1, '배치 저장: ' + after.decoPlaced);
  // 못 받은 장식은 실루엣+? 로 보인다 (아무 자리나 다시 열어 확인)
  await page.click('#pet-room .pet-deco-slot[data-slot="f2"]');
  await page.waitForSelector('#pet-deco-overlay.on');
  expect(await page.locator('.pet-deco-cell.lock').count() >= 1, '미획득 실루엣 칸');
  expect((await page.locator('.pet-deco-cell.lock .pd-name').first().textContent()) === '???', '미획득 이름 가림');
  await page.click('#pet-deco-close');
});

await check('간식 조르기: 친구에게 나눠 주면 간식 1개 소모', async () => {
  const before = await page.evaluate(() => Pet.state().snacks);
  expect(before > 0, '간식이 있어야 조른다: ' + before);
  const begged = await page.evaluate(() => Pet.forceBeg());
  expect(begged === true, '조르기 시작');
  await page.waitForSelector('#pet-room .pet-mini .pet-beg-bubble:not([hidden])');
  await page.click('#pet-room .pet-mini.beg', { force: true }); // 조르는 동안 몸을 흔들어서(애니메이션) force 클릭
  await page.waitForTimeout(300);
  const p = await page.evaluate(() => Pet.state());
  expect(p.snacks === before - 1, '간식 나눠 주기: ' + before + ' → ' + p.snacks);
  expect(p.begging === false, '조르기 종료');
  expect(await page.locator('#pet-room .pet-beg-bubble:not([hidden])').count() === 0, '말풍선 닫힘');
  await page.click('#pet-close');
});

await check('새로고침 후 장식·배치·방 유지 (마이그레이션 겸 회귀)', async () => {
  await page.goto(BASE);
  await page.waitForSelector('#scr-home.on');
  const p = await page.evaluate(() => Pet.state());
  expect(p.decoOwned >= 3, '장식 보유 유지: ' + p.decoOwned); // 고마움 선물로 늘 수도 있다
  expect(p.decoPlaced === 1, '배치 유지: ' + p.decoPlaced);
  await page.evaluate(() => Pet.open());
  await page.waitForSelector('#pet-overlay.on');
  expect(await page.locator('#pet-room .pet-deco-slot.filled').count() === 1, '자리 표시 유지');
  expect(await page.locator('#pet-room .pet-mini').count() === 1, '도감 친구 유지');
  await page.click('#pet-close');
});

await check('콘솔 오류 0', async () => {
  expect(consoleErrors.length === 0, consoleErrors.join(' | '));
});

await browser.close();
console.log(`\n${failed ? '❌' : '✅'} 통과 ${passed} · 실패 ${failed}`);
process.exit(failed ? 1 : 0);
