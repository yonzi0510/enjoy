/* 데이터 검증 — node market/tools/validate-data.js
 * 상품 가격(100원 단위·단계 규칙 안)·id 유일성·단계·동전 조합·손님·주문 문장 계약을 정적 검사한다.
 */
'use strict';

global.window = {};
require('../js/data.js');
const D = global.window.MarketData;

let errors = 0;
function err(msg) { errors++; console.error('❌ ' + msg); }

/* ── 금액 읽기 표본 검사 ── */
const wonExpect = { 100: '백', 300: '삼백', 500: '오백', 700: '칠백', 900: '구백', 1000: '천', 1500: '천오백' };
Object.entries(wonExpect).forEach(([n, name]) => {
  const got = D.wonName(+n);
  if (got !== name) err('wonName(' + n + ') = "' + got + '" (기대: "' + name + '")');
});

/* ── 상품: 30종 이상, id 유일, 가격 100~900원의 100원 단위 ── */
if (!Array.isArray(D.PRODUCTS) || D.PRODUCTS.length < 30) {
  err('상품이 30종 이상이어야 함: ' + (D.PRODUCTS ? D.PRODUCTS.length : 0));
}
const ids = new Set();
const cats = new Set(['fruit', 'veg', 'snack', 'bread', 'toy', 'stat', 'flower']);
(D.PRODUCTS || []).forEach(p => {
  const tag = '상품 ' + (p.id || '?');
  if (!p.id || ids.has(p.id)) err(tag + ': id 누락/중복');
  ids.add(p.id);
  if (!p.name || !p.emoji) err(tag + ': 이름·이모지 누락');
  if (!cats.has(p.cat)) err(tag + ': cat 오류 — ' + p.cat);
  if (!(Number.isInteger(p.price) && p.price >= 100 && p.price <= 900 && p.price % 100 === 0)) {
    err(tag + ': 가격은 100~900원의 100원 단위여야 함 — ' + p.price);
  }
});

/* ── 단계: 3단계, 동전은 100·500원만, 단계 규칙 검사 ── */
if (!Array.isArray(D.LEVELS) || D.LEVELS.length !== 3) err('단계가 3개여야 함');
(D.LEVELS || []).forEach(lv => {
  const tag = lv.name || ('단계 ' + lv.id);
  if (!Array.isArray(lv.coins) || !lv.coins.length || lv.coins.some(v => v !== 100 && v !== 500)) {
    err(tag + ': 동전은 100원·500원만 쓸 수 있음 — ' + JSON.stringify(lv.coins));
  }
  if (lv.items !== 1 && lv.items !== 2) err(tag + ': 주문 개수(items)는 1 또는 2 — ' + lv.items);
  if (!(lv.min >= 100 && lv.max <= 900 && lv.min < lv.max && lv.min % 100 === 0 && lv.max % 100 === 0)) {
    err(tag + ': 가격 범위 오류 — ' + lv.min + '~' + lv.max);
  }
  // 진열대(6칸)를 채우고 주문을 뽑을 만큼 상품이 있어야 한다
  const pool = D.levelPool(lv);
  if (pool.length < 6) err(tag + ': 범위 안 상품이 6종 이상이어야 함 — ' + pool.length);
  // 모든 상품이 이 단계 동전으로 정확히 낼 수 있어야 한다
  pool.forEach(p => {
    const total = p.price * 1;
    const combo = D.coinsFor(total, lv.coins);
    const sum = combo.reduce((a, b) => a + b, 0);
    if (sum !== total) err(tag + ': ' + p.id + ' 가격 ' + total + '원을 동전으로 못 만듦');
  });
});
// 단계1: 100원 동전만 1~5개 (가격 100~500원)
const lv1 = (D.LEVELS || [])[0];
if (lv1) {
  if (JSON.stringify(lv1.coins) !== '[100]') err('단계1: 100원 동전만 써야 함');
  if (lv1.max > 500) err('단계1: 동전 5개(500원)를 넘는 상품이 있으면 안 됨 — max ' + lv1.max);
  D.levelPool(lv1).forEach(p => {
    const n = D.coinsFor(p.price, lv1.coins).length;
    if (n < 1 || n > 5) err('단계1: ' + p.id + ' 동전 수(1~5) 오류 — ' + n + '개');
  });
}
// 단계2: 500원 동전이 등장해야 한다
const lv2 = (D.LEVELS || [])[1];
if (lv2 && lv2.coins.indexOf(500) < 0) err('단계2: 500원 동전이 있어야 함');
// 단계3: 두 상품 합산 — 합쳐도 동전으로 만들 수 있는지 (최소+최소, 최대+최대 표본)
const lv3 = (D.LEVELS || [])[2];
if (lv3) {
  if (lv3.items !== 2) err('단계3: 두 상품 합산이어야 함 (items=2)');
  const pool = D.levelPool(lv3);
  if (pool.length >= 2) {
    const prices = pool.map(p => p.price).sort((a, b) => a - b);
    [prices[0] + prices[1], prices[prices.length - 1] + prices[prices.length - 2]].forEach(total => {
      const sum = D.coinsFor(total, lv3.coins).reduce((a, b) => a + b, 0);
      if (sum !== total) err('단계3: 합산 ' + total + '원을 동전으로 못 만듦');
    });
  }
}

