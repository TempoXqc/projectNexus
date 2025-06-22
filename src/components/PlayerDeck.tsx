
import React from 'react';
import { RefreshCcw, CreditCard as CardIcon } from 'lucide-react';

interface PlayerDeckProps {
  count: number;
  drawCard: () => void;
  shuffleDeck: () => void;
  handCount: number;
}

export default function PlayerDeck({ count, drawCard, shuffleDeck }: PlayerDeckProps) {
  return (
    <div
      className="flex flex-col items-center justify-center relative"
      style={{ width: '150px', height: '210px' }}
    >
      <div
        className="absolute top-0 left-1/2 transform -translate-x-1/2 flex gap-2 mt-2"
        style={{ top: '-40px' }}
      >
        <button
          onClick={drawCard}
          className="bg-blue-500 text-white p-1 rounded-full hover:bg-blue-600"
          title="Piocher une carte"
        >
          <CardIcon size={16} />
        </button>
        <button
          onClick={shuffleDeck}
          className="bg-green-500 text-white p-1 rounded-full hover:bg-green-600"
          title="Mélanger le deck"
        >
          <RefreshCcw size={16} />
        </button>
      </div>
      <img
        src="/addons/nexus-back.jpg"
        alt="Deck"
        className="w-full h-full object-cover rounded shadow"
      />
      <span className="absolute inset-0 flex items-center justify-center text-white font-bold text-[2rem]">
        {count}
      </span>
    </div>
  );
}