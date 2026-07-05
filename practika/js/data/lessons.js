/* 프랙티카 놀이터 — 언어·트랙·레슨·대본·어휘 데이터 (다국어)
 *
 * 지원 언어(LANGS): 영어(en)·일본어(ja)·중국어(zh). 각 언어마다 3트랙 × 3~4레슨.
 * 레슨 id 는 언어 접두어를 붙여 전역에서 유일하다 (예: 'en-travel-cafe', 'ja-travel-airport').
 *
 * 대화 엔진이 읽는 대본 구조:
 *   turns[]
 *     { speaker:'tutor', t, ko }                     튜터 대사(t=목표언어) + 한국어 자막(ko)
 *     { speaker:'user', ask, model, expect:[...] }   내가 말할 차례
 *        ask=한국어 안내, model=모범 답안(목표언어), expect=정답 인정 표현(model 자동 포함)
 *   vocab[] { t, ko }  복습 카드
 *
 * 채점은 match.js 가 언어별로 처리한다(영어=단어 토큰, 일·중=문자 단위).
 */
window.LANGS = [
  { id: 'en', label: '영어',   flag: '🇺🇸', tts: 'en-US', stt: 'en-US', hello: "Hi! Let's practice English together!" },
  { id: 'ja', label: '일본어', flag: '🇯🇵', tts: 'ja-JP', stt: 'ja-JP', hello: 'こんにちは！一緒に日本語を練習しましょう！' },
  { id: 'zh', label: '중국어', flag: '🇨🇳', tts: 'zh-CN', stt: 'zh-CN', hello: '你好！我们一起练习中文吧！' },
];

function U(ask, model, expect) { return { speaker: 'user', ask, model, expect: (expect || []).concat([model]) }; }
function T(t, ko) { return { speaker: 'tutor', t, ko }; }

window.TRACKS = [
  /* 영어 */
  { id: 'en-travel',   lang: 'en', title: '여행 영어',     emoji: '🧳', color: '#5FB0E8', desc: '공항·식당·길찾기·호텔' },
  { id: 'en-everyday', lang: 'en', title: '일상 영어',     emoji: '☕', color: '#F19E4B', desc: '인사·소개·가족·취미' },
  { id: 'en-career',   lang: 'en', title: '비즈니스 영어', emoji: '💼', color: '#8A7BE0', desc: '면접·회의·일정·감사' },
  /* 일본어 */
  { id: 'ja-travel',   lang: 'ja', title: '여행 일본어',     emoji: '🧳', color: '#5FB0E8', desc: '공항·식당·길찾기' },
  { id: 'ja-everyday', lang: 'ja', title: '일상 일본어',     emoji: '🍵', color: '#F19E4B', desc: '인사·소개·취미' },
  { id: 'ja-career',   lang: 'ja', title: '비즈니스 일본어', emoji: '💼', color: '#8A7BE0', desc: '면접·회의·감사' },
  /* 중국어 */
  { id: 'zh-travel',   lang: 'zh', title: '여행 중국어',     emoji: '🧳', color: '#5FB0E8', desc: '공항·식당·길찾기' },
  { id: 'zh-everyday', lang: 'zh', title: '일상 중국어',     emoji: '🥟', color: '#F19E4B', desc: '인사·소개·취미' },
  { id: 'zh-career',   lang: 'zh', title: '비즈니스 중국어', emoji: '💼', color: '#8A7BE0', desc: '면접·회의·감사' },
];

