# API Plan

메시지 웹앱 백엔드 API 및 소켓 이벤트 명세 초안.

## 1. 공통 규칙

- Base URL: `/api`
- 응답 포맷:
  - 성공: `{ success: true, data: ... }`
  - 실패: `{ success: false, message: "..." }`
- 식별 값:
  - 사용자: `profile_id` (UUID)
  - 방: `room_id` (UUID)
  - 메시지: `message_id` (UUID)

## 2. REST API

1. `POST /api/profiles/bootstrap`
- 설명: `device_id` 기반 프로필 조회/생성
- body:
```json
{ "device_id": "string", "display_name": "string" }
```

2. `PATCH /api/profiles/me`
- 설명: 내 프로필 수정
- body:
```json
{ "profile_id": "uuid", "display_name": "string", "status_message": "string", "avatar_url": "string" }
```

3. `GET /api/friends?profile_id=...&q=...`
- 설명: 친구 목록/검색

4. `PATCH /api/friends/:friendId/favorite`
- 설명: 즐겨찾기 토글
- body:
```json
{ "profile_id": "uuid", "favorite": true }
```

5. `GET /api/chats?profile_id=...&q=...`
- 설명: 채팅방 목록 조회
- 반환: last message, unread count 포함

6. `POST /api/chats`
- 설명: 채팅방 생성 (dm/group)
- body:
```json
{ "creator_id": "uuid", "type": "dm", "member_ids": ["uuid"], "title": "" }
```

7. `GET /api/chats/:roomId/messages?profile_id=...&cursor=...&limit=30`
- 설명: 메시지 목록 조회 (이전 메시지 페이징)

8. `POST /api/chats/:roomId/messages`
- 설명: 메시지 전송
- body:
```json
{ "sender_id": "uuid", "content": "text" }
```

9. `POST /api/chats/:roomId/read`
- 설명: 읽음 처리
- body:
```json
{ "profile_id": "uuid", "last_read_message_id": "uuid" }
```

## 3. Socket.IO Events

1. Client -> Server
- `room:join` `{ roomId, profileId }`
- `message:send` `{ roomId, senderId, content }`
- `message:read` `{ roomId, profileId, lastReadMessageId }`

2. Server -> Client
- `message:new` `{ roomId, message }`
- `message:read:update` `{ roomId, profileId, lastReadMessageId }`
- `chat:updated` `{ roomId, lastMessage, unreadCount }`

## 4. 검증 규칙

- `content`: trim 후 1~1000자
- UUID 형식 검증
- room member 여부 검증 후 메시지/읽음 처리
- 잘못된 요청은 400, 권한/멤버 오류는 403, 미존재는 404

## 5. 에러 코드 예시

- `INVALID_INPUT`
- `ROOM_NOT_FOUND`
- `NOT_A_MEMBER`
- `MESSAGE_TOO_LONG`
- `INTERNAL_ERROR`

## 6. 운영 API/정책 확정

1. 식별
- 요청 기본 식별자는 `profile_id` 사용
- `profile_id`는 `POST /api/profiles/bootstrap`에서 발급/조회

2. 실시간
- Socket.IO 단일 이벤트 채널 사용

3. unread
- `last_read_message_at` 기반 계산으로 통일
- `POST /api/chats/:roomId/read`는 최종 읽음 시각을 갱신

4. 품질/운영
- 메시지 길이 제한: 1~1000자(trim)
- Rate limit 적용
- 헬스체크: `GET /health` -> `{ success: true, data: { status: "ok" } }`
