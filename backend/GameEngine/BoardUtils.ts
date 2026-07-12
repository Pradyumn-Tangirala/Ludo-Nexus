import { TRACK_LENGTH } from '../constants/game';
import { PlayerColor } from './types';

export class BoardUtils {
    static readonly SAFE_ZONES = [0, 8, 13, 21, 26, 34, 39, 47];
    static readonly TRACK_LENGTH = TRACK_LENGTH;

    static readonly COLOR_OFFSETS: Record<PlayerColor, number> = {
        red: 0,
        green: 13,
        yellow: 26,
        blue: 39,
    };

    /**
     * Calculate absolute board position from a player's relative progress.
     */
    static getAbsolutePosition(color: PlayerColor, relativeProgress: number): number | null {
        if (relativeProgress < 0 || relativeProgress > 50) {
            return null; // Not on the main track
        }
        const offset = this.COLOR_OFFSETS[color];
        return (offset + relativeProgress) % this.TRACK_LENGTH;
    }
}
