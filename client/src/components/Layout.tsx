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

function FriendsIcon() {
  return (
    <svg
      className="tab-svg-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="9" cy="7" r="3" />
      <path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      <path d="M21 21v-2a4 4 0 0 0-3-3.87" />
    </svg>
  );
}

function ChatsIcon() {
  return (
    <svg
      className="tab-svg-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function ProfileIcon() {
  return (
    <svg
      className="tab-svg-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20v-2a6 6 0 0 1 12 0v2" />
    </svg>
  );
}

export default function Layout() {
  const profileId = useAuthStore((s) => s.profileId);

  const { data } = useQuery<ChatsResponse>({
    queryKey: ['chats', profileId],
    queryFn: () => getChats(),
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
          <span className="tab-icon">
            <FriendsIcon />
          </span>
          <span className="tab-label">친구</span>
        </NavLink>
        <NavLink
          to="/chats"
          className={({ isActive }) => `tab-item${isActive ? ' tab-item--active' : ''}`}
        >
          <span className="tab-icon">
            <ChatsIcon />
          </span>
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
          <span className="tab-icon">
            <ProfileIcon />
          </span>
          <span className="tab-label">프로필</span>
        </NavLink>
      </nav>
    </div>
  );
}
