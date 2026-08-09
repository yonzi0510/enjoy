#!/usr/bin/env node
/* 종단 테스트 — node connect/tools/e2e.mjs
 * 실제 Chromium 으로 홈(단계3) → 목록(10) → 진입 → 순서대로 점을 이어 완성·축하·별·펫,
 * 틀린 점 무벌점(완성 안 됨), 단계별 점 개수, 새로고침 진행도 유지, 3해상도 잘림까지 검증한다.
 * 저장소 루트에서 정적 서버를 띄운 뒤 실행 (예: python3 -m http.server 8777)
 */
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');

const BASE = process.env.BASE_URL || 'http://127.0.0.1:8777/connect/';
let passed = 0, failed = 0;
function ok(name) { passed++; console.log('  ✅ ' + name); }
function fail(name, extra) { failed++; console.error('  ❌ ' + name + (extra ? ' — ' + extra : '')); }
async function check(name, fn) { try { await fn(); ok(name); } catch (e) { fail(name, e.message); } }
function expect(cond, msg) { if (!cond) throw new Error(msg || 'expect 실패'); }

// 순서대로 다음 점을 이어 끝까지 완성
async function connectAll(page) {
  for (;;) {
    const nid = await page.evaluate(() => App.debug().nextId);
    if (nid === null || nid === undefined) break;
    await page.evaluate(i => App._attempt(i), nid);
    await page.waitForTimeout(50);
  }
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1180, height: 820 } });
const consoleErrors = [];
page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
page.on('pageerror', e => consoleErrors.push(String(e)));

await page.goto(BASE);

await check('홈: 단계 카드 3개 + 별 0', async () => {
  await page.waitForSelector('#scr-home.on');
  expect(await page.locator('#menu .menu-card').count() === 3, '단계 카드 수');
  expect((await page.locator('#home-stars').textContent()) === '0', '별 수');
});

await check('낙서장 배치: 칸마다 다른 기울기·자리, 크기 위계 1>2>3, 겹침 없음', async () => {
  const m = await page.evaluate(() => {
    const cs = [...document.querySelectorAll('#menu .menu-card')];
    const rs = cs.map(c => c.getBoundingClientRect());
    let ov = 0;
    for (let i = 0; i < rs.length; i++) for (let j = i + 1; j < rs.length; j++) {
      ov += Math.max(0, Math.min(rs[i].right, rs[j].right) - Math.max(rs[i].left, rs[j].left)) *
            Math.max(0, Math.min(rs[i].bottom, rs[j].bottom) - Math.max(rs[i].top, rs[j].top));
    }
    return {
      // 새 규격: 흩뿌리기는 transform 이 아니라 낱개 속성 rotate 로 준다 — DESIGN.md 「첫 화면 규격」
      rots: cs.map(c => getComputedStyle(c).rotate),
      // 폭은 offsetWidth 로 잰다. 경계상자는 기울인 만큼 넓어져 2·3단계가 뒤집힌다
      ws: cs.map(c => c.offsetWidth),
      minTap: Math.min(...rs.map(r => Math.min(r.width, r.height))),
      ov, off: rs.filter(r => r.left < -1 || r.right > window.innerWidth + 1).length,
      horiz: document.documentElement.scrollWidth - window.innerWidth,
    };
  });
  expect(new Set(m.rots).size === 3, '칸이 서로 같은 기울기: ' + JSON.stringify(m.rots));
  expect(m.rots.every(t => t && t !== 'none'), '기울기가 아예 없음: ' + JSON.stringify(m.rots));
  // 새 규격: 1단계만 1.15배 크고 2·3단계는 서로 같다 — DESIGN.md 「첫 화면 규격」
  expect(m.ws[0] >= Math.max(m.ws[1], m.ws[2]) * 1.05,
    '1단계 칸이 뒤 칸보다 확실히 크지 않다: ' + m.ws.map(w => w.toFixed(0)).join('/'));
  expect(Math.max(m.ws[1], m.ws[2]) <= Math.min(m.ws[1], m.ws[2]) * 1.15,
    '2·3단계 칸 크기가 서로 다르다: ' + m.ws.map(w => w.toFixed(0)).join('/'));
  expect(m.ov < 1, '칸끼리 겹침: ' + m.ov.toFixed(0) + 'px²');
  expect(m.off === 0, '칸이 화면 밖으로 나감');
  expect(m.horiz <= 1, '홈 가로 스크롤 ' + m.horiz + 'px');
  expect(m.minTap >= 44, '칸 터치 하한 미달: ' + m.minTap.toFixed(0) + 'px');
});

