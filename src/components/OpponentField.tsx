import React from 'react';
import { Card } from './types';

interface OpponentFieldProps {
  opponentField: (Card | null)[];
}

const OpponentField: React.FC<OpponentFieldProps> = ({ opponentField }) => {
  return (
    <div className="flex justify-center items-center gap-2 mt-4">
      {opponentField.map((card, index) => (
        <div
          key={index}
          className="w-[140px] h-[190px] border-2 border-white rounded bg-gray-800 flex items-center justify-center"
        >
          {card && (
            <img
              src={card.image}
              alt={card.name}
              className="w-full h-full object-cover rounded"
            />
          )}
        </div>
      ))}
    </div>
  );
};

export default OpponentField;
