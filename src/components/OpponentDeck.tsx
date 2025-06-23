import React, { memo } from 'react';

interface OpponentDeckProps {
  count: number;
}

function OpponentDeck({ count }: OpponentDeckProps) {
  return (
    <div
      className="flex items-center justify-center relative border-2 border-gray-500 bg-gray-800 rounded"
      style={{ width: '120px', height: '160px' }}
    >
      <img
        src="/addons/nexus-back.jpg"
        alt="Opponent Deck"
        className="w-full h-full object-cover rounded"
      />
      <span className="absolute text-white font-bold text-xl">{count}</span>
    </div>
  );
}

export default memo(OpponentDeck);