# All Plan

카카오톡 유사 메시지 웹앱의 통합 기획서.

## 0. 문서 목적

- 현재 분리된 기획 문서를 하나로 합쳐 실행 기준을 만든다.
- 핵심 방향, 개발 범위, UI 구조, API/DB 설계를 한 번에 참조할 수 있게 한다.

## 1. 프로젝트 개요

- 제품: 친구/채팅 중심의 메시지 웹앱
- 필수 기능:
  1. 친구 목록 탭
  2. 채팅 목록 탭
  3. 채팅방(대화 화면)
  4. 하단 탭 네비게이션
  5. 프로필 상세/부가 기능
- 기술 스택:
  - Frontend: React + TypeScript + Vite
  - Backend: Express + TypeScript + Socket.IO
  - Database: PostgreSQL(Supabase)
- 핵심 전제:
  - Supabase Auth 미사용
  - 실시간 기능은 WebSocket(Socket.IO) 기반

## 2. Agents 반영 전략

### 2.1 적용/비적용

- 핵심 적용:
  - `server-specialist`: API 구조/응답 포맷/서버 레이어 규칙
  - `vercel-deploy-optimizer`: 배포 전략/환경변수 관리
- 부분 적용:
  - `auth-specialist`: 입력 검증, 파라미터 바인딩, 오류 보안
- 참고 적용:
  - `react-single-file-dev`: 컴포넌트 분리/상태 분리 원칙
- 비적용:
  - JWT 기반 로그인/회원가입
  - 단일 index.html 고정 아키텍처

### 2.2 운영 원칙

- 클라이언트는 DB 직접 접근 금지
- Supabase 시크릿은 Express 서버 환경변수로만 관리
- API 응답 포맷은 통일

## 3. 개발 계획 (MVP)

### 3.1 아키텍처

1. Frontend
- React Router: 탭 및 화면 라우팅
- TanStack Query: 서버 상태 관리
- Zustand: UI 상태 관리

2. Backend
- REST API: 조회/생성/수정/읽음 처리
- Socket.IO: 실시간 메시지 송수신
- 사용자 식별: `device_id` 기반 프로필 bootstrap

3. Database
- Supabase PostgreSQL
- 모든 질의는 Express를 경유

### 3.2 기능 범위

1. 친구 목록 탭
- 친구 조회, 검색, 즐겨찾기

2. 채팅 목록 탭
- 마지막 메시지/시간/미읽음 카운트

3. 채팅방
- 메시지 페이징 조회
- 메시지 전송
- 읽음 처리
- 실시간 수신

4. 하단 탭 네비게이션
- 친구/채팅/내 프로필 + 채팅 배지

5. 프로필 상세/부가 기능
- 프로필 편집
- 알림 mute
- 기본 설정 로컬 저장

### 3.3 일정(2주, Phase 기준)

1. Phase 1: Foundation (Day 1-2)
- 초기 세팅 + DB 스키마 적용

2. Phase 2: Identity & Friends (Day 3-4)
- 프로필 bootstrap + 친구 기능

3. Phase 3: Chat List (Day 5-6)
- 채팅 목록 + 미읽음 집계

4. Phase 4: Realtime Messaging (Day 7-9)
- 채팅방 + WebSocket + 읽음 처리

5. Phase 5: Profile & Extras (Day 10-11)
- 프로필/부가 기능

6. Phase 6: Stabilization & Release (Day 12-14)
- 통합 테스트/배포/운영 점검

### 3.4 완료 기준(DoD)

- 필수 5기능 정상 동작
- 실시간 메시지 왕복 확인
- 미읽음/읽음 처리 일관 동작
- 모바일 375px 사용성 확보

## 4. 디자인 계획

### 4.1 화면 정보 구조

- `/friends`: 친구 리스트/검색/프로필 진입
- `/chats`: 채팅 리스트/미읽음/최근 메시지
- `/chats/:roomId`: 메시지 타임라인 + 입력창
- `/profile`: 내 프로필/설정
- 하단 고정 탭: 친구/채팅/내 프로필

### 4.2 핵심 컴포넌트

- `BottomTabBar`
- `FriendList`, `FriendItem`
- `ChatList`, `ChatListItem`
- `MessageList`, `MessageBubble`, `MessageInput`
- `ProfileCard`, `ProfileEditModal`
- `UnreadBadge`, `EmptyState`, `ErrorState`

### 4.3 UX 원칙

- 전송 즉시 Optimistic UI
- 신규 메시지 조건부 자동 스크롤
- 탭 전환 시 스크롤 위치 보존
- 로딩/빈 상태/오류 상태 명확 분리

### 4.4 디자인 토큰(초안)

- Primary: `#FEE500`
- Text Primary: `#111111`
- Border: `#E5E7EB`
- 기본 폰트: `Pretendard`, `Noto Sans KR`, sans-serif

### 4.5 디자인 레퍼런스(Figma)

- 참고 링크:
  - `https://www.figma.com/design/be3lEKoHO9ntnFUqGauZAt/Android-Material-Design-3-Messaging-App--Community-?node-id=142-1624&m=dev&t=NdugmCDFrT0tvuIY-1`
- 적용 원칙:
  - 채팅 목록/채팅방 UI 톤은 참고하되, 본 서비스 IA(친구/채팅/내 프로필 3탭)를 우선
  - 디자인 토큰은 본 문서의 토큰 기준을 우선 적용

## 5. API 계획

### 5.1 REST 엔드포인트

