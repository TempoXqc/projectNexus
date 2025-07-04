// frontend/src/components/PlayerDeck.tsx
import { memo } from 'react';
import { RefreshCcw, CreditCard as CardIcon } from 'lucide-react';

interface PlayerDeckProps {
  count: number;
  drawCard: () => void;
  shuffleDeck: () => void;
  handCount: number;
  backcardImage?: string;
}

function PlayerDeck({ count, drawCard, shuffleDeck, handCount, backcardImage }: PlayerDeckProps) {
  return (
    <div
      className="flex flex-col items-center justify-center relative cursor-pointer border-4 border-gray-600 rounded-lg p-1 bg-black/40"
      style={{ width: '120px', height: '160px' }}
    >
      <div
        className="absolute top-0 left-1/2 transform -translate-x-1/2 flex gap-2 mt-2"
        style={{ top: '-40px' }}
      >
        <button
          onClick={drawCard}
          className="bg-blue-500 text-white p-1 rounded-full hover:bg-blue-600"
          title="Piocher une carte"
          disabled={handCount >= 10}
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
        src={backcardImage}
        alt="Deck"
        className="w-full h-full object-cover rounded shadow"
      />
      <span className="absolute inset-0 flex items-center justify-center text-white font-bold text-xl">
        {count}
      </span>
    </div>
  );
}

export default memo(PlayerDeck);