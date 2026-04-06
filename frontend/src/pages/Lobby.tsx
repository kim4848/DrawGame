import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { startGame } from '../api';
import { useGameStore } from '../store/gameStore';
import { useRoomPoll } from '../hooks/useRoomPoll';

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

  const shareLink = `${window.location.origin}/join/${roomCode}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for browsers without clipboard API
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

  const handleStart = async () => {
    if (!roomId || !playerId) return;
    try {
      await startGame(roomId, playerId);
    } catch (e: any) {
      alert(e.message || 'Kunne ikke starte spillet.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-b from-blue-50 to-white">
      <h1 className="text-3xl font-bold mb-2 text-gray-800">Lobby</h1>

      <div className="mb-6 text-center">
        <p className="text-gray-500 text-sm mb-1">Rumkode</p>
        <p className="text-4xl font-mono font-bold tracking-widest text-blue-600" data-testid="room-code">
          {roomCode}
        </p>
        {roomCode && (
          <div className="mt-4 bg-white p-3 rounded-xl inline-block">
            <QRCodeSVG value={shareLink} size={160} />
          </div>
        )}
        <p className="text-gray-400 text-sm mt-2">Scan for at deltage</p>
        <button
          onClick={handleCopyLink}
          className="mt-2 px-4 py-2 bg-blue-100 text-blue-600 rounded-lg text-sm font-semibold hover:bg-blue-200 transition-colors"
        >
          {copied ? 'Link kopieret!' : 'Kopiér invitationslink'}
        </button>
      </div>

      <div className="w-full max-w-sm mb-6">
        <h2 className="text-lg font-semibold mb-2 text-gray-700">
          Spillere ({players.length})
        </h2>
        <ul className="space-y-2">
          {players.map((p) => (
            <li
              key={p.id}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                p.isActive ? 'bg-white border border-gray-200' : 'bg-gray-100 text-gray-400'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${p.isActive ? 'bg-green-500' : 'bg-gray-300'}`} />
              <span>{p.name}</span>
              {p.id === hostId && <span className="ml-auto text-xs text-blue-500 font-semibold">Vært</span>}
            </li>
          ))}
        </ul>
      </div>

      {isHost ? (
        <button
          onClick={handleStart}
          disabled={!canStart}
          className="px-8 py-3 bg-blue-500 text-white rounded-lg text-lg font-semibold hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {canStart ? 'Start spillet' : `Venter på spillere... (min. 2)`}
        </button>
      ) : (
        <p className="text-gray-500 text-lg">Venter på at værten starter spillet...</p>
      )}
    </div>
  );
}
