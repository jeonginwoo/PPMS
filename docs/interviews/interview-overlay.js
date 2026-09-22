/* 인터뷰 오버레이 — 프로토타입 화면 위에 핫스팟을 얹고, 클릭하면 그 자리의 질문을 오른쪽에 띄운다.
   프로토타입 코드는 건드리지 않는다: #main 을 갈아끼우는 것을 MutationObserver 로 지켜보다가 다시 붙인다.
   답변은 localStorage 에 저장되고 interview-runner.html 과 같은 저장소를 쓴다. */
(function (g) {
  'use strict';

  var Q = IV.Q, SECTIONS = IV.SECTIONS, HOTSPOTS = IV.HOTSPOTS, KEY = IV.KEY;
  var byId = {};
  Q.forEach(function (q) { byId[q.id] = q; });

  var store = load();
  var view = { on: true, tier: 30, panel: true, sel: null, selLabel: '' };
  var elapsed = 0, timerId = null;

  /* ── 저장 ──────────────────────────────────────────── */
  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) { var o = JSON.parse(raw); if (o && o.sessions && o.sessions.length) { return o; } }
    } catch (e) { /* 저장소를 못 써도 화면은 돈다 */ }
    return { sessions: [blank('대상 1')], current: 0 };
  }
  function blank(name) {
    return { name: name, who: 'all', date: new Date().toISOString().slice(0, 10),
             answers: {}, asked: {}, mins: 0, updatedAt: 0, exportedAt: 0 };
  }
  /* 내보낸 뒤에 고친 답변이 있는 세션 — 창을 닫기 전에 경고할 근거.
     이 페이지는 file:// 이라 스스로 파일을 쓰지 못한다: 내보내기가 유일한 출구다. */
  function unsaved() {
    return store.sessions.filter(function (s) { return (s.updatedAt || 0) > (s.exportedAt || 0); });
  }
  function whoLabel(w) {
    return { sales: '영업', solution: '솔루션', cs: 'CS', all: '공통' }[w] || '공통';
  }
  function fileName(s) {
    var nm = (s.name || '대상').replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, '');
    return s.date + '-' + whoLabel(s.who) + '-' + nm + '.md';
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) {} }
  function cur() { return store.sessions[store.current] || store.sessions[0]; }
  function answered(id) { return !!(cur().answers[id] || '').trim(); }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ── 상단 툴바 ─────────────────────────────────────── */
  function buildTop() {
    var bar = document.createElement('div');
    bar.id = 'iv-top';
    bar.innerHTML =
      '<span class="iv-title">인터뷰 모드<span class="iv-hide-narrow">화면을 눌러 질문을 띄웁니다</span></span>' +
      '<button class="iv-btn on" id="iv-toggle">질문 영역 표시</button>' +
      '<button class="iv-btn iv-hide-narrow" id="iv-flash">어디 있지?</button>' +
      '<span class="iv-seg" id="iv-tier">' +
        '<button data-t="10">10분</button><button data-t="20">20분</button>' +
        '<button data-t="30" aria-pressed="true">전체</button>' +
      '</span>' +
      '<span class="grow"></span>' +
      '<select class="iv-sel" id="iv-sess" title="인터뷰 대상"></select>' +
      '<select class="iv-sel iv-hide-narrow" id="iv-who" title="담당 업무">' +
        '<option value="all">공통</option><option value="sales">영업</option>' +
        '<option value="solution">솔루션</option><option value="cs">CS</option>' +
      '</select>' +
      '<button class="iv-btn" id="iv-new">＋</button>' +
      '<span id="iv-timer">00:00</span>' +
      '<button class="iv-btn" id="iv-timer-btn">시작</button>' +
      '<button class="iv-btn" id="iv-export">내보내기</button>' +
      '<button class="iv-btn on" id="iv-panel-btn">패널</button>';
    document.body.appendChild(bar);

    document.getElementById('iv-toggle').addEventListener('click', function () {
      view.on = !view.on;
      this.classList.toggle('on', view.on);
      this.textContent = view.on ? '질문 영역 표시' : '질문 영역 숨김';
      document.body.classList.toggle('iv-on', view.on);
    });
    document.getElementById('iv-flash').addEventListener('click', function () {
      if (!view.on) { document.getElementById('iv-toggle').click(); }
      document.body.classList.add('iv-flash');
      setTimeout(function () { document.body.classList.remove('iv-flash'); }, 2000);
    });
    document.getElementById('iv-tier').addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) { return; }
      view.tier = Number(b.dataset.t);
      [].forEach.call(this.children, function (c) { c.setAttribute('aria-pressed', c === b); });
      apply(); renderPanel();
    });
    document.getElementById('iv-panel-btn').addEventListener('click', function () {
      view.panel = !view.panel;
      this.classList.toggle('on', view.panel);
      document.body.classList.toggle('iv-panel-open', view.panel);
    });
    document.getElementById('iv-sess').addEventListener('change', function () {
      store.current = Number(this.value); save(); renderSess(); apply(); renderPanel();
    });
    document.getElementById('iv-who').addEventListener('change', function () {
      cur().who = this.value; save();
    });
    document.getElementById('iv-new').addEventListener('click', function () {
      var n = prompt('인터뷰 대상 이름 (또는 구분)', '대상 ' + (store.sessions.length + 1));
      if (!n) { return; }
      store.sessions.push(blank(n));
      store.current = store.sessions.length - 1;
      elapsed = 0; stopTimer(); tick();
      save(); renderSess(); apply(); renderPanel();
    });
    document.getElementById('iv-timer-btn').addEventListener('click', function () {
      if (timerId) {
        stopTimer();
        cur().mins = Math.round(elapsed / 60); save();
        if (Q.some(function (q) { return answered(q.id); })) { exportMd(); }
      } else {
        this.textContent = '정지';
        timerId = setInterval(function () { elapsed += 1; tick(); }, 1000);
      }
    });
    document.getElementById('iv-export').addEventListener('click', exportMd);
    renderSess();
  }
  function stopTimer() {
    if (timerId) { clearInterval(timerId); timerId = null; }
    var b = document.getElementById('iv-timer-btn');
    if (b) { b.textContent = '시작'; }
  }
  function tick() {
    var t = document.getElementById('iv-timer');
    t.textContent = fmt(elapsed);
    t.className = elapsed > view.tier * 60 ? 'over' : '';
  }
  function fmt(s) {
    var m = Math.floor(s / 60), x = s % 60;
    return (m < 10 ? '0' : '') + m + ':' + (x < 10 ? '0' : '') + x;
  }
  function renderSess() {
    var sel = document.getElementById('iv-sess');
    sel.innerHTML = '';
    store.sessions.forEach(function (s, i) {
      var o = document.createElement('option');
      o.value = i; o.textContent = s.name;
      sel.appendChild(o);
    });
    sel.value = store.current;
    var w = document.getElementById('iv-who');
    if (w) { w.value = cur().who || 'all'; }
  }

  /* ── 패널 ──────────────────────────────────────────── */
  function buildPanel() {
    var p = document.createElement('aside');
    p.id = 'iv-panel';
    p.innerHTML =
      '<div class="head"><div><b id="iv-p-title">질문</b><div class="sub" id="iv-p-sub"></div></div></div>' +
      '<div class="body" id="iv-p-body"></div>' +
      '<div class="foot">' +
        '<button class="iv-btn" id="iv-all">이 화면</button>' +
        '<button class="iv-btn" id="iv-every">전체</button>' +
        '<button class="iv-btn" id="iv-rest">남은 10분</button>' +
      '</div>';
    document.body.appendChild(p);
    document.body.classList.add('iv-panel-open');

    document.getElementById('iv-all').addEventListener('click', function () {
      view.sel = null; view.selLabel = '';
      markActive(null); renderPanel();
    });
    document.getElementById('iv-every').addEventListener('click', function () {
      view.sel = Q.map(function (q) { return q.id; });
      view.selLabel = '전체 질문';
      markActive(null); renderPanel();
    });
    document.getElementById('iv-rest').addEventListener('click', function () {
      view.sel = Q.filter(function (q) { return q.tier === 10 && !answered(q.id); }).map(function (q) { return q.id; });
      view.selLabel = '아직 답이 없는 10분 질문';
      markActive(null); renderPanel();
    });
  }

  function currentRoute() {
    return (location.hash.replace(/^#\//, '') || 'home').split('/')[0];
  }

  /* 이 화면에 걸린 질문 전체(중복 제거, 티어 적용) */
  function screenQuestions() {
    var route = currentRoute();
    var specs = (HOTSPOTS['*'] || []).concat(HOTSPOTS[route] || []);
    var ids = [], seen = {};
    specs.forEach(function (sp) {
      sp.qs.forEach(function (id) { if (!seen[id]) { seen[id] = 1; ids.push(id); } });
    });
    return ids;
  }

  function renderPanel() {
    var body = document.getElementById('iv-p-body');
    var title = document.getElementById('iv-p-title');
    var sub = document.getElementById('iv-p-sub');
    if (!body) { return; }

    var ids = view.sel || screenQuestions();
    var list = ids.map(function (id) { return byId[id]; })
                  .filter(function (q) { return q && q.tier <= view.tier; });

    title.textContent = view.selLabel || (view.sel ? '선택한 영역' : '이 화면의 질문');
    var n = list.filter(function (q) { return answered(q.id); }).length;
    sub.textContent = list.length ? (list.length + '문항 · ' + n + '개 기록' + (view.sel ? '' : ' · 화면의 보라색 영역을 눌러 좁히기')) : '';

    body.innerHTML = '';
    if (!list.length) {
      body.innerHTML = '<div class="iv-empty">이 구간에 걸린 질문이 없습니다.<br>' +
        '<kbd>전체</kbd> 로 티어를 넓혀 보세요.</div>';
      return;
    }

    var bySec = {};
    list.forEach(function (q) { (bySec[q.s] = bySec[q.s] || []).push(q); });
    SECTIONS.forEach(function (sec) {
      var qs = bySec[sec.id];
      if (!qs) { return; }
      var h = document.createElement('div');
      h.className = 'iv-sec';
      h.textContent = sec.title;
      body.appendChild(h);
      qs.forEach(function (q) { body.appendChild(card(q)); });
    });
  }

  function card(q) {
    var s = cur();
    var el = document.createElement('div');
    el.className = 'iv-q' + (answered(q.id) ? ' done' : '');

    var tags = '<span class="iv-tag id">' + q.id + '</span>' +
               '<span class="iv-tag' + (q.tier === 10 ? ' t10' : '') + '">' + q.tier + '분</span>';

    el.innerHTML = '<div class="tags">' + tags + '</div><div class="qt"></div>' +
      (q.why ? '<div class="why">' + q.why + '</div>' : '');
    el.querySelector('.qt').textContent = q.q;

    var ta = document.createElement('textarea');
    ta.placeholder = '답변 받아 적기…';
    ta.value = s.answers[q.id] || '';
    grow(ta);
    ta.addEventListener('input', function () {
      s.answers[q.id] = ta.value;
      s.asked[q.id] = true;
      s.updatedAt = Date.now();
      el.classList.toggle('done', !!ta.value.trim());
      grow(ta); save(); refreshBadges();
    });
    el.appendChild(ta);
    return el;
  }
  function grow(ta) {
    ta.style.height = 'auto';
    ta.style.height = Math.max(38, ta.scrollHeight + 2) + 'px';
  }

  /* ── 핫스팟 ────────────────────────────────────────── */
  function clear(root) {
    [].forEach.call(root.querySelectorAll('.iv-hot'), function (el) {
      el.classList.remove('iv-hot', 'iv-active', 'iv-answered');
      el.removeAttribute('data-iv-n');
      el.removeAttribute('data-iv-qs');
      el.removeAttribute('data-iv-label');
    });
  }

  function attach(root, specs) {
    specs.forEach(function (sp) {
      var ids = sp.qs.filter(function (id) { return byId[id] && byId[id].tier <= view.tier; });
      if (!ids.length) { return; }
      var nodes;
      try { nodes = root.querySelectorAll(sp.sel); } catch (e) { return; }
      if (!nodes.length) { return; }          /* 화면이 바뀌어 셀렉터가 안 맞아도 조용히 지나간다 */
      var targets = sp.all ? [].slice.call(nodes) : [nodes[0]];
      targets.forEach(function (el) {
        if (el.classList.contains('iv-hot')) { return; }   /* 먼저 붙은 핫스팟이 이긴다 */
        el.classList.add('iv-hot');
        el.setAttribute('data-iv-n', ids.length);
        el.setAttribute('data-iv-qs', ids.join(','));
        el.setAttribute('data-iv-label', sp.label);
        el.title = sp.label + ' — 질문 ' + ids.length + '개';
      });
    });
  }

  function apply() {
    var main = document.getElementById('main');
    var side = document.getElementById('side');
    if (!main) { return; }
    clear(main); clear(side);

    var route = currentRoute();
    attach(main, HOTSPOTS[route] || []);
    attach(main, HOTSPOTS['*'] || []);
    attach(side, [IV.NAV_HOTSPOT]);
    refreshBadges();
  }

  function refreshBadges() {
    [].forEach.call(document.querySelectorAll('.iv-hot'), function (el) {
      var ids = (el.getAttribute('data-iv-qs') || '').split(',');
      var done = ids.filter(answered).length;
      el.classList.toggle('iv-answered', done > 0 && done === ids.length);
      el.setAttribute('data-iv-n', done ? done + '/' + ids.length : ids.length);
    });
  }

  function markActive(el) {
    [].forEach.call(document.querySelectorAll('.iv-hot.iv-active'), function (n) { n.classList.remove('iv-active'); });
    if (el) { el.classList.add('iv-active'); }
  }

  /* 클릭 가로채기 — 캡처 단계에서 잡아 프로토타입의 동작보다 먼저 처리한다.
     질문 영역 표시가 꺼져 있으면 아무것도 하지 않는다(프로토타입이 그대로 동작). */
  document.addEventListener('click', function (e) {
    if (!view.on) { return; }
    var hot = e.target.closest ? e.target.closest('.iv-hot') : null;
    if (!hot) { return; }
    e.preventDefault();
    e.stopPropagation();
    view.sel = (hot.getAttribute('data-iv-qs') || '').split(',');
    view.selLabel = hot.getAttribute('data-iv-label') || '';
    markActive(hot);
    if (!view.panel) { document.getElementById('iv-panel-btn').click(); }
    renderPanel();
    document.getElementById('iv-p-body').scrollTop = 0;
  }, true);

  /* ── 내보내기 ──────────────────────────────────────── */
  function toMarkdown() {
    var s = cur();
    var out = ['# 인터뷰 기록 — ' + s.name, '', '- 일시: ' + s.date,
               '- 담당: ' + whoLabel(s.who),
               '- 소요: ' + fmt(elapsed || (s.mins || 0) * 60), ''];
    SECTIONS.forEach(function (sec) {
      var qs = Q.filter(function (q) { return q.s === sec.id && answered(q.id); });
      if (!qs.length) { return; }
      out.push('## ' + sec.title, '');
      qs.forEach(function (q) {
        out.push('**[' + q.id + '] ' + q.q + '**', '');
        out.push(s.answers[q.id].trim().split('\n').map(function (l) { return '> ' + l; }).join('\n'), '');
      });
    });
    var miss = Q.filter(function (q) { return q.tier === 10 && !answered(q.id); });
    if (miss.length) {
      out.push('## 못 물어본 10분 질문', '');
      miss.forEach(function (q) { out.push('- [' + q.id + '] ' + q.q); });
      out.push('');
    }
    return out.join('\n');
  }

  function exportMd() {
    var md = toMarkdown();
    var wrap = document.createElement('div');
    wrap.id = 'iv-modal';
    wrap.innerHTML =
      '<div class="box"><h3>결과 내보내기 — ' + esc(cur().name) + '</h3>' +
      '<div class="in"><p class="iv-hint">내려받은 파일은 <code>docs/interviews/results/</code> 에 옮겨 둡니다. ' +
      '이 페이지는 브라우저 안에만 기록을 들고 있어서, 내보내지 않으면 남지 않습니다.</p>' +
      '<textarea id="iv-md"></textarea></div>' +
      '<div class="act">' +
        '<button class="iv-btn on" id="iv-copy">전체 복사</button>' +
        '<button class="iv-btn" id="iv-dl">.md 저장</button>' +
        '<button class="iv-btn" id="iv-close">닫기</button>' +
      '</div></div>';
    document.body.appendChild(wrap);
    wrap.querySelector('#iv-md').value = md;
    wrap.addEventListener('click', function (e) { if (e.target === wrap) { wrap.remove(); } });
    wrap.querySelector('#iv-close').addEventListener('click', function () { wrap.remove(); });
    wrap.querySelector('#iv-copy').addEventListener('click', function () {
      var ta = wrap.querySelector('#iv-md');
      ta.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e2) {}
      if (!ok && navigator.clipboard) { navigator.clipboard.writeText(ta.value); }
      cur().exportedAt = Date.now(); save();
      this.textContent = '복사됨';
    });
    wrap.querySelector('#iv-dl').addEventListener('click', function () {
      var blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = fileName(cur());
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
      cur().exportedAt = Date.now(); save();
      this.textContent = '저장됨';
    });
  }

  /* ── 기동 ──────────────────────────────────────────── */
  function boot() {
    document.body.classList.add('iv-on', 'iv-ready');
    buildTop();
    buildPanel();
    apply();
    renderPanel();

    /* 프로토타입이 #main 을 통째로 갈아끼우므로 그때마다 다시 붙인다 */
    var mo = new MutationObserver(function () {
      clearTimeout(boot._t);
      boot._t = setTimeout(function () { apply(); renderPanel(); }, 30);
    });
    mo.observe(document.getElementById('main'), { childList: true });
    mo.observe(document.getElementById('side'), { childList: true });

    window.addEventListener('hashchange', function () {
      view.sel = null; view.selLabel = '';
      setTimeout(function () { apply(); renderPanel(); }, 40);
    });

    window.addEventListener('beforeunload', function (e) {
      if (!unsaved().length) { return; }
      e.preventDefault();
      e.returnValue = '';   /* 문구는 브라우저가 정한다 */
    });
  }

  if (document.readyState === 'loading') {
    /* 프로토타입 app.js 의 DOMContentLoaded(첫 렌더)보다 뒤에 서야 한다 */
    window.addEventListener('DOMContentLoaded', function () { setTimeout(boot, 0); });
  } else {
    setTimeout(boot, 0);
  }
})(window);
