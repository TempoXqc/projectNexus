import { memo } from 'react';
import { motion } from 'framer-motion';
import { Card } from 'types/CardTypes.ts';

interface PlayerTokenZoneProps {
  tokenCount: number;
  tokenType: 'assassin' | 'engine' | 'viking' | null;
  onClick: () => void;
  isOpen: boolean;
  onClose: () => void;
  updateTokenCount: (value: number) => void;
  setHoveredTokenId: (id: string | null) => void;
  addAssassinTokenToOpponentDeck: () => void;
  placeAssassinTokenAtOpponentDeckBottom: () => void;
  gameId: string | undefined;
  playerId: number | null | undefined;
  opponentDeck: Card[];
}

function PlayerTokenZone({
                           tokenCount,
                           tokenType,
                           onClick,
                           isOpen,
                           onClose,
                           updateTokenCount,
                           setHoveredTokenId,
                           addAssassinTokenToOpponentDeck,
                           placeAssassinTokenAtOpponentDeckBottom,
                           gameId,
                           playerId,
                           opponentDeck,
                         }: PlayerTokenZoneProps) {
  const tokenImages: { [key: string]: string } = {
    assassin: '/addons/tokens/token_assassin.jpg',
    engine: '/addons/tokens/token_engine.jpg',
    viking: '/addons/tokens/token_rage.jpg',
  };

  const tokenName = tokenType ? tokenType.charAt(0).toUpperCase() + tokenType.slice(1) : 'Aucun';

  const increment = () => {
    if (gameId && playerId) {
      let max = 30;
      if (tokenType === 'assassin') {
        max = 8;
      }
      if (tokenCount < max) {
        updateTokenCount(tokenCount + 1);
      }
    }
  };

  const decrement = () => {
    if (gameId && playerId && tokenCount > 0) {
      updateTokenCount(tokenCount - 1);
    }
  };

  return (
    <>
      <div
        className="flex flex-col items-center justify-center relative cursor-pointer border-4 border-gray-600 rounded-lg p-1 bg-black/40"
        style={{ width: '120px', height: '160px' }}
        onClick={onClick}
      >
        {tokenType ? (
          <>
            <img
              src={tokenImages[tokenType]}
              alt={`Token ${tokenName}`}
              className="w-full h-full object-cover rounded shadow"
            />
            <span className="absolute inset-0 flex items-center justify-center text-white font-bold text-xl">
              {tokenCount}
            </span>
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white text-sm">
            Aucun Token
          </div>
        )}
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: isOpen ? 1 : 0 }}
        exit={{ opacity: 0 }}
        className={`fixed inset-0 flex items-center justify-center bg-black bg-opacity-80 z-50 ${
          isOpen ? '' : 'pointer-events-none'
        }`}
      >
        <div className="bg-gray-800 p-6 rounded-lg shadow-2xl max-w-md w-full">
          <motion.h2
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.3 }}
            className="text-white text-2xl font-bold mb-4 text-center"
          >
            Zone de Tokens
          </motion.h2>
          <div className="flex flex-col items-center gap-4">
            {tokenType ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2, duration: 0.3 }}
                className="relative w-[200px] h-[280px] rounded"
                onMouseEnter={() => setHoveredTokenId(`token_${tokenType}`)}
                onMouseLeave={() => setHoveredTokenId(null)}
              >
                <img
                  src={tokenImages[tokenType]}
                  alt={`Token ${tokenName}`}
                  className="w-full h-full object-cover rounded shadow"
                />
                <span className="absolute inset-0 flex items-center justify-center text-white font-bold text-4xl">
                  {tokenCount}
                </span>
              </motion.div>
            ) : (
              <p className="text-center text-gray-500">Aucun token disponible.</p>
            )}
            {tokenType && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.3 }}
                className="flex items-center gap-4"
              >
                <button
                  onClick={decrement}
                  className="bg-red-500 text-white p-2 rounded-full hover:bg-red-600 focus:outline-none disabled:opacity-50"
                  disabled={tokenCount <= 0 || !gameId || !playerId}
                  aria-label="Décrémenter le nombre de tokens"
                >
                  -
                </button>
                <span className="text-white text-xl font-bold">{tokenCount}</span>
                <button
                  onClick={increment}
                  className="bg-green-500 text-white p-2 rounded-full hover:bg-green-600 focus:outline-none disabled:opacity-50"
                  disabled={
                    (tokenType === 'assassin' && tokenCount >= 8) ||
                    tokenCount >= 30 ||
                    !gameId ||
                    !playerId
                  }
                  aria-label="Incrémenter le nombre de tokens"
                >
                  +
                </button>
              </motion.div>
            )}
            {tokenType === 'assassin' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.3 }}
                className="flex flex-col gap-2 w-full"
              >
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={addAssassinTokenToOpponentDeck}
                  className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                  disabled={tokenCount <= 0 || !gameId || !playerId}
                  aria-label="Ajouter un token assassin au deck adverse et mélanger"
                >
                  -1 et ajouter au deck adverse (mélanger)
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={placeAssassinTokenAtOpponentDeckBottom}
                  className="w-full px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
                  disabled={tokenCount <= 0 || !gameId || !playerId}
                  aria-label="Placer un token assassin en bas du deck adverse"
                >
                  -1 et placer en bas du deck adverse
                </motion.button>
              </motion.div>
            )}
            {opponentDeck.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.3 }}
                className="w-full mt-4"
              >
                <h3 className="text-white text-lg font-bold mb-2">Deck adverse :</h3>
                <ul className="text-white text-sm max-h-40 overflow-y-auto">
                  {opponentDeck.map((card, index) => (
                    <li key={card.id || `card_${index}`}>{card.name}</li>
                  ))}
                </ul>
              </motion.div>
            )}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onClose}
              className="mt-4 w-full px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              Fermer
            </motion.button>
          </div>
        </div>
      </motion.div>
    </>
  );
}

export default memo(PlayerTokenZone);