import { NavLink, Outlet } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getChats } from '../api/index';
import { useAuthStore } from '../store/authStore';
import './Layout.css';

interface ChatRoom {
  room_id: string;
  unread_count: number;
}

interface ChatsResponse {
  success: boolean;
  data: ChatRoom[];
}

function formatTabBadge(count: number): string {
  if (count <= 0) return '';
  if (count >= 100) return '99+';
  return String(count);
}

export default function Layout() {
  const profileId = useAuthStore((s) => s.profileId);

  const { data } = useQuery<ChatsResponse>({
    queryKey: ['chats', profileId],
    queryFn: () => getChats(profileId!),
    enabled: !!profileId,
  });

  const totalUnread = data?.success
    ? data.data.reduce((sum, room) => sum + (room.unread_count ?? 0), 0)
    : 0;

  const badgeLabel = formatTabBadge(totalUnread);

  return (
    <div className="layout">
      <main className="layout-main">
        <Outlet />
      </main>
      <nav className="tab-bar">
        <NavLink
          to="/friends"
          className={({ isActive }) => `tab-item${isActive ? ' tab-item--active' : ''}`}
        >
          <span className="tab-icon">👥</span>
          <span className="tab-label">친구</span>
        </NavLink>
        <NavLink
          to="/chats"
          className={({ isActive }) => `tab-item${isActive ? ' tab-item--active' : ''}`}
        >
          <span className="tab-icon">💬</span>
          <span className="tab-label">채팅</span>
          {badgeLabel && (
            <span className="tab-unread-badge" aria-label={`${totalUnread}개의 읽지 않은 메시지`}>
              {badgeLabel}
            </span>
          )}
        </NavLink>
        <NavLink
          to="/profile"
          className={({ isActive }) => `tab-item${isActive ? ' tab-item--active' : ''}`}
        >
          <span className="tab-icon">👤</span>
          <span className="tab-label">프로필</span>
        </NavLink>
      </nav>
    </div>
  );
}