/* ── 가게 테마: 3개 이상, id 유일, 어느 단계에서든 진열대를 채울 수 있어야 함 ── */
if (!Array.isArray(D.THEMES) || D.THEMES.length < 3) {
  err('가게 테마가 3개 이상이어야 함: ' + (D.THEMES ? D.THEMES.length : 0));
}
const themeIds = new Set();
(D.THEMES || []).forEach(t => {
  const tag = '테마 ' + (t.id || '?');
  if (!t.id || themeIds.has(t.id)) err(tag + ': id 누락/중복');
  themeIds.add(t.id);
  if (!t.name || !t.emoji || !t.greet) err(tag + ': 이름·간판 이모지·개점 인사 누락');
  if (!Array.isArray(t.cats) || !t.cats.length || t.cats.some(c => !cats.has(c))) {
    err(tag + ': cats 오류 — ' + JSON.stringify(t.cats));
  }
  // 모든 단계에서: 진열대(SHELF칸)를 채우고 주문(items개)을 뽑을 수 있어야 한다
  (D.LEVELS || []).forEach(lv => {
    const pool = D.themePool(t, lv);
    if (pool.length < D.SHELF) {
      err(tag + ' × ' + lv.name + ': 진열대를 못 채움 — ' + pool.length + '/' + D.SHELF);
    }
    if (pool.length < lv.items) err(tag + ' × ' + lv.name + ': 주문 상품이 모자람');
    // 두 개 주문 단계는 합산 금액(최소·최대 표본)도 동전으로 낼 수 있어야 한다
    if (lv.items >= 2 && pool.length >= 2) {
      const prices = pool.map(p => p.price).sort((a, b) => a - b);
      [prices[0] + prices[1], prices[prices.length - 1] + prices[prices.length - 2]].forEach(total => {
        const sum = D.coinsFor(total, lv.coins).reduce((a, b) => a + b, 0);
        if (sum !== total) err(tag + ' × ' + lv.name + ': 합산 ' + total + '원을 동전으로 못 만듦');
      });
    }
  });
});

/* ── 동전 조합 표본 검사 ── */
if (JSON.stringify(D.coinsFor(300, [100])) !== '[100,100,100]') err('coinsFor(300,[100]) 오류');
if (JSON.stringify(D.coinsFor(700, [500, 100])) !== '[500,100,100]') err('coinsFor(700,[500,100]) 오류');
if (JSON.stringify(D.coinsFor(1000, [500, 100])) !== '[500,500]') err('coinsFor(1000,[500,100]) 오류');

/* ── 손님: 8명 이상, 종 id는 펫 도감(shared/pet.js) 16종 안에서 ── */
const PET_SPECIES = ['chick', 'puppy', 'kitty', 'rabbit', 'bear', 'panda', 'koala', 'fox',
  'frog', 'turtle', 'lion', 'tiger', 'pig', 'hamster', 'dolphin', 'unicorn'];
if (!Array.isArray(D.CUSTOMERS) || D.CUSTOMERS.length < 8) {
  err('손님이 8명 이상이어야 함: ' + (D.CUSTOMERS ? D.CUSTOMERS.length : 0));
}
const sps = new Set();
(D.CUSTOMERS || []).forEach(c => {
  const tag = '손님 ' + (c.sp || '?');
  if (!c.sp || sps.has(c.sp)) err(tag + ': 종 누락/중복');
  sps.add(c.sp);
  if (PET_SPECIES.indexOf(c.sp) < 0) err(tag + ': 펫 도감에 없는 종');
  if (!c.e || !c.name || !c.greet) err(tag + ': 이모지·이름·인사말 누락');
});

