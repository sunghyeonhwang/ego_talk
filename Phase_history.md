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
