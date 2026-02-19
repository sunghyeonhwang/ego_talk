const API_BASE = '/api';

export async function bootstrapProfile(deviceId: string, displayName: string) {
  const res = await fetch(`${API_BASE}/profiles/bootstrap`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ device_id: deviceId, display_name: displayName }),
  });
  return res.json();
}

export async function getFriends(profileId: string, query?: string) {
  const params = new URLSearchParams({ profile_id: profileId });
  if (query) params.set('q', query);
  const res = await fetch(`${API_BASE}/friends?${params}`);
  return res.json();
}

export async function toggleFavorite(friendId: string, profileId: string, favorite: boolean) {
  const res = await fetch(`${API_BASE}/friends/${friendId}/favorite`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ profile_id: profileId, favorite }),
  });
  return res.json();
}

export async function getChats(profileId: string) {
  const res = await fetch(`${API_BASE}/chats?profile_id=${profileId}`);
  return res.json();
}

export async function createChat(
  creatorId: string,
  type: 'dm' | 'group',
  memberIds: string[],
  title?: string,
) {
  const res = await fetch(`${API_BASE}/chats`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ creator_id: creatorId, type, member_ids: memberIds, title }),
  });
  return res.json();
}

export async function getMessages(roomId: string, profileId: string, cursor?: string, limit = 30) {
  const params = new URLSearchParams({ profile_id: profileId, limit: String(limit) });
  if (cursor) params.set('cursor', cursor);
  const res = await fetch(`${API_BASE}/chats/${roomId}/messages?${params}`);
  return res.json();
}

export async function sendMessage(roomId: string, senderId: string, content: string) {
  const res = await fetch(`${API_BASE}/chats/${roomId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sender_id: senderId, content }),
  });
  return res.json();
}

export async function markAsRead(roomId: string, profileId: string, lastReadMessageId: string) {
  const res = await fetch(`${API_BASE}/chats/${roomId}/read`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ profile_id: profileId, last_read_message_id: lastReadMessageId }),
  });
  return res.json();
}

export async function updateProfile(
  profileId: string,
  data: { display_name?: string; status_message?: string; avatar_url?: string },
) {
  const res = await fetch(`${API_BASE}/profiles/me`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ profile_id: profileId, ...data }),
  });
  return res.json();
}

export async function toggleMute(roomId: string, profileId: string, mute: boolean) {
  const res = await fetch(`${API_BASE}/chats/${roomId}/mute`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ profile_id: profileId, mute }),
  });
  return res.json();
}

export async function addFriend(profileId: string, friendDeviceId: string) {
  const res = await fetch(`${API_BASE}/friends/add`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ profile_id: profileId, friend_device_id: friendDeviceId }),
  });
  return res.json();
}
