import React from 'react';

interface OpponentCounterProps {
  playerId: number | null;
  gameId: string | undefined;
  opponentCounter: number;
}

export default function CounterOpponentPlayer({ opponentCounter }: OpponentCounterProps) {
  return (
    <div
      className="relative flex items-center justify-center p-2 rounded-lg shadow-md z-30"
      style={{
        backgroundImage: 'url(/addons/lifetoken.png)',
        backgroundSize: 'contain',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
        width: '150px', // Ajustez selon la taille de votre image
        height: '150px', // Ajustez selon la taille de votre image
      }}
    >
      <span
        className="absolute text-white text-5xl font-bold"
        style={{
          top: '50%', // Centre verticalement
          left: '55%', // Centre horizontalement
          transform: 'translate(-50%, -50%)', // Ajuste pour centrer parfaitement
        }}
      >
        {opponentCounter}
      </span>
    </div>
  );
}