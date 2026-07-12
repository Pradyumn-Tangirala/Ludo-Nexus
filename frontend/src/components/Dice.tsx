import React, { useState, useEffect } from 'react';
import { motion, useAnimation } from 'framer-motion';

interface DiceProps {
  roll: number | null;
  rollCount: number;
  onVisualRollEnd?: () => void;
}

const Dice: React.FC<DiceProps> = ({ roll, rollCount, onVisualRollEnd }) => {
  const [visualRoll, setVisualRoll] = useState(roll || 1);
  const [isRolling, setIsRolling] = useState(false);
  const controls = useAnimation();

  useEffect(() => {
    if (rollCount > 0 && roll) {
      // Start rolling animation
      setIsRolling(true);
      let interval: NodeJS.Timeout;
      
      // Shake animation
      controls.start({
        rotate: [0, -20, 20, -20, 20, 0],
        scale: [1, 1.2, 1],
        transition: { duration: 0.5 }
      });
      
      // Rapidly change number
      interval = setInterval(() => {
        setVisualRoll(Math.floor(Math.random() * 6) + 1);
      }, 50);

      // Stop after 500ms and show actual roll
      setTimeout(() => {
        clearInterval(interval);
        setVisualRoll(roll);
        setIsRolling(false);
        if (onVisualRollEnd) onVisualRollEnd();
      }, 500);

      return () => clearInterval(interval);
    } else {
        setVisualRoll(roll || 6); // default to 6 if no roll yet
    }
  }, [rollCount, roll, controls, onVisualRollEnd]);

  return (
    <motion.div 
      animate={controls}
      style={{ 
        width: '50px', height: '50px', 
        background: 'white', color: '#333', 
        borderRadius: '12px', display: 'flex', 
        alignItems: 'center', justifyContent: 'center',
        fontSize: '1.8rem', fontWeight: 'bold',
        boxShadow: '0 4px 10px rgba(0,0,0,0.2)',
        userSelect: 'none'
      }}
    >
      {visualRoll}
    </motion.div>
  );
};

export default Dice;
