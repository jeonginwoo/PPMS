/* 목업 데이터 + 상태 저장소. 백엔드 없음 — 새로고침하면 시드로 돌아간다.
   표본(고객사·프로젝트명·솔루션·M/M)은 pms_mcp_v3 reference/seed에서 참조만 했다. */
(function (g) {
  'use strict';

  /* 채번은 시드의 최대 id 위에서 시작한다. 고정 시작값을 쓰면 새로 만든 행이 시드 행과
     같은 id를 받아, 이관이 엉뚱한 프로젝트를 바꾼다(로직 테스트에서 실측). */
  var seq = {};
  function nextId(kind) { seq[kind] += 1; return seq[kind]; }
  function maxId(list) {
    return list.reduce(function (m, r) { return r.id > m ? r.id : m; }, 0);
  }

  /* 인원 · 조직
     billable=false 는 가동률 모집단 밖. 연구소·마케팅은 사용자 결정으로 범위 밖이다. */
  var people = [
    { id: 1, name: '김영삼', org: 'AX솔루션개발1팀', grade: '수석', billable: true },
    { id: 2, name: '박지훈', org: 'AX솔루션개발1팀', grade: '책임', billable: true },
    { id: 3, name: '이서연', org: 'AX솔루션개발2팀', grade: '선임', billable: true },
    { id: 4, name: '최민호', org: 'CS사업팀', grade: '책임', billable: true },
    { id: 5, name: '정하늘', org: 'CS사업팀', grade: '선임', billable: true },
    { id: 6, name: '한도윤', org: 'AX영업팀', grade: '수석', billable: true },
    { id: 7, name: '오세진', org: 'AI기술연구소', grade: '책임', billable: false },
    { id: 8, name: '윤가은', org: '마케팅팀', grade: '선임', billable: false }
  ];
  var ME = 2; // 화면의 "나" — 홈 대시보드 기본값이 이 사람 기준이다

  /* 공통 프로젝트
     한 프로젝트는 이 행 하나를 평생 유지한다. phase 는 "지금 어느 영역에 있는가". */
  var projects = [
    { id: 101, client: '현대차증권', name: '현대차증권 미국주식 주간 거래 구축', solution: '검색엔진(API)', managerId: 6, phase: 'SALES' },
    { id: 102, client: '케이엘큐브', name: '삼성화재 AI-지식관리시스템 구축', solution: '검색엔진', managerId: 6, phase: 'SALES' },
    { id: 103, client: '인젠트', name: '한솔그룹 문서중앙화 구축', solution: '검색엔진', managerId: 6, phase: 'SALES' },
    { id: 104, client: '코오롱베니트', name: '한국거래소 차세대 상장공시시스템 구축', solution: '문서뷰어/추출', managerId: 1, phase: 'SOLUTION' },
    { id: 105, client: '(주)사이버다임', name: '우리은행 문서중앙화 구축', solution: '검색엔진(API)', managerId: 2, phase: 'SOLUTION' },
    { id: 106, client: 'LG CNS', name: '경찰청 경찰 수사지원AI(KICS-AI) 고도화', solution: 'AI 검색', managerId: 3, phase: 'SOLUTION' },
    { id: 107, client: '뱅크웨어글로벌', name: '한국거래소 경영정보시스템 구축', solution: '검색엔진(API)', managerId: 1, phase: 'MAINTENANCE' }
  ];

  /* 영역별 행
     이관해도 이전 영역의 행은 남는다(1:N). closedAt 이 찍히면 "지나간 영역". */
  var salesRows = [
    { id: 201, projectId: 101, stage: '견적', expectedAmount: 42000000, expectedStart: '2026-09-01', ownerId: 6, memo: '경쟁 2사. 단가 조정 요청 들어옴', openedAt: '2026-06-12', closedAt: null },
    { id: 202, projectId: 102, stage: '제안', expectedAmount: 15000000, expectedStart: '2026-10-29', ownerId: 6, memo: '', openedAt: '2026-07-02', closedAt: null },
    { id: 203, projectId: 103, stage: '리드', expectedAmount: 0, expectedStart: '', ownerId: 6, memo: '담당자 소개 단계 — 금액 미정', openedAt: '2026-08-20', closedAt: null },
    { id: 204, projectId: 104, stage: '수주', expectedAmount: 96000000, expectedStart: '2026-04-01', ownerId: 6, memo: '', openedAt: '2026-01-10', closedAt: '2026-03-28' },
    { id: 205, projectId: 105, stage: '수주', expectedAmount: 38000000, expectedStart: '2026-02-01', ownerId: 6, memo: '', openedAt: '2025-11-04', closedAt: '2026-01-26' },
    { id: 206, projectId: 107, stage: '수주', expectedAmount: 120000000, expectedStart: '2025-10-13', ownerId: 6, memo: '', openedAt: '2025-07-18', closedAt: '2025-09-30' }
  ];

  var solutionRows = [
    { id: 301, projectId: 104, status: '진행', contractMm: 5, startDate: '2026-04-01', endDate: '2026-12-31', progress: 55, openedAt: '2026-03-28', closedAt: null,
      assignments: [ { personId: 1, role: 'PM', monthlyMm: 0.5 }, { personId: 2, role: '참여자', monthlyMm: 1 } ] },
    { id: 302, projectId: 105, status: '검수', contractMm: 2, startDate: '2026-02-01', endDate: '2026-09-30', progress: 95, openedAt: '2026-01-26', closedAt: null,
      assignments: [ { personId: 2, role: 'PM', monthlyMm: 0.7 } ] },
    { id: 303, projectId: 106, status: '진행 전', contractMm: 4, startDate: '2026-07-01', endDate: '2026-12-31', progress: 5, openedAt: '2026-06-20', closedAt: null,
      assignments: [ { personId: 3, role: 'PM', monthlyMm: 1 }, { personId: 7, role: '참여자', monthlyMm: 0.3 } ] },
    { id: 304, projectId: 107, status: '완료', contractMm: 6, startDate: '2025-10-13', endDate: '2026-09-15', progress: 100, openedAt: '2025-09-30', closedAt: '2026-09-15',
      assignments: [ { personId: 1, role: 'PM', monthlyMm: 0.5 } ] }
  ];

  /* 유지보수: 계약이 원천
     sourceProjectId 가 null 이면 이관 없이 직접 등록한 계약이다. */
  var contracts = [
    { id: 401, sourceProjectId: 107, client: '뱅크웨어글로벌', name: '한국거래소 경영정보시스템 유지보수', status: '신규',
      startDate: '2026-09-16', endDate: '2027-09-15', amount: 24000000, salesOwnerId: 6, note: '이관 생성 — 기간 1년 고정' },
    { id: 402, sourceProjectId: null, client: '가온아이', name: '가온아이 검색엔진 OEM 유지보수', status: '유지',
      startDate: '2026-01-01', endDate: '2026-12-31', amount: 54000000, salesOwnerId: 6, note: '다중 사이트 계약' },
    { id: 403, sourceProjectId: null, client: '한국네트웍스', name: '한국타이어 TRAMA 유지보수', status: '종료',
      startDate: '2025-01-01', endDate: '2025-12-31', amount: 9000000, salesOwnerId: 6, note: '' }
  ];

  var sites = [
    { id: 501, contractId: 401, name: '한국거래소 본사', channel: 'ENT', serverSpec: 'RHEL 8 / 16C 64G x2', engineerId: 4 },
    { id: 502, contractId: 402, name: '전력거래소', channel: 'OEM', serverSpec: 'Rocky 9 / 8C 32G', engineerId: 5 },
    { id: 503, contractId: 402, name: '경보제약', channel: 'OEM', serverSpec: 'Rocky 9 / 4C 16G', engineerId: 5 },
    { id: 504, contractId: 402, name: '동아사이언스', channel: 'OEM', serverSpec: 'Ubuntu 22 / 4C 16G', engineerId: null },
    { id: 505, contractId: 403, name: '한국타이어', channel: 'ENT', serverSpec: 'RHEL 7 / 8C 32G', engineerId: null }
  ];

  /* 이슈: 솔루션 이슈는 프로젝트에, 유지보수 이슈는 사이트에 붙는다 */
  var issues = [
    { id: 601, scope: 'SOLUTION', projectId: 104, siteId: null, type: '요청', title: '공시 첨부파일 PDF 변환 실패 건', status: '처리중', assigneeId: 2, createdAt: '2026-08-21',
      comments: [ { by: 2, at: '2026-08-22', text: '변환 큐 재기동 후 재현 확인 중' } ] },
    { id: 602, scope: 'SOLUTION', projectId: 106, siteId: null, type: '문의', title: '수사지원 AI 응답 길이 제한 문의', status: '접수', assigneeId: null, createdAt: '2026-09-02', comments: [] },
    { id: 603, scope: 'MAINTENANCE', projectId: null, siteId: 502, type: '장애', title: '색인 지연 — 야간 배치 미완료', status: '고객확인대기', assigneeId: 5, createdAt: '2026-09-10',
      comments: [ { by: 5, at: '2026-09-10', text: '디스크 IO 병목. 임시로 배치 분할 적용' } ] },
    { id: 604, scope: 'MAINTENANCE', projectId: null, siteId: 503, type: '요청', title: '검색 사전 추가 반영 요청', status: '완료', assigneeId: 5, createdAt: '2026-08-05',
      comments: [ { by: 5, at: '2026-08-06', text: '사전 반영 후 재색인 완료' } ] },
    { id: 605, scope: 'MAINTENANCE', projectId: null, siteId: 501, type: '문의', title: '로그 보관 주기 문의', status: '접수', assigneeId: 4, createdAt: '2026-09-15', comments: [] }
  ];

  seq.project = maxId(projects);
  seq.sales = maxId(salesRows);
  seq.solution = maxId(solutionRows);
  seq.contract = maxId(contracts);
  seq.site = maxId(sites);
  seq.issue = maxId(issues);

  /* 조회 헬퍼 */
  function byId(list, id) {
    for (var i = 0; i < list.length; i++) { if (list[i].id === Number(id)) { return list[i]; } }
    return null;
  }
  function personName(id) { var p = byId(people, id); return p ? p.name : '미배정'; }
  function project(id) { return byId(projects, id); }
  function salesOf(pid) { return salesRows.filter(function (r) { return r.projectId === Number(pid); }); }
  function solutionOf(pid) { return solutionRows.filter(function (r) { return r.projectId === Number(pid); }); }
  function contractOfProject(pid) { return contracts.filter(function (c) { return c.sourceProjectId === Number(pid); }); }
  function sitesOf(cid) { return sites.filter(function (s) { return s.contractId === Number(cid); }); }
  function openRow(rows) {
    for (var i = 0; i < rows.length; i++) { if (!rows[i].closedAt) { return rows[i]; } }
    return rows[rows.length - 1] || null;
  }
  function today() { return new Date().toISOString().slice(0, 10); }
  function plusYear(d) {
    if (!d) { return ''; }
    var t = new Date(d);
    t.setFullYear(t.getFullYear() + 1);
    t.setDate(t.getDate() - 1);
    return t.toISOString().slice(0, 10);
  }
  function won(n) { return !n ? '-' : (n / 10000).toLocaleString('ko-KR') + '만'; }

  /* 변경 */
  function createSalesProject(f) {
    var p = { id: nextId('project'), client: f.client, name: f.name, solution: f.solution, managerId: Number(f.ownerId), phase: 'SALES' };
    projects.push(p);
    salesRows.push({ id: nextId('sales'), projectId: p.id, stage: f.stage, expectedAmount: Number(f.expectedAmount || 0),
      expectedStart: f.expectedStart, ownerId: Number(f.ownerId), memo: f.memo || '', openedAt: today(), closedAt: null });
    return p;
  }

  /* 이관 = 명시적 행위. 이전 영역의 행을 닫고 다음 영역의 행을 "추가"한다(1:N 이력). */
  function transferToSolution(pid, f) {
    var p = project(pid);
    var row = openRow(salesOf(pid));
    if (row) { row.stage = '수주'; row.closedAt = today(); }
    solutionRows.push({ id: nextId('solution'), projectId: p.id, status: '진행 전', contractMm: Number(f.contractMm || 0),
      startDate: f.startDate, endDate: f.endDate, progress: 0, openedAt: today(), closedAt: null, assignments: [] });
    p.phase = 'SOLUTION';
    if (f.managerId) { p.managerId = Number(f.managerId); }
    return p;
  }

  function transferToMaintenance(pid, f) {
    var p = project(pid);
    var row = openRow(solutionOf(pid));
    if (row) { row.status = '완료'; row.progress = 100; row.closedAt = today(); }
    var c = { id: nextId('contract'), sourceProjectId: p.id, client: p.client, name: p.name + ' 유지보수', status: '신규',
      startDate: f.startDate, endDate: plusYear(f.startDate), amount: Number(f.amount || 0),
      salesOwnerId: Number(f.salesOwnerId || 6), note: '이관 생성 — 기간 1년 고정' };
    contracts.push(c);
    sites.push({ id: nextId('site'), contractId: c.id, name: f.siteName || p.client, channel: 'ENT',
      serverSpec: f.serverSpec || '', engineerId: f.engineerId ? Number(f.engineerId) : null });
    p.phase = 'MAINTENANCE';
    return c;
  }

  function createContract(f) {
    var c = { id: nextId('contract'), sourceProjectId: null, client: f.client, name: f.name, status: f.status,
      startDate: f.startDate, endDate: f.endDate, amount: Number(f.amount || 0),
      salesOwnerId: Number(f.salesOwnerId || 6), note: f.note || '' };
    contracts.push(c);
    sites.push({ id: nextId('site'), contractId: c.id, name: f.siteName || f.client, channel: f.channel || 'ENT',
      serverSpec: f.serverSpec || '', engineerId: f.engineerId ? Number(f.engineerId) : null });
    return c;
  }

  function updateContract(id, f) {
    var c = byId(contracts, id);
    c.name = f.name;
    c.status = f.status;
    c.startDate = f.startDate;
    c.endDate = f.endDate;
    c.amount = Number(f.amount || 0);
    c.salesOwnerId = Number(f.salesOwnerId || 6);
    c.note = f.note || '';
    return c;
  }

  function assign(pid, f) {
    var row = openRow(solutionOf(pid));
    row.assignments.push({ personId: Number(f.personId), role: f.role, monthlyMm: Number(f.monthlyMm || 0) });
    return row;
  }
  function unassign(pid, idx) { openRow(solutionOf(pid)).assignments.splice(idx, 1); }
  function setProgress(pid, v) {
    var row = openRow(solutionOf(pid));
    row.progress = Math.max(0, Math.min(100, Number(v)));
    return row;
  }
  function setSolutionStatus(pid, s) { openRow(solutionOf(pid)).status = s; }

  function createIssue(f) {
    var i = { id: nextId('issue'), scope: f.scope, projectId: f.projectId ? Number(f.projectId) : null,
      siteId: f.siteId ? Number(f.siteId) : null, type: f.type, title: f.title, status: '접수',
      assigneeId: f.assigneeId ? Number(f.assigneeId) : null, createdAt: today(), comments: [] };
    issues.push(i);
    return i;
  }
  function updateIssue(id, f) {
    var i = byId(issues, id);
    i.type = f.type;
    i.title = f.title;
    i.status = f.status;
    i.assigneeId = f.assigneeId ? Number(f.assigneeId) : null;
    if (f.comment) { i.comments.push({ by: ME, at: today(), text: f.comment }); }
    return i;
  }
  function deleteIssue(id) {
    for (var k = 0; k < issues.length; k++) {
      if (issues[k].id === Number(id)) { issues.splice(k, 1); return true; }
    }
    return false;
  }

  g.DB = {
    ME: ME, people: people, projects: projects, salesRows: salesRows, solutionRows: solutionRows,
    contracts: contracts, sites: sites, issues: issues,
    byId: byId, personName: personName, project: project, salesOf: salesOf, solutionOf: solutionOf,
    contractOfProject: contractOfProject, sitesOf: sitesOf, openRow: openRow,
    today: today, plusYear: plusYear, won: won,
    createSalesProject: createSalesProject, transferToSolution: transferToSolution,
    transferToMaintenance: transferToMaintenance, createContract: createContract, updateContract: updateContract,
    assign: assign, unassign: unassign, setProgress: setProgress, setSolutionStatus: setSolutionStatus,
    createIssue: createIssue, updateIssue: updateIssue, deleteIssue: deleteIssue
  };
})(window);
