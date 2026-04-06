import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createRoom, joinRoom } from '../api';
import { useGameStore } from '../store/gameStore';

export default function Home() {
  const navigate = useNavigate();
  const { code: urlCode } = useParams<{ code: string }>();
  const { setPlayer, setRoom, setHostId } = useGameStore();

  const [name, setName] = useState('');
  const [joinCode, setJoinCode] = useState(urlCode?.toUpperCase() || '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showHow, setShowHow] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await createRoom(name.trim());
      setPlayer(res.playerId);
      setRoom(res.roomId, res.roomCode);
      setHostId(res.playerId);
      navigate('/lobby');
    } catch (e: any) {
      setError(e.message || 'Noget gik galt.');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!name.trim() || !joinCode.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await joinRoom(joinCode.trim().toUpperCase(), name.trim());
      setPlayer(res.playerId);
      setRoom(res.roomId, joinCode.trim().toUpperCase());
      setHostId('');
      navigate('/lobby');
    } catch (e: any) {
      setError(e.message || 'Rummet blev ikke fundet. Tjek koden og prøv igen.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-b from-blue-50 to-white">
      <h1 className="text-5xl font-bold mb-2 text-gray-800">Hvad sker der egentlig?</h1>
      <p className="text-gray-500 mb-2 text-lg">Tegn, gæt og grin sammen</p>
      <button
        onClick={() => setShowHow(true)}
        className="text-blue-500 hover:text-blue-700 underline text-sm mb-10"
      >
        Hvordan spiller man?
      </button>

      {error && (
        <div className="mb-4 px-4 py-2 bg-red-100 text-red-700 rounded-lg max-w-md w-full text-center">
          {error}
        </div>
      )}

      <div className="w-full max-w-md space-y-3">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Dit navn"
          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-lg focus:border-blue-500 focus:outline-none"
          maxLength={20}
        />

        {!urlCode && !joinCode.trim() && (
          <>
            <button
              onClick={handleCreate}
              disabled={loading || !name.trim()}
              className="w-full py-3 bg-blue-500 text-white rounded-lg text-lg font-semibold hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Opret spil
            </button>

            <div className="flex items-center gap-3 my-4">
              <hr className="flex-1 border-gray-300" />
              <span className="text-gray-400 text-sm">eller</span>
              <hr className="flex-1 border-gray-300" />
            </div>
          </>
        )}

        <input
          type="text"
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
          placeholder="Indtast rumkode"
          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-lg tracking-widest text-center uppercase focus:border-blue-500 focus:outline-none"
          maxLength={6}
          readOnly={!!urlCode}
        />

        <button
          onClick={handleJoin}
          disabled={loading || !name.trim() || !joinCode.trim()}
          className="w-full py-3 bg-green-500 text-white rounded-lg text-lg font-semibold hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Deltag i spil
        </button>
      </div>

      {showHow && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowHow(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowHow(false)}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 text-2xl leading-none"
            >
              &times;
            </button>
            <h2 className="text-2xl font-bold mb-4 text-gray-800">Sådan spiller man</h2>
            <ol className="space-y-3 text-gray-600 text-sm list-decimal list-inside">
              <li>En vært opretter et rum og deler rumkoden med de andre spillere.</li>
              <li>Alle skriver et <strong>hemmeligt ord</strong> — det starter en kæde.</li>
              <li>I skiftende runder skal I enten <strong>tegne</strong> det forrige gæt eller <strong>gætte</strong> hvad tegningen forestiller.</li>
              <li>Kæderne roterer, så ingen ser deres egen kæde undervejs.</li>
              <li>Til sidst afsløres alle kæder trin for trin — og så griner I!</li>
            </ol>
            <div className="mt-5 pt-4 border-t border-gray-100 text-xs text-gray-400 space-y-1">
              <p>3–12 spillere &middot; 90 sek. til at tegne &middot; 30 sek. til at gætte</p>
            </div>
            <button
              onClick={() => setShowHow(false)}
              className="mt-4 w-full py-2 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600"
            >
              Forstået!
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
