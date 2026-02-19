# EgoTalk - 프로젝트 지침

카카오톡 유사 메시지 웹앱 MVP 프로젝트.

## 기술 스택

- Frontend: React + TypeScript + Vite (TanStack Query, Zustand)
- Backend: Express + TypeScript + Socket.IO
- DB: PostgreSQL (Supabase, Auth 미사용)
- 배포: Frontend → Vercel, Backend → Render/Fly

## 모델 사용 지침

난이도에 따라 모델을 분리하여 비용과 품질을 최적화한다.

### Opus (고난이도 작업)

다음 작업에는 반드시 Opus를 사용한다:

- 아키텍처 설계 및 구조 결정
- Socket.IO 실시간 메시징 로직 (연결 관리, 이벤트 흐름, 읽음 처리)
- DB 쿼리 최적화 및 복잡한 JOIN/집계 (unread 계산 등)
- 보안 관련 로직 (입력 검증, rate limit, 접근 제어)
- 복잡한 상태 관리 (Zustand store 설계, TanStack Query 캐시 전략)
- 버그 디버깅 (재현이 어려운 경쟁 조건, 소켓 동기화 이슈)
- 코드 리뷰 및 아키텍처 리뷰

### Sonnet (중-저난이도 작업)

다음 작업에는 Sonnet을 사용한다:

- REST API 라우트 작성 (CRUD 패턴)
- React 컴포넌트 구현 (UI 컴포넌트, 페이지 컴포넌트)
- 스타일링 및 레이아웃 작업
- 단순 유틸리티 함수 작성
- 테스트 코드 작성
- 설정 파일 생성/수정 (tsconfig, vite.config 등)
- 문서 업데이트

### Haiku (단순 작업)

다음 작업에는 Haiku를 사용한다:

- 파일 탐색 및 코드 검색
- 간단한 오타/이름 수정
- 빠른 코드 확인

## 에이전트 운영 지침

두 가지 에이전트 시스템을 함께 활용한다. 상황에 맞게 선택한다.

### 1. 서브에이전트 (Task 도구) — 세션 내 병렬 실행

단일 세션에서 독립적인 작업을 병렬로 실행할 때 사용한다.
결과는 메인 에이전트에게 보고된다.

| 서브에이전트 | 기본 모델 | 용도 |
|-------------|----------|------|
| **Explore** | Haiku | 코드베이스 탐색, 파일 검색, 패턴 분석 |
| **Plan** | inherit | 구현 전략 수립, 아키텍처 설계 |
| **general-purpose** | inherit | 복잡한 다단계 작업 |
| **Bash** | inherit | 터미널 명령, 빌드, 테스트 실행 |
| **feature-dev:code-architect** | inherit | 기능 아키텍처 설계 |
| **feature-dev:code-explorer** | inherit | 기존 코드 심층 분석 |
| **feature-dev:code-reviewer** | inherit | 코드 리뷰 |

모델 지정 예시:
```
Task(subagent_type="general-purpose", model="opus")   # 고난이도
Task(subagent_type="general-purpose", model="sonnet")  # 중난이도
Task(subagent_type="Explore", model="haiku")           # 탐색
```

활용 패턴:
- API 스캐폴딩(Sonnet) + DB 스키마 검증(Opus) 동시 실행
- 코드 탐색(Haiku) 여러 건을 병렬로 실행 후 결과 종합
- 백그라운드에서 테스트 실행하면서 다른 작업 계속 진행

### 2. 에이전트 팀 — 멀티 인스턴스 협업 (활성화 완료)

`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` 설정 완료.
각 팀원이 독립 컨텍스트 윈도우를 가지고 병렬 작업한다.

핵심 메커니즘:
- **공유 태스크 리스트**: 팀원이 작업을 자율적으로 claim/완료
- **다이렉트 메시징**: 팀원 간 message/broadcast로 직접 소통
- **팀 리드 (메인 세션)**: 태스크 생성, 배분, 조율
- **디스플레이**: in-process(Shift+Down 전환) 또는 split-pane(tmux/iTerm2)

팀 구성 예시:
```
"Backend 팀원(Opus): server/ 폴더 담당 - API 라우트, Socket.IO, DB 쿼리"
"Frontend 팀원(Sonnet): client/ 폴더 담당 - React 컴포넌트, 페이지, 스타일"
"QA 팀원(Sonnet): 코드 리뷰 + 테스트 작성"
```

