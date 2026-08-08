/* burger 낙서장 검수 (임시) — 폰 390×844 · 패드 1180×820 · 폰가로 844×390
 * 콘솔 오류 / 이탈 / 겹침 / 터치 하한 / 놀이판 무변형 / 이모지 잔재를 잰다. */
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const BASE = 'http://127.0.0.1:8777/burger/';
const OUT = '/tmp/claude-0/-home-user-enjoy/797e89d3-dc8d-5a51-b593-8be8623a6974/scratchpad/burger-team/';
const RE = '[\\u{2190}-\\u{27BF}\\u{2B00}-\\u{2BFF}\\u{1F300}-\\u{1FAFF}]';

const rects = sel => Array.from(document.querySelectorAll(sel)).map(e => {
  const r = e.getBoundingClientRect();
  return { x: r.left, y: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height };
});
const overlaps = cards => {
  const o = [];
  for (let i = 0; i < cards.length; i++) for (let j = i + 1; j < cards.length; j++) {
    const a = cards[i], b = cards[j];
    const ox = Math.min(a.r, b.r) - Math.max(a.x, b.x), oy = Math.min(a.b, b.b) - Math.max(a.y, b.y);
    if (ox > 1 && oy > 1) o.push([i, j, Math.round(ox), Math.round(oy)]);
  }
  return o;
};

const browser = await chromium.launch();
let bad = 0;
const flag = (n, m) => { bad++; console.log('   ❌ ' + n + ' — ' + m); };

