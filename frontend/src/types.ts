export interface PlayerDto {
  id: string;
  name: string;
  hasSubmitted: boolean;
  isActive: boolean;
}

export interface AssignmentDto {
  chainId: string;
  content: string | null;
}

export interface PollResponse {
  status: 'LOBBY' | 'ACTIVE' | 'REVEAL' | 'DONE';
  currentRound: number;
  totalRounds: number;
  roundType: 'WORD' | 'DRAW' | 'GUESS' | null;
  players: PlayerDto[];
  assignment: AssignmentDto | null;
  allSubmitted: boolean;
  hasSubmitted: boolean;
}

export interface CreateRoomResponse {
  roomId: string;
  roomCode: string;
  playerId: string;
}

export interface JoinRoomResponse {
  roomId: string;
  playerId: string;
}

export interface RoomStateResponse {
  roomId: string;
  code: string;
  status: string;
  hostId: string;
  players: PlayerDto[];
}

export interface ChainEntryRevealDto {
  roundNumber: number;
  type: 'WORD' | 'DRAW' | 'GUESS';
  content: string | null;
  playerName: string;
}

export interface ChainRevealDto {
  originPlayerName: string;
  entries: ChainEntryRevealDto[];
}

export interface RevealResponse {
  chains: ChainRevealDto[];
}

export interface GalleryDrawing {
  imageUrl: string;
  word: string;
}
