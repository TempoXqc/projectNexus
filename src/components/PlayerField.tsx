import React from 'react';
import { motion, easeInOut } from 'framer-motion';
import { Card } from '../types/Card';
import { RotateCcw, Sword, Trash2 } from 'lucide-react';

interface PlayerFieldProps {
  field: (Card | null)[];
  hoveredCardId: string | null;
  setHoveredCardId: (id: string | null) => void;
  removeCardFromField: (index: number) => void;
  exhaustCard: (index: number) => void;
  attackCard: (index: number) => void;
}

export default function PlayerField({
                                      field,
                                      hoveredCardId,
                                      setHoveredCardId,
                                      removeCardFromField,
                                      exhaustCard,
                                      attackCard,
                                    }: PlayerFieldProps) {
  const visibleCards = field
    .map((card, index) => ({ card, index }))
    .filter(({ card }) => card !== null) as { card: Card; index: number }[];


  return (
    <div
      className="relative z-40"
      style={{
        position: 'absolute',
        top: '62%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        height: '190px',
        overflow: 'visible',
      }}
    >
      {visibleCards.map(({ card, index }, visibleIndex) => (
        <motion.div
          key={`${card.id}-${card.exhausted}`}
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{
            opacity: 1,
            scale: 1,
            y: 0,
            rotate: card.exhausted ? 90 : 0
          }}
          transition={{ duration: 0.3, ease: easeInOut }}
          className="absolute w-[140px] h-[190px] bg-white shadow rounded"
          style={{
            left: `calc(50% + ${visibleIndex * 160 - ((visibleCards.length - 1) * 160) / 2}px`,
            transformOrigin: 'center center',
            cursor: 'pointer',
          }}
          onMouseEnter={() => {
            setHoveredCardId(card.id);
          }}
          onMouseLeave={() => {
            setHoveredCardId(null);
          }}
        >
          <img
            src={card.image}
            alt={card.name}
            className="w-full h-full object-cover rounded"
          />
          <div
            className="absolute top-0 left-1/2 transform -translate-x-1/2 flex flex-col items-center pt-2 transition-all duration-300"
            style={{
              top: '10px',
              left: '75%',
              transform: 'translate(-50%, 0)',
              pointerEvents: 'auto',
              opacity: card.id === hoveredCardId ? 1 : 0,
              zIndex: 50,
            }}
          >
            <div className="flex gap-2 bg-gray-800 bg-opacity-90 p-1 rounded-lg shadow-lg">
              <button
                onClick={() => attackCard(index)}
                className="bg-red-500 text-white p-1 rounded-full hover:bg-red-600 focus:outline-none group relative"
                title=""
                aria-label="Attack with card"
              >
                <Sword size={16} />
                <span className="absolute top-[-35px] left-1/2 transform -translate-x-1/2 hidden group-hover:block bg-gray-900 text-white text-xs rounded py-1 px-2 shadow-md whitespace-nowrap">
                  Attaquer
                </span>
              </button>
              <button
                onClick={() => removeCardFromField(index)}
                className="bg-red-500 text-white p-1 rounded-full hover:bg-red-600 focus:outline-none group relative"
                title=""
                aria-label="Remove card from field"
              >
                <Trash2 size={16} />
                <span className="absolute top-[-35px] left-1/2 transform -translate-x-1/2 hidden group-hover:block bg-gray-900 text-white text-xs rounded py-1 px-2 shadow-md whitespace-nowrap">
                  Retirer du terrain
                </span>
              </button>
              <button
                onClick={() => exhaustCard(index)}
                className="bg-yellow-500 text-white p-1 rounded-full hover:bg-yellow-600 focus:outline-none group relative"
                title=""
                aria-label="Exhaust card"
              >
                <RotateCcw size={16} />
                <span className="absolute top-[-35px] left-1/2 transform -translate-x-1/2 hidden group-hover:block bg-gray-900 text-white text-xs rounded py-1 px-2 shadow-md whitespace-nowrap">
                  Épuiser la carte
                </span>
              </button>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}