import React from 'react';
import { Card } from '../types/Card';

interface CardPreviewProps {
  card: Card | null;
  isVisible: boolean;
}

const CardPreview: React.FC<CardPreviewProps> = ({ card, isVisible }) => {
  if (!isVisible || !card) return null;

  return (
    <div className="absolute z-50 pointer-events-none">
      <img
        src={card.image}
        alt={card.name}
        className="w-[200px] h-[280px] object-cover rounded shadow-lg"
      />
    </div>
  );
};

export default CardPreview;