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
