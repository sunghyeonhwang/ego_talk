import { create } from 'zustand';

interface AuthState {
  token: string | null;
  profileId: string | null;
  email: string;
  displayName: string;
  statusMessage: string;
  avatarUrl: string;
  setAuth: (data: {
    token: string;
    profile: {
      id: string;
      email: string;
      display_name: string;
      status_message: string;
      avatar_url: string;
    };
  }) => void;
  setProfile: (profile: {
    id: string;
    email?: string;
    display_name: string;
    status_message: string;
    avatar_url: string;
  }) => void;
  logout: () => void;
}

const TOKEN_KEY = 'egotalk_token';

function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export const useAuthStore = create<AuthState>((set) => ({
  token: getStoredToken(),
  profileId: null,
  email: '',
  displayName: '',
  statusMessage: '',
  avatarUrl: '',
  setAuth: (data) => {
    localStorage.setItem(TOKEN_KEY, data.token);
    set({
      token: data.token,
      profileId: data.profile.id,
      email: data.profile.email,
      displayName: data.profile.display_name,
      statusMessage: data.profile.status_message || '',
      avatarUrl: data.profile.avatar_url || '',
    });
  },
  setProfile: (profile) =>
    set({
      profileId: profile.id,
      email: profile.email || '',
      displayName: profile.display_name,
      statusMessage: profile.status_message || '',
      avatarUrl: profile.avatar_url || '',
    }),
  logout: () => {
    localStorage.removeItem(TOKEN_KEY);
    set({
      token: null,
      profileId: null,
      email: '',
      displayName: '',
      statusMessage: '',
      avatarUrl: '',
    });
  },
}));
