import { produce } from 'immer';
import { GameState, PlayerColor } from './types';
import { TOKENS_PER_PLAYER, EXTRA_TURN_VALUE } from '../constants/game';
import { RollManager } from './RollManager';
import { MoveValidator } from './MoveValidator';
import { CaptureManager } from './CaptureManager';
import { WinnerManager } from './WinnerManager';
import { TurnManager } from './TurnManager';
import { BoardUtils } from './BoardUtils';

export class LudoEngine {
    public state: GameState;
    public turnOrder: PlayerColor[];

    constructor(activeColors: PlayerColor[] = ['red', 'green', 'yellow', 'blue']) {
        this.turnOrder = activeColors;

        const defaultTokens = Array(TOKENS_PER_PLAYER).fill(-1);
        this.state = {
            players: {
                red: [...defaultTokens],
                green: [...defaultTokens],
                yellow: [...defaultTokens],
                blue: [...defaultTokens],
            },
            turn: this.turnOrder[0],
            lastRoll: null,
            awaitingMove: false,
            extraTurn: false,
            winner: null,
            rollCount: 0,
            turnDeadline: null,
        };
    }

    rollDice(): number | null {
        let finalRoll: number | null = null;
        this.state = produce(this.state, (draft) => {
            finalRoll = RollManager.rollDice(draft, this.turnOrder);
        });
        return finalRoll;
    }

    getLegalMoves(color: PlayerColor, roll: number): number[] {
        return MoveValidator.getLegalMoves(this.state, color, roll);
    }

    moveToken(
        color: PlayerColor,
        tokenIndex: number,
        roll: number,
    ): { success: boolean; state: GameState } {
        this.state = produce(this.state, (draft) => {
            if (color !== draft.turn) {
                throw new Error(`It is not ${color}'s turn.`);
            }

            if (!draft.awaitingMove || draft.lastRoll !== roll) {
                throw new Error('Invalid move state or roll mismatch.');
            }

            const legalMoves = MoveValidator.getLegalMoves(draft, color, roll);
            if (!legalMoves.includes(tokenIndex)) {
                throw new Error('Illegal move for this token.');
            }

            const currentProgress = draft.players[color][tokenIndex];

            // Moving out of base
            if (currentProgress === -1 && roll === EXTRA_TURN_VALUE) {
                draft.players[color][tokenIndex] = 0;
            }
            // Standard move
            else {
                draft.players[color][tokenIndex] += roll;
            }

            // Handle Collisions
            const newProgress = draft.players[color][tokenIndex];
            // Only check collisions on the main track (0 to 50)
            if (newProgress >= 0 && newProgress <= 50) {
                const absolutePos = BoardUtils.getAbsolutePosition(color, newProgress);
                if (absolutePos !== null) {
                    CaptureManager.checkCollision(draft, color, absolutePos);
                }
            }

            // Finalize Move
            draft.awaitingMove = false;

            // Process Win Conditions
            WinnerManager.evaluateProgress(draft, color, newProgress);

            // Advance Turn
            TurnManager.nextTurn(draft, this.turnOrder);
        });

        return { success: true, state: this.state };
    }

    skipTurn(color: PlayerColor): { success: boolean; state: GameState } {
        this.state = produce(this.state, (draft) => {
            if (color !== draft.turn) {
                throw new Error(`It is not ${color}'s turn.`);
            }
            draft.awaitingMove = false;
            draft.extraTurn = false;
            draft.lastRoll = null;
            TurnManager.nextTurn(draft, this.turnOrder);
        });

        return { success: true, state: this.state };
    }

    getState(): GameState {
        return this.state;
    }
}

export default LudoEngine;
