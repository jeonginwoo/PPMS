/* data-v2.js — 2026-09-30 인터뷰로 늘어난 관리 항목.

   data.js 는 v1 그대로 두고 여기서 덧붙인다. 무엇이 인터뷰 때문에 생긴 항목인지
   파일 경계로 드러내려는 것이다 — 섞어 쓰면 다음 사이클에서 구분할 수 없다.
   각 블록 머리에 근거가 된 인터뷰 항목 번호를 적어 둔다. */
(function (g) {
  'use strict';
  var DB = g.DB;

  function byId(list, id) {
    for (var i = 0; i < list.length; i++) { if (list[i].id === Number(id)) { return list[i]; } }
    return null;
  }

  /* ── 공통: 고객사 / 발주처(계약사) 분리 ─────────────────────
     [4-A1 영업] "고객사와 발주처 이렇게 구분하기"
     [4-A1 CS]   "고객사 유지보수 계약사 두가지 다 들고오기"
     projects[].client 는 v1 에서 한 칸이었다. v2 는 endClient(실사용 고객사) 와
     orderer(계약·발주처)로 나눈다. 목록의 기존 client 는 endClient 로 읽는다. */
  var ORDERERS = {
    101: '현대차증권', 102: '삼성화재', 103: '한솔그룹',
    104: '한국거래소', 105: '우리은행', 106: '경찰청', 107: '한국거래소'
  };

  /* 프로젝트 유형 — 매출이 없는 건까지 담는다.
     [추가 메모] "매출x 프로젝트 — 용역 / 마케팅 / 연구소", "내부, 외부", "PoC" */
  var PROJECT_TYPES = ['솔루션', '용역', '마케팅', '연구소', 'PoC'];
  var TYPE_SEED = { 101: '솔루션', 102: '솔루션', 103: '솔루션', 104: '솔루션', 105: '솔루션', 106: '솔루션', 107: '솔루션' };

  DB.projects.forEach(function (p) {
    p.endClient = p.client;                /* 실제 쓰는 곳 */
    p.orderer = ORDERERS[p.id] || p.client; /* 계약하는 곳 */
    p.type = TYPE_SEED[p.id] || '솔루션';
    p.internal = false;
    /* [추가 메모] "솔루션: 제품 명, 수량" · [4-A4] "한 프로젝트에 솔루션 여러개 선택, 코어 두개" */
    p.products = [{ name: p.solution, unit: 'core', qty: 2 }];
  });
  /* 매출이 없는 프로젝트도 같은 목록에 산다는 것을 화면이 보여야 한다 */
  DB.projects.push(
    { id: 108, client: '(사내)', endClient: '(사내)', orderer: '(사내)', name: '검색엔진 성능 개선 연구', solution: '검색엔진',
      managerId: 3, phase: 'SOLUTION', type: '연구소', internal: true, products: [] },
    { id: 109, client: '한국전력', endClient: '한국전력', orderer: '한국전력', name: '문서추출 PoC', solution: '문서뷰어/추출',
      managerId: 6, phase: 'SALES', type: 'PoC', internal: false, products: [{ name: '문서뷰어/추출', unit: 'copy', qty: 1 }] }
  );

  /* ── 영업 ───────────────────────────────────────────────
     [4-B7] 프로미노트 · 첨부문서 · 견적서 · 고객 연락처 · 최종 컨택 일시 ·
            진행사항 로그 · 선금/잔금/검수확인 · 초중고급 M/M
     [추가 메모] 단위(core, copy) · 중도금 · 금액 변동 히스토리 · 실주 */
  var SALES_V2 = {
    201: { lastContactAt: '2026-09-25', grade: { senior: 1, mid: 2, junior: 1 },
      contacts: [{ name: '김현수', role: '전산팀 과장', tel: '02-3771-xxxx', email: 'hs.kim@example.com' }],
      files: [{ name: '현대차증권_제안서_v3.pptx', at: '2026-09-11' }, { name: '견적서_2차.pdf', at: '2026-09-24' }],
      log: [{ at: '2026-09-25', by: 6, text: '단가 조정안 회신. 2차 견적 송부' },
            { at: '2026-09-11', by: 6, text: '제안 발표 완료' }],
      amountLog: [{ at: '2026-07-02', amount: 48000000, note: '초기 제안가' },
                  { at: '2026-09-24', amount: 42000000, note: '2차 견적 — 단가 조정' }],
      pay: { down: '2026-11-15', mid: '', balance: '2027-02-28', accept: '2027-02-10' } },
    202: { lastContactAt: '2026-09-18', grade: { senior: 0, mid: 1, junior: 1 },
      contacts: [{ name: '박지훈', role: 'AI기획팀', tel: '02-000-0000', email: 'jh.park@example.com' }],
      files: [{ name: '삼성화재_요구사항.xlsx', at: '2026-08-30' }],
      log: [{ at: '2026-09-18', by: 6, text: '요구사항 2차 협의' }],
      amountLog: [{ at: '2026-07-02', amount: 15000000, note: '초기 제안가' }],
      pay: { down: '', mid: '', balance: '', accept: '' } },
    203: { lastContactAt: '2026-08-20', grade: { senior: 0, mid: 0, junior: 0 },
      contacts: [], files: [], log: [{ at: '2026-08-20', by: 6, text: '담당자 소개받음' }],
      amountLog: [], pay: { down: '', mid: '', balance: '', accept: '' } },
    204: { lastContactAt: '2026-03-28', grade: { senior: 2, mid: 2, junior: 1 },
      contacts: [{ name: '이상민', role: '정보시스템부 차장', tel: '02-3774-xxxx', email: 'sm.lee@example.com' }],
      files: [{ name: '계약서_한국거래소.pdf', at: '2026-03-28' }],
      log: [{ at: '2026-03-28', by: 6, text: '계약 날인 완료' }],
      amountLog: [{ at: '2026-01-10', amount: 96000000, note: '수주가' }],
      pay: { down: '2026-04-30', mid: '2026-08-31', balance: '2027-01-31', accept: '2026-12-20' } },
    205: { lastContactAt: '2026-01-26', grade: { senior: 1, mid: 1, junior: 0 },
      contacts: [{ name: '정유진', role: 'IT기획부', tel: '02-2002-xxxx', email: 'yj.jung@example.com' }],
      files: [{ name: '계약서_우리은행.pdf', at: '2026-01-26' }],
      log: [{ at: '2026-01-26', by: 6, text: '수주 통보' }],
      amountLog: [{ at: '2025-11-04', amount: 38000000, note: '수주가' }],
      pay: { down: '2026-02-28', mid: '', balance: '2026-10-31', accept: '2026-09-30' } },
    206: { lastContactAt: '2025-09-30', grade: { senior: 2, mid: 3, junior: 1 },
      contacts: [{ name: '최민석', role: '경영정보팀', tel: '02-3774-xxxx', email: 'ms.choi@example.com' }],
      files: [{ name: '계약서_KRX_MIS.pdf', at: '2025-09-30' }],
      log: [{ at: '2025-09-30', by: 6, text: '계약 완료' }],
      amountLog: [{ at: '2025-07-18', amount: 120000000, note: '수주가' }],
      pay: { down: '2025-11-30', mid: '2026-03-31', balance: '2026-10-15', accept: '2026-09-15' } }
  };

  DB.salesRows.forEach(function (r) {
    var v = SALES_V2[r.id] || {};
    r.lastContactAt = v.lastContactAt || r.openedAt;
    r.grade = v.grade || { senior: 0, mid: 0, junior: 0 };
    r.contacts = v.contacts || [];
    r.files = v.files || [];
    r.log = v.log || [];
    r.amountLog = v.amountLog || [];
    r.pay = v.pay || { down: '', mid: '', balance: '', accept: '' };
    r.lostReason = '';
  });
  /* 실주 한 건 — [4-B1] "실주로 넣기". 단계에 '실주'가 있어야 화면에서 확인된다 */
  DB.projects.push({ id: 110, client: '신한은행', endClient: '신한은행', orderer: '신한DS',
    name: '신한은행 통합검색 고도화', solution: '검색엔진', managerId: 6, phase: 'SALES', type: '솔루션', internal: false,
    products: [{ name: '검색엔진', unit: 'core', qty: 4 }] });
  DB.salesRows.push({ id: 207, projectId: 110, stage: '실주', expectedAmount: 60000000, expectedStart: '2026-05-01',
    ownerId: 6, memo: '가격 경쟁에서 밀림', openedAt: '2026-02-03', closedAt: '2026-04-20',
    lastContactAt: '2026-04-20', grade: { senior: 1, mid: 2, junior: 0 }, contacts: [], files: [],
    log: [{ at: '2026-04-20', by: 6, text: '타사 선정 통보' }], amountLog: [], pay: { down: '', mid: '', balance: '', accept: '' },
    lostReason: '가격 — 경쟁사 대비 18% 높음' });
  DB.salesRows.push({ id: 208, projectId: 109, stage: '리드', expectedAmount: 0, expectedStart: '',
    ownerId: 6, memo: 'PoC — 매출 없음', openedAt: '2026-09-10', closedAt: null,
    lastContactAt: '2026-09-10', grade: { senior: 0, mid: 1, junior: 0 }, contacts: [], files: [],
    log: [], amountLog: [], pay: { down: '', mid: '', balance: '', accept: '' }, lostReason: '' });

  var SALES_STAGES = ['리드', '제안', '견적', '수주', '실주'];
  var STAGE_SLUG = { lead: '리드', proposal: '제안', quote: '견적', won: '수주', lost: '실주' };

  /* ── 솔루션 ─────────────────────────────────────────────
     [4-C4] "실제 투입 기간, 개발 기간 구분하는게 좋아보임"
     [추가 메모] "요구사항 / 분석,설계 / 개발", "프로젝트별로 개발자가 태스크 등록",
                 "정해진 task 말고도 custom 영역도 많아서"
     [추가 메모] "수주가 완료 되어야 투입인력 지정" */
  var TASK_SEED = {
    301: [{ name: '요구사항', weight: 20, progress: 100, custom: false },
          { name: '분석 · 설계', weight: 30, progress: 90, custom: false },
          { name: '개발', weight: 40, progress: 35, custom: false },
          { name: '공시 양식 커스텀', weight: 10, progress: 10, custom: true }],
    /* 302 는 태스크가 다 끝나 이관을 요청해 둔 상태다 — CS 의 '대기' 탭에 한 건은 보여야 한다 */
    302: [{ name: '요구사항', weight: 20, progress: 100, custom: false },
          { name: '분석 · 설계', weight: 30, progress: 100, custom: false },
          { name: '개발', weight: 50, progress: 100, custom: false }],
    303: [{ name: '요구사항', weight: 30, progress: 15, custom: false },
          { name: '분석 · 설계', weight: 30, progress: 0, custom: false },
          { name: '개발', weight: 40, progress: 0, custom: false }],
    304: [{ name: '요구사항', weight: 20, progress: 100, custom: false },
          { name: '분석 · 설계', weight: 30, progress: 100, custom: false },
          { name: '개발', weight: 50, progress: 100, custom: false }]
  };
  var SOLUTION_V2 = {
    301: { devStart: '2026-05-10', devEnd: '2026-11-30', actualMm: 5.8 },
    302: { devStart: '2026-02-20', devEnd: '2026-08-31', actualMm: 2.1 },
    303: { devStart: '', devEnd: '', actualMm: 0 },
    304: { devStart: '2025-11-01', devEnd: '2026-08-31', actualMm: 6.4 }
  };
  DB.solutionRows.forEach(function (r) {
    var v = SOLUTION_V2[r.id] || {};
    /* 계약 기간(startDate~endDate)은 v1 그대로. 개발 기간을 따로 둔다 */
    r.devStart = v.devStart || '';
    r.devEnd = v.devEnd || '';
    /* [4-C3 영업] "계약 M/M 실제 투입 M/M 구분 -> 보다는 하나로 관리 하고"
       → 열은 하나(contractMm)로 두되, 초과를 드러내려면 실투입을 알아야 해서 안쪽에만 둔다 */
    r.actualMm = v.actualMm || 0;
    r.tasks = TASK_SEED[r.id] || [];
    /* 이관(인수인계) 필수 입력 — [3-S7 CS] "이관시 필수 탭을 만들어서 못 적으면 이관 처리 못하게"
       status: draft(작성 중) → requested(솔루션이 요청) → accepted(CS 수락) / rejected(CS 반려)
       사용자 결정(2026-09-30): 요청은 솔루션이 하고 <strong>CS 가 수락해야 넘어간다</strong>.
       반려는 사유와 함께 돌려보낸다. [5-A2] 로 물으려던 질문의 답이다. */
    r.handover = newHandover();
  });
  function newHandover() {
    return { packageVer: '', tomcatVer: '', ssl: '', modules: '', checklist: false, note: '',
      status: 'draft', requestedAt: null, requestedBy: null,
      rejectReason: '', doneAt: null, history: [] };
  }
  DB.solutionRows[3].handover = {   /* 이미 넘어간 건 — 요청과 수락이 다 찍혀 있다 */
    packageVer: '4.2.1', tomcatVer: 'Tomcat 9.0.85', ssl: '적용 (Let’s Encrypt · 자동 갱신)',
    modules: 'krx-mis-core, krx-report-ext', checklist: true,
    note: '야간 배치 시간 02:00 고정. 색인 재기동 스크립트는 /opt/krx/bin 참조',
    status: 'accepted', requestedAt: '2026-09-14', requestedBy: 1, rejectReason: '', doneAt: '2026-09-16',
    history: [
      { at: '2026-09-12', by: 1, action: '요청', reason: '' },
      { at: '2026-09-13', by: 4, action: '반려', reason: '톰캣 버전과 SSL 여부가 비어 있습니다. 색인 재기동 절차도 필요합니다.' },
      { at: '2026-09-14', by: 1, action: '요청', reason: '' },
      { at: '2026-09-16', by: 4, action: '수락', reason: '' }
    ]
  };
  /* 지금 CS 의 할 일이 한 건은 보이도록 — 305(우리은행)는 요청까지 와 있다 */
  DB.solutionRows[1].handover = {
    packageVer: '3.8.0', tomcatVer: 'Tomcat 9.0.80', ssl: '적용 (사내 CA)',
    modules: 'woori-dms-core', checklist: true,
    note: '검수 완료. 배치 창구 시간 확인 필요.',
    status: 'requested', requestedAt: '2026-09-29', requestedBy: 2, rejectReason: '', doneAt: null,
    history: [{ at: '2026-09-29', by: 2, action: '요청', reason: '' }]
  };

  /* 태스크 가중 평균이 진행률이다 — 직접 쓰는 숫자가 아니라 파생.
     [추가 메모] "프로젝트에 task 받아서 진행률 관리하는게 좋아보임" */
  function taskProgress(row) {
    if (!row.tasks || !row.tasks.length) { return row.progress; }
    var w = 0, s = 0;
    row.tasks.forEach(function (t) { w += t.weight; s += t.weight * t.progress; });
    return w ? Math.round(s / w) : 0;
  }
  /* [추가 메모] "진행률 빨간거 -> 초과할때 삐뽀삐뽀" — 초과의 기준은 M/M 이다 */
  function mmOver(row) { return row.actualMm > row.contractMm; }

  /* ── 유지보수 ───────────────────────────────────────────
     [4-D8 CS] "정기정검 유무도 필요 (월,분기,원격,방문 구분)"
     [4-D8 영업] "고객대표"
     [추가 메모] 신규/유지 정의 · "유지보수 달력으로 … 갱신일? 마감일?" */
  var CONTRACT_V2 = {
    401: { kind: '신규', customerRep: '최민석 (경영정보팀)', checkCycle: '분기', checkMode: '방문', renewAt: '2027-08-15' },
    402: { kind: '유지', customerRep: '한지원 (기술본부)', checkCycle: '월', checkMode: '원격', renewAt: '2026-11-30' },
    403: { kind: '유지', customerRep: '오세훈 (IT팀)', checkCycle: '없음', checkMode: '', renewAt: '' }
  };
  DB.contracts.forEach(function (c) {
    var v = CONTRACT_V2[c.id] || {};
    /* 신규 = 처음 유상으로 들어가는 것 / 유지 = 이미 유상이고 이어서 하는 것 (추가 메모의 정의) */
    c.kind = v.kind || '신규';
    c.customerRep = v.customerRep || '';
    c.checkCycle = v.checkCycle || '없음';   /* 월 · 분기 · 없음 */
    c.checkMode = v.checkMode || '';         /* 원격 · 방문 */
    c.renewAt = v.renewAt || '';             /* 갱신일 — 만료일과 다를 수 있다 */
  });

  /* 정기점검 — [6-C6 CS] "정기정검 탭 추가!!!", "문서도 관리", "완료 표시, 일정" */
  var checks = [
    { id: 701, contractId: 402, siteId: 502, planned: '2026-09-10', done: '2026-09-10', mode: '원격', engineerId: 5, doc: '전력거래소_202609_점검보고서.pdf' },
    { id: 702, contractId: 402, siteId: 503, planned: '2026-09-18', done: '2026-09-18', mode: '원격', engineerId: 5, doc: '경보제약_202609_점검보고서.pdf' },
    { id: 703, contractId: 402, siteId: 504, planned: '2026-09-25', done: null, mode: '원격', engineerId: null, doc: '' },
    { id: 704, contractId: 401, siteId: 501, planned: '2026-10-08', done: null, mode: '방문', engineerId: 4, doc: '' },
    { id: 705, contractId: 402, siteId: 502, planned: '2026-10-12', done: null, mode: '원격', engineerId: 5, doc: '' }
  ];
  var checkSeq = 705;
  function toggleCheck(id, today) {
    var c = byId(checks, id);
    c.done = c.done ? null : today;
    return c;
  }

  /* 외근 일정 — [6-C6 CS] "외근 일정같은거 캘린더에 표시하면 좋을 것 같음" */
  var trips = [
    { id: 801, personId: 4, date: '2026-10-08', where: '한국거래소 본사', why: '정기점검 방문' },
    { id: 802, personId: 5, date: '2026-10-02', where: '경보제약', why: '장애 대응' }
  ];

  /* ── 이슈 ───────────────────────────────────────────────
     [3-S7 CS] 템플릿(문의 내용 · 원인 파악 · 작업 내용) · 이미지 · 코드
     [6-C6 CS] 고객 담당자 · 완료일 · 재오픈 · 난이도 · 업체 담당자 별점
     상태는 현행 4단계 유지(사용자 결정 2026-09-30) */
  var ISSUE_TEMPLATE = '## 문의 내용\n\n\n## 원인 파악\n\n\n## 작업 내용\n\n';
  var ISSUE_V2 = {
    601: { customer: '이상민 차장', difficulty: '중', rating: 4, closedAt: null,
      body: '## 문의 내용\n공시 첨부 PDF 변환이 간헐 실패.\n\n## 원인 파악\n변환 큐 적체. `converter.pool=4` 로 부족.\n\n## 작업 내용\n풀 8 로 상향 후 재현 확인 중.' },
    602: { customer: '박수현 경위', difficulty: '하', rating: 5, closedAt: null, body: ISSUE_TEMPLATE },
    603: { customer: '한지원 팀장', difficulty: '상', rating: 2, closedAt: null,
      body: '## 문의 내용\n야간 색인 배치가 06:00 까지 끝나지 않음.\n\n## 원인 파악\n디스크 IO 병목.\n\n## 작업 내용\n배치 분할 적용. 고객 확인 대기.' },
    604: { customer: '김서연 과장', difficulty: '하', rating: 5, closedAt: '2026-08-06',
      body: '## 문의 내용\n검색 사전에 신규 용어 추가 요청.\n\n## 원인 파악\n-\n\n## 작업 내용\n사전 반영 후 재색인 완료.' },
    605: { customer: '최민석 팀장', difficulty: '하', rating: 4, closedAt: null, body: ISSUE_TEMPLATE }
  };
  DB.issues.forEach(function (i) {
    var v = ISSUE_V2[i.id] || {};
    i.customer = v.customer || '';      /* 요청한 고객 담당자 */
    i.difficulty = v.difficulty || '중'; /* 상 · 중 · 하 */
    i.rating = v.rating || 3;            /* 업체 담당자 별점(특이사항) */
    i.closedAt = v.closedAt || null;     /* 완료일은 접수일과 따로 */
    i.body = v.body || ISSUE_TEMPLATE;
    i.files = [];
  });

  /* ── 회계 ───────────────────────────────────────────────
     [추가 메모] "매출액 -> 경영쪽에서 나중에 관리할 수 있게 확장", "매출, 매입 통계 기능"
     계산 원리는 아직 확인되지 않았다(부사장님 인터뷰 예정). 여기 숫자는 목업이고,
     화면이 묻는 것은 "무엇을 어떤 축으로 보고 싶은가" 하나다. */
  var purchases = [
    { id: 901, projectId: 104, at: '2026-05-20', vendor: '외주 개발 A사', item: '화면 개발 외주', amount: 18000000 },
    { id: 902, projectId: 104, at: '2026-07-10', vendor: 'OSS 서포트', item: '검색엔진 서포트 라이선스', amount: 6000000 },
    { id: 903, projectId: 105, at: '2026-03-02', vendor: '외주 개발 B사', item: '연동 모듈', amount: 7000000 },
    { id: 904, projectId: 107, at: '2025-12-01', vendor: '하드웨어 총판', item: '서버 2식', amount: 32000000 },
    { id: 905, projectId: 106, at: '2026-08-14', vendor: '외주 개발 A사', item: 'AI 파인튜닝', amount: 9000000 }
  ];

  /* 수금 일정 — 영업 행의 pay 와 계약의 기간에서 파생한다. 따로 저장하지 않는다. */
  function paymentRows() {
    var out = [];
    DB.salesRows.forEach(function (r) {
      var p = DB.project(r.projectId);
      if (!p) { return; }
      var amount = r.expectedAmount;
      [['선금', r.pay.down, 0.3], ['중도금', r.pay.mid, 0.4], ['잔금', r.pay.balance, 0.3]].forEach(function (x) {
        if (!x[1]) { return; }
        out.push({ kind: x[0], due: x[1], amount: Math.round(amount * x[2]),
          projectId: p.id, project: p.name, orderer: p.orderer, from: '영업 ' + r.stage });
      });
      if (r.pay.accept) {
        out.push({ kind: '검수확인', due: r.pay.accept, amount: 0,
          projectId: p.id, project: p.name, orderer: p.orderer, from: '영업 ' + r.stage });
      }
    });
    return out.sort(function (a, b) { return a.due < b.due ? -1 : 1; });
  }

  function revenueRows() {
    var out = [];
    DB.salesRows.forEach(function (r) {
      if (r.stage !== '수주') { return; }
      var p = DB.project(r.projectId);
      out.push({ at: r.closedAt || r.openedAt, kind: '프로젝트', projectId: p.id, name: p.name,
        orderer: p.orderer, amount: r.expectedAmount });
    });
    DB.contracts.forEach(function (c) {
      out.push({ at: c.startDate, kind: '유지보수', projectId: c.sourceProjectId, name: c.name,
        orderer: c.client, amount: c.amount });
    });
    return out.sort(function (a, b) { return a.at < b.at ? -1 : 1; });
  }

  /* TODO 월별 보기 — [추가 메모] "TODO 월별보기 추가" */
  function monthDays(anchor) {
    var d = new Date(anchor + 'T00:00:00');
    var first = new Date(d.getFullYear(), d.getMonth(), 1);
    var start = new Date(first);
    var back = (first.getDay() + 6) % 7;          /* 주 시작은 월요일 */
    start.setDate(first.getDate() - back);
    var out = [], i;
    for (i = 0; i < 42; i++) {
      var t = new Date(start);
      t.setDate(start.getDate() + i);
      out.push({ date: t.toISOString().slice(0, 10), inMonth: t.getMonth() === d.getMonth() });
    }
    return out;
  }
  function shiftMonth(anchor, n) {
    var d = new Date(anchor + 'T00:00:00');
    d.setDate(1);
    d.setMonth(d.getMonth() + n);
    return d.toISOString().slice(0, 10);
  }

  /* ── 생성 함수 감싸기 ──────────────────────────────────────
     v1 의 create/transfer 는 v2 항목을 모르므로, 새로 만든 행에는 그 칸이 비어 있다.
     화면이 그 빈칸에서 터지지 않게 여기서 기본값을 채운다. data.js 는 건드리지 않는다. */
  var _createSales = DB.createSalesProject;
  DB.createSalesProject = function (f) {
    var p = _createSales(f);
    p.endClient = p.client;
    p.orderer = f.orderer || p.client;
    p.type = f.type || '솔루션';
    p.internal = false;
    p.products = [{ name: p.solution, unit: f.unit || 'core', qty: Number(f.qty || 1) }];
    var s = DB.openRow(DB.salesOf(p.id));
    s.lastContactAt = DB.today();
    s.grade = { senior: Number(f.senior || 0), mid: Number(f.mid || 0), junior: Number(f.junior || 0) };
    s.contacts = []; s.files = []; s.log = []; s.lostReason = '';
    s.amountLog = s.expectedAmount ? [{ at: DB.today(), amount: s.expectedAmount, note: '최초 등록' }] : [];
    s.pay = { down: '', mid: '', balance: '', accept: '' };
    return p;
  };

  var _toSolution = DB.transferToSolution;
  DB.transferToSolution = function (pid, f) {
    var p = _toSolution(pid, f);
    var s = DB.openRow(DB.solutionOf(p.id));
    s.devStart = ''; s.devEnd = ''; s.actualMm = 0;
    /* 기본 태스크 셋 — 추가 메모의 "요구사항 / 분석,설계 / 개발" */
    s.tasks = [
      { name: '요구사항', weight: 20, progress: 0, custom: false },
      { name: '분석 · 설계', weight: 30, progress: 0, custom: false },
      { name: '개발', weight: 50, progress: 0, custom: false }
    ];
    s.handover = newHandover();
    return p;
  };

  function decorateContract(c) {
    if (!c) { return c; }
    if (c.kind == null) { c.kind = '신규'; }
    if (c.customerRep == null) { c.customerRep = ''; }
    if (c.checkCycle == null) { c.checkCycle = '없음'; }
    if (c.checkMode == null) { c.checkMode = ''; }
    if (c.renewAt == null) { c.renewAt = ''; }
    return c;
  }
  var _createContract = DB.createContract;
  DB.createContract = function (f) { return decorateContract(_createContract(f)); };
  var _toMaint = DB.transferToMaintenance;
  DB.transferToMaintenance = function (pid, f) {
    var r = _toMaint(pid, f);
    DB.contracts.forEach(decorateContract);
    return r;
  };

  g.V2 = {
    SALES_STAGES: SALES_STAGES, STAGE_SLUG: STAGE_SLUG, PROJECT_TYPES: PROJECT_TYPES,
    ISSUE_TEMPLATE: ISSUE_TEMPLATE,
    taskProgress: taskProgress, mmOver: mmOver,
    checks: checks, toggleCheck: toggleCheck, trips: trips,
    purchases: purchases, paymentRows: paymentRows, revenueRows: revenueRows,
    monthDays: monthDays, shiftMonth: shiftMonth,
    addCheck: function (row) { checkSeq += 1; row.id = checkSeq; checks.push(row); return row; },
    byId: byId
  };
})(window);
