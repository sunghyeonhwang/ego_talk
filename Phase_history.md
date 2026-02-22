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

---

## Phase 7: Auth - Email/PW + JWT (2026-02-20)

### 완료 항목

1. **DB 변경**
   - `ego_profiles`에 `email TEXT UNIQUE`, `password_hash TEXT` 컬럼 추가
   - `device_id` NOT NULL 제약 해제

2. **Backend 인증 시스템**
   - `server/src/middleware/auth.ts`: JWT 검증 미들웨어, `signToken()` 헬퍼, `req.profileId` 타입 확장
   - `server/src/routes/auth.ts`: `POST /api/auth/register` (bcrypt 해싱), `POST /api/auth/login`
   - 모든 라우트에서 `body/query의 profile_id` → `req.profileId` (JWT 기반)으로 전환
   - Socket.IO 인증 미들웨어: `socket.handshake.auth.token` → `socket.data.profileId`

3. **Backend 라우트 리팩토링**
   - `profiles.ts`: bootstrap 제거 → `GET /api/profiles/me`, `PATCH /api/profiles/me`
   - `friends.ts`: device_id 기반 → email 기반 친구 추가 (`friend_email`)
   - `chats.ts`: 모든 엔드포인트 `req.profileId` 사용

4. **Frontend 인증 체계**
   - `authStore.ts`: deviceId 제거, `token/email` 추가, `setAuth()/logout()` 액션
   - `api/index.ts`: Authorization 헤더 자동 추가, 401 시 자동 로그아웃
   - `LoginPage.tsx/.css`, `RegisterPage.tsx/.css`: 로그인/회원가입 페이지
   - `App.tsx`: AppBootstrap → AuthGuard 교체, `/login` `/register` 라우트 추가
   - `useSocket.ts`: `auth.token` 전달, `disconnectSocket()` 추가
   - 모든 페이지에서 profileId 파라미터 제거

### 검증 결과
- 회원가입 → 자동 로그인 → /friends 이동 확인
- 토큰 없이 API → 401 정상
- 서버/클라이언트 TypeScript 타입 체크 통과

## Phase 8: Chat Room Title + Typing Indicator (2026-02-20)

### 완료 항목

1. **Backend**
   - `chats.ts`: GET /api/chats 쿼리에 `member_names` 서브쿼리 추가 (본인 제외)
   - title이 null이면 member_names 사용: `title || member_names || '채팅방'`
   - `GET /api/chats/:roomId/info` 엔드포인트 추가
   - `socket.ts`: `typing:start`/`typing:stop` 릴레이 이벤트 추가
   - 소켓 연결 시 `socket.data.displayName` 캐싱

2. **Frontend**
   - `useTypingIndicator.ts`: 1초 throttle emitTyping, 5초 타임아웃 자동 제거
   - `ChatRoomPage.tsx`: typing indicator UI, 입력 시 emitTyping() 호출
   - `ChatRoomPage.css`: typing indicator 스타일

### 검증 결과
- 서버/클라이언트 TypeScript 타입 체크 통과

## Phase 9: Profile Image Upload - Supabase Storage (2026-02-20)

### 완료 항목

1. **Backend**
   - `server/src/routes/upload.ts`: `POST /api/upload/avatar` (multer + Supabase Storage)
   - 5MB 제한, JPEG/PNG/WebP/GIF만 허용
   - `avatars/{profileId}/{timestamp}.{ext}` 경로로 업로드
   - `ego_profiles.avatar_url` 자동 업데이트

2. **Frontend**
   - `AvatarUpload.tsx/.css`: 파일 선택, 미리보기, 업로드 컴포넌트
   - `ProfilePage.tsx`: 편집 모드에서 AvatarUpload 사용
   - `api/index.ts`: `uploadAvatar(file)` 함수 (FormData)

### 검증 결과
- 서버/클라이언트 TypeScript 타입 체크 통과
- 주의: SUPABASE_SERVICE_ROLE_KEY 실제 값 설정 필요, "avatars" 버킷 생성 필요

## Phase 10: Web Push Notifications (2026-02-20)

### 완료 항목

1. **DB 변경**
   - `ego_push_subscriptions` 테이블 생성 (endpoint, p256dh, auth 키 저장)
   - `idx_ego_push_subscriptions_user_id` 인덱스 추가

2. **Backend**
   - `server/src/routes/push.ts`: `POST /api/push/subscribe`, `DELETE /api/push/unsubscribe`
   - `server/src/utils/pushNotification.ts`: `sendPushToRoom()` (mute 제외, 만료 구독 자동 삭제)
   - `socket.ts`: message:send 후 `sendPushToRoom()` 호출

3. **Frontend**
   - `client/public/sw.js`: Service Worker (push → showNotification, 클릭 → 채팅방 이동)
   - `usePushNotification.ts`: subscribe/unsubscribe, 권한 상태 관리
   - `ProfilePage.tsx`: 알림 설정 섹션 (켜기/끄기 토글)

### 검증 결과
- 서버/클라이언트 TypeScript 타입 체크 통과
- 주의: VAPID 키 환경변수 설정 필요

## Phase 11: UI/UX - 하단 탭 네비게이션 (2026-02-20)

### 완료 항목

1. **Frontend**
   - `Layout.tsx`: 이모지 아이콘 → 인라인 SVG 컴포넌트 (FriendsIcon, ChatsIcon, ProfileIcon)
   - `Layout.css`: 활성 탭 스타일 강화
     - 활성: `#1a1a1a` 색상, `font-weight: 600`, 3px indicator bar (`::after`)
     - 비활성: `#999`, 0.2s transition
     - 탭 아이콘 크기 20px, 라벨 10px

### 검증 결과
- 서버/클라이언트 TypeScript 타입 체크 통과

---

### 2차 개발 완료 상태 (Phase 7-11)
- JWT 인증 체계 전환 완료 (email + password + Bearer token)
- REST API 추가: auth/register, auth/login, profiles/me, chats/:roomId/info, upload/avatar, push/subscribe, push/unsubscribe
- Socket.IO 이벤트 추가: typing:start/stop 릴레이, 소켓 JWT 인증
- 페이지 추가: LoginPage, RegisterPage
- 컴포넌트 추가: AvatarUpload, TypingIndicator (inline)
- 훅 추가: useTypingIndicator, usePushNotification
- UI 개선: SVG 탭 아이콘, 활성 탭 indicator bar
