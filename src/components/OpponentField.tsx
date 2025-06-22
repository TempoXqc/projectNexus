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
                                        setHoveredCardId,
                                      }: OpponentFieldProps) {
  const visibleCards = opponentField.filter((card): card is Card => card !== null) as Card[];
  return (
    <div
      className="relative z-40"
      style={{
        position: 'absolute',
        top: '38%',
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
          animate={{ opacity: 1, scale: 1, x: 0, rotate: card.exhausted ? 90 : 0 }} // Utiliser animate pour la rotation
          transition={{ duration: 0.3 }}
          className="absolute w-[140px] h-[190px] bg-white shadow rounded"
          onMouseEnter={() => setHoveredCardId(card.id)}
          onMouseLeave={() => setHoveredCardId(null)}
          style={{
            left: `calc(50% + ${visibleIndex * 160 - ((visibleCards.length - 1) * 160) / 2}px`,
            transformOrigin: 'center center',
            cursor: 'pointer',
          }}
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