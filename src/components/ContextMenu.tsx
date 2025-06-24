import React, { memo, useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';

interface ContextMenuProps {
  cardElement: HTMLElement | null; // Card element for positioning
  onClose: () => void;
}

function ContextMenu({ cardElement, onClose }: ContextMenuProps) {
  const [isSubMenuOpen, setIsSubMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Calculate position based on card element
  let x = 0;
  let y = 0;
  if (cardElement) {
    const rect = cardElement.getBoundingClientRect();
    x = rect.right + 8; // Right edge of card + 8px offset
    y = rect.top; // Top edge of card
  }

  // Boundary check to keep menu within viewport
  const menuWidth = 200; // Approximate menu width
  const menuHeight = 150; // Approximate menu height
  const adjustedX = Math.min(x, window.innerWidth - menuWidth);
  const adjustedY = Math.min(y, window.innerHeight - menuHeight);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        console.log('Closing context menu due to outside click');
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClick);
    document.addEventListener('contextmenu', handleClick);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('contextmenu', handleClick);
    };
  }, [onClose]);

  return (
    <motion.div
      ref={menuRef}
      className="absolute bg-gray-800 rounded-lg shadow-lg p-2 z-[1000]"
      style={{ top: adjustedY, left: adjustedX }}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.2 }}
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
          <div className="absolute left-full top-0 bg-gray-800 rounded-lg shadow-lg p-2 ml-1">
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

export default memo(ContextMenu);