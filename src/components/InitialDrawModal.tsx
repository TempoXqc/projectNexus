import React from 'react';
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

export default function InitialDrawModal({
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
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-50">
      <h2 className="text-white text-10xl font-bold mb-6">Main de départ</h2>
      <div className="flex gap-4">
        {initialDraw.map((card: Card) => {
          const isSelected = selectedForMulligan.includes(card.id);
          return (
            <div
              key={card.id}
              onClick={() => onToggleCardMulligan(card.id)}
              className={`relative w-[305px] h-[422px] cursor-pointer rounded border-4 ${isSelected ? 'border-red-500' : 'border-transparent'} hover:scale-105 transition-transform`}
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
            </div>
          );
        })}
      </div>
      <div className="mt-6 flex gap-4">
        <button
          onClick={onKeepInitialHand}
          className="flex items-center gap-2 px-5 py-2 bg-green-600 text-white rounded-full hover:bg-green-700 shadow-md hover:scale-105 transition"
        >
          <BadgeCheck className="w-4 h-4" /> Je garde ma main
        </button>
        {selectedForMulligan.length > 0 && (
          <button
            onClick={onDoMulligan}
            className="flex items-center gap-2 px-5 py-2 bg-red-600 text-white rounded-full hover:bg-red-700 shadow-md hover:scale-105 transition"
          >
            <X className="w-4 h-4" /> Mulligan (
            {selectedForMulligan.length})
          </button>
        )}
      </div>
    </div>
  );
}