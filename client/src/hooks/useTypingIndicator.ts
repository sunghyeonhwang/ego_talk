import { useCallback, useEffect, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';

interface TypingUser {
  profileId: string;
  displayName: string;
}

export function useTypingIndicator(
  socket: Socket | null,
  roomId: string | undefined,
  myProfileId: string | null,
) {
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const timeoutMap = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const lastEmitRef = useRef(0);

  // Listen for typing events
  useEffect(() => {
    if (!socket || !roomId) return;

    function onTypingStart(data: { roomId: string; profileId: string; displayName: string }) {
      if (data.roomId !== roomId || data.profileId === myProfileId) return;

      setTypingUsers((prev) => {
        if (prev.some((u) => u.profileId === data.profileId)) return prev;
        return [...prev, { profileId: data.profileId, displayName: data.displayName }];
      });

      // Auto-remove after 5 seconds
      const existing = timeoutMap.current.get(data.profileId);
      if (existing) clearTimeout(existing);
      timeoutMap.current.set(
        data.profileId,
        setTimeout(() => {
          setTypingUsers((prev) => prev.filter((u) => u.profileId !== data.profileId));
          timeoutMap.current.delete(data.profileId);
        }, 5000),
      );
    }

    function onTypingStop(data: { roomId: string; profileId: string }) {
      if (data.roomId !== roomId) return;
      setTypingUsers((prev) => prev.filter((u) => u.profileId !== data.profileId));
      const existing = timeoutMap.current.get(data.profileId);
      if (existing) {
        clearTimeout(existing);
        timeoutMap.current.delete(data.profileId);
      }
    }

    socket.on('typing:start', onTypingStart);
    socket.on('typing:stop', onTypingStop);

    return () => {
      socket.off('typing:start', onTypingStart);
      socket.off('typing:stop', onTypingStop);
      timeoutMap.current.forEach((t) => clearTimeout(t));
      timeoutMap.current.clear();
      setTypingUsers([]);
    };
  }, [socket, roomId, myProfileId]);

  // Emit typing with 1s debounce
  const emitTyping = useCallback(() => {
    if (!socket || !roomId) return;
    const now = Date.now();
    if (now - lastEmitRef.current < 1000) return;
    lastEmitRef.current = now;
    socket.emit('typing:start', { roomId });
  }, [socket, roomId]);

  const stopTyping = useCallback(() => {
    if (!socket || !roomId) return;
    socket.emit('typing:stop', { roomId });
  }, [socket, roomId]);

  const typingText =
    typingUsers.length === 0
      ? ''
      : typingUsers.length === 1
        ? `${typingUsers[0].displayName} 입력 중...`
        : `${typingUsers.length}명 입력 중...`;

  return { typingUsers, typingText, emitTyping, stopTyping };
}
