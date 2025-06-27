import { memo, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';

interface DeckInfoPreviewProps {
  hoveredDeckId: string | null;
  randomizers: {
    id: string;
    name: string;
    image: string;
    infoImage: string;
  }[];
}

function DeckInfoPreview({ hoveredDeckId, randomizers }: DeckInfoPreviewProps) {
  const deck = useMemo(() => {
    const match = randomizers.find((deck) => deck.id === hoveredDeckId);
    console.log('[DEBUG] hoveredDeckId:', hoveredDeckId);
    console.log('[DEBUG] Matching deck:', match);
    return match;
  }, [hoveredDeckId, randomizers]);

  useEffect(() => {
    if (!deck) {
      console.log('[DEBUG] Aucun deck trouvé pour hoveredDeckId:', hoveredDeckId);
    } else if (!deck.infoImage) {
      console.log('[DEBUG] Le deck existe mais pas de infoImage:', deck);
    } else {
      console.log('[DEBUG] Affichage de l’image info pour le deck:', deck.name, '->', deck.infoImage);
    }
  }, [deck, hoveredDeckId]);

  if (!deck || !deck.infoImage) return null;

  return (
    <motion.div
      className="fixed z-50"
      style={{
        width: '20%',
        height: '80vh',
        top: '10%',
        left: '5%',
      }}
      initial={{ x: '-100%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '-100%', opacity: 0 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
    >
      <div className="border-1 border-white rounded-lg shadow-2xl w-full h-full">
        <img
          src={deck.infoImage}
          alt={`${deck.name} Info`}
          className="rounded shadow-2xl border-2 border-white w-full h-full object-cover"
        />
      </div>
    </motion.div>
  );
}

export default memo(DeckInfoPreview);
