import { useAuthStore } from '../store/authStore';

const API_BASE = (import.meta.env.VITE_API_URL || '') + '/api';

function getToken(): string | null {
  return useAuthStore.getState().token;
}

async function apiFetch(url: string, options?: RequestInit) {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(options?.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(url, { ...options, headers });

  if (res.status === 401) {
    useAuthStore.getState().logout();
    throw new Error('Unauthorized');
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { message?: string }).message || `HTTP ${res.status}`);
  }
  return res.json();
}

// Auth (no token needed)
export async function register(email: string, password: string, displayName: string) {
  return apiFetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, display_name: displayName }),
  });
}

export async function login(email: string, password: string) {
  return apiFetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
}

// Profile
export async function getProfile() {
  return apiFetch(`${API_BASE}/profiles/me`);
}

export async function updateProfile(data: { display_name?: string; status_message?: string; avatar_url?: string }) {
  return apiFetch(`${API_BASE}/profiles/me`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

// Friends
export async function getFriends(query?: string) {
  const params = new URLSearchParams();
  if (query) params.set('q', query);
  const qs = params.toString();
  return apiFetch(`${API_BASE}/friends${qs ? `?${qs}` : ''}`);
}

export async function toggleFavorite(friendId: string, favorite: boolean) {
  return apiFetch(`${API_BASE}/friends/${friendId}/favorite`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ favorite }),
  });
}

export async function addFriend(friendEmail: string) {
  return apiFetch(`${API_BASE}/friends/add`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ friend_email: friendEmail }),
  });
}

// Chats
export async function getChats() {
  return apiFetch(`${API_BASE}/chats`);
}

export async function createChat(type: 'dm' | 'group', memberIds: string[], title?: string) {
  return apiFetch(`${API_BASE}/chats`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, member_ids: memberIds, title }),
  });
}

export async function getMessages(roomId: string, cursor?: string, limit = 30) {
  const params = new URLSearchParams({ limit: String(limit) });
  if (cursor) params.set('cursor', cursor);
  return apiFetch(`${API_BASE}/chats/${roomId}/messages?${params}`);
}

export async function sendMessage(roomId: string, content: string) {
  return apiFetch(`${API_BASE}/chats/${roomId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });
}

export async function markAsRead(roomId: string, lastReadMessageId: string) {
  return apiFetch(`${API_BASE}/chats/${roomId}/read`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ last_read_message_id: lastReadMessageId }),
  });
}

export async function toggleMute(roomId: string, mute: boolean) {
  return apiFetch(`${API_BASE}/chats/${roomId}/mute`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mute }),
  });
}

export async function getRoomInfo(roomId: string) {
  return apiFetch(`${API_BASE}/chats/${roomId}/info`);
}

// Push notifications
export async function subscribePush(subscription: PushSubscriptionJSON) {
  return apiFetch(`${API_BASE}/push/subscribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(subscription),
  });
}

export async function unsubscribePush(endpoint: string) {
  return apiFetch(`${API_BASE}/push/unsubscribe`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint }),
  });
}

// Avatar upload (multipart/form-data — cannot use apiFetch which adds Content-Type: application/json)
export async function uploadAvatar(file: File) {
  const token = useAuthStore.getState().token;
  const formData = new FormData();
  formData.append('avatar', file);

  const uploadBase = (import.meta.env.VITE_API_URL || '') + '/api';
  const res = await fetch(`${uploadBase}/upload/avatar`, {
    method: 'POST',
    headers: token ? { 'Authorization': `Bearer ${token}` } : {},
    body: formData,
  });

  if (res.status === 401) {
    useAuthStore.getState().logout();
    throw new Error('Unauthorized');
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { message?: string }).message || `HTTP ${res.status}`);
  }
  return res.json();
}
