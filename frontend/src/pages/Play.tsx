import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { submitEntry, uploadDrawing } from '../api';
import { useGameStore } from '../store/gameStore';
import { useRoomPoll } from '../hooks/useRoomPoll';
import DrawCanvas from '../components/DrawCanvas';
import GuessInput from '../components/GuessInput';
import Timer from '../components/Timer';
import { getRandomWord, type RandomWord } from '../utils/wordGenerator';

export default function Play() {
  const navigate = useNavigate();
  const {
    roomId, playerId, roomStatus, currentRound, totalRounds, roundType,
    assignment, hasSubmitted
  } = useGameStore();

  const [submitting, setSubmitting] = useState(false);
  const [wordInput, setWordInput] = useState('');
  const [wordEmoji, setWordEmoji] = useState('');
  const [guessInput, setGuessInput] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useRoomPoll();

  useEffect(() => {
    if (!roomId || !playerId) {
      navigate('/');
      return;
    }
    if (roomStatus === 'REVEAL') navigate('/reveal');
    if (roomStatus === 'DONE') navigate('/');
  }, [roomId, playerId, roomStatus, navigate]);

  // Reset local submitted state when round changes
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
      setSubmitting(false);
    }
  }, [roomId, playerId, assignment, currentRound, submitting]);

  const handleTimerExpire = useCallback(() => {
    if (isSubmitted || submitting) return;
    if (roundType === 'WORD') {
      handleWordSubmit();
    } else if (roundType === 'DRAW') {
      // Auto-submit current canvas
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
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-b from-blue-50 to-white">
        <div className="text-center">
          <div className="text-4xl mb-4">&#9203;</div>
          <h2 className="text-2xl font-semibold text-gray-700">Venter på de andre spillere...</h2>
          <p className="text-gray-500 mt-2">Runde {currentRound + 1} af {totalRounds}</p>
        </div>
      </div>
    );
  }

  const timerSeconds = roundType === 'DRAW' ? 90 : 30;

  return (
    <div className="min-h-screen flex flex-col items-center p-4 bg-gradient-to-b from-blue-50 to-white">
      <div className="w-full max-w-2xl">
        <div className="flex justify-between items-center mb-4">
          <p className="text-gray-500">Runde {currentRound + 1} af {totalRounds}</p>
          <Timer key={`${currentRound}-${roundType}`} seconds={timerSeconds} onExpire={handleTimerExpire} />
        </div>

        {roundType === 'WORD' && (
          <div className="flex flex-col items-center gap-4">
            <h2 className="text-xl font-semibold">Skriv et ord eller en sætning</h2>
            <div className="w-full max-w-md flex gap-2">
              <input
                type="text"
                value={wordInput}
                onChange={(e) => { setWordInput(e.target.value); setWordEmoji(''); }}
                onKeyDown={(e) => e.key === 'Enter' && wordInput.trim() && handleWordSubmit()}
                placeholder="F.eks. 'En kat på et tag'"
                className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg text-lg focus:border-blue-500 focus:outline-none"
                autoFocus
              />
              <button
                type="button"
                onClick={() => { const r: RandomWord = getRandomWord(); setWordInput(r.word); setWordEmoji(r.emoji); }}
                title="Få et tilfældigt ord"
                className="px-3 py-3 bg-amber-400 text-white rounded-lg text-xl hover:bg-amber-500 transition-colors"
              >
                🎲
              </button>
            </div>
            {wordEmoji && (
              <div className="text-6xl animate-bounce">{wordEmoji}</div>
            )}
            <button
              onClick={handleWordSubmit}
              disabled={submitting || !wordInput.trim()}
              className="px-8 py-3 bg-blue-500 text-white rounded-lg text-lg font-semibold hover:bg-blue-600 disabled:opacity-50"
            >
              Indsend
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
    </div>
  );
}
