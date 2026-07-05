/* 프랙티카 놀이터 — 화면·흐름 로직
 * 내비게이션 스택 + history 연동으로 시스템 뒤로가기가 이전 화면으로 이동한다.
 */
(() => {
  const $ = id => document.getElementById(id);

  const state = {
    lang: (window.Progress && Progress.getLang && Progress.getLang()) || 'en',
    track: null,
    lessonId: null,
    attempt: null,      // 현재 유저 턴 최고 시도 결과
    result: null,       // 마지막 레슨 결과(결과 화면용)
    mode: 'home',
  };
  function langMeta(id) { return window.LANGS.find(l => l.id === id) || window.LANGS[0]; }

  /* ─────────── 아바타 주입 ─────────── */
  function injectAvatar(slotId) {
    const slot = $(slotId);
    if (!slot || slot.firstChild) return;
    const tpl = $('tpl-avatar');
    slot.appendChild(tpl.content.cloneNode(true));
  }
  function avatarEl(slotId) { return $(slotId).querySelector('.avatar'); }
  function setAvatar(slotId, cls) {
    const el = avatarEl(slotId);
    if (!el) return;
    el.classList.remove('speaking', 'listening');
    if (cls) el.classList.add(cls);
  }

  /* ─────────── 화면 전환 ─────────── */
  function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    $(id).classList.add('active');
  }

  const navStack = [{ s: 'home' }];
  function renderView(v) {
    Speech.stopSpeak();
    Speech.stopListen();
    switch (v.s) {
      case 'map': state.track = v.track; renderMap(v.track); showScreen('screen-map'); break;
      case 'session':
        if (!state.lessonId || Tutor.atEnd()) {
          const tid = state.lessonId ? window.LESSONS[state.lessonId].trackId : (state.track || (state.lang + '-travel'));
          renderMap(tid); showScreen('screen-map');
        } else { showScreen('screen-session'); renderSession(); }
        break;
      case 'result': showScreen('screen-result'); state.mode = 'result'; break;
      case 'review': renderReview(); break;
      default: renderHome(); showScreen('screen-home');
    }
  }
  function navigate(v) {
    navStack.push(v);
    try { history.pushState({ n: navStack.length }, ''); } catch (e) {}
    renderView(v);
  }
  function goBack() { try { history.back(); } catch (e) {} }
  function goHome() { navigate({ s: 'home' }); }

  window.addEventListener('popstate', () => {
    Speech.stopSpeak(); Speech.stopListen();
    $('review-done').classList.add('hidden');
    if (navStack.length > 1) navStack.pop();
    renderView(navStack[navStack.length - 1]);
  });

  /* ─────────── 홈 ─────────── */
  function refreshStats() {
    const t = Progress.totals();
    $('stat-streak').textContent = t.streak;
    $('stat-xp').textContent = t.xp;
    $('stat-gems').textContent = t.gems;
    $('review-count').textContent = Progress.learnedCount(state.lang);
  }
  function renderLangTabs() {
    const box = $('lang-tabs');
    box.innerHTML = '';
    for (const l of window.LANGS) {
      const b = document.createElement('button');
      b.className = 'lang-tab' + (l.id === state.lang ? ' active' : '');
      b.innerHTML = `<span class="flag">${l.flag}</span>${l.label}`;
      b.addEventListener('click', () => {
        if (state.lang === l.id) return;
        state.lang = l.id;
        Progress.setLang(l.id);
        renderHome();
      });
      box.appendChild(b);
    }
  }

  function renderHome() {
    state.mode = 'home';
    injectAvatar('home-avatar');
    refreshStats();
    renderLangTabs();
    $('home-bubble').textContent = langMeta(state.lang).hello;
    $('review-count').textContent = Progress.learnedCount(state.lang);
    const list = $('track-list');
    list.innerHTML = '';
    for (const tr of window.TRACKS.filter(t => t.lang === state.lang)) {
      const lessons = window.TRACK_LESSONS[tr.id];
      const done = lessons.filter(id => Progress.lesson(id).done).length;
      const card = document.createElement('button');
      card.className = 'track-card';
      card.innerHTML =
        `<span class="track-emoji" style="background:${tr.color}22">${tr.emoji}</span>` +
        `<span class="track-info"><span class="track-name">${tr.title}</span>` +
        `<span class="track-desc">${tr.desc}</span>` +
        `<span class="track-prog">${done} / ${lessons.length} 레슨 완료</span></span>`;
      card.addEventListener('click', () => navigate({ s: 'map', track: tr.id }));
      list.appendChild(card);
    }
  }

  /* ─────────── 코스맵 ─────────── */
  function renderMap(trackId) {
    state.mode = 'map';
    const tr = window.TRACKS.find(t => t.id === trackId);
    $('map-title').innerHTML = `<span>${tr.emoji}</span> ${tr.title}`;
    const list = $('lesson-list');
    list.innerHTML = '';
    window.TRACK_LESSONS[trackId].forEach((id, i) => {
      const les = window.LESSONS[id];
      const p = Progress.lesson(id);
      const unlocked = Progress.isUnlocked(id);
      const card = document.createElement('button');
      card.className = 'lesson-card' + (unlocked ? '' : ' locked');
      const stars = p.stars ? '⭐'.repeat(p.stars) + '☆'.repeat(3 - p.stars) : '';
      card.innerHTML =
        `<span class="lesson-emoji">${les.emoji}</span>` +
        `<span class="lesson-info"><span class="lesson-name">${i + 1}. ${les.title}</span>` +
        `<span class="lesson-meta">레벨 ${les.level}${p.done ? ' · 최고 ' + p.best + '점' : ''}</span>` +
        (stars ? `<span class="lesson-stars">${stars}</span>` : '') + `</span>` +
        (unlocked ? '' : '<span class="lesson-lock">🔒</span>');
      if (unlocked) card.addEventListener('click', () => startLesson(id));
      else card.addEventListener('click', () => Speech.speakKo('앞 레슨을 먼저 끝내면 열려요'));
      list.appendChild(card);
    });
  }

  /* ─────────── 레슨 시작 ─────────── */
  function applyLangSpeech(lang) {
    const m = langMeta(lang);
    Speech.setTarget(m.tts, m.stt);
  }

  function startLesson(id) {
    Speech.unlock();
    state.lessonId = id;
    state.attempt = null;
    applyLangSpeech(window.LESSONS[id].lang);
    Tutor.begin(id);
    injectAvatar('session-avatar');
    checkSound();
    navigate({ s: 'session' });
  }

  function hidePanels() {
    $('tutor-panel').classList.add('hidden');
    $('user-panel').classList.add('hidden');
    $('fb-panel').classList.add('hidden');
  }
  function updateSessionBar() {
    const st = Tutor.userTurnStats();
    const pct = st.total ? Math.round(100 * st.done / st.total) : 0;
    $('session-bar').style.width = pct + '%';
  }

  function renderSession() {
    state.mode = 'session';
    Speech.stopListen();
    hidePanels();
    updateSessionBar();
    if (Tutor.atEnd()) { finishLesson(); return; }
    const t = Tutor.turn();
    if (t.speaker === 'tutor') renderTutorTurn(t);
    else renderUserTurn(t);
  }

  function renderTutorTurn(t) {
    $('tutor-panel').classList.remove('hidden');
    $('tutor-en').textContent = t.t;
    $('tutor-ko').textContent = t.ko;
    setAvatar('session-avatar', 'speaking');
    Speech.speakTarget(t.t, null, () => setAvatar('session-avatar', null));
  }

  function renderUserTurn(t) {
    state.attempt = null;
    const p = $('user-panel');
    p.classList.remove('hidden');
    $('user-ask').textContent = t.ask;
    $('user-model').classList.add('hidden');
    $('user-model').textContent = t.model;
    $('mic-interim').textContent = '';
    $('mic-label').textContent = '버튼을 누르고 영어로 말해보세요';
    setMic('session', false);
    setAvatar('session-avatar', 'listening');
  }

  function setMic(which, listening) {
    const btn = which === 'session' ? $('mic-btn') : $('review-mic');
    const icon = which === 'session' ? $('mic-icon') : $('review-mic-icon');
    const waves = which === 'session' ? $('mic-waves') : $('review-waves');
    btn.classList.toggle('listening', listening);
    icon.classList.toggle('hidden', listening);
    waves.classList.toggle('hidden', !listening);
  }

  /* ─────────── 마이크로 듣기 ─────────── */
  function startListen(which) {
    Speech.unlock();
    Speech.stopSpeak();
    const labelEl = which === 'session' ? $('mic-label') : $('review-mic-label');
    if (!Speech.sttSupported()) {
      // 마이크 없음 → 모범 답안 공개 + 신뢰 점수로 진행 가능하게
      if (which === 'session') { $('user-model').classList.remove('hidden'); }
      labelEl.textContent = '이 기기는 마이크를 쓸 수 없어요. 모범 답안을 듣고 따라 해보세요';
      const model = which === 'session' ? Tutor.turn().model : Review.round().t;
      Speech.speakTarget(model);
      handleResultFor(which, [model], true); // 인식된 셈 치고 피드백(관대)
      return;
    }
    setMic(which, true);
    labelEl.textContent = '듣고 있어요…';
    Speech.listenStart();
    Speech.startListen({
      onInterim: txt => { (which === 'session' ? $('mic-interim') : labelEl).textContent = txt; },
      onWaiting: () => { labelEl.textContent = '천천히 말해도 괜찮아요…'; },
      onResult: alts => handleResultFor(which, alts, false),
      onFail: kind => {
        setMic(which, false);
        labelEl.textContent = kind === 'denied'
          ? '마이크 사용을 허용해 주세요'
          : '잘 안 들렸어요. 다시 눌러서 말해보세요';
      },
      onEnd: () => setMic(which, false),
    });
  }

  function bestOf(alts, evalFn) {
    let best = null;
    for (const a of alts) {
      const r = evalFn(a);
      if (r && (!best || r.score > best.score)) best = r;
    }
    return best;
  }

  function handleResultFor(which, alts, manual) {
    if (which === 'session') sessionResult(alts, manual);
    else reviewResult(alts, manual);
  }

  /* ─────────── 세션 피드백 ─────────── */
  function sessionResult(alts, manual) {
    if (state.mode !== 'session' || !Tutor.isUserTurn()) return;
    setMic('session', false);
    let best = bestOf(alts, a => Tutor.evaluate(a));
    if (!best) return;
    if (manual && best.score < 70) best = { ...best, score: 70, pass: true }; // 마이크 없는 기기 배려
    if (!state.attempt || best.score > state.attempt.score) state.attempt = best;
    renderFeedback(state.attempt);
  }

  function renderFeedback(r) {
    setAvatar('session-avatar', null);
    $('user-panel').classList.add('hidden');
    const fb = $('fb-panel');
    fb.classList.remove('hidden');
    const band = r.score >= 75 ? 'good' : r.score >= 60 ? 'mid' : 'low';
    const ring = $('fb-ring');
    ring.className = 'fb-ring ' + band;
    $('fb-score').textContent = r.score;
    const title = $('fb-title');
    title.className = 'fb-title ' + band;
    title.textContent = r.score >= 90 ? '완벽해요! 🌟' : r.score >= 75 ? '아주 좋아요! 👏'
      : r.score >= 60 ? '좋아요! 🙂' : '거의 다 왔어요, 다시 해볼까요?';
    $('fb-model').innerHTML = renderSegments(r.segments, r.model);
    $('fb-heard').textContent = r.said ? '내가 말한 것: “' + r.said + '”' : '';
    $('fb-next').textContent = r.pass ? '다음 ▶' : '넘어가기 ▶';
    if (r.score >= 75) Speech.tada(); else if (r.pass) Speech.ding(); else Speech.buzz();
  }

  // 세그먼트(단어/문자)별 맞음·놓침 색칠. 영어는 단어 사이 공백, 일·중은 붙여 렌더.
  function renderSegments(segments, model) {
    if (!segments || !segments.length) return escapeHtml(model || '');
    const spacer = /[ぁ-んァ-ヶ一-鿿]/.test(model || '') ? '' : ' ';
    return segments.map(s => `<span class="${s.ok ? 'w-ok' : 'w-miss'}">${escapeHtml(s.text)}</span>`).join(spacer);
  }
  function escapeHtml(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

  function lookupKo(lesson, model) {
    const v = lesson.vocab.find(x => x.t === model);
    return v ? v.ko : '';
  }

  function advanceUserTurn() {
    const t = Tutor.turn();
    if (state.attempt) {
      Tutor.commit(state.attempt);
      Progress.learnPhrase(t.model, lookupKo(Tutor.lesson(), t.model), Tutor.lesson().lang);
    }
    state.attempt = null;
    Tutor.advance();
    if (Tutor.atEnd()) finishLesson(); else renderSession();
  }

  /* ─────────── 레슨 결과 ─────────── */
  function finishLesson() {
    const sum = Tutor.summary();
    const res = Progress.completeLesson(state.lessonId, sum.avg);
    state.result = { sum, res, lessonId: state.lessonId };
    renderResult();
    navigate({ s: 'result' });
  }

  function renderResult() {
    const { sum, res } = state.result;
    $('result-stars').textContent = '⭐'.repeat(res.stars) + '☆'.repeat(3 - res.stars);
    $('result-title').textContent = res.stars === 3 ? '완벽했어요! 🎉' : res.stars === 2 ? '잘했어요! 👏' : '레슨 완료! 🙂';
    $('result-acc').textContent = '평균 정확도 ' + sum.avg + '점';
    $('result-xp').textContent = '+' + res.xpGain;
    $('result-gems').textContent = '+' + res.gemGain;
    $('result-streak').textContent = res.streak;
    confetti();
    Speech.tada();
  }

  function nextLessonId() {
    const les = window.LESSONS[state.result.lessonId];
    const order = window.TRACK_LESSONS[les.trackId];
    const i = order.indexOf(state.result.lessonId);
    return (i >= 0 && i + 1 < order.length) ? order[i + 1] : null;
  }

  function confetti() {
    const box = $('result-confetti');
    box.innerHTML = '';
    const colors = ['#8A7BE0', '#FF9FC4', '#4FCB84', '#F2B84B', '#5FB0E8'];
    for (let i = 0; i < 40; i++) {
      const c = document.createElement('i');
      const left = (i * 137) % 100;
      const delay = (i % 10) * 0.12;
      const dur = 1.6 + (i % 7) * 0.25;
      c.style.left = left + 'vw';
      c.style.background = colors[i % colors.length];
      c.style.animationDuration = dur + 's';
      c.style.animationDelay = delay + 's';
      box.appendChild(c);
    }
    setTimeout(() => { box.innerHTML = ''; }, 3200);
  }

  /* ─────────── 어휘 복습 ─────────── */
  function startReview() {
    Speech.unlock();
    applyLangSpeech(state.lang);
    Review.begin(state.lang, 6);
    injectAvatar('session-avatar');
    checkSound();
    navigate({ s: 'review' });
  }
  function renderReview() {
    state.mode = 'review';
    $('review-done').classList.add('hidden');
    if (Review.atEnd()) { showReviewDone(); return; }
    showScreen('screen-review');
    const r = Review.round();
    $('review-fb').classList.add('hidden');
    $('review-face').classList.remove('hidden');
    $('review-ko').textContent = r.ko;
    $('review-mic-label').textContent = '버튼을 누르고 영어로 말해보세요';
    $('review-mic-label').classList.remove('hidden');
    setMic('review', false);
    const pct = Review.total() ? Math.round(100 * Review.index() / Review.total()) : 0;
    $('review-bar').style.width = pct + '%';
  }
  function reviewResult(alts, manual) {
    if (state.mode !== 'review') return;
    setMic('review', false);
    let best = bestOf(alts, a => Review.evaluate(a));
    if (!best) return;
    if (manual && best.score < 70) best = { ...best, score: 70, pass: true };
    Review.commit(best);
    // 피드백
    $('review-face').classList.add('hidden');
    $('review-mic-label').classList.add('hidden');
    const fb = $('review-fb');
    fb.classList.remove('hidden');
    const title = $('review-fb-title');
    const band = best.score >= 75 ? 'good' : best.score >= 60 ? 'mid' : 'low';
    title.className = 'fb-title ' + band;
    title.textContent = best.pass ? (best.score >= 90 ? '완벽해요! 🌟' : '맞았어요! 👏') : '아쉬워요, 이렇게 말해요';
    $('review-fb-model').innerHTML = renderSegments(best.segments, best.model);
    if (best.pass) Speech.ding(); else Speech.buzz();
  }
  function showReviewDone() {
    const s = Review.summary();
    Progress.rewardReview(s.correct);
    $('review-score').textContent = s.total + '개 중 ' + s.correct + '개 맞았어요!';
    $('review-done').classList.remove('hidden');
    Speech.tada();
    refreshStats();
  }

  /* ─────────── 소리 안 남 안내 배너 ─────────── */
  let soundBannerDismissed = false;
  function checkSound() {
    if (soundBannerDismissed) return;
    // TTS 자체가 없거나, 인앱 브라우저이거나, 사용할 음성이 하나도 없으면 안내
    const bad = !Speech.ttsSupported() || Speech.inAppBrowser() || !Speech.hasVoices();
    const banner = $('sound-banner');
    if (bad) {
      if (Speech.inAppBrowser()) {
        $('sound-banner-text').innerHTML = '🔇 카카오톡 등 <b>인앱 브라우저</b>에서는 소리가 안 날 수 있어요. 오른쪽 위 <b>⋮ 메뉴 → 다른 브라우저로 열기</b>(Chrome·Safari)를 눌러주세요.';
      } else {
        $('sound-banner-text').innerHTML = '🔇 이 브라우저에는 음성이 설치돼 있지 않아 소리가 안 날 수 있어요. Chrome·Safari 같은 브라우저에서 열어보세요.';
      }
      banner.classList.remove('hidden');
    } else {
      banner.classList.add('hidden');
    }
  }

  /* ─────────── 이벤트 바인딩 ─────────── */
  // 첫 터치: 오디오 잠금 해제 + 음성 목록 준비 후 소리 가능 여부 점검
  document.addEventListener('pointerdown', () => {
    Speech.unlock();
    setTimeout(checkSound, 400); // 음성 목록 비동기 로딩을 잠깐 기다림
  }, { once: true });
  $('sound-banner-close').addEventListener('click', () => {
    soundBannerDismissed = true;
    $('sound-banner').classList.add('hidden');
  });

  $('btn-review').addEventListener('click', startReview);
  $('map-home').addEventListener('click', goHome);
  $('session-back').addEventListener('click', goBack);
  $('session-home').addEventListener('click', goHome);
  $('review-home').addEventListener('click', goHome);

  // 튜터 턴
  $('tutor-next').addEventListener('click', () => { Tutor.advance(); if (Tutor.atEnd()) finishLesson(); else renderSession(); });
  $('tutor-replay').addEventListener('click', () => {
    const t = Tutor.turn(); if (!t) return;
    setAvatar('session-avatar', 'speaking');
    Speech.speakTarget(t.t, null, () => setAvatar('session-avatar', null));
  });

  // 유저 턴
  $('mic-btn').addEventListener('click', () => startListen('session'));
  $('user-hint').addEventListener('click', () => {
    const t = Tutor.turn(); if (!t) return;
    $('user-model').classList.remove('hidden');
    Speech.speakTarget(t.model);
  });

  // 피드백
  $('fb-hear').addEventListener('click', () => { if (state.attempt) Speech.speakTarget(state.attempt.model); });
  $('fb-retry').addEventListener('click', () => {
    $('fb-panel').classList.add('hidden');
    $('user-panel').classList.remove('hidden');
    setAvatar('session-avatar', 'listening');
    startListen('session');
  });
  $('fb-next').addEventListener('click', advanceUserTurn);

  // 결과
  $('result-next').addEventListener('click', () => {
    const nid = nextLessonId();
    if (nid && Progress.isUnlocked(nid)) startLesson(nid);
    else navigate({ s: 'map', track: window.LESSONS[state.result.lessonId].trackId });
  });
  $('result-review').addEventListener('click', startReview);
  $('result-map').addEventListener('click', () => navigate({ s: 'map', track: window.LESSONS[state.result.lessonId].trackId }));

  // 복습
  $('review-mic').addEventListener('click', () => startListen('review'));
  $('review-hear').addEventListener('click', () => { const r = Review.round(); if (r) Speech.speakTarget(r.t); });
  $('review-next').addEventListener('click', () => { renderReview(); });
  $('review-again').addEventListener('click', startReview);
  $('review-done-home').addEventListener('click', goHome);

  /* ─────────── 테스트 훅 ─────────── */
  window.App = {
    handleSpeech(alts) {
      if (state.mode === 'session') sessionResult(alts, false);
      else if (state.mode === 'review') reviewResult(alts, false);
    },
  };
  window.__practikaTest = {
    curScreen() { return document.querySelector('.screen.active') ? document.querySelector('.screen.active').id : null; },
    mode() { return state.mode; },
    expected() {
      if (state.mode === 'session') { const t = Tutor.turn(); return t && t.speaker === 'user' ? t.model : null; }
      if (state.mode === 'review') { const r = Review.round(); return r ? r.t : null; }
      return null;
    },
    lang() { return state.lang; },
    isUserTurn() { return state.mode === 'session' && Tutor.isUserTurn(); },
    turnIndex() { return Tutor.index(); },
    totals() { return Progress.totals(); },
    reviewDoneVisible() { return !$('review-done').classList.contains('hidden'); },
  };

  /* ─────────── 시작 ─────────── */
  applyLangSpeech(state.lang);
  renderHome();
})();
