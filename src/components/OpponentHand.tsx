import { memo } from 'react';
import { motion } from 'framer-motion';
import { Card } from '@tempoxqc/project-nexus-types';

interface OpponentHandProps {
  opponentHand: Card[];
}

function OpponentHand({ opponentHand }: OpponentHandProps) {
  return (
    <div
      className="flex justify-center gap-4"
      style={{
        position: 'absolute',
        top: '-5%',
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
          style={{ width: '175px', height: '240px', position: 'relative', margin: '-2%' }}
        >
          <img
            src="/cards/backcard.png"
            alt="Opponent card"
            className="w-full h-full object-cover rounded"
          />
        </motion.div>
      ))}
    </div>
  );
}

export default memo(OpponentHand);