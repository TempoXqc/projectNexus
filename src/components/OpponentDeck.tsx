import { memo } from 'react';

interface OpponentDeckProps {
  count: number;
  backcardImage?: string;
}

function OpponentDeck({ count, backcardImage }: OpponentDeckProps) {
  return (
    <div
      className="flex flex-col items-center justify-center relative cursor-pointer border-4 border-gray-600 rounded-lg p-1 bg-black/40"
      style={{ width: '120px', height: '160px' }}
    >
      <img
        src={backcardImage}
        alt="Opponent Deck"
        className="w-full h-full object-cover rounded shadow"
      />
      <span className="absolute inset-0 flex items-center justify-center text-white font-bold text-xl">
        {count}
      </span>
    </div>
  );
}

export default memo(OpponentDeck);