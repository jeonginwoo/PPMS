/* TODO · 업무보고 로직 확인. 브라우저 없이 돌린다:  node prototype/todo-test.js
   이관 규칙(pipeline-test.js)과 다른 관심사라 파일을 따로 뒀다.
   핵심은 "업무보고는 저장물이 아니라 TODO의 파생"이라는 것 — 아래 단언들이 그것을 잡아 둔다.
   넘기기(carry)의 부작용도 단언으로 적었다: 날짜만 바꾸면 어제 보고에서 그 줄이 사라진다.
   이건 버그가 아니라 아직 안 정한 결정이고, 결정이 바뀌면 이 단언이 먼저 깨진다. */
global.window = global;
require('./assets/data.js');
var D = global.DB, ok = 0, bad = 0;
function is(label, actual, expected) {
  var pass = JSON.stringify(actual) === JSON.stringify(expected);
  console.log((pass ? 'PASS  ' : 'FAIL  ') + label + (pass ? '' : '  (got ' + JSON.stringify(actual) + ', want ' + JSON.stringify(expected) + ')'));
  pass ? ok++ : bad++;
}

var T0 = D.today(), T1 = D.shiftDay(T0, -1);

// 1. 작성
var t = D.createTodo({ personId: '3', date: T0, title: '테스트 할 일', projectId: '106' });
is('기본 상태 = 시작 전', t.status, '시작 전');
is('내 것으로 조회된다', D.todosOf(3, T0).indexOf(t) >= 0, true);
is('남의 날짜에는 없다', D.todosOf(3, T1).indexOf(t) >= 0, false);
is('프로젝트는 있어도 되고', t.projectId, 106);
is('없어도 된다(내부 업무)', D.createTodo({ personId: '3', date: T0, title: '내부 정산' }).projectId, null);

// 2. 업무보고 = 파생. 저장된 보고서 행은 없다.
is('업무보고에 저장 테이블이 없다', Object.keys(D).indexOf('reports') < 0, true);
var onDay = D.todosOn(T0);
is('그 날짜 전체 = 사람별 합', onDay.length,
   D.people.reduce(function (n, p) { return n + D.todosOf(p.id, T0).length; }, 0));
is('작성자만 세면 인원 수보다 적거나 같다',
   D.people.filter(function (p) { return D.todosOf(p.id, T0).length; }).length <= D.people.length, true);

// 3. 상태는 TODO 자신의 어휘다(영역 상태와 공유하지 않는다)
D.setTodoStatus(t.id, '진행');
is('상태 변경', D.byId(D.todos, t.id).status, '진행');
D.setTodoStatus(t.id, '완료');
is('완료는 지난 미완료에서 빠진다', D.todosLeftBefore(3, D.shiftDay(T0, 1)).indexOf(t) >= 0, false);

// 4. 지난 미완료 · 가져오기 — 2026-09-23 결정으로 "날짜 바꾸기"가 "그 날에도 놓기"로 바뀌었다.
//    그 전 단언("넘기면 어제에서 사라진다")이 먼저 깨졌고, 아래가 그 자리를 대신한다.
var old = D.createTodo({ personId: '3', date: T1, title: '어제 못 끝낸 일' });
is('어제 미완료가 오늘 기준으로 잡힌다', D.todosLeftBefore(3, T0).indexOf(old) >= 0, true);
is('어제 업무보고에 있다', D.todosOf(3, T1).indexOf(old) >= 0, true);
D.placeTodo(old.id, T0);
is('가져오면 오늘에도 놓인다', D.todosOf(3, T0).indexOf(old) >= 0, true);
is('어제에서 사라지지 않는다 — 같은 행이 두 날에 놓인다', D.todosOf(3, T1).indexOf(old) >= 0, true);
is('새 행을 만들지 않는다', D.todos.filter(function (x) { return x.title === '어제 못 끝낸 일'; }).length, 1);
is('주간 실적에는 한 번만 찍힌다',
   D.todosBetween(3, T1, D.shiftDay(T1, 6)).filter(function (x) { return x.id === old.id; }).length, 1);
is('두 번 가져와도 날짜가 겹치지 않는다', (D.placeTodo(old.id, T0), old.dates.filter(function (d) { return d === T0; }).length), 1);
is('가져온 뒤에는 지난 미완료에서 빠진다 — 이미 오늘 칸에 있다', D.todosLeftBefore(3, T0).indexOf(old) >= 0, false);
D.setTodoStatus(old.id, '완료');
is('상태는 하나뿐이라 어제 칸의 그 카드도 완료가 된다 — 미정 결정의 결과다',
   D.todosOf(3, T1).filter(function (x) { return x.id === old.id; })[0].status, '완료');
D.unplaceTodo(old.id, T1);
is('한 날에서 빼도 다른 날에는 남는다', [D.todosOf(3, T1).indexOf(old) >= 0, D.todosOf(3, T0).indexOf(old) >= 0], [false, true]);
D.unplaceTodo(old.id, T0);
is('다 빼면 날짜 없음으로 돌아간다', D.todosNoDate(3).indexOf(old) >= 0, true);

