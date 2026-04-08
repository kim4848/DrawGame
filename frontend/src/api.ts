import type {
  CreateRoomResponse,
  JoinRoomResponse,
  PollResponse,
  RoomStateResponse,
  RevealResponse,
  GalleryDrawing,
  WordPack,
} from './types';
import { retryWithBackoff } from './utils/network';

const BASE = '';

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function createRoom(name: string): Promise<CreateRoomResponse> {
  const res = await fetch(`${BASE}/api/rooms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  return json(res);
}

export async function joinRoom(code: string, name: string): Promise<JoinRoomResponse> {
  const res = await fetch(`${BASE}/api/rooms/${code}/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  return json(res);
}

export async function rejoinRoom(code: string, playerId: string): Promise<{ roomId: string; status: string }> {
  const res = await fetch(`${BASE}/api/rooms/${code}/rejoin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerId }),
  });
  return json(res);
}

export async function getRoomState(code: string): Promise<RoomStateResponse> {
  const res = await fetch(`${BASE}/api/rooms/${code}`);
  return json(res);
}

export async function startGame(
  roomId: string,
  playerId: string,
  drawTimer?: number,
  guessTimer?: number,
  wordPackId?: string
): Promise<void> {
  const res = await fetch(`${BASE}/api/rooms/${roomId}/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerId, drawTimer, guessTimer, wordPackId }),
  });
  await json(res);
}

export async function pollRoom(roomId: string, playerId: string): Promise<PollResponse> {
  return retryWithBackoff(async () => {
    const res = await fetch(`${BASE}/api/rooms/${roomId}/poll?playerId=${playerId}`);
    return json(res);
  }, {
    maxRetries: 2,
    initialDelayMs: 500,
  });
}

export async function submitEntry(
  roomId: string,
  playerId: string,
  chainId: string,
  round: number,
  type: string,
  content: string
): Promise<void> {
  return retryWithBackoff(async () => {
    const res = await fetch(`${BASE}/api/rooms/${roomId}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId, chainId, round, type, content }),
    });
    await json(res);
  }, {
    maxRetries: 3,
    initialDelayMs: 1000,
  });
}

export async function uploadDrawing(
  roomId: string,
  chainId: string,
  round: number,
  blob: Blob
): Promise<string> {
  return retryWithBackoff(async () => {
    const form = new FormData();
    form.append('roomId', roomId);
    form.append('chainId', chainId);
    form.append('round', round.toString());
    form.append('file', blob, 'drawing.png');
    const res = await fetch(`${BASE}/api/drawings/upload`, { method: 'POST', body: form });
    const data = await json<{ blobUrl: string }>(res);
    return data.blobUrl;
  }, {
    maxRetries: 3,
    initialDelayMs: 1000,
  });
}

export async function getRevealData(roomId: string): Promise<RevealResponse> {
  const res = await fetch(`${BASE}/api/rooms/${roomId}/reveal`);
  return json(res);
}

export async function getGalleryDrawings(count = 8): Promise<GalleryDrawing[]> {
  const res = await fetch(`${BASE}/api/drawings/gallery?count=${count}`);
  if (!res.ok) return [];
  return res.json();
}

export async function playAgain(roomId: string, playerId: string): Promise<{ roomId: string; roomCode: string; playerId: string }> {
  const res = await fetch(`${BASE}/api/rooms/${roomId}/play-again`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerId }),
  });
  return json(res);
}

export async function markDone(roomId: string, playerId: string): Promise<void> {
  const res = await fetch(`${BASE}/api/rooms/${roomId}/done`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerId }),
  });
  await json(res);
}

// Auth API
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  displayName: string;
}

export interface LoginResponse {
  token: string;
  user: {
    id: string;
    email: string;
    displayName: string;
  };
}

export interface AuthResponse {
  id: string;
  email: string;
  displayName: string;
  createdAt?: string;
  lastLoginAt?: string;
}

export async function login(data: LoginRequest): Promise<LoginResponse> {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return json(res);
}

export async function register(data: RegisterRequest): Promise<LoginResponse> {
  const res = await fetch(`${BASE}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return json(res);
}

export async function checkSession(): Promise<AuthResponse | null> {
  const token = localStorage.getItem('authToken');
  if (!token) return null;

  try {
    const res = await fetch(`${BASE}/api/auth/me`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!res.ok) {
      localStorage.removeItem('authToken');
      return null;
    }
    return json(res);
  } catch {
    localStorage.removeItem('authToken');
    return null;
  }
}

export async function logout(): Promise<void> {
  localStorage.removeItem('authToken');
}

// Payment API
export interface SubscriptionResponse {
  isPremium: boolean;
  status: string;
  currentPeriodEnd?: string;
}

export async function createCheckout(): Promise<{ url: string }> {
  const token = localStorage.getItem('authToken');
  if (!token) throw new Error('Not authenticated');

  const res = await fetch(`${BASE}/api/payments/create-checkout`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  return json(res);
}

export async function getSubscription(): Promise<SubscriptionResponse> {
  const token = localStorage.getItem('authToken');
  if (!token) throw new Error('Not authenticated');

  const res = await fetch(`${BASE}/api/payments/subscription`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  return json(res);
}

export async function createPortalSession(): Promise<{ url: string }> {
  const token = localStorage.getItem('authToken');
  if (!token) throw new Error('Not authenticated');

  const res = await fetch(`${BASE}/api/payments/portal`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  return json(res);
}

// Word Pack API
export async function getWordPacks(): Promise<WordPack[]> {
  const token = localStorage.getItem('authToken');
  const headers: HeadersInit = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE}/api/word-packs`, { headers });
  return json(res);
}

export async function getWordPack(id: string): Promise<WordPack> {
  const token = localStorage.getItem('authToken');
  const headers: HeadersInit = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE}/api/word-packs/${id}`, { headers });
  return json(res);
}

export async function getRandomWordFromPack(id: string): Promise<{ word: string }> {
  const token = localStorage.getItem('authToken');
  const headers: HeadersInit = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE}/api/word-packs/${id}/random-word`, { headers });
  return json(res);
}
