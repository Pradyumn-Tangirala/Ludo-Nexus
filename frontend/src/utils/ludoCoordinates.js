// Absolute board positions (0-51) mapped to [x, y] coordinates
export const ABSOLUTE_PATH = [
  [1, 6], [2, 6], [3, 6], [4, 6], [5, 6], [6, 5], [6, 4], [6, 3], [6, 2], [6, 1],
  [6, 0], [7, 0], [8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], [9, 6], [10, 6],
  [11, 6], [12, 6], [13, 6], [14, 6], [14, 7], [14, 8], [13, 8], [12, 8], [11, 8], [10, 8],
  [9, 8], [8, 9], [8, 10], [8, 11], [8, 12], [8, 13], [8, 14], [7, 14], [6, 14], [6, 13],
  [6, 12], [6, 11], [6, 10], [6, 9], [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8],
  [0, 7], [0, 6]
];

// Home stretches for each color (progress 51-56). 56 is the center home.
export const HOME_STRETCHES = {
  red: [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7], [6, 7]],
  green: [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5], [7, 6]],
  yellow: [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7], [8, 7]],
  blue: [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9], [7, 8]]
};

// Base coordinates for tokens waiting to enter (-1)
export const BASES = {
  red: [[1.5, 1.5], [3.5, 1.5], [1.5, 3.5], [3.5, 3.5]],
  green: [[10.5, 1.5], [12.5, 1.5], [10.5, 3.5], [12.5, 3.5]],
  yellow: [[10.5, 10.5], [12.5, 10.5], [10.5, 12.5], [12.5, 12.5]],
  blue: [[1.5, 10.5], [3.5, 10.5], [1.5, 12.5], [3.5, 12.5]]
};

export const COLOR_OFFSETS = {
  red: 0,
  green: 13,
  yellow: 26,
  blue: 39
};

/**
 * Returns {x, y} coordinate for a given token.
 * @param {string} color The player's color
 * @param {number} progress The token's relative progress (-1 to 56)
 * @param {number} tokenIndex The index (0-3) of the token
 * @param {object} players Object containing all players to calculate overlaps
 */
export const getCoordinates = (color, progress, tokenIndex, players = null) => {
  let coord = [0, 0];
  
  if (progress === -1) {
    coord = BASES[color][tokenIndex];
  } else if (progress >= 0 && progress <= 50) {
    const absPos = (COLOR_OFFSETS[color] + progress) % 52;
    coord = ABSOLUTE_PATH[absPos];
  } else if (progress >= 51 && progress <= 56) {
    coord = HOME_STRETCHES[color][progress - 51];
  }
  
  // Calculate visual offset if multiple tokens share the exact same tile on the path
  let offset = { dx: 0, dy: 0 };
  if (players && progress >= 0) {
    // Find all tokens on this exact same absolute coordinate
    const sharingTokens = [];
    for (const [pColor, pData] of Object.entries(players)) {
      if (!pData) continue;
      pData.forEach((tokProgress, tokIdx) => {
        if (tokProgress === progress && pColor === color) {
            sharingTokens.push({ color: pColor, index: tokIdx });
        } else if (tokProgress >= 0 && tokProgress <= 50 && progress <= 50) {
            const myAbs = (COLOR_OFFSETS[color] + progress) % 52;
            const theirAbs = (COLOR_OFFSETS[pColor] + tokProgress) % 52;
            if (myAbs === theirAbs) {
                sharingTokens.push({ color: pColor, index: tokIdx });
            }
        }
      });
    }
    
    // Sort so we consistently order them
    sharingTokens.sort((a, b) => a.color.localeCompare(b.color) || a.index - b.index);
    const myRank = sharingTokens.findIndex(t => t.color === color && t.index === tokenIndex);
    
    if (sharingTokens.length > 1) {
        // Simple offset mapping for up to 4 tokens sharing a tile
        const offsets = [
            { dx: -15, dy: -15 },
            { dx: 15, dy: -15 },
            { dx: -15, dy: 15 },
            { dx: 15, dy: 15 },
            { dx: 0, dy: 0 },
            { dx: -20, dy: 0 },
            { dx: 20, dy: 0 },
            { dx: 0, dy: -20 },
            { dx: 0, dy: 20 }
        ];
        if (myRank >= 0 && myRank < offsets.length) {
            offset = offsets[myRank];
        }
    }
  }

  return { x: coord[0], y: coord[1], offset };
};
