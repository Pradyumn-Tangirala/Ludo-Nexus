export type PlayerColor = 'red' | 'green' | 'yellow' | 'blue';

export interface PlayerData {
  id: string;
  name: string;
  color: PlayerColor | null;
  isHost: boolean;
  isReady: boolean;
  avatar: string;
  status: 'online' | 'offline' | 'away';
  role: 'player' | 'spectator';
  disconnectDeadline: number | null;
}

export interface GameState {
  players: Record<PlayerColor, number[]>;
  turn: PlayerColor;
  lastRoll: number | null;
  rollCount: number;
  awaitingMove: boolean;
  extraTurn: boolean;
  winner: PlayerColor | null;
  turnDeadline: number | null;
}

export interface Room {
  id: string;
  players: PlayerData[];
  gameState: GameState | null;
}
