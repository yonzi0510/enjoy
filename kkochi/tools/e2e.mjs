#!/usr/bin/env node
/* 종단 테스트 — node kkochi/tools/e2e.mjs
 * 실제 Chromium 으로 홈 → 미션 목록 → 카드 순서대로 스틱에 꿰기 → 완성·별·펫 간식,
 * 틀린 재료 무벌점, 단계별 알 개수, 2·3단계 반복 패턴 미션 존재, 새로고침 진행도 유지,
 * 3해상도(태블릿 가로/폰 가로/폰 세로) 잘림까지 검증한다.
 * 저장소 루트에서 정적 서버를 띄운 뒤 실행 (예: python3 -m http.server 8777)
 */
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');

const BASE = process.env.BASE_URL || 'http://127.0.0.1:8777/kkochi/';
let passed = 0, failed = 0;
function ok(name) { passed++; console.log('  ✅ ' + name); }
function fail(name, extra) { failed++; console.error('  ❌ ' + name + (extra ? ' — ' + extra : '')); }
async function check(name, fn) { try { await fn(); ok(name); } catch (e) { fail(name, e.message); } }
function expect(cond, msg) { if (!cond) throw new Error(msg || 'expect 실패'); }

// 트레이 재료를 탭(클릭)해 스틱에 꿰기 시도 — 재료는 재사용되므로 사라지지 않는다
async function tapIng(page, id) {
  await page.click('.tray-item[data-id="' + id + '"]');
}
// 미션을 카드 순서대로 끝까지 꿴다
async function skewerAll(page) {
  for (let guard = 0; guard < 40; guard++) {
    const nid = await page.evaluate(() => App.debug().nextId);
    if (!nid) break;
    await tapIng(page, nid);
    await page.waitForTimeout(60);
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

await check('미션 목록: 단계1 미션 10개', async () => {
  await page.click('.menu-card.c-l1');
  await page.waitForSelector('#scr-missions.on');
  expect(await page.locator('#missions-list .mission-card').count() === 10, '미션 수');
  expect((await page.locator('#missions-count').textContent()).includes('0 / 10'), '진행 표기');
});

await check('미션 진입: 미션 카드 줄·트레이·첫 재료 표시', async () => {
  await page.click('#missions-list .mission-card');
  await page.waitForSelector('#scr-play.on');
  const d = await page.evaluate(() => App.debug());
  expect(d.seq.length >= 3 && d.seq.length <= 4, '단계1 알 개수: ' + d.seq.length);
  expect(d.nextId === d.seq[0], '첫 재료 = seq[0]: ' + d.nextId);
  expect(await page.locator('#recipe-list .rc-row').count() === d.seq.length, '미션 카드 줄 수');
  // 트레이 = 미션 재료 종류 + 방해 재료(extra 2)
  const uniq = Array.from(new Set(d.seq));
  expect(await page.locator('#tray .tray-item').count() === uniq.length + 2, '트레이 재료 수: ' + d.trayIds.length);
});

await check('틀린 재료 무벌점: 순서 아닌 재료는 안 꿰이고 축하도 없다', async () => {
  const d0 = await page.evaluate(() => App.debug());
  const wrong = d0.trayIds.find(id => id !== d0.nextId);
  await tapIng(page, wrong);
  await page.waitForTimeout(150);
  const d = await page.evaluate(() => App.debug());
  expect(d.placed.length === 0, '틀린 탭인데 꿰임: ' + JSON.stringify(d.placed));
  expect(d.pegCount === 0, '스틱에 알이 생김');
  expect(!(await page.locator('#reward').evaluate(el => el.classList.contains('on'))), '틀렸는데 축하가 뜸');
});

await check('카드 순서대로 꿰기 → 완성 → 축하·별·펫 간식', async () => {
  const d0 = await page.evaluate(() => App.debug());
  const seqLen = d0.seq.length;
  const petBefore = await page.evaluate(() => window.Pet ? Pet.state().snacks : 0);
  await skewerAll(page);
  await page.waitForSelector('#reward.on', { timeout: 5000 });
  const d = await page.evaluate(() => App.debug());
  expect(d.locked === true, '완성 잠금');
  expect(d.pegCount === seqLen, '스틱 알 개수: ' + d.pegCount + ' ≠ ' + seqLen);
  expect(d.stars === seqLen, '별(알 개수만큼): ' + d.stars + ' ≠ ' + seqLen);
  expect(d.done === true, '미션 완료 저장');
  const petAfter = await page.evaluate(() => window.Pet ? Pet.state().snacks : 0);
  expect(petAfter === petBefore + 1, '펫 간식: ' + petBefore + '→' + petAfter);
});

await check('완성 표시: 목록에 done + 진행 1 / 10', async () => {
  await page.click('#reward-close'); // 그만할래 → 미션 목록
  await page.waitForSelector('#scr-missions.on');
  expect(await page.locator('#missions-list .mission-card.done').count() === 1, '완성 미션 수');
  expect((await page.locator('#missions-count').textContent()).includes('1 / 10'), '진행 표기');
});

// 단계1 첫 미션 별 수(누적 추적용)
let starTotal = 0;
await check('단계2: 알 개수 4~5, 트레이 방해 2', async () => {
  await page.click('#scr-missions .back');
  await page.waitForSelector('#scr-home.on');
  starTotal = parseInt(await page.locator('#home-stars').textContent(), 10);
  await page.click('.menu-card.c-l2');
  await page.waitForSelector('#scr-missions.on');
  await page.click('#missions-list .mission-card');
  await page.waitForSelector('#scr-play.on');
  const d = await page.evaluate(() => App.debug());
  expect(d.seq.length >= 4 && d.seq.length <= 5, '단계2 알 개수: ' + d.seq.length);
  const uniq = Array.from(new Set(d.seq));
  expect(uniq.length < d.seq.length, '단계2 는 반복 패턴이어야: ' + d.seq.join('>'));
  expect(d.trayIds.length === uniq.length + 2, '트레이 수(종류+2): ' + d.trayIds.length);
});

await check('단계2 완성: 별이 알 개수만큼 늘어난다', async () => {
  const d0 = await page.evaluate(() => App.debug());
  const seqLen = d0.seq.length;
  await skewerAll(page);
  await page.waitForSelector('#reward.on', { timeout: 5000 });
  const after = await page.evaluate(() => App.debug().stars);
  expect(after === starTotal + seqLen, '별 증가: ' + starTotal + '+' + seqLen + '≠' + after);
  starTotal = after;
  await page.click('#reward-close');
  await page.waitForSelector('#scr-missions.on');
});

await check('단계3: 알 개수 6~7, 트레이 방해 3', async () => {
  await page.click('#scr-missions .back');
  await page.click('.menu-card.c-l3');
  await page.waitForSelector('#scr-missions.on');
  await page.click('#missions-list .mission-card');
  await page.waitForSelector('#scr-play.on');
  const d = await page.evaluate(() => App.debug());
  expect(d.seq.length >= 6 && d.seq.length <= 7, '단계3 알 개수: ' + d.seq.length);
  const uniq = Array.from(new Set(d.seq));
  expect(uniq.length < d.seq.length, '단계3 는 반복 패턴이어야: ' + d.seq.join('>'));
  expect(d.trayIds.length === uniq.length + 3, '트레이 수(종류+3): ' + d.trayIds.length);
  await page.click('#btn-play-back');
  await page.waitForSelector('#scr-missions.on');
});

await check('2·3단계 데이터에 반복 패턴 미션이 존재한다', async () => {
  const bad = await page.evaluate(() => {
    const D = window.KkochiData;
    const uniq = a => Array.from(new Set(a));
    const out = [];
    [2, 3].forEach(lv => {
      D.missionsOf(lv).forEach(ms => {
        if (uniq(ms.seq).length >= ms.seq.length) out.push(ms.id);
      });
    });
    // 단계1은 반대로 반복이 없어야 한다
    D.missionsOf(1).forEach(ms => {
      if (uniq(ms.seq).length !== ms.seq.length) out.push('L1반복:' + ms.id);
    });
    return out;
  });
  expect(bad.length === 0, '패턴 규칙 위반: ' + bad.join(','));
});

await check('새로고침 후 진행도 유지', async () => {
  await page.goto(BASE);
  await page.waitForSelector('#scr-home.on');
  expect((await page.locator('#home-stars').textContent()) === String(starTotal), '별 수: ' + starTotal);
  const l1 = await page.locator('.menu-card.c-l1 .mc-prog').textContent();
  expect(l1.includes('1 / 10'), '단계1 진행: ' + l1);
  const l2 = await page.locator('.menu-card.c-l2 .mc-prog').textContent();
  expect(l2.includes('1 / 10'), '단계2 진행: ' + l2);
});

await check('3해상도 잘림 없음 (가로 스크롤·세로 넘침 검사)', async () => {
  const sizes = [
    { w: 1180, h: 820, name: '패드 가로' },
    { w: 844, h: 390, name: '폰 가로' },
    { w: 390, h: 844, name: '폰 세로' },
  ];
  for (const s of sizes) {
    await page.setViewportSize({ width: s.w, height: s.h });
    await page.goto(BASE);
    await page.waitForSelector('#scr-home.on');
    await page.click('.menu-card.c-l3'); // 알이 가장 많은 단계로 빡세게
    await page.waitForSelector('#scr-missions.on');
    await page.click('#missions-list .mission-card');
    await page.waitForSelector('#scr-play.on');
    await page.waitForTimeout(140);
    const m = await page.evaluate(() => ({
      horiz: document.documentElement.scrollWidth - window.innerWidth,
      trayBottom: document.querySelector('#tray').getBoundingClientRect().bottom,
      pegTop: document.querySelector('#peg-wrap').getBoundingClientRect().top,
      ih: window.innerHeight,
    }));
    expect(m.horiz <= 1, s.name + ': 가로 스크롤 발생 ' + m.horiz + 'px');
    expect(m.trayBottom <= m.ih + 2, s.name + ': 트레이가 화면 아래로 잘림 ' + m.trayBottom + ' > ' + m.ih);
    expect(m.pegTop >= -2, s.name + ': 꼬치가 위로 잘림 ' + m.pegTop);
  }
  await page.setViewportSize({ width: 1180, height: 820 });
});

/* ─── 낙서장 디자인 검사 ─── */
// 화면 틀(제목·단추·표시)에는 이모지를 쓰지 않는다 — js/icons.js 의 손그림 SVG 로만.
// (펫·프로필 배지·남은 시간 쪽지는 shared/ 공용 부품이라 검사 대상이 아니다)
const NO_EMOJI = `(sel) => {
  const RE = /[\\u{1F300}-\\u{1FAFF}\\u{2190}-\\u{27BF}\\u{2B00}-\\u{2BFF}]/u;
  const hit = [];
  sel.forEach(s => document.querySelectorAll(s).forEach(el => {
    const t = (el.textContent || '').trim();
    if (RE.test(t)) hit.push(s + ' → ' + t.slice(0, 24));
  }));
  return hit;
}`;

await check('첫 화면: 낙서장 배치(칸마다 다른 기울기) + 크기 위계 + 겹침 없음', async () => {
  await page.goto(BASE);
  await page.waitForSelector('#scr-home.on');
  await page.waitForTimeout(200);
  const d = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('#menu .menu-card'));
    const tf = cards.map(c => getComputedStyle(c).transform);
    const r = cards.map(c => c.getBoundingClientRect());
    let over = 0;
    for (let i = 0; i < r.length; i++) for (let j = i + 1; j < r.length; j++) {
      const ox = Math.min(r[i].right, r[j].right) - Math.max(r[i].left, r[j].left);
      const oy = Math.min(r[i].bottom, r[j].bottom) - Math.max(r[i].top, r[j].top);
      if (ox > 1 && oy > 1) over++;
    }
    return {
      tf, over, w: r.map(x => Math.round(x.width)),
      outside: r.filter(x => x.left < -1 || x.right > innerWidth + 1).length,
      hscroll: document.documentElement.scrollWidth - innerWidth,
    };
  });
  expect(d.tf.every(t => t && t !== 'none'), '흩뿌리기(transform)가 없다: ' + d.tf.join(' | '));
  expect(new Set(d.tf).size === d.tf.length, '칸마다 기울기가 달라야 한다');
  expect(d.w[0] > d.w[1] && d.w[1] > d.w[2], '크기 위계(1단계가 가장 크게): ' + d.w.join('>'));
  expect(d.over === 0, '단계 카드가 서로 겹친다');
  expect(d.outside === 0 && d.hscroll <= 1, '단계 카드가 화면 밖으로 나감');
});

