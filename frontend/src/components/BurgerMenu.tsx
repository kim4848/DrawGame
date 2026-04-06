import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { rejoinRoom } from '../api';
import { useGameStore } from '../store/gameStore';

export default function BurgerMenu() {
  const navigate = useNavigate();
  const { playerId, roomCode, setRoom, clear } = useGameStore();
  const [open, setOpen] = useState(false);
  const [rejoining, setRejoining] = useState(false);
  const [error, setError] = useState('');

  const canRejoin = !!playerId && !!roomCode;

  const handleRejoin = async () => {
    if (!playerId || !roomCode) return;
    setRejoining(true);
    setError('');
    try {
      const res = await rejoinRoom(roomCode, playerId);
      setRoom(res.roomId, roomCode);
      setOpen(false);
      if (res.status === 'LOBBY') navigate('/lobby');
      else if (res.status === 'ACTIVE') navigate('/play');
      else if (res.status === 'REVEAL') navigate('/reveal');
    } catch {
      setError('Spillet er muligvis afsluttet.');
      clear();
    } finally {
      setRejoining(false);
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50">
      <button
        onClick={() => setOpen(!open)}
        className="w-10 h-10 flex flex-col items-center justify-center gap-1.5 bg-white rounded-lg shadow-md border border-gray-200 hover:bg-gray-50"
        aria-label="Menu"
      >
        <span className={`block w-5 h-0.5 bg-gray-600 transition-transform ${open ? 'rotate-45 translate-y-2' : ''}`} />
        <span className={`block w-5 h-0.5 bg-gray-600 transition-opacity ${open ? 'opacity-0' : ''}`} />
        <span className={`block w-5 h-0.5 bg-gray-600 transition-transform ${open ? '-rotate-45 -translate-y-2' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 p-3 space-y-2">
          {canRejoin && (
            <button
              onClick={handleRejoin}
              disabled={rejoining}
              className="w-full py-2 px-3 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600 disabled:opacity-50 text-sm"
            >
              {rejoining ? 'Genopretter...' : `Genopret forbindelse (${roomCode})`}
            </button>
          )}
          {!canRejoin && (
            <p className="text-gray-400 text-sm text-center py-1">Ingen aktiv session</p>
          )}
          {error && (
            <p className="text-red-500 text-xs text-center">{error}</p>
          )}
        </div>
      )}
    </div>
  );
}
