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
    <div className="flex flex-col items-center gap-4">
      <h2 className="font-heading text-xl font-semibold text-warm-dark">Hvad forestiller denne tegning?</h2>
      <div className="clay-card overflow-hidden">
        <img
          src={imageUrl}
          alt="Tegning at gætte"
          className="max-w-full max-h-[400px] object-contain"
        />
      </div>
      <input
        type="text"
        value={guess}
        onChange={(e) => onGuessChange(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && !disabled && handleSubmit()}
        placeholder="Skriv dit gæt..."
        className="clay-input w-full max-w-md px-4 py-3 text-lg"
        disabled={disabled}
        autoFocus
      />
      <button
        onClick={handleSubmit}
        disabled={disabled}
        className="clay-btn clay-btn-primary px-8 py-3 text-lg"
      >
        Indsend
      </button>
    </div>
  );
}
