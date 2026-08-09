/* 일본어 낱말 — 동물 (사전 형식의 원본 · 계약)
 *
 *  CATS_JA.push({ id, name, emoji })
 *  WORDS_JA.push({ ko, alt:[], ja, kanji, read, emoji, cat })
 *
 *   ko    한국어 (매칭 대표) — 되도록 english/js/dict 의 ko 와 같은 말을 쓴다.
 *         그래야 "영어로 뭐야"와 "일본어로 뭐야"가 같은 낱말에서 둘 다 답이 나온다.
 *   alt   한국어 변형 (선택, 배열)
 *   ja    일본어 표기 — 다섯 살이 보는 것이라 히라가나/가타카나 위주.
 *         외래어는 가타카나로 적는다 (ケーキ·バス).
 *   kanji 한자 표기 (선택). 아이에게 보여주지 않아도 되지만 부모님이 확인할 때 쓴다.
 *   read  한글 발음 표기 — 아이가 따라 읽을 것. 아래 규칙을 지킨다.
 *   emoji 이모지 1개
 *   cat   갈래 id (파일 끝 forEach 가 붙여 준다)
 *
 * ── read(한글 발음) 표기 규칙 ─────────────────────────────────────
 *  1) 가나 한 자 = 한글 한 자. 일본어 놀이터가 가르치는 읽기표와 똑같이 적는다
 *     (か=카 た=타 つ=츠 …, が=가 だ=다 ざ=자 …). 그래야 아이가 같은 소리로 배운다.
 *  2) 장음은 있는 그대로 다 적는다. おかあさん=오카아상, ぞう=조우, ケーキ=케에키.
 *     줄여 적으면 아이가 짧게 읽어 다른 말이 된다 (おばさん 이모 / おばあさん 할머니).
 *  3) 촉음 っ 은 앞 글자의 받침으로 적는다 — 뒤가 か·が행이면 ㄱ, さ·た·だ행이면 ㅅ, ぱ행이면 ㅂ.
 *     がっこう=각코우, ドッグ=독구, サンドイッチ=산도잇치, ベッド=벳도, パイナップル=파이납푸루.
 *     인사말의 は(こんにちは)만 소리대로 '와' 로 적는다 — 조사라서 글자와 소리가 다르다.
 *  4) ん 은 뒤에 오는 소리에 따라 받침이 달라진다 (일본 사람이 실제로 내는 소리다).
 *       か·が행 앞, 모음·や·わ 앞, 그리고 낱말 끝  → ㅇ  (りんご=링고, でんわ=뎅와, ぱん=팡)
 *       ま·ば·ぱ행 앞                              → ㅁ  (さんぽ=삼포, しんぶん=심붕)
 *       그 밖(さ·ざ·た·だ·な·は·ら행) 앞           → ㄴ  (せんせい=센세이, こんにちは=콘니치와)
 *     낱말 끝을 ㅇ 으로 적는 것은 부모님이 주신 보기(おかあさん=오카아상)를 따른 것이고,
 *     우리말에 들어온 일본말(우동·오뎅·미깡)도 모두 그렇게 들린다.
 *  5) 확신이 없는 낱말은 넣지 않는다. 250개 정확한 것이 300개 반쯤 맞는 것보다 낫다.
 */
window.WORDS_JA = window.WORDS_JA || []; window.CATS_JA = window.CATS_JA || [];

CATS_JA.push({ id: 'animals', name: '🐘 동물', emoji: '🐘' });

