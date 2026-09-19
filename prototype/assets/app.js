/* 셸: 내비 · 해시 라우터 · 공용 UI(모달/토스트).
   파일을 나눠 두되 ES 모듈은 쓰지 않는다 — file:// 로 더블클릭해 열 수 있어야 한다. */
(function (g) {
  'use strict';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* 내비 — 사용자가 정한 구조. 영역마다 화면이 갈린다(한 화면 탭 아님).
     권한별 표시(F5)는 여기서 항목을 걸러 내는 자리가 된다. 지금은 전부 보인다. */
  var NAV = [
    { kind: 'top', href: '#/home', label: '홈', todo: 'F8' },
    { kind: 'hr' },
    { kind: 'group', label: '영업' },
    { kind: 'item', href: '#/sales', label: '프로젝트' },
    { kind: 'group', label: '솔루션' },
    { kind: 'item', href: '#/solution', label: '프로젝트' },
    { kind: 'item', href: '#/solution-issues', label: '이슈' },
    { kind: 'group', label: '유지보수' },
    { kind: 'item', href: '#/maintenance', label: '계약' },
    { kind: 'item', href: '#/maintenance-issues', label: '이슈' },
    { kind: 'hr' },
    { kind: 'top', href: '#/people', label: '인력 · 조직', todo: 'F1' },
    { kind: 'top', href: '#/logs', label: '로그', todo: 'F7' }
  ];

  function renderNav(route) {
    var html = '<div class="brand">PMS v4<small>프로토타입 · 목업 데이터</small></div>';
    NAV.forEach(function (n) {
      if (n.kind === 'hr') { html += '<hr>'; return; }
      if (n.kind === 'group') { html += '<div class="group">' + esc(n.label) + '</div>'; return; }
      var cls = 'item' + (n.kind === 'top' ? ' top' : '') + (route === n.href.slice(2) ? ' on' : '');
      html += '<a class="' + cls + '" href="' + n.href + '">' + esc(n.label) +
        (n.todo ? '<span class="todo">' + n.todo + '</span>' : '') + '</a>';
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
      Array.prototype.forEach.call(this.elements, function (f) { if (f.name) { data[f.name] = f.value; } });
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
  function area(label, name, value) {
    return '<label class="f"><span>' + esc(label) + '</span>' +
      '<textarea name="' + name + '">' + esc(value || '') + '</textarea></label>';
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

  /* 라우터 */
  var routes = {};
  function route(name, fn) { routes[name] = fn; }

  function go() {
    var hash = location.hash.replace(/^#\//, '') || 'home';
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
    window.scrollTo(0, 0);
  }

  g.UI = {
    esc: esc, toast: toast, modal: modal, info: info, closeModal: closeModal,
    field: field, fieldRO: fieldRO, area: area, select: select, peopleOptions: peopleOptions,
    route: route, go: go, refresh: function () { go(); }
  };

  window.addEventListener('hashchange', go);
  window.addEventListener('DOMContentLoaded', function () {
    if (!location.hash) { location.hash = '#/sales'; }
    go();
  });
})(window);
