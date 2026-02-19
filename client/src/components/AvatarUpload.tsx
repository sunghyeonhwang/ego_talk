import { useRef, useState } from 'react';
import { uploadAvatar } from '../api/index';
import './AvatarUpload.css';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

function getInitials(name: string): string {
  return name.trim().charAt(0).toUpperCase() || '?';
}

export interface ProfileData {
  id: string;
  email?: string;
  display_name: string;
  status_message: string;
  avatar_url: string;
}

interface AvatarUploadProps {
  currentAvatarUrl: string;
  displayName: string;
  /** Called after a successful upload with the new URL and updated profile data */
  onUploaded: (newAvatarUrl: string, profileData?: ProfileData) => void;
}

export default function AvatarUpload({ currentAvatarUrl, displayName, onUploaded }: AvatarUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');

  function handleClick() {
    inputRef.current?.click();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('JPEG, PNG, WebP, GIF 형식만 업로드할 수 있습니다.');
      e.target.value = '';
      return;
    }

    if (file.size > MAX_SIZE_BYTES) {
      setError('파일 크기는 5MB 이하여야 합니다.');
      e.target.value = '';
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    setSelectedFile(file);
  }

  async function handleUpload() {
    if (!selectedFile) return;

    setIsUploading(true);
    setError('');

    try {
      const res = await uploadAvatar(selectedFile);
      if (res.success && res.data?.avatar_url) {
        onUploaded(res.data.avatar_url as string, res.data as ProfileData);
        // Clean up preview after successful upload
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
        setSelectedFile(null);
        if (inputRef.current) inputRef.current.value = '';
      } else {
        setError((res as { message?: string }).message || '업로드에 실패했습니다.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '업로드 중 오류가 발생했습니다.');
    } finally {
      setIsUploading(false);
    }
  }

  function handleCancel() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setSelectedFile(null);
    setError('');
    if (inputRef.current) inputRef.current.value = '';
  }

  const displayedUrl = previewUrl ?? currentAvatarUrl;

  return (
    <div className="avatar-upload">
      <div className="avatar-upload-preview" onClick={handleClick} title="클릭하여 사진 변경">
        {displayedUrl ? (
          <img src={displayedUrl} alt={displayName} className="avatar-upload-img" />
        ) : (
          <span className="avatar-upload-initials">{getInitials(displayName)}</span>
        )}
        <div className="avatar-upload-overlay">
          <span className="avatar-upload-icon">&#128247;</span>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_TYPES.join(',')}
        className="avatar-upload-input"
        onChange={handleFileChange}
        aria-label="아바타 이미지 선택"
      />

      {selectedFile && (
        <div className="avatar-upload-actions">
          <button
            className="avatar-upload-btn avatar-upload-btn--confirm"
            onClick={handleUpload}
            disabled={isUploading}
          >
            {isUploading ? '업로드 중...' : '업로드'}
          </button>
          <button
            className="avatar-upload-btn avatar-upload-btn--cancel"
            onClick={handleCancel}
            disabled={isUploading}
          >
            취소
          </button>
        </div>
      )}

      {error && <p className="avatar-upload-error">{error}</p>}
    </div>
  );
}
