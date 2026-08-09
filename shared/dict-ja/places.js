/* 일본어 낱말 — 장소·나라
 * 계약과 read(한글 발음) 표기 규칙은 animals.js 머리 주석 참고.
 */
window.WORDS_JA = window.WORDS_JA || []; window.CATS_JA = window.CATS_JA || [];

CATS_JA.push({ id: 'places', name: '🏫 장소·나라', emoji: '🏫' });

[
  { ko: '학교', ja: 'がっこう', kanji: '学校', read: '각코우', emoji: '🏫' },
  { ko: '유치원', ja: 'ようちえん', kanji: '幼稚園', read: '요우치엥', emoji: '🏫' },
  { ko: '병원', ja: 'びょういん', kanji: '病院', read: '뵤우잉', emoji: '🏥' },
  { ko: '약국', ja: 'やっきょく', kanji: '薬局', read: '약쿄쿠', emoji: '💊' },
  { ko: '공원', ja: 'こうえん', kanji: '公園', read: '코우엥', emoji: '🏞️' },
  { ko: '놀이공원', ja: 'ゆうえんち', kanji: '遊園地', read: '유우엔치', emoji: '🎡' },
  { ko: '동물원', ja: 'どうぶつえん', kanji: '動物園', read: '도우부츠엥', emoji: '🦁' },
  { ko: '수족관', ja: 'すいぞくかん', kanji: '水族館', read: '스이조쿠캉', emoji: '🐠' },
  { ko: '도서관', ja: 'としょかん', kanji: '図書館', read: '토쇼캉', emoji: '📚' },
  { ko: '서점', ja: 'ほんや', kanji: '本屋', read: '홍야', emoji: '📚' },
  { ko: '빵집', ja: 'パンや', kanji: 'パン屋', read: '팡야', emoji: '🥐' },
  { ko: '시장', ja: 'いちば', kanji: '市場', read: '이치바', emoji: '🛒' },
  { ko: '가게', ja: 'みせ', kanji: '店', read: '미세', emoji: '🏪' },
  { ko: '식당', ja: 'レストラン', read: '레스토랑', emoji: '🍽️' },
  { ko: '영화관', ja: 'えいがかん', kanji: '映画館', read: '에이가캉', emoji: '🎬' },
  { ko: '수영장', ja: 'プール', read: '푸우루', emoji: '🏊' },
  { ko: '우체국', ja: 'ゆうびんきょく', kanji: '郵便局', read: '유우빙쿄쿠', emoji: '📮' },
  { ko: '은행', ja: 'ぎんこう', kanji: '銀行', read: '깅코우', emoji: '🏦' },
  { ko: '경찰서', ja: 'こうばん', kanji: '交番', read: '코우방', emoji: '🚓' },
  { ko: '교회', ja: 'きょうかい', kanji: '教会', read: '쿄우카이', emoji: '⛪' },
  { ko: '기차역', alt: ['역'], ja: 'えき', kanji: '駅', read: '에키', emoji: '🚉' },
  { ko: '공항', ja: 'くうこう', kanji: '空港', read: '쿠우코우', emoji: '✈️' },
  { ko: '농장', ja: 'ぼくじょう', kanji: '牧場', read: '보쿠조우', emoji: '🚜' },
  { ko: '바닷가', ja: 'うみべ', kanji: '海辺', read: '우미베', emoji: '🏖️' },
  { ko: '도로', alt: ['길'], ja: 'みち', kanji: '道', read: '미치', emoji: '🛣️' },
  { ko: '마을', ja: 'むら', kanji: '村', read: '무라', emoji: '🏘️' },
  { ko: '도시', ja: 'まち', kanji: '町', read: '마치', emoji: '🏙️' },
  { ko: '나라', ja: 'くに', kanji: '国', read: '쿠니', emoji: '🌏' },
  { ko: '세계', ja: 'せかい', kanji: '世界', read: '세카이', emoji: '🌍' },
  { ko: '한국', ja: 'かんこく', kanji: '韓国', read: '캉코쿠', emoji: '🥋' },
  { ko: '일본', ja: 'にほん', kanji: '日本', read: '니홍', emoji: '🗻' },
  { ko: '중국', ja: 'ちゅうごく', kanji: '中国', read: '츄우고쿠', emoji: '🐉' },
  { ko: '미국', ja: 'アメリカ', read: '아메리카', emoji: '🗽' }
].forEach(w => { w.cat = 'places'; WORDS_JA.push(w); });