Phase별 팀 운영:
- **Phase 1**: 단일 작업 (팀 불필요)
- **Phase 2~3**: Backend 팀원 + Frontend 팀원 2인 팀
- **Phase 4**: Backend(Socket.IO, Opus) + Frontend(채팅 UI, Sonnet) + QA(리뷰, Sonnet) 3인 팀
- **Phase 5**: Frontend 2인 팀 (프로필 + 부가기능)
- **Phase 6**: QA 중심 팀 (테스트 + 버그 수정)

주의사항:
- 파일 충돌 방지: 각 팀원이 다른 파일/폴더를 담당하도록 분배
- 팀원당 5~6개 태스크가 적정 규모
- 순차적 작업이나 같은 파일 수정에는 서브에이전트를 사용
- 토큰 사용량이 많으므로 병렬 효과가 큰 구간에서만 팀 구성

### 서브에이전트 vs 에이전트 팀 선택 기준

| 상황 | 선택 |
|------|------|
| 빠른 탐색/검색 여러 건 | 서브에이전트 (병렬 Task) |
| 단일 파일 내 복잡한 로직 구현 | 서브에이전트 (단일 Task, Opus) |
| 서로 다른 폴더의 독립 기능 동시 구현 | 에이전트 팀 |
| 구현 + 리뷰 동시 진행 | 에이전트 팀 |
| 코드 작성 후 즉시 결과 필요 | 서브에이전트 |
| 장시간 병렬 작업 (Phase 단위) | 에이전트 팀 |

## 병렬 개발 전략

### Phase별 병렬 조합

| Phase | 병렬 A | 병렬 B |
|-------|--------|--------|
| Phase 2 | 프로필 bootstrap API (Opus) | 친구 목록 UI (Sonnet) |
| Phase 3 | 채팅 목록 API + unread 집계 (Opus) | 채팅 리스트 UI (Sonnet) |
| Phase 4 | Socket.IO 서버 로직 (Opus) | 채팅방 UI 컴포넌트 (Sonnet) |
| Phase 5 | 프로필 편집 API (Sonnet) | 부가 기능 UI (Sonnet) |

### Ralph Loop 활용 시점

반복적 코드-테스트-수정 루프가 필요한 구간에서 사용한다:
- Phase 1: 프로젝트 스캐폴딩 → 빌드 확인 루프
- Phase 4: Socket.IO 이벤트 연동 → 테스트 → 디버그 루프
- Phase 6: 통합 테스트 → 버그 수정 → 재테스트 루프

## Agents 폴더 참고 범위

`agents/` 폴더의 에이전트 문서는 단일 파일 아키텍처 기반이므로 직접 적용하지 않는다.
원칙만 참고한다:

- `server-specialist`: API 응답 포맷 통일, 에러 처리 패턴
- `auth-specialist`: 입력 검증, SQL 파라미터 바인딩, 오류 메시지 보안
- `vercel-deploy-optimizer`: 배포 전략, 환경변수 관리
- `react-single-file-dev`: 컴포넌트 분리/상태 분리 원칙 (참고만)

## 데이터베이스

- Supabase PostgreSQL (Pooler, 포트 6543)
- 연결 정보: `.env`의 `DATABASE_URL` 사용
- 테이블 prefix: `ego_` (같은 DB에 다른 프로젝트 테이블이 공존하므로 충돌 방지)
- 테이블 목록: `ego_profiles`, `ego_friendships`, `ego_chat_rooms`, `ego_chat_room_members`, `ego_messages`
- RLS 비활성화, 접근 제어는 Express 서버에서 처리
- 코드에서 테이블 참조 시 반드시 `ego_` prefix 포함

## 코드 컨벤션

- 응답 포맷: `{ success: true, data: ... }` / `{ success: false, message: "..." }`
- UUID PK 사용 (`gen_random_uuid()`)
- 사용자 식별: `device_id + profile_id` (Auth 미사용)
- 실시간: Socket.IO 단일 사용
- unread 계산: `last_read_message_at` 기준
- 메시지 길이: 1~1000자 (trim 기준)
- 에러 코드: `INVALID_INPUT`, `ROOM_NOT_FOUND`, `NOT_A_MEMBER`, `MESSAGE_TOO_LONG`, `INTERNAL_ERROR`
