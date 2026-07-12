import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocket } from "../context/SocketContext";
import { Users, Copy, CheckCircle, LogOut, Crown, WifiOff } from 'lucide-react';
import GameView from "../pages/GameView";

const Lobby = () => {
  const { roomId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const socket = useSocket();
  
  const [room, setRoom] = useState(location.state?.room || null);
  const [copied, setCopied] = useState(false);
  
  const mySessionId = sessionStorage.getItem('ludo_session_id');

  useEffect(() => {
    if (!socket || !room) {
      navigate('/');
      return;
    }

    const handleRoomUpdate = (updatedRoom) => {
      setRoom(updatedRoom);
    };

    socket.on('room_update', handleRoomUpdate);

    return () => {
      socket.off('room_update', handleRoomUpdate);
    };
  }, [socket, navigate, room]);

  const copyInviteLink = () => {
    const inviteLink = `${window.location.origin}/?code=${roomId}`;
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const leaveRoom = () => {
    sessionStorage.removeItem('ludo_session_id');
    socket.disconnect(); // force disconnect
    setTimeout(() => {
      socket.connect(); // reconnect cleanly
      navigate('/');
    }, 100);
  };

  const startGame = () => {
    socket.emit('start_game', { roomId }, (response) => {
      if (!response.success) {
        alert(response.message);
      }
    });
  };

  if (!room) return null;

  if (room.status === 'playing') {
    return <GameView room={room} mySessionId={mySessionId} />;
  }

  const players = room.players || [];
  const emptySlots = Math.max(0, 4 - players.length);
  const me = players.find(p => p.id === mySessionId);
  const isHost = me?.isHost;

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
            <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Game Lobby</h2>
            <p style={{ color: 'var(--text-secondary)' }}>Waiting for players...</p>
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
              style={{ marginTop: '0.5rem', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '4px', padding: '0.3rem 0.8rem', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.8rem' }}
            >
              Copy Invite Link
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
              {players.map((player, index) => (
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
                  <div style={{ 
                    width: '40px', 
                    height: '40px', 
                    borderRadius: '50%', 
                    background: `hsl(${index * 137.5 % 360}, 70%, 50%)`, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    fontWeight: 'bold',
                    fontSize: '1.2rem',
                    color: 'white',
                    filter: player.status === 'offline' ? 'grayscale(100%)' : 'none'
                  }}>
                    {player.name.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '600', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {player.name}
                      {player.status === 'offline' && <WifiOff size={14} color="#ef4444" />}
                    </div>
                    {player.id === mySessionId && <div style={{ fontSize: '0.8rem', color: 'var(--primary-accent)' }}>You</div>}
                    {player.status === 'offline' && <div style={{ fontSize: '0.8rem', color: '#ef4444' }}>Disconnected</div>}
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
          
          <button 
            className="btn btn-primary" 
            style={{ width: 'auto', padding: '1rem 3rem' }} 
            disabled={players.length < 2 || !isHost}
            onClick={startGame}
            title={!isHost ? "Only host can start" : "Need at least 2 players"}
          >
            Start Game
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default Lobby;
