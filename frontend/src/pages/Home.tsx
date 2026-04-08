import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createRoom, joinRoom } from '../api';
import { useGameStore } from '../store/gameStore';
import { addToast } from '../store/toastStore';
import DrawingCarousel from '../components/DrawingCarousel';
import { useFocusTrap } from '../hooks/useFocusTrap';

export default function Home() {
  const navigate = useNavigate();
  const { code: urlCode } = useParams<{ code: string }>();
  const { setPlayer, setRoom, setHostId } = useGameStore();

  const [name, setName] = useState('');
  const [joinCode, setJoinCode] = useState(urlCode?.toUpperCase() || '');
  const [loading, setLoading] = useState(false);
  const [showHow, setShowHow] = useState(false);
  const modalRef = useFocusTrap(showHow);

  // Handle Escape key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showHow) {
        setShowHow(false);
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [showHow]);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setLoading(true);
    try {
      const res = await createRoom(name.trim());
      setPlayer(res.playerId);
      setRoom(res.roomId, res.roomCode);
      setHostId(res.playerId);
      navigate('/lobby');
    } catch (e: unknown) {
      addToast((e instanceof Error && e.message) || 'Noget gik galt.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!name.trim() || !joinCode.trim()) return;
    setLoading(true);
    try {
      const res = await joinRoom(joinCode.trim().toUpperCase(), name.trim());
      setPlayer(res.playerId);
      setRoom(res.roomId, joinCode.trim().toUpperCase());
      setHostId('');
      navigate('/lobby');
    } catch (e: unknown) {
      addToast((e instanceof Error && e.message) || 'Rummet blev ikke fundet. Tjek koden og prøv igen.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="clay-bg flex flex-col items-center justify-center p-4 min-h-screen">
      <h1 className="font-heading text-4xl sm:text-5xl font-bold mb-2 text-warm-dark text-center px-2">
        Hvad sker der egentlig?
      </h1>
      <p className="text-warm-mid mb-2 text-base sm:text-lg font-medium text-center">Tegn, gæt og grin sammen</p>
      <button
        onClick={() => setShowHow(true)}
        className="text-coral hover:text-coral-dark underline text-sm mb-4 font-semibold min-h-[44px] px-4 py-2"
      >
        Hvordan spiller man?
      </button>

      <DrawingCarousel />

      <div className="w-full max-w-md space-y-3 px-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Dit navn"
          className="clay-input w-full px-4 py-3 text-base sm:text-lg"
          maxLength={20}
          autoComplete="name"
          autoCapitalize="words"
        />

        {!urlCode && !joinCode.trim() && (
          <>
            <button
              onClick={handleCreate}
              disabled={loading || !name.trim()}
              className="clay-btn clay-btn-primary w-full py-3 text-lg min-h-[48px]"
            >
              Opret spil
            </button>

            <div className="flex items-center gap-3 my-4">
              <hr className="flex-1 border-warm-border" />
              <span className="text-warm-mid text-sm font-medium">eller</span>
              <hr className="flex-1 border-warm-border" />
            </div>
          </>
        )}

        <input
          type="text"
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
          placeholder="Indtast rumkode"
          className="clay-input w-full px-4 py-3 text-base sm:text-lg tracking-widest text-center uppercase font-heading font-bold"
          maxLength={6}
          readOnly={!!urlCode}
          autoComplete="off"
          autoCapitalize="characters"
        />

        <button
          onClick={handleJoin}
          disabled={loading || !name.trim() || !joinCode.trim()}
          className="clay-btn clay-btn-secondary w-full py-3 text-lg min-h-[48px]"
        >
          Deltag i spil
        </button>
      </div>

      {showHow && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-0 sm:p-4"
          onClick={() => setShowHow(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="how-to-play-title"
        >
          <div
            ref={modalRef}
            className="clay-card max-w-md w-full p-6 relative h-full sm:h-auto rounded-none sm:rounded-[var(--radius-clay)] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowHow(false)}
              className="absolute top-3 right-3 text-warm-mid hover:text-warm-dark text-2xl leading-none w-10 h-10 flex items-center justify-center"
              aria-label="Luk"
            >
              &times;
            </button>
            <h2 id="how-to-play-title" className="font-heading text-xl sm:text-2xl font-bold mb-4 text-warm-dark pr-8">Sådan spiller man</h2>
            <ol className="space-y-3 text-warm-mid text-sm sm:text-base list-decimal list-inside">
              <li>En vært opretter et rum og deler rumkoden med de andre spillere.</li>
              <li>Alle skriver et <strong>hemmeligt ord</strong> — det starter en kæde.</li>
              <li>I skiftende runder skal I enten <strong>tegne</strong> det forrige gæt eller <strong>gætte</strong> hvad tegningen forestiller.</li>
              <li>Kæderne roterer, så ingen ser deres egen kæde undervejs.</li>
              <li>Til sidst afsløres alle kæder trin for trin — og så griner I!</li>
            </ol>
            <div className="mt-5 pt-4 border-t border-warm-border text-xs sm:text-sm text-warm-mid space-y-1">
              <p>3–12 spillere &middot; 90 sek. til at tegne &middot; 30 sek. til at gætte</p>
            </div>
            <button
              onClick={() => setShowHow(false)}
              className="clay-btn clay-btn-primary mt-4 w-full py-2.5 min-h-[48px]"
            >
              Forstået!
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
