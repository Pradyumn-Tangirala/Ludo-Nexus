import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RollManager } from '../GameEngine/RollManager';
import { GameState, PlayerColor } from '../GameEngine/types';
import { EXTRA_TURN_VALUE } from '../constants/game';
import { MoveValidator } from '../GameEngine/MoveValidator';
import { TurnManager } from '../GameEngine/TurnManager';

describe('RollManager', () => {
    let mockState: GameState;
    const turnOrder: PlayerColor[] = ['red', 'green', 'yellow', 'blue'];

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
        };
    });

    it('should prevent rolling if there is a winner', () => {
        mockState.winner = 'red';
        const roll = RollManager.rollDice(mockState, turnOrder);
        expect(roll).toBeNull();
    });

    it('should throw an error if awaitingMove is true', () => {
        mockState.awaitingMove = true;
        expect(() => RollManager.rollDice(mockState, turnOrder)).toThrowError(
            'Must move a token before rolling again.',
        );
    });

    it('should generate a roll between 1 and EXTRA_TURN_VALUE', () => {
        const roll = RollManager.rollDice(mockState, turnOrder);
        expect(roll).toBeGreaterThanOrEqual(1);
        expect(roll).toBeLessThanOrEqual(EXTRA_TURN_VALUE);
        expect(mockState.lastRoll).toBe(roll);
        expect(mockState.rollCount).toBe(1);
    });

    it('should flag extraTurn if roll equals EXTRA_TURN_VALUE', () => {
        // Mock Math.random to always return max value
        vi.spyOn(Math, 'random').mockReturnValue(0.999);
        const roll = RollManager.rollDice(mockState, turnOrder);
        expect(roll).toBe(EXTRA_TURN_VALUE);
        expect(mockState.extraTurn).toBe(true);
        vi.restoreAllMocks();
    });

    it('should automatically advance turn if no legal moves exist', () => {
        // Mock Math.random to return a 2
        vi.spyOn(Math, 'random').mockReturnValue(0.1);
        // 0.1 * 6 = 0.6 -> floor + 1 = 1 (Wait, let's just mock getLegalMoves instead)

        vi.spyOn(MoveValidator, 'getLegalMoves').mockReturnValue([]);
        const nextTurnSpy = vi.spyOn(TurnManager, 'nextTurn');

        const roll = RollManager.rollDice(mockState, turnOrder);

        expect(mockState.awaitingMove).toBe(false);
        expect(nextTurnSpy).toHaveBeenCalledWith(mockState, turnOrder);

        vi.restoreAllMocks();
    });
});
