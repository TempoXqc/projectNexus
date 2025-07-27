import { memo, useMemo } from 'react';
import Modal from '@/components/Modal.tsx';

interface OpponentGraveyardProps {
  count: number;
  onClick: () => void;
  isOpen: boolean;
  onClose: () => void;
  graveyard: any[];
  hoveredCardId: string | null;
  setHoveredCardId: (id: string | null) => void;
  backcardImage?: string;
}

function OpponentGraveyard({
                             count,
                             onClick,
                             isOpen,
                             onClose,
                             graveyard,
                             setHoveredCardId,
                             backcardImage,
                           }: OpponentGraveyardProps) {
  const reversedGraveyard = useMemo(() => graveyard.slice().reverse(), [graveyard]);

  const lastCardImage = count > 0 ? graveyard[graveyard.length - 1]?.image.fr : backcardImage;

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
              src={lastCardImage}
              alt="Dernière carte du cimetière adverse"
              className="w-full h-full object-cover rounded shadow"
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

      <Modal isOpen={isOpen} onClose={onClose} onOutsideClick={onClose} title="Cimetière adverse" width="720px">
        <div className="flex flex-wrap gap-4 justify-center relative">
          {reversedGraveyard.length > 0 ? (
            reversedGraveyard.map((card) => (
              <div
                key={card.id}
                onMouseEnter={() => setHoveredCardId(card.id)}
                onMouseLeave={() => setHoveredCardId(null)}
                className="relative w-[100px] h-[140px] rounded"
              >
                <img
                  src={card.image.fr}
                  alt={card.name.fr}
                  className="w-full h-full object-cover rounded shadow"
                />
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

export default memo(OpponentGraveyard);