const API_BASE = '/api';

async function apiFetch(url: string, options?: RequestInit) {
  const res = await fetch(url, options);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { message?: string }).message || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function bootstrapProfile(deviceId: string, displayName: string) {
  return apiFetch(`${API_BASE}/profiles/bootstrap`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ device_id: deviceId, display_name: displayName }),
  });
}

export async function getFriends(profileId: string, query?: string) {
  const params = new URLSearchParams({ profile_id: profileId });
  if (query) params.set('q', query);
  return apiFetch(`${API_BASE}/friends?${params}`);
}

export async function toggleFavorite(friendId: string, profileId: string, favorite: boolean) {
  return apiFetch(`${API_BASE}/friends/${friendId}/favorite`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ profile_id: profileId, favorite }),
  });
}

export async function getChats(profileId: string) {
  return apiFetch(`${API_BASE}/chats?profile_id=${profileId}`);
}

export async function createChat(
  creatorId: string,
  type: 'dm' | 'group',
  memberIds: string[],
  title?: string,
) {
  return apiFetch(`${API_BASE}/chats`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ creator_id: creatorId, type, member_ids: memberIds, title }),
  });
}

export async function getMessages(roomId: string, profileId: string, cursor?: string, limit = 30) {
  const params = new URLSearchParams({ profile_id: profileId, limit: String(limit) });
  if (cursor) params.set('cursor', cursor);
  return apiFetch(`${API_BASE}/chats/${roomId}/messages?${params}`);
}

export async function sendMessage(roomId: string, senderId: string, content: string) {
  return apiFetch(`${API_BASE}/chats/${roomId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sender_id: senderId, content }),
  });
}

export async function markAsRead(roomId: string, profileId: string, lastReadMessageId: string) {
  return apiFetch(`${API_BASE}/chats/${roomId}/read`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ profile_id: profileId, last_read_message_id: lastReadMessageId }),
  });
}

export async function updateProfile(
  profileId: string,
  data: { display_name?: string; status_message?: string; avatar_url?: string },
) {
  return apiFetch(`${API_BASE}/profiles/me`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ profile_id: profileId, ...data }),
  });
}

export async function toggleMute(roomId: string, profileId: string, mute: boolean) {
  return apiFetch(`${API_BASE}/chats/${roomId}/mute`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ profile_id: profileId, mute }),
  });
}

export async function addFriend(profileId: string, friendDeviceId: string) {
  return apiFetch(`${API_BASE}/friends/add`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ profile_id: profileId, friend_device_id: friendDeviceId }),
  });
}
