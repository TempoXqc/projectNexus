// OpponentField.tsx
import React from 'react';
import { motion } from 'framer-motion';
import { Card } from '../types/Card';

export default function OpponentField({ opponentField }: { opponentField: (Card | null)[] }) {
  return (
    <div
      className="flex justify-center items-center gap-2"
      style={{
        position: 'absolute',
        top: '35%',
        left: '30%',
        transform: 'translate(-25%, -50%)',
      }}
    >
      {opponentField.map((card, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: index * 0.1 }}
          className="w-[140px] h-[190px] rounded flex items-center justify-center"
        >
          {card && (
            <img
              src={card.image}
              alt={card.name}
              className="w-full h-full object-cover rounded"
            />
          )}
        </motion.div>
      ))}
    </div>
  );
}
