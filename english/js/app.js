/* 영어 놀이터 — 화면·흐름 로직
 * 내비게이션 스택 + history 연동: 안드로이드 시스템 뒤로가기(제스처/버튼)가
 * 앱을 종료하지 않고 이전 화면으로 이동한다.
 */
(() => {
  const $ = id => document.getElementById(id);
  const WORDS = window.WORDS || [];
  const CATS = window.CATS || [];

  const state = {
    word: null,        // 현재 답변 단어
    listening: false,
    quiz: null         // { rounds:[{answer, choices[]}], idx, score, firstTry, awaiting }
  };

  function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    $(id).classList.add('active');
  }

  /* ─────────── 내비게이션 스택 ─────────── */
  const navStack = [{ s: 'home' }];

  function renderView(v) {
    Speech.stopSpeak();
    switch (v.s) {
      case 'cats': renderCats(); showScreen('screen-cats'); break;
      case 'words': renderWords(v.cat); showScreen('screen-words'); break;
      case 'learned': renderLearned(); showScreen('screen-learned'); break;
      case 'answer': renderAnswer(v.word); showScreen('screen-answer'); break;
      case 'unknown': renderUnknown(v); showScreen('screen-unknown'); break;
      case 'quiz': showScreen('screen-quiz'); break; // 진행 중 상태 그대로 복귀
      default: renderHome(); showScreen('screen-home');
    }
  }

  function navigate(v) {
    navStack.push(v);
    try { history.pushState({ n: navStack.length }, ''); } catch (e) {}
    renderView(v);
  }

  function goBack() { history.back(); }

  function goHome() {
    // 홈은 스택을 비우는 대신 새로 쌓는다 (시스템 뒤로가기로 되짚기 가능)
    navigate({ s: 'home' });
  }

  window.addEventListener('popstate', () => {
    // 열려 있는 오버레이 정리
    Speech.stopSpeak();
    Speech.stopListen();
    state.listening = false;
    $('listen-overlay').classList.add('hidden');
    $('quiz-done-overlay').classList.add('hidden');
    if (navStack.length > 1) navStack.pop();
    renderView(navStack[navStack.length - 1]);
  });

  /* ─────────── 홈 ─────────── */
  function renderHome() {
    $('learned-count').textContent = Progress.count();
  }

  // 첫 터치: 오디오 잠금 해제 + 토끼의 인사 (토끼 버튼을 바로 누른 경우엔 마이크가 우선)
  document.addEventListener('pointerdown', e => {
    Speech.unlock();
    if (!e.target.closest || !e.target.closest('#btn-mic')) Speech.speakKo('은아야 안녕?');
  }, { once: true });

  /* ─────────── 마이크로 물어보기 ─────────── */
  function startAsk() {
    Speech.unlock();
    Speech.stopSpeak();
    if (!Speech.sttSupported()) {
      navigate({ s: 'cats' });
      Speech.speakKo('이 기기에서는 마이크를 쓸 수 없어요. 그림 단어장에서 궁금한 그림을 눌러 볼까요?');
      return;
    }
    state.listening = true;
    $('listen-interim').textContent = '';
    document.querySelector('.listen-label').textContent = '듣고 있어요…';
    $('listen-overlay').classList.remove('hidden');
    Speech.listenStart();
    Speech.startListen({
      onInterim(text) { $('listen-interim').textContent = text; },
      // 아직 말이 없어 조용히 다시 듣는 중 — 재촉하지 않는 안내
      onWaiting() { document.querySelector('.listen-label').textContent = '천천히 생각해도 돼요 🐰'; },
      onResult(alts) {
        state.listening = false;
        $('listen-overlay').classList.add('hidden');
        handleSpeech(alts);
      },
      onFail(kind) {
        if (!state.listening) return;
        state.listening = false;
        $('listen-overlay').classList.add('hidden');
        if (kind === 'denied') {
          Speech.speakKo('마이크 사용을 허락해 주세요! 그동안 그림 단어장에서 놀아도 좋아요.');
        } else {
          showUnknown('', true);
        }
      }
    });
  }

  function cancelListen() {
    state.listening = false;
    Speech.stopListen();
    $('listen-overlay').classList.add('hidden');
  }

  function handleSpeech(alts) {
    const word = Parse.findWord(alts);
    if (word) showAnswer(word);
    else showUnknown((alts && alts[0]) || '', false);
  }
  window.App = { handleSpeech, startAsk }; // 테스트 훅용

  /* ─────────── 답변 ─────────── */
  function showAnswer(word) {
    Progress.record(word.en); // 최초 진입 시에만 기록 (뒤로가기 재방문은 미기록)
    navigate({ s: 'answer', word });
  }

  function renderAnswer(word) {
    state.word = word;
    $('answer-ko-title').textContent = word.emoji + ' ' + word.ko;
    $('answer-emoji').textContent = word.emoji;
    $('answer-en').textContent = word.en.toUpperCase();
    $('answer-read').textContent = word.read;
    Speech.ding();
    setTimeout(() => {
      Speech.speakSeq([
        { lang: 'en', text: word.en },
        { lang: 'en', text: word.en, rate: 0.6 },
        { lang: 'ko', text: word.ko + '는 영어로 ' + word.read + '!' },
        { lang: 'ko', text: '따라해 보세요!' },
        { lang: 'en', text: word.en }
      ]);
    }, 350);
  }

  $('btn-again').addEventListener('click', () => { if (state.word) Speech.speakEn(state.word.en); });
  $('btn-slow').addEventListener('click', () => { if (state.word) Speech.speakEn(state.word.en, 0.55); });
  $('btn-ask-more').addEventListener('click', startAsk);
  $('answer-back').addEventListener('click', goBack);
  $('answer-home').addEventListener('click', goHome);

  /* ─────────── 모르는 단어 / 못 들음 ─────────── */
  function showUnknown(heard, noHear) {
    if (!noHear && heard) Progress.recordMiss(heard); // 부모 확인용 기록
    navigate({ s: 'unknown', heard, noHear });
  }

  function renderUnknown(v) {
    if (v.noHear) {
      $('unknown-msg').innerHTML = '앗, 잘 못 들었어요!<br>다시 한번 말해 줄래요?';
      $('unknown-heard').textContent = '';
      Speech.speakKo('앗, 잘 못 들었어요. 다시 한번 또박또박 말해 줄래요?');
    } else {
      $('unknown-msg').innerHTML = '음~ 그 단어는<br>아직 공부하고 있어요!';
      $('unknown-heard').textContent = v.heard ? '「 ' + v.heard + ' 」' : '';
      Speech.speakKo('음, 그 단어는 아직 공부하고 있어요! 그림 단어장에서 다른 단어를 구경해 볼까요?');
    }
  }
  $('unknown-retry').addEventListener('click', startAsk);
  $('unknown-dict').addEventListener('click', () => navigate({ s: 'cats' }));
  $('unknown-back').addEventListener('click', goBack);
  $('unknown-home').addEventListener('click', goHome);

  /* ─────────── 그림 단어장 ─────────── */
  function renderCats() {
    const grid = $('cat-grid');
    grid.innerHTML = '';
    CATS.forEach(cat => {
      const n = WORDS.filter(w => w.cat === cat.id).length;
      const card = document.createElement('button');
      card.className = 'cat-card';
      card.innerHTML = '<span class="cat-emoji">' + cat.emoji + '</span><span class="cat-name">' + cat.name + '</span><span class="cat-count">' + n + '개</span>';
      card.addEventListener('click', () => navigate({ s: 'words', cat }));
      grid.appendChild(card);
    });
  }

  function renderWords(cat) {
    $('words-title').innerHTML = '<span>' + cat.emoji + '</span> ' + cat.name;
    const grid = $('word-grid');
    grid.innerHTML = '';
    WORDS.filter(w => w.cat === cat.id).forEach(w => {
      const card = document.createElement('button');
      card.className = 'word-card';
      card.innerHTML = '<span class="word-emoji">' + w.emoji + '</span><span class="word-en">' + w.en + '</span>';
      card.addEventListener('click', () => showAnswer(w));
      grid.appendChild(card);
    });
  }

  $('btn-dict').addEventListener('click', () => navigate({ s: 'cats' }));
  $('cats-home').addEventListener('click', goHome);
  $('words-back').addEventListener('click', goBack);
  $('words-home').addEventListener('click', goHome);

  /* ─────────── 배운 단어 ─────────── */
  function renderLearned() {
    const list = $('learned-list');
    list.innerHTML = '';
    const items = Progress.list();
    if (!items.length) {
      list.innerHTML = '<div class="learned-empty">🐣<br>아직 배운 단어가 없어요.<br>토끼에게 물어보세요!</div>';
      Speech.speakKo('아직 배운 단어가 없어요. 토끼에게 물어보세요!');
    } else {
      items.forEach(it => {
        const w = WORDS.find(x => x.en === it.en);
        if (!w) return;
        const row = document.createElement('button');
        row.className = 'learned-row';
        row.innerHTML = '<span class="learned-emoji">' + w.emoji + '</span>' +
          '<span class="learned-word"><b>' + w.en.toUpperCase() + '</b><small>' + w.ko + ' · ' + w.read + '</small></span>' +
          '<span class="learned-times">×' + it.count + '</span>';
        row.addEventListener('click', () => showAnswer(w));
        list.appendChild(row);
      });
    }
    // 못 알아들은 말 (부모 확인용)
    const misses = Progress.listMisses();
    if (misses.length) {
      const head = document.createElement('div');
      head.className = 'miss-head';
      head.textContent = '🙋 아직 대답 못 한 말 (부모님 확인용)';
      list.appendChild(head);
      misses.forEach(m => {
        const row = document.createElement('div');
        row.className = 'miss-row';
        row.innerHTML = '<span>「 ' + m.text + ' 」</span><span class="learned-times">×' + m.count + '</span>';
        list.appendChild(row);
      });
    }
  }
  $('btn-learned').addEventListener('click', () => navigate({ s: 'learned' }));
  $('learned-home').addEventListener('click', goHome);

  /* ─────────── 퀴즈 ─────────── */
  function pickQuizPool() {
    const learned = Progress.list().map(it => WORDS.find(w => w.en === it.en)).filter(Boolean);
    const pool = learned.slice(0, 20);
    const rest = WORDS.filter(w => !pool.includes(w));
    while (pool.length < 5 && rest.length) {
      pool.push(rest.splice(Math.floor(Math.random() * rest.length), 1)[0]);
    }
    return pool;
  }

  function startQuiz() {
    const pool = pickQuizPool();
    if (pool.length < 3) { Speech.speakKo('단어를 조금 더 배우고 퀴즈를 해 봐요!'); return; }
    const rounds = [];
    const used = new Set();
    for (let i = 0; i < 5 && i < pool.length; i++) {
      let answer;
      do { answer = pool[Math.floor(Math.random() * pool.length)]; } while (used.has(answer.en));
      used.add(answer.en);
      const sameCat = WORDS.filter(w => w.cat === answer.cat && w.en !== answer.en);
      const others = WORDS.filter(w => w.cat !== answer.cat);
      const distractors = [];
      while (distractors.length < 2) {
        const src = sameCat.length ? sameCat : others;
        const cand = src.splice(Math.floor(Math.random() * src.length), 1)[0];
        if (cand && cand.en !== answer.en && !distractors.includes(cand)) distractors.push(cand);
      }
      const choices = [answer].concat(distractors).sort(() => Math.random() - 0.5);
      rounds.push({ answer, choices });
    }
    state.quiz = { rounds, idx: 0, score: 0, firstTry: true, awaiting: false };
    navigate({ s: 'quiz' });
    playRound(true);
  }

  function playRound(first) {
    const q = state.quiz;
    const round = q.rounds[q.idx];
    $('quiz-progress').textContent = (q.idx + 1) + ' / ' + q.rounds.length;
    $('quiz-question').textContent = round.answer.en.toUpperCase();
    const box = $('quiz-choices');
    box.innerHTML = '';
    q.firstTry = true;
    q.awaiting = true;
    round.choices.forEach(w => {
      const card = document.createElement('button');
      card.className = 'quiz-choice';
      card.textContent = w.emoji;
      card.dataset.en = w.en;
      card.addEventListener('click', () => answerQuiz(card, w));
      box.appendChild(card);
    });
    const seq = [];
    if (first) seq.push({ lang: 'ko', text: '잘 듣고 맞는 그림을 골라 보세요!' });
    seq.push({ lang: 'en', text: round.answer.en });
    seq.push({ lang: 'en', text: round.answer.en, rate: 0.7 });
    Speech.speakSeq(seq);
  }

  function answerQuiz(card, w) {
    const q = state.quiz;
    if (!q || !q.awaiting) return;
    const round = q.rounds[q.idx];
    if (w.en === round.answer.en) {
      q.awaiting = false;
      if (q.firstTry) q.score++;
      card.classList.add('correct');
      Speech.ding();
      Speech.speakSeq([{ lang: 'ko', text: '딩동댕!' }]);
      setTimeout(() => {
        q.idx++;
        if (q.idx >= q.rounds.length) finishQuiz();
        else playRound(false);
      }, 900);
    } else {
      q.firstTry = false;
      card.classList.add('wrong');
      Speech.pop();
      Speech.speakSeq([{ lang: 'ko', text: '음, 다시 한번!' }, { lang: 'en', text: round.answer.en }]);
      setTimeout(() => card.classList.remove('wrong'), 700);
    }
  }

  function finishQuiz() {
    const q = state.quiz;
    $('quiz-score').textContent = '⭐'.repeat(Math.max(1, q.score)) + '  ' + q.score + ' / ' + q.rounds.length;
    $('quiz-done-overlay').classList.remove('hidden');
    launchConfetti();
    Speech.tada();
    Speech.speakKo(q.score >= q.rounds.length ? '와, 전부 다 맞혔어요! 최고예요!' : '참 잘했어요! 또 해 볼까요?');
  }

  function launchConfetti() {
    const box = $('confetti-box');
    box.innerHTML = '';
    const colors = ['#FF4D4D', '#FFB800', '#4DC94D', '#4DA6FF', '#C77DFF', '#FF8FC7'];
    for (let i = 0; i < 40; i++) {
      const p = document.createElement('div');
      p.className = 'confetti';
      p.style.left = Math.random() * 100 + 'vw';
      p.style.background = colors[i % colors.length];
      p.style.width = p.style.height = (8 + Math.random() * 10) + 'px';
      p.style.borderRadius = Math.random() < 0.5 ? '50%' : '3px';
      p.style.animationDuration = (1.4 + Math.random() * 1.6) + 's';
      p.style.animationDelay = (Math.random() * 0.7) + 's';
      box.appendChild(p);
    }
    setTimeout(() => { box.innerHTML = ''; }, 4200);
  }

  $('btn-quiz').addEventListener('click', startQuiz);
  $('quiz-replay').addEventListener('click', () => {
    const q = state.quiz;
    if (q) Speech.speakSeq([{ lang: 'en', text: q.rounds[q.idx].answer.en }, { lang: 'en', text: q.rounds[q.idx].answer.en, rate: 0.7 }]);
  });
  $('quiz-home').addEventListener('click', goHome);
  $('quiz-again').addEventListener('click', () => { $('quiz-done-overlay').classList.add('hidden'); startQuiz(); });
  $('quiz-done-home').addEventListener('click', () => { $('quiz-done-overlay').classList.add('hidden'); goHome(); });

  /* ─────────── 공통 ─────────── */
  $('btn-mic').addEventListener('click', startAsk);
  $('listen-cancel').addEventListener('click', cancelListen);

  /* ─────────── 시작 ─────────── */
  try { history.replaceState({ n: 1 }, ''); } catch (e) {}
  renderHome();
  if (!Speech.sttSupported()) {
    $('mic-guide').innerHTML = '이 기기는 마이크 인식이 안 돼요.<br><span class="mic-guide-sub">그림 단어장에서 눌러 보세요! 📖</span>';
  }
})();
