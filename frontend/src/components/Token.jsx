import React from 'react';

const Token = ({ color, x, y, offset, isMovable, onClick }) => {
  const left = `calc(${(x * 100) / 15}% + ${offset.dx}px)`;
  const top = `calc(${(y * 100) / 15}% + ${offset.dy}px)`;

  let bg = '#ef4444';
  if (color === 'green') bg = '#10b981';
  if (color === 'yellow') bg = '#eab308';
  if (color === 'blue') bg = '#3b82f6';

  return (
    <div 
      onClick={isMovable ? onClick : null}
      style={{
        position: 'absolute',
        width: 'calc(100% / 15)',
        height: 'calc(100% / 15)',
        left,
        top,
        transition: 'all 0.4s ease-in-out',
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
        transform: isMovable ? 'scale(1.2)' : 'scale(1)',
        transition: 'transform 0.2s, box-shadow 0.2s'
      }} />
    </div>
  );
};

export default Token;
