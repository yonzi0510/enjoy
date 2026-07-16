/* 시장 데이터 — 상품·손님·단계·주문 문장·금액 읽기
 * 상품 가격은 100원 단위. 동전은 100원·500원 두 가지(인라인 SVG)만 쓴다.
 */
window.MarketData = (() => {
  const UNITS = ['', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구'];

  // 100원 단위 금액 읽기: 300→삼백, 500→오백, 1000→천, 1500→천오백
  function wonName(n) {
    const t = Math.floor(n / 1000), h = Math.floor((n % 1000) / 100);
    let s = '';
    if (t) s += (t > 1 ? UNITS[t] : '') + '천';
    if (h) s += (h > 1 ? UNITS[h] : '') + '백';
    return s || '영';
  }

  // 받침 유무로 조사 고르기: josa('수박','은','는') → '은'
  function hasBatchim(word) {
    const c = word.charCodeAt(word.length - 1);
    return c >= 0xAC00 && c <= 0xD7A3 && (c - 0xAC00) % 28 !== 0;
  }
  function josa(word, a, b) { return hasBatchim(word) ? a : b; }

  // 문장 속 조사 채우기: '수박[을,를]' → '수박을' (앞 글자 받침으로 판단)
  function fillJosa(text) {
    return text.replace(/([가-힣])\[([^,\]]+),([^\]]+)\]/g,
      (m, ch, a, b) => ch + (((ch.charCodeAt(0) - 0xAC00) % 28) ? a : b));
  }

  /* ─────────── 상품 (선반 진열) ───────────
   * cat: fruit 과일 / veg 채소 / snack 간식 / bread 빵 / toy 장난감 / stat 문구 / flower 꽃
   * — 주문 문장·리액션·가게 테마를 고를 때 쓴다. 기존 id는 바꾸지 않는다(진행도 보존). */
  const PRODUCTS = [
    { id: 'tangerine',  emoji: '🍊', name: '귤',       cat: 'fruit', price: 100 },
    { id: 'candy',      emoji: '🍭', name: '사탕',     cat: 'snack', price: 100 },
    { id: 'banana',     emoji: '🍌', name: '바나나',   cat: 'fruit', price: 200 },
    { id: 'cookie',     emoji: '🍪', name: '쿠키',     cat: 'snack', price: 200 },
    { id: 'apple',      emoji: '🍎', name: '사과',     cat: 'fruit', price: 300 },
    { id: 'grape',      emoji: '🍇', name: '포도',     cat: 'fruit', price: 300 },
    { id: 'milk',       emoji: '🥛', name: '우유',     cat: 'snack', price: 300 },
    { id: 'strawberry', emoji: '🍓', name: '딸기',     cat: 'fruit', price: 400 },
    { id: 'watermelon', emoji: '🍉', name: '수박',     cat: 'fruit', price: 500 },
    { id: 'donut',      emoji: '🍩', name: '도넛',     cat: 'snack', price: 500 },
    { id: 'ball',       emoji: '⚽', name: '축구공',   cat: 'toy',   price: 500 },
    { id: 'car',        emoji: '🚗', name: '자동차',   cat: 'toy',   price: 600 },
    { id: 'icecream',   emoji: '🍦', name: '아이스크림', cat: 'snack', price: 700 },
    { id: 'teddy',      emoji: '🧸', name: '곰인형',   cat: 'toy',   price: 800 },
    { id: 'cake',       emoji: '🍰', name: '케이크',   cat: 'snack', price: 900 },
    { id: 'robot',      emoji: '🤖', name: '로봇',     cat: 'toy',   price: 900 },
    // 과일 추가 (2단계 과일 가게용 500~900원 포함)
    { id: 'cherry',     emoji: '🍒', name: '체리',     cat: 'fruit', price: 400 },
    { id: 'peach',      emoji: '🍑', name: '복숭아',   cat: 'fruit', price: 500 },
    { id: 'mango',      emoji: '🥭', name: '망고',     cat: 'fruit', price: 600 },
    { id: 'pineapple',  emoji: '🍍', name: '파인애플', cat: 'fruit', price: 700 },
    { id: 'melon',      emoji: '🍈', name: '멜론',     cat: 'fruit', price: 900 },
    // 채소 (과일 가게에서 함께 판다)
    { id: 'carrot',     emoji: '🥕', name: '당근',     cat: 'veg',   price: 100 },
    { id: 'potato',     emoji: '🥔', name: '감자',     cat: 'veg',   price: 200 },
    { id: 'cucumber',   emoji: '🥒', name: '오이',     cat: 'veg',   price: 200 },
    { id: 'tomato',     emoji: '🍅', name: '토마토',   cat: 'veg',   price: 300 },
    { id: 'corn',       emoji: '🌽', name: '옥수수',   cat: 'veg',   price: 600 },
    // 빵집
    { id: 'pretzel',    emoji: '🥨', name: '프레첼',   cat: 'bread', price: 300 },
    { id: 'bread',      emoji: '🍞', name: '식빵',     cat: 'bread', price: 400 },
    { id: 'croissant',  emoji: '🥐', name: '크루아상', cat: 'bread', price: 500 },
    { id: 'baguette',   emoji: '🥖', name: '바게트',   cat: 'bread', price: 600 },
    { id: 'sandwich',   emoji: '🥪', name: '샌드위치', cat: 'bread', price: 700 },
    { id: 'pie',        emoji: '🥧', name: '파이',     cat: 'bread', price: 800 },
    // 문구점
    { id: 'pencil',     emoji: '✏️', name: '연필',     cat: 'stat',  price: 100 },
    { id: 'crayon',     emoji: '🖍️', name: '크레용',   cat: 'stat',  price: 200 },
    { id: 'notebook',   emoji: '📓', name: '공책',     cat: 'stat',  price: 300 },
    { id: 'scissors',   emoji: '✂️', name: '가위',     cat: 'stat',  price: 400 },
    { id: 'brush',      emoji: '🖌️', name: '붓',       cat: 'stat',  price: 500 },
    { id: 'book',       emoji: '📖', name: '동화책',   cat: 'stat',  price: 600 },
    { id: 'paint',      emoji: '🎨', name: '물감',     cat: 'stat',  price: 700 },
    // 꽃집
    { id: 'daisy',      emoji: '🌼', name: '데이지',   cat: 'flower', price: 100 },
    { id: 'tulip',      emoji: '🌷', name: '튤립',     cat: 'flower', price: 200 },
    { id: 'rose',       emoji: '🌹', name: '장미',     cat: 'flower', price: 300 },
    { id: 'blossom',    emoji: '🌸', name: '벚꽃',     cat: 'flower', price: 300 },
    { id: 'sunflower',  emoji: '🌻', name: '해바라기', cat: 'flower', price: 400 },
    { id: 'hibiscus',   emoji: '🌺', name: '무궁화',   cat: 'flower', price: 500 },
    { id: 'herb',       emoji: '🌿', name: '허브',     cat: 'flower', price: 500 },
    { id: 'pot',        emoji: '🪴', name: '화분',     cat: 'flower', price: 600 },
    { id: 'cactus',     emoji: '🌵', name: '선인장',   cat: 'flower', price: 700 },
    { id: 'bouquet',    emoji: '💐', name: '꽃다발',   cat: 'flower', price: 800 },
    { id: 'lotus',      emoji: '🪷', name: '연꽃',     cat: 'flower', price: 900 },
  ];

  /* ─────────── 단계 (가게) ───────────
   * coins: 이 가게에서 쓰는 동전, min~max: 진열 상품 가격 범위, items: 손님 한 명의 주문 개수 */
  const LEVELS = [
    { id: 1, name: '1단계 가게', desc: '100원 동전으로 계산해요', emoji: '🪙', coins: [100],      min: 100, max: 500, items: 1 },
    { id: 2, name: '2단계 가게', desc: '500원 동전이 나왔어요',   emoji: '💰', coins: [500, 100], min: 500, max: 900, items: 1 },
    { id: 3, name: '3단계 가게', desc: '두 개를 한꺼번에 계산해요', emoji: '🛍️', coins: [500, 100], min: 100, max: 500, items: 2 },
  ];
  function levelPool(lv) { return PRODUCTS.filter(p => p.price >= lv.min && p.price <= lv.max); }

  /* ─────────── 가게 테마 (판마다 바뀌는 간판·진열·개점 인사) ───────────
   * 단계(동전·가격 범위) 구조는 그대로 두고, 진열 상품만 테마 카테고리로 거른다.
   * 모든 테마는 어느 단계에서든 진열대(SHELF칸)를 채울 만큼 상품이 있어야 한다(검증기에서 확인). */
  const THEMES = [
    { id: 'fruit',      emoji: '🍎', name: '과일 가게', cats: ['fruit', 'veg'],   greet: '싱싱한 과일 가게가 문을 열었어요!' },
    { id: 'bakery',     emoji: '🥐', name: '빵집',      cats: ['bread', 'snack'], greet: '고소한 냄새가 나는 빵집이 문을 열었어요!' },
    { id: 'stationery', emoji: '✏️', name: '문구점',    cats: ['stat', 'toy'],    greet: '반짝반짝 문구점이 문을 열었어요!' },
    { id: 'flower',     emoji: '🌷', name: '꽃집',      cats: ['flower'],         greet: '향기로운 꽃집이 문을 열었어요!' },
  ];
  function themePool(theme, lv) {
    return levelPool(lv).filter(p => theme.cats.indexOf(p.cat) >= 0);
  }

  // 가격 → 동전 조합: 500원을 쓸 수 있으면 500원부터, 아니면 100원만
  function coinsFor(price, coins) {
    const out = [];
    let left = price;
    if (coins.indexOf(500) >= 0) { while (left >= 500) { out.push(500); left -= 500; } }
    while (left >= 100) { out.push(100); left -= 100; }
    return out;
  }

  /* ─────────── 손님 (펫 도감 종 재사용 — shared/pet-avatar.js) ─────────── */
  const CUSTOMERS = [
    { sp: 'puppy',   e: '🐶', name: '강아지', greet: '멍멍!' },
    { sp: 'kitty',   e: '🐱', name: '고양이', greet: '야옹!' },
    { sp: 'chick',   e: '🐥', name: '병아리', greet: '삐약삐약!' },
    { sp: 'rabbit',  e: '🐰', name: '토끼',   greet: '깡총깡총!' },
    { sp: 'bear',    e: '🐻', name: '곰',     greet: '안녕!' },
    { sp: 'panda',   e: '🐼', name: '판다',   greet: '반가워요!' },
    { sp: 'fox',     e: '🦊', name: '여우',   greet: '안녕하세요!' },
    { sp: 'frog',    e: '🐸', name: '개구리', greet: '개굴개굴!' },
    { sp: 'pig',     e: '🐷', name: '돼지',   greet: '꿀꿀!' },
    { sp: 'lion',    e: '🦁', name: '사자',   greet: '어흥!' },
    { sp: 'hamster', e: '🐹', name: '햄스터', greet: '안녕~!' },
    { sp: 'koala',   e: '🐨', name: '코알라', greet: '안녕하세요~!' },
  ];

  /* ─────────── 주문 문장 ─────────── */
  // 카테고리 → 문장 묶음 키: 먹을 것(eat)·장난감(toy)·문구(stat)·꽃(flower)
  function lineKey(cat) {
    if (cat === 'toy' || cat === 'stat' || cat === 'flower') return cat;
    return 'eat'; // fruit·veg·snack·bread
  }
  const ORDER_LINES = {
    eat: [ // 과일·채소·간식·빵
      '{n} 주세요~',
      '맛있는 {n} 있어요?',
      '{n} 하나 주세요!',
      '{n}[을,를] 사러 왔어요~',
      '{n}[이,가] 먹고 싶어요~',
      '오늘 간식은 {n}[이,가] 좋겠어요!',
      '싱싱한 {n} 있으면 주세요~',
    ],
    toy: [ // 장난감
      '{n} 주세요~',
      '멋진 {n} 있어요?',
      '{n} 하나 주세요!',
      '{n}[을,를] 사러 왔어요~',
      '{n}[이,가] 갖고 싶어요~',
      '친구랑 놀 {n} 주세요!',
    ],
    stat: [ // 문구
      '{n} 주세요~',
      '{n} 하나 주세요!',
      '{n}[을,를] 사러 왔어요~',
      '{n}[이,가] 필요해요~',
      '새 {n}[이,가] 있으면 주세요!',
    ],
    flower: [ // 꽃
      '{n} 주세요~',
      '예쁜 {n} 있어요?',
      '{n} 하나 주세요!',
      '{n}[을,를] 사러 왔어요~',
      '{n}[을,를] 선물하고 싶어요~',
    ],
  };
  const PAIR_LINES = [ // 두 개 주문 (3단계)
    '{a}하고 {b} 주세요~',
    '{a}[이랑,랑] {b}[을,를] 주세요!',
    '{a}도 사고 {b}도 사고 싶어요~',
    '음… {a}하고 {b}[을,를] 주세요!',
  ];

  function pickLine(pool) { return pool[Math.floor(Math.random() * pool.length)]; }
  function orderText(p) {
    const line = pickLine(ORDER_LINES[lineKey(p.cat)]);
    return fillJosa(line.split('{n}').join(p.name));
  }
  function pairText(a, b) {
    const line = pickLine(PAIR_LINES);
    return fillJosa(line.split('{a}').join(a.name).split('{b}').join(b.name));
  }
  // 가격 안내: '사과는 삼백 원이에요!' / '모두 합해서 팔백 원이에요!'
  function priceSay(order, price) {
    const what = order.length >= 2 ? '모두 합해서' : order[0].name + josa(order[0].name, '은', '는');
    return what + ' ' + wonName(price) + ' 원이에요!';
  }

  /* ─────────── 리액션 (계산이 끝나면 산 물건을 보고 기뻐한다) ─────────── */
  const REACTIONS = {
    eat: ['우와, 맛있겠다!', '냠냠, 잘 먹을게요!', '정말 맛있어 보여요!'],
    toy: ['우와, 신난다!', '이거 정말 갖고 싶었어요!', '재미있게 갖고 놀게요!'],
    stat: ['우와, 멋지다!', '이걸로 열심히 그려야지!', '소중하게 쓸게요!'],
    flower: ['우와, 예쁘다!', '향기가 정말 좋아요!', '엄마가 좋아하시겠다!'],
  };
  function reactionFor(p) { return pickLine(REACTIONS[lineKey(p.cat)]); }

  return {
    PRODUCTS, LEVELS, CUSTOMERS, THEMES,
    ORDER_LINES, PAIR_LINES, REACTIONS,
    THANKS: ['고맙습니다!', '와, 고마워요!', '감사합니다! 또 올게요~', '최고예요! 고마워요!',
      '야호, 신난다! 고마워요!', '고마워요~ 또 올게요!', '히히, 기분 좋다! 고맙습니다!'],
    praises: ['가게 주인님 최고!', '멋진 가게 주인님이에요!', '손님들이 모두 기뻐해요!', '동전 박사님이네요!'],
    ROUND: 5,   // 한 판 손님 수
    SHELF: 6,   // 선반에 놓이는 상품 수
    wonName, josa, fillJosa, coinsFor, levelPool, themePool, lineKey, reactionFor,
    orderText, pairText, priceSay,
  };
})();
