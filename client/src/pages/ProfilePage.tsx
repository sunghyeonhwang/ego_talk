import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { updateProfile } from '../api/index';
import './ProfilePage.css';

function getInitials(name: string): string {
  return name.trim().charAt(0).toUpperCase() || '?';
}

export default function ProfilePage() {
  const { profileId, deviceId, displayName, statusMessage, avatarUrl, setProfile } = useAuthStore();

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(displayName);
  const [editStatus, setEditStatus] = useState(statusMessage);
  const [editAvatarUrl, setEditAvatarUrl] = useState(avatarUrl);
  const [errorMsg, setErrorMsg] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);

  const mutation = useMutation({
    mutationFn: (data: { display_name?: string; status_message?: string; avatar_url?: string }) =>
      updateProfile(profileId!, data),
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

  async function handleCopyDeviceId() {
    try {
      await navigator.clipboard.writeText(deviceId);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch {
      // clipboard API not available
    }
  }

  return (
    <div className="profile-page">
      <h2 className="profile-title">내 프로필</h2>

      <div className="profile-card">
        <div className="profile-avatar">
          {(isEditing ? editAvatarUrl : avatarUrl) ? (
            <img
              src={isEditing ? editAvatarUrl : avatarUrl}
              alt={displayName}
              className="profile-avatar-img"
            />
          ) : (
            <span className="profile-avatar-initials">{getInitials(displayName)}</span>
          )}
        </div>

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
            <div className="profile-edit-field">
              <label className="profile-edit-label">아바타 URL</label>
              <input
                className="profile-edit-input"
                type="url"
                value={editAvatarUrl}
                onChange={(e) => setEditAvatarUrl(e.target.value)}
                placeholder="이미지 URL을 입력하세요"
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
            <p className="profile-status">{statusMessage || '상태 메시지를 입력해보세요.'}</p>
            <button className="profile-btn profile-btn--edit" onClick={handleEditClick}>
              편집
            </button>
          </div>
        )}
      </div>

      <div className="profile-settings-card">
        <p className="profile-settings-label">내 Device ID</p>
        <div className="profile-device-row">
          <span className="profile-device-id">{deviceId}</span>
          <button
            className="profile-copy-btn"
            onClick={handleCopyDeviceId}
            aria-label="Device ID 복사"
          >
            {copySuccess ? '복사됨' : '복사'}
          </button>
        </div>
        <p className="profile-settings-hint">이 ID를 친구에게 알려주면 친구 추가가 가능합니다.</p>
      </div>
    </div>
  );
}
