import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { getFriends, toggleFavorite, addFriend, createChat } from '../api/index';
import { useAuthStore } from '../store/authStore';
import './FriendsPage.css';

interface Friend {
  friendship_id: string;
  friend_id: string;
  display_name: string;
  status_message: string;
  avatar_url: string;
  favorite: boolean;
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
  onToggleFavorite: (friendId: string, isFavorite: boolean) => void;
  onClickFriend: (friendId: string) => void;
}

function FriendItem({ friend, onToggleFavorite, onClickFriend }: FriendItemProps) {
  return (
    <li className="friend-item" onClick={() => onClickFriend(friend.friend_id)}>
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
        className={`friend-fav-btn${friend.favorite ? ' friend-fav-btn--active' : ''}`}
        onClick={(e) => { e.stopPropagation(); onToggleFavorite(friend.friend_id, friend.favorite); }}
        aria-label={friend.favorite ? '즐겨찾기 해제' : '즐겨찾기 추가'}
      >
        {friend.favorite ? '★' : '☆'}
      </button>
    </li>
  );
}

export default function FriendsPage() {
  const profileId = useAuthStore((s) => s.profileId);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [searchInput, setSearchInput] = useState('');
  const [query, setQuery] = useState('');
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [showAddPanel, setShowAddPanel] = useState(false);
  const [addEmail, setAddEmail] = useState('');
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
    queryFn: () => getFriends(query || undefined),
    enabled: !!profileId,
  });

  const favMutation = useMutation({
    mutationFn: ({ friendId, isFavorite }: { friendId: string; isFavorite: boolean }) =>
      toggleFavorite(friendId, !isFavorite),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friends', profileId] });
    },
  });

  const addMutation = useMutation({
    mutationFn: (friendEmail: string) => addFriend(friendEmail),
    onSuccess: (res) => {
      if (res.success) {
        setAddSuccess('친구가 추가되었습니다.');
        setAddEmail('');
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

  function handleToggleFavorite(friendId: string, isFavorite: boolean) {
    favMutation.mutate({ friendId, isFavorite });
  }

  function handleAddFriend() {
    const trimmed = addEmail.trim();
    if (!trimmed) {
      setAddError('이메일을 입력해주세요.');
      return;
    }
    setAddError('');
    addMutation.mutate(trimmed);
  }

  async function handleClickFriend(friendId: string) {
    if (!profileId) return;
    try {
      const res = await createChat('dm', [friendId]);
      if (res.success && res.data) {
        navigate(`/chats/${res.data.room_id}`);
      }
    } catch (err) {
      console.error('Failed to create/open DM:', err);
    }
  }

  function handleToggleAddPanel() {
    setShowAddPanel((prev) => !prev);
    setAddEmail('');
    setAddError('');
    setAddSuccess('');
  }

  const friends: Friend[] = data?.success ? data.data : [];
  const favorites = friends.filter((f) => f.favorite);
  const others = friends.filter((f) => !f.favorite);

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
            <p className="friends-add-label">상대방 이메일을 입력하세요</p>
            <div className="friends-add-row">
              <input
                className="friends-add-input"
                type="email"
                value={addEmail}
                onChange={(e) => {
                  setAddEmail(e.target.value);
                  setAddError('');
                }}
                placeholder="이메일 주소"
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
                    onClickFriend={handleClickFriend}
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
                    onClickFriend={handleClickFriend}
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
