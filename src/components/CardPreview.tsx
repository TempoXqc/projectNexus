// src/components/CardPreview.tsx
import React from 'react';
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
    <div
      className="fixed top-4 right-4 z-50"
      style={{
        width: '14%',
        height: '18%',
      }}
    >
      <div className="border-4 border-white rounded-lg shadow-2xl">
        <img
          src={card.image}
          alt={card.name}
          className="rounded shadow-2xl border-2 border-white w-full h-full object-cover"
        />
      </div>
    </div>
  );
}