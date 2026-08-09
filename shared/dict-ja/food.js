/* 일본어 낱말 — 음식
 * 계약과 read(한글 발음) 표기 규칙은 animals.js 머리 주석 참고.
 */
/* 규칙을 어긴 예외 두 개 — 우리말의 다른 뜻과 겹쳐서 일부러 다르게 적었다.
 *   メロン : 규칙대로면 '메롱' 인데 우리말에서 놀리는 말이다. '메론' 은 이미 우리가 쓰는 말이기도 하다.
 *   よん   : 규칙대로면 '용' 인데 우리말에서 龍이다. 숫자를 배우는 자리라 헷갈리면 안 된다.
 * 낱말 끝 ん 을 ㅇ 으로 적는 규칙 자체는 맞다(우동·오뎅·짬뽕이 그렇게 들린다). 이 둘만 예외다. */
window.WORDS_JA = window.WORDS_JA || []; window.CATS_JA = window.CATS_JA || [];

CATS_JA.push({ id: 'food', name: '🍎 음식', emoji: '🍎' });

[
  /* --- 과일 --- */
  { ko: '사과', ja: 'りんご', read: '링고', emoji: '🍎' },
  { ko: '바나나', ja: 'バナナ', read: '바나나', emoji: '🍌' },
  { ko: '포도', ja: 'ぶどう', kanji: '葡萄', read: '부도우', emoji: '🍇' },
  { ko: '딸기', ja: 'いちご', kanji: '苺', read: '이치고', emoji: '🍓' },
  { ko: '수박', ja: 'すいか', kanji: '西瓜', read: '스이카', emoji: '🍉' },
  { ko: '오렌지', ja: 'オレンジ', read: '오렌지', emoji: '🍊' },
  { ko: '레몬', ja: 'レモン', read: '레몽', emoji: '🍋' },
  { ko: '복숭아', ja: 'もも', kanji: '桃', read: '모모', emoji: '🍑' },
  { ko: '체리', ja: 'さくらんぼ', read: '사쿠람보', emoji: '🍒' },
  { ko: '키위', ja: 'キウイ', read: '키우이', emoji: '🥝' },
  { ko: '파인애플', ja: 'パイナップル', read: '파이납푸루', emoji: '🍍' },
  { ko: '멜론', ja: 'メロン', read: '메론', emoji: '🍈' },
  { ko: '감귤', alt: ['귤'], ja: 'みかん', kanji: '蜜柑', read: '미캉', emoji: '🍊' },
  /* --- 채소 --- */
  { ko: '토마토', ja: 'トマト', read: '토마토', emoji: '🍅' },
  { ko: '당근', ja: 'にんじん', kanji: '人参', read: '닌징', emoji: '🥕' },
  { ko: '감자', ja: 'じゃがいも', read: '자가이모', emoji: '🥔' },
  { ko: '고구마', ja: 'さつまいも', read: '사츠마이모', emoji: '🍠' },
  { ko: '오이', ja: 'きゅうり', read: '큐우리', emoji: '🥒' },
  { ko: '옥수수', ja: 'とうもろこし', read: '토우모로코시', emoji: '🌽' },
  { ko: '양파', ja: 'たまねぎ', kanji: '玉葱', read: '타마네기', emoji: '🧅' },
  { ko: '버섯', ja: 'きのこ', read: '키노코', emoji: '🍄' },
  { ko: '호박', ja: 'かぼちゃ', kanji: '南瓜', read: '카보챠', emoji: '🎃' },
  { ko: '가지', ja: 'なす', kanji: '茄子', read: '나스', emoji: '🍆' },
  { ko: '마늘', ja: 'にんにく', read: '닌니쿠', emoji: '🧄' },
  { ko: '콩알', alt: ['콩'], ja: 'まめ', kanji: '豆', read: '마메', emoji: '🫘' },
  /* --- 밥과 반찬 --- */
  { ko: '빵', ja: 'パン', read: '팡', emoji: '🍞' },
  { ko: '밥', ja: 'ごはん', kanji: '御飯', read: '고항', emoji: '🍚' },
  { ko: '피자', ja: 'ピザ', read: '피자', emoji: '🍕' },
  { ko: '햄버거', ja: 'ハンバーガー', read: '함바아가아', emoji: '🍔' },
  { ko: '치킨', alt: ['닭튀김'], ja: 'からあげ', kanji: '唐揚げ', read: '카라아게', emoji: '🍗' },
  { ko: '핫도그', ja: 'ホットドッグ', read: '홋토독구', emoji: '🌭' },
  { ko: '샌드위치', ja: 'サンドイッチ', read: '산도잇치', emoji: '🥪' },
  { ko: '스파게티', ja: 'スパゲッティ', read: '스파겟티', emoji: '🍝' },
  { ko: '라면', ja: 'ラーメン', read: '라아멩', emoji: '🍜' },
  { ko: '만두', ja: 'ぎょうざ', kanji: '餃子', read: '교우자', emoji: '🥟' },
  { ko: '계란', ja: 'たまご', kanji: '卵', read: '타마고', emoji: '🥚' },
  { ko: '계란프라이', ja: 'めだまやき', kanji: '目玉焼き', read: '메다마야키', emoji: '🍳' },
  { ko: '치즈', ja: 'チーズ', read: '치이즈', emoji: '🧀' },
  { ko: '소시지', ja: 'ソーセージ', read: '소오세에지', emoji: '🌭' },
  { ko: '김치', ja: 'キムチ', read: '키무치', emoji: '🥬' },
  { ko: '카레', ja: 'カレー', read: '카레에', emoji: '🍛' },
  { ko: '초밥', ja: 'すし', kanji: '寿司', read: '스시', emoji: '🍣' },
  { ko: '고기', ja: 'にく', kanji: '肉', read: '니쿠', emoji: '🥩' },
  { ko: '주먹밥', ja: 'おにぎり', read: '오니기리', emoji: '🍙' },
  { ko: '김밥', ja: 'のりまき', read: '노리마키', emoji: '🍙' },
  { ko: '감자튀김', ja: 'フライドポテト', read: '후라이도포테토', emoji: '🍟' },
  { ko: '수프', ja: 'スープ', read: '스우푸', emoji: '🍲' },
  { ko: '샐러드', ja: 'サラダ', read: '사라다', emoji: '🥗' },
  { ko: '채소', alt: ['야채'], ja: 'やさい', kanji: '野菜', read: '야사이', emoji: '🥬' },
  /* --- 간식 --- */
  { ko: '아이스크림', ja: 'アイスクリーム', read: '아이스쿠리이무', emoji: '🍦' },
  { ko: '사탕', ja: 'あめ', kanji: '飴', read: '아메', emoji: '🍬' },
  { ko: '초콜릿', ja: 'チョコレート', read: '쵸코레에토', emoji: '🍫' },
  { ko: '케이크', ja: 'ケーキ', read: '케에키', emoji: '🍰' },
  { ko: '쿠키', ja: 'クッキー', read: '쿡키이', emoji: '🍪' },
  { ko: '도넛', ja: 'ドーナツ', read: '도오나츠', emoji: '🍩' },
  { ko: '젤리', ja: 'ゼリー', read: '제리이', emoji: '🍬' },
  { ko: '팝콘', ja: 'ポップコーン', read: '폽푸코옹', emoji: '🍿' },
  { ko: '푸딩', ja: 'プリン', read: '푸링', emoji: '🍮' },
  { ko: '떡', ja: 'もち', kanji: '餅', read: '모치', emoji: '🍡' },
  { ko: '과자', ja: 'おかし', kanji: 'お菓子', read: '오카시', emoji: '🍪' },
  { ko: '꿀', ja: 'はちみつ', kanji: '蜂蜜', read: '하치미츠', emoji: '🍯' },
  /* --- 마실 것과 그릇 --- */
  { ko: '물', ja: 'みず', kanji: '水', read: '미즈', emoji: '💧' },
  { ko: '우유', ja: 'ぎゅうにゅう', kanji: '牛乳', read: '규우뉴우', emoji: '🥛' },
  { ko: '주스', ja: 'ジュース', read: '주우스', emoji: '🧃' },
  { ko: '녹차', alt: ['차'], ja: 'おちゃ', kanji: 'お茶', read: '오챠', emoji: '🍵' },
  { ko: '숟가락', ja: 'スプーン', read: '스푸웅', emoji: '🥄' },
  { ko: '포크', ja: 'フォーク', read: '포오쿠', emoji: '🍴' },
  { ko: '컵', ja: 'コップ', read: '콥푸', emoji: '🥤' },
  { ko: '접시', ja: 'おさら', kanji: 'お皿', read: '오사라', emoji: '🍽️' },
  { ko: '젓가락', ja: 'はし', kanji: '箸', read: '하시', emoji: '🥢' },
  { ko: '소금', ja: 'しお', kanji: '塩', read: '시오', emoji: '🧂' },
  { ko: '설탕', ja: 'さとう', kanji: '砂糖', read: '사토우', emoji: '🍬' }
].forEach(w => { w.cat = 'food'; WORDS_JA.push(w); });