// 4-1. 연속 묶음 — 캘린더가 이어 그릴 수 있는 것은 붙어 있는 날뿐이다.
var days = [0, 1, 2, 3, 4].map(function (n) { return D.shiftDay(D.weekStartOf(T0), n); });
var run = D.createTodo({ personId: '3', date: days[1], title: '이틀짜리' });
is('하루면 도막 하나 · 길이 1', D.dateRuns(run, days), [[1, 1]]);
D.placeTodo(run.id, days[2]);
is('붙어 있으면 한 도막으로 이어진다', D.dateRuns(run, days), [[1, 2]]);
D.placeTodo(run.id, days[4]);
is('하루 건너뛰면 도막이 둘로 갈린다', D.dateRuns(run, days), [[1, 2], [4, 4]]);
D.placeTodo(run.id, days[3]);
is('사이를 메우면 다시 하나가 된다', D.dateRuns(run, days), [[1, 4]]);
is('그 주에 없는 날은 도막에 들어가지 않는다',
   D.dateRuns(D.createTodo({ personId: '3', date: D.shiftDay(days[0], -3), title: '지난주 것' }), days), []);
is('월요일에 있으면 첫 칸부터다',
   (D.placeTodo(run.id, days[0]), D.dateRuns(run, days)), [[0, 4]]);

// 5. 날짜 없음 — 언제 할지 안 정한 것. 캘린더의 "날짜 없음" 칸에 모이고 업무보고에는 안 잡힌다.
var nd = D.createTodo({ personId: '3', title: '언제 할지 미정' });
is('날짜를 안 주면 날짜 없음', nd.dates, []);
is('날짜 없음 칸에 들어간다', D.todosNoDate(3).indexOf(nd) >= 0, true);
is('어느 날짜의 업무보고에도 안 잡힌다', D.todosOn(T0).indexOf(nd) >= 0, false);
is('지난 미완료로도 안 잡힌다', D.todosLeftBefore(3, D.shiftDay(T0, 7)).indexOf(nd) >= 0, false);

// 6. 주 단위 — 캘린더가 주간이므로 주의 시작(월요일)이 흔들리면 화면이 어긋난다
var w = D.weekStartOf(T0);
is('주 시작은 월요일', new Date(w).getDay(), 1);
is('월요일의 주 시작 = 자기 자신', D.weekStartOf(w), w);
is('일요일도 같은 주에 속한다', D.weekStartOf(D.shiftDay(w, 6)), w);
is('오늘은 그 주 안에 있다', T0 >= w && T0 <= D.shiftDay(w, 6), true);
is('주간 조회는 그 7일만 준다',
   D.todosBetween(2, w, D.shiftDay(w, 6)).every(function (t) { return t.dates.some(function (d) { return d >= w && d <= D.shiftDay(w, 6); }); }), true);

// 7. 주간 계획 — 사람이 쓰는 문장이고 TODO 와 다른 것이다(사용자 결정 2026-09-23).
//    2026-09-22 에는 "차주 계획 = 다음 주 날짜의 TODO"였고 여기 단언도 그랬다.
//    결정이 바뀌자 그 단언이 먼저 깨졌다 — 그러라고 적어 둔 것이다.
var W0 = D.weekStartOf(T0), NW = D.shiftDay(W0, 7);
var before = D.todos.length;
D.setPlan(3, NW, '1. 통합 테스트\n2. 토큰 모니터링 화면 설계');
is('계획은 사람 + 주 하나로 잡힌다', D.planOf(3, NW).text.indexOf('통합 테스트') >= 0, true);
is('계획을 써도 TODO 는 늘지 않는다 — 다른 것이다', D.todos.length, before);
is('다른 주에는 없다', D.planOf(3, W0), null);
/* 핵심: 차주에 쓴 계획은 다음 주가 되면 '이번주 계획'으로 읽힌다.
   옮기는 함수가 없다 — 같은 행을 그때의 주차로 조회할 뿐이다. */
var asNextWeek = D.weekStartOf(D.shiftDay(T0, 7));
is('다음 주 기준의 "이번주"는 지금의 "차주"다', asNextWeek, NW);
is('그래서 같은 행이 읽힌다', D.planOf(3, asNextWeek), D.planOf(3, NW));
is('옮기는 함수는 없다', typeof D.carryPlan, 'undefined');
D.setPlan(3, NW, '수정한 계획');
is('한 주에 한 칸뿐이라 덮어쓴다', D.plans.filter(function (p) { return p.personId === 3 && p.week === NW; }).length, 1);