await check('목소리 단추: 놀이 화면에 안 보인다 (부모님 페이지에서 바꾼다)', async () => {
  const hidden = await page.evaluate(() => {
    const b = document.getElementById('btn-voice');
    if (!b) return true;
    return getComputedStyle(b).display === 'none' && b.offsetParent === null
      && b.getBoundingClientRect().width === 0;
  });
  expect(hidden, '목소리 단추가 놀이 화면에 보인다');
});

await check('손그림 아이콘: 이모지 대신 SVG, 손떨림 필터', async () => {
  const m = await page.evaluate(() => {
    const vis = e => { const c = getComputedStyle(e); return c.display !== 'none' && c.visibility !== 'hidden' && e.getBoundingClientRect().width > 0; };
    // 목소리 설정 단추는 부모용이라 놀이 화면에서 감췄다(shared/crayon.css) —
    // 숨은 아이콘은 크기가 0이라 「그려졌는가」에서 걸린다. 보이는 것만 잰다.
    const icos = [...document.querySelectorAll('#scr-home .ico')]
      .filter(i => i.getBoundingClientRect().width > 0);
    return {
      n: icos.length,
      drawn: icos.every(i => i.getBoundingClientRect().width > 8),
      filtered: icos.every(i => getComputedStyle(i).filter.includes('kid-ink')),
      hasFilter: !!document.getElementById('kid-ink'),
      turb: document.querySelectorAll('#kid-ink feTurbulence, #kid-ink feDisplacementMap').length,
      // 화면 틀에 남은 이모지 (펫 단추는 공용이라 제외)
      emoji: [...document.querySelectorAll('#scr-home *')].filter(e =>
        e.children.length === 0 && vis(e) && !e.closest('#pet-slot') &&
        /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{25A0}-\u{25FF}]/u.test(e.textContent)).map(e => e.textContent.trim()),
    };
  });
  // 셋 중 하나였던 목소리 단추를 감췄으므로 보이는 손그림 아이콘은 둘이다(별·뒤로)
  expect(m.n >= 2, '손그림 아이콘 수: ' + m.n);
  expect(m.drawn, '아이콘이 그려지지 않음(크기 0)');
  expect(m.hasFilter && m.turb === 2, 'feTurbulence + feDisplacementMap 없음');
  expect(m.filtered, '아이콘에 손떨림 필터가 안 걸림');
  expect(m.emoji.length === 0, '첫 화면에 남은 이모지: ' + JSON.stringify(m.emoji));
});

await check('목록: 단계1 퍼즐 10개', async () => {
  await page.click('.menu-card.c-l1');
  await page.waitForSelector('#scr-list.on');
  expect(await page.locator('#list .puzzle-card').count() === 10, '퍼즐 수');
  expect((await page.locator('#list-count').textContent()).includes('0 / 10'), '진행 표기');
});

await check('진입: 판에 점 4개, 순서 본보기 4칸, 다음 점 안내', async () => {
  await page.click('#list .puzzle-card');
  await page.waitForSelector('#scr-play.on');
  const d = await page.evaluate(() => App.debug());
  expect(d.dotCount === 4, '단계1 점 개수: ' + d.dotCount);
  expect(d.nextId === d.order[0], '첫 점은 order[0]: ' + d.nextId);
  expect(await page.locator('#board .dot').count() === 4, '판 점 수');
  expect(await page.locator('#board .dot.next').count() === 1, '다음 점 강조 1개');
  expect(await page.locator('#guide .g-dot').count() === 4, '본보기 칸 수');
});

