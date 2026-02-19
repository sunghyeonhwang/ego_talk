# DB Schema Plan (PostgreSQL / Supabase)

Auth 미사용 전제의 메시지 웹앱 데이터 모델 초안.

## 1. 테이블 개요

모든 테이블은 `ego_` prefix를 사용한다. (같은 Supabase DB를 여러 프로젝트가 공유하므로 충돌 방지)

1. `ego_profiles`
- 사용자 프로필 (앱 내부 식별)

2. `ego_friendships`
- 친구 관계

3. `ego_chat_rooms`
- 채팅방 메타

4. `ego_chat_room_members`
- 채팅방 참가자 및 읽음 포인터

5. `ego_messages`
- 메시지 본문

## 2. SQL 초안

```sql
create extension if not exists "pgcrypto";

create table if not exists ego_profiles (
  id uuid primary key default gen_random_uuid(),
  device_id text not null unique,
  display_name text not null,
  status_message text not null default '',
  avatar_url text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists ego_friendships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references ego_profiles(id) on delete cascade,
  friend_id uuid not null references ego_profiles(id) on delete cascade,
  favorite boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, friend_id),
  check (user_id <> friend_id)
);

create table if not exists ego_chat_rooms (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('dm', 'group')),
  title text,
  created_at timestamptz not null default now()
);

create table if not exists ego_chat_room_members (
  room_id uuid not null references ego_chat_rooms(id) on delete cascade,
  user_id uuid not null references ego_profiles(id) on delete cascade,
  last_read_message_id uuid,
  last_read_message_at timestamptz not null default to_timestamp(0),
  mute boolean not null default false,
  joined_at timestamptz not null default now(),
  primary key (room_id, user_id)
);

create table if not exists ego_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references ego_chat_rooms(id) on delete cascade,
  sender_id uuid not null references ego_profiles(id) on delete cascade,
  content text not null,
  message_type text not null default 'text' check (message_type in ('text')),
  created_at timestamptz not null default now()
);

create index if not exists idx_ego_friendships_user on ego_friendships(user_id);
create index if not exists idx_ego_friendships_friend on ego_friendships(friend_id);
create index if not exists idx_ego_chat_members_user on ego_chat_room_members(user_id);
create index if not exists idx_ego_chat_members_room_read_at on ego_chat_room_members(room_id, last_read_message_at);
create index if not exists idx_ego_messages_room_created on ego_messages(room_id, created_at desc);
```

## 3. unread 계산 기준

- 각 사용자별 unread는 `ego_chat_room_members.last_read_message_at` 기준으로 계산.
- `last_read_message_id`는 선택적 참조값으로 유지 가능하나 계산 기준은 시각값으로 통일.

## 4. 무결성/운영 규칙

- `ego_friendships`는 양방향 2 row 저장 (확정)
- `ego_messages.content` 길이 제한은 서버 validation으로 강제 (1~1000자, trim 기준)

## 5. Supabase 운영 메모

- 연결: Supabase Pooler (포트 6543, Transaction mode)
- 본 프로젝트는 Auth 미사용이므로 RLS를 비활성화.
- API 서버에서 접근 제어를 구현하고, 서비스 키는 서버에만 둔다.
- 같은 DB에 다른 프로젝트 테이블 공존 (dgm_, griff_, gtd_, lp_, todo_app_ 등)

## 6. 확정 설계

1. 테이블 prefix
- `ego_` prefix 사용 (충돌 방지)

2. 친구 관계 저장
- `ego_friendships` 양방향 2 row 저장

3. 실시간 스택
- DB Realtime 대신 Socket.IO를 실시간 기준으로 사용

4. 배포/접근
- 프론트와 백엔드 분리 배포 전제
- DB는 백엔드 서버에서만 직접 접근
