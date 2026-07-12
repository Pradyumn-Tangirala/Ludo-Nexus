import { describe, it, expect, beforeEach } from 'vitest';
import { CaptureManager } from '../GameEngine/CaptureManager';
import { GameState } from '../GameEngine/types';
import { BoardUtils } from '../GameEngine/BoardUtils';

describe('CaptureManager', () => {
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

    it('should kill an opponent token if they share an absolute position on a non-safe zone', () => {
        // Absolute position 5 is NOT a safe zone.
        // Red offset is 0, so progress 5 is abs pos 5.
        // Green offset is 13, so to get abs pos 5, progress must be: (5 - 13 + 52) % 52 = 44.

        mockState.players.green[0] = 44; // Green token is at abs pos 5

        // Red token lands on abs pos 5
        CaptureManager.checkCollision(mockState, 'red', 5);

        // Green token should be sent back to base (-1)
        expect(mockState.players.green[0]).toBe(-1);

        // Red gets an extra turn
        expect(mockState.extraTurn).toBe(true);
    });

    it('should NOT kill tokens of the same color', () => {
        // Red token 0 is at abs pos 5
        mockState.players.red[0] = 5;

        // Red token 1 lands on abs pos 5
        CaptureManager.checkCollision(mockState, 'red', 5);

        // Red token 0 is safe
        expect(mockState.players.red[0]).toBe(5);
        expect(mockState.extraTurn).toBe(false);
    });

    it('should NOT kill if the collision happens on a safe zone', () => {
        // Safe zones include 0, 8, etc.
        const safeZone = BoardUtils.SAFE_ZONES[1]; // 8

        // Green offset is 13, to get abs 8: (8 - 13 + 52) % 52 = 47.
        mockState.players.green[0] = 47;

        // Red lands on abs 8
        CaptureManager.checkCollision(mockState, 'red', safeZone);

        // Green token is untouched
        expect(mockState.players.green[0]).toBe(47);
        expect(mockState.extraTurn).toBe(false);
    });
});
