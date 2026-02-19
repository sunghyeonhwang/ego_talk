import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Layout from './components/Layout';
import FriendsPage from './pages/FriendsPage';
import ChatsPage from './pages/ChatsPage';
import ChatRoomPage from './pages/ChatRoomPage';
import ProfilePage from './pages/ProfilePage';
import { useAuthStore } from './store/authStore';
import { bootstrapProfile } from './api/index';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

function AppBootstrap({ children }: { children: React.ReactNode }) {
  const { profileId, deviceId, setProfile } = useAuthStore();
  const [bootstrapping, setBootstrapping] = useState(!profileId);

  useEffect(() => {
    if (profileId) return;

    const randomSuffix = String(Math.floor(1000 + Math.random() * 9000));
    const displayName = `사용자${randomSuffix}`;

    bootstrapProfile(deviceId, displayName)
      .then((res) => {
        if (res.success && res.data) {
          setProfile(res.data);
        }
      })
      .catch(console.error)
      .finally(() => setBootstrapping(false));
  }, [profileId, deviceId, setProfile]);

  if (bootstrapping) {
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
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppBootstrap>
          <Routes>
            {/* Chat room: no tab bar */}
            <Route path="/chats/:roomId" element={<ChatRoomPage />} />

            <Route element={<Layout />}>
              <Route path="/friends" element={<FriendsPage />} />
              <Route path="/chats" element={<ChatsPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/" element={<Navigate to="/friends" replace />} />
              <Route path="*" element={<Navigate to="/friends" replace />} />
            </Route>
          </Routes>
        </AppBootstrap>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