await check('손그림 아이콘: 홈·미션 목록의 화면 틀에 이모지가 없다', async () => {
  const homeHit = await page.evaluate(NO_EMOJI + '(["\.home-head h1", "\.stat", "#menu"])');
  expect(homeHit.length === 0, '홈에 이모지: ' + homeHit.join(', '));
  const icons = await page.locator('#scr-home svg.kk-ico').count();
  expect(icons >= 3, '홈 손그림 아이콘 수: ' + icons);
  expect(await page.locator('[data-ico]:empty').count() === 0, '채워지지 않은 data-ico 자리가 있다');

  await page.click('.menu-card.c-l1');
  await page.waitForSelector('#scr-missions.on');
  await page.waitForTimeout(150);
  const missHit = await page.evaluate(NO_EMOJI + '(["#scr-missions .bar", "#missions-list"])');
  expect(missHit.length === 0, '미션 목록에 이모지: ' + missHit.join(', '));
  expect(await page.locator('#missions-list .mission-card.next').count() === 1,
    '다음에 할 미션(크게 그릴 칸)은 딱 하나여야 한다');
  // 상단 바가 '남은 시간' 쪽지와 겹치지 않는다
  const bar = await page.evaluate(() => {
    const g = document.createRange(); g.selectNodeContents(document.querySelector('#missions-title'));
    const t = g.getBoundingClientRect();
    const tag = document.querySelector('.tl-bar-tag');
    const c = document.querySelector('#missions-count').getBoundingClientRect();
    if (!tag) return 0;
    const q = tag.getBoundingClientRect();
    const ov = a => Math.min(a.right, q.right) - Math.max(a.left, q.left) > 2 &&
                    Math.min(a.bottom, q.bottom) - Math.max(a.top, q.top) > 2;
    return (ov(t) ? 1 : 0) + (ov(c) ? 2 : 0);
  });
  expect(bar === 0, '상단 바가 남은 시간 쪽지와 겹친다(코드 ' + bar + ')');
});

