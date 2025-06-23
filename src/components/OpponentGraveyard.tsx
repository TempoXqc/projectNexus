import React from 'react';
import Modal from './Modal';
import { Card } from '../types/Card';

interface OpponentGraveyardProps {
  count: number;
  onClick: () => void;
  isOpen: boolean;
  onClose: () => void;
  graveyard: Card[];
  hoveredCardId: string | null;
  setHoveredCardId: (id: string | null) => void;
}

export default function OpponentGraveyard({
                                            count,
                                            onClick,
                                            isOpen,
                                            onClose,
                                            graveyard,
                                            hoveredCardId,
                                            setHoveredCardId,
                                          }: OpponentGraveyardProps) {
  return (
    <>
      <div
        className="flex flex-col items-center justify-center relative cursor-pointer border-4 border-gray-600 rounded-lg p-1 bg-black/40"
        style={{ width: '120px', height: '160px' }}
        onClick={onClick}
      >
        {count > 0 ? (
          <>
            <img
              src="/addons/nexus-back.jpg"
              alt="OpponentGraveyard"
              className="w-full h-full object-cover rounded shadow grayscale"
            />
            <span className="absolute inset-0 flex items-center justify-center text-white font-bold text-xl">
              {count}
            </span>
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white text-sm">
            Empty
          </div>
        )}
      </div>

      <Modal isOpen={isOpen} onClose={onClose} title="Cimetière adverse" width="720px">
        <div className="flex flex-wrap gap-4 justify-center relative">
          {graveyard.length > 0 ? (
            graveyard
              .slice()
              .reverse()
              .map((card) => (
                <div
                  key={card.id}
                  onMouseEnter={() => setHoveredCardId(card.id)}
                  onMouseLeave={() => setHoveredCardId(null)}
                  className="relative w-[100px] h-[140px] rounded"
                >
                  <img
                    src={card.image}
                    alt={card.name}
                    className="w-full h-full object-cover rounded shadow"
                  />
                  {hoveredCardId === card.id && (
                    <div className="absolute top-[-450px] left-1/2 transform -translate-x-1/2 z-50">
                      <div className="border-4 border-black rounded-lg shadow-2xl">
                        <img
                          src={card.image}
                          alt={card.name}
                          className="rounded shadow-2xl border-2 border-black"
                          style={{
                            maxWidth: '300px',
                            height: 'auto',
                            aspectRatio: '5 / 7',
                            objectFit: 'contain',
                            display: 'block',
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))
          ) : (
            <p className="text-center text-gray-500">Le cimetière adverse est vide.</p>
          )}
        </div>
      </Modal>
    </>
  );
}