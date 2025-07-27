import { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card } from '@tempoxqc/project-nexus-types';

interface OpponentFieldProps {
  opponentField: (Card | null)[];
  hoveredCardId: string | null;
  setHoveredCardId: (id: string | null) => void;
  attackingCardId: string | null;  // New
  hoveredTarget: { type: 'card' | 'nexus'; id?: string } | null;  // New
  setHoveredTarget: (target: { type: 'card' | 'nexus'; id?: string } | null) => void;  // New
  onConfirmAttack: (target: { type: 'card' | 'nexus'; id?: string }) => void;  // New
}

function OpponentField({
                         opponentField,
                         setHoveredCardId,
                         attackingCardId,
                         hoveredTarget,
                         setHoveredTarget,
                         onConfirmAttack,
                       }: OpponentFieldProps) {
  const visibleCards = useMemo(
    () => opponentField.filter((card): card is Card => card !== null),
    [opponentField],
  );

  return (
    <div
      className="relative z-40"
      style={{
        position: 'absolute',
        top: '25%',
        left: '50%',
        transform: 'translateX(-50%)',
        height: '11.11vw',
        maxHeight: '213.33px',
        overflow: 'visible',
        width: '55vw',
        maxWidth: '1600px',
      }}
    >
      {visibleCards.map((card, visibleIndex) => (
        <motion.div
          key={card.id}
          initial={{ opacity: 0, scale: 0.8, x: 20 }}
          animate={{ opacity: 1, scale: 1, x: 0, rotate: card.exhausted ? 90 : 0 }}
          transition={{ duration: 0.3 }}
          className={`absolute bg-white shadow rounded ${attackingCardId && hoveredTarget?.type === 'card' && hoveredTarget.id === card.id ? 'border-4 border-red-500 animate-pulse' : ''}`}
          style={{
            cursor: attackingCardId ? 'pointer' : 'default',
            width: '5.99vw',
            maxWidth: '153.33px',
            height: '8.33vw',
            maxHeight: '213.33px',
            left: `calc(50% + ${(visibleIndex - visibleCards.length / 2) * 6.25}vw)`,
            transformOrigin: 'center center'
          }}
          onMouseEnter={() => {
            setHoveredCardId(card.id);
            if (attackingCardId) setHoveredTarget({ type: 'card', id: card.id });
          }}
          onMouseLeave={() => {
            setHoveredCardId(null);
            if (attackingCardId) setHoveredTarget(null);
          }}
          onClick={() => {
            if (attackingCardId) onConfirmAttack({ type: 'card', id: card.id });
          }}
        >
          <img
            src={card.image.fr}
            alt={card.name.fr}
            className="w-full h-full object-cover rounded"
          />
        </motion.div>
      ))}
    </div>
  );
}

export default memo(OpponentField);