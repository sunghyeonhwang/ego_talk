import { useAuthStore } from '../store/authStore';
import './ProfilePage.css';

function getInitials(name: string): string {
  return name.trim().charAt(0).toUpperCase() || '?';
}

export default function ProfilePage() {
  const { displayName, statusMessage, avatarUrl } = useAuthStore();

  return (
    <div className="profile-page">
      <h2 className="profile-title">내 프로필</h2>
      <div className="profile-card">
        <div className="profile-avatar">
          {avatarUrl ? (
            <img src={avatarUrl} alt={displayName} className="profile-avatar-img" />
          ) : (
            <span className="profile-avatar-initials">{getInitials(displayName)}</span>
          )}
        </div>
        <div className="profile-info">
          <p className="profile-name">{displayName || '이름 없음'}</p>
          <p className="profile-status">{statusMessage || '상태 메시지를 입력해보세요.'}</p>
        </div>
      </div>
    </div>
  );
}