for (const s of [{ w: 390, h: 844, n: '폰세로' }, { w: 1180, h: 820, n: '패드가로' }, { w: 844, h: 390, n: '폰가로' }]) {
  const page = await browser.newPage({ viewport: { width: s.w, height: s.h } });
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto(BASE);
  await page.waitForSelector('#scr-home.on');
  await page.waitForTimeout(600);
  await page.screenshot({ path: OUT + 'home-' + s.n + '.png' });

  const home = await page.evaluate(([rf, of_, re]) => {
    const f = new Function('sel', 'return (' + rf + ')(sel)');
    const ov = new Function('c', 'return (' + of_ + ')(c)');
    const cards = f('#menu .menu-card');
    const rx = new RegExp(re, 'u');
    const emoji = [];
    document.querySelectorAll('#scr-home *').forEach(el => {
      if (el.children.length || el.offsetParent === null) return;
      const t = (el.textContent || '').trim();
      if (t && rx.test(t) && !el.closest('#pet-slot')) emoji.push(el.className + ':' + t.slice(0, 12));
    });
    return {
      widths: cards.map(c => Math.round(c.w)),
      over: ov(cards),
      out: cards.filter(c => c.x < -1 || c.r > innerWidth + 1 || c.b > innerHeight + 1).length,
      minTap: Math.round(Math.min(...f('#menu .menu-card, #scr-home .vs-btn, .enjoy-home-btn')
        .filter(c => c.w > 0).map(c => Math.min(c.w, c.h)))),
      empty: Array.from(document.querySelectorAll('.dd-ic')).filter(e => !e.querySelector('svg')).length,
      docScroll: document.documentElement.scrollWidth - innerWidth, emoji,
    };
  }, [rects.toString(), overlaps.toString(), RE]);
  console.log(s.n, '홈', JSON.stringify(home));
  if (home.over.length) flag(s.n + ' 홈', '카드 겹침');
  if (home.out) flag(s.n + ' 홈', '카드 이탈');
  if (home.empty) flag(s.n + ' 홈', '빈 아이콘 ' + home.empty);
  if (home.docScroll > 1) flag(s.n + ' 홈', '가로 스크롤');
  if (home.emoji.length) flag(s.n + ' 홈', '이모지 잔재 ' + home.emoji.join(','));
  if (home.minTap < 44) flag(s.n + ' 홈', '터치 하한 ' + home.minTap);
  if (!(home.widths[0] > home.widths[1] && home.widths[1] > home.widths[2])) flag(s.n + ' 홈', '크기 위계 어긋남 ' + home.widths);

  await page.click('.menu-card.c-l1');
  await page.waitForSelector('#scr-missions.on');
  await page.waitForTimeout(500);
  await page.screenshot({ path: OUT + 'miss-' + s.n + '.png' });
  const miss = await page.evaluate(([rf, of_, re]) => {
    const f = new Function('sel', 'return (' + rf + ')(sel)');
    const ov = new Function('c', 'return (' + of_ + ')(c)');
    const cards = f('#missions-list .mission-card');
    const rx = new RegExp(re, 'u');
    const emoji = [];
    document.querySelectorAll('#scr-missions *').forEach(el => {
      if (el.children.length || el.offsetParent === null) return;
      const t = (el.textContent || '').trim();
      if (t && rx.test(t)) emoji.push(el.className + ':' + t.slice(0, 12));
    });
    const scr = document.querySelector('#scr-missions');
    return {
      n: cards.length, over: ov(cards),
      next: document.querySelectorAll('#missions-list .mission-card.next').length,
      out: cards.filter(c => c.x < -1 || c.r > innerWidth + 1).length,
      hscroll: scr.scrollWidth - scr.clientWidth,
      minTap: Math.round(Math.min(...cards.map(c => Math.min(c.w, c.h)))),
      docScroll: document.documentElement.scrollWidth - innerWidth, emoji,
    };
  }, [rects.toString(), overlaps.toString(), RE]);
  console.log(s.n, '목록', JSON.stringify(miss));
  if (miss.over.length) flag(s.n + ' 목록', '카드 겹침 ' + JSON.stringify(miss.over));
  if (miss.out || miss.hscroll > 1 || miss.docScroll > 1) flag(s.n + ' 목록', '이탈/가로스크롤');
  if (miss.emoji.length) flag(s.n + ' 목록', '이모지 잔재 ' + miss.emoji.join(','));
  if (miss.next !== 1) flag(s.n + ' 목록', '이번 차례 표시 ' + miss.next);
  if (miss.minTap < 44) flag(s.n + ' 목록', '터치 하한 ' + miss.minTap);

  await page.click('#missions-list .mission-card');
  await page.waitForSelector('#scr-play.on');
  await page.waitForTimeout(500);
  await page.screenshot({ path: OUT + 'play-' + s.n + '.png' });
  const play = await page.evaluate(([re]) => {
    const tf = el => getComputedStyle(el).transform;
    const rx = new RegExp(re, 'u');
    const emoji = [];
    document.querySelectorAll('#scr-play *').forEach(el => {
      if (el.children.length || el.offsetParent === null) return;
      const t = (el.textContent || '').trim();
      if (t && rx.test(t)) emoji.push(el.className + ':' + t.slice(0, 12));
    });
    const tr = document.querySelector('#tray');
    return {
      boardTf: [document.querySelector('#peg-wrap'), document.querySelector('#peg-stack'), tr,
                ...document.querySelectorAll('.tray-item')].map(tf).filter(t => t !== 'none'),
      trayBottom: Math.round(tr.getBoundingClientRect().bottom), vh: innerHeight,
      pegTop: Math.round(document.querySelector('#peg-wrap').getBoundingClientRect().top),
      minTap: Math.round(Math.min(...Array.from(document.querySelectorAll('#scr-play .tray-item, #scr-play .back, #scr-play .bigbtn'))
        .map(e => { const r = e.getBoundingClientRect(); return Math.min(r.width, r.height); }).filter(v => v > 0))),
      nums: document.querySelectorAll('.rc-num svg').length,
      docScroll: document.documentElement.scrollWidth - innerWidth, emoji,
    };
  }, [RE]);
  console.log(s.n, '놀이', JSON.stringify(play));
  if (play.boardTf.length) flag(s.n + ' 놀이', '쌓는 판에 변형이 걸림 ' + play.boardTf.join('|'));
  if (play.emoji.length) flag(s.n + ' 놀이', '이모지 잔재 ' + play.emoji.join(','));
  if (play.trayBottom > play.vh + 2 || play.pegTop < -2 || play.docScroll > 1) flag(s.n + ' 놀이', '이탈');
  if (play.minTap < 44) flag(s.n + ' 놀이', '터치 하한 ' + play.minTap);

  await page.evaluate(async () => { for (;;) { const n = App.debug().nextId; if (!n) break; App._attempt(n); await new Promise(r => setTimeout(r, 40)); } });
  await page.waitForSelector('#reward.on');
  await page.waitForTimeout(600);
  await page.screenshot({ path: OUT + 'reward-' + s.n + '.png' });
  const rw = await page.evaluate(([re]) => {
    const rx = new RegExp(re, 'u');
    const r = document.querySelector('.reward-card').getBoundingClientRect();
    const emoji = [];
    document.querySelectorAll('.reward-card *').forEach(el => {
      if (el.children.length || el.offsetParent === null) return;
      const t = (el.textContent || '').trim();
      if (t && rx.test(t)) emoji.push(el.className + ':' + t.slice(0, 12));
    });
    return { svg: !!document.querySelector('#reward-burger svg'), emoji,
             fit: r.top >= -1 && r.bottom <= innerHeight + 1 && r.left >= -1 && r.right <= innerWidth + 1 };
  }, [RE]);
  console.log(s.n, '보상', JSON.stringify(rw), '콘솔오류=' + errs.length, errs.slice(0, 3));
  if (!rw.svg) flag(s.n + ' 보상', '축하 햄버거 손그림 없음');
  if (rw.emoji.length) flag(s.n + ' 보상', '이모지 잔재 ' + rw.emoji.join(','));
  if (!rw.fit) flag(s.n + ' 보상', '보상 카드 화면 밖');
  if (errs.length) flag(s.n, '콘솔 오류 ' + errs.join(' | '));
  await page.close();
}
await browser.close();
console.log(bad ? '\n❌ 문제 ' + bad : '\n✅ 전부 통과');
process.exit(bad ? 1 : 0);
