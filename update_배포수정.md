# Render 풀스택 배포 수정 내역

## 수정 일자: 2026-02-22

## 배경
Socket.IO(WebSocket) 사용으로 Vercel Serverless 불가 → Express가 프론트엔드 빌드 결과물도 서빙하는 **풀스택 단일 서비스** 방식으로 Render 배포.

---

## 수정된 파일

### 1. `server/src/index.ts`
- **CORS 환경변수 기반**: `CLIENT_URL` 환경변수로 CORS origin 제어 (기본값 `*`)
  - `app.use(cors({ origin: CLIENT_URL }))`
  - `new Server(httpServer, { cors: { origin: CLIENT_URL } })`
- **프론트엔드 정적 파일 서빙**: `client/dist/`를 Express static으로 서빙
- **SPA fallback**: API/Socket 외 모든 요청 → `index.html` 반환

### 2. 루트 `package.json`
- `build` 스크립트 추가: client 빌드 → server 빌드 순차 실행
- `start` 스크립트 추가: `server/dist/index.js` 실행

### 3. `render.yaml` (신규)
- Render Blueprint IaC 파일
- 환경변수: `DATABASE_URL`, `JWT_SECRET`, `NODE_ENV`, Supabase/VAPID 키

### 4. `client/vercel.json` (삭제)
- Vercel 미사용으로 제거

---

## 수정하지 않은 파일
- `client/src/api/index.ts`: API_BASE가 `/api` 상대경로 → 같은 서버이므로 변경 불필요
- `client/src/hooks/useSocket.ts`: `io()` URL 미지정 → 같은 origin 자동 연결
- DB 관련: Render 환경변수로 `DATABASE_URL` 설정하면 기존 코드 그대로 동작

---

## 검증 결과
- `npm run build` ✅ 성공 (client + server 모두 빌드)
- `npm start` ✅ 서버 정상 시작 (프론트엔드 정적 파일 서빙 포함)

---

## Render 배포 절차

1. 코드 커밋 & GitHub 푸시
2. Render Dashboard → New Web Service
   - GitHub repo: `sunghyeonhwang/ego_talk`
   - Build Command: `npm run build`
   - Start Command: `npm start`
   - Node version: 18+
3. 환경변수 설정:
   | 변수 | 설명 |
   |------|------|
   | `DATABASE_URL` | Supabase PostgreSQL 연결 문자열 |
   | `JWT_SECRET` | JWT 서명 키 |
   | `NODE_ENV` | `production` |
   | `SUPABASE_URL` | Supabase 프로젝트 URL |
   | `SUPABASE_SERVICE_ROLE_KEY` | 이미지 업로드용 |
   | `VAPID_PUBLIC_KEY` | Web Push 공개키 |
   | `VAPID_PRIVATE_KEY` | Web Push 비밀키 |
   | `VAPID_SUBJECT` | Web Push subject (mailto:) |
4. 배포 트리거 → 자동 빌드 & 시작
