# Java / Spring Boot Conventions

> Scope: the PMS backend. Referenced from the root `CLAUDE.md`, so it holds only
> rules that are "always true".
>
> Carried over from `pms_mcp_v3` on 2026-09-19 and rewritten for v4: the two-app /
> two-dev framing, the MCP clauses and v3's module list are gone. What survived is
> what was paid for in production — §6 in particular is a list of measured failures.
> Rules that apply only once ROADMAP F9 (MCP) starts are parked in the 부록.

## 1. Comments

- **Classes & methods**: Javadoc `/** ... */`. Explain purpose and intent.
    - Use `@param`/`@return` only when they remove ambiguity.
- **Fields**: single-line `//` comment **only when it carries information the name does not** — a constraint, unit, default, or the decision it comes from. Restating the field name (`// 식별자` on `id`) is noise; omit it.
- **No HTML tags**: `<ul>`, `<p>`, `<code>` etc. are forbidden in Javadoc. Use `-` for lists and blank lines for paragraphs.
- **All Javadoc and comments are written in Korean.**
- **Exception**: no comments on default constructors, getters, or setters.

## 2. Formatting

- **Braces**: **always** required.
    - Forbidden: `if (cond) return;`
    - Required: `if (cond) { return; }`
- **Method parameter wrapping**: when parameters must span multiple lines, keep the opening parenthesis on the same line and put each parameter on its own line with double indentation.
  ```java
  // correct
  private int layoutParagraphOnCurrentPage(
          ParagraphNode paragraphNode,
          int startIndex,
          LayoutContext context) {

  // wrong — aligned after the opening parenthesis
  private int layoutParagraphOnCurrentPage(ParagraphNode paragraphNode,
                                           int startIndex,
                                           LayoutContext context) {
  ```
- **Right after a method declaration**: **[important]** no blank line after the opening brace. Start the body **immediately**.
  ```java
  // correct
  private void renderChildren(Frame frame, float absX) {
      float currentX = 0;
  }

  // wrong
  private void renderChildren(Frame frame, float absX) {

      float currentX = 0;
  }
  ```
- **Vertical whitespace (blank lines)**:
    - **Right after a class declaration**: no blank line.
    - **Before `return`**: always a blank line. **Exception**: unnecessary when a control block contains only the `return`.
    - **Before `break` in a switch-case**: always a blank line when the case block contains logic.
    - **Around control statements**: always a blank line before and after `if`, `while`, `for`, `switch`, etc. **Exception**: unnecessary when the control statement is the method's only statement (excluding a trailing return/throw).
- **Lambdas**: single-line lambdas use the concise form (omit `{}` and `;`).
    - Example: `list.forEach(item -> process(item));`
    - Forbidden: `list.forEach(item -> { process(item); });`
- **toString()**: `ClassName{key=value, ...}` format.
- **Imports**: **always** use imports instead of fully-qualified names.
- **Minimize else**: avoid `else`/`else if`; keep the happy path flat with **guard clauses** (early `return`/`break`/`continue`).
- **No double negation**: `!isNotEmpty()` is forbidden. Simple negation (`!isEmpty()`) is allowed.

## 3. Preferred Java patterns

- **Records first**: DTOs, value objects, and `@ConfigurationProperties` are written as **records**. Immutability is the default and it is terser than Lombok.
- **Prefer lambdas**: lambdas over anonymous classes. Actively use functional interfaces (`Function`, `Predicate`, `Consumer`, `Supplier`, ...).
- **No Lombok** (2026-08-20 — aligned with actual practice; no module uses it): records and explicit constructors already cover what Lombok would generate. Do not add the dependency.
    - JPA entities: protected no-arg constructor + **no setters** — state changes go through intent-revealing methods (`updateProgress(int rate)`).
- **Immutability**: fields are `final` by default. Remove `final` only when mutability is explicitly needed.

## 4. Spring rules

