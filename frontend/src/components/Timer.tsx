import { useState, useEffect, useCallback } from 'react';

interface TimerProps {
  seconds: number;
  onExpire: () => void;
}

export default function Timer({ seconds, onExpire }: TimerProps) {
  const [remaining, setRemaining] = useState(seconds);

  const stableOnExpire = useCallback(onExpire, [onExpire]);

  useEffect(() => {
    setRemaining(seconds);
  }, [seconds]);

  useEffect(() => {
    if (remaining <= 0) {
      stableOnExpire();
      return;
    }
    const timer = setTimeout(() => setRemaining((r) => r - 1), 1000);
    return () => clearTimeout(timer);
  }, [remaining, stableOnExpire]);

  const urgent = remaining <= 10;

  return (
    <div className={`text-lg font-mono ${urgent ? 'text-red-500 font-bold' : 'text-gray-600'}`}>
      Tid tilbage: {remaining}s
    </div>
  );
}