/* ── 주문 문장: 종류별 3개 이상, 조사 토큰이 다 채워지는지 ── */
['eat', 'toy', 'stat', 'flower'].forEach(k => {
  const pool = (D.ORDER_LINES || {})[k];
  if (!Array.isArray(pool) || pool.length < 3) err('주문 문장(' + k + ')이 3개 이상이어야 함');
  (pool || []).forEach(line => { if (line.indexOf('{n}') < 0) err('주문 문장에 {n}이 없음: ' + line); });
});
// 모든 상품 카테고리가 주문 문장·리액션 묶음으로 이어져야 한다
cats.forEach(c => {
  const k = D.lineKey(c);
  if (!(D.ORDER_LINES || {})[k]) err('카테고리 ' + c + ': 주문 문장 묶음(' + k + ') 없음');
  if (!(D.REACTIONS || {})[k]) err('카테고리 ' + c + ': 리액션 묶음(' + k + ') 없음');
});
// 리액션: 종류별 2개 이상, 미완성 토큰 없음
Object.entries(D.REACTIONS || {}).forEach(([k, pool]) => {
  if (!Array.isArray(pool) || pool.length < 2) err('리액션(' + k + ')이 2개 이상이어야 함');
  (pool || []).forEach(line => { if (/[{}\[\]]/.test(line)) err('리액션에 미완성 토큰: ' + line); });
});
(D.PRODUCTS || []).forEach(p => {
  const r = D.reactionFor(p);
  if (!r || /[{}\[\]]/.test(r)) err('리액션 조립 오류(' + p.id + '): ' + r);
});
if (!Array.isArray(D.PAIR_LINES) || D.PAIR_LINES.length < 2) err('두 개 주문 문장이 2개 이상이어야 함');
(D.PAIR_LINES || []).forEach(line => {
  if (line.indexOf('{a}') < 0 || line.indexOf('{b}') < 0) err('두 개 주문 문장에 {a}/{b}가 없음: ' + line);
});
// 실제로 채워 봤을 때 이름이 들어가고 미완성 토큰이 남지 않는지
(D.PRODUCTS || []).forEach(p => {
  for (let i = 0; i < 8; i++) {
    const t = D.orderText(p);
    if (t.indexOf(p.name) < 0 || /[{}\[\]]/.test(t)) err('주문 문장 조립 오류(' + p.id + '): ' + t);
  }
});
if (D.PRODUCTS && D.PRODUCTS.length >= 2) {
  for (let i = 0; i < 8; i++) {
    const t = D.pairText(D.PRODUCTS[0], D.PRODUCTS[1]);
    if (/[{}\[\]]/.test(t)) err('두 개 주문 문장 조립 오류: ' + t);
  }
}
// 조사 표본: 수박(받침 O)·사과(받침 X)
if (D.josa('수박', '은', '는') !== '은') err("josa('수박') 오류");
if (D.josa('사과', '은', '는') !== '는') err("josa('사과') 오류");
if (D.fillJosa('수박[을,를]') !== '수박을') err('fillJosa(수박) 오류');
if (D.fillJosa('사과[을,를]') !== '사과를') err('fillJosa(사과) 오류');

/* ── 기타 ── */
if (!Array.isArray(D.THANKS) || D.THANKS.length < 3) err('감사 인사가 3개 이상이어야 함');
if (!Array.isArray(D.praises) || !D.praises.length) err('칭찬 문구가 없음');
if (!(D.ROUND >= 3)) err('한 판 손님 수가 너무 적음');
if (!(D.SHELF >= 4)) err('진열대 칸이 너무 적음');

if (errors) {
  console.error('\n검증 실패: 오류 ' + errors + '개');
  process.exit(1);
}
console.log('✅ 데이터 검증 통과 — 상품 ' + D.PRODUCTS.length + '종, 가게 테마 ' + D.THEMES.length + '개, 단계 ' +
  D.LEVELS.length + '개, 손님 ' + D.CUSTOMERS.length + '명, 한 판 손님 ' + D.ROUND + '명');
