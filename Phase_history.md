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
