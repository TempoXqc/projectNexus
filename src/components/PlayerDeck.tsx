import React from 'react';

interface PlayerDeckProps {
  count: number;
}

export default function PlayerDeck({ count }: PlayerDeckProps) {
  return (
    <div
      className="flex flex-col items-center justify-center relative"
      style={{ width: '120px', height: '180px' }}
    >
      <img
        src="/addons/backcard.png"
        alt="Deck"
        className="w-full h-full object-cover rounded shadow"
      />
      <span className="absolute inset-0 flex items-center justify-center text-white font-bold text-[2rem]">
        {count}
      </span>
    </div>
  );
}
