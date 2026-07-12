import React from 'react';
import './Board.css';

const Board = ({ children, players = [] }) => {
  const getPlayerName = (color) => {
    const player = players.find(p => p.color === color);
    return player ? player.name : '';
  };

  return (
    <div className="ludo-board-wrapper">
      <div className="ludo-board">
        {/* Red Base (Top Left) */}
        <div className="base red-base">
          <div className="player-label">{getPlayerName('red')}</div>
          <div className="inner-base">
            <div className="base-circle"></div>
            <div className="base-circle"></div>
            <div className="base-circle"></div>
            <div className="base-circle"></div>
          </div>
        </div>

        {/* Green Base (Top Right) */}
        <div className="base green-base">
          <div className="player-label">{getPlayerName('green')}</div>
           <div className="inner-base">
            <div className="base-circle"></div>
            <div className="base-circle"></div>
            <div className="base-circle"></div>
            <div className="base-circle"></div>
          </div>
        </div>

        {/* Yellow Base (Bottom Right) */}
        <div className="base yellow-base">
          <div className="player-label">{getPlayerName('yellow')}</div>
           <div className="inner-base">
            <div className="base-circle"></div>
            <div className="base-circle"></div>
            <div className="base-circle"></div>
            <div className="base-circle"></div>
          </div>
        </div>

        {/* Blue Base (Bottom Left) */}
        <div className="base blue-base">
          <div className="player-label">{getPlayerName('blue')}</div>
           <div className="inner-base">
            <div className="base-circle"></div>
            <div className="base-circle"></div>
            <div className="base-circle"></div>
            <div className="base-circle"></div>
          </div>
        </div>

        {/* Center Home */}
        <div className="center-home">
          <div className="triangle red-triangle"></div>
          <div className="triangle green-triangle"></div>
          <div className="triangle yellow-triangle"></div>
          <div className="triangle blue-triangle"></div>
        </div>

        {/* The Track Cells */}
        <div className="track-cells">
            {Array.from({ length: 15 * 15 }).map((_, i) => {
              const x = i % 15;
              const y = Math.floor(i / 15);
              
              // Skip bases and center
              if (x < 6 && y < 6) return null; // Red Base
              if (x > 8 && y < 6) return null; // Green Base
              if (x < 6 && y > 8) return null; // Blue Base
              if (x > 8 && y > 8) return null; // Yellow Base
              if (x >= 6 && x <= 8 && y >= 6 && y <= 8) return null; // Center
              
              // Color home stretches
              let cellClass = "track-cell";
              if (y === 7 && x >= 1 && x <= 5) cellClass += " safe-red";
              if (x === 7 && y >= 1 && y <= 5) cellClass += " safe-green";
              if (y === 7 && x >= 9 && x <= 13) cellClass += " safe-yellow";
              if (x === 7 && y >= 9 && y <= 13) cellClass += " safe-blue";
              
              // Color start tiles
              if (x === 1 && y === 6) cellClass += " safe-red";
              if (x === 8 && y === 1) cellClass += " safe-green";
              if (x === 13 && y === 8) cellClass += " safe-yellow";
              if (x === 6 && y === 13) cellClass += " safe-blue";
              
              // Color stars (safe zones)
              if (x === 6 && y === 2) cellClass += " star";
              if (x === 12 && y === 6) cellClass += " star";
              if (x === 8 && y === 12) cellClass += " star";
              if (x === 2 && y === 8) cellClass += " star";

              return (
                <div 
                  key={i} 
                  className={cellClass}
                  style={{ gridColumn: x + 1, gridRow: y + 1 }}
                >
                  {cellClass.includes('star') && <span>★</span>}
                </div>
              );
            })}
        </div>

        {/* Absolutely positioned tokens passed as children */}
        {children}
      </div>
    </div>
  );
};

export default Board;
