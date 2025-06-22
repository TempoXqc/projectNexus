
import React from 'react';
import { motion } from 'framer-motion';
import { Card } from '../types/Card';

interface CardPreviewProps {
  hoveredCardId: string | null;
  field: (Card | null)[];
  hand: Card[];
  opponentField?: (Card | null)[];
}

export default function CardPreview({ hoveredCardId, field, hand, opponentField }: CardPreviewProps) {
  let card: Card | null | undefined = field.find((c) => c?.id === hoveredCardId) || hand.find((c) => c.id === hoveredCardId);
  if (!card && opponentField) {
    card = opponentField.find((c) => c?.id === hoveredCardId);
  }

  if (!card) return null;

  return (
    <motion.div
      className="fixed top-58 left-5 z-50"
      style={{
        width: '18%',
        height: '22%',
      }}
      initial={{ x: '-100%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '-100%', opacity: 0 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
    >
      <div className="border-4 border-white rounded-lg shadow-2xl">
        <img
          src={card.image}
          alt={card.name}
          className="rounded shadow-2xl border-2 border-white w-full h-full object-cover"
        />
      </div>
    </motion.div>
  );
}