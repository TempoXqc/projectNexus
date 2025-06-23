import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { BadgeCheck, X } from 'lucide-react';
import { Card } from '../types/Card';

interface InitialDrawModalProps {
  initialDraw: Card[];
  selectedForMulligan: string[];
  mulliganDone: boolean;
  bothReady: boolean;
  onToggleCardMulligan: (cardId: string) => void;
  onKeepInitialHand: () => void;
  onDoMulligan: () => void;
}

function InitialDrawModal({
                            initialDraw,
                            selectedForMulligan,
                            mulliganDone,
                            bothReady,
                            onToggleCardMulligan,
                            onKeepInitialHand,
                            onDoMulligan,
                          }: InitialDrawModalProps) {
  if (initialDraw.length === 0 || mulliganDone || !bothReady) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.3 }}
      className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-50"
    >
      <motion.h2
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.3 }}
        className="text-white text-4xl font-bold mb-6"
      >
        Main de départ
      </motion.h2>
      <div className="flex gap-4">
        {initialDraw.map((card: Card) => {
          const isSelected = selectedForMulligan.includes(card.id);
          return (
            <motion.div
              key={card.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.3 }}
              onClick={() => onToggleCardMulligan(card.id)}
              className={`relative w-[305px] h-[422px] cursor-pointer rounded border-4 ${
                isSelected ? 'border-red-500' : 'border-transparent'
              } hover:scale-105 transition-transform`}
            >
              <img
                src={card.image}
                alt={card.name}
                className="w-full h-full object-cover rounded"
              />
              {isSelected && (
                <div className="absolute top-1 left-1 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full shadow">
                  Mulligan
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.3 }}
        className="mt-6 flex gap-4"
      >
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onKeepInitialHand}
          className="flex items-center gap-2 px-5 py-2 bg-green-600 text-white rounded-full hover:bg-green-700 shadow-md hover:scale-105 transition"
        >
          <BadgeCheck className="w-4 h-4" /> Je garde ma main
        </motion.button>
        {selectedForMulligan.length > 0 && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onDoMulligan}
            className="flex items-center gap-2 px-5 py-2 bg-red-600 text-white rounded-full hover:bg-red-700 shadow-md hover:scale-105 transition"
          >
            <X className="w-4 h-4" /> Mulligan ({selectedForMulligan.length})
          </motion.button>
        )}
      </motion.div>
    </motion.div>
  );
}

export default memo(InitialDrawModal);