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

  /* TODO — 개인페이지의 첫 화면. 사람이 직접 쓰는 "할 일"이고, 주간 캘린더에 올라간다.
     업무보고는 저장된 보고서가 아니라 이 행들을 날짜·사람으로 모은 파생이다.

     **날짜는 목록이다**(사용자 결정 2026-09-23). 못 끝낸 일을 다른 날로 "가져오면"
     새 행을 만들지 않고 그 날짜를 이 행의 목록에 더한다 — 같은 할 일이 두 날에 놓인다.
     그래서 ① 어제 칸에서 그 줄이 사라지지 않고(이전의 '날짜 바꾸기'는 사라지게 했다),
     ② 상태는 하나뿐이라 오늘 완료하면 어제 칸의 그 카드도 완료로 보인다.
     ②는 아직 정하지 않은 결과다 — "어제 못 끝냈다"를 남기려면 보고를 제출 시점에 얼려야 한다.
     dates 가 빈 배열이면 "날짜 없음"(아직 어느 날에 할지 안 정한 것)이다.

     시드 날짜를 상수로 박지 않고 오늘 기준으로 만든다 — 박아 두면 며칠 뒤 열었을 때
     캘린더와 업무보고가 빈 화면이 되고, 그러면 두 화면이 아무것도 검증하지 못한다. */
  function shiftDay(d, n) {
    var t = new Date(d);
    t.setDate(t.getDate() + n);
    return t.toISOString().slice(0, 10);
  }
  function weekStartOf(d) {           /* 그 주의 월요일 */
    var t = new Date(d);
    return shiftDay(d, -((t.getDay() + 6) % 7));
  }
  var T0 = new Date().toISOString().slice(0, 10);
  var T1 = shiftDay(T0, -1);
  var T2 = shiftDay(T0, 1);

  var todos = [
    { id: 701, personId: 2, dates: [T1], title: '하위필드 하이라이트 처리', status: '완료', projectId: 105, note: '' },
    { id: 702, personId: 2, dates: [T1], title: '검색API · 연관검색API 통합', status: '진행', projectId: 105, note: '어제 못 끝냄 — 넘길지는 내가 정한다' },
    { id: 703, personId: 2, dates: [T0], title: '색인 설정 검토', status: '완료', projectId: 104, note: '' },
    { id: 704, personId: 2, dates: [T1, T0], title: '스케줄 설정', status: '진행', projectId: 104, note: '어제 못 끝내고 오늘로 가져온 건 — 같은 행이 두 날에 놓인다' },
    { id: 705, personId: 2, dates: [T0], title: '증분 설정', status: '시작 전', projectId: 104, note: '' },
    { id: 706, personId: 2, dates: [T2], title: '게시판 규정 컬럼 설정', status: '시작 전', projectId: 106, note: '' },
    { id: 707, personId: 2, dates: [], title: '검색 사전 정리 방안 조사', status: '시작 전', projectId: 105, note: '언제 할지 미정' },
    { id: 708, personId: 2, dates: [], title: '9월 투입 M/M 정산 확인', status: '시작 전', projectId: null, note: '' },
    { id: 709, personId: 1, dates: [T0], title: '거래소 상장공시 단위테스트 리뷰', status: '진행', projectId: 104, note: '' },
    { id: 710, personId: 1, dates: [T0], title: '주간 회의 자료', status: '완료', projectId: null, note: '' },
    { id: 711, personId: 3, dates: [T0], title: 'KICS-AI 착수 환경 세팅', status: '진행', projectId: 106, note: '방화벽 신청 대기' },
    { id: 712, personId: 5, dates: [T0], title: '전력거래소 색인 지연 경과 확인', status: '진행', projectId: null, note: '이슈 603' },
    { id: 713, personId: 4, dates: [T1], title: '거래소 본사 로그 보관 정책 회신', status: '시작 전', projectId: null, note: '' }
  ];

  /* 휴가 — 나중에 팀즈 휴가 정보를 연동해 채울 자리다(사용자 방향, 2026-09-22).
     지금은 목업 1건이고 화면은 "그 날은 휴가"라고만 표시한다. 연동도, "자동 처리"도 만들지 않았다 —
     자동 처리가 ① 그 날 TODO를 안 만드는 것인지 ② 있는 것을 완료로 치는 것인지
     ③ 다음 근무일로 넘기는 것인지가 안 정해졌고, 그건 이 화면이 아니라 그 단위가 답할 것이다. */
  var leaves = [
    { personId: 2, date: shiftDay(T0, 2), type: '연차' }
  ];
  function leaveOf(personId, date) {
    for (var i = 0; i < leaves.length; i++) {
      if (leaves[i].personId === Number(personId) && leaves[i].date === date) { return leaves[i]; }
    }
    return null;
  }

  /* 공휴일 — 휴가(개인)와 다르다. 전원에게 같은 날이고, 실제 달력이라
     시드를 오늘 기준으로 만들 수 없다(날짜를 박는다). 목업이고 2026년분 일부만 넣었다.

     대체공휴일 규칙(관공서의 공휴일에 관한 규정 제3조) — 손으로 넣으면 여기서 틀린다:
       · 설날 · 추석 연휴는 **일요일**과 겹칠 때만 대체공휴일이 붙는다(토요일은 해당 없음)
       · 삼일절 · 어린이날 · 부처님오신날 · 광복절 · 개천절 · 한글날 · 성탄절은 토 · 일 어느 쪽과 겹쳐도 붙는다
       · 현충일 · 신정은 대체공휴일 대상이 아니다
     2026 추석 연휴는 목 · 금 · 토(9/24~26)라 일요일과 겹치지 않는다 → 9/28(월)은 평일이다.
     처음 시드에 9/28을 대체공휴일로 박았고, 사용자가 화면을 보고 잡아냈다(2026-09-22).
     반대로 개천절 10/3은 토요일이라 10/5(월)이 대체공휴일이다.

     이 실수가 원천 질문의 근거다 — 사람이 해마다 손으로 넣으면 이렇게 틀리고, 틀린 줄 화면에
     그럴듯하게 남는다. 외부(공공 API)에서 받아 오는 쪽이 낫고, 받아 오면 우리 쪽에 복제하지
     않는 편이 낫다(원본 이중화 금지). 관리자페이지에서 등록한다면 규칙 검증이 같이 필요하다. */
  var holidays = [
    { date: '2026-09-24', name: '추석 연휴' },
    { date: '2026-09-25', name: '추석' },
    { date: '2026-09-26', name: '추석 연휴' },
    { date: '2026-10-03', name: '개천절' },
    { date: '2026-10-05', name: '대체공휴일', note: '개천절(토)' },
    { date: '2026-10-09', name: '한글날' },
    { date: '2026-12-25', name: '크리스마스' },
    { date: '2027-01-01', name: '신정' }
  ];
  function holidayOf(date) {
    for (var i = 0; i < holidays.length; i++) {
      if (holidays[i].date === date) { return holidays[i]; }
    }
    return null;
  }
  function holidaysIn(from, to) {
    return holidays.filter(function (x) { return x.date >= from && x.date <= to; });
  }

  /* 비고 — 사용자 보고 양식(2026-09-22)에서 **유일하게 파생되지 않는 칸**이다.
     실적·계획·이슈·프로젝트는 TODO·이슈·투입 인력에서 만들어 낼 수 있지만, 비고는 나오지 않는다
     ("KT 믿음 파인 튜닝 시간 #A6000 36:04:49" 같은 문장). 그래서 누군가 직접 쓰고, 저장 대상이 하나 는다.
     key 는 일간이면 날짜, 주간이면 그 주의 월요일이다 — 둘을 한 곳에 둔 것도 확정이 아니다. */
  var remarks = [
    { personId: 2, key: weekStartOf(T0), text: 'KT 믿음 파인 튜닝 시간\n#A6000 36:04:49 · #5090 28:08:20' },
    { personId: 1, key: weekStartOf(T0), text: '연구과제 일정\n- 10월 VLM 파인 튜닝\n- 11월 RAG 검색 시스템 구축' },
    { personId: 5, key: T0, text: '전력거래소 야간 배치 재확인 필요' }
  ];
  function remarkOf(personId, key) {
    for (var i = 0; i < remarks.length; i++) {
      if (remarks[i].personId === Number(personId) && remarks[i].key === key) { return remarks[i]; }
    }
    return null;
  }
  function setRemark(personId, key, text) {
    var r = remarkOf(personId, key);
    if (r) { r.text = text; return r; }
    r = { personId: Number(personId), key: key, text: text };
    remarks.push(r);
    return r;
  }

  /* 주간 계획 — 사람이 직접 쓴다(사용자 결정 2026-09-23, 앞선 "차주 계획 = 다음 주 TODO"를 뒤집음).
     한 행의 열쇠는 사람 + **그 주의 월요일** 하나뿐이다. 그래서 이동 로직이 없다 —
     이번 주에 '차주 계획'으로 쓴 글은 다음 주가 되면 같은 행이 '이번주 계획'으로 읽힌다.
     옮기는 것이 아니라 부르는 이름이 달라질 뿐이다(이관 내역을 파생시킨 것과 같은 판단).
     TODO 와는 연결되지 않는다 — 계획은 보고 문장이고 TODO 는 그날의 할 일이다. */
  var plans = [
    { personId: 2, week: weekStartOf(T0), text: '1. 우리은행 검수 마무리\n  - 지적사항 3건 회신 · 재검수 일정 협의\n2. 거래소 상장공시 PDF 변환 오류 원인 정리' },
    { personId: 2, week: shiftDay(weekStartOf(T0), 7), text: '1. 컨슈머 인사이트 LLM 학습 관리 기능 통합 테스트\n2. 토큰 사용 모니터링 화면 설계' },
    { personId: 1, week: weekStartOf(T0), text: '1. 거래소 차세대 상장공시 단위테스트 리뷰\n2. 9월 투입 M/M 정산' }
  ];
  function planOf(personId, week) {
    for (var i = 0; i < plans.length; i++) {
      if (plans[i].personId === Number(personId) && plans[i].week === week) { return plans[i]; }
    }
    return null;
  }
  function setPlan(personId, week, text) {
    var p = planOf(personId, week);
    if (p) { p.text = text; return p; }
    p = { personId: Number(personId), week: week, text: text };
    plans.push(p);
    return p;
  }

  seq.project = maxId(projects);
  seq.sales = maxId(salesRows);
  seq.solution = maxId(solutionRows);
  seq.contract = maxId(contracts);
  seq.site = maxId(sites);
  seq.issue = maxId(issues);
  seq.todo = maxId(todos);

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

  /* TODO 조회 — 업무보고는 이 조회들의 조합일 뿐이다(보고서를 따로 저장하지 않는다).
     날짜가 목록이므로 "그 날에 놓여 있는가"를 묻는다. 기간 조회는 행 단위로 한 번만 준다 —
     여러 날에 걸친 할 일이 주간 실적에 세 번 찍히면 안 된다. */
  function onDate(t, date) { return t.dates.indexOf(date) >= 0; }
  function inRange(t, from, to) {
    return t.dates.some(function (d) { return d >= from && d <= to; });
  }
  function lastDate(t) { return t.dates.length ? t.dates[t.dates.length - 1] : null; }
  /* 연속 묶음 — 캘린더가 이어 그릴 수 있는 것은 **붙어 있는 날**뿐이다.
     days 는 그 주에 보이는 날(월~금)이고, 돌려주는 것은 [시작칸, 끝칸] 목록이다.
     월 · 수처럼 하루 건너뛰면 두 도막이 되고, 주가 갈리면 각 주에서 따로 잡힌다. */
  function dateRuns(t, days) {
    var runs = [], cur = null;
    days.forEach(function (d, i) {
      if (t.dates.indexOf(d) < 0) { return; }
      if (cur && cur[1] === i - 1) { cur[1] = i; return; }
      cur = [i, i];
      runs.push(cur);
    });
    return runs;
  }

  function todosOf(personId, date) {
    return todos.filter(function (t) { return t.personId === Number(personId) && onDate(t, date); });
  }
  function todosOn(date) { return todos.filter(function (t) { return onDate(t, date); }); }
  /* 지난 미완료 — 마지막으로 놓인 날이 기준 날짜보다 앞이고 아직 안 끝난 것.
     이미 그 날에 놓여 있으면(가져온 뒤라면) 대상이 아니다. */
  function todosLeftBefore(personId, date) {
    return todos.filter(function (t) {
      return t.personId === Number(personId) && t.status !== '완료' &&
        t.dates.length && lastDate(t) < date;
    });
  }
  function todosBetween(personId, from, to) {
    return todos.filter(function (t) { return t.personId === Number(personId) && inRange(t, from, to); });
  }
  /* 프로젝트 기준 조회 — 프로젝트 상세의 TODO 캘린더가 쓴다. 사람을 가리지 않는다:
     그 프로젝트에 누가 무엇을 하고 있는지가 그 화면의 질문이기 때문이다. */
  function todosOfProject(projectId) {
    return todos.filter(function (t) { return t.projectId === Number(projectId); });
  }
  function todosOfProjectOn(projectId, date) {
    return todos.filter(function (t) { return t.projectId === Number(projectId) && onDate(t, date); });
  }
  function todosOfProjectBetween(projectId, from, to) {
    return todos.filter(function (t) { return t.projectId === Number(projectId) && inRange(t, from, to); });
  }
  function todosNoDate(personId) {
    return todos.filter(function (t) { return t.personId === Number(personId) && !t.dates.length; });
  }

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

  /* TODO 변경 — 사람이 직접 쓰는 기록이라 수정·삭제를 연다(append-only인지는 F7과 같이 정한다).
     못 끝낸 일을 다른 날로 옮기는 방법은 셋이었다: ① 날짜를 바꾼다(어제 줄이 사라진다)
     ② 새 행을 만든다(상태가 둘이 되어 어느 것이 그 할 일인지 말할 수 없다)
     ③ 같은 행을 그 날에도 놓는다. 사용자 결정(2026-09-23)은 ③이고, placeTodo 가 그것이다. */
  function createTodo(f) {
    var t = { id: nextId('todo'), personId: Number(f.personId || ME), dates: f.date ? [f.date] : [],
      title: f.title, status: f.status || '시작 전',
      projectId: f.projectId ? Number(f.projectId) : null, note: f.note || '' };
    todos.push(t);
    return t;
  }
  function updateTodo(id, f) {
    var t = byId(todos, id);
    t.title = f.title;
    t.status = f.status;
    t.projectId = f.projectId ? Number(f.projectId) : null;
    t.note = f.note || '';
    if (f.date) { placeTodo(id, f.date); }     /* 날짜 칸은 "더 놓기"다 — 기존 날짜를 지우지 않는다 */
    return t;
  }
  function setTodoStatus(id, s) { var t = byId(todos, id); t.status = s; return t; }

  /* 가져오기 — 같은 행을 그 날에도 놓는다. 새 행을 만들지 않는 것이 요점이다(사용자 결정 2026-09-23):
     새로 만들면 어제 줄과 오늘 줄의 상태가 따로 놀고, 둘 중 어느 것이 그 할 일인지 말할 수 없게 된다. */
  function placeTodo(id, date) {
    var t = byId(todos, id);
    if (!date || t.dates.indexOf(date) >= 0) { return t; }
    t.dates.push(date);
    t.dates.sort();
    return t;
  }
  function unplaceTodo(id, date) {
    var t = byId(todos, id);
    var i = t.dates.indexOf(date);
    if (i >= 0) { t.dates.splice(i, 1); }       /* 다 빼면 "날짜 없음"으로 돌아간다 */
    return t;
  }
  function deleteTodo(id) {
    for (var k = 0; k < todos.length; k++) {
      if (todos[k].id === Number(id)) { todos.splice(k, 1); return true; }
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
    createIssue: createIssue, updateIssue: updateIssue, deleteIssue: deleteIssue,
    todos: todos, todosOf: todosOf, todosOn: todosOn, todosLeftBefore: todosLeftBefore,
    todosBetween: todosBetween, todosNoDate: todosNoDate, shiftDay: shiftDay, weekStartOf: weekStartOf,
    todosOfProject: todosOfProject, todosOfProjectOn: todosOfProjectOn, todosOfProjectBetween: todosOfProjectBetween,
    leaves: leaves, leaveOf: leaveOf, remarks: remarks, remarkOf: remarkOf, setRemark: setRemark,
    holidays: holidays, holidayOf: holidayOf, holidaysIn: holidaysIn,
    plans: plans, planOf: planOf, setPlan: setPlan,
    createTodo: createTodo, updateTodo: updateTodo, setTodoStatus: setTodoStatus,
    placeTodo: placeTodo, unplaceTodo: unplaceTodo, onDate: onDate, lastDate: lastDate, dateRuns: dateRuns, deleteTodo: deleteTodo
  };
})(window);
