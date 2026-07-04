/* 단어 사전: 탈것 — 계약
 *  CATS.push({ id, name, emoji })  ·  WORDS.push({ ko, alt:[], en, read, emoji, cat })
 *  - ko: 대표 한국어(매칭용), alt: 발음 변형·유의어(선택), en: 영어(소문자),
 *    read: 한글 발음 표기, emoji: 그림 1개, cat: 카테고리 id
 *  - en은 사전 전체에서 유일해야 함. 1글자 ko는 오탐 주의(가급적 2글자+)
 */
window.WORDS = window.WORDS || [];
window.CATS = window.CATS || [];

CATS.push({ id: 'vehicles', name: '탈것', emoji: '🚗' });

[
  // 도로
  { ko: '자동차', alt: ['승용차', '부릉부릉'], en: 'car', read: '카', emoji: '🚗' },
  { ko: '버스', en: 'bus', read: '버스', emoji: '🚌' },
  { ko: '스쿨버스', alt: ['유치원버스'], en: 'school bus', read: '스쿨 버스', emoji: '🚍' },
  { ko: '택시', en: 'taxi', read: '택시', emoji: '🚕' },
  { ko: '경주차', alt: ['레이싱카', '경주용차'], en: 'race car', read: '레이스 카', emoji: '🏎️' },
  { ko: '미니밴', alt: ['승합차'], en: 'van', read: '밴', emoji: '🚐' },
  { ko: '자전거', alt: ['두발자전거'], en: 'bicycle', read: '바이시클', emoji: '🚲' },
  { ko: '세발자전거', en: 'tricycle', read: '트라이시클', emoji: '🛞' },
  { ko: '오토바이', alt: ['오도바이'], en: 'motorcycle', read: '모터사이클', emoji: '🏍️' },
  { ko: '스쿠터', alt: ['킥보드'], en: 'scooter', read: '스쿠터', emoji: '🛴' },
  { ko: '스케이트보드', en: 'skateboard', read: '스케이트보드', emoji: '🛹' },
  { ko: '롤러스케이트', alt: ['롤러'], en: 'roller skates', read: '롤러 스케이츠', emoji: '🛼' },
  { ko: '유모차', alt: ['아기차'], en: 'stroller', read: '스트롤러', emoji: '🚼' },
  { ko: '휠체어', en: 'wheelchair', read: '휠체어', emoji: '♿' },
  // 긴급·일하는 차
  { ko: '소방차', alt: ['불차'], en: 'fire truck', read: '파이어 트럭', emoji: '🚒' },
  { ko: '구급차', alt: ['앰뷸런스', '엠뷸런스'], en: 'ambulance', read: '앰뷸런스', emoji: '🚑' },
  { ko: '경찰차', alt: ['순찰차'], en: 'police car', read: '폴리스 카', emoji: '🚓' },
  { ko: '트럭', alt: ['화물차'], en: 'truck', read: '트럭', emoji: '🚚' },
  { ko: '덤프트럭', en: 'dump truck', read: '덤프 트럭', emoji: '🛻' },
  { ko: '쓰레기차', alt: ['청소차'], en: 'garbage truck', read: '가비지 트럭', emoji: '🚛' },
  { ko: '견인차', alt: ['레커차'], en: 'tow truck', read: '토우 트럭', emoji: '🚛' },
  { ko: '포크레인', alt: ['굴착기', '굴삭기'], en: 'excavator', read: '엑스커베이터', emoji: '🚧' },
  { ko: '크레인', alt: ['기중기'], en: 'crane', read: '크레인', emoji: '🏗️' },
  { ko: '불도저', en: 'bulldozer', read: '불도저', emoji: '🚜' },
  { ko: '트랙터', alt: ['경운기'], en: 'tractor', read: '트랙터', emoji: '🚜' },
  // 기차
  { ko: '기차', alt: ['칙칙폭폭'], en: 'train', read: '트레인', emoji: '🚂' },
  { ko: '지하철', alt: ['전철'], en: 'subway', read: '서브웨이', emoji: '🚇' },
  { ko: '고속열차', alt: ['케이티엑스'], en: 'bullet train', read: '불릿 트레인', emoji: '🚄' },
  { ko: '트램', en: 'tram', read: '트램', emoji: '🚊' },
  { ko: '모노레일', en: 'monorail', read: '모노레일', emoji: '🚝' },
  { ko: '케이블카', en: 'cable car', read: '케이블 카', emoji: '🚡' },
  // 하늘
  { ko: '비행기', en: 'airplane', read: '에어플레인', emoji: '✈️' },
  { ko: '제트기', en: 'jet', read: '제트', emoji: '🛩️' },
  { ko: '헬리콥터', alt: ['헬기'], en: 'helicopter', read: '헬리콥터', emoji: '🚁' },
  { ko: '로켓', alt: ['로케트'], en: 'rocket', read: '로켓', emoji: '🚀' },
  { ko: '우주선', en: 'spaceship', read: '스페이스쉽', emoji: '🛸' },
  { ko: '열기구', alt: ['풍선기구'], en: 'hot air balloon', read: '핫 에어 벌룬', emoji: '🎈' },
  { ko: '낙하산', en: 'parachute', read: '패러슈트', emoji: '🪂' },
  // 바다
  { ko: '배', alt: ['커다란배'], en: 'ship', read: '쉽', emoji: '🚢' },
  { ko: '보트', alt: ['모터보트'], en: 'boat', read: '보트', emoji: '🚤' },
  { ko: '요트', alt: ['돛단배'], en: 'yacht', read: '요트', emoji: '⛵' },
  { ko: '카누', en: 'canoe', read: '카누', emoji: '🛶' },
  { ko: '오리배', alt: ['오리보트'], en: 'paddle boat', read: '패들 보트', emoji: '🚣' },
  { ko: '여객선', alt: ['페리'], en: 'ferry', read: '페리', emoji: '🛳️' },
  { ko: '잠수함', en: 'submarine', read: '서브마린', emoji: '🤿' },
  // 겨울
  { ko: '썰매', alt: ['눈썰매'], en: 'sled', read: '슬레드', emoji: '🛷' },
  { ko: '스키', en: 'ski', read: '스키', emoji: '🎿' },
  // 일하는 차 (추가)
  { ko: '레미콘', alt: ['믹서차', '레미콘차'], en: 'cement mixer', read: '시멘트 믹서', emoji: '🚧' },
  { ko: '지게차', en: 'forklift', read: '포크리프트', emoji: '🚜' },
  { ko: '캠핑카', en: 'camper', read: '캠퍼', emoji: '🏕️' },
  { ko: '아이스크림차', alt: ['아이스크림트럭'], en: 'ice cream truck', read: '아이스크림 트럭', emoji: '🍦' },
  { ko: '이층버스', alt: ['이 층 버스'], en: 'double decker bus', read: '더블 데커 버스', emoji: '🚌' },
  { ko: '마차', en: 'carriage', read: '캐리지', emoji: '🐎' },
  // 놀이공원
  { ko: '회전목마', alt: ['뱅뱅이'], en: 'merry go round', read: '메리 고 라운드', emoji: '🎠' },
  { ko: '롤러코스터', alt: ['청룡열차'], en: 'roller coaster', read: '롤러 코스터', emoji: '🎢' },
  { ko: '관람차', alt: ['대관람차'], en: 'ferris wheel', read: '페리스 휠', emoji: '🎡' },
  // 물 위 (추가)
  { ko: '뗏목', en: 'raft', read: '래프트', emoji: '🛶' },
  { ko: '카약', en: 'kayak', read: '카약', emoji: '🚣' },
  { ko: '서핑보드', alt: ['서프보드'], en: 'surfboard', read: '서프보드', emoji: '🏄' },
  // 하늘 (추가)
  { ko: '드론', en: 'drone', read: '드론', emoji: '🛸' },
  { ko: '인공위성', alt: ['위성'], en: 'satellite', read: '새틀라이트', emoji: '🛰️' }
].forEach(w => { w.cat = 'vehicles'; WORDS.push(w); });