window.LESSONS = {
  /* ═══════════════ 영어 ═══════════════ */
  'en-travel-airport': {
    lang: 'en', trackId: 'en-travel', title: '공항 체크인', emoji: '🛫', level: 'A1',
    turns: [
      T('Hello! May I see your passport, please?', '안녕하세요! 여권을 보여주시겠어요?'),
      U('여기 있어요, 라고 말해보세요', 'Here it is.', ['here you are', 'here you go']),
      T('Thank you. Where are you flying today?', '감사합니다. 오늘 어디로 가시나요?'),
      U('뉴욕으로 간다고 말해보세요', "I'm flying to New York.", ['i am flying to new york', 'to new york']),
      T('Great. Do you have any bags to check in?', '좋아요. 부칠 짐이 있나요?'),
      U('가방 하나 있다고 말해보세요', 'Yes, I have one bag.', ['i have one bag', 'yes one bag']),
      T('Perfect. Here is your boarding pass. Have a nice flight!', '완벽해요. 탑승권 여기 있어요. 즐거운 비행 되세요!'),
      U('감사합니다, 라고 말해보세요', 'Thank you very much.', ['thank you', 'thanks']),
    ],
    vocab: [
      { t: 'Here it is.', ko: '여기 있어요.' },
      { t: "I'm flying to New York.", ko: '뉴욕으로 가요.' },
      { t: 'I have one bag.', ko: '가방이 하나 있어요.' },
      { t: 'Thank you very much.', ko: '정말 감사합니다.' },
    ],
  },
  'en-travel-cafe': {
    lang: 'en', trackId: 'en-travel', title: '카페에서 주문하기', emoji: '☕', level: 'A1',
    turns: [
      T('Hi! Welcome. What can I get you?', '안녕하세요! 무엇을 드릴까요?'),
      U('커피 한 잔 달라고 말해보세요', 'A coffee, please.', ['can i get a coffee', 'one coffee please', 'coffee please']),
      T('Sure! Would you like it hot or iced?', '네! 따뜻한 걸로, 아이스로 드릴까요?'),
      U('아이스로 달라고 말해보세요', 'Iced, please.', ['iced please', 'cold please', 'iced']),
      T('Got it. Anything else?', '알겠어요. 더 필요하신 거 있나요?'),
      U('그게 다라고 말해보세요', "No, that's all.", ["that's all", 'no thank you', 'no thanks']),
      T('That will be four dollars.', '4달러입니다.'),
      U('여기 있어요, 라고 말해보세요', 'Here you go.', ['here you are', 'here it is']),
      T('Thank you! Have a great day!', '감사합니다! 좋은 하루 보내세요!'),
    ],
    vocab: [
      { t: 'A coffee, please.', ko: '커피 한 잔 주세요.' },
      { t: 'Iced, please.', ko: '아이스로 주세요.' },
      { t: "No, that's all.", ko: '아니요, 그게 다예요.' },
      { t: 'Here you go.', ko: '여기 있어요.' },
    ],
  },
  'en-travel-directions': {
    lang: 'en', trackId: 'en-travel', title: '길 물어보기', emoji: '🗺️', level: 'A2',
    turns: [
      T('Hi there! You look a little lost. Can I help?', '안녕하세요! 길을 잃으신 것 같네요. 도와드릴까요?'),
      U('실례지만 역이 어디인지 물어보세요', 'Excuse me, where is the station?', ['where is the station', 'how do i get to the station']),
      T("It's just around the corner, next to the bank.", '모퉁이를 돌면 바로, 은행 옆에 있어요.'),
      U('걸어서 얼마나 걸리는지 물어보세요', 'How long does it take to walk?', ['how long does it take', 'is it far']),
      T('Only about five minutes.', '5분 정도밖에 안 걸려요.'),
      U('도와줘서 고맙다고 말해보세요', 'Thank you for your help.', ['thanks for your help', 'thank you']),
      T("You're welcome. Enjoy your trip!", '천만에요. 즐거운 여행 되세요!'),
    ],
    vocab: [
      { t: 'Excuse me, where is the station?', ko: '실례지만, 역이 어디예요?' },
      { t: 'How long does it take to walk?', ko: '걸어서 얼마나 걸려요?' },
      { t: 'Thank you for your help.', ko: '도와주셔서 감사합니다.' },
    ],
  },
  'en-travel-hotel': {
    lang: 'en', trackId: 'en-travel', title: '호텔 체크인', emoji: '🏨', level: 'A2',
    turns: [
      T('Good evening! Do you have a reservation?', '안녕하세요! 예약하셨나요?'),
      U('네, 이름으로 예약했다고 말해보세요', 'Yes, I have a reservation under Kim.', ['i have a reservation', 'i booked a room']),
      T('Let me check. Yes, a room for two nights. May I have your passport?', '확인해 볼게요. 네, 2박이네요. 여권 주시겠어요?'),
      U('여기 있어요, 라고 말해보세요', 'Here you are.', ['here it is', 'here you go']),
      T('Thank you. Breakfast is from seven to ten.', '감사합니다. 조식은 7시부터 10시까지예요.'),
      U('와이파이가 있는지 물어보세요', 'Is there free Wi-Fi?', ['do you have wifi', 'is there wifi']),
      T('Yes, the password is on your key card. Enjoy your stay!', '네, 비밀번호는 키카드에 있어요. 즐겁게 머무세요!'),
    ],
    vocab: [
      { t: 'I have a reservation under Kim.', ko: '김으로 예약했어요.' },
      { t: 'Here you are.', ko: '여기 있어요.' },
      { t: 'Is there free Wi-Fi?', ko: '무료 와이파이가 있나요?' },
    ],
  },
  'en-everyday-greeting': {
    lang: 'en', trackId: 'en-everyday', title: '처음 인사하기', emoji: '👋', level: 'A1',
    turns: [
      T('Hi! Nice to meet you. How are you today?', '안녕하세요! 만나서 반가워요. 오늘 어때요?'),
      U('잘 지낸다고, 고맙다고 말해보세요', "I'm good, thank you.", ['i am good thank you', 'good thanks', 'i am fine']),
      T('Glad to hear it. What is your name?', '다행이네요. 이름이 뭐예요?'),
      U('이름을 말해보세요 (예: 제 이름은 은아예요)', 'My name is Euna.', ['my name is', 'i am euna', 'call me euna']),
      T('Nice to meet you, Euna! Where are you from?', '만나서 반가워요, 은아! 어디에서 왔어요?'),
      U('한국에서 왔다고 말해보세요', "I'm from Korea.", ['i am from korea', 'from korea']),
      T("That's wonderful. Have a great day!", '멋지네요. 좋은 하루 보내세요!'),
    ],
    vocab: [
      { t: "I'm good, thank you.", ko: '잘 지내요, 고마워요.' },
      { t: 'My name is Euna.', ko: '제 이름은 은아예요.' },
      { t: "I'm from Korea.", ko: '저는 한국에서 왔어요.' },
    ],
  },
  'en-everyday-self': {
    lang: 'en', trackId: 'en-everyday', title: '나를 소개하기', emoji: '🙋', level: 'A1',
    turns: [
      T('So, tell me a little about yourself.', '자, 자신에 대해 조금 이야기해 주세요.'),
      U('학생이라고 말해보세요', 'I am a student.', ["i'm a student", 'i study']),
      T('Nice! How old are you?', '좋아요! 몇 살이에요?'),
      U('스무 살이라고 말해보세요', 'I am twenty years old.', ["i'm twenty", 'twenty years old', 'i am 20']),
      T('And where do you live?', '어디에 살아요?'),
      U('서울에 산다고 말해보세요', 'I live in Seoul.', ['i live in seoul', 'in seoul']),
      T('Thanks for sharing. It was great talking with you!', '이야기 고마워요. 함께 이야기해서 즐거웠어요!'),
    ],
    vocab: [
      { t: 'I am a student.', ko: '저는 학생이에요.' },
      { t: 'I am twenty years old.', ko: '저는 스무 살이에요.' },
      { t: 'I live in Seoul.', ko: '저는 서울에 살아요.' },
    ],
  },
  'en-everyday-family': {
    lang: 'en', trackId: 'en-everyday', title: '가족 이야기', emoji: '👨‍👩‍👧', level: 'A2',
    turns: [
      T('Do you have any brothers or sisters?', '형제자매가 있나요?'),
      U('여동생이 한 명 있다고 말해보세요', 'I have one younger sister.', ['i have a sister', 'one younger sister']),
      T('Oh, nice! What does she do?', '오, 좋네요! 그녀는 무슨 일을 해요?'),
      U('그녀는 선생님이라고 말해보세요', 'She is a teacher.', ["she's a teacher", 'she teaches']),
      T('That sounds great. Do you live with your family?', '멋지네요. 가족과 함께 사나요?'),
      U('네, 부모님과 함께 산다고 말해보세요', 'Yes, I live with my parents.', ['i live with my parents', 'with my parents']),
      T('How lovely. Family is important!', '정말 좋네요. 가족은 중요하죠!'),
    ],
    vocab: [
      { t: 'I have one younger sister.', ko: '저는 여동생이 한 명 있어요.' },
      { t: 'She is a teacher.', ko: '그녀는 선생님이에요.' },
      { t: 'I live with my parents.', ko: '저는 부모님과 함께 살아요.' },
    ],
  },
  'en-career-interview': {
    lang: 'en', trackId: 'en-career', title: '면접 자기소개', emoji: '🧑‍💼', level: 'B1',
    turns: [
      T('Thanks for coming in. Could you introduce yourself?', '와 주셔서 감사합니다. 자기소개를 해주시겠어요?'),
      U('만나서 반갑고, 이름을 말해보세요', 'Nice to meet you. My name is Euna.', ['my name is euna', 'hello my name is euna']),
      T('Great. What is your background?', '좋습니다. 어떤 경력이 있으신가요?'),
      U('디자이너로 3년 일했다고 말해보세요', 'I worked as a designer for three years.', ['i have three years of experience', "i've worked as a designer"]),
      T('Impressive. Why do you want this job?', '인상적이네요. 왜 이 일을 원하시나요?'),
      U('새로운 것을 배우고 싶다고 말해보세요', 'I want to learn new things.', ['i want to grow', 'to learn and grow']),
      T('Wonderful answer. We will be in touch soon!', '훌륭한 답변이에요. 곧 연락드리겠습니다!'),
    ],
    vocab: [
      { t: 'Nice to meet you. My name is Euna.', ko: '만나서 반갑습니다. 제 이름은 은아예요.' },
      { t: 'I worked as a designer for three years.', ko: '저는 디자이너로 3년 일했어요.' },
      { t: 'I want to learn new things.', ko: '저는 새로운 것을 배우고 싶어요.' },
    ],
  },
  'en-career-meeting': {
    lang: 'en', trackId: 'en-career', title: '회의에서 인사', emoji: '📊', level: 'B1',
    turns: [
      T('Good morning, everyone. Shall we start the meeting?', '좋은 아침입니다, 여러분. 회의를 시작할까요?'),
      U('네, 시작하자고 말해보세요', "Yes, let's get started.", ['lets start', 'yes lets begin']),
      T('First, can you share the update on your project?', '먼저, 프로젝트 진행 상황을 공유해 주시겠어요?'),
      U('디자인을 거의 끝냈다고 말해보세요', 'I have almost finished the design.', ['the design is almost done', "i'm almost done with the design"]),
      T('Good progress. When can we launch?', '진척이 좋네요. 언제 출시할 수 있을까요?'),
      U('다음 주라고 말해보세요', 'We can launch next week.', ['next week', 'by next week']),
      T('Excellent. Thank you for the update!', '아주 좋아요. 공유해 주셔서 감사합니다!'),
    ],
    vocab: [
      { t: "Yes, let's get started.", ko: '네, 시작하죠.' },
      { t: 'I have almost finished the design.', ko: '디자인을 거의 끝냈어요.' },
      { t: 'We can launch next week.', ko: '다음 주에 출시할 수 있어요.' },
    ],
  },
  'en-career-thanks': {
    lang: 'en', trackId: 'en-career', title: '감사 인사 전하기', emoji: '🙏', level: 'A2',
    turns: [
      T('The project went really well. Great teamwork!', '프로젝트가 정말 잘 됐어요. 훌륭한 팀워크였어요!'),
      U('도와줘서 고맙다고 말해보세요', 'Thank you for your help.', ['thanks for your help', 'i appreciate your help']),
      T('Of course. It was a pleasure working with you.', '당연하죠. 함께 일해서 즐거웠어요.'),
      U('저도 즐거웠다고 말해보세요', 'It was a pleasure for me too.', ['me too', 'the pleasure was mine']),
      T('Let us work together again soon.', '곧 또 함께 일해요.'),
      U('그러길 기대한다고 말해보세요', 'I look forward to it.', ['i hope so', 'looking forward to it']),
      T('Wonderful. Take care and see you soon!', '좋아요. 잘 지내고 곧 봐요!'),
    ],
    vocab: [
      { t: 'Thank you for your help.', ko: '도와주셔서 감사합니다.' },
      { t: 'It was a pleasure for me too.', ko: '저도 즐거웠어요.' },
      { t: 'I look forward to it.', ko: '기대할게요.' },
    ],
  },

  /* ═══════════════ 일본어 ═══════════════ */
  'ja-travel-airport': {
    lang: 'ja', trackId: 'ja-travel', title: '공항 체크인', emoji: '🛫', level: 'N5',
    turns: [
      T('パスポートを見せてください。', '여권을 보여주세요.'),
      U('여기 있어요 (はい、どうぞ)', 'はい、どうぞ。', ['どうぞ', 'これです']),
      T('ありがとうございます。どこへ行きますか？', '감사합니다. 어디로 가세요?'),
      U('도쿄에 간다고 말해보세요 (とうきょうへ いきます)', '東京へ行きます。', ['とうきょうへいきます', '東京に行きます']),
      T('いい旅を！', '좋은 여행 되세요!'),
      U('감사합니다 (ありがとうございます)', 'ありがとうございます。', ['ありがとう', 'どうもありがとう']),
    ],
    vocab: [
      { t: 'はい、どうぞ。', ko: '네, 여기 있어요.' },
      { t: '東京へ行きます。', ko: '도쿄에 가요.' },
      { t: 'ありがとうございます。', ko: '감사합니다.' },
    ],
  },
  'ja-travel-restaurant': {
    lang: 'ja', trackId: 'ja-travel', title: '식당에서 주문', emoji: '🍜', level: 'N5',
    turns: [
      T('いらっしゃいませ。ご注文は？', '어서 오세요. 주문하시겠어요?'),
      U('라멘 주세요 (ラーメンを ください)', 'ラーメンをください。', ['ラーメンお願いします', 'らーめんをください']),
      T('お飲み物は？', '음료는요?'),
      U('물 주세요 (おみずを ください)', 'お水をください。', ['水をください', 'おみずをください']),
      T('かしこまりました。', '알겠습니다.'),
      U('계산해 주세요 (おかいけい おねがいします)', 'お会計お願いします。', ['お会計をお願いします', 'おかいけいおねがいします']),
      T('ありがとうございました！', '감사합니다!'),
    ],
    vocab: [
      { t: 'ラーメンをください。', ko: '라멘 주세요.' },
      { t: 'お水をください。', ko: '물 주세요.' },
      { t: 'お会計お願いします。', ko: '계산해 주세요.' },
    ],
  },
  'ja-travel-direction': {
    lang: 'ja', trackId: 'ja-travel', title: '길 물어보기', emoji: '🗺️', level: 'N5',
    turns: [
      T('どうしましたか？', '무슨 일이세요?'),
      U('역이 어디인지 물어보세요 (えきは どこですか)', '駅はどこですか？', ['えきはどこですか', '駅はどこ']),
      T('まっすぐ行ってください。', '쭉 가세요.'),
      U('얼마나 걸리는지 물어보세요 (どのくらい かかりますか)', 'どのくらいかかりますか？', ['どのくらいかかりますか', 'なんぷんかかりますか']),
      T('五分ぐらいです。', '5분 정도예요.'),
      U('감사합니다 (ありがとうございます)', 'ありがとうございます。', ['ありがとう', 'どうも']),
    ],
    vocab: [
      { t: '駅はどこですか？', ko: '역이 어디예요?' },
      { t: 'どのくらいかかりますか？', ko: '얼마나 걸려요?' },
      { t: 'ありがとうございます。', ko: '감사합니다.' },
    ],
  },
  'ja-everyday-greeting': {
    lang: 'ja', trackId: 'ja-everyday', title: '처음 인사하기', emoji: '👋', level: 'N5',
    turns: [
      T('はじめまして。お名前は？', '처음 뵙겠습니다. 이름이 뭐예요?'),
      U('제 이름은 은아예요 (わたしは ウナです)', '私はウナです。', ['ウナです', 'わたしはうなです', '名前はウナです']),
      T('どこから来ましたか？', '어디에서 왔어요?'),
      U('한국에서 왔어요 (かんこくから きました)', '韓国から来ました。', ['かんこくからきました', '韓国から来ました']),
      T('よろしくお願いします。', '잘 부탁합니다.'),
      U('저도 잘 부탁해요 (よろしく おねがいします)', 'よろしくお願いします。', ['よろしく', 'よろしくおねがいします']),
    ],
    vocab: [
      { t: '私はウナです。', ko: '제 이름은 은아예요.' },
      { t: '韓国から来ました。', ko: '한국에서 왔어요.' },
      { t: 'よろしくお願いします。', ko: '잘 부탁합니다.' },
    ],
  },
  'ja-everyday-self': {
    lang: 'ja', trackId: 'ja-everyday', title: '나를 소개하기', emoji: '🙋', level: 'N5',
    turns: [
      T('お仕事は何ですか？', '직업이 뭐예요?'),
      U('학생이에요 (がくせいです)', '学生です。', ['がくせいです', 'わたしは学生です']),
      T('何歳ですか？', '몇 살이에요?'),
      U('스무 살이에요 (はたちです)', '二十歳です。', ['はたちです', '20歳です', 'にじゅっさいです']),
      T('よろしくお願いします。', '잘 부탁합니다.'),
      U('저도 잘 부탁해요 (よろしく おねがいします)', 'よろしくお願いします。', ['よろしく', 'よろしくおねがいします']),
    ],
    vocab: [
      { t: '学生です。', ko: '학생이에요.' },
      { t: '二十歳です。', ko: '스무 살이에요.' },
      { t: 'よろしくお願いします。', ko: '잘 부탁합니다.' },
    ],
  },
  'ja-everyday-hobby': {
    lang: 'ja', trackId: 'ja-everyday', title: '취미 이야기', emoji: '🎨', level: 'N4',
    turns: [
      T('趣味は何ですか？', '취미가 뭐예요?'),
      U('그림 그리기를 좋아해요 (えを かくのが すきです)', '絵を描くのが好きです。', ['えをかくのがすきです', '絵が好きです']),
      T('いいですね！よく描きますか？', '좋네요! 자주 그려요?'),
      U('거의 매일이요 (まいにち かきます)', '毎日描きます。', ['まいにちかきます', 'ほぼ毎日です']),
      T('すごいですね！', '대단해요!'),
      U('감사합니다 (ありがとうございます)', 'ありがとうございます。', ['ありがとう', 'どうも']),
    ],
    vocab: [
      { t: '絵を描くのが好きです。', ko: '그림 그리기를 좋아해요.' },
      { t: '毎日描きます。', ko: '매일 그려요.' },
      { t: 'ありがとうございます。', ko: '감사합니다.' },
    ],
  },
  'ja-career-interview': {
    lang: 'ja', trackId: 'ja-career', title: '면접 자기소개', emoji: '🧑‍💼', level: 'N4',
    turns: [
      T('自己紹介をお願いします。', '자기소개를 부탁드립니다.'),
      U('은아라고 합니다, 잘 부탁드립니다 (ウナと もうします)', 'ウナと申します。よろしくお願いします。', ['ウナともうします', 'ウナです。よろしくお願いします']),
      T('経験はありますか？', '경험이 있으세요?'),
      U('3년 일했어요 (さんねん はたらきました)', '三年間働きました。', ['さんねんかんはたらきました', '3年働きました']),
      T('ありがとうございました。', '감사합니다.'),
      U('잘 부탁드립니다 (よろしく おねがいします)', 'よろしくお願いします。', ['よろしく', 'よろしくおねがいします']),
    ],
    vocab: [
      { t: 'ウナと申します。よろしくお願いします。', ko: '은아라고 합니다. 잘 부탁드립니다.' },
      { t: '三年間働きました。', ko: '3년간 일했어요.' },
      { t: 'よろしくお願いします。', ko: '잘 부탁드립니다.' },
    ],
  },
  'ja-career-meeting': {
    lang: 'ja', trackId: 'ja-career', title: '회의에서 인사', emoji: '📊', level: 'N4',
    turns: [
      T('会議を始めましょう。', '회의를 시작합시다.'),
      U('네, 시작하죠 (はい、はじめましょう)', 'はい、始めましょう。', ['はじめましょう', 'はい、はじめましょう']),
      T('進み具合はどうですか？', '진행 상황은 어때요?'),
      U('거의 끝났어요 (ほぼ おわりました)', 'ほぼ終わりました。', ['ほとんど終わりました', 'ほぼおわりました']),
      T('ありがとうございます。', '감사합니다.'),
      U('감사합니다 (ありがとうございます)', 'ありがとうございます。', ['ありがとう', 'どうも']),
    ],
    vocab: [
      { t: 'はい、始めましょう。', ko: '네, 시작하죠.' },
      { t: 'ほぼ終わりました。', ko: '거의 끝났어요.' },
      { t: 'ありがとうございます。', ko: '감사합니다.' },
    ],
  },
  'ja-career-thanks': {
    lang: 'ja', trackId: 'ja-career', title: '감사 인사 전하기', emoji: '🙏', level: 'N5',
    turns: [
      T('お疲れ様でした。', '수고하셨습니다.'),
      U('감사합니다 (ありがとうございました)', 'ありがとうございました。', ['どうもありがとうございました', 'ありがとうございます']),
      T('また一緒に働きましょう。', '또 같이 일해요.'),
      U('네, 잘 부탁드립니다 (よろしく おねがいします)', 'はい、よろしくお願いします。', ['よろしくおねがいします', 'はい、よろしく']),
      T('では、また。', '그럼, 또 봐요.'),
      U('안녕히 계세요 (さようなら)', 'さようなら。', ['さよなら', 'では、また']),
    ],
    vocab: [
      { t: 'ありがとうございました。', ko: '감사했습니다.' },
      { t: 'はい、よろしくお願いします。', ko: '네, 잘 부탁드립니다.' },
      { t: 'さようなら。', ko: '안녕히 계세요.' },
    ],
  },

  /* ═══════════════ 중국어 ═══════════════ */
  'zh-travel-airport': {
    lang: 'zh', trackId: 'zh-travel', title: '공항 체크인', emoji: '🛫', level: 'HSK1',
    turns: [
      T('你好，请出示护照。', '안녕하세요, 여권을 보여주세요.'),
      U('여기 있어요 (gěi nín)', '给您。', ['给你', '这是我的护照']),
      T('你去哪里？', '어디 가세요?'),
      U('베이징에 가요 (wǒ qù běijīng)', '我去北京。', ['去北京', '我要去北京']),
      T('祝你旅途愉快！', '즐거운 여행 되세요!'),
      U('감사합니다 (xièxie)', '谢谢。', ['谢谢你', '谢谢您']),
    ],
    vocab: [
      { t: '给您。', ko: '여기 있어요.' },
      { t: '我去北京。', ko: '베이징에 가요.' },
      { t: '谢谢。', ko: '감사합니다.' },
    ],
  },
  'zh-travel-restaurant': {
    lang: 'zh', trackId: 'zh-travel', title: '식당에서 주문', emoji: '🍜', level: 'HSK1',
    turns: [
      T('你想吃什么？', '뭐 드시겠어요?'),
      U('면 주세요 (wǒ yào yì wǎn miàn)', '我要一碗面。', ['来一碗面', '我想要面']),
      T('喝点什么？', '뭐 마실래요?'),
      U('물 주세요 (wǒ yào shuǐ)', '我要水。', ['来一杯水', '请给我水']),
      T('好的，请稍等。', '네, 잠시만요.'),
      U('계산할게요 (mǎi dān)', '买单。', ['结账', '买单谢谢']),
    ],
    vocab: [
      { t: '我要一碗面。', ko: '면 한 그릇 주세요.' },
      { t: '我要水。', ko: '물 주세요.' },
      { t: '买单。', ko: '계산할게요.' },
    ],
  },
  'zh-travel-direction': {
    lang: 'zh', trackId: 'zh-travel', title: '길 물어보기', emoji: '🗺️', level: 'HSK1',
    turns: [
      T('你需要帮忙吗？', '도와드릴까요?'),
      U('역이 어디예요 (chēzhàn zài nǎlǐ)', '车站在哪里？', ['请问车站在哪里', '火车站在哪里']),
      T('一直走就到了。', '쭉 가면 나와요.'),
      U('얼마나 걸려요 (yào duō jiǔ)', '要多久？', ['要多长时间', '远吗']),
      T('大概五分钟。', '5분 정도예요.'),
      U('감사합니다 (xièxie nǐ)', '谢谢你。', ['谢谢', '谢谢您']),
    ],
    vocab: [
      { t: '车站在哪里？', ko: '역이 어디예요?' },
      { t: '要多久？', ko: '얼마나 걸려요?' },
      { t: '谢谢你。', ko: '감사합니다.' },
    ],
  },
  'zh-everyday-greeting': {
    lang: 'zh', trackId: 'zh-everyday', title: '처음 인사하기', emoji: '👋', level: 'HSK1',
    turns: [
      T('你好！你叫什么名字？', '안녕하세요! 이름이 뭐예요?'),
      U('제 이름은 은아예요 (wǒ jiào ēnyǎ)', '我叫恩雅。', ['我的名字是恩雅', '我叫恩娥']),
      T('你从哪里来？', '어디에서 왔어요?'),
      U('한국에서 왔어요 (wǒ cóng hánguó lái)', '我从韩国来。', ['我是韩国人', '我来自韩国']),
      T('很高兴认识你。', '만나서 반가워요.'),
      U('저도 반가워요 (hěn gāoxìng)', '很高兴认识你。', ['很高兴见到你', '我也很高兴']),
    ],
    vocab: [
      { t: '我叫恩雅。', ko: '제 이름은 은아예요.' },
      { t: '我从韩国来。', ko: '한국에서 왔어요.' },
      { t: '很高兴认识你。', ko: '만나서 반가워요.' },
    ],
  },
  'zh-everyday-self': {
    lang: 'zh', trackId: 'zh-everyday', title: '나를 소개하기', emoji: '🙋', level: 'HSK1',
    turns: [
      T('你做什么工作？', '직업이 뭐예요?'),
      U('학생이에요 (wǒ shì xuéshēng)', '我是学生。', ['我是个学生', '学生']),
      T('你住在哪里？', '어디에 살아요?'),
      U('서울에 살아요 (wǒ zhù zài shǒu\'ěr)', '我住在首尔。', ['我在首尔住', '住在首尔']),
      T('好的，谢谢。', '네, 감사합니다.'),
      U('감사합니다 (xièxie)', '谢谢。', ['谢谢你', '谢谢您']),
    ],
    vocab: [
      { t: '我是学生。', ko: '저는 학생이에요.' },
      { t: '我住在首尔。', ko: '저는 서울에 살아요.' },
      { t: '谢谢。', ko: '감사합니다.' },
    ],
  },
  'zh-everyday-hobby': {
    lang: 'zh', trackId: 'zh-everyday', title: '취미 이야기', emoji: '🎨', level: 'HSK2',
    turns: [
      T('你有什么爱好？', '취미가 뭐예요?'),
      U('그림 그리기를 좋아해요 (wǒ xǐhuān huàhuà)', '我喜欢画画。', ['我爱画画', '喜欢画画']),
      T('很好！你常画吗？', '좋네요! 자주 그려요?'),
      U('거의 매일이요 (jīhū měitiān)', '几乎每天。', ['差不多每天', '每天都画']),
      T('太棒了！', '멋져요!'),
      U('감사합니다 (xièxie)', '谢谢。', ['谢谢你', '谢谢您']),
    ],
    vocab: [
      { t: '我喜欢画画。', ko: '그림 그리기를 좋아해요.' },
      { t: '几乎每天。', ko: '거의 매일이요.' },
      { t: '谢谢。', ko: '감사합니다.' },
    ],
  },
  'zh-career-interview': {
    lang: 'zh', trackId: 'zh-career', title: '면접 자기소개', emoji: '🧑‍💼', level: 'HSK2',
    turns: [
      T('请做个自我介绍。', '자기소개를 해주세요.'),
      U('안녕하세요, 저는 은아입니다 (nǐ hǎo, wǒ jiào ēnyǎ)', '你好，我叫恩雅。', ['我是恩雅', '您好我叫恩雅']),
      T('你有什么经验？', '어떤 경험이 있으세요?'),
      U('3년 일했어요 (wǒ gōngzuò le sān nián)', '我工作了三年。', ['我有三年经验', '工作了三年']),
      T('好的，谢谢。', '네, 감사합니다.'),
      U('감사합니다 (xièxie)', '谢谢。', ['谢谢你', '谢谢您']),
    ],
    vocab: [
      { t: '你好，我叫恩雅。', ko: '안녕하세요, 저는 은아입니다.' },
      { t: '我工作了三年。', ko: '저는 3년 일했어요.' },
      { t: '谢谢。', ko: '감사합니다.' },
    ],
  },
  'zh-career-meeting': {
    lang: 'zh', trackId: 'zh-career', title: '회의에서 인사', emoji: '📊', level: 'HSK2',
    turns: [
      T('我们开始开会吧。', '회의를 시작합시다.'),
      U('네, 시작하죠 (hǎo, wǒmen kāishǐ ba)', '好，我们开始吧。', ['好的开始吧', '我们开始吧']),
      T('进展怎么样？', '진행 상황은 어때요?'),
      U('거의 다 됐어요 (kuài wánchéng le)', '快完成了。', ['差不多完成了', '快做完了']),
      T('好的，谢谢。', '네, 감사합니다.'),
      U('감사합니다 (xièxie)', '谢谢。', ['谢谢你', '谢谢您']),
    ],
    vocab: [
      { t: '好，我们开始吧。', ko: '네, 시작하죠.' },
      { t: '快完成了。', ko: '거의 다 됐어요.' },
      { t: '谢谢。', ko: '감사합니다.' },
    ],
  },
  'zh-career-thanks': {
    lang: 'zh', trackId: 'zh-career', title: '감사 인사 전하기', emoji: '🙏', level: 'HSK1',
    turns: [
      T('辛苦了！', '수고하셨어요!'),
      U('도와줘서 고마워요 (xièxie nǐ de bāngzhù)', '谢谢你的帮助。', ['谢谢你', '非常感谢']),
      T('下次再合作。', '다음에 또 협업해요.'),
      U('네, 기대할게요 (qídài xià cì)', '好，期待下次。', ['期待下次合作', '好的期待']),
      T('再见！', '안녕히 가세요!'),
      U('안녕히 계세요 (zàijiàn)', '再见。', ['再见了', '拜拜']),
    ],
    vocab: [
      { t: '谢谢你的帮助。', ko: '도와줘서 고마워요.' },
      { t: '好，期待下次。', ko: '네, 다음이 기대돼요.' },
      { t: '再见。', ko: '안녕히 가세요.' },
    ],
  },
};

/* 트랙별 레슨 순서 (잠금 해제 순서) */
window.TRACK_LESSONS = {
  'en-travel':   ['en-travel-airport', 'en-travel-cafe', 'en-travel-directions', 'en-travel-hotel'],
  'en-everyday': ['en-everyday-greeting', 'en-everyday-self', 'en-everyday-family'],
  'en-career':   ['en-career-interview', 'en-career-meeting', 'en-career-thanks'],
  'ja-travel':   ['ja-travel-airport', 'ja-travel-restaurant', 'ja-travel-direction'],
  'ja-everyday': ['ja-everyday-greeting', 'ja-everyday-self', 'ja-everyday-hobby'],
  'ja-career':   ['ja-career-interview', 'ja-career-meeting', 'ja-career-thanks'],
  'zh-travel':   ['zh-travel-airport', 'zh-travel-restaurant', 'zh-travel-direction'],
  'zh-everyday': ['zh-everyday-greeting', 'zh-everyday-self', 'zh-everyday-hobby'],
  'zh-career':   ['zh-career-interview', 'zh-career-meeting', 'zh-career-thanks'],
};
