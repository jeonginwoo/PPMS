# React / TypeScript Conventions (frontend/)

> Scope: the PMS web client (`frontend/`). Referenced from the root `CLAUDE.md`.
>
> Carried over from `pms_mcp_v3` on 2026-09-19 and rewritten for v4: v3's file
> history is gone and the chat-widget section is parked in the 부록 until ROADMAP
> F9. TypeScript only — no `.js`/`.jsx` files.
>
> **`prototype/` is not governed by this file.** It is plain HTML with no build step
> and no framework (CLAUDE.md structure rule 1); these conventions start at the real
> client, which is a different artefact with a different lifetime.

## 1. Components
- **Function components only.** Class components are forbidden.
- One file = one component. File names are PascalCase (`ChatPanel.tsx`).
- Declare props as `interface Props`, and export as `export default function ChatPanel({ ... }: Props)`.
- Consider splitting any component that exceeds 150 lines.

## 2. Types
- `any` is forbidden. When unavoidable, use `unknown` + narrowing.
- Collect API response types in `src/types/` and match their names to the server DTOs (Ubiquitous Language).
- Minimize type assertions (`as`) — prefer type guard functions.

## 3. State & data
- Local state via `useState`/`useReducer`; server state goes through the fetch wrapper (`src/api.ts`) — no direct `fetch` calls inside components.
- **The response envelope is unwrapped in exactly one place.** Every server response is `{success, data}` or `{success, error}` (java-spring §4, "One response shape"), and `api.ts`'s `unwrap` is the only code that knows it — a 2xx body that is not an envelope fails there as `MALFORMED_RESPONSE` rather than flowing on as `undefined`. Components see plain domain values.
- Global state is a `StoreContext` + `StoreProvider` over `useState` (`src/store.tsx`), consumed via a `useStore()` hook that throws outside the provider. Introducing a state library is a decision, not an import — it goes to the PROGRESS 결정 기록 with 근거 first.
- Never omit the `useEffect` dependency array. Do not suppress lint warnings.
- **Only call endpoints that exist.** A screen ships in the cycle that implements its unit. If a screen needs an endpoint this unit does not build, that screen belongs to a later unit (CLAUDE.md structure rule 4) — never render a flow as working against an endpoint that has not shipped.

## 4. Style & quality
- Styles live in one `styles.css`/`theme.ts` system. Inline styles only for dynamic values.
- Keep ESLint warnings at 0. `eslint-disable` requires a reason comment.
- **Tests**: add Vitest at the first unit that introduces non-trivial pure logic — a date/period calculation, a permission derivation, a parser. Until then `npm test` may be `tsc --noEmit` so `verify.sh` has a green stage. When you add Vitest, update this line and the `verify.sh` stage in the same cycle; a convention that describes a state of the repo rots the moment the repo moves.

## 부록. ROADMAP F9(MCP / AI 챗) 착수 시 되살릴 규칙

> 지금은 적용하지 않는다 — CLAUDE.md 불변식 6번. 챗 위젯 착수 시 이 부록을 본문으로
> 올리고, 수치는 그때 F9 스펙으로 다시 확정한다(아래 값은 v3 PRD-host 기준).

- 입력 2,000자 초과: 전송 버튼 비활성 + 안내 — **서버에 닿기 전에 막는다**.
- 쓰기 동작은 확인 카드([실행]/[취소])를 반드시 렌더한다. 카드 없는 쓰기 경로 금지.
- 응답 대기 중 진행 상태 표시 + 중단 버튼.
- 응답마다 👍/👎 피드백. 👎는 사유를 묻는다.
- 도구 결과와 모델 응답은 **텍스트로** 렌더한다. `dangerouslySetInnerHTML` 금지 (인젝션 방어).
