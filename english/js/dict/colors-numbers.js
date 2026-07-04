/* 단어 사전: 색깔·숫자 — 계약
 *  CATS.push({ id, name, emoji })  ·  WORDS.push({ ko, alt:[], en, read, emoji, cat })
 *  - ko: 대표 한국어(매칭용), alt: 발음 변형·유의어(선택), en: 영어(소문자),
 *    read: 한글 발음 표기, emoji: 그림 1개, cat: 카테고리 id
 *  - en은 사전 전체에서 유일해야 함. 1글자 ko는 오탐 주의(가급적 2글자+)
 *  - 주의: '오렌지색(orange)'은 food의 오렌지(en:'orange')가 alt('주황색')로 커버함
 */
window.WORDS = window.WORDS || [];
window.CATS = window.CATS || [];

CATS.push({ id: 'colors', name: '색깔·숫자', emoji: '🌈' });

[
  // 색깔
  { ko: '빨간색', alt: ['빨강', '빨개'], en: 'red', read: '레드', emoji: '🔴' },
  { ko: '노란색', alt: ['노랑', '노래'], en: 'yellow', read: '옐로우', emoji: '🟡' },
  { ko: '초록색', alt: ['초록', '녹색'], en: 'green', read: '그린', emoji: '🟢' },
  { ko: '파란색', alt: ['파랑', '파래'], en: 'blue', read: '블루', emoji: '🔵' },
  { ko: '보라색', alt: ['보라'], en: 'purple', read: '퍼플', emoji: '🟣' },
  { ko: '분홍색', alt: ['분홍', '핑크'], en: 'pink', read: '핑크', emoji: '🩷' },
  { ko: '검은색', alt: ['검정', '까만색'], en: 'black', read: '블랙', emoji: '⚫' },
  { ko: '흰색', alt: ['하얀색', '하양'], en: 'white', read: '화이트', emoji: '⚪' },
  { ko: '갈색', alt: ['밤색'], en: 'brown', read: '브라운', emoji: '🟤' },
  { ko: '회색', alt: ['잿빛'], en: 'gray', read: '그레이', emoji: '🩶' },
  { ko: '금색', alt: ['황금색'], en: 'gold', read: '골드', emoji: '🥇' },
  { ko: '은색', en: 'silver', read: '실버', emoji: '🥈' },
  { ko: '하늘색', en: 'sky blue', read: '스카이 블루', emoji: '🩵' },
  { ko: '연두색', alt: ['연두'], en: 'light green', read: '라이트 그린', emoji: '🟩' },
  { ko: '남색', alt: ['진파랑'], en: 'navy', read: '네이비', emoji: '🟦' },
  // 숫자
  { ko: '제로', en: 'zero', read: '지로', emoji: '🅾️' },
  { ko: '하나', alt: ['한개'], en: 'one', read: '원', emoji: '🕐' },
  { ko: '둘', alt: ['두개'], en: 'two', read: '투', emoji: '🕑' },
  { ko: '셋', alt: ['세개'], en: 'three', read: '쓰리', emoji: '🕒' },
  { ko: '넷', alt: ['네개'], en: 'four', read: '포', emoji: '🕓' },
  { ko: '다섯', alt: ['다섯개'], en: 'five', read: '파이브', emoji: '🕔' },
  { ko: '여섯', alt: ['여섯개'], en: 'six', read: '식스', emoji: '🕕' },
  { ko: '일곱', alt: ['일곱개'], en: 'seven', read: '세븐', emoji: '🕖' },
  { ko: '여덟', alt: ['여덟개'], en: 'eight', read: '에이트', emoji: '🕗' },
  { ko: '아홉', alt: ['아홉개'], en: 'nine', read: '나인', emoji: '🕘' },
  { ko: '열', alt: ['열개'], en: 'ten', read: '텐', emoji: '🔟' },
  { ko: '열하나', alt: ['십일'], en: 'eleven', read: '일레븐', emoji: '🕚' },
  { ko: '열둘', alt: ['십이'], en: 'twelve', read: '트웰브', emoji: '🕛' },
  { ko: '열셋', alt: ['십삼'], en: 'thirteen', read: '써틴', emoji: '🔢' },
  { ko: '열넷', alt: ['십사'], en: 'fourteen', read: '포틴', emoji: '🔢' },
  { ko: '열다섯', alt: ['십오'], en: 'fifteen', read: '피프틴', emoji: '🔢' },
  { ko: '열여섯', alt: ['십육'], en: 'sixteen', read: '식스틴', emoji: '🔢' },
  { ko: '열일곱', alt: ['십칠'], en: 'seventeen', read: '세븐틴', emoji: '🔢' },
  { ko: '열여덟', alt: ['십팔'], en: 'eighteen', read: '에이틴', emoji: '🔢' },
  { ko: '열아홉', alt: ['십구'], en: 'nineteen', read: '나인틴', emoji: '🔢' },
  { ko: '스물', alt: ['이십'], en: 'twenty', read: '트웬티', emoji: '🎉' },
  { ko: '삼십', alt: ['서른'], en: 'thirty', read: '써티', emoji: '✨' },
  { ko: '사십', alt: ['마흔'], en: 'forty', read: '포티', emoji: '💫' },
  { ko: '오십', en: 'fifty', read: '피프티', emoji: '🌟' },
  { ko: '백', alt: ['일백', '백개'], en: 'hundred', read: '헌드레드', emoji: '💯' },
  // 모양
  { ko: '동그라미', alt: ['원형', '똥그라미'], en: 'circle', read: '서클', emoji: '⭕' },
  { ko: '세모', alt: ['삼각형'], en: 'triangle', read: '트라이앵글', emoji: '🔺' },
  { ko: '네모', alt: ['사각형', '정사각형'], en: 'square', read: '스퀘어', emoji: '🔲' },
  { ko: '별모양', alt: ['별표'], en: 'star', read: '스타', emoji: '⭐' },
  { ko: '하트', alt: ['하트모양'], en: 'heart shape', read: '하트 셰이프', emoji: '❤️' },
  { ko: '다이아몬드', alt: ['마름모', '다이아'], en: 'diamond', read: '다이아몬드', emoji: '💎' },
  { ko: '타원', alt: ['타원형', '계란모양'], en: 'oval', read: '오벌', emoji: '🥚' },
  { ko: '직사각형', alt: ['긴네모'], en: 'rectangle', read: '렉탱글', emoji: '🟧' },
  // 색깔·숫자 놀이 낱말
  { ko: '화살표', en: 'arrow', read: '애로우', emoji: '➡️' },
  { ko: '더하기', alt: ['플러스'], en: 'plus', read: '플러스', emoji: '➕' },
  { ko: '빼기', alt: ['마이너스'], en: 'minus', read: '마이너스', emoji: '➖' },
  { ko: '숫자', alt: ['넘버'], en: 'number', read: '넘버', emoji: '🔢' },
  { ko: '색깔', alt: ['색상'], en: 'color', read: '컬러', emoji: '🎨' },
  { ko: '모양', alt: ['도형'], en: 'shape', read: '셰이프', emoji: '🔷' },
  { ko: '첫번째', alt: ['첫째'], en: 'first', read: '퍼스트', emoji: '🥇' },
  { ko: '두번째', alt: ['둘째'], en: 'second', read: '세컨드', emoji: '🥈' },
  { ko: '세번째', alt: ['셋째'], en: 'third', read: '써드', emoji: '🥉' }
].forEach(w => { w.cat = 'colors'; WORDS.push(w); });
