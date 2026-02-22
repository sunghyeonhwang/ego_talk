# 🚀 EgoTalk 2차 개발 로드맵 (Phase 7-11)

**MVP 완료 이후 고도화 단계:** 인증 체계 전환, 미디어 스토리지 도입, 푸시 알림 및 UX 최적화

---

## 🛠️ 핵심 변경 요약

* **인증:** `device_id` 방식 → **Email/PW + JWT** (보안 및 멀티 디바이스 대응)
* **이미지:** 로컬 처리 → **Supabase Storage** (영속성 확보)
* **푸시:** **Web Push API** (백그라운드 알림 지원)
* **UI/UX:** **하단 탭 네비게이션** 고도화

---

## 📅 페이즈별 상세 계획

### [Phase 7] Auth: 보안 및 인증 시스템 구축 (필수 선행)

> **핵심:** 모든 API의 `profile_id` 파라미터를 제거하고 **JWT 토큰 기반**으로 전환합니다.

* **DB:** `email`(Unique), `password_hash` 컬럼 추가 및 `device_id` 제약 완화
* **Server:** `bcrypt`, `jsonwebtoken` 도입 / 인증 미들웨어 구현 / 소켓 인증 로직 추가
* **Client:** `authStore` (Token 관리), 로그인/회원가입 페이지, `AuthGuard` 적용
* **검증:** 회원가입 후 자동 로그인 및 새로고침 시 세션 유지 확인

### [Phase 8] Chat UX: 자동 타이틀 & 타이핑 인디케이터

* **Server:** 채팅방 목록 조회 시 참여자 명단 서브쿼리 추가 / 타이핑 상태(Start/Stop) 소켓 릴레이
* **Client:** `useTypingIndicator` 커스텀 훅 개발 (Debounce 적용)
* **검증:** 상대방 이름으로 방 제목 자동 설정 및 "OOO님이 입력 중..." 표시 확인

### [Phase 9] Media: 프로필 이미지 업로드 (Supabase)

* **Server:** `multer` & `@supabase/supabase-js` 도입 / `POST /api/upload/avatar` 엔드포인트
* **Client:** `AvatarUpload` 컴포넌트 개발 (이미지 미리보기 및 FormData 전송)
* **검증:** 5MB 제한 및 파일 확장자 필터링, 업로드 후 즉시 반영 확인

### [Phase 10] Push: Web Push 알림 시스템

* **DB:** `ego_push_subscriptions` 테이블 생성 (Endpoint, Key 저장)
* **Server:** `web-push` 패키지 도입 / 메시지 발송 시 push 릴레이 (Mute 방 제외)
* **Client:** Service Worker (`sw.js`) 등록 / 알림 권한 요청 및 토글 UI
* **검증:** 백그라운드 상태에서 알림 수신 및 클릭 시 해당 채팅방 이동 확인

### [Phase 11] UI/UX: 네비게이션 고도화 (독립 과업)

* **개선안:** * 활성 탭: **Primary Color** 적용, 검정 볼드체, **3px 하단 인디케이터** 추가
* 비활성 탭: 회색(#999) 처리 및 시각적 대비 강화
* 상호작용: 0.2s 트랜지션 효과 및 아이콘+텍스트 조합으로 크기 최적화



---

## 🏗️ 개발 의존성 및 팀 구성

### 🔗 의존 관계 도식

1. **Phase 7 (인증) 완료 필수** → 이후 Phase 8, 9, 10 진행 가능
2. **Phase 11 (UI/UX)** → 다른 작업과 독립적으로 언제든 병렬 진행 가능

### 👥 개발 리소스 배정 (Model-based Team)

| Phase | 구분 | Backend Model | Frontend Model |
| --- | --- | --- | --- |
| **P7** | **Auth (Critical)** | **Opus** (고정밀 로직) | Sonnet |
| **P8** | **Chat UX** | Sonnet | Sonnet |
| **P9** | **Image Storage** | Sonnet | Sonnet |
| **P10** | **Web Push** | **Opus** (복잡한 인프라) | Sonnet |
| **P11** | **UI/UX** | - | Sonnet |
