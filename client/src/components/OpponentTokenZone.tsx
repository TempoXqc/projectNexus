import { memo } from 'react';
import { motion } from 'framer-motion';

interface OpponentTokenZoneProps {
  tokenCount: number;
  tokenType: 'assassin' | 'engine' | 'viking' | null;
  onClick: () => void;
  isOpen: boolean;
  onClose: () => void;
}

function OpponentTokenZone({
                             tokenCount,
                             tokenType,
                             onClick,
                             isOpen,
                             onClose,
                           }: OpponentTokenZoneProps) {
  const tokenImages: { [key: string]: string } = {
    assassin: '/cards/tokens/token_assassin.jpg',
    engine: '/cards/tokens/token_engine.jpg',
    viking: '/cards/tokens/token_rage.jpg',
  };

  const tokenName = tokenType ? tokenType.charAt(0).toUpperCase() + tokenType.slice(1) : 'Aucun';

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
            Zone de Tokens Adverse
          </motion.h2>
          <div className="flex flex-col items-center gap-4">
            {tokenType ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2, duration: 0.3 }}
                className="relative w-[200px] h-[280px] rounded"
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
                  className="bg-red-500 text-white p-2 rounded-full opacity-50 cursor-not-allowed"
                  disabled
                  aria-label="Décrémenter le nombre de tokens (désactivé)"
                >
                  -
                </button>
                <span className="text-white text-xl font-bold">{tokenCount}</span>
                <button
                  className="bg-green-500 text-white p-2 rounded-full opacity-50 cursor-not-allowed"
                  disabled
                  aria-label="Incrémenter le nombre de tokens (désactivé)"
                >
                  +
                </button>
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

export default memo(OpponentTokenZone);