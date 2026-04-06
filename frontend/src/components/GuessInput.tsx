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
      <h2 className="text-xl font-semibold">Hvad forestiller denne tegning?</h2>
      <div className="border-2 border-gray-300 rounded-lg overflow-hidden bg-white">
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
        className="w-full max-w-md px-4 py-3 border-2 border-gray-300 rounded-lg text-lg focus:border-blue-500 focus:outline-none"
        disabled={disabled}
        autoFocus
      />
      <button
        onClick={handleSubmit}
        disabled={disabled}
        className="px-8 py-3 bg-blue-500 text-white rounded-lg text-lg font-semibold hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Indsend
      </button>
    </div>
  );
}
