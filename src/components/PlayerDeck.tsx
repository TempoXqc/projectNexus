import React, { useState } from 'react';
import { RefreshCcw, CreditCard as CardIcon } from 'lucide-react';

interface PlayerDeckProps {
  count: number;
  drawCard: () => void;
  shuffleDeck: () => void;
  handCount: number;
}

export default function PlayerDeck({ count, drawCard, shuffleDeck }: PlayerDeckProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [showInput, setShowInput] = useState(false);
  const [lookCount, setLookCount] = useState('');

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setMenuPosition({ x: e.clientX, y: e.clientY });
    setIsMenuOpen(true);
    setShowInput(false); // Réinitialise l'input si ouvert
  };

  const handleClick = () => {
    setIsMenuOpen(false);
    setShowInput(false);
  };

  const handleMenuItemClick = (action: string) => {
    if (action === 'draw') {
      drawCard();
    } else if (action === 'shuffle') {
      shuffleDeck();
    } else if (action === 'look') {
      setShowInput(true); // Affiche l'input pour entrer X
      return; // Ne ferme pas le menu tant que l'input est actif
    }
    setIsMenuOpen(false);
  };

  const handleLookSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseInt(lookCount);
    if (!isNaN(num) && num > 0) {
      console.log(`Regarder les ${num} premières cartes du deck`);
      // Ajoutez ici la logique pour regarder X cartes, par exemple une fonction passée via props
    }
    setIsMenuOpen(false);
    setShowInput(false);
    setLookCount('');
  };

  return (
    <div
      className="flex flex-col items-center justify-center relative"
      style={{ width: '120px', height: '160px' }}
      onContextMenu={handleContextMenu}
      onClick={handleClick}
    >
      <div
        className="absolute top-0 left-1/2 transform -translate-x-1/2 flex gap-2 mt-2"
        style={{ top: '-40px' }}
      >
        <button
          onClick={drawCard}
          className="bg-blue-500 text-white p-1 rounded-full hover:bg-blue-600"
          title="Piocher une carte"
        >
          <CardIcon size={16} />
        </button>
        <button
          onClick={shuffleDeck}
          className="bg-green-500 text-white p-1 rounded-full hover:bg-green-600"
          title="Mélanger le deck"
        >
          <RefreshCcw size={16} />
        </button>
      </div>
      <img
        src="/addons/nexus-back.jpg"
        alt="Deck"
        className="w-full h-full object-cover rounded shadow"
      />
      <span className="absolute inset-0 flex items-center justify-center text-white font-bold text-xl">
        {count}
      </span>
      {isMenuOpen && (
        <div
          className="absolute bg-white border border-gray-300 shadow-lg rounded"
          style={{
            top: menuPosition.y,
            left: menuPosition.x,
            zIndex: 1000,
            minWidth: '200px',
          }}
        >
          <div
            className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
            onClick={() => handleMenuItemClick('draw')}
          >
            Piocher une carte
          </div>
          <div
            className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
            onClick={() => handleMenuItemClick('look')}
          >
            Regarder X cartes
          </div>
          {showInput && (
            <form onSubmit={handleLookSubmit} className="px-4 py-2">
              <input
                type="number"
                min="1"
                value={lookCount}
                onChange={(e) => setLookCount(e.target.value)}
                placeholder="Nombre de cartes"
                className="w-full p-1 border rounded"
                autoFocus
              />
              <button
                type="submit"
                className="mt-2 bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
              >
                Confirmer
              </button>
            </form>
          )}
          <div
            className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
            onClick={() => handleMenuItemClick('shuffle')}
          >
            Mélanger
          </div>
        </div>
      )}
    </div>
  );
}