await check('점판·점에 변형 없음 (낙서장 흩뿌리기는 고르는 칸에만)', async () => {
  const m = await page.evaluate(() => {
    const flat = t => t === 'none' || t === 'matrix(1, 0, 0, 1, 0, 0)';
    const b = document.querySelector('#board');
    return {
      board: getComputedStyle(b).transform,
      wrap: getComputedStyle(b.parentElement).transform,
      svg: getComputedStyle(b.querySelector('svg')).transform,
      dots: [...b.querySelectorAll('.dot')].every(d => flat(getComputedStyle(d).transform)),
      flatAll: [b, b.parentElement, b.querySelector('svg')].every(e => flat(getComputedStyle(e).transform)),
    };
  });
  expect(m.flatAll, '판에 변형이 걸림: ' + m.board + ' / ' + m.wrap + ' / ' + m.svg);
  expect(m.dots, '점에 변형이 걸림 — 좌표가 틀어진다');
});

await check('틀린 점 무벌점: 순서 아닌 점은 선이 안 그어지고 완성 안 됨', async () => {
  const d0 = await page.evaluate(() => App.debug());
  const wrong = d0.order[2]; // 첫 점이 아닌 점
  await page.evaluate(i => App._attempt(i), wrong);
  await page.waitForTimeout(120);
  const d = await page.evaluate(() => App.debug());
  expect(d.placed.length === 0, '틀린 탭인데 이어짐: ' + JSON.stringify(d.placed));
  expect(d.lineCount === 0, '선이 그어짐');
  expect(!(await page.locator('#reward').evaluate(el => el.classList.contains('on'))), '틀렸는데 축하가 뜸');
});

await check('순서대로 이어 완성 → 축하·별·펫 간식', async () => {
  const petBefore = await page.evaluate(() => window.Pet ? Pet.state().snacks : 0);
  await connectAll(page);
  await page.waitForSelector('#reward.on', { timeout: 5000 });
  const d = await page.evaluate(() => App.debug());
  expect(d.locked === true, '완성 잠금');
  expect(d.placed.length === 4, '이은 점 수: ' + d.placed.length);
  expect(d.lineCount === 3, '선 개수(점4=3): ' + d.lineCount);
  expect(d.stars === 1, '별: ' + d.stars);
  expect(d.done === true, '퍼즐 완료 저장');
  const petAfter = await page.evaluate(() => window.Pet ? Pet.state().snacks : 0);
  expect(petAfter === petBefore + 1, '펫 간식: ' + petBefore + '→' + petAfter);
});

await check('완성 표시: 목록에 done + 진행 1 / 10', async () => {
  await page.click('#reward-close');
  await page.waitForSelector('#scr-list.on');
  expect(await page.locator('#list .puzzle-card.done').count() === 1, '완성 퍼즐 수');
  expect((await page.locator('#list-count').textContent()).includes('1 / 10'), '진행 표기');
});

await check('DOM 탭으로도 이어짐 (elementFromPoint 히트)', async () => {
  await page.click('#list .puzzle-card:not(.done)');
  await page.waitForSelector('#scr-play.on');
  const box = await page.locator('#board .dot.next .face').boundingBox();
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await page.waitForTimeout(120);
  const d = await page.evaluate(() => App.debug());
  expect(d.placed.length === 1, '탭으로 첫 점 이어짐: ' + JSON.stringify(d.placed));
  await page.click('#btn-play-back');
  await page.waitForSelector('#scr-list.on');
});

await check('단계2: 점 6개', async () => {
  await page.click('#scr-list .back');
  await page.waitForSelector('#scr-home.on');
  await page.click('.menu-card.c-l2');
  await page.waitForSelector('#scr-list.on');
  await page.click('#list .puzzle-card');
  await page.waitForSelector('#scr-play.on');
  const d = await page.evaluate(() => App.debug());
  expect(d.dotCount === 6, '단계2 점 개수: ' + d.dotCount);
  expect(await page.locator('#guide .g-dot').count() === 6, '본보기 칸 수');
});

await check('단계2 완성: 별이 1 늘어난다', async () => {
  const before = await page.evaluate(() => App.debug().stars);
  await connectAll(page);
  await page.waitForSelector('#reward.on', { timeout: 5000 });
  const after = await page.evaluate(() => App.debug().stars);
  expect(after === before + 1, '별 증가: ' + before + '→' + after);
  await page.click('#reward-close');
  await page.waitForSelector('#scr-list.on');
});

