import React, { memo, useMemo, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Card } from '@tempoxqc/project-nexus-types';
import { RotateCcw, Sword, Trash2 } from 'lucide-react';
import ContextMenu from './ContextMenu.tsx';

interface PlayerFieldProps {
  field: (Card | null)[];
  hoveredCardId: string | null;
  setHoveredCardId: (id: string | null) => void;
  removeCardFromField: (index: number) => void;
  exhaustCard: (index: number) => void;
  attackCard: (index: number) => void;
}

function PlayerField({
                       field,
                       hoveredCardId,
                       setHoveredCardId,
                       removeCardFromField,
                       exhaustCard,
                       attackCard,
                     }: PlayerFieldProps) {
  const [contextMenu, setContextMenu] = useState<{
    cardElement: HTMLElement | null;
  } | null>(null);
  const cardRefs = useRef<Map<string, HTMLElement>>(new Map());

  const visibleCards = useMemo(
    () =>
      field
        .map((card, index) => ({ card, index }))
        .filter(({ card }) => card !== null) as { card: Card; index: number }[],
    [field],
  );

  const handleContextMenu = (event: React.MouseEvent, cardId: string) => {
    event.preventDefault();
    event.stopPropagation();
    const cardElement = cardRefs.current.get(cardId) || null;
    setContextMenu({ cardElement });
  };

  const closeContextMenu = () => {
    setContextMenu(null);
  };

  return (
    <div
      className="relative z-40"
      style={{
        position: 'absolute',
        top: '55%',
        left: '50%',
        transform: 'translateX(-50%)',
        height: '11.11vw',
        maxHeight: '213.33px',
        overflow: 'visible',
        width: '55vw',
        maxWidth: '1600px',
      }}
    >
      {visibleCards.map(({ card, index }, visibleIndex) => (
        <motion.div
          key={`${card.id}-${card.exhausted}`}
          ref={(el) => {
            if (el) cardRefs.current.set(card.id, el);
            else cardRefs.current.delete(card.id);
          }}
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{
            opacity: 1,
            scale: 1,
            y: 0,
            rotate: card.exhausted ? 90 : 0,
          }}
          transition={{ duration: 0.3 }}
          className="absolute bg-white shadow rounded"
          style={{
            width: '5.99vw',
            maxWidth: '153.33px',
            height: '8.33vw',
            maxHeight: '213.33px',
            left: `calc(50% + ${(visibleIndex - visibleCards.length / 2) * 6.25}vw)`,
            transformOrigin: 'center center',
            cursor: 'pointer',
          }}
          onMouseEnter={() => {
            setHoveredCardId(card.id);
          }}
          onMouseLeave={() => {
            setHoveredCardId(null);
          }}
          onContextMenu={(event) => handleContextMenu(event, card.id)}
        >
          <img
            src={card.image.fr}
            alt={card.name.fr}
            className="w-full h-full object-cover rounded"
          />
          {card.stealthed && (
            <span className="absolute top-2 left-2 bg-green-500 text-white text-xs rounded px-1">Furtif</span>
          )}
          {card.keywords && card.keywords.length > 0 && (
            <span className="absolute top-2 right-2 bg-blue-500 text-white text-xs rounded px-1">{card.keywords.join(', ')}</span>
          )}
          <div
            className="absolute top-0 left-1/2 transform -translate-x-1/2 flex flex-col items-center pt-2 transition-all duration-300"
            style={{
              top: '10px',
              left: '50%',
              transform: 'translate(-50%, 0)',
              pointerEvents: 'auto',
              opacity: card.id === hoveredCardId ? 1 : 0,
              zIndex: 50,
            }}
          >
            <div className="flex gap-2 bg-gray-800 bg-opacity-90 p-1 rounded-lg shadow-lg">
              <button
                onClick={(event) => {
                  event.stopPropagation();
                  attackCard(index);
                }}
                className="bg-red-500 text-white p-1 rounded-full hover:bg-red-600 focus:outline-none group relative"
                title=""
                aria-label="Attack with card"
              >
                <Sword size={16} />
                <span className="absolute top-[-35px] left-1/2 transform -translate-x-1/2 hidden group-hover:block bg-gray-900 text-white text-xs rounded py-1 px-2 shadow-md whitespace-nowrap">
                  Attaquer
                </span>
              </button>
              <button
                onClick={(event) => {
                  event.stopPropagation();
                  removeCardFromField(index);
                }}
                className="bg-red-500 text-white p-1 rounded-full hover:bg-red-600 focus:outline-none group relative"
                title=""
                aria-label="Remove card from field"
              >
                <Trash2 size={16} />
                <span className="absolute top-[-35px] left-1/2 transform -translate-x-1/2 hidden group-hover:block bg-gray-900 text-white text-xs rounded py-1 px-2 shadow-md whitespace-nowrap">
                  Retirer du terrain
                </span>
              </button>
              <button
                onClick={(event) => {
                  event.stopPropagation();
                  exhaustCard(index);
                }}
                className="bg-yellow-500 text-white p-1 rounded-full hover:bg-yellow-600 focus:outline-none group relative"
                title=""
                aria-label="Exhaust card"
              >
                <RotateCcw size={16} />
                <span className="absolute top-[-35px] left-1/2 transform -translate-x-1/2 hidden group-hover:block bg-gray-900 text-white text-xs rounded py-1 px-2 shadow-md whitespace-nowrap">
                  Épuiser la carte
                </span>
              </button>
            </div>
          </div>
        </motion.div>
      ))}
      {contextMenu && (
        <ContextMenu cardElement={contextMenu.cardElement} onClose={closeContextMenu} />
      )}
    </div>
  );
}

export default memo(PlayerField);