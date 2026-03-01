# Forage — Backend Handoff (Mar 1, 2026)

## 스택 요약

| 레이어 | 기술 |
|---|---|
| Frontend | Next.js 14 (App Router) + PixiJS + Framer Motion |
| Backend | Convex (DB + Actions + Mutations + Queries) |
| 벤더 발굴 | Tavily API (search + extract) |
| 이메일 | AgentMail SDK (`agentmail` npm) |
| 웹폼 자동 제출 | Browser Use API v3 |
| AI | Anthropic Claude `claude-sonnet-4-6` |
| 배포 | Vercel (frontend) + Convex Cloud (backend) |

---

## ✅ 완성된 기능

### 1. 온보딩 (Onboarding)
- `welcome → avatar → company → needs → done` 5단계 플로우
- Google 계정 연동 시 이름/아바타 자동 입력
- `CompanySetup`: 기존 사업 vs 신규 아이디어 분기
  - 신규 아이디어 입력 시 Claude가 공급망 breakdown 자동 생성 (`analyzeProductNeed`)
- `NeedsSelector`: 필요한 카테고리 선택 → quest 자동 생성
- Convex users 테이블에 저장, localStorage에 userId 캐시

### 2. 벤더 발굴 (Foraging)
- `forageForVendors` action: 전체 오케스트레이션
  - Tavily `researchVendors`로 검색 (~2-4초)
  - 집계 사이트/블로그 필터링 (`isAggregatorResult`)
  - 도메인 중복 제거 (rootDomain dedup)
  - 상위 4개 병렬 처리 (`Promise.all`)
- 검색 쿼리: `"${query} factory OEM private label 'get a quote' OR 'minimum order'"`
- 각 벤더에 동물 캐릭터 자동 배정 (fox/raccoon/bear 등 10종)
- village chat에 실시간 진행 메시지 표시

### 3. 이메일 발송 (Outreach)
- AgentMail 카테고리별 공유 inbox 사용:
  - `forage-mfg@agentmail.to` (manufacturing)
  - `forage-ingredients@agentmail.to` (ingredients)
  - `forage-legal@agentmail.to` (legal)
  - `forage-distribution@agentmail.to` (distribution)
  - `zone@agentmail.to` (other)
- 모든 발송 이메일 subject에 `[ref:vendorId]` 태그 삽입 → 답장 매칭에 사용
- 발송 후 Convex messages 테이블에 기록
- 사용자 확인 이메일 발송 (`sendConfirmationEmail`)

### 4. 웹폼 자동 제출 (Browser Use)
- `fillContactForm`: Browser Use API v3로 문의 폼 자동 작성 + 제출
- Convex 액션 타임아웃(~2분) 회피 위해 `ctx.scheduler.runAfter(0, ...)` 비동기 실행
- reCAPTCHA 처리 시도, 실패 시 report 후 계속 진행
- 제출 성공 시 DB에 `formSubmitted: true` 업데이트

### 5. 웹훅 수신 (Inbound Email Webhook)
- endpoint: `https://optimistic-armadillo-182.convex.site/agentmail-webhook`
- AgentMail `message.received` 이벤트 처리
- payload: `body.message.inbox_id`, `body.message.from`, `body.message.extracted_text`
- `[ref:vendorId]` subject 파싱으로 정확한 벤더 매칭

### 6. 답장 처리 (Reply Handling)
- 웹훅 → `handleInboundEmail` action 전체 파이프라인:
  1. vendorId 매칭 (subject ref → inbox fallback)
  2. inbound 메시지 DB 저장
  3. vendor stage → `"replied"` 업데이트
  4. Claude `analyzeVendorReply` 1회 호출:
     - summary, sentiment 추출
     - quote (price / MOQ / leadTime) 구조화
     - keyPoints 추출
     - draft 답장 생성
  5. quote 있으면 vendors DB에 저장
  6. draft 메시지 저장 (`isDraft: true`)
  7. 사용자에게 chat 알림 + "Send reply ✓ / Edit first / Skip" 선택지

### 7. 드래프트 승인 후 발송 (sendDraftReply)
- `sendDraftReply` action: 사용자가 "Send reply ✓" 선택 시 실행
- draft 메시지 fetch → AgentMail로 실제 발송 → `markSent` → stage → `"negotiating"`

### 8. Village UI (게임)
- WASD 이동, proximity 시스템 (NPC/HQ 근처 가면 💬 E 프롬프트)
- 각 벤더 = 동물 NPC, 집 형태로 맵에 표시
- HQ Interior: 신규 벤더 리뷰 (Invite/Pass), 답장 대기 탭
- Move-in 컷신 (2초 걷기 → 2.2초에 집 애니메이션)
- 알림벨: unseen 답장 뱃지, 새 답장 시 흔들림 + 사운드
- Forage Search: HQ에서 검색창 열기, Claude 선택지 흐름

### 9. Decision Tree
- `/tree` 페이지
- `workflowNodes` 테이블 기반 벤더 파이프라인 시각화
- stage별 노드 (discovered → contacted → replied → negotiating → closed/dead)

### 10. Convex 스키마 / DB
- `users`, `quests`, `vendors`, `messages`, `chatMessages`, `workflowNodes` 6개 테이블
- 주요 인덱스: `by_quest`, `by_user`, `by_inbox`, `by_vendor`

---

## ⚠️ 알려진 버그 (Known Bugs)

### 🔴 Critical

