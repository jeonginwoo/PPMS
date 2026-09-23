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

  var projWeek = null;              /* 프로젝트 상세의 주차 — 화면 상태다 */
  var projView = 'cal';             /* 프로젝트 상세의 캘린더 · 보드 전환 */

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

    /* 이 프로젝트의 TODO — 개인 TODO 화면과 같은 조각(weekGrid · todoCard)을 쓰되 사람을 가리지 않는다.
       개인 화면의 질문이 "내가 이번 주에 뭘 하나"라면, 여기 질문은 "이 프로젝트에 지금 누가 뭘 하나"다.
       그래서 카드에 이름을 붙이고, 남의 카드는 눌러도 읽기만 된다(고치는 것은 권한 F5).
       캘린더는 한 주, 보드는 이 프로젝트의 전부(날짜 없음 포함)다 — 잘린 범위를 화면에 적어 둔다. */
    var pcal = projView === 'cal';
    var pw = projWeek || DB.weekStartOf(DB.today());
    var ptodos = pcal ? DB.todosOfProjectBetween(p.id, pw, DB.shiftDay(pw, 4)) : DB.todosOfProject(p.id);
    var pwho = ptodos.reduce(function (m, t) {
      if (m.indexOf(t.personId) < 0) { m.push(t.personId); }
      return m;
    }, []);

    h += '<div class="weekcap"><span>이 프로젝트의 TODO · ' +
      (pcal ? fmtDot(pw) + '~' + fmtDot(DB.shiftDay(pw, 4)) : '전체 · 날짜 없음 포함') +
      (pwho.length ? ' · ' + pwho.map(DB.personName).join(' · ') : '') + '</span>' +
      '<span class="row">' + ptodos.length + '건 ' +
      '<button class="btn small' + (pcal ? ' primary' : '') + '" onclick="ACT.projView(&quot;cal&quot;)">캘린더</button>' +
      '<button class="btn small' + (pcal ? '' : ' primary') + '" onclick="ACT.projView(&quot;board&quot;)">보드</button>' +
      (pcal
        ? '<button class="btn small" onclick="ACT.projWeek(-7)">←</button>' +
          '<button class="btn small" onclick="ACT.projWeek(0)">이번 주</button>' +
          '<button class="btn small" onclick="ACT.projWeek(7)">→</button>'
        : '<button class="btn small" onclick="ACT.newTodo(&quot;&quot;,' + p.id + ')">+ TODO</button>') +
      '</span></div>';

    if (pcal) {
      h += weekGrid(pw, {
        day: function (d) { return DB.todosOfProjectOn(p.id, d); },
        withWho: true,
        plus: function (d) { return 'ACT.newTodo(&quot;' + d + '&quot;,' + p.id + ')'; }
      });
    } else {
      h += '<div class="board">';
      TODO_STATUS.forEach(function (s) {
        var col = ptodos.filter(function (t) { return t.status === s; });
        h += '<div class="col"><h3><span>' + esc(s) + '</span><span>' + col.length + '</span></h3>';
        col.forEach(function (t) { h += todoCard(t, true, true); });
        if (!col.length) { h += '<p class="empty">없음</p>'; }
        h += '</div>';
      });
      h += '</div>';
    }

    h += '<div class="note q"><strong>확인할 것</strong> — 이 칸은 <strong>전원의 TODO</strong>를 보여 줍니다. ' +
      '남의 카드는 눌러도 읽기만 되고 고칠 수 없게 해 뒀는데, <strong>보이는 것 자체가 권한 문제</strong>입니다(F5) — ' +
      '프로젝트 참여자만 보는지, 조직 관리자도 보는지. 여기서 <code>+</code>로 만드는 TODO는 ' +
      '<strong>내 것</strong>으로 이 프로젝트에 붙습니다(남에게 할 일을 지정하는 것은 다른 기능이고, ' +
      '그건 이슈(F6)나 인력 배정(F2)이 할 일일 수 있습니다).<br><br>' +
      '<strong>범위가 다릅니다</strong> — 캘린더는 <em>그 주</em>만, 보드는 <em>이 프로젝트 전부</em>(날짜 없음 포함)입니다. ' +
      '보드를 주 단위로 자르면 "남은 일이 뭔가"에 답하지 못하고, 캘린더를 전체로 펴면 달력이 아니게 됩니다.</div>';


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
  }, equalizeSlots);

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

  /* ── 대시보드 ────────────────────────────────────────────── */
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

  UI.route('dashboard', function () {
    var h = '<div class="head"><div><h1>대시보드</h1>' +
      '<p class="lead">기본값은 <strong>내가 참여하는 프로젝트</strong>(고정). 나머지는 고를 수 있다. ' +
      '오늘의 사용자별 업무는 ' + link('#/report', '업무보고') + '에서 본다.</p></div></div>';
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

  /* ── 개인페이지 › TODO ─────────────────────────────────────
     개인페이지의 첫 화면. 사람이 자기 할 일을 직접 쓰는 곳이다 — 대시보드가 "보는 곳"이면 여기는 "쓰는 곳".
     주간 캘린더가 기본이고(사용자가 쓰는 도구의 모양), 상태로 모아 보는 보드가 같은 데이터를 다르게 보여준다.
     업무보고는 이 행들을 날짜·사람으로 모은 파생이다(보고서를 따로 저장하지 않는다 — 원본 이중화 금지). */
  var TODO_STATUS = ['시작 전', '진행', '완료'];
  var WEEKDAY = ['월', '화', '수', '목', '금', '토', '일'];
  var DOT = ['#7c6bd6', '#2f9e6e', '#d08b2c', '#2f7fd0', '#c2557a', '#3f9aa8'];

  function todoTag(s) { return tag(s === '완료' ? 'done' : (s === '진행' ? 'solution' : 'off'), s); }
  function projDot(id) { return DOT[Number(id) % DOT.length]; }
  function projectOptions() {
    return [{ v: '', t: '선택 안함' }].concat(DB.projects.map(function (p) {
      return { v: p.id, t: p.client + ' — ' + p.name };
    }));
  }

  /* 카드 하나 — 캘린더 · 보드 · 날짜 없음 칸 · 프로젝트 상세가 같은 조각을 쓴다.
     내 것이 아니면 눌러도 수정으로 가지 않는다(읽기만) — 남의 TODO를 고치는 것은 권한(F5) 문제다. */
  function todoCard(t, withWho, withDate) {
    var last = DB.lastDate(t);
    var late = last && last < DB.today() && t.status !== '완료';
    var p = t.projectId ? DB.project(t.projectId) : null;
    var mine = t.personId === DB.ME;
    return '<div class="tcard' + (late ? ' late' : '') + (mine ? '' : ' other') + '" onclick="ACT.' +
      (mine ? 'editTodo' : 'viewTodo') + '(' + t.id + ')">' +
      '<div class="tt">' + esc(t.title) + '</div>' +
      (p && !withWho ? '<div class="tp"><i class="dot" style="background:' + projDot(p.id) + '"></i>' +
        '<span class="name">' + esc(p.name) + '</span></div>' : '') +
      '<div class="tp">' + todoTag(t.status) +
      (late ? ' ' + tag('warn', '지난 날짜') : '') +
      (withDate ? ' <span class="name">' + (t.dates.length ? t.dates.map(function (d) { return fmtDot(d).slice(5); }).join(' · ') : '날짜 없음') + '</span>' : '') +
      (withWho ? ' ' + tag(mine ? 'solution' : 'off', DB.personName(t.personId) +
        (mine ? ' · 나' : '')) : '') + '</div></div>';
  }

  /* 주 캘린더 한 줄 — 개인 TODO 화면과 프로젝트 상세가 같은 조각을 쓴다.
     day(d) 가 그 날에 놓을 TODO를 준다. leavePid 가 있을 때만 휴가를 날짜 머리에 붙인다 —
     프로젝트 화면은 여러 사람의 카드가 섞이므로 개인 휴가를 붙일 자리가 없다. 공휴일은 전원 공통이라 늘 붙는다.
     같은 그리드 안에 요일 머리 · 이어진 도막 · 날짜 칸을 층으로 쌓는다. 한 그리드라야 도막이 칸에 정확히 맞는다. */
  /* 연속된 날에 걸친 할 일을 한 도막으로 묶는다.
     이어지는 것은 **붙어 있는 날**뿐이다 — 월 · 수처럼 하루 건너뛰면 두 도막이 되고,
     주가 갈리면(금 · 다음 주 월) 각 주에서 따로 그려진다. 캘린더가 월~금만 보여주기 때문이다. */
  function weekSpans(cols, days) {
    var seen = {}, out = [];
    cols.forEach(function (list) {
      list.forEach(function (t) {
        if (seen[t.id]) { return; }
        seen[t.id] = true;
        DB.dateRuns(t, days).forEach(function (r) { out.push({ todo: t, start: r[0], end: r[1] }); });
      });
    });
    return out;
  }
  /* 겹치는 도막은 층을 쌓는다 — 빈 층 중 가장 위를 고른다 */
  function packLanes(bars) {
    var lanes = [];
    bars.forEach(function (b) {
      var li = 0;
      while (lanes[li] && lanes[li].some(function (x) { return b.start <= x.end && b.end >= x.start; })) { li += 1; }
      lanes[li] = lanes[li] || [];
      lanes[li].push(b);
      b.lane = li;
    });
    return lanes.length;
  }

  /* 도막의 폭 — 칸 하나의 안쪽 폭(100%)에 칸 사이의 좌우 여백(7px+7px)을 칸 수만큼 더한다.
     그래서 도막의 양 끝이 보통 카드의 끝선과 정확히 맞는다. */
  function barWidth(b) {
    var s = b.end - b.start + 1;
    return 'width:calc(' + s + '00% + ' + ((s - 1) * 14) + 'px)';
  }

  /* 층 높이 맞추기 — 한 층에 도막과 보통 카드가 섞이면 높이가 달라지고, 그러면 아래 도막이 비뚤어진다.
     제목이 몇 줄로 접히는지는 그려 봐야 알 수 있어 CSS로는 못 맞춘다. 그린 뒤 한 번 재서 맞춘다. */
  function equalizeSlots() {
    if (!document.querySelectorAll) { return; }
    Array.prototype.forEach.call(document.querySelectorAll('.week'), function (w) {
      var slots = w.querySelectorAll('.slot');
      var max = 0;
      Array.prototype.forEach.call(slots, function (s) { s.style.height = ''; });
      Array.prototype.forEach.call(slots, function (s) {
        if (s.offsetHeight > max) { max = s.offsetHeight; }
      });
      Array.prototype.forEach.call(slots, function (s) { s.style.height = max + 'px'; });
    });
  }

  function weekGrid(ws, o) {
    var t0 = DB.today();
    var days = [], cols = [], i;
    for (i = 0; i < 5; i += 1) {
      days.push(DB.shiftDay(ws, i));
      cols.push(o.day(days[i]));
    }

    var bars = weekSpans(cols, days).filter(function (s) { return s.end > s.start; });
    packLanes(bars);
    var spanned = {};        /* 도막으로 그린 것은 날짜 칸에서 되풀이하지 않는다 */
    bars.forEach(function (b) {
      for (var k = b.start; k <= b.end; k += 1) { spanned[b.todo.id + '@' + k] = true; }
    });
    /* 도막은 날짜 칸 **안쪽 흐름**에 넣는다. 층(grid row)으로 빼면 도막이 없는 칸까지
       그 높이만큼 밀려 첫 카드가 둘째 줄에서 시작한다(실측 2026-09-23).
       걸쳐 있는 칸에는 같은 카드를 숨겨 넣어 자리만 잡는다 — 폭이 같으니 높이도 정확히 같다. */
    function laneAt(lane, col) {
      var hit = null;
      bars.forEach(function (b) {
        if (b.lane === lane && b.start <= col && col <= b.end) { hit = b; }
      });
      return hit;
    }
    function anyAt(lane) {
      var hit = null;
      bars.forEach(function (b) { if (b.lane === lane && !hit) { hit = b; } });
      return hit;
    }
    var deepest = days.map(function (d, col) {
      var m = -1;
      bars.forEach(function (b) { if (b.start <= col && col <= b.end && b.lane > m) { m = b.lane; } });
      return m;
    });

    var g = '<div class="weekwrap"><div class="week">';
    /* 칸 배경은 열 전체에 깐다 — 오늘 강조와 공휴일 사선이 요일 머리부터 바닥까지 이어져야 한다 */
    for (i = 0; i < 5; i += 1) {
      var bh = DB.holidayOf(days[i]);
      g += '<div class="colbg' + (i ? '' : ' first') + (days[i] === t0 ? ' today' : '') +
        (bh ? ' holiday' : '') + '" style="grid-column:' + (i + 1) + ';grid-row:1/span 2"></div>';
    }
    for (i = 0; i < 5; i += 1) {
      var lv = o.leavePid ? DB.leaveOf(o.leavePid, days[i]) : null;
      var hol = DB.holidayOf(days[i]);
      g += '<div class="dh' + (days[i] === t0 ? ' today' : '') + '"' +
        ' style="grid-column:' + (i + 1) + ';grid-row:1">' +
        '<span>' + WEEKDAY[i] +
        (hol ? ' <b class="hol">' + esc(hol.name) + '</b>' : '') +
        (lv ? ' ' + tag('maint', lv.type) : '') + '</span>' +
        '<span class="dnum">' + Number(days[i].slice(8)) + '</span></div>';
    }
    for (i = 0; i < 5; i += 1) {
      g += '<div class="day" style="grid-column:' + (i + 1) + ';grid-row:2">';
      /* 층(slot)은 도막이 곧게 이어지도록 모든 칸에서 같은 높이를 차지한다.
         도막이 닿지 않는 층은 비워 두지 않고 **그 칸의 카드로 채운다** — 비워 두면
         24일처럼 위가 빈 채로 카드가 아래로 밀린다(사용자 지적 2026-09-23). */
      var mine = cols[i].filter(function (t) { return !spanned[t.id + '@' + i]; });
      var fed = 0;
      for (var L = 0; L <= deepest[i]; L += 1) {
        var here = laneAt(L, i);
        if (here) {
          g += '<div class="slot barslot' + (here.start === i ? '' : ' ghost') + '" style="' +
            barWidth(here) + '">' + todoCard(here.todo, o.withWho) + '</div>';
        } else if (fed < mine.length) {
          g += '<div class="slot">' + todoCard(mine[fed], o.withWho) + '</div>';
          fed += 1;
        } else {
          g += '<div class="slot"></div>';        /* 채울 카드가 없을 때만 빈 자리 */
        }
      }
      mine.slice(fed).forEach(function (t) { g += todoCard(t, o.withWho); });
      if (o.plus || o.pull) {
        var pull = o.pull ? o.pull(days[i]) : null;
        g += '<div class="plus">' +
          (pull ? '<button class="btn small" onclick="' + pull + '">가져오기</button>' : '') +
          (o.plus ? '<button class="btn small grow" onclick="' + o.plus(days[i]) + '">+</button>' : '') +
          '</div>';
      }
      g += '</div>';
    }
    return g + '</div></div>';
  }

  var todoView = 'cal';     /* 화면 상태다 — 저장 대상인지는 아직 안 정했다(대시보드 위젯 구성과 같은 질문) */
  var weekStart = null;

  UI.route('my-todos', function () {
    var t0 = DB.today();
    var w0 = weekStart || DB.weekStartOf(t0);
    var nw = DB.shiftDay(w0, 7);                                  /* 차주(다음 주 월요일) */
    var week = DB.todosBetween(DB.ME, w0, DB.shiftDay(w0, 4));    /* 월~금만 캘린더에 뜬다 */
    var next = DB.todosBetween(DB.ME, nw, DB.shiftDay(nw, 4));
    var rest = DB.todosBetween(DB.ME, DB.shiftDay(w0, 5), DB.shiftDay(w0, 6))
      .concat(DB.todosBetween(DB.ME, DB.shiftDay(nw, 5), DB.shiftDay(nw, 6)));
    var nodate = DB.todosNoDate(DB.ME);
    var done = week.filter(function (t) { return t.status === '완료'; }).length;

    /* 한 주씩 그린다. 2주를 한 줄 10칸으로 펴면 칸이 좁아 카드가 안 읽힌다 —
       주를 세로로 쌓고 각 주에 머리를 붙인다. 차주 줄이 곧 업무보고의 '차주 계획' 칸이다. */
    var myWeek = {
      day: function (d) { return DB.todosOf(DB.ME, d); },
      leavePid: DB.ME,
      plus: function (d) { return 'ACT.newTodo(&quot;' + d + '&quot;)'; },
      /* 가져오기는 그 날 이전에 못 끝낸 것이 있을 때만 나타난다 */
      pull: function (d) {
        return DB.todosLeftBefore(DB.ME, d).length ? 'ACT.pullTodo(&quot;' + d + '&quot;)' : null;
      }
    };

    var h = '<div class="head"><div><h1>TODO</h1>' +
      '<p class="lead"><strong>' + esc(DB.personName(DB.ME)) + '</strong> · ' +
      '금주 ' + week.length + '건 중 ' + done + '건 완료 · 차주 ' + next.length + '건' +
      (nodate.length ? ' · 날짜 없음 ' + nodate.length + '건' : '') +
      ' — 여기 쓴 것이 ' + link('#/report', '업무보고') + '에 그대로 올라간다.</p></div>' +
      '<button class="btn primary" onclick="ACT.newTodo()">+ TODO</button></div>';

    h += '<div class="row" style="justify-content:space-between;margin:6px 0 10px">' +
      '<span class="row">' +
      '<button class="btn small' + (todoView === 'cal' ? ' primary' : '') + '" onclick="ACT.todoView(&quot;cal&quot;)">캘린더</button>' +
      '<button class="btn small' + (todoView === 'board' ? ' primary' : '') + '" onclick="ACT.todoView(&quot;board&quot;)">보드</button>' +
      '</span><span class="row">' +
      '<button class="btn small" onclick="ACT.weekMove(-7)">← 지난주</button>' +
      '<button class="btn small" onclick="ACT.weekMove(0)">이번 주</button>' +
      '<button class="btn small" onclick="ACT.weekMove(7)">다음주 →</button>' +
      '</span></div>';
    /* 주간 계획 — 사람이 직접 쓰는 글이고 TODO 와 연결되지 않는다.
       한 주에 한 칸뿐이라, 차주 칸에 쓴 글이 다음 주에는 이번주 칸으로 읽힌다(옮기지 않는다). */
    function planBox(ws, label, hint) {
      var p = DB.planOf(DB.ME, ws);
      return '<div class="planbox"><h3>' + esc(label) + ' <span>' + hint + '</span>' +
        '<button class="btn small" onclick="ACT.editPlan(' + DB.ME + ',&quot;' + ws + '&quot;)">' +
        (p ? '수정' : '작성') + '</button></h3>' +
        (p ? '<div class="ptext">' + esc(p.text).replace(/\n/g, '<br>') + '</div>'
           : '<p class="empty">아직 없음 — 이 주에 무엇을 할지 문장으로 적는다.</p>') + '</div>';
    }

    if (todoView === 'cal') {
      h += '<div class="weekcap"><span>금주 · ' + fmtDot(w0) + '~' + fmtDot(DB.shiftDay(w0, 4)) +
        '</span><span>할 일 ' + week.length + '건</span></div>' +
        planBox(w0, '이번주 계획', '지난주에 차주 계획으로 쓴 글이 이 칸이다 — 옮겨온 것이 아니라 같은 칸이다') +
        weekGrid(w0, myWeek);
      h += '<div class="weekcap"><span>차주 · ' + fmtDot(nw) + '~' + fmtDot(DB.shiftDay(nw, 4)) +
        '</span><span>할 일 ' + next.length + '건</span></div>' +
        planBox(nw, '차주 계획', link('#/report', '업무보고') + ' 주간의 차주 계획 칸에 그대로 나간다') +
        weekGrid(nw, myWeek);

      if (nodate.length) {
        h += '<div class="strip"><h3>날짜 없음 · ' + nodate.length + '건 — 언제 할지 안 정한 것. ' +
          '<strong>업무보고에는 잡히지 않는다</strong></h3><div class="row">';
        nodate.forEach(function (t) { h += todoCard(t); });
        h += '</div></div>';
      }
      if (rest.length) {
        h += '<div class="strip"><h3>토 · 일 · ' + rest.length + '건 — 캘린더는 월~금만 보여준다. ' +
          '주말 날짜로 적힌 것은 여기 남는다(조용히 사라지지 않게)</h3><div class="row">';
        rest.forEach(function (t) { h += todoCard(t); });
        h += '</div></div>';
      }
    } else {
      h += '<div class="board">';
      TODO_STATUS.forEach(function (s) {
        var col = week.concat(next, nodate).filter(function (t) { return t.status === s; });
        h += '<div class="col"><h3><span>' + esc(s) + '</span><span>' + col.length + '</span></h3>';
        col.forEach(function (t) { h += todoCard(t); });
        if (!col.length) { h += '<p class="empty">없음</p>'; }
        h += '</div>';
      });
      h += '</div><p class="lead">보드는 이번 주 + 차주 계획 + 날짜 없음을 상태로 모은 것이다 — 같은 행을 다르게 본다.</p>';
    }

    h += '<div class="note q"><strong>정해야 할 것</strong>' +
      '<ul><li><strong>휴가 자동 처리</strong> — <span class="tag maint">연차</span>는 표시뿐이다. ' +
      '팀즈 연동 뒤 "자동 처리"가 ① 그 날은 TODO를 못 쓰게 하는 것인지 ② 있는 것을 완료로 치는 것인지 ' +
      '③ 다음 근무일로 넘기는 것인지 — 셋의 결과가 업무보고에서 다르게 보인다(②는 안 한 일이 한 일로 남는다). ' +
      '휴가 원천이 팀즈면 <strong>우리 쪽에 복제하지 않고 조회할 수 있는지</strong>도 같이 봐야 한다(원본 이중화 금지).</li>' +
      '<li><strong>공휴일의 원천</strong> — 지금은 목업 목록이다. 관리자페이지에서 해마다 등록하는가, 외부에서 받는가. ' +
      '공휴일에 TODO를 적는 것은 막지 않았다(막아야 하는지는 휴가와 같은 질문이다).</li>' +
      '<li><strong>못 끝낸 일 가져오기</strong> — 그 날 이전에 미완료가 있으면 날짜 칸에 <strong>가져오기</strong> 버튼이 뜬다. ' +
      '고른 할 일은 <em>새로 만들어지지 않고</em> 그 날에도 놓인다(같은 행 · 날짜 목록). 그래서 원래 날짜 칸에서 사라지지 않는다. ' +
      '대신 <strong>상태가 하나</strong>라 오늘 완료로 바꾸면 어제 칸의 그 카드도 완료로 보인다 — ' +
      '"어제는 못 끝냈다"를 남기려면 보고를 제출 시점에 얼려야 한다. 지난 날짜 카드는 빨간 테두리로 표시된다.</li>' +
      '<li><strong>날짜 없음</strong> — 있어야 하는가. 있으면 업무보고에 잡히지 않는 TODO가 생긴다(그게 맞을 수도 있다).</li>' +
      '<li><strong>남의 TODO</strong> — 이 화면은 내 것만이다. 업무보고는 전원이 보인다. 그 경계가 권한(F5)이다.</li>' +
      '</ul></div>';
    return h;
  }, equalizeSlots);

  /* ── 업무보고 (일간 · 주간) ─────────────────────────────────
     저장된 보고서가 아니다 — TODO · 담당 이슈 · 투입 인력에서 그때 만들어 낸다.
     사용자의 사내 양식(2026-09-22)이 표라서 카드가 아니라 표로 그린다: 사람 한 명이 한 행,
     주간은 항목 4행(금주 실적 · 차주 계획 · 이슈사항 · 프로젝트)을 rowspan 으로 묶는다.
     그 양식에서 파생되지 않는 칸은 '비고' 하나이고, 그것만 사람이 직접 쓴다. */
  var reportMode = 'day';
  var reportDate = null;
  var reportWeek = null;
  var WEEK_ITEMS = [['done', '금주 실적'], ['plan', '차주 계획'], ['issue', '이슈사항'], ['proj', '프로젝트']];

  function fmtDot(d) { return d.replace(/-/g, '.'); }
  function fmtWeek(w) { return fmtDot(w) + '~' + fmtDot(DB.shiftDay(w, 4)); }
  /* 빈 칸은 그냥 비운다 — '없음' · '미작성' 꼬리표는 칸마다 붙어 표를 시끄럽게 만들고,
     비어 있다는 것은 비어 있는 것으로 이미 보인다(사용자 결정 2026-09-23). */
  function listOf(items) { return items.length ? '<ul>' + items.join('') + '</ul>' : ''; }

  /* 보고의 목록은 **프로젝트별로 묶는다**(사용자 결정 2026-09-23) — 사내 양식이
     "1. 사이버다임 연계 / 1) 문서 비교 …" 꼴로 과제를 먼저 적고 항목을 그 아래 늘어놓는다.
     묶고 나면 줄마다 붙던 고객사 꼬리표는 머리로 올라가므로 항목에서는 뺀다(같은 정보를 두 번 쓰지 않는다). */
  function groupOf(items, keyOf, liOf) {
    var order = [], map = {};
    items.forEach(function (it) {
      var k = keyOf(it);
      if (!map[k.id]) { map[k.id] = { label: k.label, sort: k.sort, items: [] }; order.push(k.id); }
      map[k.id].items.push(it);
    });
    if (!order.length) { return ''; }
    order.sort(function (a, b) { return map[a].sort < map[b].sort ? -1 : (map[a].sort > map[b].sort ? 1 : 0); });
    return '<ul class="grp">' + order.map(function (id) {
      return '<li><span class="ghead">' + map[id].label + '</span><ul>' +
        map[id].items.map(liOf).join('') + '</ul></li>';
    }).join('') + '</ul>';
  }
  /* 묶는 기준 — TODO는 프로젝트, 이슈는 프로젝트(솔루션) 또는 계약(유지보수 · 사이트에 붙으므로).
     붙을 곳이 없는 것은 맨 뒤에 따로 모은다(정렬 키를 '힣'로 둔다). */
  function projKey(projectId) {
    var p = DB.project(projectId);
    return { id: 'p' + p.id, sort: p.name,
      label: '<b>' + esc(p.name) + '</b>' };
  }
  /* 프로젝트에 붙지 않는 일(정산 · 회의 · 내부 업무)의 묶음.
     '프로젝트 없음'은 읽는 사람에게 "빠뜨렸다"로 보이고, 실제로는 빠뜨린 것이 아니라 다른 종류의 일이다.
     입력 화면(TODO의 프로젝트 선택)은 고르지 않는다는 뜻이므로 '선택 안함'으로 따로 쓴다. */
  var NO_KEY = { id: 'none', sort: '힣', label: '<b>프로젝트 이외</b>' };
  function todoKey(t) { return t.projectId ? projKey(t.projectId) : NO_KEY; }
  function issueKey(i) {
    if (i.projectId) { return projKey(i.projectId); }
    if (i.siteId) {
      var s = DB.byId(DB.sites, i.siteId);
      var c = DB.byId(DB.contracts, s.contractId);
      return { id: 'c' + c.id, sort: s.name,
        label: '<b>' + esc(s.name) + '</b>' };
    }
    return NO_KEY;
  }

  /* 보고의 줄에는 상태를 다 적지 않는다 — 끝낸 것만 오른쪽에 표시한다(사용자 결정 2026-09-23).
     보고를 읽는 사람이 궁금한 것은 "무엇을 했나"이고, 안 끝난 것은 안 붙는 것으로 이미 드러난다. */
  function todoLi(t) {
    return '<li>' + esc(t.title) + (t.status === '완료' ? ' ' + todoTag('완료') : '') + '</li>';
  }
  function issuesIn(pid, from, to) {
    return DB.issues.filter(function (i) {
      return i.assigneeId === pid && i.createdAt <= to && (i.status !== '완료' || i.createdAt >= from);
    });
  }
  function issueLi(i) {
    return '<li>' + tag(i.type === '장애' ? 'warn' : 'off', i.type) + ' ' + esc(i.title) + ' ' +
      tag(i.status === '완료' ? 'done' : 'solution', i.status) + '</li>';
  }
  /* 투입 프로젝트도 파생이다 — 솔루션 배정과 사이트 담당에서 나온다(사람이 다시 쓰지 않는다) */
  function projectLi(pid, from, to) {
    var out = [];
    DB.solutionRows.forEach(function (r) {
      var mine = r.assignments.some(function (a) { return a.personId === pid; });
      if (!mine || r.openedAt > to || (r.closedAt && r.closedAt < from)) { return; }
      var p = DB.project(r.projectId);
      out.push('<li>' + link('#/project/' + p.id, p.name) + ' ' + tag('solution', r.status) + '</li>');
    });
    DB.sites.filter(function (s) { return s.engineerId === pid; }).forEach(function (s) {
      var c = DB.byId(DB.contracts, s.contractId);
      out.push('<li>' + link('#/contract/' + c.id, c.name) + ' ' + tag('maint', s.name) + '</li>');
    });
    return out;
  }
  /* 그 주의 공휴일 — 열 머리에 붙는다. 공휴일은 전원 공통이라 사람 칸이 아니라 기간 칸의 성질이다 */
  function holBadge(w) {
    var hs = DB.holidaysIn(w, DB.shiftDay(w, 4));
    return hs.length ? '<br>' + tag('warn', hs.map(function (x) { return x.name; }).join(' · ')) : '';
  }
  function planCell(pid, ws) {
    var p = DB.planOf(pid, ws);
    return (p ? '<div class="ptext">' + esc(p.text).replace(/\n/g, '<br>') + '</div>'
              : '') +
      '<div style="margin-top:6px"><button class="btn small" onclick="ACT.editPlan(' + pid +
      ', &quot;' + ws + '&quot;)">' + (p ? '수정' : '작성') + '</button></div>';
  }
  function remarkCell(pid, key, rows) {
    var r = DB.remarkOf(pid, key);
    return '<td class="remark"' + (rows ? ' rowspan="' + rows + '"' : '') + '>' +
      (r ? esc(r.text).replace(/\n/g, '<br>') : '') +
      '<div style="margin-top:6px"><button class="btn small" onclick="ACT.editRemark(' + pid +
      ', &quot;' + key + '&quot;)">비고 쓰기</button></div></td>';
  }
  /* 부서 · 성명을 한 칸으로 합친다(사용자 결정 2026-09-22) — 양식은 두 칸이지만 화면에서는
     둘이 항상 같이 읽히고, 칸을 줄인 만큼 실적 칸이 넓어진다.
     휴가는 여기 붙이지 않는다(사용자 결정 2026-09-23) — 주간보고에는 휴가를 아예 두지 않고,
     일간보고에서만 **할 일 칸**에 표시한다. */
  function whoCell(p, rows) {
    return '<td class="who"' + (rows ? ' rowspan="' + rows + '"' : '') + '>' +
      '<div class="org">' + esc(p.org) + '</div>' +
      esc(p.name) + ' <span class="tag off">' + esc(p.grade) + '</span>' +
      (p.id === DB.ME ? ' <span class="tag solution">나</span>' : '') + '</td>';
  }
  /* 정렬: 부서 → 이름. 단 '나'는 정렬 밖이고 늘 맨 위다(사용자 결정 2026-09-22) —
     내 줄을 찾는 것이 이 화면에서 가장 자주 하는 일이다.
     localeCompare('ko') 는 쓰지 않는다: 한국어 정렬은 한글을 영문보다 앞에 놓아
     'AX솔루션개발1팀'보다 '마케팅팀'이 먼저 오는데, 엑셀 양식의 순서와 반대다.
     코드유닛 비교는 영문 → 한글이고 한글 이름끼리는 가나다순이며, 엔진마다 같다. */
  function sortedPeople() {
    var me = DB.people.filter(function (p) { return p.id === DB.ME; });
    var rest = DB.people.filter(function (p) { return p.id !== DB.ME; }).sort(function (a, b) {
      if (a.org !== b.org) { return a.org < b.org ? -1 : 1; }
      return a.name < b.name ? -1 : (a.name > b.name ? 1 : 0);
    });
    return me.concat(rest);
  }

  UI.route('report', function () {
    var day = reportDate || DB.today();
    var w0 = reportWeek || DB.weekStartOf(DB.today());
    var w1 = DB.shiftDay(w0, 7);
    var isDay = reportMode === 'day';

    var h = '<div class="head"><div><h1>업무보고</h1>' +
      '<p class="lead">' + (isDay
        ? '<strong>' + fmtDot(day) + ' (' + WEEKDAY[(new Date(day).getDay() + 6) % 7] + ')</strong> 하루치' +
          (DB.holidayOf(day) ? ' ' + tag('warn', DB.holidayOf(day).name) : '')
        : '<strong>' + fmtWeek(w0) + '</strong> 기준 주간') +
      ' — 저장된 보고서가 아니라 TODO · 담당 이슈 · 투입 인력에서 <strong>파생</strong>한 것이다. ' +
      '직접 쓰는 칸은 <strong>차주 계획 · 비고</strong> 둘이다.</p></div>' +
      '<div class="row">' +
      '<button class="btn small' + (isDay ? ' primary' : '') + '" onclick="ACT.reportMode(&quot;day&quot;)">일간</button>' +
      '<button class="btn small' + (isDay ? '' : ' primary') + '" onclick="ACT.reportMode(&quot;week&quot;)">주간</button>' +
      '<span style="width:8px"></span>' +
      (isDay ? '<input type="date" style="width:150px" value="' + esc(day) + '" onchange="ACT.reportOn(this.value)">' : '') +
      '<button class="btn small" onclick="ACT.reportMove(-1)">← ' + (isDay ? '어제' : '지난주') + '</button>' +
      '<button class="btn small" onclick="ACT.reportMove(0)">' + (isDay ? '오늘' : '이번 주') + '</button>' +
      '<button class="btn small" onclick="ACT.reportMove(1)">' + (isDay ? '내일' : '다음주') + ' →</button>' +
      '</div></div>';

    if (isDay) {
      var wrote = 0, away = 0, silent = 0, body = '';
      var hol = DB.holidayOf(day);
      sortedPeople().forEach(function (p) {
        var ts = DB.todosOf(p.id, day);
        var lv = DB.leaveOf(p.id, day);
        if (ts.length) { wrote += 1; } else if (!lv) { silent += 1; }
        if (lv) { away += 1; }
        /* 휴가와 할 일은 서로를 지우지 않는다(사용자 결정 2026-09-23) —
           반차나 휴가 중 처리한 건이 있으면 둘 다 보여야 한다. */
        var cell = (lv ? '<div>' + tag('maint', lv.type) + ' 휴가</div>' : '') +
          (ts.length ? groupOf(ts, todoKey, todoLi)
            : (!lv && hol ? tag('warn', hol.name) + ' 공휴일' : ''));
        body += '<tr>' + whoCell(p) + '<td>' + cell + '</td>' +
          '<td>' + groupOf(issuesIn(p.id, day, day), issueKey, issueLi) + '</td>' +
          remarkCell(p.id, day) + '</tr>';
      });
      h += '<table class="report"><thead><tr><th>부서 · 성명</th>' +
        '<th>' + fmtDot(day) + ' 할 일</th><th>담당 이슈</th><th>비고</th></tr></thead><tbody>' +
        body + '</tbody></table>' +
        '<p class="lead">작성 ' + wrote + '명' +
        (hol ? ' · <strong>' + esc(hol.name) + '</strong> — 미작성은 세지 않는다' : ' · 미작성 ' + silent + '명') +
        (away ? ' · 휴가 ' + away + '명' : '') + '</p>';
    } else {
      var rows = '';
      sortedPeople().forEach(function (p) {
        WEEK_ITEMS.forEach(function (it, idx) {
          rows += '<tr>';
          if (idx === 0) { rows += whoCell(p, WEEK_ITEMS.length); }
          rows += '<td class="item">' + it[1] + '</td>';
          [w0, w1].forEach(function (w) {
            var from = w, to = DB.shiftDay(w, 4), nx = DB.shiftDay(w, 7);
            var cell;
            if (it[0] === 'done') { cell = groupOf(DB.todosBetween(p.id, from, to), todoKey, todoLi); }
            else if (it[0] === 'plan') { cell = planCell(p.id, nx); }
            else if (it[0] === 'issue') { cell = groupOf(issuesIn(p.id, from, to), issueKey, issueLi); }
            else { cell = listOf(projectLi(p.id, from, to)); }
            rows += '<td>' + cell + '</td>';
          });
          if (idx === 0) { rows += remarkCell(p.id, w0, WEEK_ITEMS.length); }
          rows += '</tr>';
        });
      });
      h += '<table class="report"><thead><tr><th>부서 · 성명</th><th>항목</th>' +
        '<th>' + fmtWeek(w0) + holBadge(w0) + '</th><th>' + fmtWeek(w1) + holBadge(w1) + '</th><th>비고</th></tr></thead><tbody>' +
        rows + '</tbody></table>';
    }

    h += '<div class="note q"><strong>정해야 할 것</strong>' +
      '<ul><li><strong>비고만 저장물이다</strong> — 나머지 칸은 전부 파생인데 비고는 사람이 쓴다. ' +
      '그러면 "보고서를 저장하지 않는다"가 이 칸에서만 깨진다. 비고만 따로 저장할지, 아니면 ' +
      '<strong>제출 시점에 보고 전체를 얼릴지</strong> 정해야 한다(얼리면 TODO를 고쳐도 지난 보고는 안 바뀐다 — 그게 보고답다).</li>' +
      '<li><strong>차주 계획은 파생이 아니다</strong> — 사람이 <em>문장으로</em> 쓴다(사용자 결정 2026-09-23. ' +
      '그 전날 결정이던 "다음 주 날짜의 TODO를 계획으로 쓴다"를 뒤집었다 — 짧은 할 일 메모는 보고 문장이 되지 못했다). ' +
      'TODO 화면의 금주 · 차주 계획 칸과 <strong>같은 칸</strong>이라 어디서 고쳐도 같고, 차주에 쓴 글은 다음 주에 그 주의 계획으로 읽힌다 — 옮기는 코드가 없다. ' +
      '남은 질문 — 계획(문장)과 TODO(할 일)를 둘 다 쓰는 것이 이중 입력인가. ' +
      '계획 대비 실적을 보려면 보고에 <em>그 주의 계획</em> 칸이 하나 더 있어야 하는데, 양식에는 없다.</li>' +
      '<li><strong>여러 날에 놓인 할 일</strong> — 가져오기로 같은 TODO가 여러 날에 놓일 수 있다. ' +
      '주간 실적에는 <strong>한 번만</strong> 찍히고, 일간에는 놓인 날마다 찍힌다.</li>' +
      '<li><strong>이슈사항</strong> — 담당 이슈(F6)에서 파생했다. 양식의 "이슈사항"이 그 이슈인가, ' +
      '아니면 보고용으로 따로 쓰는 말(리스크 · 애로사항)인가.</li>' +
      '<li><strong>프로젝트 칸의 모집단 — 보류</strong>(2026-09-23) — 지금은 <em>솔루션 투입(그 주와 겹치는 것) + 담당 사이트 전부</em>이고, ' +
      '영업 담당은 빠져 있으며 유지보수 쪽만 기간을 보지 않는다. "안고 있는 것 전부"로 갈지, ' +
      '"그 주 TODO가 달린 것만"으로 좁힐지(그러면 금주 실적과 같아져 이 칸이 없어진다) 아직 정하지 않았다. ' +
      'ROADMAP 발견한 일감에 적어 두었다.</li>' +
      '<li><strong>모집단과 순서</strong> — 지금 전원 ' + DB.people.length + '명이 뜨고, <strong>내 줄이 맨 위</strong>, ' +
      '그 아래가 부서 → 이름 순이다. 부서 순서를 <em>이름 문자열</em>로 정하고 있는데, 조직(F1)이 생기면 ' +
      '조직 트리의 표시 순서를 따라야 한다(문자열 정렬은 임시 방편이다). ' +
      '부서별로 접을지, 내 조직만 보일지는 권한(F5)이 정한다.</li>' +
      '<li><strong>주간의 두 열</strong> — 양식처럼 이번 주 · 다음 주를 나란히 놓았다. 보고를 <em>제출</em>하게 되면 ' +
      '열이 "지난 보고 / 이번 보고"로 바뀌어야 할 수도 있다.</li>' +
      '</ul></div>';
    return h;
  });

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
    },

    /* TODO — 개인페이지에서 쓰고 업무보고에서 읽는다. 상태 버튼은 다음 상태로 한 칸 밀 뿐이다. */
    newTodo: function (d, projectId) {
      UI.modal('TODO 추가' + (d ? ' — ' + d : ''),
        UI.field('할 일', 'title', '') +
        UI.select('상태', 'status', TODO_STATUS, '시작 전') +
        UI.field('날짜 · 비우면 "날짜 없음"', 'date', d || DB.today(), 'date') +
        UI.select('프로젝트', 'projectId', projectOptions(), projectId || '') +
        UI.area('메모', 'note', ''),
        '추가', function (f) {
          if (!f.title) { UI.toast('할 일은 적어야 합니다'); return true; }
          f.personId = DB.ME;
          DB.createTodo(f);
          UI.refresh();
          UI.toast('TODO를 추가했습니다' + (f.date ? '' : ' (날짜 없음)'));
        });
    },

    /* 가져오기 — 못 끝낸 할 일을 다른 날에도 놓는다. 새로 만들지 않는다(사용자 결정 2026-09-23).
       여러 건을 한 번에 고를 수 있어야 해서 체크박스를 쓰고, 그래서 UI.modal 이 체크 여부를 읽는다. */
    pullTodo: function (d) {
      var cands = DB.todosLeftBefore(DB.ME, d);
      if (!cands.length) { UI.toast('가져올 미완료 TODO가 없습니다'); return; }
      var body = '<div class="note">고른 할 일을 <strong>' + esc(d) + '</strong>에도 놓습니다. ' +
        '새 TODO를 만들지 않고 <strong>같은 TODO</strong>가 두 날에 놓입니다 — 상태도 하나입니다. ' +
        '그래서 원래 날짜 칸에서도 사라지지 않습니다.</div>';
      cands.forEach(function (t) {
        var p = t.projectId ? DB.project(t.projectId) : null;
        body += '<label class="pick"><input type="checkbox" name="p' + t.id + '"><span>' +
          '<b>' + esc(t.title) + '</b><br>' + todoTag(t.status) +
          ' <span class="when">' + esc(t.dates.join(' · ')) + '</span>' +
          (p ? ' <span class="tag off">' + esc(p.client) + '</span>' : '') +
          '</span></label>';
      });
      UI.modal('가져오기 — ' + d, body, '가져오기', function (f) {
        var n = 0;
        cands.forEach(function (t) { if (f['p' + t.id]) { DB.placeTodo(t.id, d); n += 1; } });
        if (!n) { UI.toast('고른 것이 없습니다'); return true; }
        UI.refresh();
        UI.toast(n + '건을 ' + d + '에도 놓았습니다 — 원래 날짜에도 그대로 있습니다');
      });
    },

    /* 남의 TODO — 읽기만 한다. 고칠 수 있는지는 권한(F5)이 정한다. */
    viewTodo: function (id) {
      var t = DB.byId(DB.todos, id);
      var p = t.projectId ? DB.project(t.projectId) : null;
      UI.info(DB.personName(t.personId) + '의 TODO',
        '<dl class="kv"><dt>할 일</dt><dd>' + esc(t.title) + '</dd>' +
        '<dt>상태</dt><dd>' + todoTag(t.status) + '</dd>' +
        '<dt>날짜</dt><dd>' + esc(t.dates.length ? t.dates.join(' · ') : '날짜 없음') + '</dd>' +
        '<dt>프로젝트</dt><dd>' + (p ? esc(p.name) : '-') + '</dd>' +
        (t.note ? '<dt>메모</dt><dd>' + esc(t.note) + '</dd>' : '') + '</dl>' +
        '<div class="note">남이 쓴 TODO라 여기서는 읽기만 합니다 — 고칠 수 있게 할지는 권한(F5)에서 정합니다.</div>');
    },

    projView: function (v) { projView = v; UI.refresh(); },

    projWeek: function (n) {
      projWeek = n ? DB.shiftDay(projWeek || DB.weekStartOf(DB.today()), n) : null;
      UI.refresh();
    },

    editTodo: function (id) {
      var t = DB.byId(DB.todos, id);
      var chips = t.dates.length
        ? '<div class="chips">' + t.dates.map(function (d) {
            return '<button type="button" class="chip" onclick="ACT.unplace(' + id + ', &quot;' + d +
              '&quot;)">' + fmtDot(d) + ' ×</button>';
          }).join('') + '</div>'
        : '<p class="empty" style="padding:2px 0">날짜 없음</p>';
      UI.modal('TODO 수정',
        UI.field('할 일', 'title', t.title) +
        UI.select('상태', 'status', TODO_STATUS, t.status) +
        '<label class="f"><span>놓인 날 · ×를 누르면 그 날에서 바로 빠진다</span></label>' + chips +
        UI.field('이 날에도 놓기 · 비우면 그대로', 'date', '', 'date') +
        UI.select('프로젝트', 'projectId', projectOptions(), t.projectId || '') +
        UI.area('메모', 'note', t.note) +
        '<div class="row" style="justify-content:flex-end;margin-top:10px">' +
        '<button type="button" class="btn small" onclick="ACT.delTodo(' + id + ')">삭제</button></div>',
        '저장', function (f) {
          DB.updateTodo(id, f);
          UI.refresh();
          UI.toast('수정했습니다' + (f.date ? ' — ' + f.date + '에도 놓았습니다' : ''));
        });
    },

    /* 그 날에서만 뺀다. 다른 날에 놓여 있으면 할 일 자체는 남는다 */
    unplace: function (id, d) {
      DB.unplaceTodo(id, d);
      UI.refresh();
      ACT.editTodo(id);
      UI.toast(fmtDot(d) + '에서 뺐습니다');
    },

    /* 캘린더의 뷰·주·주말 표시는 화면 상태다(저장 대상이 아니다) */
    todoView: function (v) { todoView = v; UI.refresh(); },
    weekMove: function (n) {
      weekStart = n ? DB.shiftDay(weekStart || DB.weekStartOf(DB.today()), n) : null;
      UI.refresh();
    },

    delTodo: function (id) {
      var t = DB.byId(DB.todos, id);
      UI.modal('TODO 삭제',
        '<div class="note">「' + esc(t.title) + '」을 삭제합니다 — 되돌릴 수 없고, ' +
        (t.dates.length ? esc(t.dates.join(' · ')) + ' 업무보고에서도 사라집니다' : '날짜 없음 칸에서 사라집니다') + '.</div>',
        '삭제', function () {
          DB.deleteTodo(id);
          UI.refresh();
          UI.toast('삭제했습니다');
        });
    },

    /* 업무보고의 모드 · 날짜 · 주차는 화면 상태다(저장 대상이 아니다) */
    reportMode: function (m) { reportMode = m; UI.refresh(); },
    reportOn: function (v) { reportDate = v || null; UI.refresh(); },
    reportMove: function (n) {
      if (reportMode === 'day') {
        reportDate = n ? DB.shiftDay(reportDate || DB.today(), n) : null;
      } else {
        reportWeek = n ? DB.shiftDay(reportWeek || DB.weekStartOf(DB.today()), n * 7) : null;
      }
      UI.refresh();
    },

    /* 비고 — 보고 양식에서 유일하게 파생되지 않는 칸이라, 유일하게 쓰기가 필요하다 */
    /* 주간 계획 — TODO 화면에서도, 업무보고 표에서도 같은 칸을 연다.
       차주 칸에 쓴 글은 다음 주가 되면 그 주의 '이번주 계획'으로 읽힌다(옮기는 코드가 없다). */
    editPlan: function (pid, ws) {
      var p = DB.planOf(pid, ws);
      UI.modal('주간 계획 — ' + DB.personName(pid) + ' · ' + ws + ' 주',
        '<div class="note">이 주에 무엇을 할지 <strong>문장으로</strong> 씁니다. TODO와 연결되지 않습니다 — ' +
        'TODO는 그날의 할 일이고, 이 글은 보고에 나가는 계획입니다.<br>' +
        '이번 주에 <strong>차주 계획</strong>으로 쓴 글은 다음 주가 되면 <strong>이번주 계획</strong> 칸에서 읽힙니다. ' +
        '옮겨 가는 것이 아니라 같은 칸입니다.</div>' +
        UI.area('계획', 'text', p ? p.text : ''),
        '저장', function (f) {
          DB.setPlan(pid, ws, f.text);
          UI.refresh();
          UI.toast('주간 계획을 저장했습니다');
        });
    },

    editRemark: function (pid, key) {
      var r = DB.remarkOf(pid, key);
      UI.modal('비고 — ' + DB.personName(pid) + ' · ' + key,
        '<div class="note">이 칸만 사람이 직접 씁니다. 나머지 칸은 TODO · 이슈 · 투입 인력에서 파생됩니다 — ' +
        '그래서 <strong>보고에서 저장되는 것은 지금 이 글 하나</strong>입니다.</div>' +
        UI.area('비고', 'text', r ? r.text : ''),
        '저장', function (f) {
          DB.setRemark(pid, key, f.text);
          UI.refresh();
          UI.toast('비고를 저장했습니다');
        });
    }
  };
})(window);
