/* 일본어 낱말 — 탈것
 * 계약과 read(한글 발음) 표기 규칙은 animals.js 머리 주석 참고.
 */
window.WORDS_JA = window.WORDS_JA || []; window.CATS_JA = window.CATS_JA || [];

CATS_JA.push({ id: 'vehicles', name: '🚗 탈것', emoji: '🚗' });

[
  { ko: '자동차', ja: 'くるま', kanji: '車', read: '쿠루마', emoji: '🚗' },
  { ko: '버스', ja: 'バス', read: '바스', emoji: '🚌' },
  { ko: '택시', ja: 'タクシー', read: '타쿠시이', emoji: '🚕' },
  { ko: '자전거', ja: 'じてんしゃ', kanji: '自転車', read: '지텐샤', emoji: '🚲' },
  { ko: '세발자전거', ja: 'さんりんしゃ', kanji: '三輪車', read: '산린샤', emoji: '🚲' },
  { ko: '오토바이', ja: 'オートバイ', read: '오오토바이', emoji: '🏍️' },
  { ko: '기차', alt: ['전철'], ja: 'でんしゃ', kanji: '電車', read: '덴샤', emoji: '🚃' },
  { ko: '지하철', ja: 'ちかてつ', kanji: '地下鉄', read: '치카테츠', emoji: '🚇' },
  { ko: '비행기', ja: 'ひこうき', kanji: '飛行機', read: '히코우키', emoji: '✈️' },
  { ko: '헬리콥터', ja: 'ヘリコプター', read: '헤리코푸타아', emoji: '🚁' },
  { ko: '로켓', ja: 'ロケット', read: '로켓토', emoji: '🚀' },
  { ko: '우주선', ja: 'うちゅうせん', kanji: '宇宙船', read: '우츄우셍', emoji: '🛸' },
  { ko: '열기구', ja: 'ききゅう', kanji: '気球', read: '키큐우', emoji: '🎈' },
  { ko: '배', ja: 'ふね', kanji: '船', read: '후네', emoji: '⛵' },
  { ko: '보트', ja: 'ボート', read: '보오토', emoji: '🚤' },
  { ko: '요트', ja: 'ヨット', read: '욧토', emoji: '⛵' },
  { ko: '잠수함', ja: 'せんすいかん', kanji: '潜水艦', read: '센스이캉', emoji: '🚢' },
  { ko: '소방차', ja: 'しょうぼうしゃ', kanji: '消防車', read: '쇼우보우샤', emoji: '🚒' },
  { ko: '구급차', ja: 'きゅうきゅうしゃ', kanji: '救急車', read: '큐우큐우샤', emoji: '🚑' },
  { ko: '경찰차', ja: 'パトカー', read: '파토카아', emoji: '🚓' },
  { ko: '트럭', ja: 'トラック', read: '토락쿠', emoji: '🚚' },
  { ko: '유모차', ja: 'ベビーカー', read: '베비이카아', emoji: '🍼' },
  { ko: '썰매', ja: 'そり', kanji: '橇', read: '소리', emoji: '🛷' },
  { ko: '스키', ja: 'スキー', read: '스키이', emoji: '🎿' },
  { ko: '스케이트보드', ja: 'スケートボード', read: '스케에토보오도', emoji: '🛹' },
  { ko: '씽씽카', alt: ['킥보드'], ja: 'キックボード', read: '킥쿠보오도', emoji: '🛴' },
  { ko: '관람차', ja: 'かんらんしゃ', kanji: '観覧車', read: '칸란샤', emoji: '🎡' },
  { ko: '회전목마', ja: 'メリーゴーランド', read: '메리이고오란도', emoji: '🎠' },
  { ko: '드론', ja: 'ドローン', read: '도로옹', emoji: '🛸' }
].forEach(w => { w.cat = 'vehicles'; WORDS_JA.push(w); });
