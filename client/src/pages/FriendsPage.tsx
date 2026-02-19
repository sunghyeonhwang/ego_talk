import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getFriends, toggleFavorite } from '../api/index';
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

  const mutation = useMutation({
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

  function handleToggleFavorite(friendshipId: string, isFavorite: boolean) {
    mutation.mutate({ friendshipId, isFavorite });
  }

  const friends: Friend[] = data?.success ? data.data : [];
  const favorites = friends.filter((f) => f.is_favorite);
  const others = friends.filter((f) => !f.is_favorite);

  return (
    <div className="friends-page">
      <div className="friends-search-bar">
        <input
          type="text"
          className="friends-search-input"
          placeholder="이름으로 검색"
          value={searchInput}
          onChange={handleSearchChange}
        />
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
