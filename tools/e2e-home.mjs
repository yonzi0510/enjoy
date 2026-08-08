#!/usr/bin/env node
/* 홈 화면 e2e — 저장소 루트에서 정적 서버를 띄운 뒤 실행한다.
 *
 *   python3 -m http.server 8777 &
 *   node tools/e2e-home.mjs
 *
 * 홈은 그림 한 장이 아니라 코드로 짜여 있어서, 화면 크기마다 다시 배치된다.
 * 그래서 폰·패드 × 가로·세로 네 경우를 모두 재서
 *   · 콘솔 오류 0
 *   · 놀이 링크가 실제로 있는 폴더를 가리키는지
 *   · 5세 손가락 하한 44px 을 지키는지
 *   · 가로로 넘쳐 스크롤이 생기지 않는지
 * 를 확인한다.
 */
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const PW = process.env.PW_MODULE || '/opt/node22/lib/node_modules/playwright';
const { chromium } = await import(PW + '/index.mjs');

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BASE = process.env.BASE_URL || 'http://127.0.0.1:8777/';
const TOUCH_MIN = 44;   // 5세 손가락 하한

const CASES = [
  ['폰 세로', 390, 844],
  ['폰 가로', 844, 390],
  ['패드 세로', 820, 1180],
  ['패드 가로', 1180, 820],
];

let pass = 0, fail = 0;
const ok = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name}${detail ? ' — ' + detail : ''}`); }
};

const browser = await chromium.launch();

for (const [label, width, height] of CASES) {
  console.log(`\n[${label} ${width}×${height}]`);
  const page = await browser.newPage({ viewport: { width, height } });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(String(e)));

  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(200);

  ok('콘솔 오류 0', errors.length === 0, errors[0]);

  const info = await page.evaluate(() => {
    const vis = el => el.offsetParent !== null || el === document.body;
    const touch = [...document.querySelectorAll('.bar, .who button, .game')]
      .filter(vis)
      .map(el => ({ name: el.getAttribute('aria-label') || el.textContent.trim(),
                    h: Math.round(el.getBoundingClientRect().height) }));
    return {
      groups: document.querySelectorAll('.group').length,
      games: [...document.querySelectorAll('.game')].map(a => a.dataset.id),
      titleShown: !!document.querySelector('.title')?.clientWidth,
      touch,
      overflowX: document.documentElement.scrollWidth > window.innerWidth + 1,
      screens: +(document.documentElement.scrollHeight / window.innerHeight).toFixed(2),
    };
  });

  ok('묶음 6개', info.groups === 6, `${info.groups}개`);
  ok('제목 글씨 보임', info.titleShown);

  const small = info.touch.filter(t => t.h < TOUCH_MIN);
  ok(`펼쳐진 단추가 모두 ${TOUCH_MIN}px 이상`, small.length === 0,
     small.map(t => `${t.name} ${t.h}px`).join(', '));

  ok('가로 스크롤 없음', !info.overflowX);
  ok('한 화면에 대체로 들어옴 (1.3쪽 이하)', info.screens <= 1.3, `${info.screens}쪽`);

  /* 묶음을 모두 펼쳐 아이콘과 링크를 확인한다 */
  const closed = await page.$$('.group[aria-expanded="false"] .bar');
  for (const bar of closed) await bar.click();
  await page.waitForTimeout(150);

  const opened = await page.evaluate(() => {
    const games = [...document.querySelectorAll('.game')];
    const noIcon = games.filter(a => {
      const use = a.querySelector('.gi use');
      const id = use && use.getAttribute('href').slice(1);
      return !id || !document.getElementById(id);
    }).map(a => a.dataset.id);
    const shown = games.filter(a => !a.hidden);
    const small = shown.filter(a => a.getBoundingClientRect().height < 44)
                       .map(a => a.dataset.id);
    return { count: games.length, noIcon, small,
             practikaHidden: !!document.querySelector('.game[data-id="practika"]')?.hidden };
  });

  ok('놀이 29개', opened.count === 29, `${opened.count}개`);
  ok('모든 놀이에 아이콘이 있음', opened.noIcon.length === 0, opened.noIcon.join(', '));
  ok(`펼친 뒤에도 ${TOUCH_MIN}px 이상`, opened.small.length === 0, opened.small.join(', '));
  ok('프랙티카는 부모님이 켜야 보임 (기본 숨김)', opened.practikaHidden);

  await page.close();
}

/* 링크가 실제 폴더를 가리키는지 (화면 크기와 무관하므로 한 번만) */
console.log('\n[링크]');
const page = await browser.newPage();
await page.goto(BASE, { waitUntil: 'networkidle' });
const ids = await page.evaluate(() =>
  [...document.querySelectorAll('.game')].map(a => a.dataset.id));
const missing = ids.filter(id => !existsSync(join(ROOT, id, 'index.html')));
ok('모든 놀이 폴더가 있음', missing.length === 0, missing.join(', '));
ok('중복 없음', new Set(ids).size === ids.length);
await page.close();

await browser.close();
console.log(`\n결과: ${pass} 통과, ${fail} 실패`);
process.exit(fail ? 1 : 0);
