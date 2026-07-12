// Privacy.jsx
import { motion } from 'framer-motion';
import { Shield, ServerOff, Clock, ShieldCheck, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Privacy = () => {
  const navigate = useNavigate();

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', padding: '2rem' }}
    >
      <div className="glass-card" style={{ width: '100%', maxWidth: '600px', padding: '3rem' }}>
        <button 
          onClick={() => navigate(-1)}
          style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2rem' }}
        >
          <ArrowLeft size={20} /> Back
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
          <div style={{ background: 'var(--primary-accent)', width: '50px', height: '50px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Shield size={30} color="white" />
          </div>
          <h1 style={{ fontSize: '2.5rem', margin: 0 }}>Privacy & Architecture</h1>
        </div>

        <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', lineHeight: '1.6', marginBottom: '2.5rem' }}>
          Ludo Nexus is designed from the ground up to respect your privacy and provide a frictionless, instant gaming experience.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
            <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '0.8rem', borderRadius: '50%' }}>
              <ServerOff size={24} color="#3b82f6" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>No Database</h3>
              <p style={{ color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                All game state and player sessions are stored strictly in memory on our secure Node.js server. Nothing is written to a persistent database.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
            <div style={{ background: 'rgba(234, 179, 8, 0.1)', padding: '0.8rem', borderRadius: '50%' }}>
              <Clock size={24} color="#eab308" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Ephemeral Rooms</h3>
              <p style={{ color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                Rooms are automatically and permanently deleted from memory after 10 minutes of complete inactivity. Once deleted, the room and all its data are gone forever.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
            <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '0.8rem', borderRadius: '50%' }}>
              <ShieldCheck size={24} color="#10b981" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Zero Accounts & Tracking</h3>
              <p style={{ color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                You don't need an account, email, or password to play. We don't use tracking cookies or third-party analytics scripts. Your session is managed via a temporary cryptographic ID in your browser's Session Storage.
              </p>
            </div>
          </div>

        </div>
      </div>
    </motion.div>
  );
};

export default Privacy;
