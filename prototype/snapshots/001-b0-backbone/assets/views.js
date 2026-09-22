/* 화면. 렌더 함수가 HTML 문자열을 돌려주고, 동작은 window.ACT 에 건다. */
(function (g) {
  'use strict';
  var esc = UI.esc;

  var PHASE = { SALES: ['sales', '영업'], SOLUTION: ['solution', '솔루션'], MAINTENANCE: ['maint', '유지보수'] };
  function phaseTag(p) { var x = PHASE[p]; return '<span class="tag ' + x[0] + '">' + x[1] + '</span>'; }
  function tag(cls, text) { return '<span class="tag ' + cls + '">' + esc(text) + '</span>'; }
  function bar(v) { return '<div class="bar" title="' + v + '%"><i style="width:' + v + '%"></i></div>'; }
  function period(a, b) { return (a || '?') + ' ~ ' + (b || '?'); }
  function link(href, text) { return '<a href="' + href + '">' + esc(text) + '</a>'; }

  var SALES_STAGE = ['리드', '제안', '견적', '수주'];
  var SOLUTION_STATUS = ['진행 전', '진행', '검수', '완료'];
  var CONTRACT_STATUS = ['신규', '유지', '종료'];
  var ISSUE_TYPE = ['장애', '문의', '요청'];
  var ISSUE_STATUS = ['접수', '처리중', '고객확인대기', '완료'];
  var SOLUTIONS = ['검색엔진', '검색엔진(API)', '검색엔진(OEM)', 'AI 검색', '문서중앙화', '문서뷰어/추출'];

  /* ── 영업 > 프로젝트 ─────────────────────────────────────── */
  /* 목록의 기준은 phase 가 아니라 "이 영역의 행을 가지고 있는가"다.
     이관해도 이 목록에서 사라지지 않는다 — 원래 영역의 행은 상태만 바뀐 채 남는다. */
  function withRows(getRows) {
    return DB.projects.filter(function (p) { return getRows(p.id).length; })
      .sort(function (a, b) {
        var ao = DB.openRow(getRows(a.id)).closedAt ? 1 : 0;
        var bo = DB.openRow(getRows(b.id)).closedAt ? 1 : 0;
        return ao - bo;
      });
  }

  UI.route('sales', function () {
    var rows = withRows(DB.salesOf);
    var h = '<div class="head"><div><h1>영업 › 프로젝트</h1>' +
      '<p class="lead">수주 이전 구간. <strong>이관해도 이 목록에 남는다</strong> — 단계가 수주로 바뀌고 솔루션에 행이 새로 생긴다.</p></div>' +
      '<button class="btn primary" onclick="ACT.newSales()">+ 프로젝트 생성</button></div>';
    if (!rows.length) { return h + '<p class="empty">영업 프로젝트가 없습니다.</p>'; }
    h += '<table><thead><tr><th>고객사</th><th>프로젝트명</th><th>단계</th><th>솔루션</th>' +
      '<th class="num">예상 수주액</th><th>예상 착수</th><th>영업대표</th><th></th></tr></thead><tbody>';
    rows.forEach(function (p) {
      var s = DB.openRow(DB.salesOf(p.id));
      var done = !!s.closedAt;
      h += '<tr><td>' + esc(p.client) + '</td>' +
        '<td>' + link('#/project/' + p.id, p.name) + '</td>' +
        '<td>' + tag(done ? 'off' : 'sales', s.stage) +
        (done ? ' <span class="tag solution">이관 ' + esc(s.closedAt) + '</span>' : '') + '</td>' +
        '<td>' + esc(p.solution) + '</td>' +
        '<td class="num">' + (s.expectedAmount ? DB.won(s.expectedAmount) : '<span class="tag off">미정</span>') + '</td>' +
        '<td>' + esc(s.expectedStart || '-') + '</td>' +
        '<td>' + esc(DB.personName(s.ownerId)) + '</td>' +
        '<td class="num"><button class="btn small" onclick="ACT.log(' + p.id + ')">이관 내역</button> ' + (done
          ? link('#/solution', '솔루션에서 보기 →')
          : '<button class="btn small" onclick="ACT.toSolution(' + p.id + ')">솔루션 이관 →</button>') +
        '</td></tr>';
    });
    h += '</tbody></table>';
    h += '<div class="note q"><strong>확인할 것</strong> — ① 이관된 건이 계속 쌓이면 이 목록은 영영 길어집니다' +
      '(실데이터 382건). "진행 중만" 필터가 기본이어야 하는지. ② 영업 단계에서 고객사·프로젝트명이 아직 없을 수 있습니다' +
      '(위 "한솔그룹" 건은 금액 미정) — 이름 없이 등록을 허용할지.</div>';
    return h;
  });

  /* ── 솔루션 > 프로젝트 ───────────────────────────────────── */
  UI.route('solution', function () {
    var rows = withRows(DB.solutionOf);
    var h = '<div class="head"><div><h1>솔루션 › 프로젝트</h1>' +
      '<p class="lead">영업에서 이관된 구축 구간. <strong>유지보수로 이관해도 이 목록에 남는다</strong> — 상태가 완료로 바뀐다.</p></div>' +
      '<button class="btn" disabled title="미정 — 이 영역에서 직접 만들 수 있어야 하는가?">+ 자체 생성 <span class="tag warn">미정</span></button></div>';
    if (!rows.length) { return h + '<p class="empty">솔루션 프로젝트가 없습니다.</p>'; }
    h += '<table><thead><tr><th>고객사</th><th>프로젝트명</th><th>상태</th><th class="num">계약 M/M</th>' +
      '<th>기간</th><th>진행률</th><th>투입</th><th></th></tr></thead><tbody>';
    rows.forEach(function (p) {
      var s = DB.openRow(DB.solutionOf(p.id));
      var done = !!s.closedAt;
      var con = DB.contractOfProject(p.id)[0];
      var who = s.assignments.map(function (a) { return DB.personName(a.personId) + '(' + a.monthlyMm + ')'; }).join(', ');
      h += '<tr><td>' + esc(p.client) + '</td>' +
        '<td>' + link('#/project/' + p.id, p.name) + '</td>' +
        '<td>' + tag(done ? 'off' : 'solution', s.status) +
        (done ? ' <span class="tag maint">이관 ' + esc(s.closedAt) + '</span>' : '') + '</td>' +
        '<td class="num">' + s.contractMm + '</td>' +
        '<td>' + esc(period(s.startDate, s.endDate)) + '</td>' +
        '<td><div class="row">' + bar(s.progress) + '<span>' + s.progress + '%</span>' +
        (done ? '' : '<button class="btn small" onclick="ACT.progress(' + p.id + ')">수정</button>') + '</div></td>' +
        '<td>' + (who ? esc(who) : '<span class="tag off">없음</span>') +
        (done ? '' : ' <button class="btn small" onclick="ACT.assign(' + p.id + ')">+</button>') + '</td>' +
        '<td class="num"><button class="btn small" onclick="ACT.log(' + p.id + ')">이관 내역</button> ' + (done
          ? (con ? link('#/contract/' + con.id, '계약에서 보기 →') : '<span class="tag off">이관됨</span>')
          : s.progress === 100
            ? '<button class="btn small" onclick="ACT.toMaintenance(' + p.id + ')">유지보수 이관 →</button>'
            : '<span class="tag off">진행률 100%부터 이관</span>') +
        '</td></tr>';
    });
    h += '</tbody></table>';
    h += '<div class="note q"><strong>확인할 것</strong> — ① 진행률 100%는 <strong>이관의 전제조건</strong>입니다' +
      '(100%가 되어야 이관 버튼이 나타난다). 100% 자체가 상태를 완료로 바꾸지는 않습니다 — 완료는 이관이 만듭니다. ' +
      '② 자체 생성을 허용하면 "모든 프로젝트는 영업을 거친다"는 줄기가 깨집니다. ' +
      '③ 이관된 건은 여기서 읽기 전용입니다 — 수정이 필요해지면 어디서 하는지.</div>';
    return h;
  });

  /* ── 유지보수 > 계약 ─────────────────────────────────────── */
  UI.route('maintenance', function () {
    var h = '<div class="head"><div><h1>유지보수 › 계약</h1>' +
      '<p class="lead">원천은 <strong>계약</strong>이다. 이관으로 생기기도 하고, 이관 없이 직접 등록하기도 한다.</p></div>' +
      '<button class="btn primary" onclick="ACT.newContract()">+ 계약 신규 생성</button></div>';
    h += '<table><thead><tr><th>계약사</th><th>계약명</th><th>상태</th><th>기간</th>' +
      '<th class="num">계약금액</th><th>사이트</th><th>출처</th><th></th></tr></thead><tbody>';
    DB.contracts.forEach(function (c) {
      var st = DB.sitesOf(c.id);
      h += '<tr><td>' + esc(c.client) + '</td>' +
        '<td>' + link('#/contract/' + c.id, c.name) + '</td>' +
        '<td>' + tag(c.status === '종료' ? 'off' : 'maint', c.status) + '</td>' +
        '<td>' + esc(period(c.startDate, c.endDate)) + '</td>' +
        '<td class="num">' + DB.won(c.amount) + '</td>' +
        '<td>' + st.length + '개</td>' +
        '<td>' + (c.sourceProjectId ? link('#/project/' + c.sourceProjectId, '이관') : '<span class="tag off">직접 등록</span>') + '</td>' +
        '<td class="num">' + (c.sourceProjectId
          ? '<button class="btn small" onclick="ACT.log(' + c.sourceProjectId + ')">이관 내역</button> ' : '') +
        '<button class="btn small" onclick="ACT.editContract(' + c.id + ')">수정</button></td></tr>';
    });
    h += '</tbody></table>';
    h += '<div class="note q"><strong>확인할 것</strong> — 계약:사이트가 1:N입니다(가온아이 1계약 3사이트). ' +
      '이관으로 생긴 계약은 사이트가 1개뿐인데, 이관 시 사이트를 몇 개까지 받아야 하는지가 미확정입니다.</div>';
    return h;
  });

  /* ── 이슈 (솔루션 · 유지보수) ─────────────────────────────── */
  function issueTable(scope) {
    var rows = DB.issues.filter(function (i) { return i.scope === scope; });
    if (!rows.length) { return '<p class="empty">이슈가 없습니다.</p>'; }
    var h = '<table><thead><tr><th>구분</th><th>제목</th><th>' + (scope === 'SOLUTION' ? '프로젝트' : '사이트') +
      '</th><th>상태</th><th>담당자</th><th>접수일</th><th>처리</th><th></th></tr></thead><tbody>';
    rows.forEach(function (i) {
      var where = '-';
      if (i.projectId) {
        var p = DB.project(i.projectId);
        where = p ? link('#/project/' + p.id, p.name) : '-';
      } else if (i.siteId) {
        var s = DB.byId(DB.sites, i.siteId);
        where = s ? link('#/contract/' + s.contractId, s.name) : '-';
      }
      h += '<tr><td>' + tag(i.type === '장애' ? 'warn' : 'off', i.type) + '</td>' +
        '<td>' + esc(i.title) + '</td><td>' + where + '</td>' +
        '<td>' + tag(i.status === '완료' ? 'off' : 'solution', i.status) + '</td>' +
        '<td>' + (i.assigneeId ? esc(DB.personName(i.assigneeId)) : '<span class="tag warn">미배정</span>') + '</td>' +
        '<td>' + esc(i.createdAt) + '</td>' +
        '<td>' + i.comments.length + '건</td>' +
        '<td class="num"><button class="btn small" onclick="ACT.editIssue(' + i.id + ')">수정</button> ' +
        '<button class="btn small" onclick="ACT.delIssue(' + i.id + ')">삭제</button></td></tr>';
    });
    return h + '</tbody></table>';
  }

  UI.route('solution-issues', function () {
    return '<div class="head"><div><h1>솔루션 › 이슈</h1>' +
      '<p class="lead">구축 중 발생한 이슈. 프로젝트에 붙는다.</p></div>' +
      '<button class="btn primary" onclick="ACT.newIssue(\'SOLUTION\')">+ 이슈 생성</button></div>' +
      issueTable('SOLUTION') +
      '<div class="note q"><strong>확인할 것</strong> — 솔루션 이슈와 유지보수 이슈가 같은 테이블인가 다른 테이블인가. ' +
      '지금은 붙는 대상이 다릅니다(프로젝트 vs 사이트).</div>';
  });

  UI.route('maintenance-issues', function () {
    return '<div class="head"><div><h1>유지보수 › 이슈</h1>' +
      '<p class="lead">계약 사이트에서 발생한 이슈. <strong>사이트</strong>에 붙는다.</p></div>' +
      '<button class="btn primary" onclick="ACT.newIssue(\'MAINTENANCE\')">+ 이슈 생성</button></div>' +
      issueTable('MAINTENANCE') +
      '<div class="note q"><strong>확인할 것</strong> — 이슈 <em>삭제</em>를 허용했습니다. ' +
      'v3는 처리 내용을 append-only 로그로 남겨 삭제 경로가 없었습니다 — 감사(F7) 관점에서 어느 쪽인지 정해야 합니다.</div>';
  });

  /* ── 프로젝트 상세 ─────────────────────────────────────────
     영역별 행은 프로젝트당 1개(1:1). 이관해도 지우지 않고 상태만 바꿔 남기므로,
     이관 내역은 따로 저장하지 않고 각 행의 openedAt/closedAt 에서 파생한다. */
  function kv(pairs) {
    var h = '<dl class="kv">';
    pairs.forEach(function (r) {
      if (r[1] === null || r[1] === undefined || r[1] === '') { return; }
      h += '<dt>' + esc(r[0]) + '</dt><dd>' + r[1] + '</dd>';
    });
    return h + '</dl>';
  }

  /* 단계 하나 = 그 영역의 행 하나. 기본은 한 줄, 펼치면 그 행의 내용이 그대로 나온다.
     펼친 내용은 어디서도 다시 만들지 않는다 — 남아 있는 행을 읽을 뿐이다. */
  function step(cls, at, title, src, detail, isLast) {
    return '<li class="' + cls + (isLast ? ' now' : '') + '"><details>' +
      '<summary><time>' + esc(at) + '</time>' + title + '</summary>' +
      '<div class="src">' + esc(src) + '</div>' + detail + '</details></li>';
  }

  function transferLog(p, sales, sol, con) {
    var steps = [];

    sales.forEach(function (s) {
      steps.push({ at: s.openedAt, cls: 'sales',
        title: '영업 등록 ' + tag(s.closedAt ? 'off' : 'sales', s.stage),
        src: 'sales_project #' + s.id + ' · openedAt ' + s.openedAt + (s.closedAt ? ' · closedAt ' + s.closedAt : ' · 진행 중'),
        detail: kv([
          ['단계', esc(s.stage)],
          ['예상 수주액', s.expectedAmount ? DB.won(s.expectedAmount) : '미정'],
          ['예상 착수', esc(s.expectedStart || '-')],
          ['영업대표', esc(DB.personName(s.ownerId))],
          ['메모', s.memo ? esc(s.memo) : '-']
        ]) });
    });

    sol.forEach(function (s) {
      var who = s.assignments.length
        ? s.assignments.map(function (a) { return esc(DB.personName(a.personId)) + ' · ' + esc(a.role) + ' · ' + a.monthlyMm + ' M/M'; }).join('<br>')
        : '없음';
      steps.push({ at: s.openedAt, cls: 'solution',
        title: '솔루션으로 이관 ' + tag(s.closedAt ? 'off' : 'solution', s.status),
        src: 'solution_project #' + s.id + ' · openedAt ' + s.openedAt + (s.closedAt ? ' · closedAt ' + s.closedAt : ' · 진행 중'),
        detail: kv([
          ['상태', esc(s.status)],
          ['계약 M/M', s.contractMm],
          ['기간', esc(period(s.startDate, s.endDate))],
          ['진행률', s.progress + '%'],
          ['투입 인력', who]
        ]) });
    });

    con.forEach(function (c) {
      var st = DB.sitesOf(c.id).map(function (x) {
        return esc(x.name) + ' <span class="tag off">' + esc(x.channel) + '</span> · ' +
          (x.engineerId ? esc(DB.personName(x.engineerId)) : '담당 미배정');
      }).join('<br>') || '없음';
      steps.push({ at: c.startDate, cls: 'maint',
        title: '유지보수로 이관 ' + link('#/contract/' + c.id, '계약 #' + c.id) + ' ' + tag('off', '1년'),
        src: 'contract #' + c.id + ' · startDate ' + c.startDate + ' · endDate ' + c.endDate,
        detail: kv([
          ['상태', esc(c.status)],
          ['기간', esc(period(c.startDate, c.endDate))],
          ['계약금액', DB.won(c.amount)],
          ['영업대표', esc(DB.personName(c.salesOwnerId))],
          ['사이트', st],
          ['비고', c.note ? esc(c.note) : '-']
        ]) });
    });

    if (!steps.length) { return '<p class="empty">이관 내역이 없습니다.</p>'; }
    steps.sort(function (a, b) { return a.at < b.at ? -1 : a.at > b.at ? 1 : 0; });
    var h = '<ol class="timeline">';
    steps.forEach(function (e, i) { h += step(e.cls, e.at, e.title, e.src, e.detail, i === steps.length - 1); });
    return h + '</ol>';
  }

  UI.route('project', function (id) {
    var p = DB.project(id);
    if (!p) { return '<h1>없는 프로젝트</h1>'; }
    var h = '<div class="head"><div><h1>' + esc(p.name) + '</h1>' +
      '<p class="lead">' + esc(p.client) + ' · ' + esc(p.solution) + ' · 담당 ' + esc(DB.personName(p.managerId)) +
      ' · 현재 영역 ' + phaseTag(p.phase) + '</p></div>' +
      '<button class="btn" onclick="ACT.log(' + p.id + ')">이관 내역</button></div>';

    h += '<div class="card common"><h3>공통 — project 테이블</h3><dl class="kv">' +
      '<dt>프로젝트 id</dt><dd>' + p.id + '</dd>' +
      '<dt>고객사</dt><dd>' + esc(p.client) + '</dd>' +
      '<dt>프로젝트명</dt><dd>' + esc(p.name) + '</dd>' +
      '<dt>솔루션</dt><dd>' + esc(p.solution) + '</dd>' +
      '<dt>담당자</dt><dd>' + esc(DB.personName(p.managerId)) + '</dd>' +
      '<dt>현재 영역</dt><dd>' + phaseTag(p.phase) + '</dd></dl></div>';

    h += '<div class="note q"><strong>이 화면이 보여 주는 구조</strong> — 공통 <code>project</code> 하나에 ' +
      '영역별 행은 <strong>영역당 1개(1:1)</strong>입니다. 영역별 값은 각 영역 목록이 이미 보여 주므로 ' +
      '여기서 되풀이하지 않습니다. 이관해도 행을 지우지 않고 상태만 바꿔 남기므로, ' +
      '<strong>이관 내역은 따로 저장하지 않고</strong> 그 행들의 <code>openedAt</code>/<code>closedAt</code>에서 ' +
      '파생됩니다 — 위 <strong>이관 내역</strong> 버튼이 그때그때 만들어 냅니다(원본 이중화 금지). ' +
      '현재 영역도 마찬가지로 "어느 영역의 열린 행이 있는가"에서 나옵니다.' +
      '<br><br><strong>확인할 것</strong> — 1:1이 깨지는 곳이 하나 보입니다: ' +
      '<strong>유지보수 계약은 1년 고정</strong>이라 갱신하면 같은 프로젝트에 계약이 여러 개 생깁니다' +
      '(project : contract = 1:N). 갱신을 새 계약 행으로 볼지, 기존 계약의 기간 연장으로 볼지가 미확정입니다 — B4에서 정합니다.</div>';
    return h;
  });

  /* ── 계약 상세 ───────────────────────────────────────────── */
  UI.route('contract', function (id) {
    var c = DB.byId(DB.contracts, id);
    if (!c) { return '<h1>없는 계약</h1>'; }
    var st = DB.sitesOf(c.id);
    var h = '<div class="head"><div><h1>' + esc(c.name) + '</h1>' +
      '<p class="lead">' + esc(c.client) + ' · ' + tag(c.status === '종료' ? 'off' : 'maint', c.status) +
      ' · ' + esc(period(c.startDate, c.endDate)) + '</p></div>' +
      '<button class="btn" onclick="ACT.editContract(' + c.id + ')">계약 수정</button></div>';
    h += '<div class="card maint"><h3>계약 — contract #' + c.id + '</h3><dl class="kv">' +
      '<dt>계약금액</dt><dd>' + DB.won(c.amount) + '</dd>' +
      '<dt>영업대표</dt><dd>' + esc(DB.personName(c.salesOwnerId)) + '</dd>' +
      '<dt>출처</dt><dd>' + (c.sourceProjectId ? link('#/project/' + c.sourceProjectId, '프로젝트 이관') : '이관 없이 직접 등록') + '</dd>' +
      '<dt>비고</dt><dd>' + (c.note ? esc(c.note) : '-') + '</dd></dl></div>';
    h += '<h2>사이트 (' + st.length + ')</h2><table><thead><tr><th>사이트</th><th>채널</th>' +
      '<th>서버 사양</th><th>담당 엔지니어</th><th>이슈</th></tr></thead><tbody>';
    st.forEach(function (s) {
      var n = DB.issues.filter(function (i) { return i.siteId === s.id; }).length;
      h += '<tr><td>' + esc(s.name) + '</td><td>' + tag('off', s.channel) + '</td>' +
        '<td>' + esc(s.serverSpec || '-') + '</td>' +
        '<td>' + (s.engineerId ? esc(DB.personName(s.engineerId)) : '<span class="tag warn">미배정</span>') + '</td>' +
        '<td>' + n + '건</td></tr>';
    });
    return h + '</tbody></table>';
  });

  /* ── 홈 (대시보드) ───────────────────────────────────────── */
  var WIDGETS = [
    { k: 'mine', t: '내 프로젝트', fixed: true },
    { k: 'util', t: '내 가동률' },
    { k: 'noti', t: '최근 알림' },
    { k: 'issue', t: '내 담당 이슈' },
    { k: 'dept', t: '부서별 진행 현황' },
    { k: 'over', t: '과부하' },
    { k: 'due', t: '마감 임박' }
  ];
  var picked = ['mine', 'issue'];
  g.toggleWidget = function (k) {
    var i = picked.indexOf(k);
    if (i < 0) { picked.push(k); } else { picked.splice(i, 1); }
    UI.refresh();
  };

  function widgetBody(k) {
    if (k === 'mine') {
      var mine = DB.solutionRows.filter(function (r) {
        return !r.closedAt && r.assignments.some(function (a) { return a.personId === DB.ME; });
      });
      if (!mine.length) { return '<p class="empty">참여 중인 프로젝트가 없습니다.</p>'; }
      return mine.map(function (r) {
        var p = DB.project(r.projectId);
        return '<div class="row" style="justify-content:space-between">' +
          link('#/project/' + p.id, p.name) + bar(r.progress) + '</div>';
      }).join('');
    }
    if (k === 'issue') {
      var mi = DB.issues.filter(function (i) { return i.assigneeId === DB.ME; });
      if (!mi.length) { return '<p class="empty">담당 이슈가 없습니다.</p>'; }
      return mi.map(function (i) { return '<div>' + tag('off', i.status) + ' ' + esc(i.title) + '</div>'; }).join('');
    }
    return '<p class="empty">F3 · F4 단위에서 채웁니다 — 지금은 자리만.</p>';
  }

  UI.route('home', function () {
    var h = '<div class="head"><div><h1>홈</h1>' +
      '<p class="lead">기본값은 <strong>내가 참여하는 프로젝트</strong>(고정). 나머지는 고를 수 있다.</p></div></div>';
    h += '<div class="note"><strong>위젯</strong> ';
    WIDGETS.forEach(function (w) {
      var on = picked.indexOf(w.k) >= 0;
      h += '<button class="btn small' + (on ? ' primary' : '') + '"' +
        (w.fixed ? ' disabled title="고정"' : ' onclick="toggleWidget(\'' + w.k + '\')"') + '>' +
        esc(w.t) + (w.fixed ? ' · 고정' : '') + '</button> ';
    });
    h += '<span class="tag solution">NEW</span></div>';
    h += '<div class="grid">';
    WIDGETS.filter(function (w) { return picked.indexOf(w.k) >= 0; }).forEach(function (w) {
      h += '<div class="card"><h3>' + esc(w.t) + '</h3>' + widgetBody(w.k) + '</div>';
    });
    h += '</div>';
    h += '<div class="note q"><strong>확인할 것</strong> — 위젯 구성을 사람마다 저장한다면 그것도 저장 대상입니다' +
      '(계정 설정 테이블). F8에서 정합니다. 여기서는 고를 수 있다는 것만 보입니다.</div>';
    return h;
  });

  /* ── 미기획 스텁 ─────────────────────────────────────────── */
  function stub(title, unit, what) {
    return function () {
      return '<h1>' + esc(title) + '</h1><p class="lead">아직 기획하지 않았습니다.</p>' +
        '<div class="note">이 화면은 <strong>' + esc(unit) + '</strong> 단위에서 만듭니다 — ' + esc(what) +
        '. 내비에 자리만 잡아 두었습니다(선제 기획 금지).</div>';
    };
  }
  UI.route('people', stub('인력 · 조직', 'F1', '사람 · 조직 트리 · 직급'));
  UI.route('logs', stub('로그', 'F7', '감사 로그'));

  /* ── 동작 ────────────────────────────────────────────────── */
  g.ACT = {
    /* 이관 내역은 화면에 상주하지 않는다 — 필요할 때 이 버튼으로 연다. */
    log: function (pid) {
      var p = DB.project(pid);
      UI.info('이관 내역 — ' + p.name,
        transferLog(p, DB.salesOf(pid), DB.solutionOf(pid), DB.contractOfProject(pid)) +
        '<div class="note">저장된 로그가 아닙니다. 영역별 행의 <code>openedAt</code>/<code>closedAt</code>에서 ' +
        '그때그때 만들어 냅니다 — 각 줄 아래가 그 출처입니다.</div>');
    },

    newSales: function () {
      UI.modal('영업 프로젝트 생성',
        UI.field('고객사', 'client', '') +
        UI.field('프로젝트명', 'name', '') +
        UI.select('솔루션', 'solution', SOLUTIONS, SOLUTIONS[0]) +
        UI.select('단계', 'stage', SALES_STAGE, '리드') +
        UI.field('예상 수주액 (원)', 'expectedAmount', '', 'number') +
        UI.field('예상 착수일', 'expectedStart', '', 'date') +
        UI.select('영업대표', 'ownerId', UI.peopleOptions(false), 6) +
        UI.area('메모', 'memo', ''),
        '생성', function (f) {
          if (!f.client || !f.name) { UI.toast('고객사와 프로젝트명은 필요합니다'); return true; }
          DB.createSalesProject(f);
          UI.refresh();
          UI.toast('영업 프로젝트를 만들었습니다');
        });
    },

    toSolution: function (pid) {
      var p = DB.project(pid);
      var s = DB.openRow(DB.salesOf(pid));
      UI.modal('솔루션으로 이관 — ' + p.name,
        '<div class="note">이관은 <strong>되돌릴 수 없습니다</strong>. 영업 행은 닫히고 솔루션 행이 새로 생깁니다.</div>' +
        UI.fieldRO('고객사', '_c', p.client) +
        UI.field('계약 M/M', 'contractMm', '', 'number') +
        UI.field('착수일', 'startDate', s.expectedStart || DB.today(), 'date') +
        UI.field('종료일', 'endDate', '', 'date') +
        UI.select('PM', 'managerId', UI.peopleOptions(false), 1),
        '이관', function (f) {
          if (!f.contractMm || !f.startDate || !f.endDate) { UI.toast('계약 M/M와 기간은 필요합니다'); return true; }
          if (f.endDate <= f.startDate) { UI.toast('종료일은 착수일보다 뒤여야 합니다'); return true; }
          DB.transferToSolution(pid, f);
          location.hash = '#/solution';
          UI.refresh();
          UI.toast('솔루션으로 이관했습니다');
        });
    },

    toMaintenance: function (pid) {
      var p = DB.project(pid);
      var start = DB.today();
      UI.modal('유지보수로 이관 — ' + p.name,
        '<div class="note">이관은 <strong>되돌릴 수 없습니다</strong>. 솔루션 행이 완료로 닫히고 <strong>계약</strong>이 생깁니다. ' +
        '계약 기간은 <strong>1년 고정</strong>입니다.</div>' +
        UI.field('계약 시작일', 'startDate', start, 'date') +
        UI.fieldRO('계약 종료일', '_end', DB.plusYear(start), '시작일 + 1년 · 자동') +
        UI.field('계약금액 (원)', 'amount', '', 'number') +
        UI.field('사이트명', 'siteName', p.client) +
        UI.field('서버 사양', 'serverSpec', '') +
        UI.select('담당 엔지니어', 'engineerId', UI.peopleOptions(true), '') +
        UI.select('영업대표', 'salesOwnerId', UI.peopleOptions(false), 6),
        '이관', function (f) {
          if (!f.startDate) { UI.toast('계약 시작일이 필요합니다'); return true; }
          var c = DB.transferToMaintenance(pid, f);
          location.hash = '#/contract/' + c.id;
          UI.refresh();
          UI.toast('유지보수 계약을 만들었습니다 (' + c.startDate + ' ~ ' + c.endDate + ')');
        });
      var s = document.querySelector('[name=startDate]');
      var e = document.querySelector('[name=_end]');
      s.addEventListener('change', function () { e.value = DB.plusYear(s.value); });
    },

    newContract: function () {
      UI.modal('유지보수 계약 신규 생성',
        '<div class="note">이관 없이 직접 등록합니다 — 원천 프로젝트가 없는 계약입니다(OEM 등).</div>' +
        UI.field('계약사', 'client', '') +
        UI.field('계약명', 'name', '') +
        UI.select('상태', 'status', CONTRACT_STATUS, '신규') +
        UI.field('시작일', 'startDate', DB.today(), 'date') +
        UI.field('종료일', 'endDate', DB.plusYear(DB.today()), 'date') +
        UI.field('계약금액 (원)', 'amount', '', 'number') +
        UI.field('사이트명', 'siteName', '') +
        UI.select('채널', 'channel', ['ENT', 'OEM'], 'ENT') +
        UI.field('서버 사양', 'serverSpec', '') +
        UI.select('담당 엔지니어', 'engineerId', UI.peopleOptions(true), '') +
        UI.select('영업대표', 'salesOwnerId', UI.peopleOptions(false), 6) +
        UI.area('비고', 'note', ''),
        '생성', function (f) {
          if (!f.client || !f.name) { UI.toast('계약사와 계약명은 필요합니다'); return true; }
          DB.createContract(f);
          UI.refresh();
          UI.toast('계약을 등록했습니다');
        });
    },

    editContract: function (id) {
      var c = DB.byId(DB.contracts, id);
      UI.modal('계약 수정 — ' + c.client,
        UI.field('계약명', 'name', c.name) +
        UI.select('상태', 'status', CONTRACT_STATUS, c.status) +
        UI.field('시작일', 'startDate', c.startDate, 'date') +
        UI.field('종료일', 'endDate', c.endDate, 'date') +
        UI.field('계약금액 (원)', 'amount', c.amount, 'number') +
        UI.select('영업대표', 'salesOwnerId', UI.peopleOptions(false), c.salesOwnerId) +
        UI.area('비고', 'note', c.note),
        '저장', function (f) {
          DB.updateContract(id, f);
          UI.refresh();
          UI.toast('계약을 수정했습니다');
        });
    },

    assign: function (pid) {
      var row = DB.openRow(DB.solutionOf(pid));
      var cur = row.assignments.map(function (a, i) {
        return '<div class="row" style="justify-content:space-between">' +
          '<span>' + esc(DB.personName(a.personId)) + ' · ' + esc(a.role) + ' · ' + a.monthlyMm + ' M/M</span>' +
          '<button type="button" class="btn small" onclick="ACT.unassign(' + pid + ',' + i + ')">해제</button></div>';
      }).join('') || '<p class="empty">투입 인력이 없습니다.</p>';
      UI.modal('인력 투입 — ' + DB.project(pid).name,
        '<h3>현재</h3>' + cur + '<h3 style="margin-top:12px">추가</h3>' +
        UI.select('인력', 'personId', UI.peopleOptions(false), 1) +
        UI.select('역할', 'role', ['PM', 'PL', '참여자'], '참여자') +
        UI.field('월 M/M', 'monthlyMm', '0.5', 'number'),
        '투입', function (f) {
          DB.assign(pid, f);
          UI.refresh();
          UI.toast('투입했습니다');
        });
    },
    unassign: function (pid, i) { DB.unassign(pid, i); UI.closeModal(); UI.refresh(); UI.toast('해제했습니다'); },

    progress: function (pid) {
      var row = DB.openRow(DB.solutionOf(pid));
      UI.modal('진행률 · 상태 — ' + DB.project(pid).name,
        UI.field('진행률 (%)', 'progress', row.progress, 'number') +
        UI.select('상태', 'status', SOLUTION_STATUS, row.status) +
        '<div class="note">진행률 100%가 상태를 바꾸지는 않습니다(현행 유지). 완료·이관은 별도 행위입니다.</div>',
        '저장', function (f) {
          DB.setProgress(pid, f.progress);
          DB.setSolutionStatus(pid, f.status);
          UI.refresh();
          UI.toast('저장했습니다');
        });
    },

    newIssue: function (scope) {
      var target = scope === 'SOLUTION'
        ? UI.select('프로젝트', 'projectId', DB.projects.filter(function (p) {
              var r = DB.openRow(DB.solutionOf(p.id));
              return r && !r.closedAt;   // 이관이 끝난 건에는 새 이슈를 달지 않는다
            }).map(function (p) { return { v: p.id, t: p.client + ' · ' + p.name }; }), '')
        : UI.select('사이트', 'siteId', DB.sites.map(function (s) {
            var c = DB.byId(DB.contracts, s.contractId);
            return { v: s.id, t: c.client + ' · ' + s.name };
          }), '');
      UI.modal('이슈 생성', target +
        UI.select('구분', 'type', ISSUE_TYPE, '문의') +
        UI.field('제목', 'title', '') +
        UI.select('담당자', 'assigneeId', UI.peopleOptions(true), ''),
        '생성', function (f) {
          if (!f.title) { UI.toast('제목이 필요합니다'); return true; }
          f.scope = scope;
          DB.createIssue(f);
          UI.refresh();
          UI.toast('이슈를 만들었습니다');
        });
    },

    editIssue: function (id) {
      var i = DB.byId(DB.issues, id);
      var log = i.comments.map(function (c) {
        return '<div style="font-size:13px"><span style="color:var(--muted)">' + esc(c.at) + ' ' +
          esc(DB.personName(c.by)) + '</span> — ' + esc(c.text) + '</div>';
      }).join('') || '<p class="empty">처리 내용이 없습니다.</p>';
      UI.modal('이슈 수정',
        UI.select('구분', 'type', ISSUE_TYPE, i.type) +
        UI.field('제목', 'title', i.title) +
        UI.select('상태', 'status', ISSUE_STATUS, i.status) +
        UI.select('담당자', 'assigneeId', UI.peopleOptions(true), i.assigneeId || '') +
        '<h3 style="margin-top:12px">처리 내용</h3>' + log +
        UI.area('추가할 처리 내용', 'comment', ''),
        '저장', function (f) {
          DB.updateIssue(id, f);
          UI.refresh();
          UI.toast('이슈를 수정했습니다');
        });
    },

    delIssue: function (id) {
      var i = DB.byId(DB.issues, id);
      UI.modal('이슈 삭제',
        '<div class="note">「' + esc(i.title) + '」을 삭제합니다. 처리 내용 ' + i.comments.length +
        '건도 함께 사라집니다 — 되돌릴 수 없습니다.</div>',
        '삭제', function () {
          DB.deleteIssue(id);
          UI.refresh();
          UI.toast('삭제했습니다');
        });
    }
  };
})(window);
