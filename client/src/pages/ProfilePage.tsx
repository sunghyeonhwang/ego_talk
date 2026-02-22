import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { updateProfile } from '../api/index';
import { disconnectSocket } from '../hooks/useSocket';
import AvatarUpload from '../components/AvatarUpload';
import { usePushNotification } from '../hooks/usePushNotification';
import './ProfilePage.css';

function getInitials(name: string): string {
  return name.trim().charAt(0).toUpperCase() || '?';
}

export default function ProfilePage() {
  const navigate = useNavigate();
  const { email, displayName, statusMessage, avatarUrl, setProfile, logout } = useAuthStore();

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(displayName);
  const [editStatus, setEditStatus] = useState(statusMessage);
  const [editAvatarUrl, setEditAvatarUrl] = useState(avatarUrl);
  const [errorMsg, setErrorMsg] = useState('');

  const { permission, isSubscribed, isLoading: pushLoading, isSupported, subscribe, unsubscribe } = usePushNotification();

  const mutation = useMutation({
    mutationFn: (data: { display_name?: string; status_message?: string; avatar_url?: string }) =>
      updateProfile(data),
    onSuccess: (res) => {
      if (res.success && res.data) {
        setProfile(res.data);
        setIsEditing(false);
        setErrorMsg('');
      } else {
        setErrorMsg(res.message || '저장에 실패했습니다.');
      }
    },
    onError: () => {
      setErrorMsg('저장 중 오류가 발생했습니다.');
    },
  });

  function handleEditClick() {
    setEditName(displayName);
    setEditStatus(statusMessage);
    setEditAvatarUrl(avatarUrl);
    setErrorMsg('');
    setIsEditing(true);
  }

  function handleCancel() {
    setIsEditing(false);
    setErrorMsg('');
  }

  function handleSave() {
    const trimmedName = editName.trim();
    if (!trimmedName) {
      setErrorMsg('이름을 입력해주세요.');
      return;
    }
    mutation.mutate({
      display_name: trimmedName,
      status_message: editStatus.trim(),
      avatar_url: editAvatarUrl.trim(),
    });
  }

  function handleLogout() {
    disconnectSocket();
    logout();
    try {
      navigate('/login', { replace: true });
    } catch {
      window.location.href = '/login';
    }
  }

  return (
    <div className="profile-page">
      <h2 className="profile-title">내 프로필</h2>

      <div className="profile-card">
        {isEditing ? (
          <AvatarUpload
            currentAvatarUrl={editAvatarUrl}
            displayName={editName || displayName}
            onUploaded={(newUrl, profileData) => {
              setEditAvatarUrl(newUrl);
              if (profileData) setProfile(profileData);
            }}
          />
        ) : (
          <div className="profile-avatar">
            {avatarUrl ? (
              <img src={avatarUrl} alt={displayName} className="profile-avatar-img" />
            ) : (
              <span className="profile-avatar-initials">{getInitials(displayName)}</span>
            )}
          </div>
        )}

        {isEditing ? (
          <div className="profile-edit-form">
            <div className="profile-edit-field">
              <label className="profile-edit-label">이름</label>
              <input
                className="profile-edit-input"
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="이름을 입력하세요"
                maxLength={50}
              />
            </div>
            <div className="profile-edit-field">
              <label className="profile-edit-label">상태 메시지</label>
              <input
                className="profile-edit-input"
                type="text"
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value)}
                placeholder="상태 메시지를 입력하세요"
                maxLength={100}
              />
            </div>
            {errorMsg && <p className="profile-edit-error">{errorMsg}</p>}
            <div className="profile-edit-actions">
              <button
                className="profile-btn profile-btn--save"
                onClick={handleSave}
                disabled={mutation.isPending}
              >
                {mutation.isPending ? '저장 중...' : '저장'}
              </button>
              <button
                className="profile-btn profile-btn--cancel"
                onClick={handleCancel}
                disabled={mutation.isPending}
              >
                취소
              </button>
            </div>
          </div>
        ) : (
          <div className="profile-info">
            <p className="profile-name">{displayName || '이름 없음'}</p>
            {email && <p className="profile-email">{email}</p>}
            <p className="profile-status">{statusMessage || '상태 메시지를 입력해보세요.'}</p>
            <button className="profile-btn profile-btn--edit" onClick={handleEditClick}>
              편집
            </button>
          </div>
        )}
      </div>

      <div className="profile-settings-card">
        <button className="profile-logout-btn" onClick={handleLogout}>
          로그아웃
        </button>
      </div>

      <div className="profile-settings-card">
        <div className="profile-notification-section">
          <p className="profile-notification-label">푸시 알림</p>
          {!isSupported ? (
            <p className="profile-notification-status profile-notification-status--unsupported">
              이 브라우저는 푸시 알림을 지원하지 않습니다.
            </p>
          ) : permission === 'denied' ? (
            <p className="profile-notification-status profile-notification-status--denied">
              알림 권한이 차단되었습니다. 브라우저 설정에서 허용해주세요.
            </p>
          ) : (
            <div className="profile-notification-toggle">
              <p className="profile-notification-status">
                {isSubscribed ? '알림 켜짐' : '알림 꺼짐'}
              </p>
              <button
                className={`profile-notification-btn${isSubscribed ? ' profile-notification-btn--on' : ''}`}
                onClick={isSubscribed ? unsubscribe : subscribe}
                disabled={pushLoading}
              >
                {pushLoading ? '처리 중...' : isSubscribed ? '알림 끄기' : '알림 켜기'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
