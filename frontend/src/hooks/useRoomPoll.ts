import { useEffect, useRef, useState } from 'react';
import { pollRoom } from '../api';
import { useGameStore } from '../store/gameStore';
import { isOnline, isPageVisible, observeNetworkState } from '../utils/network';
import { addToast } from '../store/toastStore';

export function useRoomPoll() {
  const roomId = useGameStore((s) => s.roomId);
  const playerId = useGameStore((s) => s.playerId);
  const roomStatus = useGameStore((s) => s.roomStatus);
  const hasSubmitted = useGameStore((s) => s.hasSubmitted);
  const updateFromPoll = useGameStore((s) => s.updateFromPoll);

  const [isConnected, setIsConnected] = useState(true);
  const consecutiveErrorsRef = useRef(0);
  const wasOfflineRef = useRef(false);

  useEffect(() => {
    if (!roomId || !playerId || roomStatus === 'DONE') return;

    let active = true;
    let timeoutId: number | null = null;

    const getNextInterval = () => {
      // Pause polling when tab is hidden (battery optimization)
      if (!isPageVisible()) return 5000;

      // Slow down polling when player has submitted (battery optimization)
      if (hasSubmitted) return 5000;

      // Exponential backoff on errors
      if (consecutiveErrorsRef.current > 0) {
        const backoff = Math.min(2000 * Math.pow(2, consecutiveErrorsRef.current - 1), 10000);
        return backoff;
      }

      return 2000; // Normal polling interval
    };

    const poll = async () => {
      if (!active) return;

      // Skip polling if offline
      if (!isOnline()) {
        if (!wasOfflineRef.current) {
          wasOfflineRef.current = true;
          setIsConnected(false);
          addToast('Ingen internetforbindelse', 'error');
        }
        scheduleNext();
        return;
      }

      // Recovering from offline
      if (wasOfflineRef.current) {
        wasOfflineRef.current = false;
        setIsConnected(true);
        addToast('Forbindelse genoprettet', 'success');
      }

      try {
        const data = await pollRoom(roomId, playerId);
        if (active) {
          updateFromPoll(data);
          consecutiveErrorsRef.current = 0;

          if (!isConnected) {
            setIsConnected(true);
            addToast('Forbindelse genoprettet', 'success');
          }
        }
      } catch (error) {
        consecutiveErrorsRef.current++;

        if (consecutiveErrorsRef.current === 1) {
          setIsConnected(false);
        }

        // Show error toast only on first error or after many consecutive errors
        if (consecutiveErrorsRef.current === 1 || consecutiveErrorsRef.current === 5) {
          addToast('Netværksfejl. Prøver automatisk igen...', 'error');
        }
      }

      scheduleNext();
    };

    const scheduleNext = () => {
      if (!active) return;
      const interval = getNextInterval();
      timeoutId = setTimeout(poll, interval);
    };

    // Start polling
    poll();

    // Listen for network state changes
    const unsubscribe = observeNetworkState(() => {
      if (active && isOnline() && wasOfflineRef.current) {
        // Network came back online, poll immediately
        if (timeoutId) clearTimeout(timeoutId);
        poll();
      }
    });

    return () => {
      active = false;
      if (timeoutId) clearTimeout(timeoutId);
      unsubscribe();
    };
  }, [roomId, playerId, roomStatus, hasSubmitted, updateFromPoll, isConnected]);

  return { isConnected };
}
