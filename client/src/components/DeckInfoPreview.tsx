import { memo, useMemo } from 'react';
import { motion } from 'framer-motion';

interface DeckInfoPreviewProps {
  hoveredDeckId: string | null;
  randomizers: { id: string; name: string; image: string }[];
}

function DeckInfoPreview({ hoveredDeckId, randomizers }: DeckInfoPreviewProps) {
  const deckInfoImages: { [key: string]: string } = {
    assassin: '/addons/randomizers-info/Assassin-info.jpg',
    celestial: '/addons/randomizers-info/Celestial-info.jpg',
    dragon: '/addons/randomizers-info/Dragon-info.jpg',
    wizard: '/addons/randomizers-info/Wizard-info.jpg',
    vampire: '/addons/randomizers-info/Vampire-info.jpg',
    viking: '/addons/randomizers-info/Viking-info.jpg',
    engine: '/addons/randomizers-info/Engine-info.jpg',
    samurai: '/addons/randomizers-info/Samurai-info.jpg',
  };

  const deck = useMemo(() => {
    return randomizers.find((deck) => deck.id === hoveredDeckId);
  }, [hoveredDeckId, randomizers]);

  if (!deck || !deckInfoImages[deck.id]) return null;

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
          src={deckInfoImages[deck.id]}
          alt={`${deck.name} Info`}
          className="rounded shadow-2xl border-2 border-white w-full h-full object-cover"
        />
      </div>
    </motion.div>
  );
}

export default memo(DeckInfoPreview);