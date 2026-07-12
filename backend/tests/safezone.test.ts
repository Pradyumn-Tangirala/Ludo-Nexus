import { describe, it, expect, beforeEach } from 'vitest';
import { BoardUtils } from '../GameEngine/BoardUtils';

describe('BoardUtils / Safe Zones', () => {
    it('should correctly define 8 safe zones', () => {
        expect(BoardUtils.SAFE_ZONES).toHaveLength(8);
        expect(BoardUtils.SAFE_ZONES).toEqual([0, 8, 13, 21, 26, 34, 39, 47]);
    });

    it('should correctly calculate absolute position for Red', () => {
        // Red offset is 0
        expect(BoardUtils.getAbsolutePosition('red', 0)).toBe(0);
        expect(BoardUtils.getAbsolutePosition('red', 10)).toBe(10);
        expect(BoardUtils.getAbsolutePosition('red', 50)).toBe(50);
    });

    it('should correctly calculate absolute position for Green', () => {
        // Green offset is 13
        expect(BoardUtils.getAbsolutePosition('green', 0)).toBe(13); // Start tile is safe zone 13
        expect(BoardUtils.getAbsolutePosition('green', 50)).toBe((13 + 50) % 52); // 11
    });

    it('should correctly calculate absolute position for Yellow', () => {
        // Yellow offset is 26
        expect(BoardUtils.getAbsolutePosition('yellow', 0)).toBe(26); // Start tile is safe zone 26
    });

    it('should correctly calculate absolute position for Blue', () => {
        // Blue offset is 39
        expect(BoardUtils.getAbsolutePosition('blue', 0)).toBe(39); // Start tile is safe zone 39
    });

    it('should return null for positions outside the main track (home stretch)', () => {
        expect(BoardUtils.getAbsolutePosition('red', -1)).toBeNull();
        expect(BoardUtils.getAbsolutePosition('red', 51)).toBeNull();
        expect(BoardUtils.getAbsolutePosition('red', 56)).toBeNull();
    });
});
