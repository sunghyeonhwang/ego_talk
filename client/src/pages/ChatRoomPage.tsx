import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { getMessages, markAsRead, sendMessage } from '../api/index';
import { useAuthStore } from '../store/authStore';
import { useSocket } from '../hooks/useSocket';
import './ChatRoomPage.css';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Message {
  id: string;
  room_id: string;
  sender_id: string;
  sender_name: string;
  content: string;
  created_at: string;
  /** Optimistic messages that have not yet been confirmed by the server */
  pending?: boolean;
}

interface MessagesResponse {
  success: boolean;
  data: {
    messages: Message[];
    next_cursor: string | null;
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(isoString: string): string {
  const date = new Date(isoString);
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

function formatDateLabel(isoString: string): string {
  const date = new Date(isoString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
  const weekday = weekdays[date.getDay()];
  return `${year}년 ${month}월 ${day}일 ${weekday}요일`;
}

function getDateKey(isoString: string): string {
  const date = new Date(isoString);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function isNearBottom(el: HTMLElement, threshold = 80): boolean {
  return el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
}

// ─── Sub-Components ───────────────────────────────────────────────────────────

interface DateDividerProps {
  isoString: string;
}

function DateDivider({ isoString }: DateDividerProps) {
  return (
    <div className="chat-date-divider" role="separator">
      <span className="chat-date-divider-text">{formatDateLabel(isoString)}</span>
    </div>
  );
}

interface MessageRowProps {
  msg: Message;
  isMine: boolean;
  showSenderName: boolean;
}

function MessageRow({ msg, isMine, showSenderName }: MessageRowProps) {
  return (
    <div className={`message-row ${isMine ? 'message-row--mine' : 'message-row--theirs'}`}>
      {!isMine && showSenderName && (
        <span className="message-sender-name">{msg.sender_name}</span>
      )}
      <div className="message-content-wrap">
        <div
          className={`message-bubble ${
            isMine ? 'message-bubble--mine' : 'message-bubble--theirs'
          }${msg.pending ? ' message-bubble--pending' : ''}`}
        >
          {msg.content}
        </div>
        <span className="message-time">{formatTime(msg.created_at)}</span>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ChatRoomPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const socket = useSocket();

  const profileId = useAuthStore((s) => s.profileId);
  const displayName = useAuthStore((s) => s.displayName);

  // ── State ──────────────────────────────────────────────────────────────────
  const [messages, setMessages] = useState<Message[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [sending, setSending] = useState(false);

  // Derived room title from query cache (chats list already loaded it)
  const roomTitle = useRoomTitle(roomId);

  // ── Refs ───────────────────────────────────────────────────────────────────
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesAreaRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  /** Tracks whether we should auto-scroll when new messages arrive */
  const shouldAutoScrollRef = useRef(true);
  /** Scroll anchor when loading older messages */
  const scrollAnchorRef = useRef<{ id: string; offsetFromBottom: number } | null>(null);

  // ── Load initial messages ──────────────────────────────────────────────────
  useEffect(() => {
    if (!roomId || !profileId) return;

    setLoadingInitial(true);
    setMessages([]);
    setNextCursor(null);
    setHasMore(false);

    getMessages(roomId, profileId, undefined, 30)
      .then((res: MessagesResponse) => {
        if (res.success && res.data) {
          setMessages(res.data.messages);
          setNextCursor(res.data.next_cursor);
          setHasMore(!!res.data.next_cursor);

          // Mark the most recent message as read
          const msgs = res.data.messages;
          if (msgs.length > 0) {
            const latestId = msgs[msgs.length - 1].id;
            markAsRead(roomId, profileId, latestId).catch(() => {});
            // Invalidate chats list so unread count refreshes
            queryClient.invalidateQueries({ queryKey: ['chats', profileId] });
          }
        }
      })
      .catch(console.error)
      .finally(() => setLoadingInitial(false));
  }, [roomId, profileId, queryClient]);

  // ── Auto-scroll to bottom on initial load ─────────────────────────────────
  useLayoutEffect(() => {
    if (!loadingInitial && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView();
    }
  }, [loadingInitial]);

  // ── Restore scroll position after loading older messages ──────────────────
  useLayoutEffect(() => {
    const area = messagesAreaRef.current;
    const anchor = scrollAnchorRef.current;
    if (!area || !anchor || loadingMore) return;

    const anchorEl = area.querySelector<HTMLElement>(`[data-msg-id="${anchor.id}"]`);
    if (anchorEl) {
      const newOffsetFromBottom =
        area.scrollHeight - anchorEl.offsetTop - anchorEl.offsetHeight;
      area.scrollTop = area.scrollHeight - anchor.offsetFromBottom - newOffsetFromBottom;
    }
    scrollAnchorRef.current = null;
  });

  // ── Load older messages ────────────────────────────────────────────────────
  const loadMore = useCallback(async () => {
    if (!roomId || !profileId || loadingMore || !hasMore || !nextCursor) return;

    const area = messagesAreaRef.current;
    if (area && messages.length > 0) {
      const firstMsg = messages[0];
      const firstEl = area.querySelector<HTMLElement>(`[data-msg-id="${firstMsg.id}"]`);
      if (firstEl) {
        scrollAnchorRef.current = {
          id: firstMsg.id,
          offsetFromBottom: area.scrollHeight - firstEl.offsetTop,
        };
      }
    }

    setLoadingMore(true);
    try {
      const res: MessagesResponse = await getMessages(roomId, profileId, nextCursor, 30);
      if (res.success && res.data) {
        setMessages((prev) => [...res.data.messages, ...prev]);
        setNextCursor(res.data.next_cursor);
        setHasMore(!!res.data.next_cursor);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMore(false);
    }
  }, [roomId, profileId, loadingMore, hasMore, nextCursor, messages]);

  // ── Socket: join room & listen for new messages ────────────────────────────
  useEffect(() => {
    if (!roomId || !profileId || !socket) return;

    // Capture narrowed (non-null) copies for use inside the closure
    const currentRoomId: string = roomId;
    const currentProfileId: string = profileId;

    socket.emit('room:join', { roomId: currentRoomId, profileId: currentProfileId });

    function onMessageNew(msg: Message) {
      if (msg.room_id !== currentRoomId) return;

      const area = messagesAreaRef.current;
      const wasAtBottom = area ? isNearBottom(area) : true;

      setMessages((prev) => {
        // Replace optimistic message if same content + sender and pending
        const optimisticIdx = prev.findIndex(
          (m) => m.pending && m.sender_id === msg.sender_id && m.content === msg.content,
        );
        if (optimisticIdx !== -1) {
          const updated = [...prev];
          updated[optimisticIdx] = msg;
          return updated;
        }
        // Deduplicate: skip if we already have this id
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });

      // Mark as read if message is not mine and we're in the room
      if (msg.sender_id !== currentProfileId) {
        markAsRead(currentRoomId, currentProfileId, msg.id).catch(() => {});
        queryClient.invalidateQueries({ queryKey: ['chats', currentProfileId] });
      }

      if (wasAtBottom) {
        shouldAutoScrollRef.current = true;
      }
    }

    socket.on('message:new', onMessageNew);

    return () => {
      socket.off('message:new', onMessageNew);
    };
  }, [roomId, profileId, socket, queryClient]);

  // ── Auto-scroll when new messages are added ────────────────────────────────
  useLayoutEffect(() => {
    if (!shouldAutoScrollRef.current) return;
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
    shouldAutoScrollRef.current = false;
  }, [messages]);

  // Track scroll position to decide auto-scroll
  const handleScroll = useCallback(() => {
    const area = messagesAreaRef.current;
    if (!area) return;
    shouldAutoScrollRef.current = isNearBottom(area);
  }, []);

  // ── Send message ───────────────────────────────────────────────────────────
  const handleSend = useCallback(async () => {
    const content = inputValue.trim();
    if (!content || !roomId || !profileId || sending) return;

    setInputValue('');
    setSending(true);

    // Optimistic update
    const optimisticMsg: Message = {
      id: `optimistic-${Date.now()}`,
      room_id: roomId,
      sender_id: profileId,
      sender_name: displayName,
      content,
      created_at: new Date().toISOString(),
      pending: true,
    };
    shouldAutoScrollRef.current = true;
    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      await sendMessage(roomId, profileId, content);
      // Server will emit socket event "message:new" which replaces the optimistic entry
      queryClient.invalidateQueries({ queryKey: ['chats', profileId] });
    } catch (err) {
      console.error(err);
      // Remove failed optimistic message
      setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id));
    } finally {
      setSending(false);
    }
  }, [inputValue, roomId, profileId, sending, displayName, queryClient]);

  // Textarea auto-resize
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const ta = e.currentTarget;
    setInputValue(ta.value);
    ta.style.height = 'auto';
    ta.style.height = `${ta.scrollHeight}px`;
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  // ── Render ─────────────────────────────────────────────────────────────────

  const canSend = inputValue.trim().length > 0 && !sending;

  return (
    <div className="chat-room-page">
      {/* Header */}
      <header className="chat-room-header">
        <button
          className="chat-room-back-btn"
          onClick={() => navigate('/chats')}
          aria-label="뒤로가기"
        >
          ←
        </button>
        <h1 className="chat-room-title">{roomTitle || '채팅방'}</h1>
      </header>

      {/* Messages */}
      {loadingInitial ? (
        <div className="chat-room-center-msg">로딩 중...</div>
      ) : (
        <div
          className="chat-room-messages"
          ref={messagesAreaRef}
          onScroll={handleScroll}
        >
          {hasMore && (
            <div className="chat-room-load-more">
              <button
                className="chat-room-load-more-btn"
                onClick={loadMore}
                disabled={loadingMore}
              >
                {loadingMore ? '불러오는 중...' : '이전 메시지 보기'}
              </button>
            </div>
          )}

          {renderMessagesWithDividers(messages, profileId ?? '')}

          <div ref={messagesEndRef} />
        </div>
      )}

      {/* Input Area */}
      <div className="chat-room-input-area">
        <textarea
          ref={textareaRef}
          className="chat-room-textarea"
          placeholder="메시지를 입력하세요"
          value={inputValue}
          rows={1}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
        />
        <button
          className="chat-room-send-btn"
          onClick={handleSend}
          disabled={!canSend}
          aria-label="전송"
        >
          ↑
        </button>
      </div>
    </div>
  );
}

// ─── Render helpers ────────────────────────────────────────────────────────────

function renderMessagesWithDividers(messages: Message[], myProfileId: string) {
  const elements: React.ReactNode[] = [];
  let lastDateKey = '';

  messages.forEach((msg, idx) => {
    const dateKey = getDateKey(msg.created_at);
    if (dateKey !== lastDateKey) {
      elements.push(<DateDivider key={`divider-${dateKey}`} isoString={msg.created_at} />);
      lastDateKey = dateKey;
    }

    const isMine = msg.sender_id === myProfileId;
    // Show sender name for theirs messages only if the previous message was from someone else
    const prevMsg = idx > 0 ? messages[idx - 1] : null;
    const showSenderName =
      !isMine && (prevMsg === null || prevMsg.sender_id !== msg.sender_id);

    elements.push(
      <MessageRow
        key={msg.id}
        msg={msg}
        isMine={isMine}
        showSenderName={showSenderName}
        data-msg-id={msg.id}
      />,
    );
  });

  return elements;
}

// ─── Helper hook: get room title from query cache ──────────────────────────────

interface CachedChatRoom {
  room_id: string;
  title: string | null;
}

function useRoomTitle(roomId: string | undefined): string {
  const queryClient = useQueryClient();
  const profileId = useAuthStore((s) => s.profileId);

  if (!roomId) return '';

  const data = queryClient.getQueryData<{ success: boolean; data: CachedChatRoom[] }>([
    'chats',
    profileId,
  ]);
  if (!data?.success || !data.data) return '';

  const room = data.data.find((r) => r.room_id === roomId);
  return room?.title ?? '';
}
