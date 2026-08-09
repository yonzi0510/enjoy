/* 일본어 낱말 — 반대말·자리
 * 계약과 read(한글 발음) 표기 규칙은 animals.js 머리 주석 참고.
 * 형용사는 사전형(おおきい) 그대로 넣는다 — 아이가 듣고 따라 하기 좋다.
 */
window.WORDS_JA = window.WORDS_JA || []; window.CATS_JA = window.CATS_JA || [];

CATS_JA.push({ id: 'opposites', name: '↔️ 반대말', emoji: '↔️' });

[
  { ko: '크다', ja: 'おおきい', kanji: '大きい', read: '오오키이', emoji: '🐘' },
  { ko: '작다', ja: 'ちいさい', kanji: '小さい', read: '치이사이', emoji: '🐜' },
  { ko: '길다', ja: 'ながい', kanji: '長い', read: '나가이', emoji: '📏' },
  { ko: '짧다', ja: 'みじかい', kanji: '短い', read: '미지카이', emoji: '📏' },
  { ko: '높다', ja: 'たかい', kanji: '高い', read: '타카이', emoji: '⬆️' },
  { ko: '낮다', ja: 'ひくい', kanji: '低い', read: '히쿠이', emoji: '⬇️' },
  { ko: '빠르다', ja: 'はやい', kanji: '速い', read: '하야이', emoji: '🏃' },
  { ko: '느리다', ja: 'おそい', kanji: '遅い', read: '오소이', emoji: '🐢' },
  { ko: '뜨겁다', ja: 'あつい', kanji: '熱い', read: '아츠이', emoji: '🔥' },
  { ko: '차갑다', ja: 'つめたい', kanji: '冷たい', read: '츠메타이', emoji: '🧊' },
  { ko: '무겁다', ja: 'おもい', kanji: '重い', read: '오모이', emoji: '🪨' },
  { ko: '가볍다', ja: 'かるい', kanji: '軽い', read: '카루이', emoji: '🎈' },
  { ko: '많다', ja: 'おおい', kanji: '多い', read: '오오이', emoji: '➕' },
  { ko: '적다', ja: 'すくない', kanji: '少ない', read: '스쿠나이', emoji: '➖' },
  { ko: '밝다', ja: 'あかるい', kanji: '明るい', read: '아카루이', emoji: '💡' },
  { ko: '어둡다', ja: 'くらい', kanji: '暗い', read: '쿠라이', emoji: '🌑' },
  { ko: '새것', ja: 'あたらしい', kanji: '新しい', read: '아타라시이', emoji: '✨' },
  { ko: '헌것', ja: 'ふるい', kanji: '古い', read: '후루이', emoji: '📦' },
  { ko: '깨끗하다', ja: 'きれい', read: '키레이', emoji: '🫧' },
  { ko: '더럽다', ja: 'きたない', kanji: '汚い', read: '키타나이', emoji: '🧦' },
  { ko: '시끄럽다', ja: 'うるさい', read: '우루사이', emoji: '📢' },
  { ko: '위쪽', alt: ['위'], ja: 'うえ', kanji: '上', read: '우에', emoji: '⬆️' },
  { ko: '아래', alt: ['밑'], ja: 'した', kanji: '下', read: '시타', emoji: '⬇️' },
  { ko: '앞쪽', alt: ['앞'], ja: 'まえ', kanji: '前', read: '마에', emoji: '▶️' },
  { ko: '뒤쪽', alt: ['뒤'], ja: 'うしろ', kanji: '後ろ', read: '우시로', emoji: '◀️' },
  { ko: '오른쪽', ja: 'みぎ', kanji: '右', read: '미기', emoji: '➡️' },
  { ko: '왼쪽', ja: 'ひだり', kanji: '左', read: '히다리', emoji: '⬅️' },
  { ko: '안쪽', alt: ['안'], ja: 'なか', kanji: '中', read: '나카', emoji: '📥' },
  { ko: '바깥', alt: ['밖'], ja: 'そと', kanji: '外', read: '소토', emoji: '📤' }
].forEach(w => { w.cat = 'opposites'; WORDS_JA.push(w); });
