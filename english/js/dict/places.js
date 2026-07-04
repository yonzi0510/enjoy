/* 단어 사전: 장소·나라 — 계약
 *  CATS.push({ id, name, emoji })  ·  WORDS.push({ ko, alt:[], en, read, emoji, cat })
 *  - ko: 대표 한국어(매칭용), alt: 발음 변형·유의어(선택), en: 영어(소문자),
 *    read: 한글 발음 표기, emoji: 그림 1개, cat: 카테고리 id
 *  - en은 사전 전체에서 유일해야 함. 1글자 ko는 오탐 주의(가급적 2글자+)
 */
window.WORDS = window.WORDS || [];
window.CATS = window.CATS || [];

CATS.push({ id: 'places', name: '장소·나라', emoji: '🏫' });

[
  // 동네 장소
  { ko: '학교', en: 'school', read: '스쿨', emoji: '🏫' },
  { ko: '유치원', alt: ['어린이집'], en: 'kindergarten', read: '킨더가튼', emoji: '🎒' },
  { ko: '병원', en: 'hospital', read: '하스피털', emoji: '🏥' },
  { ko: '약국', en: 'pharmacy', read: '파머시', emoji: '💊' },
  { ko: '치과', alt: ['이빨병원'], en: 'dental clinic', read: '덴탈 클리닉', emoji: '🦷' },
  { ko: '소방서', en: 'fire station', read: '파이어 스테이션', emoji: '🚒' },
  { ko: '경찰서', en: 'police station', read: '폴리스 스테이션', emoji: '🚓' },
  { ko: '우체국', en: 'post office', read: '포스트 오피스', emoji: '📮' },
  { ko: '은행', en: 'bank', read: '뱅크', emoji: '🏦' },
  { ko: '도서관', en: 'library', read: '라이브러리', emoji: '📚' },
  { ko: '서점', alt: ['책방'], en: 'bookstore', read: '북스토어', emoji: '📖' },
  { ko: '공원', en: 'park', read: '파크', emoji: '🌳' },
  { ko: '놀이터', en: 'playground', read: '플레이그라운드', emoji: '🛝' },
  { ko: '놀이공원', alt: ['유원지'], en: 'amusement park', read: '어뮤즈먼트 파크', emoji: '🎡' },
  { ko: '시장', en: 'market', read: '마켓', emoji: '🧺' },
  { ko: '마트', alt: ['슈퍼', '슈퍼마켓'], en: 'supermarket', read: '슈퍼마켓', emoji: '🛒' },
  { ko: '가게', alt: ['상점'], en: 'store', read: '스토어', emoji: '🏪' },
  { ko: '식당', alt: ['음식점'], en: 'restaurant', read: '레스토랑', emoji: '🍽️' },
  { ko: '빵집', en: 'bakery', read: '베이커리', emoji: '🥐' },
  { ko: '미용실', alt: ['머리방'], en: 'hair salon', read: '헤어 살롱', emoji: '💇' },
  { ko: '교회', en: 'church', read: '처치', emoji: '⛪' },
  { ko: '박물관', en: 'museum', read: '뮤지엄', emoji: '🏛️' },
  { ko: '동물원', en: 'zoo', read: '주', emoji: '🦁' },
  { ko: '수족관', alt: ['아쿠아리움'], en: 'aquarium', read: '아쿠아리움', emoji: '🐠' },
  { ko: '영화관', alt: ['극장'], en: 'cinema', read: '시네마', emoji: '🎬' },
  { ko: '수영장', en: 'pool', read: '풀', emoji: '🏊' },
  { ko: '목욕탕', en: 'bath', read: '배스', emoji: '🛁' },
  { ko: '경기장', alt: ['축구장'], en: 'stadium', read: '스타디움', emoji: '🏟️' },
  { ko: '호텔', en: 'hotel', read: '호텔', emoji: '🏨' },
  { ko: '공항', en: 'airport', read: '에어포트', emoji: '🛫' },
  { ko: '기차역', en: 'train station', read: '트레인 스테이션', emoji: '🚉' },
  { ko: '정류장', alt: ['버스정류장'], en: 'bus stop', read: '버스 스톱', emoji: '🚏' },
  { ko: '농장', en: 'farm', read: '팜', emoji: '🚜' },
  { ko: '궁전', alt: ['왕궁'], en: 'palace', read: '팰리스', emoji: '🏰' },
  { ko: '바닷가', alt: ['해변', '모래사장'], en: 'beach', read: '비치', emoji: '🏖️' },
  // 길·마을
  { ko: '구름다리', alt: ['징검다리'], en: 'bridge', read: '브리지', emoji: '🌉' },
  { ko: '도로', alt: ['찻길'], en: 'road', read: '로드', emoji: '🛣️' },
  { ko: '마을', alt: ['동네'], en: 'village', read: '빌리지', emoji: '🏘️' },
  { ko: '도시', en: 'city', read: '시티', emoji: '🏙️' },
  // 나라·세계 (국기 이모지는 검증기 통과 불가 → 상징 이모지 사용)
  { ko: '세계', en: 'world', read: '월드', emoji: '🌍' },
  { ko: '나라', en: 'country', read: '컨트리', emoji: '🗺️' },
  { ko: '한국', alt: ['대한민국', '우리나라'], en: 'korea', read: '코리아', emoji: '🥋' },
  { ko: '미국', en: 'america', read: '아메리카', emoji: '🗽' },
  { ko: '영국', en: 'england', read: '잉글랜드', emoji: '💂' },
  { ko: '프랑스', en: 'france', read: '프랑스', emoji: '🥖' },
  { ko: '일본', en: 'japan', read: '재팬', emoji: '🗻' },
  { ko: '중국', en: 'china', read: '차이나', emoji: '🐉' },
  { ko: '이탈리아', en: 'italy', read: '이탈리', emoji: '🍕' },
  { ko: '호주', alt: ['오스트레일리아'], en: 'australia', read: '오스트레일리아', emoji: '🦘' },
  { ko: '캐나다', en: 'canada', read: '캐나다', emoji: '🍁' },
  { ko: '독일', en: 'germany', read: '저머니', emoji: '🥨' },
  { ko: '스페인', en: 'spain', read: '스페인', emoji: '💃' },
  { ko: '브라질', en: 'brazil', read: '브라질', emoji: '⚽' },
  { ko: '인도', en: 'india', read: '인디아', emoji: '🐘' }
].forEach(w => { w.cat = 'places'; WORDS.push(w); });