| # | 위치 | 버그 |
|---|---|---|
| 1 | `agentmail.ts:sendDraftReply` | subject에 `[ref:xxx]` 이중 삽입. `subjectWithRef(args.subject, args.vendorId)` 호출 시 subject가 이미 ref 포함 상태. |
| 2 | `tavily.ts:researchVendors` L210 | `info@`, `support@` 필터가 너무 공격적 — 실제 문의 이메일도 제거됨. `noreply|no-reply|privacy` 만 필터해야 함. |
| 3 | `agentmail.ts:createVendorInbox` | 이메일/폼 발송 여부 관계없이 항상 stage를 `"contacted"`로 올림. 발견만 된 벤더는 `"discovered"` 유지해야 함. |

### 🟡 Minor / Data Issues

| # | 위치 | 문제 |
|---|---|---|
| 4 | `tavily.ts:researchVendors` | 추출한 `contactEmail`을 vendors DB에 저장 안 함 (`forage.ts`에서 email 사용 후 DB patch 없음). |
| 5 | `agentmail.ts:sendDraftReply` | draft 조회를 위해 `listByVendor`로 전체 메시지 로드 후 find. `messages.get` 쿼리가 없음 — DB에 ID로 직접 조회하는 게 효율적. |
| 6 | `agentmail.ts:handleInboundEmail` L221 | `getByInboxId` fallback: 카테고리 inbox는 벤더 여러 명이 공유하므로 `.first()` 반환이 의미 없음. ref 없으면 누가 답장한 건지 알 수 없음. |

### 🗑️ Dead Code (사용 안 되는 함수들)

| 함수 | 파일 | 상태 |
|---|---|---|
| `analyzeVendor` | `claude.ts` | 미사용. 추후 벤더 평가 기능에 활용 가능 |
| `draftNegotiationEmail` | `claude.ts` | 미사용. 협상 기능 구현 시 활용 |
| `outreachVendor` | `agentmail.ts` | 미사용 (forageForVendors가 직접 sendEmail 호출) |
| `findVendors` | `browserUse.ts` | 미사용 (Tavily로 대체됨) |
| `outreachVendorFull` | `browserUse.ts` | 미사용 (Tavily + sendEmail 분리로 대체) |
| `scrapeWebsite` | `browserUse.ts` | 미사용 |
| `searchVendors` | `tavily.ts` | 미사용 (`researchVendors`로 통합됨) |
| `extractCompanyInfo` | `tavily.ts` | 미사용 |
| `listInboxMessages` | `agentmail.ts` | 미사용 |

---

## 🚧 미구현 기능 (Not Yet Built)

| 기능 | 설명 | 우선순위 |
|---|---|---|
| 협상 플로우 | 벤더 여러 개 quote 비교 후 Claude가 협상 이메일 드래프트 (`draftNegotiationEmail` 존재하나 UI 없음) | Medium |
| 온보딩 웹사이트 스크랩 | URL 입력 → Browser Use/Tavily로 회사 정보 자동 추출 (스키마 `extractedCompanyData` 필드 있음) | Low |
| vendor stage "dead" 처리 | Dead로 마크 시 Decision Tree에서 제거 + 사유 기록 | Low |
| 모바일 반응형 | 현재 PC 위주, 모바일 최적화 미완 | Medium |
| 실제 Google 로그인 | `googleUser` prop 처리 코드 있으나 OAuth 설정 미완인지 확인 필요 | Depends |
| Quote 비교 UI | 여러 벤더 quote를 나란히 비교하는 테이블 뷰 | Low |

---

## 🔑 환경 변수 (Convex + Vercel 모두 설정 필요)

```
ANTHROPIC_API_KEY      # Anthropic Console
BROWSER_USE_API_KEY    # cloud.browser-use.com
AGENTMAIL_API_KEY      # AgentMail Dashboard
TAVILY_API_KEY         # Tavily Dashboard
NEXT_PUBLIC_CONVEX_URL # npx convex dev 자동 설정
```

> Convex에는 `npx convex env set KEY value` 로 별도 설정 필요 (Vercel .env와 별개)

---

## 🌐 AgentMail 웹훅 설정

- **URL**: `https://optimistic-armadillo-182.convex.site/agentmail-webhook`
- **이벤트**: `message.received`
- **Secret**: `whsec_Wn7AcsoOZC2OrETXHhClu8D6tdbbFOxn`
- 현재 AgentMail 대시보드에 등록 완료

---

## 📁 주요 파일 구조

```
convex/
  schema.ts                  # DB 스키마
  vendors.ts                 # 벤더 CRUD
  messages.ts                # 이메일 메시지 CRUD
  chatMessages.ts            # 채팅 메시지 CRUD
  quests.ts                  # 퀘스트 CRUD
  users.ts                   # 유저 CRUD
  workflowNodes.ts           # Decision tree 노드
  http.ts                    # AgentMail 웹훅 endpoint
  demo.ts                    # 데모용 시드 데이터
  actions/
    forage.ts                # 메인 오케스트레이션 (벤더 발굴 전체)
    agentmail.ts             # 이메일 발송/수신 처리
    claude.ts                # Claude API 호출
    tavily.ts                # 웹 검색/스크래핑
    browserUse.ts            # 웹폼 자동 제출

src/
  app/
    page.tsx                 # 온보딩 (/)
    village/page.tsx         # 게임 맵 (/village)
    tree/page.tsx            # Decision tree (/tree)
  components/
    onboarding/              # OnboardingFlow, CompanySetup, NeedsSelector
    village/                 # VillageCanvas, NPC, GameHUD, ForageSearch,
                             # NPCDialogue, HQInterior, VillageTutorial
    vendor/                  # VendorDetail, EmailThread, DealProgress
    chat/                    # ChatBar, ChatMessage, ChoiceButtons
    tree/                    # DecisionTree, TreeNode
```