[
  { ko: '코끼리', alt: ['꼬끼리'], ja: 'ぞう', kanji: '象', read: '조우', emoji: '🐘' },
  { ko: '강아지', alt: ['개', '멍멍이'], ja: 'いぬ', kanji: '犬', read: '이누', emoji: '🐶' },
  { ko: '고양이', alt: ['야옹이', '냐옹이'], ja: 'ねこ', kanji: '猫', read: '네코', emoji: '🐱' },
  { ko: '사자', ja: 'ライオン', read: '라이옹', emoji: '🦁' },
  { ko: '호랑이', alt: ['호랭이'], ja: 'とら', kanji: '虎', read: '토라', emoji: '🐯' },
  { ko: '곰', alt: ['곰돌이'], ja: 'くま', kanji: '熊', read: '쿠마', emoji: '🐻' },
  { ko: '토끼', alt: ['토깽이'], ja: 'うさぎ', kanji: '兎', read: '우사기', emoji: '🐰' },
  { ko: '여우', ja: 'きつね', kanji: '狐', read: '키츠네', emoji: '🦊' },
  { ko: '원숭이', ja: 'さる', kanji: '猿', read: '사루', emoji: '🐵' },
  { ko: '판다', alt: ['팬더', '판다곰'], ja: 'パンダ', read: '판다', emoji: '🐼' },
  { ko: '코알라', ja: 'コアラ', read: '코아라', emoji: '🐨' },
  { ko: '기린', ja: 'キリン', read: '키링', emoji: '🦒' },
  { ko: '얼룩말', ja: 'しまうま', kanji: '縞馬', read: '시마우마', emoji: '🦓' },
  { ko: '하마', ja: 'かば', kanji: '河馬', read: '카바', emoji: '🦛' },
  { ko: '코뿔소', ja: 'サイ', read: '사이', emoji: '🦏' },
  { ko: '악어', ja: 'ワニ', read: '와니', emoji: '🐊' },
  { ko: '뱀', ja: 'へび', kanji: '蛇', read: '헤비', emoji: '🐍' },
  { ko: '거북이', alt: ['거북'], ja: 'かめ', kanji: '亀', read: '카메', emoji: '🐢' },
  { ko: '개구리', ja: 'かえる', kanji: '蛙', read: '카에루', emoji: '🐸' },
  { ko: '돼지', alt: ['꿀꿀이'], ja: 'ぶた', kanji: '豚', read: '부타', emoji: '🐷' },
  { ko: '소', alt: ['젖소'], ja: 'うし', kanji: '牛', read: '우시', emoji: '🐮' },
  { ko: '말', ja: 'うま', kanji: '馬', read: '우마', emoji: '🐴' },
  { ko: '양', ja: 'ひつじ', kanji: '羊', read: '히츠지', emoji: '🐑' },
  { ko: '염소', ja: 'やぎ', kanji: '山羊', read: '야기', emoji: '🐐' },
  { ko: '닭', alt: ['꼬꼬닭'], ja: 'にわとり', kanji: '鶏', read: '니와토리', emoji: '🐔' },
  { ko: '병아리', ja: 'ひよこ', read: '히요코', emoji: '🐤' },
  { ko: '오리', alt: ['꽥꽥이'], ja: 'あひる', read: '아히루', emoji: '🦆' },
  { ko: '펭귄', ja: 'ペンギン', read: '펭깅', emoji: '🐧' },
  { ko: '부엉이', alt: ['올빼미'], ja: 'ふくろう', kanji: '梟', read: '후쿠로우', emoji: '🦉' },
  { ko: '독수리', ja: 'わし', kanji: '鷲', read: '와시', emoji: '🦅' },
  { ko: '새', ja: 'とり', kanji: '鳥', read: '토리', emoji: '🐦' },
  { ko: '물고기', alt: ['생선'], ja: 'さかな', kanji: '魚', read: '사카나', emoji: '🐟' },
  { ko: '상어', ja: 'サメ', read: '사메', emoji: '🦈' },
  { ko: '고래', ja: 'くじら', kanji: '鯨', read: '쿠지라', emoji: '🐳' },
  { ko: '돌고래', ja: 'イルカ', read: '이루카', emoji: '🐬' },
  { ko: '문어', ja: 'たこ', kanji: '蛸', read: '타코', emoji: '🐙' },
  { ko: '오징어', ja: 'イカ', read: '이카', emoji: '🦑' },
  { ko: '새우', ja: 'えび', kanji: '海老', read: '에비', emoji: '🦐' },
  { ko: '게', alt: ['꽃게'], ja: 'かに', kanji: '蟹', read: '카니', emoji: '🦀' },
  { ko: '조개', ja: 'かい', kanji: '貝', read: '카이', emoji: '🦪' },
  { ko: '나비', ja: 'ちょうちょ', read: '쵸우쵸', emoji: '🦋' },
  { ko: '벌', alt: ['꿀벌'], ja: 'はち', kanji: '蜂', read: '하치', emoji: '🐝' },
  { ko: '개미', ja: 'あり', kanji: '蟻', read: '아리', emoji: '🐜' },
  { ko: '무당벌레', ja: 'てんとうむし', read: '텐토우무시', emoji: '🐞' },
  { ko: '달팽이', ja: 'かたつむり', read: '카타츠무리', emoji: '🐌' },
  { ko: '거미', ja: 'くも', kanji: '蜘蛛', read: '쿠모', emoji: '🕷️' },
  { ko: '잠자리', ja: 'とんぼ', read: '톰보', emoji: '🪰' },
  { ko: '지렁이', ja: 'ミミズ', read: '미미즈', emoji: '🪱' },
  { ko: '공룡', ja: 'きょうりゅう', kanji: '恐竜', read: '쿄우류우', emoji: '🦕' },
  { ko: '쥐', alt: ['생쥐'], ja: 'ねずみ', kanji: '鼠', read: '네즈미', emoji: '🐭' },
  { ko: '다람쥐', ja: 'リス', read: '리스', emoji: '🐿️' },
  { ko: '늑대', ja: 'おおかみ', kanji: '狼', read: '오오카미', emoji: '🐺' },
  { ko: '사슴', ja: 'しか', kanji: '鹿', read: '시카', emoji: '🦌' },
  { ko: '낙타', ja: 'ラクダ', read: '라쿠다', emoji: '🐫' },
  { ko: '캥거루', ja: 'カンガルー', read: '캉가루우', emoji: '🦘' },
  { ko: '고릴라', ja: 'ゴリラ', read: '고리라', emoji: '🦍' },
  { ko: '침팬지', ja: 'チンパンジー', read: '침판지이', emoji: '🐒' },
  { ko: '박쥐', ja: 'コウモリ', read: '코우모리', emoji: '🦇' },
  { ko: '햄스터', ja: 'ハムスター', read: '하무스타아', emoji: '🐹' },
  { ko: '백조', ja: 'はくちょう', kanji: '白鳥', read: '하쿠쵸우', emoji: '🦢' },
  { ko: '비둘기', ja: 'はと', kanji: '鳩', read: '하토', emoji: '🕊️' },
  { ko: '참새', ja: 'すずめ', kanji: '雀', read: '스즈메', emoji: '🐦' },
  { ko: '까마귀', ja: 'からす', kanji: '烏', read: '카라스', emoji: '🐦‍⬛' },
  { ko: '도마뱀', ja: 'トカゲ', read: '토카게', emoji: '🦎' },
  { ko: '물개', alt: ['물범', '바다표범'], ja: 'アザラシ', read: '아자라시', emoji: '🦭' },
  { ko: '앵무새', ja: 'オウム', read: '오우무', emoji: '🦜' },
  { ko: '용', alt: ['드래곤'], ja: 'りゅう', kanji: '竜', read: '류우', emoji: '🐉' }
].forEach(w => { w.cat = 'animals'; WORDS_JA.push(w); });
