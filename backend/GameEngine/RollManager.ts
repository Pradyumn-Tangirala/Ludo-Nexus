import { GameState, PlayerColor } from './types';
import { EXTRA_TURN_VALUE } from '../constants/game';
import { MoveValidator } from './MoveValidator';
import { TurnManager } from './TurnManager';

export class RollManager {
    /**
     * Rolls a dice, giving a random number between 1 and EXTRA_TURN_VALUE.
     */
    static rollDice(state: GameState, turnOrder?: PlayerColor[]): number | null {
        if (state.winner) return null;
        if (state.awaitingMove) {
            throw new Error('Must move a token before rolling again.');
        }

        const roll = Math.floor(Math.random() * EXTRA_TURN_VALUE) + 1;
        state.lastRoll = roll;
        state.rollCount += 1;
        state.awaitingMove = true;

        if (roll === EXTRA_TURN_VALUE) {
            state.extraTurn = true;
        } else {
            state.extraTurn = false; // Reset if not an extra turn roll
        }

        // Check if there are any legal moves. If not, auto-advance turn.
        const legalMoves = MoveValidator.getLegalMoves(state, state.turn, roll);
        if (legalMoves.length === 0) {
            state.awaitingMove = false;
            TurnManager.nextTurn(state, turnOrder);
        }

        return roll;
    }
}
