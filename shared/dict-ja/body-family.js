/* 일본어 낱말 — 몸·가족
 * 계약과 read(한글 발음) 표기 규칙은 animals.js 머리 주석 참고.
 * 주의: おばさん(이모) / おばあさん(할머니) 처럼 장음 하나로 뜻이 달라진다.
 *       read 를 줄여 적으면 아이가 다른 말을 배운다.
 */
window.WORDS_JA = window.WORDS_JA || []; window.CATS_JA = window.CATS_JA || [];

CATS_JA.push({ id: 'body', name: '🙂 몸·가족', emoji: '🙂' });

[
  /* --- 몸 --- */
  { ko: '머리', ja: 'あたま', kanji: '頭', read: '아타마', emoji: '🧑' },
  { ko: '얼굴', ja: 'かお', kanji: '顔', read: '카오', emoji: '😀' },
  { ko: '눈동자', ja: 'め', kanji: '目', read: '메', emoji: '👁️' },
  { ko: '코', ja: 'はな', kanji: '鼻', read: '하나', emoji: '👃' },
  { ko: '입', ja: 'くち', kanji: '口', read: '쿠치', emoji: '👄' },
  { ko: '귀', ja: 'みみ', kanji: '耳', read: '미미', emoji: '👂' },
  { ko: '이빨', ja: 'は', kanji: '歯', read: '하', emoji: '🦷' },
  { ko: '혓바닥', alt: ['혀'], ja: 'した', kanji: '舌', read: '시타', emoji: '👅' },
  { ko: '머리카락', ja: 'かみのけ', kanji: '髪の毛', read: '카미노케', emoji: '💇' },
  { ko: '눈썹', ja: 'まゆげ', kanji: '眉毛', read: '마유게', emoji: '👁️' },
  { ko: '목', ja: 'くび', kanji: '首', read: '쿠비', emoji: '🧣' },
  { ko: '어깨', ja: 'かた', kanji: '肩', read: '카타', emoji: '💪' },
  { ko: '팔', ja: 'うで', kanji: '腕', read: '우데', emoji: '💪' },
  { ko: '손', ja: 'て', kanji: '手', read: '테', emoji: '✋' },
  { ko: '손가락', ja: 'ゆび', kanji: '指', read: '유비', emoji: '👆' },
  { ko: '손톱', ja: 'つめ', kanji: '爪', read: '츠메', emoji: '💅' },
  { ko: '무릎', ja: 'ひざ', kanji: '膝', read: '히자', emoji: '🦵' },
  { ko: '발', ja: 'あし', kanji: '足', read: '아시', emoji: '🦶' },
  { ko: '엉덩이', ja: 'おしり', kanji: 'お尻', read: '오시리', emoji: '🍑' },
  { ko: '눈물', ja: 'なみだ', kanji: '涙', read: '나미다', emoji: '😢' },
  { ko: '목소리', ja: 'こえ', kanji: '声', read: '코에', emoji: '🗣️' },
  /* --- 가족 --- */
  { ko: '엄마', alt: ['어머니'], ja: 'おかあさん', kanji: 'お母さん', read: '오카아상', emoji: '👩' },
  { ko: '아빠', alt: ['아버지'], ja: 'おとうさん', kanji: 'お父さん', read: '오토우상', emoji: '👨' },
  { ko: '할머니', ja: 'おばあさん', kanji: 'お婆さん', read: '오바아상', emoji: '👵' },
  { ko: '할아버지', ja: 'おじいさん', kanji: 'お爺さん', read: '오지이상', emoji: '👴' },
  { ko: '아기', ja: 'あかちゃん', kanji: '赤ちゃん', read: '아카챵', emoji: '👶' },
  { ko: '오빠', alt: ['형'], ja: 'おにいさん', kanji: 'お兄さん', read: '오니이상', emoji: '👦' },
  { ko: '언니', alt: ['누나'], ja: 'おねえさん', kanji: 'お姉さん', read: '오네에상', emoji: '👧' },
  { ko: '이모', alt: ['고모'], ja: 'おばさん', read: '오바상', emoji: '👩' },
  { ko: '삼촌', ja: 'おじさん', read: '오지상', emoji: '👨' },
  { ko: '가족', ja: 'かぞく', kanji: '家族', read: '카조쿠', emoji: '👨‍👩‍👧' },
  { ko: '친구', ja: 'ともだち', kanji: '友達', read: '토모다치', emoji: '🧑‍🤝‍🧑' },
  { ko: '사람', ja: 'ひと', kanji: '人', read: '히토', emoji: '🧑' },
  { ko: '어린이', alt: ['아이'], ja: 'こども', kanji: '子供', read: '코도모', emoji: '🧒' },
  { ko: '남자아이', ja: 'おとこのこ', kanji: '男の子', read: '오토코노코', emoji: '👦' },
  { ko: '여자아이', ja: 'おんなのこ', kanji: '女の子', read: '온나노코', emoji: '👧' },
  /* --- 사람들 --- */
  { ko: '선생님', ja: 'せんせい', kanji: '先生', read: '센세이', emoji: '🧑‍🏫' },
  { ko: '의사', ja: 'おいしゃさん', kanji: 'お医者さん', read: '오이샤상', emoji: '🧑‍⚕️' },
  { ko: '경찰관', ja: 'おまわりさん', read: '오마와리상', emoji: '👮' },
  { ko: '소방관', ja: 'しょうぼうし', kanji: '消防士', read: '쇼우보우시', emoji: '🧑‍🚒' },
  { ko: '요리사', ja: 'コック', read: '콕쿠', emoji: '🧑‍🍳' },
  { ko: '농부', ja: 'のうか', kanji: '農家', read: '노우카', emoji: '🧑‍🌾' },
  { ko: '가수', ja: 'かしゅ', kanji: '歌手', read: '카슈', emoji: '🎤' },
  { ko: '왕', ja: 'おうさま', kanji: '王様', read: '오우사마', emoji: '🤴' },
  { ko: '공주', ja: 'おひめさま', kanji: 'お姫様', read: '오히메사마', emoji: '👸' },
  { ko: '마법사', ja: 'まほうつかい', kanji: '魔法使い', read: '마호우츠카이', emoji: '🧙' },
  { ko: '요정', ja: 'ようせい', kanji: '妖精', read: '요우세이', emoji: '🧚' },
  { ko: '산타', ja: 'サンタさん', read: '산타상', emoji: '🎅' },
  { ko: '유령', alt: ['귀신'], ja: 'おばけ', kanji: 'お化け', read: '오바케', emoji: '👻' }
].forEach(w => { w.cat = 'body'; WORDS_JA.push(w); });
