import { describe, it, expect, beforeEach } from 'vitest';
import { MoveValidator } from '../GameEngine/MoveValidator';
import { GameState } from '../GameEngine/types';
import { WIN_PROGRESS, EXTRA_TURN_VALUE } from '../constants/game';

describe('MoveValidator', () => {
    let mockState: GameState;

    beforeEach(() => {
        mockState = {
            players: {
                red: [-1, -1, -1, -1],
                green: [-1, -1, -1, -1],
                yellow: [-1, -1, -1, -1],
                blue: [-1, -1, -1, -1],
            },
            turn: 'red',
            lastRoll: null,
            awaitingMove: false,
            extraTurn: false,
            winner: null,
            rollCount: 0,
            turnDeadline: null,
        };
    });

    it('should not allow any moves if the game has a winner', () => {
        mockState.winner = 'red';
        expect(MoveValidator.getLegalMoves(mockState, 'red', EXTRA_TURN_VALUE)).toEqual([]);
    });

    it('should only allow tokens out of base if roll equals EXTRA_TURN_VALUE', () => {
        // Red is all in base (-1)
        expect(MoveValidator.getLegalMoves(mockState, 'red', 5)).toEqual([]);
        expect(MoveValidator.getLegalMoves(mockState, 'red', EXTRA_TURN_VALUE)).toEqual([
            0, 1, 2, 3,
        ]);
    });

    it('should calculate proper legal moves for active tokens', () => {
        // Red token 0 is active at progress 10
        mockState.players.red[0] = 10;

        // Roll of 5
        expect(MoveValidator.getLegalMoves(mockState, 'red', 5)).toEqual([0]);

        // Roll of EXTRA_TURN_VALUE (token 0 can move, tokens 1-3 can leave base)
        expect(MoveValidator.getLegalMoves(mockState, 'red', EXTRA_TURN_VALUE)).toEqual([
            0, 1, 2, 3,
        ]);
    });

    it('should NOT allow moves that exceed WIN_PROGRESS', () => {
        // WIN_PROGRESS is usually 56
        const threshold = WIN_PROGRESS - 2;
        mockState.players.red[0] = threshold;

        // Roll of 2 is exact, allowed
        expect(MoveValidator.getLegalMoves(mockState, 'red', 2)).toEqual([0]);

        // Roll of 3 exceeds WIN_PROGRESS, not allowed
        expect(MoveValidator.getLegalMoves(mockState, 'red', 3)).toEqual([]);
    });
});
