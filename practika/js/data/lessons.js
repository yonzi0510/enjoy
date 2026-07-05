/* 프랙티카 놀이터 — 트랙·레슨·대본·어휘 데이터
 *
 * 대화 엔진이 읽는 대본 구조:
 *   turns[]  — 순서대로 진행되는 대화 턴
 *     { speaker:'tutor', en, ko }                     튜터가 말하는 대사(+한국어 자막)
 *     { speaker:'user', ask, model, expect:[...] }    내가 말할 차례
 *        ask    : 무엇을 말해야 하는지 한국어 안내
 *        model  : 모범 답안(영어) — 자막·듣기·채점 기준
 *        expect : 정답으로 인정하는 표현들(소문자, 여러 변형). model 도 자동 포함된다.
 *   vocab[]  — 복습 카드용 핵심 표현 { en, ko }
 *
 * 정답 판정은 match.js 의 퍼지 매칭(정규화 + 토큰 + 편집거리)으로 점수화한다.
 */
window.TRACKS = [
  { id: 'travel',   title: '여행 영어',   emoji: '🧳', color: '#5FB0E8', desc: '공항·카페·길찾기·호텔' },
  { id: 'everyday', title: '일상 영어',   emoji: '☕', color: '#F19E4B', desc: '인사·소개·가족·취미' },
  { id: 'career',   title: '비즈니스 영어', emoji: '💼', color: '#8A7BE0', desc: '면접·회의·일정·감사' },
];

/* 유저 턴 헬퍼: expect 에 model 을 자동 포함 */
function U(ask, model, expect) {
  return { speaker: 'user', ask, model, expect: (expect || []).concat([model]) };
}
function T(en, ko) { return { speaker: 'tutor', en, ko }; }

