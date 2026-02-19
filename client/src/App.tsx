import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Layout from './components/Layout';
import FriendsPage from './pages/FriendsPage';
import ChatsPage from './pages/ChatsPage';
import ChatRoomPage from './pages/ChatRoomPage';
import ProfilePage from './pages/ProfilePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ErrorBoundary from './components/ErrorBoundary';
import { useAuthStore } from './store/authStore';
import { getProfile } from './api/index';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { token, profileId, setProfile, logout } = useAuthStore();
  const [loading, setLoading] = useState(!!token && !profileId);

  useEffect(() => {
    if (!token || profileId) {
      setLoading(false);
      return;
    }

    // Token exists but profile not loaded — fetch profile
    getProfile()
      .then((res) => {
        if (res.success && res.data) {
          setProfile(res.data);
        } else {
          logout();
        }
      })
      .catch(() => {
        logout();
      })
      .finally(() => setLoading(false));
  }, [token, profileId, setProfile, logout]);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100dvh', fontSize: '14px', color: '#666' }}>
        로딩 중...
      </div>
    );
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Protected routes */}
            <Route path="/chats/:roomId" element={<AuthGuard><ChatRoomPage /></AuthGuard>} />

            <Route element={<AuthGuard><Layout /></AuthGuard>}>
              <Route path="/friends" element={<FriendsPage />} />
              <Route path="/chats" element={<ChatsPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/" element={<Navigate to="/friends" replace />} />
              <Route path="*" element={<Navigate to="/friends" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
