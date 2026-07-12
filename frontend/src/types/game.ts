export type PlayerColor = 'red' | 'green' | 'yellow' | 'blue';

export interface PlayerData {
  id: string;
  name: string;
  color: PlayerColor;
  isHost: boolean;
}

export interface GameState {
  players: Record<PlayerColor, number[]>;
  turn: PlayerColor;
  lastRoll: number | null;
  rollCount: number;
  awaitingMove: boolean;
  extraTurn: boolean;
  winner: PlayerColor | null;
}

export interface Room {
  id: string;
  players: PlayerData[];
  gameState: GameState | null;
}
