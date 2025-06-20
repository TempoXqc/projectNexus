import React from 'react';
import { motion } from 'framer-motion';
import { Card } from '../types/Card';

interface OpponentFieldProps {
  opponentField: (Card | null)[];
  hoveredCardId: string | null;
  setHoveredCardId: (id: string | null) => void;
}

export default function OpponentField({
                                        opponentField,
                                        hoveredCardId,
                                        setHoveredCardId,
                                      }: OpponentFieldProps) {
  const visibleCards = opponentField.filter((card) => card !== null) as Card[];

  return (
    <div
      className="relative z-40"
      style={{
        position: 'absolute',
        top: '35%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        height: '190px',
        overflow: 'visible',
      }}
    >
      {visibleCards.map((card, visibleIndex) => (
        <motion.div
          key={card.id}
          initial={{ opacity: 0, scale: 0.8, x: 20 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          transition={{ duration: 0.3 }}
          className="absolute w-[140px] h-[190px] bg-white shadow rounded"
          onMouseEnter={() => setHoveredCardId(card.id)}
          onMouseLeave={() => setHoveredCardId(null)}
          style={{
            left: `calc(50% + ${visibleIndex * 160 - ((visibleCards.length - 1) * 160) / 2}px)`,
            transform: 'translateX(-50%)',
            cursor: 'pointer',
          }}
        >
          <img
            src={card.image}
            alt={card.name}
            className="w-full h-full object-cover rounded"
          />
          {hoveredCardId === card.id && (
            <div className="absolute bottom-[-300px] left-1/2 transform -translate-x-1/2 z-100">
              <div className="border-4 border-white rounded-lg shadow-2xl">
              <img
                  src={card.image}
                  alt={card.name}
                  className="rounded shadow-2xl border-2 border-white"
                  style={{
                    maxWidth: '300px',
                    height: 'auto',
                    aspectRatio: '5 / 7',
                    objectFit: 'contain',
                    display: 'block',
                  }}
                />
              </div>
            </div>
          )}
        </motion.div>
      ))}
    </div>
  );
}