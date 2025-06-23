import React, { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card } from '../types/Card';

interface CardPreviewProps {
  hoveredCardId: string | null;
  field: (Card | null)[];
  hand: Card[];
  opponentField?: (Card | null)[];
}

function CardPreview({ hoveredCardId, field, hand, opponentField }: CardPreviewProps) {
  const card = useMemo(() => {
    let foundCard: Card | null | undefined =
      field.find((c) => c?.id === hoveredCardId) || hand.find((c) => c.id === hoveredCardId);
    if (!foundCard && opponentField) {
      foundCard = opponentField.find((c) => c?.id === hoveredCardId);
    }
    return foundCard;
  }, [hoveredCardId, field, hand, opponentField]);

  if (!card) return null;

  return (
    <motion.div
      className="fixed top-1/2 left-5 z-50"
      style={{
        width: '18%',
        height: '40%',
        transform: 'translateY(-50%)',
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

export default memo(CardPreview);