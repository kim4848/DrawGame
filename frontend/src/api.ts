import type {
  CreateRoomResponse,
  JoinRoomResponse,
  PollResponse,
  RoomStateResponse,
  RevealResponse,
  GalleryDrawing,
} from './types';

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

export async function startGame(roomId: string, playerId: string): Promise<void> {
  const res = await fetch(`${BASE}/api/rooms/${roomId}/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerId }),
  });
  await json(res);
}

export async function pollRoom(roomId: string, playerId: string): Promise<PollResponse> {
  const res = await fetch(`${BASE}/api/rooms/${roomId}/poll?playerId=${playerId}`);
  return json(res);
}

export async function submitEntry(
  roomId: string,
  playerId: string,
  chainId: string,
  round: number,
  type: string,
  content: string
): Promise<void> {
  const res = await fetch(`${BASE}/api/rooms/${roomId}/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerId, chainId, round, type, content }),
  });
  await json(res);
}

export async function uploadDrawing(
  roomId: string,
  chainId: string,
  round: number,
  blob: Blob
): Promise<string> {
  const form = new FormData();
  form.append('roomId', roomId);
  form.append('chainId', chainId);
  form.append('round', round.toString());
  form.append('file', blob, 'drawing.png');
  const res = await fetch(`${BASE}/api/drawings/upload`, { method: 'POST', body: form });
  const data = await json<{ blobUrl: string }>(res);
  return data.blobUrl;
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

export async function markDone(roomId: string, playerId: string): Promise<void> {
  const res = await fetch(`${BASE}/api/rooms/${roomId}/done`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerId }),
  });
  await json(res);
}