await check('단계3: 점 8개', async () => {
  await page.click('#scr-list .back');
  await page.click('.menu-card.c-l3');
  await page.waitForSelector('#scr-list.on');
  await page.click('#list .puzzle-card');
  await page.waitForSelector('#scr-play.on');
  const d = await page.evaluate(() => App.debug());
  expect(d.dotCount === 8, '단계3 점 개수: ' + d.dotCount);
  await page.click('#btn-play-back');
  await page.waitForSelector('#scr-list.on');
});

await check('새로고침 후 진행도 유지', async () => {
  await page.goto(BASE);
  await page.waitForSelector('#scr-home.on');
  expect((await page.locator('#home-stars').textContent()) === '2', '별 수(1+1)');
  const l1 = await page.locator('.menu-card.c-l1 .mc-prog').textContent();
  expect(l1.includes('1 / 10'), '단계1 진행: ' + l1);
  const l2 = await page.locator('.menu-card.c-l2 .mc-prog').textContent();
  expect(l2.includes('1 / 10'), '단계2 진행: ' + l2);
});

await check('3해상도 잘림 없음 (점8 판, 가로 스크롤·세로 넘침)', async () => {
  const sizes = [
    { w: 1180, h: 820, name: '패드 가로' },
    { w: 844, h: 390, name: '폰 가로' },
    { w: 390, h: 844, name: '폰 세로' },
  ];
  for (const s of sizes) {
    await page.setViewportSize({ width: s.w, height: s.h });
    await page.goto(BASE);
    await page.waitForSelector('#scr-home.on');
    await page.click('.menu-card.c-l3'); // 점 8개(가장 빡셈)
    await page.waitForSelector('#scr-list.on');
    await page.click('#list .puzzle-card');
    await page.waitForSelector('#scr-play.on');
    await page.waitForTimeout(120);
    const m = await page.evaluate(() => {
      const b = document.querySelector('#board').getBoundingClientRect();
      return {
        horiz: document.documentElement.scrollWidth - window.innerWidth,
        boardTop: b.top, boardBottom: b.bottom, boardW: b.width, boardH: b.height,
        ih: window.innerHeight, iw: window.innerWidth,
      };
    });
    expect(m.horiz <= 1, s.name + ': 가로 스크롤 ' + m.horiz + 'px');
    expect(m.boardTop >= -2, s.name + ': 판이 위로 잘림 ' + m.boardTop);
    expect(m.boardBottom <= m.ih + 2, s.name + ': 판이 아래로 잘림 ' + m.boardBottom + ' > ' + m.ih);
    expect(m.boardW >= 120 && m.boardH >= 120, s.name + ': 판이 너무 작음 ' + m.boardW + 'x' + m.boardH);
    // 점 8개가 모두 판 안에 있는지
    const inside = await page.evaluate(() => {
      const b = document.querySelector('#board').getBoundingClientRect();
      const dots = [...document.querySelectorAll('#board .dot .face')];
      return dots.every(f => {
        const r = f.getBoundingClientRect();
        return r.left >= b.left - 1 && r.right <= b.right + 1 && r.top >= b.top - 1 && r.bottom <= b.bottom + 1;
      });
    });
    expect(inside, s.name + ': 점이 판 밖으로 잘림');
    // 오른쪽 위 공용 단추(집·남은 시간)와 바가 겹치지 않아야 한다
    const barOv = await page.evaluate(() => {
      const R = e => e && e.getBoundingClientRect();
      const ov = (a, b) => (a && b) ? Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) *
                                      Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)) : 0;
      const tag = R(document.querySelector('.tl-bar-tag')), hb = R(document.querySelector('.enjoy-home-btn'));
      return ['#play-title', '#btn-listen', '#btn-play-back']
        .reduce((a, sel) => a + ov(tag, R(document.querySelector(sel))) + ov(hb, R(document.querySelector(sel))), 0);
    });
    expect(barOv < 1, s.name + ': 상단 바가 집 단추·시간 쪽지와 겹침 ' + barOv.toFixed(0) + 'px²');
  }
  await page.setViewportSize({ width: 1180, height: 820 });
});

await check('콘솔 오류 0', async () => {
  expect(consoleErrors.length === 0, consoleErrors.join(' | '));
});

await browser.close();
console.log(`\n${failed ? '❌' : '✅'} 통과 ${passed} · 실패 ${failed}`);
process.exit(failed ? 1 : 0);
