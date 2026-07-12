import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocket } from "../context/SocketContext";
import { Users, Copy, CheckCircle, LogOut, Crown, WifiOff, Activity, ChevronLeft, ChevronRight } from 'lucide-react';
import GameView from "../pages/GameView";
import { SOCKET_EVENTS } from '../constants/events';
import { useSoundEffects } from '../hooks/useSoundEffects';

const AVATARS = [
  'bottts:1',
  'bottts:2',
  'bottts:3',
  'bottts:4',
  'bottts:5',
  'bottts:6',
  'micah:1',
  'micah:2',
  'fun-emoji:1',
  'fun-emoji:2'
];

const Lobby: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const socket = useSocket();
  const { playClick } = useSoundEffects();
  
  const [room, setRoom] = useState<any>(location.state?.room || null);
  const [copied, setCopied] = useState(false);
  const [ping, setPing] = useState<number | null>(null);
  
  const mySessionId = sessionStorage.getItem('ludo_session_id');

  // Ping tracking
  useEffect(() => {
    if (!socket) return;
    const interval = setInterval(() => {
      const start = Date.now();
      socket.emit(SOCKET_EVENTS.PING, start, (clientTime: number) => {
        setPing(Date.now() - clientTime);
      });
    }, 3000);
    return () => clearInterval(interval);
  }, [socket]);

  // Window Focus/Blur for 'away' status
  useEffect(() => {
    if (!socket || !roomId) return;
    
    const handleFocus = () => socket.emit(SOCKET_EVENTS.SET_STATUS, { roomId, status: 'online' });
    const handleBlur = () => socket.emit(SOCKET_EVENTS.SET_STATUS, { roomId, status: 'away' });

    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, [socket, roomId]);

  useEffect(() => {
    if (!socket || !room) {
      navigate('/');
      return;
    }

    const handleRoomUpdate = (updatedRoom: any) => {
      setRoom(updatedRoom);
    };

    socket.on(SOCKET_EVENTS.ROOM_UPDATE, handleRoomUpdate);

    return () => {
      socket.off(SOCKET_EVENTS.ROOM_UPDATE, handleRoomUpdate);
    };
  }, [socket, navigate, room]);

  const copyInviteLink = () => {
    playClick();
    const inviteLink = `${window.location.origin}/?code=${roomId}`;
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const leaveRoom = () => {
    playClick();
    sessionStorage.removeItem('ludo_session_id');
    socket.disconnect();
    setTimeout(() => {
      socket.connect();
      navigate('/');
    }, 100);
  };

  const startGame = () => {
    playClick();
    socket.emit(SOCKET_EVENTS.START_GAME, { roomId }, (response: any) => {
      if (!response.success) {
        alert(response.message);
      }
    });
  };

  const toggleReady = () => {
    playClick();
    socket.emit(SOCKET_EVENTS.TOGGLE_READY, { roomId });
  };

  const cycleAvatar = (direction: 'next' | 'prev') => {
    if (!me) return;
    playClick();
    const currentIndex = AVATARS.indexOf(me.avatar) || 0;
    let nextIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
    if (nextIndex >= AVATARS.length) nextIndex = 0;
    if (nextIndex < 0) nextIndex = AVATARS.length - 1;
    
    socket.emit(SOCKET_EVENTS.SET_AVATAR, { roomId, avatar: AVATARS[nextIndex] });
  };

  if (!room) return null;

  if (room.status === 'playing') {
    return <GameView room={room} mySessionId={mySessionId} />;
  }

  const players = room.players || [];
  const playersOnly = players.filter((p: any) => p.role === 'player');
  const emptySlots = Math.max(0, 4 - playersOnly.length);
  const me = players.find((p: any) => p.id === mySessionId);
  const isHost = me?.isHost;
  const isSpectator = me?.role === 'spectator';
  const allReady = playersOnly.every((p: any) => p.isReady);

  const getStatusColor = (status: string) => {
    if (status === 'online') return '#10b981'; // Green
    if (status === 'away') return '#f59e0b'; // Yellow
    return '#ef4444'; // Red
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', maxWidth: '800px', margin: '0 auto', paddingTop: '2rem' }}
    >
      <div className="glass-card" style={{ width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
          <div>
            <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              Game Lobby
            </h2>
            <p style={{ color: 'var(--text-secondary)' }}>Waiting for players...</p>
            {ping !== null && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem', fontSize: '0.8rem', color: ping < 100 ? '#10b981' : '#f59e0b' }}>
                <Activity size={14} /> Ping: {ping}ms
              </div>
            )}
          </div>
          
          <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '16px', border: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '150px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.2rem' }}>Room Code</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
              <span style={{ fontSize: '1.8rem', fontWeight: 'bold', fontFamily: 'Outfit', letterSpacing: '3px' }}>{roomId}</span>
              <button 
                onClick={copyInviteLink}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: copied ? '#10b981' : 'var(--text-secondary)', padding: '0.3rem', transition: 'all 0.2s' }}
                title="Copy Invite Link"
              >
                {copied ? <CheckCircle size={20} /> : <Copy size={20} />}
              </button>
            </div>
            <button 
              onClick={copyInviteLink}
              style={{ marginTop: '0.5rem', background: 'var(--primary-accent)', border: 'none', borderRadius: '8px', padding: '0.5rem 1rem', color: 'white', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 'bold', width: '100%', boxShadow: '0 2px 10px rgba(99, 102, 241, 0.3)' }}
            >
              {copied ? 'Copied!' : 'Invite Friends'}
            </button>
          </div>
        </div>

        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <Users size={20} color="var(--text-secondary)" />
            <h3 style={{ fontSize: '1.2rem', color: 'var(--text-secondary)' }}>Players ({players.length}/4)</h3>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
            <AnimatePresence>
              {players.map((player: any, index: number) => (
                <motion.div 
                  key={player.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: index * 0.1 }}
                  style={{ 
                    padding: '1.2rem', 
                    background: player.status === 'offline' ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.03)', 
                    border: '1px solid var(--glass-border)', 
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    position: 'relative',
                    opacity: player.status === 'offline' ? 0.5 : 1
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ 
                      width: '50px', 
                      height: '50px', 
                      borderRadius: '50%', 
                      background: `hsl(${index * 137.5 % 360}, 70%, 50%)`, 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      overflow: 'hidden',
                      border: player.isReady ? '3px solid #10b981' : '3px solid transparent',
                      transition: 'border-color 0.3s',
                      filter: player.status === 'offline' ? 'grayscale(100%)' : 'none',
                      position: 'relative'
                    }}>
                      <img 
                        src={`https://api.dicebear.com/7.x/${player.avatar.split(':')[0]}/svg?seed=${player.avatar.split(':')[1]}&backgroundColor=transparent`} 
                        alt="avatar" 
                        style={{ width: '90%', height: '90%' }} 
                      />
                    </div>
                    
                    {/* Avatar Selector only for self */}
                    {player.id === mySessionId && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <button onClick={() => cycleAvatar('prev')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}><ChevronLeft size={16} /></button>
                        <button onClick={() => cycleAvatar('next')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}><ChevronRight size={16} /></button>
                      </div>
                    )}
                  </div>
                  
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '600', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {player.name}
                      {player.status === 'offline' && <WifiOff size={14} color="#ef4444" />}
                      {player.status !== 'offline' && (
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: getStatusColor(player.status) }} title={player.status} />
                      )}
                    </div>
                    {player.id === mySessionId && <div style={{ fontSize: '0.8rem', color: 'var(--primary-accent)' }}>You</div>}
                    
                    {player.role === 'spectator' ? (
                      <div style={{ marginTop: '0.3rem', fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--text-secondary)' }}>
                        SPECTATOR
                      </div>
                    ) : (
                      <div style={{ marginTop: '0.3rem', fontSize: '0.85rem', fontWeight: 'bold', color: player.isReady ? '#10b981' : 'var(--text-secondary)' }}>
                        {player.isReady ? 'READY' : 'NOT READY'}
                      </div>
                    )}
                  </div>
                  {player.isHost && (
                    <div style={{ position: 'absolute', top: '10px', right: '10px', color: '#fbbf24' }} title="Room Host">
                      <Crown size={18} />
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
            
            {Array.from({ length: emptySlots }).map((_, i) => (
              <div 
                key={`empty-${i}`}
                style={{ 
                  padding: '1.2rem', 
                  background: 'rgba(0,0,0,0.1)', 
                  border: '1px dashed rgba(255,255,255,0.1)', 
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-secondary)'
                }}
              >
                Waiting for player...
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid var(--glass-border)' }}>
          <button className="btn btn-secondary" style={{ width: 'auto' }} onClick={leaveRoom}>
            <LogOut size={18} /> Leave Room
          </button>
          
          <div style={{ display: 'flex', gap: '1rem' }}>
            {!isSpectator && (
              <button 
                className={`btn ${me?.isReady ? 'btn-secondary' : 'btn-primary'}`} 
                style={{ width: 'auto', padding: '1rem 2rem', background: me?.isReady ? 'var(--glass-bg)' : '#10b981' }} 
                onClick={toggleReady}
              >
                {me?.isReady ? 'Cancel Ready' : 'Ready Up'}
              </button>
            )}
            
            {isHost && (
              <button 
                className="btn btn-primary" 
                style={{ width: 'auto', padding: '1rem 3rem', opacity: allReady && playersOnly.length >= 2 ? 1 : 0.5 }} 
                disabled={!allReady || playersOnly.length < 2}
                onClick={startGame}
                title={!allReady ? "All players must be ready" : "Need at least 2 players"}
              >
                Start Game
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default Lobby;
