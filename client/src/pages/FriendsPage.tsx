import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getFriends, toggleFavorite, addFriend } from '../api/index';
import { useAuthStore } from '../store/authStore';
import './FriendsPage.css';

interface Friend {
  friendship_id: string;
  profile_id: string;
  display_name: string;
  status_message: string;
  avatar_url: string;
  is_favorite: boolean;
}

interface FriendsResponse {
  success: boolean;
  data: Friend[];
}

function getInitials(name: string): string {
  return name.trim().charAt(0).toUpperCase() || '?';
}

interface FriendItemProps {
  friend: Friend;
  onToggleFavorite: (friendshipId: string, isFavorite: boolean) => void;
}

function FriendItem({ friend, onToggleFavorite }: FriendItemProps) {
  return (
    <li className="friend-item">
      <div className="friend-avatar">
        {friend.avatar_url ? (
          <img src={friend.avatar_url} alt={friend.display_name} className="friend-avatar-img" />
        ) : (
          <span className="friend-avatar-initials">{getInitials(friend.display_name)}</span>
        )}
      </div>
      <div className="friend-info">
        <span className="friend-name">{friend.display_name}</span>
        {friend.status_message && (
          <span className="friend-status">{friend.status_message}</span>
        )}
      </div>
      <button
        className={`friend-fav-btn${friend.is_favorite ? ' friend-fav-btn--active' : ''}`}
        onClick={() => onToggleFavorite(friend.friendship_id, friend.is_favorite)}
        aria-label={friend.is_favorite ? '즐겨찾기 해제' : '즐겨찾기 추가'}
      >
        {friend.is_favorite ? '★' : '☆'}
      </button>
    </li>
  );
}

export default function FriendsPage() {
  const profileId = useAuthStore((s) => s.profileId);
  const queryClient = useQueryClient();

  const [searchInput, setSearchInput] = useState('');
  const [query, setQuery] = useState('');
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [showAddPanel, setShowAddPanel] = useState(false);
  const [addDeviceId, setAddDeviceId] = useState('');
  const [addError, setAddError] = useState('');
  const [addSuccess, setAddSuccess] = useState('');

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setSearchInput(value);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setQuery(value.trim());
    }, 300);
  }

  const { data, isLoading } = useQuery<FriendsResponse>({
    queryKey: ['friends', profileId, query],
    queryFn: () => getFriends(profileId!, query || undefined),
    enabled: !!profileId,
  });

  const favMutation = useMutation({
    mutationFn: ({
      friendshipId,
      isFavorite,
    }: {
      friendshipId: string;
      isFavorite: boolean;
    }) => toggleFavorite(friendshipId, profileId!, !isFavorite),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friends', profileId] });
    },
  });

  const addMutation = useMutation({
    mutationFn: (friendDeviceId: string) => addFriend(profileId!, friendDeviceId),
    onSuccess: (res) => {
      if (res.success) {
        setAddSuccess('친구가 추가되었습니다.');
        setAddDeviceId('');
        setAddError('');
        queryClient.invalidateQueries({ queryKey: ['friends', profileId] });
        setTimeout(() => {
          setAddSuccess('');
          setShowAddPanel(false);
        }, 1500);
      } else {
        setAddError(res.message || '친구 추가에 실패했습니다.');
      }
    },
    onError: () => {
      setAddError('친구 추가 중 오류가 발생했습니다.');
    },
  });

  function handleToggleFavorite(friendshipId: string, isFavorite: boolean) {
    favMutation.mutate({ friendshipId, isFavorite });
  }

  function handleAddFriend() {
    const trimmed = addDeviceId.trim();
    if (!trimmed) {
      setAddError('Device ID를 입력해주세요.');
      return;
    }
    setAddError('');
    addMutation.mutate(trimmed);
  }

  function handleToggleAddPanel() {
    setShowAddPanel((prev) => !prev);
    setAddDeviceId('');
    setAddError('');
    setAddSuccess('');
  }

  const friends: Friend[] = data?.success ? data.data : [];
  const favorites = friends.filter((f) => f.is_favorite);
  const others = friends.filter((f) => !f.is_favorite);

  return (
    <div className="friends-page">
      <div className="friends-search-bar">
        <div className="friends-search-row">
          <input
            type="text"
            className="friends-search-input"
            placeholder="이름으로 검색"
            value={searchInput}
            onChange={handleSearchChange}
          />
          <button
            className={`friends-add-btn${showAddPanel ? ' friends-add-btn--active' : ''}`}
            onClick={handleToggleAddPanel}
            aria-label="친구 추가"
          >
            {showAddPanel ? '✕' : '+'}
          </button>
        </div>

        {showAddPanel && (
          <div className="friends-add-panel">
            <p className="friends-add-label">상대방 Device ID를 입력하세요</p>
            <div className="friends-add-row">
              <input
                className="friends-add-input"
                type="text"
                value={addDeviceId}
                onChange={(e) => {
                  setAddDeviceId(e.target.value);
                  setAddError('');
                }}
                placeholder="Device ID"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddFriend();
                }}
              />
              <button
                className="friends-add-submit-btn"
                onClick={handleAddFriend}
                disabled={addMutation.isPending}
              >
                {addMutation.isPending ? '추가 중...' : '추가'}
              </button>
            </div>
            {addError && <p className="friends-add-error">{addError}</p>}
            {addSuccess && <p className="friends-add-success">{addSuccess}</p>}
          </div>
        )}
      </div>

      {isLoading ? (
        <p className="friends-loading">로딩 중...</p>
      ) : friends.length === 0 ? (
        <p className="friends-empty">친구를 추가해 대화를 시작해보세요.</p>
      ) : (
        <>
          {favorites.length > 0 && (
            <section className="friends-section">
              <h3 className="friends-section-title">즐겨찾기 {favorites.length}</h3>
              <ul className="friends-list">
                {favorites.map((friend) => (
                  <FriendItem
                    key={friend.friendship_id}
                    friend={friend}
                    onToggleFavorite={handleToggleFavorite}
                  />
                ))}
              </ul>
            </section>
          )}
          {others.length > 0 && (
            <section className="friends-section">
              <h3 className="friends-section-title">친구 {others.length}</h3>
              <ul className="friends-list">
                {others.map((friend) => (
                  <FriendItem
                    key={friend.friendship_id}
                    friend={friend}
                    onToggleFavorite={handleToggleFavorite}
                  />
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
