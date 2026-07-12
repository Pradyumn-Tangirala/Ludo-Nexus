import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Board from '../components/Board';
import Token from '../components/Token';
import { getCoordinates } from '../utils/ludoCoordinates';
import { useSocket } from '../context/SocketContext';
import { Dices, RotateCcw, Smile } from 'lucide-react';
import Dice from '../components/Dice';
import { Room, PlayerColor } from '../types/game';
import { ReactionPayload } from '../types/socket';
import { WIN_PROGRESS, EXTRA_TURN_VALUE } from '../constants/game';
import { SOCKET_EVENTS } from '../constants/events';

interface GameViewProps {
  room: Room;
  mySessionId: string;
}

const GameView: React.FC<GameViewProps> = ({ room, mySessionId }) => {
  const socket = useSocket();
  const gameState = room.gameState;
  const [rolling, setRolling] = useState(false);
  const [isVisualRolling, setIsVisualRolling] = useState(false);
  const [displayTurn, setDisplayTurn] = useState<PlayerColor | undefined | null>(room.gameState?.turn);
  const [floatingEmojis, setFloatingEmojis] = useState<{id: string, emoji: string, left: number, bottom: number}[]>([]);
  const [showEmojiMenu, setShowEmojiMenu] = useState(false);
  
  if (!gameState) return <div>Loading game state...</div>;

  const me = room.players.find(p => p.id === mySessionId);
  const isHost = me?.isHost;
  const myColor = me?.color;
  
  const isMyTurn = gameState.turn === myColor;
  const canRoll = isMyTurn && !gameState.awaitingMove && !gameState.winner && !isVisualRolling;

  useEffect(() => {
    if (!socket) return;
    
    const handleReaction = ({ emoji, playerId }: ReactionPayload) => {
      const sender = room.players.find(p => p.id === playerId);
      const color = sender ? sender.color : null;
      
      let startLeft = 50;
      let startBottom = 50;
      
      if (color === 'red') {
        startLeft = 25; startBottom = 75;
      } else if (color === 'green') {
        startLeft = 75; startBottom = 75;
      } else if (color === 'yellow') {
        startLeft = 75; startBottom = 25;
      } else if (color === 'blue') {
        startLeft = 25; startBottom = 25;
      } else {
        startLeft = 20 + Math.random() * 60;
        startBottom = 15;
      }

      const newEmoji = {
        id: Math.random().toString(36).substr(2, 9),
        emoji,
        left: startLeft,
        bottom: startBottom
      };
      
      setFloatingEmojis(prev => [...prev, newEmoji]);
      
      // Auto remove after animation
      setTimeout(() => {
        setFloatingEmojis(prev => prev.filter(e => e.id !== newEmoji.id));
      }, 3000);
    };

    socket.on(SOCKET_EVENTS.REACTION, handleReaction);
    return () => socket.off(SOCKET_EVENTS.REACTION, handleReaction);
  }, [socket, room.players]);
  
  const prevRollCount = React.useRef(gameState?.rollCount || 0);

  // Safely manage visual state and turn display
  useEffect(() => {
      const isNewRoll = gameState?.rollCount > prevRollCount.current;
      
      if (isNewRoll) {
          prevRollCount.current = gameState.rollCount;
          setIsVisualRolling(true);
      } else if (!isVisualRolling && gameState?.turn) {
          setDisplayTurn(gameState.turn);
      }
  }, [gameState?.rollCount, gameState?.turn, isVisualRolling]);

  // Dynamic background color based on current turn
  useEffect(() => {
    const bgColors = {
      red: 'linear-gradient(135deg, #450a0a 0%, #0f172a 100%)',
      green: 'linear-gradient(135deg, #022c22 0%, #0f172a 100%)',
      yellow: 'linear-gradient(135deg, #422006 0%, #0f172a 100%)',
      blue: 'linear-gradient(135deg, #172554 0%, #0f172a 100%)',
    };
    
    document.body.style.background = bgColors[displayTurn] || 'var(--bg-gradient)';
    document.body.style.transition = 'background 1s ease-in-out';
    
    return () => {
      document.body.style.background = 'var(--bg-gradient)';
    };
  }, [displayTurn]);

  const getLegalMoves = useCallback(() => {
    if (!isMyTurn || !gameState.awaitingMove || !gameState.lastRoll || gameState.winner || isVisualRolling) return [];
    
    const tokens = gameState.players[myColor as PlayerColor];
    const roll = gameState.lastRoll;
    const moves: number[] = [];
    
    for (let i = 0; i < tokens.length; i++) {
        const progress = tokens[i];
        if (progress === -1 && roll === EXTRA_TURN_VALUE) {
            moves.push(i);
        } else if (progress >= 0 && progress < WIN_PROGRESS && progress + roll <= WIN_PROGRESS) {
            moves.push(i);
        }
    }
    return moves;
  }, [gameState, isMyTurn, myColor, isVisualRolling]);
  
  const legalMoves = useMemo(() => getLegalMoves(), [getLegalMoves]);

  const handleRollDice = useCallback(() => {
    if (!canRoll) return;
    setRolling(true);
    socket.emit(SOCKET_EVENTS.ROLL_DICE, { roomId: room.id }, (response: any) => {
      setRolling(false);
      if (!response.success) {
        console.error(response.message);
      }
    });
  }, [canRoll, socket, room.id]);

  const handleMoveToken = useCallback((color: PlayerColor, tokenIndex: number) => {
    if (color !== myColor || !legalMoves.includes(tokenIndex)) return;
    
    socket.emit(SOCKET_EVENTS.MOVE_TOKEN, { roomId: room.id, tokenIndex }, (response: any) => {
      if (!response.success) {
        console.error(response.message);
      }
    });
  }, [myColor, legalMoves, socket, room.id]);
  
  const handleRematch = useCallback(() => {
    socket.emit(SOCKET_EVENTS.REMATCH, { roomId: room.id });
  }, [socket, room.id]);

  const sendReaction = useCallback((emoji: string) => {
    setShowEmojiMenu(false);
    socket.emit(SOCKET_EVENTS.SEND_REACTION, { roomId: room.id, emoji });
  }, [socket, room.id]);

  const renderedTokens = useMemo(() => {
    const tokens: React.ReactNode[] = [];
    Object.entries(gameState.players).forEach(([colorStr, playerTokens]) => {
      const color = colorStr as PlayerColor;
      playerTokens.forEach((progress, idx) => {
        const { x, y, offset } = getCoordinates(color, progress, idx, gameState.players);
        const isMovable = color === myColor && legalMoves.includes(idx);
        
        tokens.push(
          <Token 
            key={`${color}-${idx}`}
            color={color}
            x={x}
            y={y}
            offset={offset}
            isMovable={isMovable}
            progress={progress}
            onClick={() => handleMoveToken(color, idx)}
          />
        );
      });
    });
    return tokens;
  }, [gameState.players, myColor, legalMoves, handleMoveToken]);

  const getWinnerName = () => {
    if (!gameState.winner) return '';
    const winnerPlayer = room.players.find(p => p.color === gameState.winner);
    return winnerPlayer ? winnerPlayer.name : gameState.winner;
  };

  const getPlayerNameByColor = (color: PlayerColor | undefined | null) => {
    if (!color) return '';
    const player = room.players.find(p => p.color === color);
    return player ? player.name : color;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', paddingBottom: '80px', position: 'relative' }}>
      
      {/* Floating Emojis */}
      <AnimatePresence>
        {floatingEmojis.map(emojiObj => (
          <motion.div
            key={emojiObj.id}
            initial={{ opacity: 0, y: 50, scale: 0.5, x: '-50%' }}
            animate={{ opacity: [0, 1, 0], y: -150, scale: 2 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2.5, ease: "easeOut" }}
            style={{
              position: 'absolute',
              bottom: `${emojiObj.bottom}%`,
              left: `${emojiObj.left}%`,
              fontSize: '3rem',
              pointerEvents: 'none',
              zIndex: 100
            }}
          >
            {emojiObj.emoji}
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Victory Screen */}
      <AnimatePresence>
        {gameState.winner && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'absolute',
              top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(0,0,0,0.8)',
              backdropFilter: 'blur(10px)',
              zIndex: 1000,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <motion.div 
              initial={{ scale: 0.5, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: "spring", bounce: 0.6 }}
              style={{ textAlign: 'center' }}
            >
              <h1 style={{ fontSize: '4rem', marginBottom: '1rem', color: 'white' }}>Victory!</h1>
              <p style={{ fontSize: '1.5rem', color: 'var(--text-secondary)' }}>
                <span style={{ 
                  color: gameState.winner === 'red' ? '#ef4444' : 
                         gameState.winner === 'green' ? '#10b981' : 
                         gameState.winner === 'yellow' ? '#eab308' : '#3b82f6',
                  fontWeight: 'bold',
                  textTransform: 'capitalize'
                }}>
                  {getWinnerName()}
                </span> has won the game!
              </p>
              
              <div style={{ marginTop: '3rem' }}>
                {isHost ? (
                  <button className="btn btn-primary" onClick={handleRematch} style={{ padding: '1rem 3rem', fontSize: '1.2rem' }}>
                    <RotateCcw size={20} /> Play Again
                  </button>
                ) : (
                  <p style={{ color: 'var(--text-secondary)' }}>Waiting for host to start a rematch...</p>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Board players={room.players}>
          {renderedTokens}
        </Board>
      </div>
      
      {/* Sticky Bottom Bar */}
      <div style={{ 
        position: 'fixed', 
        bottom: 0, 
        left: 0, 
        right: 0, 
        background: 'rgba(15, 23, 42, 0.9)', 
        backdropFilter: 'blur(10px)',
        borderTop: '1px solid var(--glass-border)',
        padding: '1rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: 50
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Current Turn</div>
            <div style={{ 
              fontSize: '1.2rem', 
              fontWeight: 'bold', 
              color: displayTurn === 'red' ? '#ef4444' : 
                     displayTurn === 'green' ? '#10b981' : 
                     displayTurn === 'yellow' ? '#eab308' : '#3b82f6',
              textTransform: 'capitalize'
            }}>
              {getPlayerNameByColor(displayTurn)} ({displayTurn}) {displayTurn === myColor ? '(You)' : ''}
            </div>
          </div>
          
          <div style={{ position: 'relative' }}>
            <button 
              onClick={() => setShowEmojiMenu(!showEmojiMenu)}
              style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white' }}
            >
              <Smile size={20} />
            </button>
            
            <AnimatePresence>
              {showEmojiMenu && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  style={{ position: 'absolute', bottom: '50px', left: 0, background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '12px', padding: '0.5rem', display: 'flex', gap: '0.5rem', backdropFilter: 'blur(10px)' }}
                >
                  {['🔥', '😭', '🎲', '👀'].map(emoji => (
                    <button 
                      key={emoji}
                      onClick={() => sendReaction(emoji)}
                      style={{ background: 'transparent', border: 'none', fontSize: '1.5rem', cursor: 'pointer', padding: '0.5rem', borderRadius: '8px' }}
                      onMouseOver={(e) => e.target.style.background = 'rgba(255,255,255,0.1)'}
                      onMouseOut={(e) => e.target.style.background = 'transparent'}
                    >
                      {emoji}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {gameState.lastRoll && (
            <Dice 
              roll={gameState.lastRoll} 
              rollCount={gameState.rollCount} 
              onVisualRollEnd={() => setIsVisualRolling(false)} 
            />
          )}
          
          <button 
            className="btn btn-primary" 
            style={{ width: 'auto', padding: '0.8rem 1.5rem', opacity: canRoll ? 1 : 0.5 }}
            onClick={handleRollDice}
            disabled={!canRoll || rolling}
          >
            <Dices size={20} />
            {rolling ? 'Rolling...' : 'Roll Dice'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GameView;
