import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getChats } from '../api/index';
import { useAuthStore } from '../store/authStore';
import './ChatsPage.css';

interface ChatRoom {
  room_id: string;
  title: string | null;
  type: 'dm' | 'group';
  last_message: {
    content: string;
    sender_name: string | null;
    created_at: string;
  } | null;
  unread_count: number;
}

interface ChatsResponse {
  success: boolean;
  data: ChatRoom[];
}

function formatTime(isoString: string | null): string {
  if (!isoString) return '';

  const now = new Date();
  const date = new Date(isoString);

  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(todayStart.getTime() - 86400000);

  if (date >= todayStart) {
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  }

  if (date >= yesterdayStart) {
    return '어제';
  }

  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${month}/${day}`;
}

function getInitials(name: string): string {
  return name.trim().charAt(0).toUpperCase() || '?';
}

function formatUnread(count: number): string {
  if (count >= 100) return '99+';
  return String(count);
}

interface ChatItemProps {
  room: ChatRoom;
  onClick: () => void;
}

function ChatItem({ room, onClick }: ChatItemProps) {
  const roomTitle = room.title || '채팅방';
  const hasLastMessage = !!room.last_message;
  const lastMessagePreview = hasLastMessage
    ? room.last_message!.sender_name
      ? `${room.last_message!.sender_name}: ${room.last_message!.content}`
      : room.last_message!.content
    : '';

  return (
    <li className="chat-item" onClick={onClick} role="button" tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); }}>
      <div className="chat-avatar" aria-hidden="true">
        <span className="chat-avatar-initials">{getInitials(roomTitle)}</span>
      </div>
      <div className="chat-info">
        <span className="chat-name">{roomTitle}</span>
        {hasLastMessage && (
          <span className="chat-last-message">{lastMessagePreview}</span>
        )}
      </div>
      <div className="chat-meta">
        {room.last_message?.created_at && (
          <span className="chat-time">{formatTime(room.last_message.created_at)}</span>
        )}
        {room.unread_count > 0 && (
          <span className="chat-unread-badge">{formatUnread(room.unread_count)}</span>
        )}
      </div>
    </li>
  );
}

export default function ChatsPage() {
  const profileId = useAuthStore((s) => s.profileId);
  const navigate = useNavigate();

  const { data, isLoading } = useQuery<ChatsResponse>({
    queryKey: ['chats', profileId],
    queryFn: () => getChats(),
    enabled: !!profileId,
  });

  const rooms: ChatRoom[] = data?.success ? data.data : [];

  return (
    <div className="chats-page">
      <h2 className="chats-title">채팅</h2>

      {isLoading ? (
        <p className="chats-loading">로딩 중...</p>
      ) : rooms.length === 0 ? (
        <p className="chats-empty">아직 대화가 없습니다.</p>
      ) : (
        <ul className="chats-list">
          {rooms.map((room) => (
            <ChatItem
              key={room.room_id}
              room={room}
              onClick={() => navigate(`/chats/${room.room_id}`)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
