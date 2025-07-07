import { memo, useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card } from '@tempoxqc/project-nexus-types';

interface CardPreviewProps {
  hoveredCardId: string | null;
  field: (Card | null)[];
  hand: Card[];
  opponentField?: (Card | null)[];
  graveyard?: any[] | null;
  opponentGraveyard?: any[] | null;
  isGraveyardOpen?: boolean;
  isOpponentGraveyardOpen?: boolean;
  mulliganDone?: boolean;
}

function CardPreview({
                       hoveredCardId,
                       field,
                       hand,
                       opponentField,
                       graveyard,
                       opponentGraveyard,
                       isGraveyardOpen,
                       isOpponentGraveyardOpen,
                       mulliganDone,
                     }: CardPreviewProps) {
  const [lastHoveredCardId, setLastHoveredCardId] = useState<string | null>(null);
  const [isModalJustOpened, setIsModalJustOpened] = useState(false);

  useEffect(() => {

    if (hoveredCardId) {
      setLastHoveredCardId(hoveredCardId);
      setIsModalJustOpened(false);
    }

    else if (mulliganDone && hand.length > 0 && !lastHoveredCardId) {
      setLastHoveredCardId(hand[0].id);
    }

    else if ((isGraveyardOpen || isOpponentGraveyardOpen) && !isModalJustOpened) {
      if (isGraveyardOpen && graveyard && graveyard.length > 0) {
        setLastHoveredCardId(graveyard[graveyard.length - 1].id);
      } else if (isOpponentGraveyardOpen && opponentGraveyard && opponentGraveyard.length > 0) {
        setLastHoveredCardId(opponentGraveyard[opponentGraveyard.length - 1].id);
      }
      setIsModalJustOpened(true);
    }
  }, [hoveredCardId, mulliganDone, hand, isGraveyardOpen, isOpponentGraveyardOpen, graveyard, opponentGraveyard, lastHoveredCardId, isModalJustOpened]);

  const card = useMemo(() => {
    let foundCard: Card | null | undefined =
      field.find((c) => c?.id === lastHoveredCardId) ||
      hand.find((c) => c.id === lastHoveredCardId);
    if (!foundCard && opponentField) {
      foundCard = opponentField.find((c) => c?.id === lastHoveredCardId);
    }
    if (!foundCard && isGraveyardOpen && graveyard) {
      foundCard = graveyard.find((c: any) => c.id === lastHoveredCardId);
    }
    if (!foundCard && isOpponentGraveyardOpen && opponentGraveyard) {
      foundCard = opponentGraveyard.find((c: any) => c.id === lastHoveredCardId);
    }
    if (!foundCard && hand.length > 0 && !lastHoveredCardId) {
      foundCard = hand[0];
    }
    return foundCard;
  }, [lastHoveredCardId, field, hand, opponentField, graveyard, opponentGraveyard, isGraveyardOpen, isOpponentGraveyardOpen]);

  if (!card) return null;

  const isModalContext = isGraveyardOpen || isOpponentGraveyardOpen;

  return (
    <motion.div
      className="fixed"
      style={{
        zIndex: isModalContext ? 60 : 50,
        width: '20%',
        top: '21%',
        left: '1.1%',
      }}
      initial={{ x: '-100%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
    >
      <div className="border-4 border-gray-800 rounded-lg shadow-2xl">
        <img
          src={card.image}
          alt={card.name}
          className="rounded shadow-2xl border-2 border-gray-800 w-full h-full object-cover"
        />
      </div>
    </motion.div>
  );
}

export default memo(CardPreview);