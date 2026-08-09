/* 일본어 낱말 — 자연
 * 계약과 read(한글 발음) 표기 규칙은 animals.js 머리 주석 참고.
 */
window.WORDS_JA = window.WORDS_JA || []; window.CATS_JA = window.CATS_JA || [];

CATS_JA.push({ id: 'nature', name: '🌈 자연', emoji: '🌈' });

[
  /* --- 하늘 --- */
  { ko: '해', alt: ['태양'], ja: 'たいよう', kanji: '太陽', read: '타이요우', emoji: '☀️' },
  { ko: '달', ja: 'つき', kanji: '月', read: '츠키', emoji: '🌙' },
  { ko: '별', alt: ['작은 별'], ja: 'ほし', kanji: '星', read: '호시', emoji: '⭐' },
  { ko: '별똥별', ja: 'ながれぼし', kanji: '流れ星', read: '나가레보시', emoji: '🌠' },
  { ko: '구름', ja: 'くも', kanji: '雲', read: '쿠모', emoji: '☁️' },
  { ko: '하늘', ja: 'そら', kanji: '空', read: '소라', emoji: '🌤️' },
  { ko: '무지개', ja: 'にじ', kanji: '虹', read: '니지', emoji: '🌈' },
  { ko: '지구', ja: 'ちきゅう', kanji: '地球', read: '치큐우', emoji: '🌍' },
  { ko: '우주', ja: 'うちゅう', kanji: '宇宙', read: '우츄우', emoji: '🌌' },
  { ko: '아침', ja: 'あさ', kanji: '朝', read: '아사', emoji: '🌅' },
  { ko: '저녁', ja: 'ゆうがた', kanji: '夕方', read: '유우가타', emoji: '🌇' },
  { ko: '밤', ja: 'よる', kanji: '夜', read: '요루', emoji: '🌃' },
  /* --- 날씨 --- */
  { ko: '비', ja: 'あめ', kanji: '雨', read: '아메', emoji: '🌧️' },
  { ko: '눈', ja: 'ゆき', kanji: '雪', read: '유키', emoji: '❄️' },
  { ko: '눈사람', ja: 'ゆきだるま', kanji: '雪だるま', read: '유키다루마', emoji: '⛄' },
  { ko: '바람', ja: 'かぜ', kanji: '風', read: '카제', emoji: '🌬️' },
  { ko: '번개', alt: ['천둥'], ja: 'かみなり', kanji: '雷', read: '카미나리', emoji: '⚡' },
  { ko: '태풍', ja: 'たいふう', kanji: '台風', read: '타이후우', emoji: '🌀' },
  { ko: '안개', ja: 'きり', kanji: '霧', read: '키리', emoji: '🌫️' },
  { ko: '얼음', ja: 'こおり', kanji: '氷', read: '코오리', emoji: '🧊' },
  /* --- 계절 --- */
  { ko: '봄', ja: 'はる', kanji: '春', read: '하루', emoji: '🌸' },
  { ko: '여름', ja: 'なつ', kanji: '夏', read: '나츠', emoji: '🌻' },
  { ko: '가을', ja: 'あき', kanji: '秋', read: '아키', emoji: '🍁' },
  { ko: '겨울', ja: 'ふゆ', kanji: '冬', read: '후유', emoji: '⛄' },
  /* --- 땅과 물 --- */
  { ko: '산', ja: 'やま', kanji: '山', read: '야마', emoji: '⛰️' },
  { ko: '바다', ja: 'うみ', kanji: '海', read: '우미', emoji: '🌊' },
  { ko: '파도', ja: 'なみ', kanji: '波', read: '나미', emoji: '🌊' },
  { ko: '강', ja: 'かわ', kanji: '川', read: '카와', emoji: '🏞️' },
  { ko: '호수', ja: 'みずうみ', kanji: '湖', read: '미즈우미', emoji: '🏞️' },
  { ko: '연못', ja: 'いけ', kanji: '池', read: '이케', emoji: '🏞️' },
  { ko: '폭포', ja: 'たき', kanji: '滝', read: '타키', emoji: '🏞️' },
  { ko: '섬', ja: 'しま', kanji: '島', read: '시마', emoji: '🏝️' },
  { ko: '돌', alt: ['바위'], ja: 'いし', kanji: '石', read: '이시', emoji: '🪨' },
  { ko: '모래', ja: 'すな', kanji: '砂', read: '스나', emoji: '🏖️' },
  { ko: '동굴', ja: 'どうくつ', kanji: '洞窟', read: '도우쿠츠', emoji: '🕳️' },
  { ko: '불', ja: 'ひ', kanji: '火', read: '히', emoji: '🔥' },
  { ko: '연기', ja: 'けむり', kanji: '煙', read: '케무리', emoji: '💨' },
  { ko: '그림자', ja: 'かげ', kanji: '影', read: '카게', emoji: '👤' },
  /* --- 풀과 나무 --- */
  { ko: '나무', ja: 'き', kanji: '木', read: '키', emoji: '🌳' },
  { ko: '숲', ja: 'もり', kanji: '森', read: '모리', emoji: '🌲' },
  { ko: '꽃', ja: 'はな', kanji: '花', read: '하나', emoji: '🌸' },
  { ko: '나뭇잎', alt: ['잎'], ja: 'はっぱ', kanji: '葉っぱ', read: '합파', emoji: '🍃' },
  { ko: '잔디', alt: ['풀밭'], ja: 'くさ', kanji: '草', read: '쿠사', emoji: '🌱' },
  { ko: '씨앗', ja: 'たね', kanji: '種', read: '타네', emoji: '🌱' },
  { ko: '해바라기', ja: 'ひまわり', kanji: '向日葵', read: '히마와리', emoji: '🌻' },
  { ko: '벚꽃', ja: 'さくら', kanji: '桜', read: '사쿠라', emoji: '🌸' },
  { ko: '튤립', ja: 'チューリップ', read: '츄우립푸', emoji: '🌷' },
  { ko: '대나무', ja: 'たけ', kanji: '竹', read: '타케', emoji: '🎋' },
  { ko: '소나무', ja: 'まつ', kanji: '松', read: '마츠', emoji: '🌲' },
  { ko: '도토리', ja: 'どんぐり', read: '동구리', emoji: '🌰' }
].forEach(w => { w.cat = 'nature'; WORDS_JA.push(w); });
