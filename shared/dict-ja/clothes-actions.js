/* 일본어 낱말 — 옷·동작·기분
 * 계약과 read(한글 발음) 표기 규칙은 animals.js 머리 주석 참고.
 * 동작은 사전형(はしる·たべる)으로, 기분은 형용사 그대로(うれしい·こわい) 적는다 —
 * 다섯 살이 듣고 따라 하기에 가장 짧은 꼴이다.
 */
window.WORDS_JA = window.WORDS_JA || []; window.CATS_JA = window.CATS_JA || [];

CATS_JA.push({ id: 'clothes', name: '👕 옷·동작·기분', emoji: '👕' });

[
  /* --- 옷 --- */
  { ko: '티셔츠', alt: ['셔츠'], ja: 'シャツ', read: '샤츠', emoji: '👕' },
  { ko: '바지', ja: 'ズボン', read: '즈봉', emoji: '👖' },
  { ko: '반바지', ja: 'はんズボン', kanji: '半ズボン', read: '한즈봉', emoji: '🩳' },
  { ko: '치마', ja: 'スカート', read: '스카아토', emoji: '👗' },
  { ko: '원피스', ja: 'ワンピース', read: '왐피이스', emoji: '👗' },
  { ko: '잠옷', ja: 'パジャマ', read: '파자마', emoji: '🛌' },
  { ko: '수영복', ja: 'みずぎ', kanji: '水着', read: '미즈기', emoji: '🩱' },
  { ko: '우비', ja: 'レインコート', read: '레잉코오토', emoji: '🧥' },
  { ko: '양말', ja: 'くつした', kanji: '靴下', read: '쿠츠시타', emoji: '🧦' },
  { ko: '신발', alt: ['구두'], ja: 'くつ', kanji: '靴', read: '쿠츠', emoji: '👟' },
  { ko: '모자', ja: 'ぼうし', kanji: '帽子', read: '보우시', emoji: '🧢' },
  { ko: '장갑', ja: 'てぶくろ', kanji: '手袋', read: '테부쿠로', emoji: '🧤' },
  { ko: '목도리', ja: 'マフラー', read: '마후라아', emoji: '🧣' },
  { ko: '안경', ja: 'めがね', kanji: '眼鏡', read: '메가네', emoji: '👓' },
  { ko: '마스크', ja: 'マスク', read: '마스쿠', emoji: '😷' },
  { ko: '반지', ja: 'ゆびわ', kanji: '指輪', read: '유비와', emoji: '💍' },
  { ko: '왕관', ja: 'おうかん', kanji: '王冠', read: '오우캉', emoji: '👑' },
  { ko: '지갑', ja: 'さいふ', kanji: '財布', read: '사이후', emoji: '👛' },
  { ko: '손목시계', ja: 'うでどけい', kanji: '腕時計', read: '우데도케이', emoji: '⌚' },
  /* --- 동작 --- */
  { ko: '달리기', ja: 'はしる', kanji: '走る', read: '하시루', emoji: '🏃' },
  { ko: '걷기', ja: 'あるく', kanji: '歩く', read: '아루쿠', emoji: '🚶' },
  { ko: '점프', ja: 'ジャンプ', read: '잠푸', emoji: '🤸' },
  { ko: '먹기', ja: 'たべる', kanji: '食べる', read: '타베루', emoji: '🍽️' },
  { ko: '마시기', ja: 'のむ', kanji: '飲む', read: '노무', emoji: '🥤' },
  { ko: '잠자기', ja: 'ねる', kanji: '寝る', read: '네루', emoji: '😴' },
  { ko: '울기', ja: 'なく', kanji: '泣く', read: '나쿠', emoji: '😢' },
  { ko: '웃음', alt: ['웃기'], ja: 'わらう', kanji: '笑う', read: '와라우', emoji: '😄' },
  { ko: '춤추기', ja: 'おどる', kanji: '踊る', read: '오도루', emoji: '💃' },
  { ko: '노래하기', ja: 'うたう', kanji: '歌う', read: '우타우', emoji: '🎤' },
  { ko: '읽기', ja: 'よむ', kanji: '読む', read: '요무', emoji: '📖' },
  { ko: '쓰기', ja: 'かく', kanji: '書く', read: '카쿠', emoji: '✍️' },
  { ko: '그리기', ja: 'おえかき', kanji: 'お絵かき', read: '오에카키', emoji: '🎨' },
  { ko: '앉기', ja: 'すわる', kanji: '座る', read: '스와루', emoji: '🪑' },
  { ko: '놀기', ja: 'あそぶ', kanji: '遊ぶ', read: '아소부', emoji: '🧸' },
  { ko: '수영', ja: 'およぐ', kanji: '泳ぐ', read: '오요구', emoji: '🏊' },
  { ko: '보기', ja: 'みる', kanji: '見る', read: '미루', emoji: '👀' },
  { ko: '듣기', ja: 'きく', kanji: '聞く', read: '키쿠', emoji: '👂' },
  { ko: '말하기', ja: 'はなす', kanji: '話す', read: '하나스', emoji: '🗣️' },
  { ko: '양치질', ja: 'はみがき', kanji: '歯磨き', read: '하미가키', emoji: '🪥' },
  { ko: '청소', ja: 'そうじ', kanji: '掃除', read: '소우지', emoji: '🧹' },
  { ko: '공부', ja: 'べんきょう', kanji: '勉強', read: '벵쿄우', emoji: '📚' },
  /* --- 인사 --- */
  { ko: '안녕', ja: 'こんにちは', read: '콘니치와', emoji: '👋' },
  { ko: '고마워', alt: ['고맙습니다'], ja: 'ありがとう', read: '아리가토우', emoji: '🙏' },
  { ko: '미안해', alt: ['미안합니다'], ja: 'ごめんなさい', read: '고멘나사이', emoji: '🙇' },
  /* --- 기분 --- */
  { ko: '행복', alt: ['기뻐'], ja: 'うれしい', kanji: '嬉しい', read: '우레시이', emoji: '😊' },
  { ko: '슬픔', ja: 'かなしい', kanji: '悲しい', read: '카나시이', emoji: '😢' },
  { ko: '화남', ja: 'おこる', kanji: '怒る', read: '오코루', emoji: '😠' },
  { ko: '무서움', ja: 'こわい', kanji: '怖い', read: '코와이', emoji: '😨' },
  { ko: '재미', alt: ['즐거워'], ja: 'たのしい', kanji: '楽しい', read: '타노시이', emoji: '😄' },
  { ko: '아픔', ja: 'いたい', kanji: '痛い', read: '이타이', emoji: '🤕' },
  { ko: '졸림', ja: 'ねむい', kanji: '眠い', read: '네무이', emoji: '😪' },
  { ko: '배고픔', ja: 'おなかすいた', read: '오나카스이타', emoji: '🍽️' },
  { ko: '사랑', alt: ['좋아해'], ja: 'だいすき', kanji: '大好き', read: '다이스키', emoji: '❤️' }
].forEach(w => { w.cat = 'clothes'; WORDS_JA.push(w); });
