# EgoTalk Phase 이력

## Phase 1: Foundation (2026-02-20)

### 완료 항목

1. **DB 스키마 적용**
   - 5개 테이블 생성: `ego_profiles`, `ego_friendships`, `ego_chat_rooms`, `ego_chat_room_members`, `ego_messages`
   - 5개 인덱스 생성 완료
   - `pgcrypto` 확장 활성화

2. **루트 설정**
   - `.gitignore` 생성
   - 루트 `package.json` 생성 (dev:client, dev:server 스크립트)

3. **Backend 초기 세팅 (server/)**
   - Express + Socket.IO + pg 구성
   - `src/db.ts`: PostgreSQL 연결 풀 (max 10)
   - `src/routes/health.ts`: `GET /health` 엔드포인트
   - `src/index.ts`: 서버 엔트리 (CORS, Socket.IO 포함)
   - TypeScript 타입 체크 통과

4. **Frontend 초기 세팅 (client/)**
   - React 19 + Vite 6 + TypeScript 구성
   - TanStack Query, Zustand, Socket.IO Client, React Router 설치
   - Vite proxy 설정 (`/api`, `/socket.io` → localhost:4000)
   - TypeScript 타입 체크 통과

### 검증 결과
- `curl http://localhost:4000/health` → `{"success":true,"data":{"status":"ok"}}`
- DB 연결 정상 (SELECT 1 성공)
- 서버/클라이언트 타입 체크 모두 통과

## Phase 2: Identity & Friends (2026-02-20)

### 완료 항목

1. **Backend API**
   - `POST /api/profiles/bootstrap`: device_id 기반 프로필 조회/생성 (race condition 방어)
   - `GET /api/friends?profile_id=&q=`: 친구 목록/검색 (즐겨찾기 우선, 이름순)
   - `PATCH /api/friends/:friendId/favorite`: 즐겨찾기 토글
   - `src/utils/validate.ts`: UUID 검증, 필수 필드 검증 유틸

2. **Frontend 구조**
   - React Router 설정: /friends, /chats, /profile 라우팅
   - 하단 탭 네비게이션 (Layout 컴포넌트, 56px 고정)
   - TanStack Query + Zustand 연동

3. **Frontend 페이지**
   - FriendsPage: 검색(300ms 디바운스), 즐겨찾기/전체 섹션, 즐겨찾기 토글
   - ChatsPage: 임시 플레이스홀더
   - ProfilePage: 현재 프로필 정보 표시

4. **앱 부트스트랩**
   - 자동 device_id 생성 (localStorage 영속)
   - 앱 시작 시 자동 프로필 bootstrap

### 검증 결과
- `POST /api/profiles/bootstrap` → 프로필 생성/조회 정상
- `GET /api/friends` → 빈 목록 정상 반환
- 서버/클라이언트 TypeScript 타입 체크 통과

## Phase 3: Chat List (2026-02-20)

### 완료 항목

1. **Backend API**
   - `GET /api/chats?profile_id=`: 채팅방 목록 (LATERAL JOIN으로 최근 메시지, unread_count, member_count 조회)
   - `POST /api/chats`: 채팅방 생성 (dm 중복 방지, 트랜잭션 처리)

2. **Frontend 채팅 목록**
   - ChatsPage: 채팅방 리스트 (아바타, 제목, 마지막 메시지, 시간, 미읽음 배지)
   - 시간 포맷: 오늘 HH:MM, 어제 "어제", 그 외 MM/DD
   - 미읽음 배지: 빨간 원 + 숫자 (99+)
   - 클릭 시 /chats/:roomId 이동 준비

3. **하단 탭 미읽음 배지**
   - Layout에서 전체 unread 합산 표시
   - 채팅 탭에 빨간 배지 (0이면 숨김, 100+ → "99+")

### 검증 결과
- 서버/클라이언트 TypeScript 타입 체크 통과

## Phase 4: Realtime Messaging (2026-02-20)

