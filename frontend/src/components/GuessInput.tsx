interface GuessInputProps {
  imageUrl: string;
  onSubmit: (guess: string) => void;
  disabled: boolean;
  guess: string;
  onGuessChange: (value: string) => void;
}

export default function GuessInput({ imageUrl, onSubmit, disabled, guess, onGuessChange }: GuessInputProps) {

  const handleSubmit = () => {
    onSubmit(guess || '(intet gæt)');
  };

  return (
    <div className="flex flex-col items-center gap-4 px-2">
      <h2 className="font-heading text-lg sm:text-xl font-semibold text-warm-dark text-center">Hvad forestiller denne tegning?</h2>
      <div className="clay-card overflow-hidden w-full max-w-md">
        <img
          src={imageUrl}
          alt="Tegning at gætte"
          className="w-full max-h-[300px] sm:max-h-[400px] object-contain"
        />
      </div>
      <input
        type="text"
        value={guess}
        onChange={(e) => onGuessChange(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && !disabled && handleSubmit()}
        placeholder="Skriv dit gæt..."
        className="clay-input w-full max-w-md px-4 py-3 text-base sm:text-lg"
        disabled={disabled}
        autoFocus
        autoComplete="off"
        autoCapitalize="sentences"
      />
      <button
        onClick={handleSubmit}
        disabled={disabled}
        className="clay-btn clay-btn-primary px-8 py-3 text-lg min-h-[48px] w-full sm:w-auto max-w-xs relative"
      >
        {disabled ? (
          <>
            <span className="opacity-50">Indsender</span>
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xl animate-spin">⏳</span>
          </>
        ) : (
          'Indsend'
        )}
      </button>
    </div>
  );
}