1. `POST /api/profiles/bootstrap`
2. `PATCH /api/profiles/me`
3. `GET /api/friends`
4. `PATCH /api/friends/:friendId/favorite`
5. `GET /api/chats`
6. `POST /api/chats`
7. `GET /api/chats/:roomId/messages`
8. `POST /api/chats/:roomId/messages`
9. `POST /api/chats/:roomId/read`

### 5.2 Socket.IO 이벤트

- Client -> Server:
  - `room:join`
  - `message:send`
  - `message:read`
- Server -> Client:
  - `message:new`
  - `message:read:update`
  - `chat:updated`

### 5.3 검증/오류 규칙

- 메시지 길이: 1~1000자(trim 기준)
- UUID 형식 검증
- 멤버십 검증 실패는 403
- 공통 에러 코드: `INVALID_INPUT`, `ROOM_NOT_FOUND`, `NOT_A_MEMBER`, `MESSAGE_TOO_LONG`, `INTERNAL_ERROR`

## 6. DB 스키마 계획

### 6.1 핵심 테이블 (prefix: `ego_`)

1. `ego_profiles`
2. `ego_friendships`
3. `ego_chat_rooms`
4. `ego_chat_room_members`
5. `ego_messages`

### 6.2 설계 포인트

- UUID PK + `gen_random_uuid()` 사용
- `messages(room_id, created_at desc)` 인덱스 적용
- unread는 `ego_chat_room_members.last_read_message_at` 기준 계산
- `ego_friendships`는 양방향 2 row 저장 (확정)
- 테이블 prefix: `ego_` (같은 DB에 다른 프로젝트 공존, 충돌 방지)

### 6.3 운영 보안

- Auth 미사용이므로 RLS 단순화 가능
- 서비스 키는 서버에서만 사용
- API 서버에서 접근 제어 강제

## 7. 리스크와 대응

1. 인증 부재에 따른 위변조 위험
- 대응: 차기 단계 익명 인증/OTP 도입

2. 실시간 연결 불안정
- 대응: 재연결 로직, fallback 폴링 검토

3. 트래픽 증가 시 성능 이슈
- 대응: 인덱스, 페이징, 메시지 아카이빙

## 8. 분리 문서 요약

### 8.1 `Agents.md` 요약

- 4개 에이전트 역할을 본 프로젝트에 맞게 적용 범위로 정리.
- 서버/배포 문서를 핵심으로 사용하고 인증/단일파일 규칙은 선택적으로 차용.

### 8.2 `Dev_plan.md` 요약

- 기술 스택, 기능 범위, 2주 일정, DoD, 리스크를 실행 단위로 정의.
- WebSocket(Socket.IO)을 기본 실시간 방식으로 확정.

### 8.3 `Design_plan.md` 요약

- 친구/채팅/채팅방/프로필 화면 구조와 하단 탭 UX를 명시.
- 상태별 UI(로딩/빈/오류), 컴포넌트, 디자인 토큰을 정의.

### 8.4 `API_plan.md` 요약

- 프로필 bootstrap부터 채팅 읽음 처리까지 핵심 REST 9개와 소켓 이벤트 정의.
- 검증/오류 규칙으로 서버 동작 일관성 확보.

### 8.5 `DB_schema.md` 요약

- Supabase Postgres 기준 핵심 테이블/인덱스/무결성 규칙 제시.
- unread 계산 기준과 운영 보안 원칙 명시.

## 9. 다음 실행 권장

1. `DB_schema.md` SQL을 Supabase에 적용
2. `API_plan.md` 기준 Express 라우트 스캐폴딩
3. `Design_plan.md` 기준 React 라우트/탭 UI 초기 구현

## 10. 사전 확정 항목 (Decision Log)

1. 사용자 식별 방식
- 확정: `device_id + profile_id` 방식 유지 (Auth 미사용 MVP)
- 이유: 구현 복잡도를 낮추고 MVP 속도를 확보할 수 있음
- 보완: `device_id`는 최초 생성 후 로컬 보관, 분실/재설치 이슈는 백로그로 관리

2. 실시간 전략
- 확정: `Socket.IO` 단일 사용
- 이유: 서버 로직과 이벤트 흐름을 한 곳에서 관리 가능, 디버깅 단순
- 비고: Supabase Realtime은 현재 범위에서 제외

3. 친구 관계 저장 방식
- 확정: `friendships` 양방향 2 row 저장
- 이유: 조회 쿼리가 단순해지고 친구 리스트/검색 성능과 구현 난이도 균형이 좋음

4. unread 계산 기준
- 확정: `last_read_message_at` 기준으로 계산
- 이유: `message_id` 기반 조인보다 계산/인덱싱이 단순하고 운영 중 복구가 쉬움
- 반영: `chat_room_members`에 `last_read_message_at` 컬럼 사용

5. 배포 구조
- 확정: 프론트 `Vercel`, 백엔드 `Render/Fly` 분리 배포
- 이유: WebSocket 장기 연결 운영에 유리하며 서버 수명 주기를 명확히 분리 가능
- 보완: CORS 화이트리스트, 환경변수 분리, 헬스체크 필수

6. 최소 운영/품질 기준
- 확정 항목:
  - Rate limit 적용
  - 메시지 길이 제한(1~1000)
  - 요청 유효성 검증
  - 공통 에러 응답 포맷
  - 서버 헬스체크(`/health`)
  - 구조화 로그(요청 ID, 에러 코드)
- 이유: Auth 미사용 MVP에서도 장애 분석과 abuse 완화가 가능해야 함
