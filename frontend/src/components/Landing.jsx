import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useSocket } from '../SocketContext';
import { Dices, LogIn, Plus, Shield } from 'lucide-react';

const Landing = () => {
  const [username, setUsername] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [error, setError] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(true);
  
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const socket = useSocket();

  useEffect(() => {
    const code = searchParams.get('code');
    if (code) {
      setRoomCode(code.toUpperCase());
      setIsJoining(true);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!socket) return;
    
    const savedSessionId = sessionStorage.getItem('ludo_session_id');
    if (savedSessionId) {
      socket.emit('reconnect_session', { sessionId: savedSessionId }, (response) => {
        if (response.success) {
          navigate(`/room/${response.room.id}`, { state: { room: response.room } });
        } else {
          sessionStorage.removeItem('ludo_session_id');
          setIsReconnecting(false);
        }
      });
    } else {
      setIsReconnecting(false);
    }
  }, [socket, navigate]);

  const handleCreateRoom = () => {
    if (!username.trim()) {
      setError('Please enter a username');
      return;
    }
    setError('');
    
    socket.emit('create_room', { username: username.trim() }, (response) => {
      if (response.success) {
        sessionStorage.setItem('ludo_session_id', response.sessionId);
        navigate(`/room/${response.room.id}`, { state: { room: response.room } });
      } else {
        setError(response.message || 'Failed to create room');
      }
    });
  };

  const handleJoinRoom = () => {
    if (!username.trim()) {
      setError('Please enter a username');
      return;
    }
    if (!roomCode.trim() || roomCode.length !== 6) {
      setError('Please enter a valid 6-character room code');
      return;
    }
    setError('');
    
    socket.emit('join_room', { roomId: roomCode.trim(), username: username.trim() }, (response) => {
      if (response.success) {
        sessionStorage.setItem('ludo_session_id', response.sessionId);
        navigate(`/room/${response.room.id}`, { state: { room: response.room } });
      } else {
        setError(response.message || 'Failed to join room');
      }
    });
  };

  if (isReconnecting) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p>Reconnecting to session...</p>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}
    >
      <motion.div 
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", bounce: 0.5, delay: 0.2 }}
        style={{ marginBottom: '2rem', textAlign: 'center' }}
      >
        <div style={{ background: 'var(--primary-accent)', width: '80px', height: '80px', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', boxShadow: '0 10px 25px -5px var(--primary-accent)' }}>
          <Dices size={48} color="white" />
        </div>
        <h1 style={{ fontSize: '3rem', background: 'linear-gradient(to right, #fff, #a5b4fc)', WebkitBackgroundClip: 'text', color: 'transparent' }}>Ludo Nexus</h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>A privacy-first, real-time multiplayer experience.</p>
      </motion.div>

      <div className="glass-card" style={{ width: '100%', maxWidth: '400px' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Choose your alias</label>
          <input 
            type="text" 
            className="input-field" 
            placeholder="Anonymous Player"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            maxLength={15}
          />
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            style={{ color: '#ef4444', marginBottom: '1rem', fontSize: '0.9rem', textAlign: 'center', background: 'rgba(239, 68, 68, 0.1)', padding: '0.5rem', borderRadius: '8px' }}
          >
            {error}
          </motion.div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {!isJoining ? (
            <>
              <button className="btn btn-primary" onClick={handleCreateRoom}>
                <Plus size={20} /> Create New Room
              </button>
              <div style={{ display: 'flex', alignItems: 'center', margin: '0.5rem 0' }}>
                <div style={{ flex: 1, height: '1px', background: 'var(--glass-border)' }}></div>
                <span style={{ padding: '0 1rem', color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase' }}>or</span>
                <div style={{ flex: 1, height: '1px', background: 'var(--glass-border)' }}></div>
              </div>
              <button className="btn btn-secondary" onClick={() => setIsJoining(true)}>
                <LogIn size={20} /> Join Existing Room
              </button>
            </>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Room Code</label>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="e.g. A1B2C3"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  maxLength={6}
                  style={{ textTransform: 'uppercase', letterSpacing: '2px', textAlign: 'center', fontWeight: 'bold' }}
                />
              </div>
              <button className="btn btn-primary" style={{ marginBottom: '0.8rem' }} onClick={handleJoinRoom}>
                Join Game
              </button>
              <button className="btn btn-secondary" onClick={() => setIsJoining(false)}>
                Back
              </button>
            </motion.div>
          )}
        </div>
      </div>
      
      <div style={{ marginTop: '2rem', textAlign: 'center' }}>
        <Link to="/privacy" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.3rem', justifyContent: 'center' }}>
          <Shield size={14} /> Privacy & Architecture
        </Link>
      </div>
    </motion.div>
  );
};

export default Landing;
