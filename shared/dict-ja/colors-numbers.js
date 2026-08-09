/* 일본어 낱말 — 색깔·숫자·모양
 * 계약과 read(한글 발음) 표기 규칙은 animals.js 머리 주석 참고.
 * 숫자는 하나부터 열까지 세는 소리(いち·に·さん…)로 넣었다.
 * 넷은 し 와 よん 둘 다 쓰지만 다섯 살에게는 よん 하나만 가르친다(し는 헷갈린다).
 */
/* 규칙을 어긴 예외 두 개 — 우리말의 다른 뜻과 겹쳐서 일부러 다르게 적었다.
 *   メロン : 규칙대로면 '메롱' 인데 우리말에서 놀리는 말이다. '메론' 은 이미 우리가 쓰는 말이기도 하다.
 *   よん   : 규칙대로면 '용' 인데 우리말에서 龍이다. 숫자를 배우는 자리라 헷갈리면 안 된다.
 * 낱말 끝 ん 을 ㅇ 으로 적는 규칙 자체는 맞다(우동·오뎅·짬뽕이 그렇게 들린다). 이 둘만 예외다. */
window.WORDS_JA = window.WORDS_JA || []; window.CATS_JA = window.CATS_JA || [];

CATS_JA.push({ id: 'colors', name: '🎨 색깔·숫자', emoji: '🎨' });

[
  /* --- 색깔 --- */
  { ko: '빨간색', alt: ['빨강'], ja: 'あか', kanji: '赤', read: '아카', emoji: '🔴' },
  { ko: '노란색', alt: ['노랑'], ja: 'きいろ', kanji: '黄色', read: '키이로', emoji: '🟡' },
  { ko: '초록색', alt: ['초록'], ja: 'みどり', kanji: '緑', read: '미도리', emoji: '🟢' },
  { ko: '파란색', alt: ['파랑'], ja: 'あお', kanji: '青', read: '아오', emoji: '🔵' },
  { ko: '보라색', alt: ['보라'], ja: 'むらさき', kanji: '紫', read: '무라사키', emoji: '🟣' },
  { ko: '분홍색', alt: ['분홍'], ja: 'ピンク', read: '핑쿠', emoji: '💗' },
  { ko: '검은색', alt: ['검정'], ja: 'くろ', kanji: '黒', read: '쿠로', emoji: '⚫' },
  { ko: '흰색', alt: ['하양'], ja: 'しろ', kanji: '白', read: '시로', emoji: '⚪' },
  { ko: '갈색', ja: 'ちゃいろ', kanji: '茶色', read: '챠이로', emoji: '🟤' },
  { ko: '회색', ja: 'はいいろ', kanji: '灰色', read: '하이이로', emoji: '⬜' },
  { ko: '하늘색', ja: 'みずいろ', kanji: '水色', read: '미즈이로', emoji: '💧' },
  { ko: '금색', ja: 'きんいろ', kanji: '金色', read: '킹이로', emoji: '🟨' },
  { ko: '은색', ja: 'ぎんいろ', kanji: '銀色', read: '깅이로', emoji: '⬜' },
  { ko: '색깔', ja: 'いろ', kanji: '色', read: '이로', emoji: '🎨' },
  /* --- 숫자 --- */
  { ko: '하나', alt: ['한개'], ja: 'いち', kanji: '一', read: '이치', emoji: '🕐' },
  { ko: '둘', alt: ['두개'], ja: 'に', kanji: '二', read: '니', emoji: '🕑' },
  { ko: '셋', alt: ['세개'], ja: 'さん', kanji: '三', read: '상', emoji: '🕒' },
  { ko: '넷', alt: ['네개'], ja: 'よん', kanji: '四', read: '욘', emoji: '🕓' },
  { ko: '다섯', alt: ['다섯개'], ja: 'ご', kanji: '五', read: '고', emoji: '🕔' },
  { ko: '여섯', alt: ['여섯개'], ja: 'ろく', kanji: '六', read: '로쿠', emoji: '🕕' },
  { ko: '일곱', alt: ['일곱개'], ja: 'なな', kanji: '七', read: '나나', emoji: '🕖' },
  { ko: '여덟', alt: ['여덟개'], ja: 'はち', kanji: '八', read: '하치', emoji: '🕗' },
  { ko: '아홉', alt: ['아홉개'], ja: 'きゅう', kanji: '九', read: '큐우', emoji: '🕘' },
  { ko: '열', ja: 'じゅう', kanji: '十', read: '주우', emoji: '🔟' },
  { ko: '백', ja: 'ひゃく', kanji: '百', read: '햐쿠', emoji: '💯' },
  { ko: '숫자', ja: 'すうじ', kanji: '数字', read: '스우지', emoji: '🔢' },
  /* --- 모양 --- */
  { ko: '동그라미', ja: 'まる', kanji: '丸', read: '마루', emoji: '⭕' },
  { ko: '세모', ja: 'さんかく', kanji: '三角', read: '상카쿠', emoji: '🔺' },
  { ko: '네모', ja: 'しかく', kanji: '四角', read: '시카쿠', emoji: '🟥' },
  { ko: '하트', ja: 'ハート', read: '하아토', emoji: '❤️' },
  { ko: '모양', ja: 'かたち', kanji: '形', read: '카타치', emoji: '🔷' }
].forEach(w => { w.cat = 'colors'; WORDS_JA.push(w); });
