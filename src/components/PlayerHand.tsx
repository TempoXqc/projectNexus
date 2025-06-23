import React, { memo } from 'react';
import { Card } from '../types/Card';
import { Play, Trash2, Plus } from 'lucide-react';

interface PlayerHandProps {
  hand: Card[];
  hoveredCardId: string | null;
  setHoveredCardId: (id: string | null) => void;
  isHandHovered: boolean;
  setIsHandHovered: (hovered: boolean) => void;
  mustDiscard: boolean;
  discardCardFromHand: (card: Card) => void;
  playCardToField: (card: Card) => void;
  addToDeck: (card: Card) => void;
  playerId: number | null;
}

function PlayerHand({
                      hand,
                      hoveredCardId,
                      setHoveredCardId,
                      isHandHovered,
                      setIsHandHovered,
                      discardCardFromHand,
                      playCardToField,
                      addToDeck,
                    }: PlayerHandProps) {
  return (
    <div
      className="flex justify-center items-center gap-4 flex-1 z-2"
      onMouseEnter={() => setIsHandHovered(true)}
      onMouseLeave={() => setIsHandHovered(false)}
      style={{
        position: 'absolute',
        top: isHandHovered ? '88%' : '100%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        transition: 'top 0.3s ease-in-out',
        overflow: 'visible',
      }}
    >
      {hand.map((card) => (
        <div
          key={card.id}
          className="relative rounded shadow p-1 bg-black cursor-pointer transition-transform hover:scale-105"
          style={{ width: '175px', height: '240px', position: 'relative', margin: '-2%' }}
          onMouseEnter={() => setHoveredCardId(card.id)}
          onMouseLeave={() => setHoveredCardId(null)}
        >
          <img
            src={card.image}
            alt={card.name}
            className="w-full h-full object-cover rounded"
          />
          {hoveredCardId === card.id && (
            <div
              className="absolute top-0 left-1/2 transform -translate-x-1/2 flex flex-col items-center pt-2 transition-all duration-300"
              style={{
                top: '10px',
                left: '75%',
                transform: 'translate(-50%, 0)',
                pointerEvents: 'auto',
              }}
            >
              <div className="flex gap-2 bg-gray-800 bg-opacity-90 p-1 rounded-lg shadow-lg">
                <button
                  onClick={() => {
                    playCardToField(card);
                  }}
                  className="bg-blue-500 text-white p-1 rounded-full hover:bg-blue-600 focus:outline-none"
                  title=""
                  aria-label="Play card to field"
                >
                  <Play size={16} />
                  <span className="absolute top-[-35px] left-1/2 transform -translate-x-1/2 hidden group-hover:block bg-gray-900 text-white text-xs rounded py-1 px-2 shadow-md whitespace-nowrap">
                    Play card on field
                  </span>
                </button>
                <button
                  onClick={() => discardCardFromHand(card)}
                  className="bg-red-500 text-white p-1 rounded-full hover:bg-red-600 focus:outline-none"
                  title=""
                  aria-label="Discard card to graveyard"
                >
                  <Trash2 size={16} />
                  <span className="absolute top-[-35px] left-1/2 transform -translate-x-1/2 hidden group-hover:block bg-gray-900 text-white text-xs rounded py-1 px-2 shadow-md whitespace-nowrap">
                    Discard to graveyard
                  </span>
                </button>
                <button
                  onClick={() => addToDeck(card)}
                  className="bg-green-500 text-white p-1 rounded-full hover:bg-green-600 focus:outline-none"
                  title=""
                  aria-label="Add card to deck"
                >
                  <Plus size={16} />
                  <span className="absolute top-[-35px] left-1/2 transform -translate-x-1/2 hidden group-hover:block bg-gray-900 text-white text-xs rounded py-1 px-2 shadow-md whitespace-nowrap">
                    Add to deck
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default memo(PlayerHand);