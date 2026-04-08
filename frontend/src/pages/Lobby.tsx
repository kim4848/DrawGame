import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { startGame } from '../api';
import { useGameStore } from '../store/gameStore';
import { addToast } from '../store/toastStore';
import { useRoomPoll } from '../hooks/useRoomPoll';
import WordPackSelector from '../components/WordPackSelector';

export default function Lobby() {
  const navigate = useNavigate();
  const { roomId, roomCode, playerId, hostId, roomStatus, players } = useGameStore();

  useRoomPoll();

  useEffect(() => {
    if (!roomId || !playerId) {
      navigate('/');
      return;
    }
    if (roomStatus === 'ACTIVE') navigate('/play');
    if (roomStatus === 'REVEAL') navigate('/reveal');
  }, [roomId, playerId, roomStatus, navigate]);

  const [copied, setCopied] = useState(false);
  const [timerPreset, setTimerPreset] = useState<'short' | 'normal' | 'long'>('normal');
  const [showTimerSettings, setShowTimerSettings] = useState(false);
  const [selectedWordPackId, setSelectedWordPackId] = useState<string | undefined>();

  const siteUrl = import.meta.env.VITE_PUBLIC_SITE_URL || window.location.origin;
  const shareLink = `${siteUrl}/join/${roomCode}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const input = document.createElement('input');
      input.value = shareLink;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const isHost = playerId === hostId;
  const canStart = isHost && players.length >= 2;

  const timerConfig = {
    short:  { draw: 45,  guess: 15, label: 'Kort (45s / 15s)' },
    normal: { draw: 90,  guess: 30, label: 'Normal (90s / 30s)' },
    long:   { draw: 120, guess: 45, label: 'Lang (120s / 45s)' },
  } as const;

  const handleStart = async () => {
    if (!roomId || !playerId) return;
    try {
      const t = timerConfig[timerPreset];
      await startGame(roomId, playerId, t.draw, t.guess, selectedWordPackId);
    } catch (e: unknown) {
      addToast((e instanceof Error && e.message) || 'Kunne ikke starte spillet.', 'error');
    }
  };

  return (
    <div className="clay-bg flex flex-col items-center justify-center p-4 min-h-screen">
      <h1 className="font-heading text-2xl sm:text-3xl font-bold mb-2 text-warm-dark">Lobby</h1>

      <div className="mb-6 text-center">
        <p className="text-warm-mid text-sm mb-1 font-medium">Rumkode</p>
        <p className="font-heading text-3xl sm:text-4xl font-bold tracking-widest text-coral" data-testid="room-code">
          {roomCode}
        </p>
        {roomCode && (
          <div className="mt-4 clay-card inline-block p-2 sm:p-3">
            <QRCodeSVG value={shareLink} size={120} className="w-[120px] h-[120px] sm:w-[160px] sm:h-[160px]" width={160} height={160} />
          </div>
        )}
        <p className="text-warm-mid text-xs sm:text-sm mt-2">Scan for at deltage</p>
        <button
          onClick={handleCopyLink}
          className="clay-btn clay-btn-soft mt-2 px-4 py-2.5 text-sm min-h-[44px]"
        >
          {copied ? 'Link kopieret!' : 'Kopiér invitationslink'}
        </button>
      </div>

      <div className="w-full max-w-sm mb-6 px-2">
        <h2 className="font-heading text-base sm:text-lg font-semibold mb-2 text-warm-dark">
          Spillere ({players.length})
        </h2>
        <ul className="space-y-2">
          {players.map((p) => (
            <li
              key={p.id}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2.5 sm:py-2 rounded-[var(--radius-clay-sm)] border-2 ${
                p.isActive
                  ? 'bg-white border-warm-border'
                  : 'bg-cream-dark border-warm-border text-warm-mid'
              }`}
            >
              <span className={`w-3 h-3 rounded-full border-2 shrink-0 ${
                p.isActive
                  ? 'bg-mint border-mint-dark'
                  : 'bg-warm-border border-warm-border-dark'
              }`} />
              <span className="font-medium text-sm sm:text-base truncate">{p.name}</span>
              {p.id === hostId && (
                <span className="ml-auto text-xs text-coral font-heading font-bold shrink-0">Vært</span>
              )}
            </li>
          ))}
        </ul>
      </div>

      {isHost ? (
        <div className="flex flex-col items-center gap-4 w-full max-w-sm px-2">
          <WordPackSelector
            selectedPackId={selectedWordPackId}
            onSelect={setSelectedWordPackId}
          />
          <div className="w-full">
            <button
              onClick={() => setShowTimerSettings(!showTimerSettings)}
              className="clay-btn clay-btn-soft px-3 py-2 text-sm min-h-[44px] w-full flex items-center justify-center gap-2"
              aria-expanded={showTimerSettings}
              aria-label="Tidsbegrænsning"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <span className="text-warm-mid">{timerConfig[timerPreset].label}</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={`text-warm-mid transition-transform duration-200 ${showTimerSettings ? 'rotate-180' : ''}`}>
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            {showTimerSettings && (
              <div className="clay-card p-3 mt-2 w-full">
                <div className="flex flex-col sm:flex-row gap-2 justify-center">
                  {(['short', 'normal', 'long'] as const).map((preset) => (
                    <button
                      key={preset}
                      onClick={() => { setTimerPreset(preset); setShowTimerSettings(false); }}
                      className={`clay-btn px-3 py-2.5 sm:py-1.5 text-sm min-h-[44px] ${
                        timerPreset === preset ? 'clay-btn-primary' : 'clay-btn-soft'
                      }`}
                    >
                      {timerConfig[preset].label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <button
            onClick={handleStart}
            disabled={!canStart}
            className="clay-btn clay-btn-primary px-8 py-3 text-lg min-h-[48px] w-full"
          >
            {canStart ? 'Start spillet' : `Venter på spillere... (min. 2)`}
          </button>
        </div>
      ) : (
        <p className="text-warm-mid text-base sm:text-lg font-medium text-center px-4">Venter på at værten starter spillet...</p>
      )}
    </div>
  );
}
