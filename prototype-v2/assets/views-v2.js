/* views-v2.js — 2026-09-30 인터뷰 반영 화면.

   views.js 는 v1 그대로 두고, 여기서 같은 이름으로 UI.route 를 다시 걸어 덮어쓴다.
   덮어쓴 화면과 새로 만든 화면에는 머리에 근거가 된 인터뷰 항목을 적는다.
   ACT 도 같은 방식으로 덧붙인다(g.ACT 는 views.js 가 이미 만들어 두었다). */
(function (g) {
  'use strict';
  var esc = UI.esc;
  var ACT = g.ACT;

  var PHASE = { SALES: ['sales', '영업'], SOLUTION: ['solution', '솔루션'], MAINTENANCE: ['maint', '유지보수'] };
  function phaseTag(p) { var x = PHASE[p]; return '<span class="tag ' + x[0] + '">' + x[1] + '</span>'; }
  function tag(cls, text) { return '<span class="tag ' + cls + '">' + esc(text) + '</span>'; }
  function bar(v, over) { return '<div class="bar' + (over ? ' over' : '') + '" title="' + v + '%"><i style="width:' + Math.min(v, 100) + '%"></i></div>'; }
  function period(a, b) { return (a || '?') + ' ~ ' + (b || '?'); }
  function link(href, text) { return '<a href="' + href + '">' + esc(text) + '</a>'; }
  function stars(n) {
    var h = '<span class="stars">';
    for (var i = 1; i <= 5; i++) { h += i <= n ? '★' : '<span class="off">★</span>'; }
    return h + '</span>';
  }
  function head(title, lead, right) {
    return '<div class="head"><div><h1>' + esc(title) + '</h1>' +
      (lead ? '<p class="lead">' + lead + '</p>' : '') + '</div>' + (right || '') + '</div>';
  }
  function withRows(getRows) {
    return DB.projects.filter(function (p) { return getRows(p.id).length; })
      .sort(function (a, b) {
        var ao = DB.openRow(getRows(a.id)).closedAt ? 1 : 0;
        var bo = DB.openRow(getRows(b.id)).closedAt ? 1 : 0;
        return ao - bo;
      });
  }
  function mm(g2) { return (g2.senior || 0) + '/' + (g2.mid || 0) + '/' + (g2.junior || 0); }

  var ISSUE_STATUS = ['접수', '처리중', '고객확인대기', '완료'];
  var ISSUE_TYPE = ['장애', '문의', '요청'];

  /* ══ 영업 › 목록 ═══════════════════════════════════════════
     [3-S1] "단계별로 메뉴 구분 했음 좋겠다 … 트리구조로"   → 내비 하위 항목 + 이 화면의 stage 인자
     [4-B7] 검색 · 필터 · 최종 컨택일 · 첨부 · M/M 등급 · 수금 예정
     [4-A1] 고객사 / 발주처 분리
     [4-C7] "프로젝트명은 무조건 다 보이게" → 열 선택 목록에서 프로젝트명을 뺐다(항상 보인다)
     [4-C7] "메뉴 개인화 가능하면 요청"   → 열 선택 */
  var SALES_COLS = [
    { k: 'endClient', t: '고객사' },
    { k: 'orderer', t: '발주처(계약사)' },
    { k: 'stage', t: '단계' },
    { k: 'product', t: '제품 · 수량' },
    { k: 'amount', t: '매출(예상 수주액)' },
    { k: 'grade', t: 'M/M 초·중·고', on: false },
    { k: 'start', t: '예상 착수' },
    { k: 'lastContact', t: '최종 컨택' },
    { k: 'pay', t: '수금 예정', on: false },
    { k: 'files', t: '첨부' },
    { k: 'owner', t: '영업대표' },
    { k: 'memo', t: '메모', on: false }
  ];

  UI.route('sales', function (slug) {
    var stage = V2.STAGE_SLUG[slug] || '';
    var cols = UI.defineCols('sales', SALES_COLS);
    var f = UI.barValue('sales');
    var title = '영업 › ' + (stage || '전체');

    var rows = withRows(DB.salesOf).filter(function (p) {
      var s = DB.openRow(DB.salesOf(p.id));
      if (stage && s.stage !== stage) { return false; }
      if (f.owner && String(s.ownerId) !== f.owner) { return false; }
      if (f.type && p.type !== f.type) { return false; }
      return UI.matches(p.endClient + ' ' + p.orderer + ' ' + p.name + ' ' + DB.personName(s.ownerId), f.q);
    });

    var h = head(title,
      stage
        ? '단계 <strong>' + esc(stage) + '</strong> 만 봅니다. 왼쪽 내비에서 단계를 옮겨 다닙니다.'
        : '수주 이전 구간 전체. <strong>이관해도 이 목록에 남는다</strong> — 단계가 수주로 바뀌고 솔루션에 행이 새로 생긴다.',
      '<button class="btn primary" onclick="ACT.newSales()">+ 프로젝트 생성</button>');

    h += UI.filterBar('sales', [
      { k: 'owner', t: '영업대표', options: DB.people.map(function (p) { return { v: p.id, t: p.name }; }) },
      { k: 'type', t: '유형', options: V2.PROJECT_TYPES }
    ], '<span class="spacer"></span>' + cols.button());

    if (!rows.length) { return h + '<p class="empty">해당하는 영업 건이 없습니다.</p>'; }

    h += '<table><thead><tr>';
    if (cols.has('endClient')) { h += '<th>고객사</th>'; }
    if (cols.has('orderer')) { h += '<th>발주처</th>'; }
    h += '<th>프로젝트명</th>';
    if (cols.has('stage')) { h += '<th>단계</th>'; }
    if (cols.has('product')) { h += '<th>제품 · 수량</th>'; }
    if (cols.has('amount')) { h += '<th class="num">매출</th>'; }
    if (cols.has('grade')) { h += '<th class="num">M/M 초·중·고</th>'; }
    if (cols.has('start')) { h += '<th>예상 착수</th>'; }
    if (cols.has('lastContact')) { h += '<th>최종 컨택</th>'; }
    if (cols.has('pay')) { h += '<th>수금 예정</th>'; }
    if (cols.has('files')) { h += '<th class="num">첨부</th>'; }
    if (cols.has('owner')) { h += '<th>영업대표</th>'; }
    if (cols.has('memo')) { h += '<th>메모</th>'; }
    h += '<th></th></tr></thead><tbody>';

    rows.forEach(function (p) {
      var s = DB.openRow(DB.salesOf(p.id));
      var done = !!s.closedAt;
      var lost = s.stage === '실주';
      h += '<tr>';
      if (cols.has('endClient')) { h += '<td>' + UI.chip('sales', 'q', p.endClient) + '</td>'; }
      if (cols.has('orderer')) { h += '<td>' + UI.chip('sales', 'q', p.orderer) + '</td>'; }
      /* 프로젝트명은 자르지 않는다 — "2줄로 or 옆으로 커져도 됨" */
      h += '<td style="min-width:260px;white-space:normal">' + link('#/deal/' + p.id, p.name) +
        (p.type !== '솔루션' ? ' ' + tag('off', p.type) : '') + '</td>';
      if (cols.has('stage')) {
        h += '<td>' + tag(lost ? 'warn' : done ? 'off' : 'sales', s.stage) +
          (done && !lost ? ' ' + tag('solution', '이관 ' + s.closedAt) : '') + '</td>';
      }
      if (cols.has('product')) {
        h += '<td>' + (p.products.length
          ? p.products.map(function (x) { return esc(x.name) + ' ' + x.qty + esc(x.unit); }).join(', ')
          : '<span class="tag off">없음</span>') + '</td>';
      }
      if (cols.has('amount')) {
        h += '<td class="num">' + (s.expectedAmount ? DB.won(s.expectedAmount) : '<span class="tag off">미정</span>') + '</td>';
      }
      if (cols.has('grade')) { h += '<td class="num">' + mm(s.grade) + '</td>'; }
      if (cols.has('start')) { h += '<td>' + esc(s.expectedStart || '-') + '</td>'; }
      if (cols.has('lastContact')) { h += '<td>' + esc(s.lastContactAt || '-') + '</td>'; }
      if (cols.has('pay')) {
        h += '<td>' + (s.pay.down || s.pay.mid || s.pay.balance
          ? '<span class="muted">선 ' + esc(s.pay.down || '-') + ' · 중 ' + esc(s.pay.mid || '-') + ' · 잔 ' + esc(s.pay.balance || '-') + '</span>'
          : '<span class="tag off">미정</span>') + '</td>';
      }
      if (cols.has('files')) { h += '<td class="num">' + (s.files.length ? s.files.length + '건' : '-') + '</td>'; }
      if (cols.has('owner')) { h += '<td>' + esc(DB.personName(s.ownerId)) + '</td>'; }
      if (cols.has('memo')) { h += '<td class="muted">' + esc(s.memo || '-') + '</td>'; }
      h += '<td class="num"><button class="btn small" onclick="ACT.log(' + p.id + ')">이관 내역</button> ' +
        (lost
          ? '<button class="btn small" onclick="ACT.lostWhy(' + s.id + ')">실주 사유</button>'
          : done
            ? link('#/solution', '솔루션 →')
            : '<button class="btn small" onclick="ACT.toSolution(' + p.id + ')">솔루션 이관 →</button>') +
        '</td></tr>';
    });
    h += '</tbody></table>';
    h += '<div class="note q"><strong>인터뷰 반영</strong> — 단계를 내비로 뺐고(트리), 고객사·발주처를 나눴고, ' +
      '검색·필터·<strong>열 선택</strong>을 달았습니다. 고객사 이름을 누르면 그 값으로 걸러집니다.<br>' +
      '<strong>확인할 것</strong> — ① 열 선택은 지금 <em>이 브라우저 세션</em>에만 남습니다. 사람마다 저장하려면 ' +
      '저장 위치가 필요합니다. ② <strong>실주</strong>를 단계 하나로 넣었는데, 실주는 단계가 아니라 <em>결과</em>일 수 있습니다 ' +
      '— 리드에서도 제안에서도 실주가 납니다. 단계와 결과를 분리할지.</div>';
    return h;
  });

  /* ══ 영업 건 상세 ══════════════════════════════════════════
     [4-B7] 프로미노트 · 첨부문서(견적서) · 고객 연락처 · 최종 컨택 일시 · 진행사항 로그 ·
            선금/잔금 예정일 · 검수확인일자
     [추가 메모] 중도금 · "금액 변동 있을 수 있음 -> 히스토리 적용" · "프로젝트 생성 시 첨부문서 같이 등록" */
  UI.route('deal', function (id) {
    var p = DB.project(id);
    if (!p) { return '<h1>없는 프로젝트</h1>'; }
    var s = DB.openRow(DB.salesOf(p.id));
    if (!s) { return '<h1>영업 행이 없습니다</h1>'; }

    var h = head(p.name,
      esc(p.endClient) + ' <span class="muted">(발주처 ' + esc(p.orderer) + ')</span> · ' +
      tag(s.stage === '실주' ? 'warn' : 'sales', s.stage) + ' · 영업대표 ' + esc(DB.personName(s.ownerId)) +
      ' · 현재 영역 ' + phaseTag(p.phase),
      '<button class="btn" onclick="ACT.log(' + p.id + ')">이관 내역</button> ' +
      link('#/project/' + p.id, '프로젝트 공통 →'));

    h += '<div class="two">';

    /* 왼쪽 — 금액과 수금 */
    h += '<div><div class="card sales"><h3>금액</h3><dl class="kv">' +
      '<dt>매출(예상 수주액)</dt><dd class="big">' + (s.expectedAmount ? DB.won(s.expectedAmount) : '미정') + '</dd>' +
      '<dt>M/M 초·중·고</dt><dd>' + mm(s.grade) + ' <span class="muted">등록 시점에 넣는 값</span></dd>' +
      '<dt>제품 · 수량</dt><dd>' + (p.products.length
        ? p.products.map(function (x) { return esc(x.name) + ' ' + x.qty + esc(x.unit); }).join('<br>') : '-') + '</dd>' +
      '<dt>유형</dt><dd>' + esc(p.type) + (p.internal ? ' · 내부' : ' · 외부') + '</dd>' +
      '</dl>';
    if (s.amountLog.length) {
      h += '<h3 style="margin-top:12px">금액 변동 이력</h3><table class="tasks"><tbody>';
      s.amountLog.slice().reverse().forEach(function (a) {
        h += '<tr><td>' + esc(a.at) + '</td><td class="num">' + DB.won(a.amount) + '</td>' +
          '<td class="muted">' + esc(a.note) + '</td></tr>';
      });
      h += '</tbody></table>';
    }
    h += '</div>';

    h += '<div class="card sales"><h3>수금 일정</h3><dl class="kv">' +
      '<dt>선금</dt><dd>' + esc(s.pay.down || '-') + '</dd>' +
      '<dt>중도금</dt><dd>' + esc(s.pay.mid || '-') + '</dd>' +
      '<dt>잔금</dt><dd>' + esc(s.pay.balance || '-') + '</dd>' +
      '<dt>검수 확인일</dt><dd>' + esc(s.pay.accept || '-') + '</dd></dl>' +
      '<div class="note">추가 메모에 <em>"선금, 중도금, 잔금 일정 (유지보수 테이블에서 관리?)"</em> 이라고 ' +
      '물음표째로 적혀 있습니다. 지금은 영업 행에 두었습니다 — ' + link('#/payments', '수금 일정') +
      ' 화면은 이 값에서 파생됩니다.</div></div></div>';

    /* 오른쪽 — 고객·첨부·로그 */
    h += '<div><div class="card common"><h3>고객 연락처</h3>';
    if (!s.contacts.length) { h += '<p class="empty">등록된 연락처가 없습니다.</p>'; } else {
      h += '<table class="tasks"><tbody>';
      s.contacts.forEach(function (c) {
        h += '<tr><td><strong>' + esc(c.name) + '</strong><br><span class="muted">' + esc(c.role) + '</span></td>' +
          '<td>' + esc(c.tel) + '<br><span class="muted">' + esc(c.email) + '</span></td></tr>';
      });
      h += '</tbody></table>';
    }
    h += '<div class="note">개인정보입니다 — 추가 메모에 <em>"고객사 담당자 개인정보 있으면 편하긴 한데 문제가 될지도"</em>. ' +
      '누가 볼 수 있는지(F5)와 어디까지 남기는지는 기능이 아니라 취급 방침 문제입니다.</div></div>';

    h += '<div class="card common"><h3>첨부문서 <span class="muted">' + s.files.length + '건</span></h3>';
    if (!s.files.length) { h += '<p class="empty">첨부가 없습니다.</p>'; } else {
      h += '<table class="tasks"><tbody>';
      s.files.forEach(function (x) {
        h += '<tr><td>' + esc(x.name) + '</td><td class="num muted">' + esc(x.at) + '</td></tr>';
      });
      h += '</tbody></table>';
    }
    h += '<div class="row" style="margin-top:8px"><button class="btn small" onclick="ACT.addFile(' + s.id + ')">+ 문서 올리기</button>' +
      '<span class="muted">견적서 · 제안서 · 계약서</span></div></div>';

    h += '<div class="card common"><h3>진행사항 <span class="muted">최종 컨택 ' + esc(s.lastContactAt || '-') + '</span></h3>';
    if (!s.log.length) { h += '<p class="empty">기록이 없습니다.</p>'; } else {
      s.log.forEach(function (l) {
        h += '<div style="padding:5px 0;border-bottom:1px solid var(--line)"><span class="muted">' + esc(l.at) + ' · ' +
          esc(DB.personName(l.by)) + '</span><br>' + esc(l.text) + '</div>';
      });
    }
    h += '<div class="row" style="margin-top:8px"><button class="btn small" onclick="ACT.addLog(' + s.id + ')">+ 진행사항 기록</button></div>' +
      '<div class="note">기록을 남기면 <strong>최종 컨택 일시가 같이 갱신</strong>됩니다 — ' +
      '따로 입력하는 칸을 두면 둘이 어긋납니다.</div></div></div>';

    h += '</div>';
    if (s.lostReason) {
      h += '<div class="gate"><b>실주</b> — ' + esc(s.lostReason) + ' <span class="muted">(' + esc(s.closedAt) + ')</span></div>';
    }
    return h;
  });

  /* ══ 솔루션 › 목록 ═════════════════════════════════════════
     [4-C7] 프로젝트명 항상 · 열 개인화
     [4-C3] "계약 M/M 실제 투입 M/M 구분 -> 보다는 하나로 관리"  → 기본 열은 계약 M/M 하나
     [4-C4] "실제 투입 기간, 개발 기간 구분"                    → 열 둘
     [추가 메모] "진행률 빨간거 -> 초과할때 삐뽀삐뽀" */
  var SOL_COLS = [
    { k: 'endClient', t: '고객사' },
    { k: 'orderer', t: '발주처(계약사)', on: false },
    { k: 'status', t: '상태' },
    { k: 'mm', t: '계약 M/M' },
    { k: 'actual', t: '실제 투입 M/M', on: false },
    { k: 'term', t: '계약 기간' },
    { k: 'dev', t: '개발 기간' },
    { k: 'progress', t: '진행률' },
    { k: 'people', t: '투입 인력' },
    { k: 'pm', t: 'PM', on: false }
  ];

  UI.route('solution', function () {
    var cols = UI.defineCols('solution', SOL_COLS);
    var f = UI.barValue('solution');
    var rows = withRows(DB.solutionOf).filter(function (p) {
      var s = DB.openRow(DB.solutionOf(p.id));
      if (f.status && s.status !== f.status) { return false; }
      if (f.mine === 'y' && !s.assignments.some(function (a) { return a.personId === DB.ME; })) { return false; }
      return UI.matches(p.endClient + ' ' + p.orderer + ' ' + p.name, f.q);
    });

    var h = head('솔루션 › 프로젝트',
      '영업에서 이관된 구축 구간. <strong>유지보수로 이관해도 이 목록에 남는다</strong> — 상태가 완료로 바뀐다.',
      '<button class="btn" disabled title="미정 — 이 영역에서 직접 만들 수 있어야 하는가?">+ 자체 생성 <span class="tag warn">미정</span></button>');

    h += UI.filterBar('solution', [
      { k: 'status', t: '상태', options: ['진행 전', '진행', '검수', '완료'] },
      { k: 'mine', t: '범위', options: [{ v: 'y', t: '내 프로젝트만' }] }
    ], '<span class="spacer"></span>' + cols.button());

    if (!rows.length) { return h + '<p class="empty">해당하는 프로젝트가 없습니다.</p>'; }

    h += '<table><thead><tr>';
    if (cols.has('endClient')) { h += '<th>고객사</th>'; }
    if (cols.has('orderer')) { h += '<th>발주처</th>'; }
    h += '<th>프로젝트명</th>';
    if (cols.has('status')) { h += '<th>상태</th>'; }
    if (cols.has('mm')) { h += '<th class="num">계약 M/M</th>'; }
    if (cols.has('actual')) { h += '<th class="num">실투입 M/M</th>'; }
    if (cols.has('term')) { h += '<th>계약 기간</th>'; }
    if (cols.has('dev')) { h += '<th>개발 기간</th>'; }
    if (cols.has('progress')) { h += '<th>진행률</th>'; }
    if (cols.has('people')) { h += '<th>투입 인력</th>'; }
    if (cols.has('pm')) { h += '<th>PM</th>'; }
    h += '<th></th></tr></thead><tbody>';

    rows.forEach(function (p) {
      var s = DB.openRow(DB.solutionOf(p.id));
      var done = !!s.closedAt;
      var con = DB.contractOfProject(p.id)[0];
      var prog = V2.taskProgress(s);
      var over = V2.mmOver(s);
      var pm = s.assignments.filter(function (a) { return a.role === 'PM'; })[0];
      h += '<tr>';
      if (cols.has('endClient')) { h += '<td>' + UI.chip('solution', 'q', p.endClient) + '</td>'; }
      if (cols.has('orderer')) { h += '<td>' + esc(p.orderer) + '</td>'; }
      h += '<td style="min-width:260px;white-space:normal">' + link('#/sol/' + p.id, p.name) + '</td>';
      if (cols.has('status')) {
        h += '<td>' + tag(done ? 'off' : 'solution', s.status) +
          (done ? ' ' + tag('maint', '이관 ' + s.closedAt) : '') + '</td>';
      }
      if (cols.has('mm')) { h += '<td class="num">' + s.contractMm + '</td>'; }
      if (cols.has('actual')) {
        h += '<td class="num' + (over ? ' over' : '') + '">' + s.actualMm + (over ? ' ⚠' : '') + '</td>';
      }
      if (cols.has('term')) { h += '<td>' + esc(period(s.startDate, s.endDate)) + '</td>'; }
      if (cols.has('dev')) { h += '<td>' + esc(period(s.devStart, s.devEnd)) + '</td>'; }
      if (cols.has('progress')) {
        h += '<td><div class="row">' + bar(prog, over) + '<span' + (over ? ' class="over"' : '') + '>' + prog + '%</span></div>' +
          '<span class="muted">태스크 ' + s.tasks.length + '개에서 파생</span></td>';
      }
      if (cols.has('people')) {
        h += '<td>' + (s.assignments.length
          ? s.assignments.map(function (a) { return esc(DB.personName(a.personId)) + '(' + a.monthlyMm + ')'; }).join(', ')
          : '<span class="tag off">없음</span>') + '</td>';
      }
      if (cols.has('pm')) { h += '<td>' + (pm ? esc(DB.personName(pm.personId)) : '-') + '</td>'; }
      /* 넘기는 것은 솔루션의 '요청'까지다 — 넘어가는 것은 CS 가 수락해야 일어난다 */
      var gs = gateState(s);
      h += '<td class="num">' + (gs === 'accepted'
        ? (con ? link('#/contract/' + con.id, '계약 →') : tag('off', '이관됨'))
        : gs === 'requested'
          ? gateTag(s)
          : gs === 'ready' || gs === 'rejected'
            ? '<button class="btn small' + (gs === 'ready' ? ' primary' : '') + '" onclick="ACT.requestHandover(' + p.id + ')">' +
              (gs === 'rejected' ? '다시 요청' : '이관 요청') + '</button>'
            : gateTag(s)) + '</td></tr>';
    });
    h += '</tbody></table>';
    h += '<div class="note q"><strong>인터뷰 반영</strong> — 진행률이 <strong>태스크의 가중 평균</strong>이 됐습니다' +
      '(직접 쓰는 숫자가 아니라 파생). 계약 기간과 <strong>개발 기간</strong>을 나눴고, 실투입 M/M 이 계약을 넘으면 붉게 표시합니다.<br>' +
      '<strong>확인할 것</strong> — ① M/M 은 "하나로 관리"라고 하셨는데, 초과를 알려면 실투입을 어딘가에서는 알아야 합니다. ' +
      '지금은 기본 열에서 빼고 안쪽에만 뒀습니다. ② 진행률이 파생이면 <strong>사람이 손으로 100%를 만들 수 없습니다</strong> — ' +
      '이관 버튼이 열리는 조건이 태스크에 묶입니다.</div>';
    return h;
  });

  /* ══ 솔루션 상세 — 태스크 · 인력 · 이관 준비 ════════════════
     [추가 메모] "요구사항 / 분석,설계 / 개발", "프로젝트별로 개발자가 태스크 등록",
                 "정해진 task 말고도 custom 영역도 많아서", "수주가 완료 되어야 투입인력 지정",
                 "투입 인력 -> 프로필 가져오기 기능" */
  UI.route('sol', function (id) {
    var p = DB.project(id);
    if (!p) { return '<h1>없는 프로젝트</h1>'; }
    var s = DB.openRow(DB.solutionOf(p.id));
    if (!s) { return '<h1>솔루션 행이 없습니다</h1>'; }
    var sale = DB.openRow(DB.salesOf(p.id));
    var won = sale && (sale.stage === '수주');
    var prog = V2.taskProgress(s);
    var over = V2.mmOver(s);

    var h = head(p.name,
      esc(p.endClient) + ' <span class="muted">(발주처 ' + esc(p.orderer) + ')</span> · ' +
      tag(s.closedAt ? 'off' : 'solution', s.status) + ' · 진행률 <strong>' + prog + '%</strong>',
      link('#/project/' + p.id, '프로젝트 공통 →'));

    h += '<div class="two"><div>';
    h += '<div class="card solution"><h3>기간 · 공수</h3><dl class="kv">' +
      '<dt>계약 기간</dt><dd>' + esc(period(s.startDate, s.endDate)) + '</dd>' +
      '<dt>개발 기간</dt><dd>' + esc(period(s.devStart, s.devEnd)) + '</dd>' +
      '<dt>계약 M/M</dt><dd>' + s.contractMm + '</dd>' +
      '<dt>실투입 M/M</dt><dd class="' + (over ? 'over' : '') + '">' + s.actualMm +
      (over ? ' ⚠ 계약 초과' : '') + '</dd></dl></div>';

    h += '<div class="card solution"><h3>투입 인력</h3>';
    if (!won) {
      h += '<div class="gate"><b>수주 전입니다</b> — 추가 메모의 <em>"수주가 완료 되어야 투입인력 지정"</em> 에 따라 ' +
        '이 화면에서는 배정할 수 없습니다.</div>';
    }
    if (!s.assignments.length) { h += '<p class="empty">배정된 인력이 없습니다.</p>'; } else {
      h += '<table class="tasks"><thead><tr><th>이름</th><th>역할</th><th class="num">월 M/M</th><th></th></tr></thead><tbody>';
      s.assignments.forEach(function (a) {
        h += '<tr><td>' + esc(DB.personName(a.personId)) + '</td><td>' + esc(a.role) + '</td>' +
          '<td class="num">' + a.monthlyMm + '</td>' +
          '<td class="num"><button class="btn small" onclick="ACT.profile(' + a.personId + ')">프로필</button></td></tr>';
      });
      h += '</tbody></table>';
    }
    h += (won && !s.closedAt ? '<div class="row" style="margin-top:8px"><button class="btn small" onclick="ACT.assign(' + p.id + ')">+ 인력 투입</button></div>' : '') +
      '</div></div>';

    /* 태스크 */
    h += '<div><div class="card solution"><h3>태스크 <span class="muted">진행률은 여기서 파생됩니다</span></h3>';
    if (!s.tasks.length) { h += '<p class="empty">태스크가 없습니다.</p>'; } else {
      h += '<table class="tasks"><thead><tr><th>태스크</th><th class="num">비중</th><th>진행</th><th></th></tr></thead><tbody>';
      s.tasks.forEach(function (t, i) {
        h += '<tr><td>' + esc(t.name) + (t.custom ? ' ' + tag('warn', 'custom') : '') + '</td>' +
          '<td class="num">' + t.weight + '%</td>' +
          '<td><div class="row">' + bar(t.progress) + '<span>' + t.progress + '%</span></div></td>' +
          '<td class="num">' + (s.closedAt ? '' :
            '<button class="btn small" onclick="ACT.task(' + p.id + ',' + i + ')">수정</button>') + '</td></tr>';
      });
      h += '<tr><td colspan="2"><strong>가중 평균</strong></td>' +
        '<td><div class="row">' + bar(prog, over) + '<strong>' + prog + '%</strong></div></td><td></td></tr>';
      h += '</tbody></table>';
    }
    h += (s.closedAt ? '' : '<div class="row" style="margin-top:8px">' +
      '<button class="btn small" onclick="ACT.newTask(' + p.id + ')">+ 태스크</button>' +
      '<span class="muted">요구사항 · 분석/설계 · 개발 외에 custom 을 더할 수 있습니다</span></div>') +
      '</div>';

    /* 이관 준비 */
    var gs = gateState(s);
    h += '<div class="card maint"><h3>유지보수 이관</h3>' + gateBody(s) +
      (gs === 'accepted'
        ? '<div class="note">CS 가 수락해 넘어갔습니다 · ' + esc(s.handover.doneAt || s.closedAt) + '</div>'
        : gs === 'requested'
          ? '<div class="note">요청을 보냈습니다 · ' + esc(s.handover.requestedAt) +
            '. <strong>CS 가 수락해야 넘어갑니다</strong> — 여기서 더 할 수 있는 것은 없습니다. ' +
            '수락과 반려는 ' + link('#/mprojects/wait', '유지보수 › 프로젝트 › 대기') + '에서 합니다.</div>'
          : '<div class="row" style="margin-top:8px">' +
            '<button class="btn small" onclick="ACT.editHandover(' + p.id + ')">인수인계서 작성</button>' +
            (gs === 'ready' || gs === 'rejected'
              ? '<button class="btn small primary" onclick="ACT.requestHandover(' + p.id + ')">' +
                (gs === 'rejected' ? '다시 요청' : '이관 요청') + '</button>'
              : '') + '</div>') +
      '</div></div></div>';
    return h;
  });

  /* 이관 필수 입력 — [3-S7 CS] "이관시 필수 탭을 만들어서 못 적으면 이관 처리 못하게 하는게 좋을 것 같음"
     필수: 패키지 버전 · 톰캣 · SSL 여부 · 변경 모듈 · 체크리스트 */
  var GATE_FIELDS = [
    { k: 'packageVer', t: '패키지 버전' },
    { k: 'tomcatVer', t: '톰캣 버전' },
    { k: 'ssl', t: 'SSL 여부' },
    { k: 'modules', t: '변경 모듈' }
  ];
  function gateMissing(s) {
    var m = GATE_FIELDS.filter(function (f) { return !s.handover[f.k]; }).map(function (f) { return f.t; });
    if (!s.handover.checklist) { m.push('체크리스트 확인'); }
    return m;
  }
  /* 이관 상태 — 사용자 결정(2026-09-30): 솔루션이 요청하고 CS 가 수락해야 넘어간다.
     화면이 쓰는 말은 다섯 가지뿐이다. */
  function gateState(s) {
    if (s.closedAt || s.handover.status === 'accepted') { return 'accepted'; }
    if (s.handover.status === 'requested') { return 'requested'; }
    if (s.handover.status === 'rejected') { return 'rejected'; }
    if (V2.taskProgress(s) < 100) { return 'early'; }
    return gateMissing(s).length ? 'incomplete' : 'ready';
  }
  var GATE_LABEL = {
    early: ['off', '진행률 100%부터'], incomplete: ['warn', '인수인계 미작성'],
    ready: ['sales', '요청 가능'], requested: ['solution', 'CS 수락 대기'],
    rejected: ['warn', '반려됨'], accepted: ['maint', '이관 완료']
  };
  function gateTag(s) { var x = GATE_LABEL[gateState(s)]; return tag(x[0], x[1]); }

  function gateBody(s) {
    var miss = gateMissing(s);
    var h = '<dl class="kv"><dt>이관 상태</dt><dd>' + gateTag(s) + '</dd>';
    GATE_FIELDS.forEach(function (f) {
      h += '<dt>' + esc(f.t) + '</dt><dd>' + (s.handover[f.k]
        ? esc(s.handover[f.k]) : '<span class="tag warn">미작성</span>') + '</dd>';
    });
    h += '<dt>체크리스트</dt><dd>' + (s.handover.checklist ? '확인함' : '<span class="tag warn">미확인</span>') + '</dd>' +
      '<dt>인수인계 메모</dt><dd>' + (s.handover.note ? esc(s.handover.note) : '-') + '</dd></dl>';
    if (miss.length) {
      h += '<div class="gate"><b>요청할 수 없습니다</b> — 아래를 다 적어야 이관을 요청할 수 있습니다.<ul><li>' +
        miss.map(esc).join('</li><li>') + '</li></ul></div>';
    }
    if (gateState(s) === 'rejected') {
      h += '<div class="gate"><b>CS 가 반려했습니다</b><br>' + esc(s.handover.rejectReason) + '</div>';
    }
    if (s.handover.history.length) {
      h += '<h3 style="margin-top:12px">이관 주고받은 기록</h3><table class="tasks"><tbody>';
      s.handover.history.slice().reverse().forEach(function (x) {
        h += '<tr><td>' + esc(x.at) + '</td>' +
          '<td>' + tag(x.action === '반려' ? 'warn' : x.action === '수락' ? 'maint' : 'solution', x.action) + '</td>' +
          '<td>' + esc(DB.personName(x.by)) + '</td>' +
          '<td class="muted" style="white-space:normal">' + esc(x.reason || '') + '</td></tr>';
      });
      h += '</tbody></table>';
    }
    return h;
  }

  /* ══ 유지보수 › 프로젝트 (대기 · 완료) ══════════════════════
     [3-S7 CS] "프로젝트 부서에서 이관 프로젝트 대기랑 완료 두개로 관리 아님 탭분리"
               "완료에서 히스토리 볼 수 있게"
               "사이트 -> 이슈 목록 / 프로젝트 -> 히스토리 / 고객사"
     사용자 결정(2026-09-30): 이관 화면을 솔루션에서 유지보수로 옮기고,
     '완료' 탭이 곧 <strong>계약과 무관하게 프로젝트를 훑는 목록</strong>이 된다.
     화면을 둘로 나누지 않는다 — 같은 목록이 두 군데 생기지 않게. */
  UI.route('mprojects', function (tabSlug) {
    var tab = tabSlug === 'wait' ? 'wait' : 'done';   /* 기본은 완료 — 평소에 보는 쪽이다 */
    /* 대기 탭의 모집단은 <strong>요청된 것만</strong>이다(사용자 결정) — CS 의 할 일 목록이고,
       아직 안 끝난 남의 일이 섞이지 않는다. */
    var all = withRows(DB.solutionOf);
    var requested = all.filter(function (p) { return gateState(DB.openRow(DB.solutionOf(p.id))) === 'requested'; });
    var accepted = all.filter(function (p) { return gateState(DB.openRow(DB.solutionOf(p.id))) === 'accepted'; });
    var rows = tab === 'done' ? accepted : requested;

    var h = head('유지보수 › 프로젝트',
      tab === 'done'
        ? '<strong>넘어온 프로젝트</strong>입니다. 계약이 아니라 프로젝트를 기준으로 훑는 자리 — ' +
          '이관 히스토리 · 인수인계 내용 · 연결된 계약과 사이트 · 이 프로젝트의 이슈를 한 곳에서 봅니다.'
        : '솔루션이 <strong>이관을 요청한</strong> 건입니다. ' +
          '<strong>수락해야 넘어옵니다</strong> — 모자라면 사유를 적어 반려합니다.',
      '');
    h += '<div class="row" style="margin:8px 0">' +
      '<a class="btn' + (tab === 'done' ? ' primary' : '') + '" href="#/mprojects/done">완료 ' +
      '<span class="muted">' + accepted.length + '</span></a>' +
      '<a class="btn' + (tab === 'wait' ? ' primary' : '') + '" href="#/mprojects/wait">대기 ' +
      '<span class="muted">' + requested.length + '</span></a></div>';

    if (!rows.length) { return h + '<p class="empty">해당하는 프로젝트가 없습니다.</p>'; }

    if (tab === 'done') {
      h += '<table><thead><tr><th>고객사</th><th>프로젝트명</th><th>이관일</th>' +
        '<th>계약</th><th class="num">사이트</th><th class="num">이슈</th><th>인수인계</th><th></th></tr></thead><tbody>';
      rows.forEach(function (p) {
        var s = DB.openRow(DB.solutionOf(p.id));
        var con = DB.contractOfProject(p.id)[0];
        var st = con ? DB.sitesOf(con.id) : [];
        var siteIds = st.map(function (x) { return x.id; });
        var n = DB.issues.filter(function (i) {
          return i.projectId === p.id || siteIds.indexOf(i.siteId) >= 0;
        }).length;
        var miss = gateMissing(s);
        h += '<tr><td>' + UI.chip('mproj', 'q', p.endClient) + '</td>' +
          '<td style="min-width:240px;white-space:normal">' + link('#/mproject/' + p.id, p.name) + '</td>' +
          '<td>' + esc(s.handover.doneAt || s.closedAt) + '</td>' +
          '<td>' + (con ? link('#/contract/' + con.id, con.name) : tag('off', '계약 없음')) + '</td>' +
          '<td class="num">' + st.length + '</td>' +
          '<td class="num">' + n + '</td>' +
          '<td>' + (miss.length ? tag('warn', '빈칸 ' + miss.length) : tag('maint', '작성됨')) + '</td>' +
          '<td class="num">' + link('#/mproject/' + p.id, '히스토리 →') + '</td></tr>';
      });
      h += '</tbody></table>';
      h += '<div class="note q"><strong>확인할 것</strong> — 이 목록의 모집단은 <strong>"솔루션을 거쳐 이관된 프로젝트"</strong>입니다. ' +
        '이관 없이 직접 등록한 유지보수 계약(가온아이)은 프로젝트가 없어 여기 나오지 않습니다 — ' +
        '그런 건의 히스토리는 어디서 보는지가 미정입니다.</div>';
      return h;
    }

    h += '<table><thead><tr><th>고객사</th><th>프로젝트명</th><th>요청일</th><th>요청자</th>' +
      '<th>인수인계</th><th></th></tr></thead><tbody>';
    rows.forEach(function (p) {
      var s = DB.openRow(DB.solutionOf(p.id));
      var ho = s.handover;
      var wasRejected = ho.history.some(function (x) { return x.action === '반려'; });
      h += '<tr><td>' + esc(p.endClient) + '</td>' +
        '<td style="min-width:240px;white-space:normal">' + link('#/sol/' + p.id, p.name) +
        (wasRejected ? ' ' + tag('off', '반려 후 재요청') : '') + '</td>' +
        '<td>' + esc(ho.requestedAt || '-') + '</td>' +
        '<td>' + esc(DB.personName(ho.requestedBy)) + '</td>' +
        '<td><span class="muted">' + esc(ho.packageVer) + ' · ' + esc(ho.tomcatVer) + ' · SSL ' + esc(ho.ssl) + '</span><br>' +
        '<span class="muted">변경 모듈 ' + esc(ho.modules) + '</span></td>' +
        '<td class="num"><button class="btn small" onclick="ACT.reviewHandover(' + p.id + ')">내용 보기</button> ' +
        '<button class="btn small" onclick="ACT.rejectHandover(' + p.id + ')">반려</button> ' +
        '<button class="btn small primary" onclick="ACT.acceptHandover(' + p.id + ')">수락</button></td></tr>';
    });
    h += '</tbody></table>';
    h += '<div class="note q"><strong>인터뷰 · 사용자 결정 반영</strong> — [5-A2] 의 답입니다: ' +
      '<strong>요청은 솔루션이 하고, CS 가 수락해야 넘어갑니다.</strong> 솔루션 쪽 버튼은 "이관 요청"까지이고, ' +
      '넘어가는 일은 이 화면의 <strong>수락</strong>이 만듭니다. 반려하면 사유와 함께 솔루션의 대기 상태로 돌아가고, ' +
      '주고받은 기록은 프로젝트에 남습니다.<br>' +
      '<strong>확인할 것</strong> — ① 수락하는 사람이 <strong>누구인지</strong>가 아직 없습니다(CS 아무나 / 그 사이트 담당 / 팀장). ' +
      '② 요청이 온 것을 <strong>어떻게 아는지</strong> — 이 목록을 들여다봐야 압니다. 메일 알림은 이슈에만 붙어 있습니다.</div>';
    return h;
  });

  /* 옛 경로 — 이관 화면은 유지보수로 옮겼다 */
  UI.route('handover', function (t) { location.hash = '#/mprojects/' + (t === 'done' ? 'done' : 'wait'); return ''; });

  /* ══ 유지보수 › 프로젝트 히스토리 ═══════════════════════════
     이관 히스토리 · 인수인계 내용 · 연결된 계약과 사이트 · 이 프로젝트의 이슈 (사용자 선택) */
  UI.route('mproject', function (id) {
    var p = DB.project(id);
    if (!p) { return '<h1>없는 프로젝트</h1>'; }
    var sol = DB.openRow(DB.solutionOf(p.id));
    var sale = DB.openRow(DB.salesOf(p.id));
    var con = DB.contractOfProject(p.id)[0];
    var st = con ? DB.sitesOf(con.id) : [];
    var siteIds = st.map(function (x) { return x.id; });
    var issues = DB.issues.filter(function (i) {
      return i.projectId === p.id || siteIds.indexOf(i.siteId) >= 0;
    });

    var h = head(p.name,
      esc(p.endClient) + ' <span class="muted">(발주처 ' + esc(p.orderer) + ')</span> · ' +
      phaseTag(p.phase) + ' · 이관 ' + esc(sol && sol.closedAt ? sol.closedAt : '-'),
      '<a class="btn" href="#/mprojects/done">← 목록</a> ' +
      (con ? '<a class="btn" href="#/contract/' + con.id + '">계약 →</a>' : ''));

    /* ① 이관 히스토리 — 저장하지 않고 영역별 행의 openedAt/closedAt 에서 파생한다 */
    h += '<h2>이관 히스토리</h2>';
    var steps = [];
    if (sale) {
      steps.push({ at: sale.openedAt, cls: 'sales', t: '영업 등록',
        src: 'sales_project #' + sale.id + ' · openedAt' });
      if (sale.closedAt) {
        steps.push({ at: sale.closedAt, cls: 'sales', t: '영업 종료 (수주)',
          src: 'sales_project #' + sale.id + ' · closedAt' });
      }
    }
    if (sol) {
      steps.push({ at: sol.openedAt, cls: 'solution', t: '솔루션으로 이관',
        src: 'solution_project #' + sol.id + ' · openedAt' });
      if (sol.closedAt) {
        steps.push({ at: sol.closedAt, cls: 'solution', t: '솔루션 종료 (완료)',
          src: 'solution_project #' + sol.id + ' · closedAt' });
      }
      /* 요청 · 반려 · 수락은 주고받은 기록에서 그대로 나온다 */
      sol.handover.history.forEach(function (x, n) {
        steps.push({ at: x.at, cls: x.action === '반려' ? 'sales' : x.action === '수락' ? 'maint' : 'solution',
          t: '이관 ' + x.action + (x.reason ? ' — ' + x.reason : ''),
          src: 'solution_project #' + sol.id + ' · handover.history[' + n + '] · ' + DB.personName(x.by) });
      });
    }
    if (con) {
      steps.push({ at: con.startDate, cls: 'maint', t: '유지보수 계약 시작',
        src: 'contract #' + con.id + ' · startDate' });
    }
    steps.sort(function (a, b) { return a.at < b.at ? -1 : 1; });
    steps.forEach(function (s) {
      h += '<div class="card ' + s.cls + '"><span class="when">' + esc(s.at) + '</span>' +
        '<strong>' + esc(s.t) + '</strong><br><span class="muted">' + esc(s.src) + '</span></div>';
    });
    h += '<div class="note">저장된 로그가 아닙니다 — 영역별 행의 날짜 칸에서 그때그때 만들어 냅니다. ' +
      '각 줄 아래가 그 출처입니다(원본 이중화 금지).</div>';

    h += '<div class="two"><div>';

    /* ② 인수인계 내용 */
    h += '<h2>인수인계</h2><div class="card maint">' + (sol ? gateBody(sol) : '<p class="empty">솔루션 행이 없습니다.</p>') +
      '<div class="note">CS 가 실제로 찾아보는 칸입니다 — [3-S7] <em>"필수 패키지 버전 · 톰캣 · 변경 모듈 · ' +
      '체크리스트 · ssl 여부 · 인수인계서 틀"</em>. 넘어온 뒤에도 고쳐야 하는 값인지(톰캣 버전은 바뀝니다) 미정입니다.</div></div>';

    h += '</div><div>';

    /* ③ 연결된 계약 · 사이트 */
    h += '<h2>계약 · 사이트</h2>';
    if (!con) {
      h += '<div class="card"><p class="empty">연결된 계약이 없습니다.</p></div>';
    } else {
      h += '<div class="card maint"><h3>' + link('#/contract/' + con.id, con.name) + '</h3><dl class="kv">' +
        '<dt>구분</dt><dd>' + tag(con.kind === '신규' ? 'sales' : 'off', con.kind) + '</dd>' +
        '<dt>기간</dt><dd>' + esc(period(con.startDate, con.endDate)) + '</dd>' +
        '<dt>계약금액</dt><dd>' + DB.won(con.amount) + '</dd>' +
        '<dt>정기점검</dt><dd>' + (con.checkCycle === '없음' ? '없음' : esc(con.checkCycle) + ' · ' + esc(con.checkMode)) + '</dd>' +
        '</dl></div>';
      h += '<table><thead><tr><th>사이트</th><th>서버 사양</th><th>담당</th><th class="num">이슈</th></tr></thead><tbody>';
      st.forEach(function (s) {
        var n = DB.issues.filter(function (i) { return i.siteId === s.id; }).length;
        h += '<tr><td>' + esc(s.name) + '</td><td>' + esc(s.serverSpec || '-') + '</td>' +
          '<td>' + (s.engineerId ? esc(DB.personName(s.engineerId)) : tag('warn', '미배정')) + '</td>' +
          '<td class="num">' + n + '</td></tr>';
      });
      h += '</tbody></table>';
    }
    h += '</div></div>';

    /* ④ 이 프로젝트의 이슈 — 구축 때 것과 넘어간 뒤 사이트에서 난 것을 한 표에 */
    h += '<h2>이슈 (' + issues.length + ')</h2>';
    if (!issues.length) { h += '<p class="empty">이슈가 없습니다.</p>'; } else {
      h += '<table><thead><tr><th>시기</th><th>구분</th><th>제목</th><th>대상</th>' +
        '<th>상태</th><th>담당</th><th>접수일</th></tr></thead><tbody>';
      issues.slice().sort(function (a, b) { return a.createdAt < b.createdAt ? -1 : 1; }).forEach(function (i) {
        var where = '-';
        if (i.siteId) { var s = DB.byId(DB.sites, i.siteId); where = s ? esc(s.name) : '-'; }
        h += '<tr><td>' + tag(i.scope === 'SOLUTION' ? 'solution' : 'maint',
          i.scope === 'SOLUTION' ? '구축' : '유지보수') + '</td>' +
          '<td>' + tag(i.type === '장애' ? 'warn' : 'off', i.type) + '</td>' +
          '<td style="white-space:normal">' + link('#/issue/' + i.id, i.title) + '</td>' +
          '<td>' + where + '</td>' +
          '<td>' + tag(i.status === '완료' ? 'off' : 'solution', i.status) + '</td>' +
          '<td>' + (i.assigneeId ? esc(DB.personName(i.assigneeId)) : tag('warn', '미배정')) + '</td>' +
          '<td>' + esc(i.createdAt) + '</td></tr>';
      });
      h += '</tbody></table>';
      h += '<div class="note q"><strong>확인할 것</strong> — 구축 때 이슈는 <strong>프로젝트</strong>에, ' +
        '넘어간 뒤 이슈는 <strong>사이트</strong>에 붙습니다. 이 표는 둘을 계약·사이트를 거쳐 한 줄기로 모은 것이라, ' +
        '<strong>프로젝트 없이 직접 등록한 계약에서는 이 연결이 끊깁니다</strong>. ' +
        '정리 문서 §5 의 "이슈의 기준 축" 미합의가 여기서 눈에 보입니다.</div>';
    }
    return h;
  });

  /* ══ 유지보수 › 계약 ═══════════════════════════════════════
     [4-D8] 정기점검 유무(월·분기 / 원격·방문) · 고객대표 · 만료까지 남은 기간
     [추가 메모] 신규/유지 정의 · "유지보수 달력으로 … 갱신일? 마감일?" */
  var CON_COLS = [
    { k: 'client', t: '계약사' },
    { k: 'kind', t: '신규 · 유지' },
    { k: 'status', t: '상태' },
    { k: 'term', t: '기간' },
    { k: 'left', t: '만료까지' },
    { k: 'amount', t: '계약금액' },
    { k: 'sites', t: '사이트 수' },
    { k: 'check', t: '정기점검' },
    { k: 'rep', t: '고객대표' },
    { k: 'sales', t: '영업대표', on: false },
    { k: 'src', t: '출처', on: false }
  ];
  function daysLeft(end) {
    if (!end) { return null; }
    return Math.round((new Date(end + 'T00:00:00') - new Date(DB.today() + 'T00:00:00')) / 86400000);
  }

  UI.route('maintenance', function () {
    var cols = UI.defineCols('contracts', CON_COLS);
    var f = UI.barValue('contracts');
    var rows = DB.contracts.filter(function (c) {
      if (f.kind && c.kind !== f.kind) { return false; }
      if (f.status && c.status !== f.status) { return false; }
      return UI.matches(c.client + ' ' + c.name + ' ' + c.customerRep, f.q);
    });

    var h = head('유지보수 › 계약',
      '원천은 <strong>계약</strong>이다. 이관으로 생기기도 하고, 이관 없이 직접 등록하기도 한다.',
      '<button class="btn primary" onclick="ACT.newContract()">+ 계약 신규 생성</button>');
    h += UI.filterBar('contracts', [
      { k: 'kind', t: '구분', options: ['신규', '유지'] },
      { k: 'status', t: '상태', options: ['신규', '유지', '종료'] }
    ], '<span class="spacer"></span>' + cols.button());

    if (!rows.length) { return h + '<p class="empty">해당하는 계약이 없습니다.</p>'; }
    h += '<table><thead><tr>';
    if (cols.has('client')) { h += '<th>계약사</th>'; }
    h += '<th>계약명</th>';
    if (cols.has('kind')) { h += '<th>구분</th>'; }
    if (cols.has('status')) { h += '<th>상태</th>'; }
    if (cols.has('term')) { h += '<th>기간</th>'; }
    if (cols.has('left')) { h += '<th class="num">만료까지</th>'; }
    if (cols.has('amount')) { h += '<th class="num">계약금액</th>'; }
    if (cols.has('sites')) { h += '<th class="num">사이트</th>'; }
    if (cols.has('check')) { h += '<th>정기점검</th>'; }
    if (cols.has('rep')) { h += '<th>고객대표</th>'; }
    if (cols.has('sales')) { h += '<th>영업대표</th>'; }
    if (cols.has('src')) { h += '<th>출처</th>'; }
    h += '<th></th></tr></thead><tbody>';

    rows.forEach(function (c) {
      var st = DB.sitesOf(c.id);
      var left = daysLeft(c.endDate);
      h += '<tr>';
      if (cols.has('client')) { h += '<td>' + UI.chip('contracts', 'q', c.client) + '</td>'; }
      h += '<td style="min-width:240px;white-space:normal">' + link('#/contract/' + c.id, c.name) + '</td>';
      if (cols.has('kind')) { h += '<td>' + tag(c.kind === '신규' ? 'sales' : 'off', c.kind) + '</td>'; }
      if (cols.has('status')) { h += '<td>' + tag(c.status === '종료' ? 'off' : 'maint', c.status) + '</td>'; }
      if (cols.has('term')) { h += '<td>' + esc(period(c.startDate, c.endDate)) + '</td>'; }
      if (cols.has('left')) {
        h += '<td class="num">' + (left == null ? '-' : left < 0 ? tag('off', '만료') :
          left <= 90 ? '<span class="over">' + left + '일</span>' : left + '일') + '</td>';
      }
      if (cols.has('amount')) { h += '<td class="num">' + DB.won(c.amount) + '</td>'; }
      if (cols.has('sites')) { h += '<td class="num">' + st.length + '</td>'; }
      if (cols.has('check')) {
        h += '<td>' + (c.checkCycle === '없음'
          ? tag('off', '없음')
          : tag('maint', c.checkCycle) + ' ' + tag('off', c.checkMode)) + '</td>';
      }
      if (cols.has('rep')) { h += '<td>' + esc(c.customerRep || '-') + '</td>'; }
      if (cols.has('sales')) { h += '<td>' + esc(DB.personName(c.salesOwnerId)) + '</td>'; }
      if (cols.has('src')) {
        h += '<td>' + (c.sourceProjectId ? link('#/project/' + c.sourceProjectId, '이관') : tag('off', '직접 등록')) + '</td>';
      }
      h += '<td class="num"><button class="btn small" onclick="ACT.editContract(' + c.id + ')">수정</button></td></tr>';
    });
    h += '</tbody></table>';
    h += '<div class="note q"><strong>인터뷰 반영</strong> — <strong>신규 / 유지</strong>를 상태와 별도 열로 뺐습니다' +
      '(신규 = 처음 유상, 유지 = 이미 유상이고 이어서). 정기점검 주기·방식, 고객대표, 만료까지 남은 기간을 더했습니다.<br>' +
      '<strong>확인할 것</strong> — 지금 <code>status</code>(신규·유지·종료)와 새 <code>kind</code>(신규·유지)가 ' +
      '<strong>같은 말을 두 번</strong> 합니다. 둘 중 하나여야 할 것 같은데, 어느 쪽이 실제로 쓰는 구분인지.</div>';
    return h;
  });

  /* 계약 상세 — v1 에 정기점검과 v2 항목을 얹는다 */
  UI.route('contract', function (id) {
    var c = DB.byId(DB.contracts, id);
    if (!c) { return '<h1>없는 계약</h1>'; }
    var st = DB.sitesOf(c.id);
    var ck = V2.checks.filter(function (x) { return x.contractId === c.id; });

    var h = head(c.name,
      esc(c.client) + ' · ' + tag(c.kind === '신규' ? 'sales' : 'off', c.kind) + ' · ' +
      tag(c.status === '종료' ? 'off' : 'maint', c.status) + ' · ' + esc(period(c.startDate, c.endDate)),
      '<button class="btn" onclick="ACT.editContract(' + c.id + ')">계약 수정</button>');

    h += '<div class="card maint"><h3>계약 — contract #' + c.id + '</h3><dl class="kv">' +
      '<dt>계약금액</dt><dd>' + DB.won(c.amount) + '</dd>' +
      '<dt>고객대표</dt><dd>' + esc(c.customerRep || '-') + '</dd>' +
      '<dt>영업대표</dt><dd>' + esc(DB.personName(c.salesOwnerId)) + '</dd>' +
      '<dt>정기점검</dt><dd>' + (c.checkCycle === '없음' ? '없음' : esc(c.checkCycle) + ' · ' + esc(c.checkMode)) + '</dd>' +
      '<dt>갱신일</dt><dd>' + esc(c.renewAt || '-') + ' <span class="muted">만료일과 다를 수 있음</span></dd>' +
      '<dt>출처</dt><dd>' + (c.sourceProjectId ? link('#/project/' + c.sourceProjectId, '프로젝트 이관') : '이관 없이 직접 등록') + '</dd>' +
      '<dt>비고</dt><dd>' + (c.note ? esc(c.note) : '-') + '</dd></dl></div>';

    h += '<h2>사이트 (' + st.length + ')</h2><table><thead><tr><th>사이트</th><th>채널</th>' +
      '<th>서버 사양</th><th>담당 엔지니어</th><th class="num">이슈</th><th></th></tr></thead><tbody>';
    st.forEach(function (s) {
      var n = DB.issues.filter(function (i) { return i.siteId === s.id; }).length;
      h += '<tr><td>' + esc(s.name) + '</td><td>' + tag('off', s.channel) + '</td>' +
        '<td>' + esc(s.serverSpec || '-') + '</td>' +
        '<td>' + (s.engineerId ? esc(DB.personName(s.engineerId)) : tag('warn', '미배정')) + '</td>' +
        '<td class="num">' + n + '건</td>' +
        '<td class="num">' + UI.chip('issues-m', 'site', s.id, '이 사이트 이슈 →') + '</td></tr>';
    });
    h += '</tbody></table>';

    h += '<h2>정기점검 (' + ck.length + ')</h2>';
    if (!ck.length) { h += '<p class="empty">등록된 점검이 없습니다.</p>'; } else {
      h += '<table><thead><tr><th>예정일</th><th>사이트</th><th>방식</th><th>담당</th><th>문서</th><th>완료</th></tr></thead><tbody>';
      ck.forEach(function (x) {
        var site = DB.byId(DB.sites, x.siteId);
        h += '<tr><td>' + esc(x.planned) + '</td>' +
          '<td>' + esc(site ? site.name : '-') + '</td>' +
          '<td>' + tag('off', x.mode) + '</td>' +
          '<td>' + (x.engineerId ? esc(DB.personName(x.engineerId)) : tag('warn', '미배정')) + '</td>' +
          '<td>' + (x.doc ? esc(x.doc) : '<span class="muted">없음</span>') + '</td>' +
          '<td>' + (x.done
            ? tag('maint', '완료 ' + x.done)
            : '<button class="btn small" onclick="ACT.doneCheck(' + x.id + ')">완료 처리</button>') + '</td></tr>';
      });
      h += '</tbody></table>';
    }
    return h;
  });

  /* ══ 정기점검 ══════════════════════════════════════════════
     [6-C6 CS] "정기정검 탭 추가!!!", "정기정검 문서도 관리", "완료 표시, 일정"
     [6-C6 CS] "외근 일정같은거 캘린더에 표시하면 좋을 것 같음" */
  var checkMonth = null;
  UI.route('checks', function () {
    var anchor = checkMonth || DB.today();
    var d = new Date(anchor + 'T00:00:00');
    var label = d.getFullYear() + '년 ' + (d.getMonth() + 1) + '월';
    var pending = V2.checks.filter(function (c) { return !c.done; });

    var h = head('유지보수 › 정기점검',
      '계약의 <strong>점검 주기</strong>(월 · 분기)와 <strong>방식</strong>(원격 · 방문)에서 일정이 나옵니다. ' +
      '방문 점검은 외근 일정과 같은 달력에 놓입니다.',
      '<button class="btn primary" onclick="ACT.newCheck()">+ 점검 일정</button>');

    h += '<div class="tiles">' +
      '<div class="tile"><div class="t">이번 달 예정</div><div class="v">' +
      V2.checks.filter(function (c) { return c.planned.slice(0, 7) === anchor.slice(0, 7); }).length + '건</div></div>' +
      '<div class="tile"><div class="t">미완료</div><div class="v">' + pending.length + '건</div></div>' +
      '<div class="tile"><div class="t">문서 있음</div><div class="v">' +
      V2.checks.filter(function (c) { return !!c.doc; }).length + '건</div></div></div>';

    h += '<div class="weekcap"><span>' + esc(label) + '</span><span class="row">' +
      '<button class="btn small" onclick="ACT.checkMonth(-1)">←</button>' +
      '<button class="btn small" onclick="ACT.checkMonth(0)">이번 달</button>' +
      '<button class="btn small" onclick="ACT.checkMonth(1)">→</button></span></div>';

    h += monthGrid(anchor, function (date) {
      var out = [];
      V2.checks.forEach(function (c) {
        if (c.planned !== date) { return; }
        var site = DB.byId(DB.sites, c.siteId);
        out.push({ cls: 'check' + (c.done ? ' done' : ''), text: (site ? site.name : '') + ' · ' + c.mode,
          act: 'ACT.doneCheck(' + c.id + ')' });
      });
      DB.contracts.forEach(function (c) {
        if (c.renewAt === date) { out.push({ cls: 'renew', text: '갱신 · ' + c.name, act: 'location.hash=&quot;#/contract/' + c.id + '&quot;' }); }
        if (c.endDate === date) { out.push({ cls: 'renew', text: '만료 · ' + c.client, act: 'location.hash=&quot;#/contract/' + c.id + '&quot;' }); }
      });
      V2.trips.forEach(function (t) {
        if (t.date === date) { out.push({ cls: 'trip', text: '외근 · ' + DB.personName(t.personId) + ' ' + t.where, act: '' }); }
      });
      return out;
    });

    h += '<h2>점검 목록</h2><table><thead><tr><th>예정일</th><th>계약</th><th>사이트</th>' +
      '<th>주기</th><th>방식</th><th>담당</th><th>문서</th><th>완료</th></tr></thead><tbody>';
    V2.checks.slice().sort(function (a, b) { return a.planned < b.planned ? -1 : 1; }).forEach(function (x) {
      var con = DB.byId(DB.contracts, x.contractId);
      var site = DB.byId(DB.sites, x.siteId);
      h += '<tr><td>' + esc(x.planned) + '</td>' +
        '<td>' + (con ? link('#/contract/' + con.id, con.name) : '-') + '</td>' +
        '<td>' + esc(site ? site.name : '-') + '</td>' +
        '<td>' + esc(con ? con.checkCycle : '-') + '</td>' +
        '<td>' + tag('off', x.mode) + '</td>' +
        '<td>' + (x.engineerId ? esc(DB.personName(x.engineerId)) : tag('warn', '미배정')) + '</td>' +
        '<td>' + (x.doc ? esc(x.doc) : '<button class="btn small" onclick="ACT.checkDoc(' + x.id + ')">+ 문서</button>') + '</td>' +
        '<td>' + (x.done ? tag('maint', '완료 ' + x.done)
          : '<button class="btn small" onclick="ACT.doneCheck(' + x.id + ')">완료 처리</button>') + '</td></tr>';
    });
    h += '</tbody></table>';
    h += '<div class="note q"><strong>확인할 것</strong> — 점검 일정을 <strong>계약의 주기에서 자동으로 만들지</strong>, ' +
      '사람이 하나씩 넣을지가 미정입니다. 지금은 손으로 넣는 쪽입니다. ' +
      '자동으로 만들면 "이번 분기 건을 건너뛰었다"를 시스템이 알 수 있고, 손으로 넣으면 안 만든 것과 건너뛴 것이 구분되지 않습니다.</div>';
    return h;
  });

  function monthGrid(anchor, evFor) {
    var days = V2.monthDays(anchor);
    var today = DB.today();
    var h = '<div class="month">';
    ['월', '화', '수', '목', '금', '토', '일'].forEach(function (w) { h += '<div class="mh">' + w + '</div>'; });
    days.forEach(function (d) {
      var wknd = DB.isWeekend(d.date);
      h += '<div class="mc' + (d.inMonth ? '' : ' out') + (d.date === today ? ' today' : '') + (wknd ? ' wknd' : '') + '">' +
        '<div class="dnum">' + Number(d.date.slice(8)) + '</div>';
      (evFor(d.date) || []).forEach(function (e) {
        h += '<div class="ev ' + e.cls + '"' + (e.act ? ' onclick="' + e.act + '"' : '') + ' title="' + esc(e.text) + '">' +
          esc(e.text) + '</div>';
      });
      h += '</div>';
    });
    return h + '</div>';
  }

  /* ══ 이슈 목록 ═════════════════════════════════════════════
     [3-S7 CS] 담당자 기준 보기 · "필터는 다 달면 좋을 것 같고" · 값 클릭 필터
     [6-C6 CS] 고객 담당자 · 완료일 · 난이도 · 별점 · 재오픈 · "긴급도는 애매"
     상태는 4단계 유지(사용자 결정) */
  var ISSUE_COLS = [
    { k: 'type', t: '구분' },
    { k: 'where', t: '프로젝트 · 사이트' },
    { k: 'orderer', t: '고객사 · 계약사' },
    { k: 'status', t: '상태' },
    { k: 'assignee', t: '담당자' },
    { k: 'customer', t: '고객 담당자' },
    { k: 'difficulty', t: '난이도' },
    { k: 'rating', t: '별점', on: false },
    { k: 'created', t: '접수일' },
    { k: 'closed', t: '완료일' }
  ];

  function issueScreen(scope, key, title, lead) {
    var cols = UI.defineCols(key, ISSUE_COLS);
    var f = UI.barValue(key);
    var rows = DB.issues.filter(function (i) {
      if (i.scope !== scope) { return false; }
      if (f.status && i.status !== f.status) { return false; }
      if (f.type && i.type !== f.type) { return false; }
      if (f.mine === 'y' && i.assigneeId !== DB.ME) { return false; }
      if (f.site && String(i.siteId) !== String(f.site)) { return false; }
      var where = '';
      if (i.projectId) { var p = DB.project(i.projectId); where = p ? p.name + ' ' + p.endClient + ' ' + p.orderer : ''; }
      if (i.siteId) { var s = DB.byId(DB.sites, i.siteId); where = s ? s.name : ''; }
      return UI.matches(i.title + ' ' + where + ' ' + i.customer + ' ' + DB.personName(i.assigneeId), f.q);
    });

    var h = head(title, lead, '<button class="btn primary" onclick="ACT.newIssue(&quot;' + scope + '&quot;)">+ 이슈 등록</button>');
    h += UI.filterBar(key, [
      { k: 'status', t: '상태', options: ISSUE_STATUS },
      { k: 'type', t: '구분', options: ISSUE_TYPE },
      { k: 'mine', t: '범위', options: [{ v: 'y', t: '내 담당만' }] }
    ], '<span class="spacer"></span>' + cols.button());

    if (!rows.length) { return h + '<p class="empty">해당하는 이슈가 없습니다.</p>'; }
    h += '<table><thead><tr>';
    if (cols.has('type')) { h += '<th>구분</th>'; }
    h += '<th>제목</th>';
    if (cols.has('where')) { h += '<th>' + (scope === 'SOLUTION' ? '프로젝트' : '사이트') + '</th>'; }
    if (cols.has('orderer')) { h += '<th>고객사 · 계약사</th>'; }
    if (cols.has('status')) { h += '<th>상태</th>'; }
    if (cols.has('assignee')) { h += '<th>담당자</th>'; }
    if (cols.has('customer')) { h += '<th>고객 담당자</th>'; }
    if (cols.has('difficulty')) { h += '<th>난이도</th>'; }
    if (cols.has('rating')) { h += '<th>별점</th>'; }
    if (cols.has('created')) { h += '<th>접수일</th>'; }
    if (cols.has('closed')) { h += '<th>완료일</th>'; }
    h += '<th></th></tr></thead><tbody>';

    rows.forEach(function (i) {
      var where = '-', who = '-';
      if (i.projectId) {
        var p = DB.project(i.projectId);
        if (p) { where = link('#/project/' + p.id, p.name); who = p.endClient + ' / ' + p.orderer; }
      } else if (i.siteId) {
        var s = DB.byId(DB.sites, i.siteId);
        if (s) {
          var c = DB.byId(DB.contracts, s.contractId);
          where = UI.chip(key, 'site', s.id, s.name);
          who = c ? c.client : '-';
        }
      }
      h += '<tr>';
      if (cols.has('type')) { h += '<td>' + tag(i.type === '장애' ? 'warn' : 'off', i.type) + '</td>'; }
      h += '<td style="min-width:240px;white-space:normal">' + link('#/issue/' + i.id, i.title) + '</td>';
      if (cols.has('where')) { h += '<td>' + where + '</td>'; }
      if (cols.has('orderer')) { h += '<td class="muted">' + esc(who) + '</td>'; }
      if (cols.has('status')) { h += '<td>' + tag(i.status === '완료' ? 'off' : 'solution', i.status) + '</td>'; }
      if (cols.has('assignee')) { h += '<td>' + (i.assigneeId ? esc(DB.personName(i.assigneeId)) : tag('warn', '미배정')) + '</td>'; }
      if (cols.has('customer')) { h += '<td>' + esc(i.customer || '-') + '</td>'; }
      if (cols.has('difficulty')) { h += '<td>' + tag(i.difficulty === '상' ? 'warn' : 'off', i.difficulty) + '</td>'; }
      if (cols.has('rating')) { h += '<td>' + stars(i.rating) + '</td>'; }
      if (cols.has('created')) { h += '<td>' + esc(i.createdAt) + '</td>'; }
      if (cols.has('closed')) { h += '<td>' + (i.closedAt ? esc(i.closedAt) : '-') + '</td>'; }
      h += '<td class="num">' + (i.status === '완료'
        ? '<button class="btn small" onclick="ACT.reopen(' + i.id + ')">재오픈</button>'
        : '<button class="btn small" onclick="ACT.closeIssue(' + i.id + ')">완료 처리</button>') + '</td></tr>';
    });
    h += '</tbody></table>';
    h += '<div class="note q"><strong>인터뷰 반영</strong> — 담당자 기준 보기, 값 클릭 필터, 고객 담당자, 완료일, ' +
      '난이도, 별점, <strong>완료 건 되살리기</strong>를 넣었습니다. 긴급도는 <em>"애매(케이스바이케이스)"</em> 라 넣지 않았습니다. ' +
      '상태는 4단계 그대로입니다.<br>' +
      '<strong>확인할 것</strong> — <strong>별점이 누구에 대한 것인지</strong>가 원문에서 모호합니다' +
      '("업체 담당자 별점(특이사항)"). 이슈 한 건에 붙는 값인지, 고객 담당자라는 <em>사람</em>에 붙는 값인지 — ' +
      '사람에 붙는 값이면 이슈가 아니라 고객 담당자 목록이 필요합니다.</div>';
    return h;
  }

  UI.route('solution-issues', function () {
    return issueScreen('SOLUTION', 'issues-s', '솔루션 › 이슈',
      '구축 중 이슈는 <strong>프로젝트</strong>에 붙는다.');
  });
  UI.route('maintenance-issues', function () {
    return issueScreen('MAINTENANCE', 'issues-m', '유지보수 › 이슈',
      '유지보수 이슈는 <strong>사이트</strong>에 붙는다(현 BACKBONE 유지). ' +
      '솔루션 쪽에서는 "프로젝트 기준"을 원했습니다 — 정리 문서 §5의 미합의 항목.');
  });

  /* ══ 이슈 상세 — 새 페이지 ═════════════════════════════════
     [3-S7 CS] "이슈 작성시 내용이 많아지면 새 페이지로 이동하는게 좋아보임"
               "code 형식 받을 수 있음", "이미지는 잘보이게",
               "원인 분석 조치내역 로드", "문의 내용 / 원인 파악 / 작업 내용" 틀 */
  UI.route('issue', function (id) {
    var i = DB.byId(DB.issues, id);
    if (!i) { return '<h1>없는 이슈</h1>'; }
    var where = '-', backHref = i.scope === 'SOLUTION' ? '#/solution-issues' : '#/maintenance-issues';
    if (i.projectId) {
      var p = DB.project(i.projectId);
      if (p) { where = link('#/project/' + p.id, p.name); }
    } else if (i.siteId) {
      var s = DB.byId(DB.sites, i.siteId);
      var c = s ? DB.byId(DB.contracts, s.contractId) : null;
      if (s) { where = esc(s.name) + (c ? ' <span class="muted">· ' + esc(c.name) + '</span>' : ''); }
    }

    /* [3-S7 CS] "이슈 페이지에서 완료 프로젝트넘어가게 링크"
       유지보수 이슈는 사이트에 붙으므로 사이트 → 계약 → 출처 프로젝트로 거슬러 간다. */
    var srcProject = null;
    if (i.projectId) { srcProject = i.projectId; } else if (i.siteId) {
      var s2 = DB.byId(DB.sites, i.siteId);
      var c2 = s2 ? DB.byId(DB.contracts, s2.contractId) : null;
      if (c2 && c2.sourceProjectId) { srcProject = c2.sourceProjectId; }
    }

    var h = head(i.title,
      tag(i.type === '장애' ? 'warn' : 'off', i.type) + ' · ' +
      tag(i.status === '완료' ? 'off' : 'solution', i.status) + ' · 담당 ' +
      (i.assigneeId ? esc(DB.personName(i.assigneeId)) : '미배정') + ' · 접수 ' + esc(i.createdAt) +
      (i.closedAt ? ' · 완료 ' + esc(i.closedAt) : ''),
      '<a class="btn" href="' + backHref + '">← 목록</a> ' +
      (srcProject ? '<a class="btn" href="#/mproject/' + srcProject + '">프로젝트 히스토리 →</a> ' : '') +
      '<button class="btn" onclick="ACT.editIssue(' + i.id + ')">수정</button>');

    h += '<div class="two"><div>';
    h += '<div class="card solution"><h3>내용</h3><div class="issuebody">' + esc(i.body) + '</div>';
    h += '<div class="row" style="margin-top:8px"><span class="imgstub">이미지 1</span>' +
      '<span class="imgstub">이미지 2</span></div>' +
      '<div class="note">템플릿은 <strong>설정에서 정의</strong>합니다 — 이슈를 새로 만들면 ' +
      '<code class="inline">문의 내용 / 원인 파악 / 작업 내용</code> 틀이 미리 들어갑니다. ' +
      '코드 블록과 이미지가 본문 안에 들어갑니다.</div></div>';

    h += '<div class="card common"><h3>댓글 (' + i.comments.length + ')</h3>';
    if (!i.comments.length) { h += '<p class="empty">댓글이 없습니다.</p>'; } else {
      i.comments.forEach(function (c) {
        h += '<div style="padding:6px 0;border-bottom:1px solid var(--line)">' +
          '<span class="muted">' + esc(c.at) + ' · ' + esc(DB.personName(c.by)) + '</span><br>' + esc(c.text) + '</div>';
      });
    }
    h += '<div class="row" style="margin-top:8px"><button class="btn small" onclick="ACT.comment(' + i.id + ')">+ 댓글</button>' +
      '<span class="muted">해결되면 메일로 알립니다</span></div></div></div>';

    h += '<div><div class="card common"><h3>정보</h3><dl class="kv">' +
      '<dt>대상</dt><dd>' + where + '</dd>' +
      '<dt>출처 프로젝트</dt><dd>' + (srcProject
        ? link('#/mproject/' + srcProject, DB.project(srcProject).name)
        : '<span class="muted">이관 없이 등록된 계약 — 프로젝트 없음</span>') + '</dd>' +
      '<dt>고객 담당자</dt><dd>' + esc(i.customer || '-') + '</dd>' +
      '<dt>난이도</dt><dd>' + tag(i.difficulty === '상' ? 'warn' : 'off', i.difficulty) + '</dd>' +
      '<dt>업체 담당자 별점</dt><dd>' + stars(i.rating) + '</dd>' +
      '<dt>접수일</dt><dd>' + esc(i.createdAt) + '</dd>' +
      '<dt>완료일</dt><dd>' + (i.closedAt ? esc(i.closedAt) : '-') + '</dd></dl>' +
      '<div class="row" style="margin-top:10px">' +
      (i.status === '완료'
        ? '<button class="btn small" onclick="ACT.reopen(' + i.id + ')">재오픈</button>'
        : '<button class="btn small primary" onclick="ACT.closeIssue(' + i.id + ')">완료 처리</button>') +
      '<button class="btn small" onclick="ACT.delIssue(' + i.id + ')">삭제</button></div></div>';

    h += '<div class="card common"><h3>알림</h3>' +
      '<label class="chk"><input type="checkbox" checked> 상태가 바뀌면 담당자에게 메일</label>' +
      '<label class="chk"><input type="checkbox" checked> 완료되면 등록자에게 메일</label>' +
      '<label class="chk"><input type="checkbox"> 같은 사이트 담당자 전원에게 공유</label>' +
      '<div class="note">[3-S7] <em>"메일로 알람이 오면 좋겠다"</em> · ' +
      '[추가 메모] <em>"이슈 공유 최대한 잘되게 → 해결하면 알림"</em>. 목업입니다.</div></div></div></div>';
    return h;
  });

  /* ══ 회계 › 매출 · 매입 ════════════════════════════════════
     [추가 메모] "매출액 -> 경영쪽에서 나중에 관리할 수 있게 확장", "매출, 매입 통계 기능!!!!"
     계산 원리는 부사장님 인터뷰 전이라 확인되지 않았다. 숫자는 목업이다. */
  UI.route('finance', function () {
    var rev = V2.revenueRows();
    var buy = V2.purchases;
    var f = UI.barValue('finance');
    var year = f.year || '2026';

    var revY = rev.filter(function (r) { return r.at.slice(0, 4) === year; });
    var buyY = buy.filter(function (r) { return r.at.slice(0, 4) === year; });
    var revSum = revY.reduce(function (a, b) { return a + b.amount; }, 0);
    var buySum = buyY.reduce(function (a, b) { return a + b.amount; }, 0);

    var h = head('회계 › 매출 · 매입',
      '<strong>이 화면의 숫자는 목업입니다.</strong> 추가 메모에 <em>"부사장님과 인터뷰 — 어떤 금액 계산 원리가 ' +
      '필요한지"</em> 라고 적혀 있고, 그 답을 아직 받지 못했습니다. 지금 묻는 것은 <strong>무엇을 어떤 축으로 보고 싶은가</strong> 하나입니다.',
      '');

    h += UI.filterBar('finance', [
      { k: 'year', t: '연도', options: ['2025', '2026'] }
    ], '');

    h += '<div class="tiles">' +
      '<div class="tile"><div class="t">' + esc(year) + ' 매출</div><div class="v">' + DB.won(revSum) + '</div></div>' +
      '<div class="tile"><div class="t">' + esc(year) + ' 매입</div><div class="v">' + DB.won(buySum) + '</div></div>' +
      '<div class="tile"><div class="t">차액</div><div class="v' + (revSum - buySum < 0 ? ' over' : '') + '">' +
      DB.won(revSum - buySum) + '</div></div>' +
      '<div class="tile"><div class="t">매출 건수</div><div class="v">' + revY.length + '</div></div></div>';

    /* 프로젝트별 매출 대 매입 */
    var byProject = {};
    revY.forEach(function (r) {
      if (!r.projectId) { return; }
      if (!byProject[r.projectId]) { byProject[r.projectId] = { rev: 0, buy: 0 }; }
      byProject[r.projectId].rev += r.amount;
    });
    buyY.forEach(function (r) {
      if (!byProject[r.projectId]) { byProject[r.projectId] = { rev: 0, buy: 0 }; }
      byProject[r.projectId].buy += r.amount;
    });
    var keys = Object.keys(byProject);
    var max = 1;
    keys.forEach(function (k) { max = Math.max(max, byProject[k].rev, byProject[k].buy); });

    h += '<h2>프로젝트별 매출 · 매입</h2>';
    if (!keys.length) { h += '<p class="empty">해당 연도 자료가 없습니다.</p>'; }
    keys.forEach(function (k) {
      var p = DB.project(k);
      var v = byProject[k];
      h += '<div style="margin:10px 0"><strong>' + esc(p ? p.name : '#' + k) + '</strong>' +
        '<div class="hbar"><span class="muted">매출</span>' +
        '<div class="track"><i style="width:' + Math.round(v.rev / max * 100) + '%"></i></div>' +
        '<span class="n">' + DB.won(v.rev) + '</span></div>' +
        '<div class="hbar"><span class="muted">매입</span>' +
        '<div class="track"><i class="buy" style="width:' + Math.round(v.buy / max * 100) + '%"></i></div>' +
        '<span class="n">' + DB.won(v.buy) + '</span></div></div>';
    });

    h += '<h2>매출</h2><table><thead><tr><th>일자</th><th>구분</th><th>건</th><th>발주처</th><th class="num">금액</th></tr></thead><tbody>';
    revY.forEach(function (r) {
      h += '<tr><td>' + esc(r.at) + '</td><td>' + tag(r.kind === '유지보수' ? 'maint' : 'sales', r.kind) + '</td>' +
        '<td style="white-space:normal">' + (r.projectId ? link('#/project/' + r.projectId, r.name) : esc(r.name)) + '</td>' +
        '<td>' + esc(r.orderer) + '</td><td class="num">' + DB.won(r.amount) + '</td></tr>';
    });
    h += '</tbody></table>';

    h += '<h2>매입</h2><table><thead><tr><th>일자</th><th>거래처</th><th>내역</th><th>프로젝트</th><th class="num">금액</th></tr></thead><tbody>';
    buyY.forEach(function (r) {
      var p = DB.project(r.projectId);
      h += '<tr><td>' + esc(r.at) + '</td><td>' + esc(r.vendor) + '</td><td>' + esc(r.item) + '</td>' +
        '<td style="white-space:normal">' + (p ? link('#/project/' + p.id, p.name) : '-') + '</td>' +
        '<td class="num">' + DB.won(r.amount) + '</td></tr>';
    });
    h += '</tbody></table>';

    h += '<div class="note q"><strong>확인할 것</strong> — ① 매출을 <strong>언제 잡는지</strong>가 정해져야 합니다: ' +
      '수주일 · 검수일 · 수금일 중 무엇인지에 따라 같은 건이 다른 해에 잡힙니다. ' +
      '② 매출이 없는 프로젝트(용역 · 마케팅 · 연구소 · PoC)는 이 표에서 빠집니다 — 원가만 있는 건을 어디서 볼지. ' +
      '③ 유지보수 계약 금액을 <strong>연 단위로 나눌지</strong>, 시작일에 한 번에 잡을지.</div>';
    return h;
  });

  /* ══ 회계 › 수금 일정 ══════════════════════════════════════
     [4-B7] "선금 예정일 잔금예정일 검수확인일자"
     [추가 메모] "중요한거: 수주, 돈 받기. 매출로 이어지는 것 확인." */
  UI.route('payments', function () {
    var rows = V2.paymentRows();
    var f = UI.barValue('payments');
    var today = DB.today();
    var filtered = rows.filter(function (r) {
      if (f.kind && r.kind !== f.kind) { return false; }
      if (f.when === 'past' && r.due >= today) { return false; }
      if (f.when === 'future' && r.due < today) { return false; }
      return UI.matches(r.project + ' ' + r.orderer, f.q);
    });

    var h = head('회계 › 수금 일정',
      '영업 건의 <strong>선금 · 중도금 · 잔금 · 검수확인</strong> 날짜에서 파생합니다. 따로 저장하지 않습니다.',
      '');
    h += UI.filterBar('payments', [
      { k: 'kind', t: '구분', options: ['선금', '중도금', '잔금', '검수확인'] },
      { k: 'when', t: '시점', options: [{ v: 'past', t: '지난 건' }, { v: 'future', t: '남은 건' }] }
    ], '');

    var sum = filtered.reduce(function (a, b) { return a + b.amount; }, 0);
    h += '<div class="tiles"><div class="tile"><div class="t">건수</div><div class="v">' + filtered.length + '</div></div>' +
      '<div class="tile"><div class="t">금액 합</div><div class="v">' + DB.won(sum) + '</div></div></div>';

    if (!filtered.length) { return h + '<p class="empty">해당하는 일정이 없습니다.</p>'; }
    h += '<table><thead><tr><th>예정일</th><th>구분</th><th>프로젝트</th><th>발주처</th>' +
      '<th class="num">금액</th><th>출처</th></tr></thead><tbody>';
    filtered.forEach(function (r) {
      var late = r.due < today;
      h += '<tr><td' + (late ? ' class="over"' : '') + '>' + esc(r.due) + '</td>' +
        '<td>' + tag(r.kind === '검수확인' ? 'off' : 'sales', r.kind) + '</td>' +
        '<td style="white-space:normal">' + link('#/deal/' + r.projectId, r.project) + '</td>' +
        '<td>' + esc(r.orderer) + '</td>' +
        '<td class="num">' + (r.amount ? DB.won(r.amount) : '-') + '</td>' +
        '<td class="muted">' + esc(r.from) + '</td></tr>';
    });
    h += '</tbody></table>';
    h += '<div class="note q"><strong>확인할 것</strong> — 지금 <strong>비율(선금 30 · 중도금 40 · 잔금 30)을 제가 임의로 가정</strong>했습니다. ' +
      '실제로는 계약마다 다를 텐데, 비율을 계약에 적을지 금액을 직접 적을지가 미정입니다. ' +
      '또 <strong>수금 예정</strong>과 <strong>실제 입금</strong>이 다른데, 입금 확인은 이 화면의 일이 아닐 수 있습니다.</div>';
    return h;
  });

  /* ══ 개인페이지 › TODO 월별 ════════════════════════════════
     [추가 메모] "TODO 월별보기 추가" — 주간 화면(v1)은 그대로 두고 보기를 하나 더한다 */
  var todoMonth = null;
  UI.route('my-month', function () {
    var anchor = todoMonth || DB.today();
    var d = new Date(anchor + 'T00:00:00');
    var h = head('개인페이지 › TODO · 월',
      '주간 보기는 ' + link('#/my-todos', '여기') + '. 같은 데이터의 다른 보기입니다.', '');
    h += '<div class="weekcap"><span>' + d.getFullYear() + '년 ' + (d.getMonth() + 1) + '월</span><span class="row">' +
      '<button class="btn small" onclick="ACT.todoMonth(-1)">←</button>' +
      '<button class="btn small" onclick="ACT.todoMonth(0)">이번 달</button>' +
      '<button class="btn small" onclick="ACT.todoMonth(1)">→</button></span></div>';
    h += monthGrid(anchor, function (date) {
      return DB.todosOf(DB.ME, date).map(function (t) {
        var p = t.projectId ? DB.project(t.projectId) : null;
        return { cls: 'todo' + (t.status === '완료' ? ' done' : ''),
          text: (p ? '[' + p.endClient + '] ' : '') + t.title, act: '' };
      });
    });
    h += '<div class="note q"><strong>확인할 것</strong> — 월 보기는 칸이 좁아 <strong>제목만</strong> 보입니다. ' +
      '주간 보기에 있던 상태·프로젝트·연속된 날 이어 그리기가 여기서는 사라집니다. ' +
      '월 보기의 쓸모가 "무엇을 했는지 훑기"라면 이걸로 충분하고, "무엇을 할지 정하기"라면 주간이 여전히 본체입니다.</div>';
    return h;
  });

  /* 업무보고 — v2 에서 뺐다. 옛 링크로 들어오면 이유를 보여 준다. */
  UI.route('report', function () {
    return head('업무보고', '') +
      '<div class="note q"><strong>v2 에서 뺐습니다.</strong> 추가 메모의 ' +
      '<em>"업무보고 탭 보류(개인 페이지로 만들어서) 복붙"</em> · <em>"일일보고는 어려울 수도 → 최대한 간편화"</em> 에 따른 ' +
      '사용자 결정(2026-09-30)입니다. v1 프로토타입의 업무보고 화면은 ' +
      '<code>prototype/</code> 와 <code>prototype/snapshots/002-b0-todo-report</code> 에 그대로 남아 있습니다.</div>';
  });

  /* ══ ACT — 덧붙이는 동작 ═══════════════════════════════════ */
  ACT.lostWhy = function (sid) {
    var s = DB.byId(DB.salesRows, sid);
    UI.modal('실주 사유', UI.area('사유', 'why', s.lostReason, 4), '저장', function (f) {
      s.lostReason = f.why; UI.refresh(); UI.toast('실주 사유를 남겼습니다');
    });
  };
  ACT.addFile = function (sid) {
    var s = DB.byId(DB.salesRows, sid);
    UI.modal('문서 올리기',
      UI.field('파일명', 'name', '') +
      '<div class="note">프로토타입이라 실제 업로드는 없습니다. 확인하려는 것은 ' +
      '<strong>어디에 붙는가</strong>(영업 건에 붙습니다) 하나입니다.</div>',
      '추가', function (f) {
        if (!f.name) { UI.toast('파일명을 적어 주세요'); return true; }
        s.files.unshift({ name: f.name, at: DB.today() });
        UI.refresh(); UI.toast('문서를 올렸습니다');
      });
  };
  ACT.addLog = function (sid) {
    var s = DB.byId(DB.salesRows, sid);
    UI.modal('진행사항 기록', UI.area('내용', 'text', '', 4), '기록', function (f) {
      if (!f.text) { UI.toast('내용을 적어 주세요'); return true; }
      s.log.unshift({ at: DB.today(), by: DB.ME, text: f.text });
      s.lastContactAt = DB.today();   /* 최종 컨택은 따로 입력하지 않는다 */
      UI.refresh(); UI.toast('기록했습니다 · 최종 컨택일도 갱신');
    });
  };
  ACT.profile = function (pid) {
    var p = DB.byId(DB.people, pid);
    UI.info('프로필 — ' + p.name,
      '<dl class="kv"><dt>이름</dt><dd>' + esc(p.name) + '</dd>' +
      '<dt>조직</dt><dd>' + esc(p.org) + '</dd>' +
      '<dt>가동 대상</dt><dd>' + (p.billable ? '예' : '아니오 · 범위 밖') + '</dd></dl>' +
      '<div class="note">[추가 메모] <em>"투입 인력 -> 프로필 가져오기 기능"</em>. ' +
      '무엇이 프로필에 들어가야 하는지(경력 · 보유 기술 · 등급 · 가용 시점)는 F1 에서 정합니다.</div>');
  };
  ACT.task = function (pid, idx) {
    var s = DB.openRow(DB.solutionOf(pid));
    var t = s.tasks[idx];
    UI.modal('태스크 — ' + t.name,
      UI.field('이름', 'name', t.name) +
      UI.field('비중 (%)', 'weight', t.weight, 'number') +
      UI.field('진행 (%)', 'progress', t.progress, 'number'),
      '저장', function (f) {
        t.name = f.name; t.weight = Number(f.weight); t.progress = Number(f.progress);
        s.progress = V2.taskProgress(s);
        UI.refresh(); UI.toast('태스크를 고쳤습니다');
      });
  };
  ACT.newTask = function (pid) {
    var s = DB.openRow(DB.solutionOf(pid));
    UI.modal('태스크 추가',
      UI.field('이름', 'name', '') +
      UI.field('비중 (%)', 'weight', 10, 'number') +
      '<div class="note">추가 메모: <em>"정해진 task 말고도 custom 영역도 많아서"</em> — ' +
      '요구사항 · 분석/설계 · 개발 외에는 custom 으로 표시됩니다.</div>',
      '추가', function (f) {
        if (!f.name) { UI.toast('이름을 적어 주세요'); return true; }
        var fixed = ['요구사항', '분석 · 설계', '개발'];
        s.tasks.push({ name: f.name, weight: Number(f.weight), progress: 0, custom: fixed.indexOf(f.name) < 0 });
        s.progress = V2.taskProgress(s);
        UI.refresh(); UI.toast('태스크를 더했습니다');
      });
  };
  ACT.editHandover = function (pid) {
    var s = DB.openRow(DB.solutionOf(pid));
    var ho = s.handover;
    UI.modal('인수인계서',
      UI.field('패키지 버전', 'packageVer', ho.packageVer) +
      UI.field('톰캣 버전', 'tomcatVer', ho.tomcatVer) +
      UI.field('SSL 여부', 'ssl', ho.ssl) +
      UI.field('변경 모듈', 'modules', ho.modules) +
      UI.area('인수인계 메모', 'note', ho.note, 4) +
      '<label class="chk"><input type="checkbox" name="checklist"' + (ho.checklist ? ' checked' : '') +
      '> 체크리스트를 확인했습니다</label>',
      '저장', function (f) {
        ho.packageVer = f.packageVer; ho.tomcatVer = f.tomcatVer; ho.ssl = f.ssl;
        ho.modules = f.modules; ho.note = f.note; ho.checklist = !!f.checklist;
        UI.refresh(); UI.toast('인수인계서를 저장했습니다');
      });
  };
  /* ── 이관: 요청(솔루션) → 수락 / 반려(CS) ─────────────────
     사용자 결정(2026-09-30, [5-A2]): 요청은 솔루션이 하고 CS 가 수락해야 넘어간다. */
  ACT.requestHandover = function (pid) {
    var s = DB.openRow(DB.solutionOf(pid));
    var miss = gateMissing(s);
    if (miss.length) {
      UI.info('요청할 수 없습니다',
        '<div class="gate"><b>아래를 다 적어야 이관을 요청할 수 있습니다.</b><ul><li>' +
        miss.map(esc).join('</li><li>') + '</li></ul></div>' +
        '<div class="note">[3-S7] <em>"이관시 필수 탭을 만들어서 못 적으면 이관 처리 못하게 하는게 좋을 것 같음"</em></div>');
      return;
    }
    if (V2.taskProgress(s) < 100) { UI.toast('진행률 100%부터 요청할 수 있습니다'); return; }
    s.handover.status = 'requested';
    s.handover.requestedAt = DB.today();
    s.handover.requestedBy = DB.ME;
    s.handover.rejectReason = '';
    s.handover.history.push({ at: DB.today(), by: DB.ME, action: '요청', reason: '' });
    UI.refresh();
    UI.toast('이관을 요청했습니다 · CS 가 수락하면 넘어갑니다');
  };

  ACT.reviewHandover = function (pid) {
    var p = DB.project(pid);
    var s = DB.openRow(DB.solutionOf(pid));
    UI.info('인수인계 — ' + p.name, gateBody(s));
  };

  ACT.acceptHandover = function (pid) {
    var s = DB.openRow(DB.solutionOf(pid));
    if (gateState(s) !== 'requested') { UI.toast('요청된 건이 아닙니다'); return; }
    s.handover.status = 'accepted';
    s.handover.doneAt = DB.today();
    s.handover.history.push({ at: DB.today(), by: DB.ME, action: '수락', reason: '' });
    ACT.toMaintenance(pid);   /* 계약 생성 모달 — 넘어가는 일은 여기서 일어난다 */
  };

  ACT.rejectHandover = function (pid) {
    var s = DB.openRow(DB.solutionOf(pid));
    if (gateState(s) !== 'requested') { UI.toast('요청된 건이 아닙니다'); return; }
    UI.modal('이관 반려',
      UI.area('사유 — 무엇이 모자란지', 'reason', '', 4) +
      '<div class="note">사유와 함께 솔루션의 대기 상태로 돌아갑니다. ' +
      '주고받은 기록은 이 프로젝트에 남습니다.</div>',
      '반려', function (f) {
        if (!f.reason) { UI.toast('사유를 적어 주세요'); return true; }
        s.handover.status = 'rejected';
        s.handover.rejectReason = f.reason;
        s.handover.requestedAt = null;
        s.handover.history.push({ at: DB.today(), by: DB.ME, action: '반려', reason: f.reason });
        UI.refresh();
        UI.toast('반려했습니다');
      });
  };
  ACT.closeIssue = function (id) {
    var i = DB.byId(DB.issues, id);
    i.status = '완료';
    i.closedAt = DB.today();       /* 완료일은 접수일과 따로 남긴다 */
    UI.refresh(); UI.toast('완료 처리했습니다 · ' + i.closedAt);
  };
  ACT.reopen = function (id) {
    var i = DB.byId(DB.issues, id);
    i.status = '처리중';
    i.closedAt = null;
    UI.refresh(); UI.toast('다시 열었습니다');
  };
  ACT.comment = function (id) {
    var i = DB.byId(DB.issues, id);
    UI.modal('댓글', UI.area('내용', 'text', '', 4), '등록', function (f) {
      if (!f.text) { return true; }
      i.comments.push({ by: DB.ME, at: DB.today(), text: f.text });
      UI.refresh();
    });
  };
  ACT.doneCheck = function (id) {
    var c = V2.toggleCheck(id, DB.today());
    UI.refresh(); UI.toast(c.done ? '점검 완료 · ' + c.done : '완료를 취소했습니다');
  };
  ACT.checkDoc = function (id) {
    var c = V2.byId(V2.checks, id);
    UI.modal('점검 문서', UI.field('파일명', 'doc', c.doc), '저장', function (f) {
      c.doc = f.doc; UI.refresh(); UI.toast('문서를 연결했습니다');
    });
  };
  ACT.newCheck = function () {
    UI.modal('점검 일정 추가',
      UI.select('계약', 'contractId', DB.contracts.map(function (c) { return { v: c.id, t: c.name }; }), DB.contracts[0].id) +
      UI.select('사이트', 'siteId', DB.sites.map(function (s) { return { v: s.id, t: s.name }; }), DB.sites[0].id) +
      UI.field('예정일', 'planned', DB.today(), 'date') +
      UI.select('방식', 'mode', ['원격', '방문'], '원격') +
      UI.select('담당', 'engineerId', UI.peopleOptions(true), ''),
      '추가', function (f) {
        V2.addCheck({ contractId: Number(f.contractId), siteId: Number(f.siteId), planned: f.planned,
          done: null, mode: f.mode, engineerId: f.engineerId ? Number(f.engineerId) : null, doc: '' });
        UI.refresh(); UI.toast('점검 일정을 더했습니다');
      });
  };
  ACT.checkMonth = function (n) {
    checkMonth = n === 0 ? DB.today() : V2.shiftMonth(checkMonth || DB.today(), n);
    UI.refresh();
  };
  ACT.todoMonth = function (n) {
    todoMonth = n === 0 ? DB.today() : V2.shiftMonth(todoMonth || DB.today(), n);
    UI.refresh();
  };
  /* 이슈 등록 — 템플릿이 미리 들어간다 */
  ACT.newIssue = function (scope) {
    var isSol = scope === 'SOLUTION';
    UI.modal('이슈 등록',
      UI.select('구분', 'type', ISSUE_TYPE, '문의') +
      UI.field('제목', 'title', '') +
      (isSol
        ? UI.select('프로젝트', 'projectId', DB.projects.map(function (p) { return { v: p.id, t: p.name }; }), DB.projects[0].id)
        : UI.select('사이트', 'siteId', DB.sites.map(function (s) { return { v: s.id, t: s.name }; }), DB.sites[0].id)) +
      UI.field('고객 담당자', 'customer', '') +
      UI.select('난이도', 'difficulty', ['상', '중', '하'], '중') +
      UI.select('담당자', 'assigneeId', UI.peopleOptions(true), '') +
      UI.area('내용', 'body', V2.ISSUE_TEMPLATE, 8) +
      '<div class="note">템플릿이 미리 들어갑니다 — [3-S7] <em>"이슈 생성 시 정해진 틀이 … ' +
      '문의 내용 원인 파악 작업내용 이런 틀을 적어놓으면 좋을 것 같다"</em></div>',
      '등록', function (f) {
        if (!f.title) { UI.toast('제목을 적어 주세요'); return true; }
        var max = 0;
        DB.issues.forEach(function (i) { max = Math.max(max, i.id); });
        DB.issues.push({
          id: max + 1, scope: scope,
          projectId: isSol ? Number(f.projectId) : null,
          siteId: isSol ? null : Number(f.siteId),
          type: f.type, title: f.title, status: '접수',
          assigneeId: f.assigneeId ? Number(f.assigneeId) : null,
          createdAt: DB.today(), closedAt: null, comments: [],
          customer: f.customer, difficulty: f.difficulty, rating: 3, body: f.body, files: []
        });
        UI.refresh(); UI.toast('이슈를 등록했습니다');
      });
  };
})(window);