### 완료 항목

1. **Backend 메시지 API**
   - `GET /api/chats/:roomId/messages`: 커서 기반 페이지네이션 (has_more 포함)
   - `POST /api/chats/:roomId/messages`: 메시지 전송 (1~1000자 검증, 멤버십 체크)
   - `POST /api/chats/:roomId/read`: 읽음 처리 (last_read_message_at 갱신)
   - 공통 `checkMembership()` 헬퍼 추출

2. **Socket.IO 이벤트 (server/src/socket.ts)**
   - `room:join`: 방 입장 + 멤버십 검증
   - `message:send`: 메시지 DB INSERT → `message:new` broadcast + `chat:updated` emit
   - `message:read`: 읽음 갱신 → `message:read:update` broadcast

3. **Frontend 채팅방 (ChatRoomPage)**
   - 메시지 리스트: 내 메시지(오른쪽, 노란색) / 상대(왼쪽, 회색)
   - 날짜 구분선, 시간 표시 (HH:MM)
   - Socket.IO 연동: 실시간 메시지 수신 + Optimistic UI
   - 커서 기반 이전 메시지 로드 (스크롤 위치 복원)
   - 자동 스크롤 (하단에 있을 때만)
   - Enter 전송, Shift+Enter 줄바꿈
   - 입장 시 자동 읽음 처리

4. **useSocket 훅**
   - 앱 전체 싱글턴 Socket 인스턴스 관리

### 검증 결과
- 서버/클라이언트 TypeScript 타입 체크 통과

## Phase 5: Profile & Extras (2026-02-20)

### 완료 항목

1. **Backend API**
   - `PATCH /api/profiles/me`: 프로필 수정 (동적 SET, display_name/status_message/avatar_url)
   - `PATCH /api/chats/:roomId/mute`: 채팅방 알림 mute 토글
   - `POST /api/friends/add`: device_id 기반 친구 추가 (양방향 2 row, 트랜잭션)

2. **Frontend 프로필 편집**
   - ProfilePage: 인라인 편집 모드 (이름, 상태메시지, 아바타 URL)
   - 저장 시 API 호출 + Zustand 스토어 동기화
   - Device ID 표시 + 복사 버튼 (navigator.clipboard)

3. **Frontend 친구 추가**
   - FriendsPage: "+" 버튼 → Device ID 입력 패널
   - addFriend API 호출 → 성공/에러 피드백 → 목록 갱신

### 검증 결과
- 서버/클라이언트 TypeScript 타입 체크 통과

## Phase 6: Stabilization & Release (2026-02-20)

### 완료 항목

1. **Backend 운영 기능**
   - Rate Limiting: 인메모리 (분당 60요청, 429 응답, 자동 정리)
   - 구조화 로그: requestId + METHOD URL STATUS TIME_ms 출력
   - 에러 핸들링: catch-all 미들웨어 추가
   - 배포 준비: Procfile, engines >=18

2. **Frontend 안정화**
   - ErrorBoundary: 전역 에러 캐치 + "다시 시도" 버튼
   - API 에러 처리: 공통 apiFetch 래퍼 (res.ok 체크 + throw)
   - 배포 준비: vercel.json SPA rewrite
   - 접근성: focus-visible outline, font inherit
   - 반응형: #root max-width 480px 센터링

### 검증 결과
- 서버/클라이언트 TypeScript 타입 체크 통과
- `GET /health` → 정상 응답 + requestId 로그 출력
- `POST /api/profiles/bootstrap` → 201 + 프로필 생성 확인

### MVP 완료 상태
- 전체 6 Phase 구현 완료
- REST API 9개 + Socket.IO 이벤트 3쌍
- 페이지: 친구 목록, 채팅 목록, 채팅방, 프로필
- 실시간 메시징, 읽음 처리, 미읽음 배지
- 프로필 편집, 친구 추가, Rate Limit, 구조화 로그