// 8. 공휴일 — 전원 공통이고 실제 달력이라 날짜를 박아 둔다. 표시뿐이고 TODO를 막지 않는다.
is('공휴일은 날짜로 조회된다', D.holidayOf('2026-09-25').name, '추석');
is('공휴일이 아닌 날은 null', D.holidayOf('2026-09-22'), null);
is('기간 조회', D.holidaysIn('2026-09-21', '2026-09-25').length, 2);
var onHol = D.createTodo({ personId: '2', date: '2026-09-25', title: '추석에 적은 할 일' });
is('공휴일에도 TODO는 써진다 — 막지 않는다', D.todosOf(2, '2026-09-25').indexOf(onHol) >= 0, true);
is('공휴일이 상태를 자동으로 바꾸지 않는다', onHol.status, '시작 전');
is('공휴일은 사람별이 아니다(휴가와 다르다)', D.holidayOf('2026-09-25').personId, undefined);

// 8-1. 대체공휴일 — 목업을 손으로 넣다 9/28을 대체공휴일로 잘못 박았고(사용자가 화면에서 잡아냈다),
//      그 실수가 기계로 잡히는 형태만 단언으로 남긴다. 규칙 전체는 기계가 알 수 없다 —
//      그게 "공휴일을 사람이 등록할 것인가"라는 질문의 값어치다.
var WD = ['일', '월', '화', '수', '목', '금', '토'];
function dow(d) { return WD[new Date(d + 'T00:00:00').getDay()]; }
var subs = D.holidays.filter(function (x) { return x.name === '대체공휴일'; });
is('대체공휴일은 평일이다', subs.every(function (x) { return dow(x.date) !== '토' && dow(x.date) !== '일'; }), true);
is('대체공휴일에는 근거가 적혀 있다', subs.every(function (x) { return !!x.note; }), true);
var chuseok = D.holidays.filter(function (x) { return x.name.indexOf('추석') === 0; });
is('2026 추석 연휴는 목·금·토', chuseok.map(function (x) { return dow(x.date); }), ['목', '금', '토']);
is('연휴에 일요일이 없다 — 설날·추석은 일요일과 겹칠 때만 대체공휴일이다',
   chuseok.some(function (x) { return dow(x.date) === '일'; }), false);
is('그래서 추석 대체공휴일은 없다',
   subs.some(function (x) { return String(x.note).indexOf('추석') >= 0; }), false);
is('9/28(월)은 공휴일이 아니다', D.holidayOf('2026-09-28'), null);

// 9. 휴가 — 지금은 표시뿐이다. "자동 처리"는 만들지 않았고, 그게 미정 결정이다.
var lday = D.leaves[0].date;
is('휴가는 사람·날짜로 조회된다', D.leaveOf(2, lday).type, '연차');
is('휴가가 아닌 날은 null', D.leaveOf(2, D.shiftDay(lday, 1)), null);
var onLeave = D.createTodo({ personId: '2', date: lday, title: '휴가날에 적은 할 일' });
is('휴가여도 TODO는 써진다 — 막지 않는다', D.todosOf(2, lday).indexOf(onLeave) >= 0, true);
is('휴가가 상태를 자동으로 바꾸지 않는다', onLeave.status, '시작 전');

// 9-1. 프로젝트 기준 조회 — 프로젝트 상세의 TODO 캘린더가 쓴다. 사람을 가리지 않는다.
var pw = D.weekStartOf(T0);
var mine104 = D.createTodo({ personId: '2', date: T0, title: '내 104 할 일', projectId: '104' });
var other104 = D.createTodo({ personId: '1', date: T0, title: '남의 104 할 일', projectId: '104' });
var at105 = D.createTodo({ personId: '2', date: T0, title: '105 할 일', projectId: '105' });
var onDay = D.todosOfProjectOn(104, T0);
is('그 프로젝트 것만 잡힌다', onDay.indexOf(at105) >= 0, false);
is('내 것도', onDay.indexOf(mine104) >= 0, true);
is('남의 것도 같이 잡힌다 — 프로젝트 화면의 질문은 "누가 뭘 하나"다', onDay.indexOf(other104) >= 0, true);
is('주간 조회도 사람을 가리지 않는다',
   [D.todosOfProjectBetween(104, pw, D.shiftDay(pw, 4)).indexOf(mine104) >= 0,
    D.todosOfProjectBetween(104, pw, D.shiftDay(pw, 4)).indexOf(other104) >= 0], [true, true]);
var nd104 = D.createTodo({ personId: '2', title: '날짜 없는 104', projectId: '104' });
is('날짜 없는 것은 주간 캘린더에 안 뜬다', D.todosOfProjectBetween(104, pw, D.shiftDay(pw, 4)).indexOf(nd104) >= 0, false);

// 10. 삭제
is('삭제', D.deleteTodo(t.id), true);
is('삭제 후 조회 불가', D.byId(D.todos, t.id), null);
is('삭제하면 그 날짜 업무보고에서도 사라진다', D.todosOn(T0).indexOf(t) >= 0, false);

console.log('\n' + ok + ' passed, ' + bad + ' failed');
process.exit(bad ? 1 : 0);
