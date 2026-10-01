/* 셸: 내비 · 해시 라우터 · 공용 UI(모달/토스트).
   파일을 나눠 두되 ES 모듈은 쓰지 않는다 — file:// 로 더블클릭해 열 수 있어야 한다.

   v2 — 2026-09-30 인터뷰 반영본. v1(prototype/) 은 건드리지 않는다. */
(function (g) {
  'use strict';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* 내비 — v2 에서 바뀐 것 셋.
     ① 영업 단계를 하위 항목으로 펼쳤다(인터뷰: "단계별로 메뉴 구분, 트리구조로").
     ② 업무보고를 뺐다(추가 메모: "업무보고 탭 보류 · 개인 페이지로"). 사용자 결정으로 v2 에서 제외.
     ③ 회계를 묶음으로 더했다(추가 메모: 매출·매입 통계 / 수금 일정). 계산 원리는 아직 근거가 없다 —
        화면만 두고 숫자는 목업이다.
     권한별 표시(F5)는 여전히 여기서 항목을 걸러 내는 자리다. 지금은 전부 보인다. */
  var NAV = [
    { kind: 'top', href: '#/dashboard', label: '대시보드', todo: 'F8' },
    { kind: 'hr' },
    { kind: 'group', label: '영업' },
    { kind: 'item', href: '#/sales', label: '전체' },
    { kind: 'sub', href: '#/sales/lead', label: '리드' },
    { kind: 'sub', href: '#/sales/proposal', label: '제안' },
    { kind: 'sub', href: '#/sales/quote', label: '견적' },
    { kind: 'sub', href: '#/sales/won', label: '수주' },
    { kind: 'sub', href: '#/sales/lost', label: '실주', todo: '신규' },
    { kind: 'group', label: '솔루션' },
    { kind: 'item', href: '#/solution', label: '프로젝트' },
    { kind: 'item', href: '#/solution-issues', label: '이슈' },
    { kind: 'group', label: '유지보수' },
    { kind: 'item', href: '#/maintenance', label: '계약' },
    /* 이관은 솔루션이 아니라 여기에 있다(사용자 결정 2026-09-30) — 넘기는 쪽이 아니라
       받는 쪽의 화면이고, 넘어온 프로젝트를 계약과 무관하게 훑는 자리이기도 하다. */
    { kind: 'item', href: '#/mprojects', label: '프로젝트', todo: '신규' },
    { kind: 'item', href: '#/maintenance-issues', label: '이슈' },
    { kind: 'item', href: '#/checks', label: '정기점검', todo: '신규' },
    { kind: 'hr' },
    { kind: 'group', label: '회계', todo: '신규' },
    { kind: 'item', href: '#/finance', label: '매출 · 매입' },
    { kind: 'item', href: '#/payments', label: '수금 일정' },
    { kind: 'hr' },
    { kind: 'group', label: '개인페이지' },
    { kind: 'item', href: '#/my-todos', label: 'TODO · 주' },
    { kind: 'sub', href: '#/my-month', label: '월 보기', todo: '신규' },
    { kind: 'hr' },
    { kind: 'group', label: '관리자페이지' },
    { kind: 'item', href: '#/people', label: '인력 · 조직', todo: 'F1' },
    { kind: 'item', href: '#/logs', label: '로그', todo: 'F7' }
  ];

  function renderNav(route) {
    var html = '<div class="brand">PMS v4<small>프로토타입 <b>v2</b> · 인터뷰 반영</small></div>';
    NAV.forEach(function (n) {
      if (n.kind === 'hr') { html += '<hr>'; return; }
      if (n.kind === 'group') {
        html += '<div class="group">' + esc(n.label) +
          (n.todo ? '<span class="todo">' + esc(n.todo) + '</span>' : '') + '</div>';
        return;
      }
      var cls = 'item' +
        (n.kind === 'top' ? ' top' : '') +
        (n.kind === 'sub' ? ' sub' : '') +
        (route === n.href.slice(2) ? ' on' : '');
      html += '<a class="' + cls + '" href="' + n.href + '">' + esc(n.label) +
        (n.todo ? '<span class="todo">' + esc(n.todo) + '</span>' : '') + '</a>';
    });
    html += '<hr><a class="item top" href="index.html">← 프로토타입 색인</a>';
    document.getElementById('side').innerHTML = html;
  }

  /* 공용 UI */
  function toast(msg) {
    var t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 2600);
  }

  var onSubmit = null;
  function modal(title, bodyHtml, submitLabel, handler) {
    onSubmit = handler;
    document.getElementById('modal').innerHTML =
      '<div class="mask" id="mask"><form class="modal" id="mform">' +
      '<h2>' + esc(title) + '</h2>' + bodyHtml +
      '<div class="actions"><button type="button" class="btn" id="mcancel">취소</button>' +
      '<button type="submit" class="btn primary">' + esc(submitLabel) + '</button></div>' +
      '</form></div>';
    document.getElementById('mcancel').onclick = closeModal;
    document.getElementById('mask').onclick = function (e) { if (e.target.id === 'mask') { closeModal(); } };
    document.getElementById('mform').onsubmit = function (e) {
      e.preventDefault();
      var data = {};
      /* 체크박스는 값이 아니라 선택 여부를 준다 — 가져오기 팝업이 여러 건을 고를 수 있어야 한다 */
      Array.prototype.forEach.call(this.elements, function (f) {
        if (f.name) { data[f.name] = f.type === 'checkbox' ? f.checked : f.value; }
      });
      var keep = onSubmit(data);
      if (!keep) { closeModal(); }
    };
    var first = document.querySelector('#mform input, #mform select, #mform textarea');
    if (first) { first.focus(); }
  }
  function closeModal() { document.getElementById('modal').innerHTML = ''; onSubmit = null; }

  /* 읽기 전용 모달 — 닫기 버튼 하나만 둔다 */
  function info(title, bodyHtml) {
    document.getElementById('modal').innerHTML =
      '<div class="mask" id="mask"><div class="modal">' +
      '<h2>' + esc(title) + '</h2>' + bodyHtml +
      '<div class="actions"><button type="button" class="btn primary" id="mcancel">닫기</button></div>' +
      '</div></div>';
    document.getElementById('mcancel').onclick = closeModal;
    document.getElementById('mask').onclick = function (e) { if (e.target.id === 'mask') { closeModal(); } };
  }

  /* 폼 조각 */
  function field(label, name, value, type) {
    return '<label class="f"><span>' + esc(label) + '</span>' +
      '<input name="' + name + '" type="' + (type || 'text') + '" value="' + esc(value || '') + '"></label>';
  }
  function fieldRO(label, name, value, hint) {
    return '<label class="f"><span>' + esc(label) + (hint ? ' · ' + esc(hint) : '') + '</span>' +
      '<input name="' + name + '" value="' + esc(value || '') + '" readonly></label>';
  }
  function area(label, name, value, rows) {
    return '<label class="f"><span>' + esc(label) + '</span>' +
      '<textarea name="' + name + '"' + (rows ? ' rows="' + rows + '"' : '') + '>' + esc(value || '') + '</textarea></label>';
  }
  function select(label, name, options, value) {
    var h = '<label class="f"><span>' + esc(label) + '</span><select name="' + name + '">';
    options.forEach(function (o) {
      var v = o.v == null ? o : o.v;
      var t = o.t == null ? o : o.t;
      h += '<option value="' + esc(v) + '"' + (String(v) === String(value) ? ' selected' : '') + '>' + esc(t) + '</option>';
    });
    return h + '</select></label>';
  }
  function peopleOptions(includeNone) {
    var o = includeNone ? [{ v: '', t: '미배정' }] : [];
    return o.concat(DB.people.map(function (p) {
      return { v: p.id, t: p.name + ' (' + p.org + ')' + (p.billable ? '' : ' · 범위 밖') };
    }));
  }

  /* ── 열 개인화 ─────────────────────────────────────────────
     인터뷰: "메뉴 개인화 가능하면 요청", "보고 싶은 컬럼만 볼 수 있도록".
     프로토타입이므로 새로고침하면 기본값으로 돌아간다 — 저장 위치(사용자별 설정)는
     스펙에서 정할 문제이고, 여기서 확인하려는 것은 "고를 수 있는가" 뿐이다. */
  var colDefs = {};   /* key → [{k,t,on}] */
  var colOn = {};     /* key → [k...]     */

  function defineCols(key, all) {
    colDefs[key] = all;
    if (!colOn[key]) {
      colOn[key] = all.filter(function (c) { return c.on !== false; }).map(function (c) { return c.k; });
    }
    return {
      has: function (k) { return colOn[key].indexOf(k) >= 0; },
      /* 목록 머리에 붙는 버튼 — 누르면 체크박스 목록이 뜬다 */
      button: function () {
        return '<button class="btn" data-cols="' + esc(key) + '">열 선택 ' +
          '<span class="muted">' + colOn[key].length + '/' + all.length + '</span></button>';
      }
    };
  }

  function bindCols() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-cols]'), function (b) {
      b.onclick = function () {
        var key = b.getAttribute('data-cols');
        var all = colDefs[key] || [];
        var body = '<p class="lead">목록에 보일 열을 고릅니다. 새로고침하면 기본값으로 돌아갑니다.</p>';
        all.forEach(function (c) {
          body += '<label class="chk"><input type="checkbox" name="c_' + c.k + '"' +
            (colOn[key].indexOf(c.k) >= 0 ? ' checked' : '') + '> ' + esc(c.t) + '</label>';
        });
        modal('열 선택', body, '적용', function (d) {
          colOn[key] = all.filter(function (c) { return d['c_' + c.k]; }).map(function (c) { return c.k; });
          go();
        });
      };
    });
  }

  /* ── 검색 · 필터 막대 ──────────────────────────────────────
     인터뷰에서 영업·이슈 양쪽에서 나온 요구("검색넣기", "필터추가하기", "필터는 다 달면 좋을 것 같고").
     값은 화면이 살아 있는 동안만 유지된다. */
  var bars = {};
  function filterBar(key, defs, extraHtml) {
    if (!bars[key]) { bars[key] = {}; }
    var v = bars[key];
    /* class 는 filters — .bar 는 진행률 막대가 이미 쓰고 있다 */
    var h = '<div class="filters" data-bar="' + esc(key) + '">';
    h += '<input class="search" data-f="q" placeholder="검색 — 고객사 · 프로젝트명 · 담당자" value="' + esc(v.q || '') + '">';
    defs.forEach(function (d) {
      h += '<select data-f="' + esc(d.k) + '">';
      h += '<option value="">' + esc(d.t) + ' 전체</option>';
      d.options.forEach(function (o) {
        var ov = o.v == null ? o : o.v;
        var ot = o.t == null ? o : o.t;
        h += '<option value="' + esc(ov) + '"' + (String(ov) === String(v[d.k] || '') ? ' selected' : '') + '>' + esc(ot) + '</option>';
      });
      h += '</select>';
    });
    if (extraHtml) { h += extraHtml; }
    return h + '</div>';
  }
  function barValue(key) { return bars[key] || {}; }
  /* 목록 화면에서 값을 하나 눌러 바로 그 값으로 거르는 칩.
     인터뷰: "보이기에 한국거래소 클릭했을 때 딱 필터링 되게" */
  function chip(key, f, value, label) {
    return '<a class="chip" href="javascript:void 0" data-chip="' + esc(key) + '|' + esc(f) + '|' + esc(value) + '">' +
      esc(label == null ? value : label) + '</a>';
  }
  function bindBars() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-bar]'), function (bar) {
      var key = bar.getAttribute('data-bar');
      Array.prototype.forEach.call(bar.querySelectorAll('[data-f]'), function (el) {
        var f = el.getAttribute('data-f');
        var ev = el.tagName === 'SELECT' ? 'onchange' : 'oninput';
        el[ev] = function () {
          bars[key][f] = el.value;
          var at = document.activeElement === el;
          go();
          if (at) {
            var again = document.querySelector('[data-bar="' + key + '"] [data-f="' + f + '"]');
            if (again) { again.focus(); again.selectionStart = again.value.length; }
          }
        };
      });
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-chip]'), function (a) {
      a.onclick = function () {
        var p = a.getAttribute('data-chip').split('|');
        if (!bars[p[0]]) { bars[p[0]] = {}; }
        bars[p[0]][p[1]] = p[2];
        go();
      };
    });
  }
  function matches(hay, q) {
    if (!q) { return true; }
    return String(hay).toLowerCase().indexOf(String(q).toLowerCase()) >= 0;
  }

  /* 라우터 */
  var routes = {};
  function route(name, fn, after) {
    if (after) { fn.after = after; }   /* 그린 뒤 한 번 손봐야 하는 화면이 쓴다 */
    routes[name] = fn;
  }

  function go() {
    var hash = location.hash.replace(/^#\//, '') || 'dashboard';
    var parts = hash.split('/');
    var name = parts[0];
    renderNav(parts.length > 1 ? name + '/' + parts[1] : name);
    var fn = routes[name];
    var main = document.getElementById('main');
    if (!fn) {
      main.innerHTML = '<h1>없는 화면</h1><p class="lead">' + esc(hash) + '</p>';
      return;
    }
    main.innerHTML = fn(parts[1]);
    if (routes[name].after) { routes[name].after(parts[1]); }
    bindCols();
    bindBars();
    window.scrollTo(0, 0);
  }

  g.UI = {
    esc: esc, toast: toast, modal: modal, info: info, closeModal: closeModal,
    field: field, fieldRO: fieldRO, area: area, select: select, peopleOptions: peopleOptions,
    defineCols: defineCols, filterBar: filterBar, barValue: barValue, chip: chip, matches: matches,
    route: route, go: go, refresh: function () { go(); }
  };

  window.addEventListener('hashchange', go);
  window.addEventListener('DOMContentLoaded', function () {
    if (!location.hash) { location.hash = '#/sales'; }
    go();
  });
})(window);
