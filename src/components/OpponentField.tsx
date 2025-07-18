import { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card } from '@tempoxqc/project-nexus-types';

interface OpponentFieldProps {
  opponentField: (Card | null)[];
  hoveredCardId: string | null;
  setHoveredCardId: (id: string | null) => void;
}

function OpponentField({
                         opponentField,
                         setHoveredCardId,
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
          onMouseEnter={() => setHoveredCardId(card.id)}
          onMouseLeave={() => setHoveredCardId(null)}
          className="absolute bg-white shadow rounded"
          style={{
            width: '5.99vw',
            maxWidth: '153.33px',
            height: '8.33vw',
            maxHeight: '213.33px',
            left: `calc(50% + ${(visibleIndex - visibleCards.length / 2) * 6.25}vw)`,
            maxLeft: `calc(50% + ${(visibleIndex - visibleCards.length / 2) * 160}px)`,
            transformOrigin: 'center center',
            cursor: 'pointer',
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