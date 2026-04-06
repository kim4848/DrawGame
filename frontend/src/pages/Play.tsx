import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { submitEntry, uploadDrawing } from '../api';
import { useGameStore } from '../store/gameStore';
import { useRoomPoll } from '../hooks/useRoomPoll';
import DrawCanvas from '../components/DrawCanvas';
import GuessInput from '../components/GuessInput';
import Timer from '../components/Timer';
import ConfirmModal from '../components/ConfirmModal';
import { addToast } from '../store/toastStore';
import { getRandomWord, type RandomWord } from '../utils/wordGenerator';

export default function Play() {
  const navigate = useNavigate();
  const {
    roomId, playerId, roomStatus, currentRound, totalRounds, roundType,
    assignment, hasSubmitted, drawTimer, guessTimer
  } = useGameStore();

  const [submitting, setSubmitting] = useState(false);
  const [wordInput, setWordInput] = useState('');
  const [wordEmoji, setWordEmoji] = useState('');
  const [guessInput, setGuessInput] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);

  const { isConnected } = useRoomPoll();

  useEffect(() => {
    if (!roomId || !playerId) {
      navigate('/');
      return;
    }
    if (roomStatus === 'REVEAL') navigate('/reveal');
    if (roomStatus === 'DONE') navigate('/');
  }, [roomId, playerId, roomStatus, navigate]);

  // Prevent accidental browser close/refresh during active game
  useEffect(() => {
    if (roomStatus !== 'ACTIVE') return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = ''; // Required for Chrome
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [roomStatus]);

  useEffect(() => {
    setSubmitted(false);
    setWordInput('');
    setWordEmoji('');
    setGuessInput('');
    setSubmitting(false);
  }, [currentRound]);

  const isSubmitted = submitted || hasSubmitted;

  const handleWordSubmit = useCallback(async () => {
    if (!roomId || !playerId || !assignment || submitting) return;
    setSubmitting(true);
    try {
      const content = wordInput.trim() || '(intet ord)';
      await submitEntry(roomId, playerId, assignment.chainId, currentRound, 'WORD', content);
      setSubmitted(true);
    } catch {
      addToast('Kunne ikke indsende. Prøv igen.', 'error');
      setSubmitting(false);
    }
  }, [roomId, playerId, assignment, currentRound, wordInput, submitting]);

  const handleDrawSubmit = useCallback(async (blob: Blob) => {
    if (!roomId || !playerId || !assignment || submitting) return;
    setSubmitting(true);
    try {
      const blobUrl = await uploadDrawing(roomId, assignment.chainId, currentRound, blob);
      await submitEntry(roomId, playerId, assignment.chainId, currentRound, 'DRAW', blobUrl);
      setSubmitted(true);
    } catch {
      addToast('Kunne ikke indsende tegning. Prøv igen.', 'error');
      setSubmitting(false);
    }
  }, [roomId, playerId, assignment, currentRound, submitting]);

  const handleGuessSubmit = useCallback(async (guess: string) => {
    if (!roomId || !playerId || !assignment || submitting) return;
    setSubmitting(true);
    try {
      await submitEntry(roomId, playerId, assignment.chainId, currentRound, 'GUESS', guess);
      setSubmitted(true);
    } catch {
      addToast('Kunne ikke indsende gæt. Prøv igen.', 'error');
      setSubmitting(false);
    }
  }, [roomId, playerId, assignment, currentRound, submitting]);

  const handleTimerExpire = useCallback(() => {
    if (isSubmitted || submitting) return;
    if (roundType === 'WORD') {
      handleWordSubmit();
    } else if (roundType === 'DRAW') {
      const canvas = document.querySelector('canvas');
      if (canvas) {
        canvas.toBlob((blob) => {
          if (blob) handleDrawSubmit(blob);
        }, 'image/png');
      }
    } else if (roundType === 'GUESS') {
      handleGuessSubmit(guessInput.trim() || '(intet gæt)');
    }
  }, [isSubmitted, submitting, roundType, handleWordSubmit, handleDrawSubmit, handleGuessSubmit, guessInput]);

  if (isSubmitted) {
    return (
      <div className="clay-bg flex flex-col items-center justify-center p-4 min-h-screen">
        <div className="clay-card p-6 sm:p-8 text-center max-w-sm">
          <div className="text-4xl mb-4 animate-clay-bounce">&#9203;</div>
          <h2 className="font-heading text-xl sm:text-2xl font-semibold text-warm-dark">Venter på de andre spillere...</h2>
          <p className="text-warm-mid mt-2 text-sm sm:text-base">Runde {currentRound + 1} af {totalRounds}</p>
          {!isConnected && (
            <p className="text-red-600 mt-3 text-xs">⚠️ Ingen forbindelse</p>
          )}
        </div>
      </div>
    );
  }

  const timerSeconds = roundType === 'DRAW' ? drawTimer : guessTimer;

  return (
    <div className="clay-bg flex flex-col items-center p-2 sm:p-4">
      <div className="w-full max-w-2xl">
        <div className="sticky top-0 z-10 bg-cream/95 backdrop-blur-sm py-2 sm:py-0 sm:bg-transparent flex justify-between items-center mb-2 sm:mb-4 px-2 sm:px-0 -mx-2 sm:mx-0">
          <div className="flex items-center gap-2">
            <p className="text-warm-mid font-heading font-medium text-sm sm:text-base">Runde {currentRound + 1} af {totalRounds}</p>
            {!isConnected && (
              <span className="text-red-600 text-xs" title="Ingen forbindelse">⚠️</span>
            )}
          </div>
          <Timer key={`${currentRound}-${roundType}`} seconds={timerSeconds} onExpire={handleTimerExpire} />
        </div>

        {roundType === 'WORD' && (
          <div className="flex flex-col items-center gap-4 px-2">
            <h2 className="font-heading text-lg sm:text-xl font-semibold text-warm-dark text-center">Skriv et ord eller en sætning</h2>
            <div className="w-full max-w-md flex gap-2">
              <input
                type="text"
                value={wordInput}
                onChange={(e) => { setWordInput(e.target.value); setWordEmoji(''); }}
                onKeyDown={(e) => e.key === 'Enter' && wordInput.trim() && handleWordSubmit()}
                placeholder="F.eks. 'En kat på et tag'"
                className="clay-input flex-1 px-4 py-3 text-base sm:text-lg"
                autoFocus
                autoComplete="off"
                autoCapitalize="sentences"
              />
              <button
                type="button"
                onClick={() => { const r: RandomWord = getRandomWord(); setWordInput(r.word); setWordEmoji(r.emoji); }}
                title="Få et tilfældigt ord"
                className="clay-btn clay-btn-accent px-3 py-3 text-xl min-h-[52px] min-w-[52px]"
                aria-label="Få et tilfældigt ord"
              >
                🎲
              </button>
            </div>
            {wordEmoji && (
              <div className="text-6xl animate-clay-bounce">{wordEmoji}</div>
            )}
            <button
              onClick={handleWordSubmit}
              disabled={submitting || !wordInput.trim()}
              className="clay-btn clay-btn-primary px-8 py-3 text-lg min-h-[48px] w-full sm:w-auto max-w-xs relative"
            >
              {submitting ? (
                <>
                  <span className="opacity-50">Indsender</span>
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xl animate-spin">⏳</span>
                </>
              ) : (
                'Indsend'
              )}
            </button>
          </div>
        )}

        {roundType === 'DRAW' && assignment?.content && (
          <DrawCanvas
            prompt={assignment.content}
            onSubmit={handleDrawSubmit}
            disabled={submitting}
          />
        )}

        {roundType === 'GUESS' && assignment?.content && (
          <GuessInput
            imageUrl={assignment.content}
            onSubmit={handleGuessSubmit}
            disabled={submitting}
            guess={guessInput}
            onGuessChange={setGuessInput}
          />
        )}
      </div>

      <ConfirmModal
        isOpen={showExitConfirm}
        title="Forlad spillet?"
        message="Du er i gang med et aktivt spil. Er du sikker på at du vil forlade?"
        confirmText="Ja, forlad"
        cancelText="Bliv"
        onConfirm={() => {
          setShowExitConfirm(false);
          if (pendingNavigation) {
            navigate(pendingNavigation);
          }
        }}
        onCancel={() => {
          setShowExitConfirm(false);
          setPendingNavigation(null);
        }}
      />
    </div>
  );
}
