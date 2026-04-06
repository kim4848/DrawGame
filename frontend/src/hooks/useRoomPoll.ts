import { useEffect } from 'react';
import { pollRoom } from '../api';
import { useGameStore } from '../store/gameStore';

export function useRoomPoll() {
  const roomId = useGameStore((s) => s.roomId);
  const playerId = useGameStore((s) => s.playerId);
  const roomStatus = useGameStore((s) => s.roomStatus);
  const updateFromPoll = useGameStore((s) => s.updateFromPoll);

  useEffect(() => {
    if (!roomId || !playerId || roomStatus === 'DONE') return;

    let active = true;

    const poll = async () => {
      try {
        const data = await pollRoom(roomId, playerId);
        if (active) updateFromPoll(data);
      } catch {
        // Silently retry on next interval
      }
    };

    poll(); // Initial poll
    const interval = setInterval(poll, 2000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [roomId, playerId, roomStatus, updateFromPoll]);
}