window.LESSONS = {
  /* ───────────────── 여행 영어 ───────────────── */
  'travel-airport': {
    trackId: 'travel', title: '공항 체크인', emoji: '🛫', level: 'A1',
    turns: [
      T('Hello! May I see your passport, please?', '안녕하세요! 여권을 보여주시겠어요?'),
      U('여기 있어요, 라고 말해보세요', 'Here it is.', ['here you are', 'here you go', 'here it is']),
      T('Thank you. Where are you flying today?', '감사합니다. 오늘 어디로 가시나요?'),
      U('뉴욕으로 간다고 말해보세요', "I'm flying to New York.", ['i am flying to new york', 'to new york', "i'm going to new york"]),
      T('Great. Do you have any bags to check in?', '좋아요. 부칠 짐이 있나요?'),
      U('가방 하나 있다고 말해보세요', 'Yes, I have one bag.', ['i have one bag', 'yes one bag', 'i have a bag']),
      T('Perfect. Here is your boarding pass. Have a nice flight!', '완벽해요. 탑승권 여기 있어요. 즐거운 비행 되세요!'),
      U('감사합니다, 라고 말해보세요', 'Thank you very much.', ['thank you', 'thanks', 'thank you so much']),
    ],
    vocab: [
      { en: 'Here it is.', ko: '여기 있어요.' },
      { en: "I'm flying to New York.", ko: '뉴욕으로 가요.' },
      { en: 'I have one bag.', ko: '가방이 하나 있어요.' },
      { en: 'Thank you very much.', ko: '정말 감사합니다.' },
    ],
  },
  'travel-cafe': {
    trackId: 'travel', title: '카페에서 주문하기', emoji: '☕', level: 'A1',
    turns: [
      T('Hi! Welcome. What can I get you?', '안녕하세요! 무엇을 드릴까요?'),
      U('커피 한 잔 달라고 말해보세요', 'A coffee, please.', ['can i get a coffee', 'i would like a coffee', 'one coffee please', 'coffee please']),
      T('Sure! Would you like it hot or iced?', '네! 따뜻한 걸로 드릴까요, 아이스로 드릴까요?'),
      U('아이스로 달라고 말해보세요', 'Iced, please.', ['iced please', 'i want it iced', 'cold please', 'iced']),
      T('Got it. Anything else?', '알겠어요. 더 필요하신 거 있나요?'),
      U("괜찮다고, 그게 다라고 말해보세요", "No, that's all.", ["that's all", 'no thank you', "that is all", 'no thanks']),
      T('That will be four dollars.', '4달러입니다.'),
      U('여기 있어요, 라고 말해보세요', 'Here you go.', ['here you are', 'here it is', 'here']),
      T('Thank you! Have a great day!', '감사합니다! 좋은 하루 보내세요!'),
    ],
    vocab: [
      { en: 'A coffee, please.', ko: '커피 한 잔 주세요.' },
      { en: 'Iced, please.', ko: '아이스로 주세요.' },
      { en: "No, that's all.", ko: '아니요, 그게 다예요.' },
      { en: 'Here you go.', ko: '여기 있어요.' },
    ],
  },
  'travel-directions': {
    trackId: 'travel', title: '길 물어보기', emoji: '🗺️', level: 'A2',
    turns: [
      T('Hi there! You look a little lost. Can I help?', '안녕하세요! 길을 잃으신 것 같네요. 도와드릴까요?'),
      U('실례지만 역이 어디인지 물어보세요', 'Excuse me, where is the station?', ['where is the station', 'how do i get to the station', 'excuse me where is the train station']),
      T("It's just around the corner, next to the bank.", '모퉁이를 돌면 바로, 은행 옆에 있어요.'),
      U('걸어서 얼마나 걸리는지 물어보세요', 'How long does it take to walk?', ['how long does it take', 'is it far', 'how far is it']),
      T('Only about five minutes.', '5분 정도밖에 안 걸려요.'),
      U('도와줘서 고맙다고 말해보세요', 'Thank you for your help.', ['thanks for your help', 'thank you so much', 'thank you']),
      T("You're welcome. Enjoy your trip!", '천만에요. 즐거운 여행 되세요!'),
    ],
    vocab: [
      { en: 'Excuse me, where is the station?', ko: '실례지만, 역이 어디예요?' },
      { en: 'How long does it take to walk?', ko: '걸어서 얼마나 걸려요?' },
      { en: 'Thank you for your help.', ko: '도와주셔서 감사합니다.' },
    ],
  },
  'travel-hotel': {
    trackId: 'travel', title: '호텔 체크인', emoji: '🏨', level: 'A2',
    turns: [
      T('Good evening! Do you have a reservation?', '안녕하세요! 예약하셨나요?'),
      U('네, 이름으로 예약했다고 말해보세요', 'Yes, I have a reservation under Kim.', ['i have a reservation', 'yes under kim', 'i booked a room']),
      T('Let me check. Yes, a room for two nights. May I have your passport?', '확인해 볼게요. 네, 2박이네요. 여권 주시겠어요?'),
      U('여기 있어요, 라고 말해보세요', 'Here you are.', ['here it is', 'here you go', 'sure here']),
      T('Thank you. What time is breakfast? I can tell you — from seven to ten.', '감사합니다. 조식은 7시부터 10시까지예요.'),
      U('와이파이가 있는지 물어보세요', 'Is there free Wi-Fi?', ['do you have wifi', 'is there wifi', 'is the wifi free']),
      T('Yes, the password is on your key card. Enjoy your stay!', '네, 비밀번호는 키카드에 있어요. 즐겁게 머무세요!'),
    ],
    vocab: [
      { en: 'I have a reservation under Kim.', ko: '김으로 예약했어요.' },
      { en: 'Here you are.', ko: '여기 있어요.' },
      { en: 'Is there free Wi-Fi?', ko: '무료 와이파이가 있나요?' },
    ],
  },

  /* ───────────────── 일상 영어 ───────────────── */
  'everyday-greeting': {
    trackId: 'everyday', title: '처음 인사하기', emoji: '👋', level: 'A1',
    turns: [
      T('Hi! Nice to meet you. How are you today?', '안녕하세요! 만나서 반가워요. 오늘 어때요?'),
      U('잘 지낸다고, 고맙다고 말해보세요', "I'm good, thank you.", ['i am good thank you', "i'm fine thanks", 'good thanks', 'i am fine']),
      T('Glad to hear it. What is your name?', '다행이네요. 이름이 뭐예요?'),
      U('이름을 말해보세요 (예: 제 이름은 은아예요)', 'My name is Euna.', ['my name is', "i'm euna", 'i am euna', 'call me euna']),
      T('Nice to meet you, Euna! Where are you from?', '만나서 반가워요, 은아! 어디에서 왔어요?'),
      U('한국에서 왔다고 말해보세요', "I'm from Korea.", ['i am from korea', 'from korea', 'i come from korea']),
      T("That's wonderful. Have a great day!", '멋지네요. 좋은 하루 보내세요!'),
    ],
    vocab: [
      { en: "I'm good, thank you.", ko: '잘 지내요, 고마워요.' },
      { en: 'My name is Euna.', ko: '제 이름은 은아예요.' },
      { en: "I'm from Korea.", ko: '저는 한국에서 왔어요.' },
    ],
  },
  'everyday-self': {
    trackId: 'everyday', title: '나를 소개하기', emoji: '🙋', level: 'A1',
    turns: [
      T('So, tell me a little about yourself.', '자, 자신에 대해 조금 이야기해 주세요.'),
      U('학생이라고 말해보세요', 'I am a student.', ["i'm a student", 'i study', 'i am student']),
      T('Nice! How old are you?', '좋아요! 몇 살이에요?'),
      U('스무 살이라고 말해보세요 (예: 저는 20살이에요)', 'I am twenty years old.', ["i'm twenty", 'twenty years old', 'i am 20']),
      T('And where do you live?', '어디에 살아요?'),
      U('서울에 산다고 말해보세요', 'I live in Seoul.', ['i live in seoul', 'in seoul', 'i am from seoul']),
      T('Thanks for sharing. It was great talking with you!', '이야기 고마워요. 함께 이야기해서 즐거웠어요!'),
    ],
    vocab: [
      { en: 'I am a student.', ko: '저는 학생이에요.' },
      { en: 'I am twenty years old.', ko: '저는 스무 살이에요.' },
      { en: 'I live in Seoul.', ko: '저는 서울에 살아요.' },
    ],
  },
  'everyday-family': {
    trackId: 'everyday', title: '가족 이야기', emoji: '👨‍👩‍👧', level: 'A2',
    turns: [
      T('Do you have any brothers or sisters?', '형제자매가 있나요?'),
      U('여동생이 한 명 있다고 말해보세요', 'I have one younger sister.', ['i have a sister', 'one younger sister', 'i have one sister']),
      T('Oh, nice! What does she do?', '오, 좋네요! 그녀는 무슨 일을 해요?'),
      U('그녀는 선생님이라고 말해보세요', 'She is a teacher.', ["she's a teacher", 'she teaches', 'a teacher']),
      T('That sounds great. Do you live with your family?', '멋지네요. 가족과 함께 사나요?'),
      U('네, 부모님과 함께 산다고 말해보세요', 'Yes, I live with my parents.', ['i live with my parents', 'with my parents', 'yes with my family']),
      T('How lovely. Family is important!', '정말 좋네요. 가족은 중요하죠!'),
    ],
    vocab: [
      { en: 'I have one younger sister.', ko: '저는 여동생이 한 명 있어요.' },
      { en: 'She is a teacher.', ko: '그녀는 선생님이에요.' },
      { en: 'I live with my parents.', ko: '저는 부모님과 함께 살아요.' },
    ],
  },
  'everyday-hobby': {
    trackId: 'everyday', title: '취미 이야기', emoji: '🎨', level: 'A2',
    turns: [
      T('What do you like to do in your free time?', '여가 시간에 뭘 하는 걸 좋아해요?'),
      U('그림 그리는 걸 좋아한다고 말해보세요', 'I like to draw.', ['i like drawing', 'i love to draw', 'i enjoy drawing']),
      T('That is a wonderful hobby! How often do you draw?', '멋진 취미네요! 얼마나 자주 그려요?'),
      U('거의 매일 그린다고 말해보세요', 'Almost every day.', ['every day', 'almost everyday', 'i draw every day']),
      T('Impressive! What do you like to draw?', '대단해요! 뭘 그리는 걸 좋아해요?'),
      U('동물 그리는 걸 좋아한다고 말해보세요', 'I like to draw animals.', ['i draw animals', 'animals', 'i like drawing animals']),
      T('Animals are so much fun to draw. Keep it up!', '동물은 그리기 정말 재밌죠. 계속 해봐요!'),
    ],
    vocab: [
      { en: 'I like to draw.', ko: '저는 그림 그리는 걸 좋아해요.' },
      { en: 'Almost every day.', ko: '거의 매일이요.' },
      { en: 'I like to draw animals.', ko: '저는 동물 그리는 걸 좋아해요.' },
    ],
  },

  /* ───────────────── 비즈니스 영어 ───────────────── */
  'career-interview': {
    trackId: 'career', title: '면접 자기소개', emoji: '🧑‍💼', level: 'B1',
    turns: [
      T('Thanks for coming in. Could you introduce yourself?', '와 주셔서 감사합니다. 자기소개를 해주시겠어요?'),
      U('만나서 반갑고, 이름을 말해보세요', 'Nice to meet you. My name is Euna.', ['my name is euna', "i'm euna nice to meet you", 'hello my name is euna']),
      T('Great. What is your background?', '좋습니다. 어떤 경력이 있으신가요?'),
      U('디자이너로 3년 일했다고 말해보세요', 'I worked as a designer for three years.', ['i have three years of experience', "i've worked as a designer", 'i was a designer for three years']),
      T('Impressive. Why do you want this job?', '인상적이네요. 왜 이 일을 원하시나요?'),
      U('새로운 것을 배우고 싶다고 말해보세요', 'I want to learn new things.', ['i want to grow', 'to learn and grow', 'i would like to learn new things']),
      T('Wonderful answer. We will be in touch soon!', '훌륭한 답변이에요. 곧 연락드리겠습니다!'),
    ],
    vocab: [
      { en: 'Nice to meet you. My name is Euna.', ko: '만나서 반갑습니다. 제 이름은 은아예요.' },
      { en: 'I worked as a designer for three years.', ko: '저는 디자이너로 3년 일했어요.' },
      { en: 'I want to learn new things.', ko: '저는 새로운 것을 배우고 싶어요.' },
    ],
  },
  'career-meeting': {
    trackId: 'career', title: '회의에서 인사', emoji: '📊', level: 'B1',
    turns: [
      T('Good morning, everyone. Shall we start the meeting?', '좋은 아침입니다, 여러분. 회의를 시작할까요?'),
      U('네, 시작하자고 말해보세요', "Yes, let's get started.", ['lets start', 'yes lets begin', 'sure lets start']),
      T('First, can you share the update on your project?', '먼저, 프로젝트 진행 상황을 공유해 주시겠어요?'),
      U('디자인을 거의 끝냈다고 말해보세요', 'I have almost finished the design.', ['the design is almost done', "i'm almost done with the design", 'i nearly finished the design']),
      T('Good progress. When can we launch?', '진척이 좋네요. 언제 출시할 수 있을까요?'),
      U('다음 주라고 말해보세요', 'We can launch next week.', ['next week', 'by next week', 'we will launch next week']),
      T('Excellent. Thank you for the update!', '아주 좋아요. 공유해 주셔서 감사합니다!'),
    ],
    vocab: [
      { en: "Yes, let's get started.", ko: '네, 시작하죠.' },
      { en: 'I have almost finished the design.', ko: '디자인을 거의 끝냈어요.' },
      { en: 'We can launch next week.', ko: '다음 주에 출시할 수 있어요.' },
    ],
  },
  'career-schedule': {
    trackId: 'career', title: '일정 잡기', emoji: '📅', level: 'B1',
    turns: [
      T('Are you free to meet this week?', '이번 주에 만날 시간 있으세요?'),
      U('화요일이 괜찮은지 물어보세요', 'Does Tuesday work for you?', ['is tuesday okay', 'can we meet on tuesday', 'how about tuesday']),
      T('Tuesday is a bit busy. How about Wednesday?', '화요일은 조금 바빠요. 수요일은 어때요?'),
      U('수요일 좋다고, 몇 시인지 물어보세요', 'Wednesday works. What time?', ['wednesday is fine what time', 'sure wednesday what time', 'okay wednesday what time works']),
      T('Let us say two in the afternoon.', '오후 2시로 하죠.'),
      U('완벽하다고, 그때 보자고 말해보세요', 'Perfect, see you then.', ['see you then', 'great see you then', 'sounds good see you then']),
      T('Great, I will send an invite. Talk soon!', '좋아요, 초대장 보낼게요. 곧 봐요!'),
    ],
    vocab: [
      { en: 'Does Tuesday work for you?', ko: '화요일 괜찮으세요?' },
      { en: 'Wednesday works. What time?', ko: '수요일 좋아요. 몇 시요?' },
      { en: 'Perfect, see you then.', ko: '완벽해요, 그때 봬요.' },
    ],
  },
  'career-thanks': {
    trackId: 'career', title: '감사 인사 전하기', emoji: '🙏', level: 'A2',
    turns: [
      T('The project went really well. Great teamwork!', '프로젝트가 정말 잘 됐어요. 훌륭한 팀워크였어요!'),
      U('도와줘서 고맙다고 말해보세요', 'Thank you for your help.', ['thanks for your help', 'thank you so much', 'i appreciate your help']),
      T('Of course. It was a pleasure working with you.', '당연하죠. 함께 일해서 즐거웠어요.'),
      U('저도 즐거웠다고 말해보세요', 'It was a pleasure for me too.', ['me too', 'the pleasure was mine', 'i enjoyed it too']),
      T('Let us work together again soon.', '곧 또 함께 일해요.'),
      U('그러길 기대한다고 말해보세요', 'I look forward to it.', ['i hope so', 'looking forward to it', 'me too i hope so']),
      T('Wonderful. Take care and see you soon!', '좋아요. 잘 지내고 곧 봐요!'),
    ],
    vocab: [
      { en: 'Thank you for your help.', ko: '도와주셔서 감사합니다.' },
      { en: 'It was a pleasure for me too.', ko: '저도 즐거웠어요.' },
      { en: 'I look forward to it.', ko: '기대할게요.' },
    ],
  },
};

/* 트랙별 레슨 순서 (잠금 해제 순서) */
window.TRACK_LESSONS = {
  travel:   ['travel-airport', 'travel-cafe', 'travel-directions', 'travel-hotel'],
  everyday: ['everyday-greeting', 'everyday-self', 'everyday-family', 'everyday-hobby'],
  career:   ['career-interview', 'career-meeting', 'career-schedule', 'career-thanks'],
};
