import React, { useState, useEffect } from 'react';
import { motion, useAnimation } from 'framer-motion';
import { EXTRA_TURN_VALUE } from '../constants/game';

interface DiceProps {
  roll: number | null;
  rollCount: number;
  onVisualRollEnd?: () => void;
  playDiceSound?: () => void;
}

const Dice: React.FC<DiceProps> = ({ roll, rollCount, onVisualRollEnd, playDiceSound }) => {
  const [visualRoll, setVisualRoll] = useState(roll || 1);
  const controls = useAnimation();
  const prevRollCount = React.useRef(0);

  // Face rotation mappings to ensure the correct number faces front (rotateX, rotateY)
  const faceRotations: Record<number, { x: number, y: number }> = {
    1: { x: 0, y: 0 },
    2: { x: 0, y: -90 },
    3: { x: 0, y: 90 },
    4: { x: -90, y: 0 },
    5: { x: 90, y: 0 },
    6: { x: 180, y: 0 },
  };

  useEffect(() => {
    if (rollCount > prevRollCount.current && roll) {
      prevRollCount.current = rollCount;
      if (playDiceSound) playDiceSound();
      
      const targetRotation = faceRotations[roll] || faceRotations[1];
      
      // Add extra spins for dramatic effect
      const extraSpinsX = Math.floor(Math.random() * 2 + 2) * 360; 
      const extraSpinsY = Math.floor(Math.random() * 2 + 2) * 360;
      
      controls.start({
        rotateX: targetRotation.x + extraSpinsX,
        rotateY: targetRotation.y + extraSpinsY,
        z: [0, 100, 50, 0], // Bounce effect
        transition: { 
          duration: 0.8, 
          ease: "easeOut",
        }
      }).then(() => {
        setVisualRoll(roll);
        if (onVisualRollEnd) onVisualRollEnd();
      });

    } else {
      const initRot = faceRotations[roll || 1];
      controls.set({ rotateX: initRot.x, rotateY: initRot.y });
      setVisualRoll(roll || 1);
    }
  }, [rollCount, roll, controls, onVisualRollEnd, playDiceSound]);

  const dotStyle = {
    background: '#333',
    borderRadius: '50%',
    width: '12px',
    height: '12px',
  };

  const faceStyle: React.CSSProperties = {
    position: 'absolute',
    width: '60px',
    height: '60px',
    background: 'white',
    border: '2px solid #ccc',
    borderRadius: '8px',
    boxShadow: 'inset 0 0 10px rgba(0,0,0,0.1)',
    display: 'grid',
    padding: '8px',
    boxSizing: 'border-box'
  };

  // Face layouts
  const Face1 = () => (
    <div style={{ ...faceStyle, transform: 'translateZ(30px)', placeItems: 'center' }}>
      <div style={dotStyle} />
    </div>
  );
  
  const Face2 = () => (
    <div style={{ ...faceStyle, transform: 'rotateY(90deg) translateZ(30px)', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr' }}>
      <div style={{...dotStyle, alignSelf: 'start', justifySelf: 'start'}} />
      <div />
      <div />
      <div style={{...dotStyle, alignSelf: 'end', justifySelf: 'end'}} />
    </div>
  );

  const Face3 = () => (
    <div style={{ ...faceStyle, transform: 'rotateY(-90deg) translateZ(30px)', gridTemplateColumns: '1fr 1fr 1fr', gridTemplateRows: '1fr 1fr 1fr' }}>
      <div style={{...dotStyle, alignSelf: 'start', justifySelf: 'start'}} />
      <div /><div /><div />
      <div style={{...dotStyle, alignSelf: 'center', justifySelf: 'center'}} />
      <div /><div /><div />
      <div style={{...dotStyle, alignSelf: 'end', justifySelf: 'end'}} />
    </div>
  );

  const Face4 = () => (
    <div style={{ ...faceStyle, transform: 'rotateX(90deg) translateZ(30px)', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', placeItems: 'center' }}>
      <div style={dotStyle} /><div style={dotStyle} />
      <div style={dotStyle} /><div style={dotStyle} />
    </div>
  );

  const Face5 = () => (
    <div style={{ ...faceStyle, transform: 'rotateX(-90deg) translateZ(30px)', gridTemplateColumns: '1fr 1fr 1fr', gridTemplateRows: '1fr 1fr 1fr', placeItems: 'center' }}>
      <div style={dotStyle} /><div /><div style={dotStyle} />
      <div /><div style={dotStyle} /><div />
      <div style={dotStyle} /><div /><div style={dotStyle} />
    </div>
  );

  const Face6 = () => (
    <div style={{ ...faceStyle, transform: 'rotateX(180deg) translateZ(30px)', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr 1fr', placeItems: 'center' }}>
      <div style={dotStyle} /><div style={dotStyle} />
      <div style={dotStyle} /><div style={dotStyle} />
      <div style={dotStyle} /><div style={dotStyle} />
    </div>
  );

  return (
    <div style={{ perspective: '600px', width: '60px', height: '60px', marginRight: '20px' }}>
      <motion.div 
        animate={controls}
        style={{ 
          width: '100%', 
          height: '100%', 
          position: 'relative',
          transformStyle: 'preserve-3d',
          transformOrigin: 'center center'
        }}
      >
        <Face1 />
        <Face2 />
        <Face3 />
        <Face4 />
        <Face5 />
        <Face6 />
      </motion.div>
    </div>
  );
};

export default Dice;