- **Dependency injection**: constructor injection only (explicit constructor + `final` fields). Field `@Autowired` is forbidden.
- **Use Boot-managed beans**: beans Boot auto-configures (`ObjectMapper`, `Clock`, ...) are injected, never instantiated inline — a hand-made instance silently drops the modules and settings Boot registered. Before `new`-ing a framework type, check whether a bean already exists.
- **Caller identity in one place**: controllers obtain the authenticated caller via `@AuthenticationPrincipal` or a custom `HandlerMethodArgumentResolver` — hand-parsing `authentication.getName()` in each controller is forbidden (repetition is the smell).
- **Token claim validation belongs to the decoder**: compose `OAuth2TokenValidator`s (`DelegatingOAuth2TokenValidator`) and attach them where the decoder is built. Decode-then-hand-check-claims with if-statements is forbidden — one codebase, one validation style.
- **`@Transactional`**: on the service layer only (never controllers or repositories). Query services default to `@Transactional(readOnly = true)`.
- **Query before you mutate** (2026-08-21): inside a transaction, run repository queries — duplicate checks, existence checks — *before* changing any entity. A query on a dirty session makes JPA flush first, so one use case increments `@Version` twice and writes the change before its own validation has run. Observed live: a single project edit moved `version` 1 → 3.
- **Never expose entities**: controllers never return entities. Convert to record DTOs in the service layer and include only the fields the caller needs — a response DTO is not a copy of the entity, and internal identifiers must not ride along by accident.
- **One response shape** (2026-08-22): every controller returns `ApiResponse<T>` — `{success, data}` on success, `{success, error}` on failure — including a 200 with no data for deletes. A list puts the §7 page envelope inside `data`. The only exception is `GET /api/auth/jwks`, whose shape RFC 7517 owns. Rationale: with an asymmetric contract the caller has to branch on the status code before it can even parse, and every client re-invents that branch.
- **Error codes are an enum, never a literal**: `ErrorCode` (common/exception) is the single definition of the §7 table and carries the HTTP status with each code. A code that lives as a string at the throw site lets a typo compile and ship, and lets the same meaning split into two spellings.
- **Exception → HTTP mapping**: throw `ApiException` subtypes carrying an `ErrorCode` and map them in one place via `@RestControllerAdvice`; the security chain's 401 writes the same envelope. Any adapter added later reuses this one mapping — no ad-hoc try-catch conversion at a call site.

  | Situation | HTTP | Error message direction |
  |------|------|--------------------------|
  | Auth failure | 401 | (blocked by the security chain) |
  | Unauthorized **write** attempt | 403 | "담당자만 가능" |
  | Resource missing **or query outside visibility** | 404 | "해당 데이터 없음" — **conceal existence itself** |
  | Optimistic lock conflict | 409 | prompt re-reading the latest values |
  | Input **format** violation (`@Valid` failure) | 400 | `VALIDATION_ERROR` — name the field |
  | Input **semantic/rule** violation (unknown enum value, role invariants, fixed targets) | 422 | explain the parameter error |

    - **404 concealment principle**: a resource the requester may not view returns 404, not 403 — "does not exist" and "cannot see" must be indistinguishable. This judgement lives inside the service layer and never moves to a controller or an adapter.
- **Input validation**: request DTOs are validated declaratively with jakarta validation (`@Valid`, `@NotNull`, ...); failures map to **400 `VALIDATION_ERROR`** (the table above). Semantic rule violations the annotations cannot express map to 422.
- **traceId must trace**: the error envelope's `traceId` is written to the server log together with the failure it identifies — an identifier the user can report but no one can correlate with a log line is forbidden.
- **Config binding**: prefer `@ConfigurationProperties` (record). `@Value` only for single values.

## 5. Spring Modulith package structure

