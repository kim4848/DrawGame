/**
 * Network resilience utilities for API calls and polling
 */

export interface RetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  shouldRetry?: (error: Error, attempt: number) => boolean;
}

const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
  shouldRetry: (error: Error) => {
    // Retry on network errors, not on client errors (4xx)
    return !error.message.includes('HTTP 4');
  }
};

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: Error;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt === opts.maxRetries || !opts.shouldRetry(lastError, attempt)) {
        throw lastError;
      }

      const delay = Math.min(
        opts.initialDelayMs * Math.pow(opts.backoffMultiplier, attempt),
        opts.maxDelayMs
      );

      await sleep(delay);
    }
  }

  throw lastError!;
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Check if browser is online
 */
export function isOnline(): boolean {
  return navigator.onLine;
}

/**
 * Check if page is visible (not hidden/minimized)
 */
export function isPageVisible(): boolean {
  return document.visibilityState === 'visible';
}

/**
 * Network state observer - calls callback when online/offline or visibility changes
 */
export function observeNetworkState(callback: () => void): () => void {
  const handleOnline = () => callback();
  const handleOffline = () => callback();
  const handleVisibility = () => callback();

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  document.addEventListener('visibilitychange', handleVisibility);

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
    document.removeEventListener('visibilitychange', handleVisibility);
  };
}

/**
 * Get user-friendly error message in Danish
 */
export function getErrorMessage(error: Error): string {
  if (!isOnline()) {
    return 'Ingen internetforbindelse. Tjek din netværksforbindelse.';
  }

  const message = error.message;

  if (message.includes('HTTP 429')) {
    return 'For mange anmodninger. Vent venligst et øjeblik.';
  }

  if (message.includes('HTTP 5')) {
    return 'Serverfejl. Prøver automatisk igen...';
  }

  if (message.includes('Failed to fetch') || message.includes('NetworkError')) {
    return 'Netværksfejl. Prøver automatisk igen...';
  }

  return 'Noget gik galt. Prøv igen.';
}

/**
 * Store data in localStorage with error handling
 */
export function safeLocalStorageSet(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get data from localStorage with error handling
 */
export function safeLocalStorageGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * Remove data from localStorage with error handling
 */
export function safeLocalStorageRemove(key: string): boolean {
  try {
    localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}
