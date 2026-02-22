# Vercel + Render 분리 배포 수정 내역

## 수정 일자: 2026-02-22

## 배포 구성
- **프론트엔드 (Vercel)**: React SPA → `client/` 폴더
- **백엔드 (Render)**: Express + Socket.IO → `server/` 폴더
- Socket.IO(WebSocket)는 Vercel Serverless에서 불가하므로 백엔드만 Render에 배포

---

## 수정된 파일

### 1. `client/src/api/index.ts` — API URL 환경변수 기반
- `API_BASE`를 `VITE_API_URL` 환경변수 기반으로 변경
- 개발: `VITE_API_URL` 미설정 → 상대경로 `/api` (Vite proxy 사용)
- 프로덕션: `VITE_API_URL=https://egotalk-api.onrender.com` → 절대경로

```typescript
// Before
const API_BASE = '/api';

// After
const API_BASE = (import.meta.env.VITE_API_URL || '') + '/api';
```

### 2. `client/src/hooks/useSocket.ts` — Socket.IO 서버 URL 환경변수
- `io()` 호출 시 `VITE_API_URL` 환경변수로 서버 주소 지정
- 개발: undefined → 같은 origin (Vite proxy)
- 프로덕션: Render 서버 URL

```typescript
// Before
socketInstance = io({ ... });

// After
const serverUrl = import.meta.env.VITE_API_URL || undefined;
socketInstance = io(serverUrl, { ... });
```

### 3. `client/vercel.json` — 복원
- Vercel SPA fallback 설정 복원

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

### 4. `server/src/index.ts` — 정적 파일 서빙 제거, CORS 유지
- 프론트엔드가 Vercel에 있으므로 `express.static` + SPA fallback 제거
- `CLIENT_URL` 환경변수 기반 CORS 유지 (Render에서 Vercel 도메인 허용)

### 5. 루트 `package.json` — 서버 전용 빌드
- `build` → `build:server`로 변경 (클라이언트는 Vercel이 빌드)

### 6. `render.yaml` — 서버 전용 Blueprint
- 서비스 이름: `egotalk-api`
- `buildCommand`: `npm run build:server`
- `CLIENT_URL` 환경변수 추가

---

## 수정하지 않은 파일
- `client/vite.config.ts`: 개발용 proxy 설정 유지 (로컬 개발 시 필요)
- `server/src/socket.ts`: Socket.IO 로직 변경 없음
- DB 관련: 변경 없음

---

## 검증 결과
- `npm run build:server` ✅ 성공
- `cd client && npm run build` ✅ 성공

---

## 배포 절차

### Step 1: 백엔드 → Render

1. Render Dashboard → New Web Service
2. GitHub repo: `sunghyeonhwang/ego_talk`
3. 설정:
   - **Build Command**: `npm run build:server`
   - **Start Command**: `npm start`
   - **Node version**: 18+
4. 환경변수:

| 변수 | 값 |
|------|------|
| `DATABASE_URL` | Supabase PostgreSQL 연결 문자열 |
| `JWT_SECRET` | JWT 서명 키 |
| `NODE_ENV` | `production` |
| `CLIENT_URL` | `https://egotalk.vercel.app` (Vercel 배포 후 설정) |
| `SUPABASE_URL` | Supabase 프로젝트 URL |
| `SUPABASE_SERVICE_ROLE_KEY` | 이미지 업로드용 |
| `VAPID_PUBLIC_KEY` | Web Push 공개키 |
| `VAPID_PRIVATE_KEY` | Web Push 비밀키 |
| `VAPID_SUBJECT` | `mailto:your@email.com` |

5. 배포 후 URL 확인 (예: `https://egotalk-api.onrender.com`)

### Step 2: 프론트엔드 → Vercel

1. Vercel Dashboard → New Project
2. GitHub repo: `sunghyeonhwang/ego_talk`
3. 설정:
   - **Framework**: Vite
   - **Root Directory**: `client`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. 환경변수:

| 변수 | 값 |
|------|------|
| `VITE_API_URL` | `https://egotalk-api.onrender.com` (Render 배포 URL) |
| `VITE_VAPID_PUBLIC_KEY` | Web Push 공개키 (클라이언트용) |

5. 배포 후 URL 확인 (예: `https://egotalk.vercel.app`)

### Step 3: 상호 연결

1. Render 환경변수에 `CLIENT_URL` = Vercel 배포 URL 설정
2. Vercel 환경변수에 `VITE_API_URL` = Render 배포 URL 설정
3. 양쪽 재배포

---

## 개발 환경 (변경 없음)

로컬에서는 기존과 동일하게 동작:
```bash
# 터미널 1: 백엔드
npm run dev:server   # localhost:4000

# 터미널 2: 프론트엔드
npm run dev:client   # localhost:5173 → proxy → localhost:4000
```

`VITE_API_URL`이 미설정이면 상대경로(`/api`)를 사용하고, Vite proxy가 `localhost:4000`으로 전달.

---

## 아키텍처 다이어그램

```
[사용자 브라우저]
    │
    ├─ HTML/JS/CSS ──→ [Vercel] (client/dist)
    │
    ├─ /api/* 요청 ──→ [Render] (Express API)
    │
    └─ WebSocket ────→ [Render] (Socket.IO)
```
