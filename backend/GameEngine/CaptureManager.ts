import { GameState, PlayerColor } from './types';
import { BoardUtils } from './BoardUtils';

export class CaptureManager {
    /**
     * Checks if moving to absolutePos results in a kill.
     * Modifies the GameState directly if a kill occurs.
     */
    static checkCollision(state: GameState, activeColor: PlayerColor, absolutePos: number): void {
        // If it's a safe zone, multiple tokens can coexist, no killing
        if (BoardUtils.SAFE_ZONES.includes(absolutePos)) {
            return;
        }
        
        let killed = false;
        
        // Check all other players' tokens
        for (const [colorStr, tokens] of Object.entries(state.players)) {
            const color = colorStr as PlayerColor;
            if (color === activeColor) continue;
            
            for (let i = 0; i < tokens.length; i++) {
                const progress = tokens[i];
                if (progress >= 0 && progress <= 50) {
                    const opponentAbsPos = BoardUtils.getAbsolutePosition(color, progress);
                    if (opponentAbsPos === absolutePos) {
                        // Kill! Send back to base
                        tokens[i] = -1;
                        killed = true;
                    }
                }
            }
        }
        
        // Grant extra turn if a kill happened
        if (killed) {
            state.extraTurn = true;
        }
    }
}
