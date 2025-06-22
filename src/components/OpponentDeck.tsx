import React from 'react';

export default function OpponentDeck({ count }: { count: number }) {
  return (
    <div
      className="w-[150px] h-[210px] flex items-center justify-center border-2 border-gray-500 bg-gray-800 rounded"
    >
      <img
        src="/addons/nexus-back.jpg"
        alt="Opponent Deck"
        className="w-full h-full object-cover rounded"
      />
      <span className="absolute text-white font-bold text-[2rem]">{count}</span>
    </div>
  );
}