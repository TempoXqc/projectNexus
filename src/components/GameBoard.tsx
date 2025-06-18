import React from 'react';
import { motion } from 'framer-motion';
import { Card } from '../types/Card';

interface GameBoardProps {
  deck: Card[];
  graveyard: Card[];
  field: (Card | null)[];
  hand: Card[];
  hoveredCardId: string | null;
  setHoveredCardId: (id: string | null) => void;
  isHandHovered: boolean;
  setIsHandHovered: (hovered: boolean) => void;
  isGraveyardOpen: boolean;
  setIsGraveyardOpen: (open: boolean) => void;
  playCardToField: (card: Card) => void;
  discardCardFromHand: (card: Card) => void;
  removeCardFromField: (index: number) => void;
  mustDiscard: boolean;
  hasPlayedCard: boolean;
}

export default function GameBoard({
                                    deck,
                                    graveyard,
                                    field,
                                    hand,
                                    hoveredCardId,
                                    setHoveredCardId,
                                    isHandHovered,
                                    setIsHandHovered,
                                    setIsGraveyardOpen,
                                    playCardToField,
                                    discardCardFromHand,
                                    removeCardFromField,
                                    mustDiscard,
                                  }: GameBoardProps) {
  return (
    <div
      className="w-[70%] min-h-screen flex flex-col justify-end items-center p-4 relative"
      style={{
        backgroundImage: 'url(/addons/background.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Field */}
      <div
        className="relative"
        style={{
          position: 'absolute',
          top: '70%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          height: '190px',
        }}
      >
        {field
          .map((card, index) => ({ card, index }))
          .filter(({ card }) => card !== null)
          .map(({ card }, visibleIndex) => (
            <motion.div
              key={card!.id}
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              onClick={() => removeCardFromField(field.indexOf(card))}
              className="absolute w-[140px] h-[190px] bg-white shadow rounded"
              style={{
                left: `calc(50% + ${visibleIndex * 160 - ((field.filter((c) => c !== null).length - 1) * 160) / 2}px)`,
                transform: 'translateX(-50%)',
                cursor: 'pointer',
              }}
              onMouseEnter={() => setHoveredCardId(card!.id)}
              onMouseLeave={() => setHoveredCardId(null)}
            >
              <img
                src={card!.image}
                alt={card!.name}
                className="w-full h-full object-cover rounded"
              />
              {hoveredCardId === card!.id && (
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-50">
                  <div className="border-4 border-white rounded-lg shadow-2xl">
                    <img
                      src={card!.image}
                      alt={card!.name}
                      style={{ width: '300px', height: '420px' }}
                      className="rounded"
                    />
                  </div>
                </div>
              )}
            </motion.div>
          ))}
      </div>

      <div className="flex items-end w-full h-full">
        {/* Deck & Graveyard */}
        <div className="flex gap-4">
          <div className="flex flex-col items-center justify-center relative" style={{ width: '120px', height: '180px' }}>
            {deck.length > 0 && (
              <>
                <img
                  src="/addons/backcard.png"
                  alt="Deck"
                  className="w-full h-full object-cover rounded shadow"
                />
                <span className="absolute inset-0 flex items-center justify-center text-white font-bold text-[2rem]">
                  {deck.length}
                </span>
              </>
            )}
          </div>

          <div
            className="flex flex-col items-center justify-center relative cursor-pointer"
            style={{ width: '120px', height: '180px' }}
            onClick={() => setIsGraveyardOpen(true)}
          >
            {graveyard.length > 0 && (
              <>
                <img
                  src="/addons/backcard.png"
                  alt="Graveyard"
                  className="w-full h-full object-cover rounded shadow grayscale"
                />
                <span className="absolute inset-0 flex items-center justify-center text-white font-bold text-[2rem]">
                  {graveyard.length}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Player Hand */}
        <div
          className="flex justify-center items-center gap-4 flex-1"
          onMouseEnter={() => setIsHandHovered(true)}
          onMouseLeave={() => setIsHandHovered(false)}
          style={{
            position: 'absolute',
            top: isHandHovered ? '88%' : '100%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            transition: 'top 0.3s ease-in-out',
          }}
        >
          {hand.map((card) => (
            <div
              key={card.id}
              onClick={() => (mustDiscard ? discardCardFromHand(card) : playCardToField(card))}
              onMouseEnter={() => setHoveredCardId(card.id)}
              onMouseLeave={() => setHoveredCardId(null)}
              className="relative rounded border shadow p-2 bg-white cursor-pointer transition-transform hover:scale-105"
              style={{ width: '140px', height: '190px' }}
            >
              <img
                src={card.image}
                alt={card.name}
                className="w-full h-full object-cover rounded"
              />
              {hoveredCardId === card.id && (
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-50">
                  <div className="border-4 border-white rounded-lg shadow-2xl">
                    <img
                      src={card.image}
                      alt={card.name}
                      style={{ width: '300px', height: '420px' }}
                      className="rounded"
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
