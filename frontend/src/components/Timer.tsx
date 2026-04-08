import { useState, useEffect, useRef } from 'react';

interface TimerProps {
  seconds: number;
  onExpire: () => void;
}

export default function Timer({ seconds, onExpire }: TimerProps) {
  // Use lazy state initialization to avoid recomputing initial value on every render
  const [remaining, setRemaining] = useState(() => seconds);

  // Store onExpire in a ref to avoid recreating the effect when callback changes
  // (Advanced Pattern 8.3: Store Event Handlers in Refs)
  const onExpireRef = useRef(onExpire);

  // Keep ref up to date with latest callback
  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  // Reset timer when seconds prop changes
  useEffect(() => {
    setRemaining(seconds);
  }, [seconds]);

  // Timer countdown effect
  useEffect(() => {
    if (remaining <= 0) {
      // Call the ref, which always has the latest callback
      onExpireRef.current();
      return;
    }

    // Use functional setState for stable updates (Rule 5.11)
    const timer = setTimeout(() => setRemaining((r) => r - 1), 1000);
    return () => clearTimeout(timer);
  }, [remaining]);

  // Simple boolean expression - no useMemo needed (Rule 5.3)
  const urgent = remaining <= 10;

  return (
    <div className={`font-heading text-xl sm:text-lg font-bold ${urgent ? 'text-coral animate-wiggle' : 'text-warm-mid'}`}>
      <span className="hidden sm:inline">Tid tilbage: </span>
      <span className="sm:hidden">⏱ </span>
      {remaining}s
    </div>
  );
}
