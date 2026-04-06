import { create } from 'zustand';
import type { PlayerDto, AssignmentDto, PollResponse } from '../types';

interface GameState {
  playerId: string | null;
  roomId: string | null;
  roomCode: string | null;
  hostId: string | null;
  roomStatus: 'LOBBY' | 'ACTIVE' | 'REVEAL' | 'DONE' | null;
  currentRound: number;
  totalRounds: number;
  roundType: 'WORD' | 'DRAW' | 'GUESS' | null;
  players: PlayerDto[];
  assignment: AssignmentDto | null;
  allSubmitted: boolean;
  hasSubmitted: boolean;

  setPlayer: (id: string) => void;
  setRoom: (id: string, code: string) => void;
  setHostId: (id: string) => void;
  updateFromPoll: (data: PollResponse) => void;
  clear: () => void;
}

function loadFromStorage() {
  return {
    playerId: localStorage.getItem('myPlayerId'),
    roomId: localStorage.getItem('myRoomId'),
    roomCode: localStorage.getItem('myRoomCode'),
    hostId: localStorage.getItem('myHostId'),
  };
}

export const useGameStore = create<GameState>((set) => ({
  ...loadFromStorage(),
  roomStatus: null,
  currentRound: 0,
  totalRounds: 0,
  roundType: null,
  players: [],
  assignment: null,
  allSubmitted: false,
  hasSubmitted: false,

  setPlayer: (id) => {
    localStorage.setItem('myPlayerId', id);
    set({ playerId: id });
  },

  setRoom: (id, code) => {
    localStorage.setItem('myRoomId', id);
    localStorage.setItem('myRoomCode', code);
    set({ roomId: id, roomCode: code });
  },

  setHostId: (id) => {
    localStorage.setItem('myHostId', id);
    set({ hostId: id });
  },

  updateFromPoll: (data) => {
    set({
      roomStatus: data.status,
      currentRound: data.currentRound,
      totalRounds: data.totalRounds,
      roundType: data.roundType,
      players: data.players,
      assignment: data.assignment,
      allSubmitted: data.allSubmitted,
      hasSubmitted: data.hasSubmitted,
    });
  },

  clear: () => {
    localStorage.removeItem('myPlayerId');
    localStorage.removeItem('myRoomId');
    localStorage.removeItem('myRoomCode');
    localStorage.removeItem('myHostId');
    set({
      playerId: null,
      roomId: null,
      roomCode: null,
      hostId: null,
      roomStatus: null,
      currentRound: 0,
      totalRounds: 0,
      roundType: null,
      players: [],
      assignment: null,
      allSubmitted: false,
      hasSubmitted: false,
    });
  },
}));
