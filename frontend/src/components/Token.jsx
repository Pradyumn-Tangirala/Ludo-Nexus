import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const Token = ({ color, x, y, offset, isMovable, onClick, progress }) => {
  const left = `calc(${(x * 100) / 15}% + ${offset.dx}px)`;
  const top = `calc(${(y * 100) / 15}% + ${offset.dy}px)`;

  let bg = '#ef4444';
  if (color === 'green') bg = '#10b981';
  if (color === 'yellow') bg = '#eab308';
  if (color === 'blue') bg = '#3b82f6';

  // Determine animations based on progress
  let animationState = {
      left,
      top,
      scale: isMovable ? 1.2 : 1,
      opacity: 1
  };
  
  if (progress === 56) {
      // Reached home! Shrink down and fade out
      animationState = {
          left,
          top,
          scale: 0,
          opacity: 0,
          rotate: 360
      };
  } else if (progress === 0) {
      // Just came out of base! Hop animation. We don't have previous state easily, 
      // but framer-motion interpolates nicely from the base (-1) to here.
  }

  return (
    <motion.div 
      onClick={isMovable ? onClick : null}
      initial={{ scale: 0, opacity: 0 }}
      animate={animationState}
      transition={{ 
          type: "spring", 
          stiffness: 150, 
          damping: 15,
          opacity: { duration: 0.4 },
          scale: { duration: progress === 56 ? 1 : 0.2 }
      }}
      style={{
        position: 'absolute',
        width: 'calc(100% / 15)',
        height: 'calc(100% / 15)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: isMovable ? 'pointer' : 'default',
        zIndex: isMovable ? 10 : 5
      }}
    >
      <div style={{
        width: '60%',
        height: '60%',
        backgroundColor: bg,
        borderRadius: '50%',
        border: '2px solid white',
        boxShadow: isMovable ? `0 0 10px 2px ${bg}` : '0 2px 4px rgba(0,0,0,0.5)',
        transition: 'box-shadow 0.2s'
      }} />
    </motion.div>
  );
};

export default Token;
