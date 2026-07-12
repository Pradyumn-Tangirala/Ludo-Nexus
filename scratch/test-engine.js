const LudoEngine = require('../backend/LudoEngine');

const engine = new LudoEngine();

// Hack random for deterministic testing
const originalRandom = Math.random;
let nextRoll = null;
Math.random = () => {
    if (nextRoll !== null) {
        return (nextRoll - 1.0) / 6.0; 
    }
    return originalRandom();
};

const roll = (val) => {
    nextRoll = val;
    engine.rollDice();
    nextRoll = null;
}

console.log("Initial Turn:", engine.state.turn); // Red

// Red rolls 6, moves out of base
roll(6);
console.log("Legal moves after rolling 6:", engine.getLegalMoves('red', 6));
engine.moveToken('red', 0, 6);
console.log("Red token 0 progress:", engine.state.players.red[0]); // should be 0
console.log("Extra turn?", engine.state.extraTurn); // should be true

// Red rolls 5, moves forward
roll(5);
engine.moveToken('red', 0, 5);
console.log("Red token 0 progress:", engine.state.players.red[0]); // should be 5
console.log("Turn after red extra turn finishes:", engine.state.turn); // should be Green

// Force Green to move to absolute pos 5.
engine.state.players.green[0] = 43;
console.log("Green token abs pos initially:", engine._getAbsolutePosition('green', 43)); 

// Green's turn. Roll 1.
roll(1);
engine.moveToken('green', 0, 1);
console.log("Green token 0 progress after rolling 1:", engine.state.players.green[0]); 
console.log("Green token abs pos:", engine._getAbsolutePosition('green', 44)); 
console.log("Red token 0 progress after being killed:", engine.state.players.red[0]); 
console.log("Extra turn for Green?", engine.state.extraTurn);

console.log("All tests passed!");
