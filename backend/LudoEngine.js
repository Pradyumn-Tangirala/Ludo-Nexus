const { TRACK_LENGTH, WIN_PROGRESS, EXTRA_TURN_VALUE, TOKENS_PER_PLAYER } = require('./constants/game');

class LudoEngine {
    constructor(activeColors = ['red', 'green', 'yellow', 'blue']) {
        this.board = {
            // Absolute board indices that are safe (start tiles and star tiles)
            safeZones: [0, 8, 13, 21, 26, 34, 39, 47],
            trackLength: TRACK_LENGTH
        };
        
        // Offset for each color to map relative progress to absolute board position
        this.colorOffsets = {
            red: 0,
            green: 13,
            yellow: 26,
            blue: 39
        };
        
        this.turnOrder = activeColors;
        
        const defaultTokens = Array(TOKENS_PER_PLAYER).fill(-1);
        this.state = {
            players: {
                red: [...defaultTokens],
                green: [...defaultTokens],
                yellow: [...defaultTokens],
                blue: [...defaultTokens]
            },
            turn: this.turnOrder[0],
            lastRoll: null,
            awaitingMove: false,
            extraTurn: false,
            winner: null,
            rollCount: 0
        };
    }

    /**
     * Rolls a dice, giving a random number between 1 and 6.
     * @returns {number} The roll value.
     */
    rollDice() {
        if (this.state.winner) return null;
        if (this.state.awaitingMove) {
            throw new Error("Must move a token before rolling again.");
        }
        
        const roll = Math.floor(Math.random() * EXTRA_TURN_VALUE) + 1;
        this.state.lastRoll = roll;
        this.state.rollCount += 1;
        this.state.awaitingMove = true;
        
        if (roll === EXTRA_TURN_VALUE) {
            this.state.extraTurn = true;
        } else {
            this.state.extraTurn = false; // Reset if not a 6
        }
        
        // Check if there are any legal moves. If not, auto-advance turn.
        const legalMoves = this.getLegalMoves(this.state.turn, roll);
        if (legalMoves.length === 0) {
            this.state.awaitingMove = false;
            this._nextTurn();
        }
        
        return roll;
    }

    /**
     * Get indices of tokens that can legally move with the given roll.
     * @param {string} color Player color.
     * @param {number} roll The dice roll.
     * @returns {number[]} Array of legal token indices (0-3).
     */
    getLegalMoves(color, roll) {
        if (this.state.winner) return [];
        const tokens = this.state.players[color];
        const legalMoves = [];
        
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

    /**
     * Moves a specific token for a player.
     * @param {string} color The player color.
     * @param {number} tokenIndex The index (0-3) of the token to move.
     * @param {number} roll The amount to move. Should match lastRoll normally.
     * @returns {Object} Result of the move { success, state }
     */
    moveToken(color, tokenIndex, roll) {
        if (color !== this.state.turn) {
            throw new Error(`It is not ${color}'s turn.`);
        }
        
        if (!this.state.awaitingMove || this.state.lastRoll !== roll) {
            throw new Error("Invalid move state or roll mismatch.");
        }
        
        const legalMoves = this.getLegalMoves(color, roll);
        if (!legalMoves.includes(tokenIndex)) {
            throw new Error("Illegal move for this token.");
        }
        
        const currentProgress = this.state.players[color][tokenIndex];
        
        // Moving out of base
        if (currentProgress === -1 && roll === EXTRA_TURN_VALUE) {
            this.state.players[color][tokenIndex] = 0;
        } 
        // Standard move
        else {
            this.state.players[color][tokenIndex] += roll;
        }
        
        // Handle Collisions
        const newProgress = this.state.players[color][tokenIndex];
        // Only check collisions on the main track (0 to 50)
        if (newProgress >= 0 && newProgress <= 50) {
            const absolutePos = this._getAbsolutePosition(color, newProgress);
            this._checkCollision(color, absolutePos);
        }
        
        // Finalize Move
        this.state.awaitingMove = false;
        
        // If a token reached WIN_PROGRESS, standard Ludo rules often give an extra turn. We'll grant it.
        if (newProgress === WIN_PROGRESS) {
            this.state.extraTurn = true;
            if (this.state.players[color].every(p => p === WIN_PROGRESS)) {
                this.state.winner = color;
            }
        }
        
        this._nextTurn();
        
        return { success: true, state: this.state };
    }
    
    /**
     * Calculate absolute board position from a player's relative progress.
     */
    _getAbsolutePosition(color, relativeProgress) {
        if (relativeProgress < 0 || relativeProgress > 50) {
            return null; // Not on the main track
        }
        const offset = this.colorOffsets[color];
        return (offset + relativeProgress) % this.board.trackLength;
    }
    
    /**
     * Checks if moving to absolutePos results in a kill.
     */
    _checkCollision(activeColor, absolutePos) {
        // If it's a safe zone, multiple tokens can coexist, no killing
        if (this.board.safeZones.includes(absolutePos)) {
            return;
        }
        
        let killed = false;
        
        // Check all other players' tokens
        for (const [color, tokens] of Object.entries(this.state.players)) {
            if (color === activeColor) continue;
            
            for (let i = 0; i < tokens.length; i++) {
                const progress = tokens[i];
                if (progress >= 0 && progress <= 50) {
                    const opponentAbsPos = this._getAbsolutePosition(color, progress);
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
            this.state.extraTurn = true;
        }
    }
    
    /**
     * Advances to the next player's turn unless the current player has an extra turn.
     */
    _nextTurn() {
        if (this.state.extraTurn) {
            this.state.extraTurn = false; // consume the extra turn
            // the turn remains the same
            return;
        }
        
        const currentIndex = this.turnOrder.indexOf(this.state.turn);
        const nextIndex = (currentIndex + 1) % this.turnOrder.length;
        this.state.turn = this.turnOrder[nextIndex];
    }
    
    /**
     * Retrieve the full current state (useful for sending to clients)
     */
    getState() {
        return this.state;
    }
}

module.exports = LudoEngine;
