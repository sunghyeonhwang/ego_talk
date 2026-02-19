import { create } from 'zustand';

interface AuthState {
  profileId: string | null;
  deviceId: string;
  displayName: string;
  statusMessage: string;
  avatarUrl: string;
  setProfile: (profile: {
    id: string;
    device_id: string;
    display_name: string;
    status_message: string;
    avatar_url: string;
  }) => void;
}

const DEVICE_ID_KEY = 'egotalk_device_id';

function getOrCreateDeviceId(): string {
  const stored = localStorage.getItem(DEVICE_ID_KEY);
  if (stored) return stored;
  const newId = crypto.randomUUID();
  localStorage.setItem(DEVICE_ID_KEY, newId);
  return newId;
}

export const useAuthStore = create<AuthState>((set) => ({
  profileId: null,
  deviceId: getOrCreateDeviceId(),
  displayName: '',
  statusMessage: '',
  avatarUrl: '',
  setProfile: (profile) =>
    set({
      profileId: profile.id,
      deviceId: profile.device_id,
      displayName: profile.display_name,
      statusMessage: profile.status_message,
      avatarUrl: profile.avatar_url,
    }),
}));