await check('놀이판 무변형: 꿰는 판에는 회전·확대가 없다(좌표 판정 보호)', async () => {
  await page.click('#missions-list .mission-card');
  await page.waitForSelector('#scr-play.on');
  await page.waitForTimeout(200);
  const d = await page.evaluate(() => {
    const tf = el => getComputedStyle(el).transform;
    return {
      peg: tf(document.querySelector('#peg-wrap')),
      stack: tf(document.querySelector('#peg-stack')),
      tray: tf(document.querySelector('#tray')),
      items: [...new Set(Array.from(document.querySelectorAll('.tray-item')).map(tf))],
      stage: tf(document.querySelector('#play-stage')),
    };
  });
  expect(d.peg === 'none' && d.stack === 'none', '꼬치 스틱에 변형이 걸림: ' + d.peg + ' / ' + d.stack);
  expect(d.tray === 'none' && d.stage === 'none', '트레이·스테이지에 변형이 걸림');
  expect(d.items.every(t => t === 'none'), '트레이 재료에 변형이 걸림: ' + d.items.join(' | '));
});

await check('손그림 아이콘: 놀이·보상 화면의 화면 틀에 이모지가 없다', async () => {
  const playHit = await page.evaluate(NO_EMOJI + '(["#scr-play .bar", "\.recipe-cap", "\.rc-num", "\.rc-mark"])');
  expect(playHit.length === 0, '놀이 화면에 이모지: ' + playHit.join(', '));
  expect(await page.locator('.rc-mark svg.kk-ico').count() >= 1, '다음 차례 표시(손그림)가 없다');
  await skewerAll(page);
  await page.waitForSelector('#reward.on', { timeout: 5000 });
  const rwHit = await page.evaluate(NO_EMOJI + '([".reward-card"])');
  expect(rwHit.length === 0, '보상 화면에 이모지: ' + rwHit.join(', '));
  expect(await page.locator('#reward-burger svg.kk-ico').count() === 1, '보상 그림이 손그림 SVG 가 아니다');
  await page.click('#reward-close');
  await page.waitForSelector('#scr-missions.on');
});

await check('콘솔 오류 0', async () => {
  expect(consoleErrors.length === 0, consoleErrors.join(' | '));
});

await browser.close();
console.log(`\n${failed ? '❌' : '✅'} 통과 ${passed} · 실패 ${failed}`);
process.exit(failed ? 1 : 0);
