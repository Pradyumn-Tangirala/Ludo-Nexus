export type PlayerColor = 'red' | 'green' | 'yellow' | 'blue';

export interface GameState {
    players: Record<PlayerColor, number[]>;
    turn: PlayerColor;
    lastRoll: number | null;
    awaitingMove: boolean;
    extraTurn: boolean;
    winner: PlayerColor | null;
    rollCount: number;
}
