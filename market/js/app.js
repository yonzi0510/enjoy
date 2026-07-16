/* 앱 셸 — 가게(단계) 고르기 → 손님 접객(상품 담기 → 동전 계산) 흐름
 * 드래그는 pointer events 로 직접 구현: 상품은 장바구니로, 동전은 계산대로.
 * 틀려도 벌점 없이 스르륵 제자리로 돌아가고 부드럽게 안내한다.
 */
window.App = (() => {
  const D = window.MarketData;
  const A = window.Audio2;
  const P = window.Progress;

  const $ = id => document.getElementById(id);
  function rnd(n) { return Math.floor(Math.random() * n); }
  function pick(arr) { return arr[rnd(arr.length)]; }
  function shuffle(arr) { return arr.slice().sort(() => Math.random() - 0.5); }
  function wiggleEl(el) {
    el.classList.remove('wiggle');
    void el.offsetWidth;
    el.classList.add('wiggle');
  }

  /* ─────────── 화면 전환 ─────────── */
  function showScreen(id) {
    A.stop();
    document.querySelectorAll('.screen').forEach(s => s.classList.toggle('on', s.id === id));
    if (id === 'scr-home') renderHome();
  }

  /* ─────────── 동전 그림 (인라인 SVG — 100원 금색, 500원 구리색·더 크게) ─────────── */
  function coinSVG(v, ghost) {
    const c = v === 500
      ? { fill: '#FFB25C', ring: '#D97B2E', txt: '#6E3A0E' }
      : { fill: '#FFD34E', ring: '#D9A13B', txt: '#7A5800' };
    return '<svg class="coin ' + (v === 500 ? 'c500' : 'c100') + (ghost ? ' coin-ghost' : '') +
      '" viewBox="0 0 60 60" aria-label="' + v + '원 동전">' +
      '<circle cx="30" cy="30" r="28" fill="' + c.fill + '" stroke="' + c.ring + '" stroke-width="3"/>' +
      '<circle cx="30" cy="30" r="21" fill="none" stroke="' + c.ring + '" stroke-width="1.6" opacity=".7"/>' +
      '<text x="30" y="37.5" text-anchor="middle" font-size="19" font-weight="900" fill="' + c.txt + '">' + v + '</text></svg>';
  }
  // 가격표: 가격만큼의 동전 그림 나열
  function coinRow(price, coins, ghost) {
    return D.coinsFor(price, coins).map(v => coinSVG(v, ghost)).join('');
  }

  /* ─────────── 홈 (가게 고르기) ─────────── */
  function levelUnlocked(lv) { return lv.id === 1 || P.rounds('level-' + (lv.id - 1)) >= 1; }

  function renderHome() {
    $('home-stars').textContent = P.stars();
    const menu = $('menu');
    menu.innerHTML = '';
    D.LEVELS.forEach(lv => {
      const open = levelUnlocked(lv);
      const n = P.rounds('level-' + lv.id);
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'menu-card c-l' + lv.id + (open ? '' : ' locked');
      b.innerHTML =
        '<span class="mc-icon">' + (open ? lv.emoji : '🔒') + '</span>' +
        '<span class="mc-name">' + lv.name + '</span>' +
        '<span class="mc-desc">' + (open ? lv.desc : '앞 가게를 먼저 깨요') + '</span>' +
        '<span class="mc-prog">' + (n ? '🎮 ' + n + '판' : (open ? '처음이야!' : '🔒')) + '</span>';
      b.addEventListener('click', ev => {
        ev.preventDefault();
        A.sfx.tap();
        if (!open) { wiggleEl(b); A.speak('앞 단계 가게를 먼저 열어 보자!'); return; }
        openShop(lv);
      });
      menu.appendChild(b);
    });
  }

  /* ─────────── 가게 상태 ─────────── */
  // { level, theme, custIdx, phase 'pick'|'pay'|'done', customer, order, picked, price, paid, timers, av, lock, prevSp, prevTheme }
  let sh = null;

  function clearTimers() { ((sh && sh.timers) || []).forEach(clearTimeout); if (sh) sh.timers = []; }
  function later(fn, ms) { sh.timers.push(setTimeout(fn, ms)); }
  function paidSum() { return sh.paid.reduce((a, b) => a + b, 0); }

  function openShop(level) {
    if (sh) clearTimers();
    const av = sh && sh.av; // 아바타는 한 번 만들면 재사용
    const prevSp = sh && sh.prevSp;
    // 판마다 가게 테마가 바뀐다 (같은 테마가 연달아 나오지 않게)
    const prevTheme = sh && sh.prevTheme;
    const theme = pick(D.THEMES.filter(t => t.id !== prevTheme));
    sh = { level, theme, custIdx: 0, timers: [], av, prevSp, prevTheme: theme.id };
    $('shop-title').textContent = theme.emoji + ' ' + theme.name + ' · ' + level.id + '단계';
    showScreen('scr-shop');
    newCustomer();
  }

  function renderDots() {
    const dots = $('shop-dots');
    dots.innerHTML = '';
    for (let i = 0; i < D.ROUND; i++) {
      const d = document.createElement('span');
      d.className = 'dot' + (i < sh.custIdx ? ' done' : i === sh.custIdx ? ' on' : '');
      dots.appendChild(d);
    }
  }

  /* ─────────── 손님 ─────────── */
  function newCustomer() {
    const lv = sh.level;
    sh.phase = 'pick';
    sh.lock = false;
    sh.paid = [];
    sh.picked = [];
    // 같은 손님이 연달아 오지 않게
    sh.customer = pick(D.CUSTOMERS.filter(c => c.sp !== sh.prevSp));
    sh.prevSp = sh.customer.sp;
    // 주문 상품 뽑기 (테마 진열대를 섞어 앞에서 items개)
    const pool = shuffle(D.themePool(sh.theme, lv));
    sh.order = pool.slice(0, lv.items);
    sh.price = sh.order.reduce((s, p) => s + p.price, 0);

    renderDots();
    renderShelf(pool.slice(0, D.SHELF));
    renderBasket();
    renderCounter();
    $('pay-row').hidden = true;
    $('shelf').classList.remove('dim');

    enterCustomer();
    const text = lv.items >= 2 ? D.pairText(sh.order[0], sh.order[1]) : D.orderText(sh.order[0]);
    sh.orderText = text;
    setBubble(sh.order.map(p => p.emoji).join(' '), text);
    // 첫 손님 때는 가게 개점 인사를 먼저 들려준다 (테마가 바뀐 걸 귀로 알게)
    const opening = sh.custIdx === 0 ? sh.theme.greet + ' ' : '';
    later(() => A.speak(opening + sh.customer.greet + ' ' + text), 700);
  }

  // 손님이 화면 밖에서 걸어 들어온다 (PetAvatar SVG, 없으면 이모지 폴백)
  function enterCustomer() {
    const fig = $('cust-figure');
    const box = $('cust-avatar');
    fig.classList.remove('out');
    fig.classList.add('in-start');
    if (window.PetAvatar) {
      if (!sh.av) {
        box.textContent = '';
        sh.av = PetAvatar.create(box);
        if (sh.av.startIdle) sh.av.startIdle();
      }
      sh.av.render({ species: sh.customer.sp, stage: 2 });
    } else {
      box.textContent = sh.customer.e; // 이모지 폴백
    }
    requestAnimationFrame(() => requestAnimationFrame(() => {
      fig.classList.remove('in-start');
      fig.classList.add('walk');
      later(() => fig.classList.remove('walk'), 1000);
    }));
  }
  function leaveCustomer() { $('cust-figure').classList.add('out'); }

  function setBubble(icon, text) {
    const b = $('bubble');
    b.innerHTML = '<span class="bb-icon">' + icon + '</span><span class="bb-text">' + text + '</span>';
    b.classList.remove('pop');
    void b.offsetWidth;
    b.classList.add('pop');
  }

  // 부드러운 안내 말풍선 (화면 아래 알약)
  let guideTimer = 0;
  function showGuide(text) {
    const g = $('guide');
    g.textContent = text;
    g.classList.add('on');
    clearTimeout(guideTimer);
    guideTimer = setTimeout(() => g.classList.remove('on'), 2800);
  }

  function spawnHearts() {
    const row = document.querySelector('.cust-row');
    const HEARTS = ['💖', '❤️', '💛', '🧡'];
    for (let i = 0; i < 4; i++) {
      const h = document.createElement('span');
      h.className = 'heart';
      h.textContent = HEARTS[i % HEARTS.length];
      h.style.left = (18 + rnd(56)) + '%';
      h.style.animationDelay = (i * 0.13) + 's';
      row.appendChild(h);
      setTimeout(() => h.remove(), 2000);
    }
  }

  /* ─────────── 진열대·장바구니·계산대 그리기 ─────────── */
  function renderShelf(items) {
    const shelf = $('shelf');
    shelf.innerHTML = '';
    shuffle(items).forEach(p => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'shelf-item';
      b.dataset.id = p.id;
      b.innerHTML =
        '<span class="si-emoji">' + p.emoji + '</span>' +
        '<span class="si-name">' + p.name + '</span>' +
        '<span class="si-price">' + coinRow(p.price, sh.level.coins) + '</span>';
      enableDrag(b, () => (sh.phase === 'pick' && !b.classList.contains('sold'))
        ? { kind: 'product', product: p, el: b } : null);
      shelf.appendChild(b);
    });
  }

  function renderBasket() {
    const box = $('basket-items');
    box.innerHTML = '';
    sh.order.forEach(p => {
      const got = sh.picked.indexOf(p) >= 0;
      const s = document.createElement('span');
      s.className = 'basket-slot' + (got ? ' got' : '');
      s.textContent = got ? p.emoji : '';
      box.appendChild(s);
    });
  }

  function renderCounter() {
    const guide = $('price-guide');
    guide.innerHTML = (sh.phase === 'pay' || sh.phase === 'done')
      ? '<span class="pg-label">가격표</span>' + coinRow(sh.price, sh.level.coins, true)
      : '';
    const paidBox = $('paid-coins');
    paidBox.innerHTML = '';
    sh.paid.forEach((v, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'paid-coin';
      b.setAttribute('aria-label', v + '원 동전 돌려놓기');
      b.innerHTML = coinSVG(v);
      b.addEventListener('click', ev => { ev.preventDefault(); returnCoin(i); });
      paidBox.appendChild(b);
    });
  }

  function renderPurse() {
    const purse = $('purse');
    purse.innerHTML = '';
    sh.level.coins.forEach(v => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'coin-src';
      b.dataset.v = v;
      b.innerHTML = coinSVG(v) + '<span class="cs-label">' + v + '원</span>';
      enableDrag(b, () => sh.phase === 'pay' ? { kind: 'coin', v } : null);
      purse.appendChild(b);
    });
  }

  /* ─────────── 터치 드래그 (pointer events) ─────────── */
  let drag = null; // { pay, ghost, src, x0, y0, ox, oy }

  function enableDrag(el, getPayload) {
    el.addEventListener('pointerdown', ev => {
      if (drag || !sh || sh.lock) return;
      const pay = getPayload();
      if (!pay) return;
      ev.preventDefault();
      const r = el.getBoundingClientRect();
      const ghost = document.createElement('div');
      ghost.className = 'drag-ghost';
      ghost.innerHTML = pay.kind === 'coin'
        ? coinSVG(pay.v)
        : '<span class="ghost-emoji">' + pay.product.emoji + '</span>';
      const ox = r.left + r.width / 2, oy = r.top + r.height / 2;
      ghost.style.left = ox + 'px';
      ghost.style.top = oy + 'px';
      document.body.appendChild(ghost);
      el.classList.add('dragging');
      drag = { pay, ghost, src: el, x0: ev.clientX, y0: ev.clientY, ox, oy };
      window.addEventListener('pointermove', dragMove);
      window.addEventListener('pointerup', dragEnd);
      window.addEventListener('pointercancel', dragEnd);
      A.sfx.tap();
    });
  }
  function dragMove(ev) {
    if (!drag) return;
    ev.preventDefault();
    drag.ghost.style.left = (drag.ox + ev.clientX - drag.x0) + 'px';
    drag.ghost.style.top = (drag.oy + ev.clientY - drag.y0) + 'px';
  }
  function inZone(zone, x, y, pad) {
    const r = zone.getBoundingClientRect();
    return x >= r.left - pad && x <= r.right + pad && y >= r.top - pad && y <= r.bottom + pad;
  }
  function dragEnd(ev) {
    if (!drag) return;
    window.removeEventListener('pointermove', dragMove);
    window.removeEventListener('pointerup', dragEnd);
    window.removeEventListener('pointercancel', dragEnd);
    const d = drag;
    drag = null;
    d.src.classList.remove('dragging');
    const zone = d.pay.kind === 'coin' ? $('counter') : $('basket');
    const ok = inZone(zone, ev.clientX, ev.clientY, 16) &&
      (d.pay.kind === 'coin' ? dropCoin(d.pay.v) : dropProduct(d.pay.product, d.src));
    if (ok) { d.ghost.remove(); return; }
    // 스르륵 제자리로 (스냅 백)
    d.ghost.classList.add('fly-back');
    d.ghost.style.left = d.ox + 'px';
    d.ghost.style.top = d.oy + 'px';
    setTimeout(() => d.ghost.remove(), 300);
  }

  /* ─────────── 상품 담기 ─────────── */
  function dropProduct(p, srcEl) {
    if (sh.phase !== 'pick') return false;
    const need = sh.order.filter(o => sh.picked.indexOf(o) < 0);
    const hit = need.find(o => o.id === p.id);
    if (!hit) { // 주문하지 않은 상품 — 부드럽게 되돌린다
      A.sfx.tap();
      const guide = '음, 그건 ' + p.name + D.josa(p.name, '이야', '야') + '~ ' +
        need[0].name + D.josa(need[0].name, '을', '를') + ' 찾아볼까?';
      showGuide(guide);
      wiggleEl($('bubble'));
      A.speak(guide);
      return false;
    }
    sh.picked.push(hit);
    srcEl.classList.add('sold');
    renderBasket();
    A.sfx.pop();
    if (sh.picked.length >= sh.order.length) {
      startPay();
    } else {
      const left = sh.order.filter(o => sh.picked.indexOf(o) < 0)[0];
      A.speak('좋아! 이제 ' + left.name + '도 담아 줘!');
    }
    return true;
  }

  /* ─────────── 동전 계산 ─────────── */
  function startPay() {
    sh.phase = 'pay';
    $('shelf').classList.add('dim');
    $('pay-row').hidden = false;
    renderPurse();
    renderCounter();
    const say = D.priceSay(sh.order, sh.price);
    setBubble('💰', say);
    A.speak(say + ' 동전을 계산대에 올려 줘!');
  }

  function dropCoin(v) {
    if (sh.phase !== 'pay' || sh.lock) return false;
    const sum = paidSum() + v;
    if (sum > sh.price) { // 초과 — 동전이 스르륵 돌아가고 부드럽게 안내
      A.sfx.tap();
      showGuide('앗, 동전이 조금 많아~ 다시 세어 보자!');
      A.speak('앗, 동전이 조금 많아! 다시 세어 보자!');
      wiggleEl($('counter'));
      return false;
    }
    sh.paid.push(v);
    renderCounter();
    A.sfx.coin();
    if (sum === sh.price) paySuccess();
    else A.speak(D.wonName(sum) + ' 원!'); // 놓을 때마다 지금까지 금액을 세어 준다
    return true;
  }

  function returnCoin(i) { // 계산대의 동전을 톡 눌러 돌려놓기
    if (sh.phase !== 'pay' || sh.lock) return;
    sh.paid.splice(i, 1);
    A.sfx.tap();
    renderCounter();
  }

  function checkPay() { // 💰 다 냈어요! — 모자라면 부드럽게 안내
    if (!sh || sh.phase !== 'pay' || sh.lock) return;
    A.sfx.tap();
    if (paidSum() < sh.price) {
      wiggleEl($('counter'));
      const msg = '동전이 조금 모자라~ ' + D.wonName(sh.price) + ' 원이 되어야 해!';
      showGuide(msg);
      A.speak(msg);
    }
    // 딱 맞으면 놓는 순간 이미 성공 처리된다
  }

  function paySuccess() {
    sh.lock = true;
    sh.phase = 'done';
    A.sfx.good();
    spawnHearts();
    if (sh.av && sh.av.happy) sh.av.happy();
    // 산 물건에 어울리는 리액션 + 감사 인사
    const react = D.reactionFor(sh.order[0]);
    const thanks = pick(D.THANKS);
    setBubble('💕', react + ' ' + thanks);
    A.speak('딩동댕! ' + react + ' ' + thanks);
    const served = sh.custIdx + 1;
    if (window.Pet && served % 2 === 0) Pet.awardSnack(1); // 접객 2명마다 간식 하나 (과하지 않게)
    later(leaveCustomer, 1300);
    later(() => {
      sh.custIdx++;
      if (sh.custIdx < D.ROUND) newCustomer();
      else roundDone();
    }, 2100);
  }

  function roundDone() { // 손님 5명 접객 완료!
    P.recordRound('level-' + sh.level.id);
    P.addStar(D.ROUND);
    if (window.Pet) Pet.awardMeal(1); // 한 판 완주 = 식사
    A.sfx.fanfare();
    renderDots();
    const praise = pick(D.praises);
    showReward('손님 다섯 명 접객 성공!', '한 판 더 🛒', () => openShop(sh.level), () => showScreen('scr-home'));
    A.speak('와, 손님 다섯 명을 모두 도와줬어요! ' + praise);
  }

  /* ─────────── 보상 오버레이 ─────────── */
  let rewardNextFn = null, rewardCloseFn = null;
  function showReward(praise, nextLabel, onNext, onClose) {
    $('reward-praise').textContent = praise;
    $('reward-next').textContent = nextLabel;
    rewardNextFn = onNext;
    rewardCloseFn = onClose || null;
    $('reward-close').hidden = !onClose;
    $('reward').classList.add('on');
  }

  /* ─────────── 초기화 ─────────── */
  function init() {
    // 길게 눌러도 복사·전체선택 풍선이 뜨지 않게
    document.addEventListener('contextmenu', e => e.preventDefault());
    document.addEventListener('selectstart', e => e.preventDefault());

    $('btn-shop-back').addEventListener('click', ev => {
      ev.preventDefault(); A.sfx.tap(); clearTimers(); showScreen('scr-home');
    });
    $('btn-pay').addEventListener('click', ev => { ev.preventDefault(); checkPay(); });
    $('reward-next').addEventListener('click', ev => {
      ev.preventDefault(); A.sfx.tap();
      $('reward').classList.remove('on');
      if (rewardNextFn) rewardNextFn();
    });
    $('reward-close').addEventListener('click', ev => {
      ev.preventDefault(); A.sfx.tap();
      $('reward').classList.remove('on');
      if (rewardCloseFn) rewardCloseFn();
    });
    renderHome();
  }
  init();

  // 종단 테스트용 상태 확인
  function debug() {
    return {
      stars: P.stars(),
      shop: sh ? {
        level: sh.level.id,
        theme: sh.theme.id,
        custIdx: sh.custIdx,
        phase: sh.phase,
        order: (sh.order || []).map(p => p.id),
        picked: (sh.picked || []).map(p => p.id),
        price: sh.price || 0,
        paid: sh.paid ? paidSum() : 0,
      } : null,
      rounds: { l1: P.rounds('level-1'), l2: P.rounds('level-2'), l3: P.rounds('level-3') },
    };
  }

  return { showScreen, debug };
})();
