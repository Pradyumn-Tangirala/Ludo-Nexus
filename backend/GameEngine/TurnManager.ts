import { GameState, PlayerColor } from './types';

export class TurnManager {
    static readonly DEFAULT_TURN_ORDER: PlayerColor[] = ['red', 'green', 'yellow', 'blue'];

    /**
     * Advances to the next player's turn unless the current player has an extra turn.
     */
    static nextTurn(
        state: GameState,
        turnOrder: PlayerColor[] = TurnManager.DEFAULT_TURN_ORDER,
    ): void {
        if (state.extraTurn) {
            state.extraTurn = false; // consume the extra turn
            // the turn remains the same
            return;
        }

        const currentIndex = turnOrder.indexOf(state.turn);
        const nextIndex = (currentIndex + 1) % turnOrder.length;
        state.turn = turnOrder[nextIndex];
    }
}
