import { memo, useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BadgeCheck, X, ZoomIn } from 'lucide-react';
import { Card } from '@tempoxqc/project-nexus-types';
import CardPreview from './CardPreview.tsx';

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
  const [previewCardId, setPreviewCardId] = useState<string | null>(null);
  const [isPreviewClicked, setIsPreviewClicked] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const zoomButtonsRef = useRef<HTMLButtonElement[]>([]);

  const togglePreview = (cardId: string) => {
    if (previewCardId === cardId && isPreviewClicked) {
      setPreviewCardId(null);
      setIsPreviewClicked(false);
    } else {
      setPreviewCardId(cardId);
      setIsPreviewClicked(true);
    }
  };

  const handleMouseEnter = (cardId: string) => {
    if (!isPreviewClicked) {
      setPreviewCardId(cardId);
    }
  };

  const handleMouseLeave = () => {
    if (!isPreviewClicked) {
      setPreviewCardId(null);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const isOutsidePreview =
        previewRef.current && !previewRef.current.contains(target);
      const isOutsideZoomButtons = !zoomButtonsRef.current.some((button) =>
        button.contains(target),
      );

      if (isOutsidePreview && isOutsideZoomButtons && isPreviewClicked) {
        setPreviewCardId(null);
        setIsPreviewClicked(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isPreviewClicked]);

  if (initialDraw.length === 0 || mulliganDone || !bothReady) {
    return null;
  }

  return (
    <motion.div
      className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-100 z-50"
    >
      <div className="bg-gray-800 p-6 rounded-lg shadow-2xl max-w-7xl w-full">
        <motion.h2
          className="text-white text-2xl font-bold mb-4 text-center"
        >
          Main de départ
        </motion.h2>
        <div className="grid grid-cols-5 gap-4">
          {initialDraw.map((card: Card, index) => {
            const isSelected = selectedForMulligan.includes(card.id);
            return (
              <motion.div
                key={card.id}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2, duration: 0.3 }}
                onClick={() => onToggleCardMulligan(card.id)}
                onMouseEnter={() => handleMouseEnter(card.id)}
                onMouseLeave={() => handleMouseLeave()}
                className={`relative w-full h-[323px] cursor-pointer rounded border-4 ${
                  isSelected ? 'border-red-500' : 'border-transparent'
                }`}
              >
                <div className="absolute top-2 right-2 z-10">
                  <button
                    ref={(el) => {
                      if (el) zoomButtonsRef.current[index] = el;
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePreview(card.id);
                    }}
                    className="p-2 bg-gray-800 rounded-full shadow-md hover:bg-gray-700 transition"
                    aria-label={`Voir les détails de ${card.name.fr}`}
                  >
                    <ZoomIn className="w-5 h-5 text-white" />
                  </button>
                </div>
                <img
                  src={card.image.fr}
                  alt={card.name.fr}
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
          className="mt-6 flex flex-col items-center gap-2"
        >
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onKeepInitialHand}
            className="flex items-center justify-center gap-2 w-full px-5 py-2 bg-green-600 text-white rounded-full hover:bg-green-700 shadow-md transition"
          >
            <BadgeCheck className="w-4 h-4" />
            <span className="text-md font-semibold">Je garde ma main</span>
          </motion.button>
          {selectedForMulligan.length > 0 && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onDoMulligan}
              className="flex items-center justify-center gap-2 w-full px-5 py-2 bg-red-600 text-white rounded-full hover:bg-red-700 shadow-md transition"
            >
              <X className="w-4 h-4" />
              <span className="text-md font-semibold">Mulligan ({selectedForMulligan.length})</span>
            </motion.button>
          )}
        </motion.div>
        {previewCardId && (
          <div ref={previewRef}>
            <CardPreview
              hoveredCardId={previewCardId}
              field={[]}
              hand={initialDraw}
              opponentField={[]}
            />
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default memo(InitialDrawModal);