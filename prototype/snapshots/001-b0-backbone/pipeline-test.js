/* 이관 파이프라인 로직 확인. 브라우저 없이 돌린다:  node prototype/pipeline-test.js
   프로토타입은 버릴 물건이지만 이관 규칙은 버리지 않는다 — 아래 단언들이
   B5(이관) 스펙의 수용기준 초안이다. 실제로 버그 1건을 잡았다(채번이 시드 id와 충돌해
   새 프로젝트가 시드 프로젝트를 덮어썼다). */
global.window = global;
require('./assets/data.js');
var D = global.DB, ok = 0, bad = 0;
function is(label, actual, expected) {
  var pass = JSON.stringify(actual) === JSON.stringify(expected);
  console.log((pass ? 'PASS  ' : 'FAIL  ') + label + (pass ? '' : '  (got ' + JSON.stringify(actual) + ', want ' + JSON.stringify(expected) + ')'));
  pass ? ok++ : bad++;
}

// 1. 영업 생성
var p = D.createSalesProject({ client: '테스트사', name: '테스트 프로젝트', solution: '검색엔진', stage: '제안', expectedAmount: '1000000', expectedStart: '2026-10-01', ownerId: '6' });
is('생성 직후 phase=SALES', p.phase, 'SALES');
is('영업 행 1개', D.salesOf(p.id).length, 1);
is('솔루션 행 0개', D.solutionOf(p.id).length, 0);

// 2. 솔루션 이관
D.transferToSolution(p.id, { contractMm: '3', startDate: '2026-10-01', endDate: '2027-01-31', managerId: '1' });
is('이관 후 phase=SOLUTION', p.phase, 'SOLUTION');
is('영업 행은 남는다(1:N)', D.salesOf(p.id).length, 1);
is('영업 행이 닫혔다', D.salesOf(p.id)[0].closedAt !== null, true);
is('영업 단계=수주', D.salesOf(p.id)[0].stage, '수주');
is('솔루션 행이 추가됐다', D.solutionOf(p.id).length, 1);
is('새 솔루션 행의 초기 상태 = 진행 전', D.openRow(D.solutionOf(p.id)).status, '진행 전');
is('새 솔루션 행의 진행률 = 0 (이관 버튼 조건 미충족)', D.openRow(D.solutionOf(p.id)).progress, 0);
is('PM 반영', p.managerId, 1);

// 2-1. 목록 규칙: 이관해도 원래 영역 목록에서 사라지지 않는다
//      (목록 기준 = phase 가 아니라 "그 영역의 행을 가지고 있는가")
function listedIn(getRows) {
  return D.projects.filter(function (x) { return getRows(x.id).length; }).map(function (x) { return x.id; });
}
is('이관 후에도 영업 목록에 남는다', listedIn(D.salesOf).indexOf(p.id) >= 0, true);
is('솔루션 목록에도 나타난다', listedIn(D.solutionOf).indexOf(p.id) >= 0, true);

// 3. 인력 투입 · 진행률
D.assign(p.id, { personId: '2', role: '참여자', monthlyMm: '0.5' });
is('투입 1명', D.openRow(D.solutionOf(p.id)).assignments.length, 1);
D.setProgress(p.id, 150);
is('진행률 상한 100', D.openRow(D.solutionOf(p.id)).progress, 100);
is('100%여도 상태는 그대로 — 완료는 이관이 만든다', D.openRow(D.solutionOf(p.id)).status, '진행 전');

// 4. 유지보수 이관 — 기간 1년 고정
var c = D.transferToMaintenance(p.id, { startDate: '2026-11-01', amount: '5000000', siteName: '테스트 사이트', salesOwnerId: '6' });
is('이관 후 phase=MAINTENANCE', p.phase, 'MAINTENANCE');
is('계약 종료일 = 시작 + 1년 - 1일', c.endDate, '2027-10-31');
is('계약 출처 = 원천 프로젝트', c.sourceProjectId, p.id);
is('솔루션 행이 완료로 닫혔다', D.openRow(D.solutionOf(p.id)).closedAt !== null, true);
is('솔루션 진행률 100', D.solutionOf(p.id)[0].progress, 100);
is('사이트 1개 생성', D.sitesOf(c.id).length, 1);
is('영역별 행 3종이 모두 남아 있다(1:N 이력)',
   [D.salesOf(p.id).length, D.solutionOf(p.id).length, D.contractOfProject(p.id).length], [1, 1, 1]);

is('유지보수 이관 뒤에도 영업·솔루션 목록에 모두 남는다',
   [listedIn(D.salesOf).indexOf(p.id) >= 0, listedIn(D.solutionOf).indexOf(p.id) >= 0], [true, true]);

// 4-1. 1:1 — 영역당 행은 하나. 이관 내역은 이 행들에서 파생되므로 따로 저장하지 않는다.
is('영업 행은 영역당 1개', D.salesOf(p.id).length, 1);
is('솔루션 행은 영역당 1개', D.solutionOf(p.id).length, 1);
is('계약도 지금은 1개 (갱신은 B4 미정)', D.contractOfProject(p.id).length, 1);
is('이관 내역의 재료 — 영업 closedAt == 솔루션 openedAt',
   D.salesOf(p.id)[0].closedAt, D.solutionOf(p.id)[0].openedAt);
is('이관 내역의 재료 — 솔루션 closedAt 이 찍혀 있다', !!D.solutionOf(p.id)[0].closedAt, true);

// 5. 직접 등록 계약
var c2 = D.createContract({ client: '직접사', name: '직접 계약', status: '신규', startDate: '2026-01-01', endDate: '2026-12-31', amount: '1000000', siteName: 'S', channel: 'OEM' });
is('직접 등록은 원천 없음', c2.sourceProjectId, null);

// 6. 이슈 생성/수정/삭제
var i = D.createIssue({ scope: 'MAINTENANCE', siteId: String(D.sitesOf(c.id)[0].id), type: '장애', title: '테스트 이슈', assigneeId: '5' });
is('이슈 기본 상태=접수', i.status, '접수');
D.updateIssue(i.id, { type: '장애', title: '테스트 이슈', status: '처리중', assigneeId: '4', comment: '조치함' });
is('처리 내용 1건', D.byId(D.issues, i.id).comments.length, 1);
is('담당자 변경', D.byId(D.issues, i.id).assigneeId, 4);
is('삭제', D.deleteIssue(i.id), true);
is('삭제 후 조회 불가', D.byId(D.issues, i.id), null);

console.log('\n' + ok + ' passed, ' + bad + ' failed');
process.exit(bad ? 1 : 0);
