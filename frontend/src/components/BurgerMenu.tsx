import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { rejoinRoom } from '../api';
import { useGameStore } from '../store/gameStore';
import { useFocusTrap } from '../hooks/useFocusTrap';

export default function BurgerMenu() {
  const navigate = useNavigate();
  const { playerId, roomCode, setRoom, clear } = useGameStore();
  const [open, setOpen] = useState(false);
  const [rejoining, setRejoining] = useState(false);
  const [error, setError] = useState('');
  const menuRef = useFocusTrap(open);

  // Handle Escape key to close menu
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [open]);

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
        className="w-10 h-10 flex flex-col items-center justify-center gap-1.5 bg-white rounded-[var(--radius-clay-sm)] border-3 border-warm-border hover:bg-cream-dark"
        style={{ boxShadow: '3px 3px 0px var(--color-card-shadow)' }}
        aria-label="Menu"
      >
        <span className={`block w-5 h-0.5 bg-warm-dark transition-transform ${open ? 'rotate-45 translate-y-2' : ''}`} />
        <span className={`block w-5 h-0.5 bg-warm-dark transition-opacity ${open ? 'opacity-0' : ''}`} />
        <span className={`block w-5 h-0.5 bg-warm-dark transition-transform ${open ? '-rotate-45 -translate-y-2' : ''}`} />
      </button>

      {open && (
        <div
          ref={menuRef}
          className="absolute right-0 mt-2 w-64 clay-card p-3 space-y-2"
          role="menu"
          aria-label="Navigationsmenu"
        >
          {canRejoin && (
            <button
              onClick={handleRejoin}
              disabled={rejoining}
              className="clay-btn clay-btn-accent w-full py-2 px-3 text-sm"
            >
              {rejoining ? 'Genopretter...' : `Genopret forbindelse (${roomCode})`}
            </button>
          )}
          {!canRejoin && (
            <p className="text-warm-mid text-sm text-center py-1 font-medium">Ingen aktiv session</p>
          )}
          {error && (
            <p className="text-red-500 text-xs text-center font-medium">{error}</p>
          )}
        </div>
      )}
    </div>
  );
}
