import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { Card } from '../types/Card';

interface GraveyardModalProps {
  isOpen: boolean;
  onClose: () => void;
  graveyard: Card[];
}

export default function GraveyardModal({ isOpen, onClose, graveyard }: GraveyardModalProps) {
  const [hoveredGraveCardId, setHoveredGraveCardId] = useState<string | null>(null);
  const graveyardModalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (graveyardModalRef.current && !graveyardModalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center">
      <div
        ref={graveyardModalRef}
        className="bg-white p-6 rounded-lg shadow-2xl w-[80%] h-[80%] overflow-auto relative animate-fade-in"
      >
        <button
          className="absolute top-2 right-2 text-black hover:text-red-600"
          onClick={onClose}
        >
          <X />
        </button>

        <div className="flex flex-wrap gap-4 justify-center">
          {graveyard.map((card) => (
            <div
              key={card.id}
              onMouseEnter={() => setHoveredGraveCardId(card.id)}
              onMouseLeave={() => setHoveredGraveCardId(null)}
              className="relative"
            >
              <img
                src={card.image}
                alt={card.name}
                style={{ width: '140px', height: '190px' }}
                className="rounded shadow"
              />
              {hoveredGraveCardId === card.id && (
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-50">
                  <div className="border-4 border-white rounded-lg shadow-2xl">
                    <img
                      src={card.image}
                      alt={card.name}
                      style={{ width: '300px', height: '420px' }}
                      className="rounded"
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
