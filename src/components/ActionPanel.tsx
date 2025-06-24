import React, { memo, useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';

interface ActionPanelProps {
  cardId: string;
  onClose: () => void;
}

function ActionPanel({ onClose }: ActionPanelProps) {
  const [isSubMenuOpen, setIsSubMenuOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  return (
    <motion.div
      ref={panelRef}
      className="fixed z-[200] bg-gray-800 rounded-lg shadow-lg p-4 w-[300px]"
      style={{
        top: '20%',
        left: '5%',
        height: 'auto',
        maxHeight: '60vh',
        overflowY: 'auto',
      }}
      initial={{ x: '-100%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '-100%', opacity: 0 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
    >
      <div
        className="relative"
        onMouseEnter={() => setIsSubMenuOpen(true)}
        onMouseLeave={() => setIsSubMenuOpen(false)}
      >
        <button
          className="w-full text-left text-white px-4 py-2 rounded hover:bg-gray-700 transition flex items-center justify-between"
          aria-label="Assassin category"
        >
          Assassin
          <ChevronRight className="w-5 h-5 text-white" />
        </button>
        {isSubMenuOpen && (
          <div className="mt-2 bg-gray-800 rounded-lg shadow-lg p-2">
            <button
              className="w-full text-left text-white px-4 py-2 rounded hover:bg-gray-700 transition"
              aria-label="Place card under opponent's deck"
            >
              Placer cette carte en dessous du deck de l'adversaire
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default memo(ActionPanel);