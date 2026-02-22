# Dev Plan

카카오톡 유사 메시지 웹앱의 개발 실행 계획 문서.

## 1. 목표

- 필수 기능 5개를 MVP로 구현한다.
  - 친구 목록 탭
  - 채팅 목록 탭
  - 채팅방(대화 화면)
  - 하단 탭 네비게이션
  - 프로필 상세/부가 기능
- 기술 스택:
  - Frontend: React + TypeScript + Vite
  - Backend: Express + TypeScript + Socket.IO
  - DB: PostgreSQL (Supabase)
- 전제: Supabase Auth는 사용하지 않는다.

## 2. 아키텍처

1. Frontend(Web)
- React Router 기반 탭/페이지 전환
- 서버 상태: TanStack Query
- UI 상태(탭 선택, 입력 draft 등): Zustand

2. Backend(API + Realtime)
- REST API: 목록/조회/생성/수정
- Realtime: Socket.IO (WebSocket)
- 권한 모델: 인증 미사용 MVP, `device_id` 기반 사용자 식별

3. Database
- Supabase PostgreSQL 사용
- 클라이언트에서 DB 직접 접근 금지
- 모든 DB 접근은 Express 서버를 통해 수행

## 3. 기능별 구현 범위

1. 친구 목록 탭
- 친구 조회
- 이름/상태메시지 검색
- 즐겨찾기 토글

2. 채팅 목록 탭
- 채팅방 리스트 조회
- 마지막 메시지, 마지막 시간, 미읽음 카운트 표시

3. 채팅방
- 메시지 목록 조회(커서 기반 페이징)
- 메시지 전송
- 읽음 처리
- 소켓 기반 실시간 수신

4. 하단 탭 네비게이션
- 친구 / 채팅 / 내 프로필
- 채팅 탭 미읽음 총합 배지

5. 프로필 상세 / 부가 기능
- 프로필 수정(이름, 상태메시지, 아바타 URL)
- 방 단위 알림 mute
- 기본 설정 저장(로컬 스토리지)

## 4. API/실시간 설계 원칙

- REST 응답 포맷 통일:
  - 성공: `{ success: true, data: ... }`
  - 실패: `{ success: false, message: "..." }`
- 입력 검증 필수:
  - 메시지 공백/길이 제한
  - UUID 형식 검증
- Socket.IO 이벤트:
  - `room:join`
  - `message:send`
  - `message:new`
  - `message:read`

## 5. 보안/운영 원칙 (Auth 미사용 전제)

- `SUPABASE_SERVICE_ROLE_KEY`는 서버 환경변수로만 사용
- 클라이언트 번들에 시크릿 키 포함 금지
- Rate limit 적용
- 메시지 길이 제한 및 기본 콘텐츠 필터

## 6. 단계별 일정 (2주 MVP, Phase 기준)

1. Phase 1: Foundation (Day 1-2)
- 프로젝트 초기 세팅(React/Vite + Express)
- Supabase PostgreSQL 연결
- 기본 스키마/인덱스 적용

2. Phase 2: Identity & Friends (Day 3-4)
- 프로필 bootstrap(`device_id + profile_id`)
- 친구 목록/검색 API + UI
- 즐겨찾기 토글

3. Phase 3: Chat List (Day 5-6)
- 채팅 목록 API + UI
- 마지막 메시지/시간/미읽음 집계

4. Phase 4: Realtime Messaging (Day 7-9)
- 채팅방 메시지 API(조회/전송)
- Socket.IO 실시간 송수신
- 읽음 처리(`last_read_message_at`)

5. Phase 5: Profile & Extras (Day 10-11)
- 프로필 상세/편집
- 부가 기능(mute, 즐겨찾기 보완)

6. Phase 6: Stabilization & Release (Day 12-14)
- 통합 테스트/버그 수정
- 성능/운영 점검(rate limit, 로그, `/health`)
- 배포 구성 및 릴리즈 체크

## 7. 완료 기준 (Definition of Done)

- 필수 5개 기능이 정상 동작
- 채팅방에서 실시간 메시지 왕복 확인
- 미읽음 배지/읽음 처리 정상
- 모바일 폭(375px)에서 UI 사용 가능
- 서버 장애/검증 오류 시 사용자 메시지 노출

## 8. 리스크 및 대응

1. 인증 미사용으로 인한 사용자 위변조 가능성
- 대응: 추후 익명 인증 또는 OTP 도입을 백로그에 등록

2. 실시간 연결 불안정
- 대응: 소켓 재연결 로직 + 폴링 fallback 검토

3. 메시지 트래픽 증가 시 성능 저하
- 대응: 인덱스/페이징/아카이빙 전략 수립

## 9. 확정 기술 결정

1. 사용자 식별
- `device_id + profile_id` 유지

2. 실시간 통신
- `Socket.IO` 단일 채택 (Supabase Realtime 미사용)

3. 친구 관계 저장
- `friendships` 양방향 2 row 저장

4. unread 계산
- `chat_room_members.last_read_message_at` 기준

5. 배포 구조
- 프론트: Vercel
- 백엔드: Render/Fly

6. 최소 운영 기준
- Rate limit
- 입력 검증/메시지 길이 제한
- 공통 에러 포맷
- `/health` 헬스체크
- 구조화 로그