> **v4's module list does not exist yet and is not guessed here.** One module per
> domain, and each module is created by the cycle that first needs it — never
> scaffolded ahead of its logic. The backbone (영업 · 솔루션 · 유지보수 + 이관) decides
> the first decomposition, so the list is written down only after B5.
> v3's list (`person · auth · project · resource · notification · audit`) is
> reference, not a plan: v4 organises around the three areas and the common
> `project` table, which is a different cut.
>
> **Cycles are the constraint that shapes the module graph.** When two modules each
> need something from the other, the one that *needs* defines an interface **in its
> own module root package** and the other implements it. Never satisfy a mutual need
> by having both sides import each other; that is exactly what `ModularityTest`
> rejects. (v3's worked example: `person.AccountPort`, implemented by `auth`.)
>
> The tree below is the **shape** of a module, not a list of v4's modules.

```
kr.co.proten.pms
├── common/                   # shared wiring — NOT a module (excluded from detection)
│   ├── config/               #   caller identity · request path · security chains
│   ├── exception/            #   ErrorCode + the exception types
│   └── web/                  #   ApiResponse · ApiError · PageResponse + the one handler
├── audit/                    # its own module since 2026-08-22 — it owns an entity
│   ├── AuditTrail · AuditQueryService · AuditAction · AuditSource   # public contract
│   ├── AuditEntry · AuditRecord                                     # public values
│   ├── service/{impl,entity}/                                       # internal
│   └── repository/                                                  # internal
└── project/                  # module = one domain
    ├── (root is empty)       #   nothing of project crosses the boundary
    ├── controller/           #   REST controllers
    │   └── dto/              #     request·response records
    ├── service/              #   use-case interfaces — internal, only this module calls them
    │   ├── impl/             #     implementations + internal collaborators
    │   │   └── scope/        #       a strategy family gets its own package
    │   ├── dto/              #     inputs/outputs the contract exchanges
    │   └── entity/           #     JPA entities, VOs, enums
    └── repository/           #   Spring Data repositories
```

The module root holds **only what crosses the boundary**, so that list *is* the
contract and widening it is a visible act — a new file at the top of the module.
Everything a module uses on its own stays in the layered sub-packages.

- **Three layers, one direction**: `controller → service → repository`. A layer never depends on one above it; `service` (the contract) never depends on `service/impl`. Enforced by `LayerRuleTest` (ArchUnit).
- **The JPA entity is the domain model** (2026-08-21 decision — supersedes the former hexagonal `api→application→domain←infra` layout with a framework-free domain). Entity invariants live on the entity: protected no-arg constructor, no setters, intent-revealing methods, state rules in factories. A separate pure-domain model mapped back and forth to a `*Jpa` twin is **not** used — the round-trip mapping cost each field twice and bought little.
- **Interface in `service/`, implementation in `service/impl/`.** Naming is `XxxService` / `XxxServiceImpl`. A contract only other modules use goes to the module root instead (see below). Internal collaborators (factories, resolvers, strategy implementations) live in `impl/` and stay package-private unless another package in the same module needs them.
- **No `package-info.java` — a module's public API is its root package.** Modulith's documented default is "the module base package is the API package; sub-packages are internal". Put the types other modules use *directly in the module root* and nothing else is needed. `package-info.java` exists only to carry `@NamedInterface`, whose whole job is to reopen a sub-package that the default had closed — i.e. to pay for having put the contract in the wrong place. All eight were deleted on 2026-08-22 by moving the seven person types and six audit types to their module roots; boundary verification is unchanged and still fails on a cycle or an internal reference. Before adding a `package-info` back, move the type to the module root instead.
- **Shared wiring is not a module.** `common` (error model, response envelope, caller identity) is passed to `ApplicationModules.of(Class, DescribedPredicate)` as the ignore predicate. A module everything depends on encapsulates nothing; making it one only re-records that fact.
- **Group a folder by kind, not by count.** Request/response records go to `controller/dto/`; a strategy family or a self-contained concept gets its own package under `impl/` (`impl/scope/` · `impl/requester/` · `impl/token/`). Many files of *one* kind in a folder is a list and reads fine; a folder that **mixes** kinds — use cases next to auth infrastructure next to a seed loader — is what actually costs reading time. Split on the mixing, not on the number.
- **A contract per domain concern, not per use case** (2026-08-22). "Small, segregated interfaces" (§7 ISP) means *a caller should not depend on methods it does not use* — so the test is **who consumes it**, not how many methods it has. Split when a contract has a distinct consumer or a distinct judgement axis; do not split a single domain's CRUD into one interface per verb. The smell that triggered this rule: nine project interfaces, six single-method, eight consumed only by `ProjectController`, every one of them injecting the same five collaborators — segregation that removed no coupling and multiplied the surface the `/mcp` adapter has to bind to. Keep decomposing the *implementation* (one judgement per class in `impl/`); that is where SRP pays.
- **Persistence stays in `service/entity/` and `repository/`**: `jakarta.persistence` may only be imported there. Web concerns (`org.springframework.web`/`http`) belong to `controller/` and to common's error-envelope conversion. The entity must not depend on `dto/` — conversion runs one way, dto ← entity. All enforced by `LayerRuleTest`.
- **Inter-module communication**: only through the types the other module put **in its root package** — that is its whole public API (see the `package-info.java` rule above; `@NamedInterface` is not used). Every sub-package — `controller/`, `service/`, `service/impl/`, `service/dto/`, `service/entity/`, `repository/` — is module-internal, so **entities and repositories cannot cross a module boundary** and links are by id. A module whose root is empty exports nothing: to let another module call it, move the contract (and the DTOs it returns) to the root — a visible act, not a config flag. Verified by `ModularityTest`.
- These boundaries are enforced by the Modulith/ArchUnit tests — when a test breaks, fix the structure, not the test.

## 6. Code quality

- Remove unused variables, imports, and methods
- **Ask the DB, don't load-and-scan**: existence/count questions go through derived queries (`existsBy...`, `count()`), never `findAll()` + `isEmpty()`/`size()`. Deliberate load-all + in-memory filtering is allowed only with an ASSUMPTION comment stating the scale rationale and the revisit trigger.
- **Give optional query filters a type.** `(:param is null or col = :param)` reaches PostgreSQL as an untyped null and fails with *"No function matches the given name and argument types"* — and `concat('%', :param, '%')` fails the same way. Build `like` patterns in Java and wrap the null test in `cast(:param as string|long|date)`. Both maintenance and project list queries hit this (2026-08-23); the failure is a runtime error on the *filterless* call, so a test that always passes a filter will not catch it.
- **Never branch on a caught exception inside a transaction.** Catching `NotFoundException` from an inner `@Transactional` call to try a second lookup marks the surrounding transaction rollback-only, and the follow-up query then returns wrong results *without* throwing (measured 2026-08-23 — `logsOf` returned a hit for an id that exists nowhere). Ask with an existence query (`existsById`, `findX().isPresent()`) instead. Exceptions are for outcomes the caller cannot proceed from, not for control flow.
- No duplicated code; minimize cognitive complexity
- No empty catch blocks (at minimum log or leave an intent comment)
- No raw types (specify generic types); compare strings with `equals()`
- Logger instead of `System.out.println`; resources via try-with-resources
- **Never log**: Authorization headers / raw tokens, personally identifiable information (resident registration numbers, salaries, ...), or full raw user questions / DB text. If needed, log only IDs or lengths. Keeping raw text for audit purposes is the job of the audit log (ROADMAP F7), not application logs.

## 7. SOLID · DDD

- **SOLID**: single responsibility (one reason to change) · open for extension, closed for modification · subtypes honor the supertype contract · small, segregated interfaces · depend on abstractions, not concretions.
- **DDD**:
    - **Ubiquitous Language**: class and method names reflect domain terms as-is (가동률/utilization, 과부하/overbooked, 배정/assignment).
    - **Entity vs Value Object**: distinguished by identity → Entity; compared by value → VO (record).
    - **Aggregate**: group related objects into one unit and access them only through the aggregate root.
    - **Repository**: abstracts querying behind Spring Data derived queries. The abstraction that matters here is that nothing outside `repository/` and `service/entity/` writes SQL or imports `jakarta.persistence`.
    - **Rules on the entity**: invariants and state rules live on the entity (factories, intent-revealing methods) — not in the service. `Project.create` deciding that a new project starts as 계약대기 is the shape to copy.
    - **Domain component**: logic belonging to neither an entity nor a VO gets its own small class in `service/impl/` next to the use case (`OrgScopeResolver`, `ProjectRoleResolver`) — one judgment per class, so the use case reads as orchestration.
    - **Service layer**: orchestrates use cases and manages transactions. **In this project, visibility, permissions, and 404 concealment are this layer's responsibility.**
    - **Open for extension**: when a rule varies along an axis the product actually edits (visibility scope, per-project permission), model each case as an implementation of a narrow interface and inject the set — adding a case then adds a class instead of editing a switch.

## 8. TDD (Test-Driven Development)

- **Red → Green → Refactor**: write a failing test before the production code. Production code written without a test does not count as done.
    1. **Red**: write a failing test that verifies the requirement, and confirm it fails.
    2. **Green**: write only the minimum code that makes the test pass. Do not generalize early.
    3. **Refactor**: improve structure only while tests are green (remove duplication, clean up names).
- **Unit of work**: 1 ROADMAP checklist item = start with a test list → digest it one Red-Green-Refactor cycle at a time.
- **Test priority**:
    - **Application services**: mandatory. Visibility/permission/404-concealment rules live here, so include cases per role (division head / team lead / member / admin).
    - **Domain**: entity/VO invariants via unit tests.
    - Do not test getters/setters or trivial delegation.
- **Test style**:
    - Names: `methodName_condition_expectedResult`, or Korean via `@DisplayName`.
    - Structure: separate with Given-When-Then comments.
    - Unit tests isolate collaborators with Mockito; keep boundary tests (Modulith/ArchUnit) and integration tests separate.
- **Integration test DB**: anything that touches SQL dialect runs on Testcontainers (PostgreSQL) — an H2 pass there is meaningless. Dialect-independent semantics (auth flow, error envelope shape) may run on H2 for speed; state that rationale in the test's class comment (2026-08-20 — codifies the M1a/M1b practice).
- **Link to verification gates**: `bash scripts/verify.sh` runs the tests accumulated through TDD. Writing tests in a batch afterwards hollows out this gate and is forbidden.

## 9. Example

```java
/**
 * 프로젝트 조회 유스케이스.
 * 가시성 규칙과 404 은닉이 이 계층에 있다. 구체 규칙은 F5 스펙이 정한다.
 */
@Service
@Transactional(readOnly = true)
public class ProjectQueryService {
    private final ProjectRepository projectRepository;
    private final VisibilityPolicy visibilityPolicy;

    public ProjectQueryService(ProjectRepository projectRepository, VisibilityPolicy visibilityPolicy) {
        this.projectRepository = projectRepository;
        this.visibilityPolicy = visibilityPolicy;
    }

    /**
     * 프로젝트 단건을 조회합니다.
     * 가시성 밖 프로젝트는 존재를 숨기기 위해 403이 아닌 404로 응답합니다.
     */
    public ProjectDetail getProject(Long projectId, RequesterContext requester) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ProjectNotFoundException(projectId));

        if (!visibilityPolicy.canView(requester, project)) {
            throw new ProjectNotFoundException(projectId);
        }

        return ProjectDetail.from(project);
    }
}
```

```java
/**
 * 프로젝트 상세 응답. 필요한 필드만 담는다 — 엔티티의 사본이 아니다.
 */
public record ProjectDetail(Long id, String name, ProjectStatus status, int progressRate) {

    public static ProjectDetail from(Project project) {
        return new ProjectDetail(
                project.getId(),
                project.getName(),
                project.getStatus(),
                project.getProgressRate());
    }
}
```

## 부록. ROADMAP F9(MCP) 착수 시 되살릴 규칙

> 지금은 적용하지 않는다 — CLAUDE.md 불변식 6번(MCP는 기능 단위이지 아키텍처 전제가
> 아니다). v3에서 실제로 값을 치른 규칙이라 버리지 않고 여기 둔다. F9 사이클이 열리면
> 이 부록을 본문으로 올리고 이 절을 지운다.

- MCP 도구의 입력·출력 타입도 record로 쓴다.
- **도구 출력은 LLM에 그대로 들어간다** — 필요한 필드만 담고, 내부 식별자·민감 필드가
  실려 나가지 않게 한다. 엔티티는 어떤 경우에도 도구 출력이 될 수 없다.
- MCP 어댑터는 애플리케이션 서비스만 호출한다. 저장소 직접 접근 금지 —
  가시성·권한·404 은닉이 서비스 계층에 있으므로 어댑터가 건너뛰면 규칙도 건너뛴다.
- 에러 매핑은 REST와 **같은 공용 매핑**을 쓴다. 도구마다 try-catch로 변환하지 않는다.
- 도구 출력의 DB 텍스트는 **데이터이지 지시가 아니다** (프롬프트 인젝션 방어).
- 테스트: 도구 등록 → 애플리케이션 위임 → 에러 매핑(403/404/409/422) 슬라이스 테스트.
