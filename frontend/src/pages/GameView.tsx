import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Board from '../components/Board';
import Token from '../components/Token';
import { getCoordinates } from '../utils/ludoCoordinates';
import { useSocket } from '../context/SocketContext';
import { Dices, RotateCcw, Smile } from 'lucide-react';
import Dice from '../components/Dice';
import confetti from 'canvas-confetti';
import { useSoundEffects } from '../hooks/useSoundEffects';
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
  
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(timer);
  }, []);
  
  const { playClick, playDiceRoll, playCapture, playVictory } = useSoundEffects();
  
  if (!gameState) return <div>Loading game state...</div>;

  const me = room.players.find(p => p.id === mySessionId);
  const myColor = me?.color;
  const isSpectator = me?.role === 'spectator';
  
  const canRoll = gameState.turn === myColor && !gameState.awaitingMove && !gameState.winner && !isVisualRolling && !isSpectator;
  const isMyTurn = gameState.turn === myColor && !isSpectator;

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

    socket?.on(SOCKET_EVENTS.REACTION, handleReaction);
    return () => { socket?.off(SOCKET_EVENTS.REACTION, handleReaction); };
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

  // Victory Confetti
  useEffect(() => {
    if (gameState?.winner) {
      playVictory();
      
      const duration = 3000;
      const end = Date.now() + duration;

      const frame = () => {
        confetti({
          particleCount: 5,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#ef4444', '#10b981', '#eab308', '#3b82f6']
        });
        confetti({
          particleCount: 5,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#ef4444', '#10b981', '#eab308', '#3b82f6']
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };
      frame();
    }
  }, [gameState?.winner, playVictory]);

  // Sound Effects Tracking
  const prevPlayersRef = React.useRef(gameState?.players);
  useEffect(() => {
    if (!gameState?.players || !prevPlayersRef.current) return;
    
    let captured = false;
    let homed = false;

    Object.entries(gameState.players).forEach(([color, tokens]) => {
      const prevTokens = prevPlayersRef.current![color as PlayerColor];
      tokens.forEach((progress, i) => {
        const prevProgress = prevTokens[i];
        if (prevProgress > -1 && progress === -1) {
          captured = true;
        }
        if (prevProgress < WIN_PROGRESS && progress === WIN_PROGRESS) {
          homed = true;
        }
      });
    });

    if (captured) playCapture();
    if (homed && !gameState.winner) playClick(); // using click/chime for entering home

    prevPlayersRef.current = gameState.players;
  }, [gameState?.players, playCapture, playClick, gameState?.winner]);

  // Dynamic background color based on current turn
  useEffect(() => {
    const bgColors = {
      red: 'linear-gradient(135deg, #450a0a 0%, #0f172a 100%)',
      green: 'linear-gradient(135deg, #022c22 0%, #0f172a 100%)',
      yellow: 'linear-gradient(135deg, #422006 0%, #0f172a 100%)',
      blue: 'linear-gradient(135deg, #172554 0%, #0f172a 100%)',
    };
    
    document.body.style.background = bgColors[displayTurn as keyof typeof bgColors] || 'var(--bg-gradient)';
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
    playClick();
    setRolling(true);
    socket?.emit(SOCKET_EVENTS.ROLL_DICE, { roomId: room.id }, (response: any) => {
      setRolling(false);
      if (!response.success) {
        console.error(response.message);
      }
    });
  }, [canRoll, socket, room.id]);

  const handleMoveToken = useCallback((color: PlayerColor, tokenIndex: number) => {
    if (color !== myColor || !legalMoves.includes(tokenIndex)) return;
    playClick();
    
    socket?.emit(SOCKET_EVENTS.MOVE_TOKEN, { roomId: room.id, tokenIndex }, (response: any) => {
      if (!response.success) {
        console.error(response.message);
      }
    });
  }, [myColor, legalMoves, socket, room.id]);
  
  const handleRematch = useCallback(() => {
    playClick();
    socket?.emit(SOCKET_EVENTS.REMATCH, { roomId: room.id });
  }, [socket, room.id, playClick]);

  const sendReaction = useCallback((emoji: string) => {
    playClick();
    socket?.emit(SOCKET_EVENTS.REACTION, { roomId: room.id, emoji });
    setShowEmojiMenu(false);
  }, [socket, room.id, playClick]);

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
    <div className="glass-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '600px', position: 'relative', overflow: 'hidden' }}>
      
      {isSpectator && (
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', background: 'rgba(0,0,0,0.5)', padding: '0.5rem', textAlign: 'center', color: 'white', fontWeight: 'bold', zIndex: 10, backdropFilter: 'blur(5px)' }}>
          Spectating Game
        </div>
      )}

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
                {isSpectator ? (
                  <p style={{ color: 'var(--text-secondary)' }}>Game over. Waiting for host...</p>
                ) : me?.isHost ? (
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          {room.players.map(p => {
            const color = p.color;
            const isActive = displayTurn === color;
            
            let disconnectProgress = 0;
            let showDisconnect = false;
            if (p.status === 'offline' && p.disconnectDeadline) {
              showDisconnect = true;
              const remaining = Math.max(0, p.disconnectDeadline - now);
              disconnectProgress = (remaining / 60000) * 100;
            }

            const turnRemaining = gameState.turnDeadline ? Math.max(0, gameState.turnDeadline - now) : 0;
            const turnProgress = gameState.turnDeadline ? (turnRemaining / 30000) * 100 : 0;

            return (
              <div 
                key={color}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.5rem',
                  opacity: isActive ? 1 : 0.5,
                  transform: isActive ? 'scale(1.1)' : 'scale(1)',
                  transition: 'all 0.3s'
                }}
              >
                <div style={{ position: 'relative' }}>
                  <div 
                    style={{
                      width: '50px', height: '50px',
                      borderRadius: '50%',
                      background: color || 'gray',
                      border: isActive ? '4px solid white' : '2px solid transparent',
                      boxShadow: isActive ? `0 0 15px ${color || 'gray'}` : 'none',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'white', fontWeight: 'bold', fontSize: '1.2rem',
                      overflow: 'hidden'
                    }}
                  >
                    {p.avatar ? (
                      <img 
                        src={`https://api.dicebear.com/7.x/${p.avatar.split(':')[0]}/svg?seed=${p.avatar.split(':')[1]}&backgroundColor=transparent`} 
                        alt="avatar" 
                        style={{ width: '90%', height: '90%' }} 
                      />
                    ) : (
                      p.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  
                  {/* AFK Timer Bar */}
                  {isActive && turnRemaining > 0 && !isVisualRolling && (
                    <div style={{ position: 'absolute', bottom: '-10px', left: 0, width: '100%', height: '4px', background: 'rgba(255,255,255,0.2)', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', background: turnProgress < 25 ? '#ef4444' : '#10b981', width: `${turnProgress}%`, transition: 'width 0.1s linear' }} />
                    </div>
                  )}
                  
                  {/* Disconnect Countdown Ring */}
                  {showDisconnect && (
                    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', borderRadius: '50%', border: '4px solid rgba(239, 68, 68, 0.3)', pointerEvents: 'none' }}>
                       <svg viewBox="0 0 100 100" style={{ position: 'absolute', top: '-4px', left: '-4px', width: '100%', height: '100%', transform: 'rotate(-90deg)', overflow: 'visible' }}>
                         <circle cx="50" cy="50" r="25" fill="none" stroke="#ef4444" strokeWidth="8" strokeDasharray="157" strokeDashoffset={157 - (157 * disconnectProgress / 100)} style={{ transition: 'stroke-dashoffset 0.1s linear' }} />
                       </svg>
                       <div style={{ position: 'absolute', width: '100%', height: '100%', top: 0, left: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', borderRadius: '50%', color: 'white', fontSize: '0.7rem', fontWeight: 'bold' }}>
                         {Math.ceil((p.disconnectDeadline! - now) / 1000)}s
                       </div>
                    </div>
                  )}
                </div>
                
                <span style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>{p.name} {p.id === mySessionId && '(You)'}</span>
              </div>
            );
          })}
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {(!gameState.winner && !isSpectator) && (
            <button 
              className={`btn ${canRoll ? 'btn-primary' : 'btn-secondary'}`}
              disabled={!canRoll || rolling || isVisualRolling}
              onClick={handleRollDice}
              style={{
                width: 'auto',
                padding: '0.8rem 1.5rem',
                fontSize: '1.2rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.8rem'
              }}
            >
              <Dices />
              {rolling || isVisualRolling ? 'Rolling...' : canRoll ? 'Roll Dice' : 'Wait for turn'}
            </button>
          )}

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
                      onMouseOver={(e) => (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.1)'}
                      onMouseOut={(e) => (e.currentTarget as HTMLButtonElement).style.background = 'transparent'}
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
              playDiceSound={playDiceRoll}
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
