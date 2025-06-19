import React from 'react';
import Modal from './Modal';
import { Card } from '../types/Card';

interface GraveyardProps {
  count: number;
  onClick: () => void;
  isOpen: boolean;
  onClose: () => void;
  graveyard: Card[];
}

export default function PlayerGraveyard({
                                    count,
                                    onClick,
                                    isOpen,
                                    onClose,
                                    graveyard,
                                  }: GraveyardProps) {
  return (
    <>
      <div
        className="flex flex-col items-center justify-center relative cursor-pointer border-4 border-gray-600 rounded-lg p-1 bg-black/40"
        style={{ width: '120px', height: '180px' }}
        onClick={onClick}
      >
        {count > 0 ? (
          <>
            <img
              src="/addons/backcard.png"
              alt="PlayerGraveyard"
              className="w-full h-full object-cover rounded shadow grayscale"
            />
            <span className="absolute inset-0 flex items-center justify-center text-white font-bold text-[2rem]">
              {count}
            </span>
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white text-sm">
            Empty
          </div>
        )}
      </div>

      <Modal isOpen={isOpen} onClose={onClose} title="Cimetière" width="720px">
        <div className="flex flex-wrap gap-4 justify-center">
          {graveyard.length > 0 ? (
            graveyard
              .slice()
              .reverse()
              .map((card) => (
                <img
                  key={card.id}
                  src={card.image}
                  alt={card.name}
                  className="w-[100px] h-[140px] object-cover rounded shadow"
                />
              ))
          ) : (
            <p className="text-center text-gray-500">Le cimetière est vide.</p>
          )}
        </div>
      </Modal>
    </>
  );
}
