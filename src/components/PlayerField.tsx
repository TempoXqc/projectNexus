// src/components/PlayerField.tsx
import React from 'react';
import { motion } from 'framer-motion';
import { Card } from '../types/Card';

interface PlayerFieldProps {
  field: (Card | null)[];
  hoveredCardId: string | null;
  setHoveredCardId: (id: string | null) => void;
}

export default function PlayerField({
                                      field,
                                      setHoveredCardId,
                                    }: PlayerFieldProps) {
  const visibleCards = field
    .map((card, index) => ({ card, index }))
    .filter(({ card }) => card !== null) as { card: Card; index: number }[];

  return (
    <div
      className="relative z-40"
      style={{
        position: 'absolute',
        top: '70%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        height: '190px',
        overflow: 'visible',
      }}
    >
      {visibleCards.map(({ card }, visibleIndex) => (
        <motion.div
          key={card.id}
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="absolute w-[140px] h-[190px] bg-white shadow rounded"
          style={{
            left: `calc(50% + ${visibleIndex * 160 - ((visibleCards.length - 1) * 160) / 2}px)`,
            transform: 'translateX(-50%)',
            cursor: 'pointer',
          }}
          onMouseEnter={() => setHoveredCardId(card.id)}
          onMouseLeave={() => setHoveredCardId(null)}
        >
          <img
            src={card.image}
            alt={card.name}
            className="w-full h-full object-cover rounded"
          />
        </motion.div>
      ))}
    </div>
  );
}