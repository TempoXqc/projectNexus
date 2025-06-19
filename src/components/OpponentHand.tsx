// src/components/OpponentHand.tsx
import React from 'react';
import { motion } from 'framer-motion';

export default function OpponentHand({ opponentHand }: { opponentHand: number[] }) {
  return (
    <div
      className="flex justify-center gap-4"
      style={{
        position: 'absolute',
        top: '0%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        transition: 'top 0.3s ease-in-out',
      }}
    >
      {opponentHand.map((_, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: index * 0.05 }}
          className="w-[140px] h-[190px] rounded shadow bg-white"
        >
          <img
            src="/addons/backcard.png"
            alt="Opponent card"
            className="w-full h-full object-cover rounded"
          />
        </motion.div>
      ))}
    </div>
  );
}
