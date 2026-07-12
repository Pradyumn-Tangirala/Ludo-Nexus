import { GameState, PlayerColor } from './types';
import { WIN_PROGRESS, EXTRA_TURN_VALUE } from '../constants/game';

export class MoveValidator {
    /**
     * Get indices of tokens that can legally move with the given roll.
     */
    static getLegalMoves(state: GameState, color: PlayerColor, roll: number): number[] {
        if (state.winner) return [];
        const tokens = state.players[color];
        const legalMoves: number[] = [];
        
        for (let i = 0; i < tokens.length; i++) {
            const progress = tokens[i];
            
            // Token is in base
            if (progress === -1) {
                if (roll === EXTRA_TURN_VALUE) {
                    legalMoves.push(i);
                }
            } 
            // Token is active and hasn't finished
            else if (progress >= 0 && progress < WIN_PROGRESS) {
                if (progress + roll <= WIN_PROGRESS) {
                    legalMoves.push(i);
                }
            }
        }
        
        return legalMoves;
    }
}
