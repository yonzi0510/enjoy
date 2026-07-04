/* 단어 사전: 반대말 — 계약
 *  CATS.push({ id, name, emoji })  ·  WORDS.push({ ko, alt:[], en, read, emoji, cat })
 *  - ko: 대표 한국어(매칭용), alt: 발음 변형·유의어(선택), en: 영어(소문자),
 *    read: 한글 발음 표기, emoji: 그림 1개, cat: 카테고리 id
 *  - en은 사전 전체에서 유일해야 함. 1글자 ko는 오탐 주의(가급적 2글자+)
 *  - 반대말은 쌍으로 나란히 배치
 */
window.WORDS = window.WORDS || [];
window.CATS = window.CATS || [];

CATS.push({ id: 'opposites', name: '반대말', emoji: '↕️' });

[
  { ko: '크다', alt: ['커요', '큰거', '커다란'], en: 'big', read: '빅', emoji: '🐘' },
  { ko: '작다', alt: ['작아요', '작은거'], en: 'small', read: '스몰', emoji: '🐜' },
  { ko: '길다', alt: ['길어요', '긴거'], en: 'long', read: '롱', emoji: '📏' },
  { ko: '짧다', alt: ['짧아요', '짧은거'], en: 'short', read: '쇼트', emoji: '✂️' },
  { ko: '높다', alt: ['높아요', '높이'], en: 'high', read: '하이', emoji: '🦒' },
  { ko: '낮다', alt: ['낮아요'], en: 'low', read: '로우', emoji: '⤵️' },
  { ko: '빠르다', alt: ['빨라요', '빨리'], en: 'fast', read: '패스트', emoji: '🐆' },
  { ko: '느리다', alt: ['느려요', '천천히'], en: 'slow', read: '슬로우', emoji: '🐌' },
  { ko: '뜨겁다', alt: ['뜨거워', '앗뜨거'], en: 'hot', read: '핫', emoji: '🔥' },
  { ko: '차갑다', alt: ['차가워', '추워요'], en: 'cold', read: '콜드', emoji: '🧊' },
  { ko: '무겁다', alt: ['무거워'], en: 'heavy', read: '헤비', emoji: '🏋️' },
  { ko: '가볍다', alt: ['가벼워'], en: 'light', read: '라이트', emoji: '🎈' },
  { ko: '새것', alt: ['새거', '새로운거'], en: 'new', read: '뉴', emoji: '✨' },
  { ko: '헌것', alt: ['헌거', '낡은거', '오래된거'], en: 'old', read: '올드', emoji: '🕰️' },
  { ko: '열다', alt: ['열어요', '열렸다'], en: 'open', read: '오픈', emoji: '🔓' },
  { ko: '닫다', alt: ['닫아요', '닫혔다'], en: 'close', read: '클로즈', emoji: '🔒' },
  { ko: '위쪽', alt: ['위로'], en: 'up', read: '업', emoji: '⬆️' },
  { ko: '아래', alt: ['아래쪽', '밑에'], en: 'down', read: '다운', emoji: '⬇️' },
  { ko: '안쪽', alt: ['안에'], en: 'in', read: '인', emoji: '📥' },
  { ko: '바깥', alt: ['밖에', '바깥쪽'], en: 'out', read: '아웃', emoji: '📤' },
  { ko: '앞쪽', alt: ['앞에'], en: 'front', read: '프런트', emoji: '▶️' },
  { ko: '뒤쪽', alt: ['뒤에'], en: 'back', read: '백', emoji: '◀️' },
  { ko: '오른쪽', alt: ['오른손'], en: 'right', read: '라이트', emoji: '➡️' },
  { ko: '왼쪽', alt: ['왼손'], en: 'left', read: '레프트', emoji: '⬅️' },
  { ko: '시끄럽다', alt: ['시끄러워', '크게'], en: 'loud', read: '라우드', emoji: '📢' },
  { ko: '조용해', alt: ['조용히', '조용하다'], en: 'quiet', read: '콰이어트', emoji: '🤫' },
  { ko: '깨끗하다', alt: ['깨끗해', '반짝반짝'], en: 'neat', read: '니트', emoji: '🧼' },
  { ko: '더럽다', alt: ['더러워', '지지'], en: 'dirty', read: '더티', emoji: '💩' },
  { ko: '많다', alt: ['많아요', '많이'], en: 'many', read: '매니', emoji: '🍇' },
  { ko: '적다', alt: ['적어요', '조금'], en: 'few', read: '퓨', emoji: '🤏' },
  { ko: '좋다', alt: ['좋아요', '좋았어'], en: 'good', read: '굿', emoji: '👍' },
  { ko: '나쁘다', alt: ['나빠', '싫어요'], en: 'bad', read: '배드', emoji: '👎' },
  { ko: '젖다', alt: ['젖었어', '축축해'], en: 'wet', read: '웻', emoji: '💦' },
  { ko: '마르다', alt: ['말랐어', '보송보송'], en: 'dry', read: '드라이', emoji: '🌵' },
  { ko: '밝다', alt: ['밝아요', '환하다'], en: 'bright', read: '브라이트', emoji: '💡' },
  { ko: '어둡다', alt: ['어두워', '깜깜해'], en: 'dark', read: '다크', emoji: '🌑' },
  { ko: '강하다', alt: ['힘세다', '튼튼해'], en: 'strong', read: '스트롱', emoji: '💪' },
  { ko: '약하다', alt: ['약해요'], en: 'weak', read: '위크', emoji: '🥀' },
  { ko: '가득하다', alt: ['가득해', '가득'], en: 'full', read: '풀', emoji: '🥛' },
  { ko: '비었다', alt: ['비어있어', '텅텅'], en: 'empty', read: '엠티', emoji: '🕳️' },
  { ko: '딱딱하다', alt: ['딱딱해'], en: 'hard', read: '하드', emoji: '🪨' },
  { ko: '말랑말랑', alt: ['말랑해', '부드러워', '폭신폭신'], en: 'soft', read: '소프트', emoji: '🧸' },
  { ko: '같다', alt: ['똑같아', '같아요'], en: 'same', read: '세임', emoji: '👯' },
  { ko: '다르다', alt: ['달라요', '다른거'], en: 'different', read: '디퍼런트', emoji: '🔀' },
  { ko: '멀다', alt: ['멀어요', '저멀리'], en: 'far', read: '파', emoji: '🔭' },
  { ko: '가깝다', alt: ['가까워'], en: 'near', read: '니어', emoji: '🤝' },
  { ko: '시작', alt: ['출발'], en: 'start', read: '스타트', emoji: '🚦' },
  { ko: '도착', alt: ['끝났다'], en: 'finish', read: '피니시', emoji: '🏁' }
].forEach(w => { w.cat = 'opposites'; WORDS.push(w); });
