import { NavLink, Outlet } from 'react-router-dom';
import './Layout.css';

export default function Layout() {
  return (
    <div className="layout">
      <main className="layout-main">
        <Outlet />
      </main>
      <nav className="tab-bar">
        <NavLink to="/friends" className={({ isActive }) => `tab-item${isActive ? ' tab-item--active' : ''}`}>
          <span className="tab-icon">👥</span>
          <span className="tab-label">친구</span>
        </NavLink>
        <NavLink to="/chats" className={({ isActive }) => `tab-item${isActive ? ' tab-item--active' : ''}`}>
          <span className="tab-icon">💬</span>
          <span className="tab-label">채팅</span>
          {/* 미읽음 배지 자리 */}
          <span className="tab-badge" id="unread-badge" />
        </NavLink>
        <NavLink to="/profile" className={({ isActive }) => `tab-item${isActive ? ' tab-item--active' : ''}`}>
          <span className="tab-icon">👤</span>
          <span className="tab-label">프로필</span>
        </NavLink>
      </nav>
    </div>
  );
}
