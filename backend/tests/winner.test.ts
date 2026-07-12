import { describe, it, expect, beforeEach } from 'vitest';
import { WinnerManager } from '../GameEngine/WinnerManager';
import { GameState } from '../GameEngine/types';
import { WIN_PROGRESS } from '../constants/game';

describe('WinnerManager', () => {
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

    it('should grant an extra turn when a token reaches WIN_PROGRESS', () => {
        // Evaluate progress when a token hits WIN_PROGRESS
        WinnerManager.evaluateProgress(mockState, 'red', WIN_PROGRESS);

        expect(mockState.extraTurn).toBe(true);
        expect(mockState.winner).toBeNull(); // Still not winner, 3 more tokens to go
    });

    it('should NOT grant an extra turn if the token has not reached WIN_PROGRESS', () => {
        WinnerManager.evaluateProgress(mockState, 'red', WIN_PROGRESS - 1);

        expect(mockState.extraTurn).toBe(false);
        expect(mockState.winner).toBeNull();
    });

    it('should declare a winner when ALL tokens reach WIN_PROGRESS', () => {
        // Set all 4 tokens for red to WIN_PROGRESS
        mockState.players.red = [WIN_PROGRESS, WIN_PROGRESS, WIN_PROGRESS, WIN_PROGRESS];

        // Final token evaluated
        WinnerManager.evaluateProgress(mockState, 'red', WIN_PROGRESS);

        expect(mockState.extraTurn).toBe(true);
        expect(mockState.winner).toBe('red');
    });
});
