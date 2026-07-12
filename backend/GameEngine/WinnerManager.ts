import { GameState, PlayerColor } from './types';
import { WIN_PROGRESS } from '../constants/game';

export class WinnerManager {
    /**
     * Evaluates a player's progress and grants extra turns or sets the winner.
     */
    static evaluateProgress(state: GameState, color: PlayerColor, newProgress: number): void {
        // If a token reached WIN_PROGRESS, standard Ludo rules often give an extra turn.
        if (newProgress === WIN_PROGRESS) {
            state.extraTurn = true;
            if (state.players[color].every((p) => p === WIN_PROGRESS)) {
                state.winner = color;
            }
        }
    }
}
