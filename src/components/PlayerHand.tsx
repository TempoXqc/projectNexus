// src/components/PlayerHand.tsx
import React from 'react';
import { Card } from '../types/Card';
import { Play, Trash2, Plus } from 'lucide-react';

interface PlayerHandProps {
  hand: Card[];
  hoveredCardId: string | null;
  setHoveredCardId: (id: string | null) => void;
  isHandHovered: boolean;
  setIsHandHovered: (hovered: boolean) => void;
  mustDiscard: boolean;
  discardCardFromHand: (card: Card) => void;
  playCardToField: (card: Card) => void;
  addToDeck: (card: Card) => void;
}

export default function PlayerHand({
                                     hand,
                                     hoveredCardId,
                                     setHoveredCardId,
                                     isHandHovered,
                                     setIsHandHovered,
                                     discardCardFromHand,
                                     playCardToField,
                                     addToDeck,
                                   }: PlayerHandProps) {
  return (
    <div
      className="flex justify-center items-center gap-4 flex-1 z-2"
      onMouseEnter={() => setIsHandHovered(true)}
      onMouseLeave={() => setIsHandHovered(false)}
      style={{
        position: 'absolute',
        top: isHandHovered ? '88%' : '100%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        transition: 'top 0.3s ease-in-out',
        overflow: 'visible',
      }}
    >
      {hand.map((card) => (
        <div
          key={card.id}
          className="relative rounded shadow p-1 bg-black cursor-pointer transition-transform hover:scale-105"
          style={{ width: '140px', height: '190px' }}
          onMouseEnter={() => setHoveredCardId(card.id)}
          onMouseLeave={() => setHoveredCardId(null)}
        >
          <img
            src={card.image}
            alt={card.name}
            className="w-full h-full object-cover rounded"
          />
          {hoveredCardId === card.id && (
            <div
              className="absolute top-0 left-1/2 transform -translate-x-1/2 flex flex-col items-center pt-2 transition-all duration-300"
              style={{ top: '0', transform: 'translate(-50%, -100%)' }} // Déplace vers le haut
            >
              <div className="flex gap-2 mb-2">
                <button
                  onClick={() => playCardToField(card)}
                  className="bg-blue-500 text-white p-1 rounded-full hover:bg-blue-600"
                  title="Jouer sur le terrain"
                >
                  <Play size={16} />
                </button>
                <button
                  onClick={() => discardCardFromHand(card)}
                  className="bg-red-500 text-white p-1 rounded-full hover:bg-red-600"
                  title="Envoyer au cimetière"
                >
                  <Trash2 size={16} />
                </button>
                <button
                  onClick={() => addToDeck(card)}
                  className="bg-green-500 text-white p-1 rounded-full hover:bg-green-600"
                  title="Ajouter au deck"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}