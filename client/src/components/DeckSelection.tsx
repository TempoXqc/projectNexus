import { memo, useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BadgeCheck, ZoomIn } from 'lucide-react';
import GetDeckBadge from './DeckBadge';
import DeckInfoPreview from './DeckInfoPreview';

interface DeckSelectionProps {
  randomizers: { id: string; name: string; image: string }[];
  selectedDecks: string[];
  player1DeckId: string | null;
  hasChosenDeck: boolean;
  isReady: boolean;
  opponentReady: boolean;
  onDeckChoice: (deckId: string) => void;
  onReadyClick: () => void;
  playerId: number | null | undefined;
  waitingForPlayer1: boolean;
}

function DeckSelection({
                         randomizers,
                         selectedDecks,
                         player1DeckId,
                         hasChosenDeck,
                         isReady,
                         opponentReady,
                         onDeckChoice,
                         onReadyClick,
                         playerId,
                         waitingForPlayer1,
                       }: DeckSelectionProps) {
  const [previewDeckId, setPreviewDeckId] = useState<string | null>(null);
  const [isPreviewClicked, setIsPreviewClicked] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const zoomButtonsRef = useRef<HTMLButtonElement[]>([]);
  const canChooseDeck = playerId === 1 || (playerId === 2 && !waitingForPlayer1 && player1DeckId);

  // Check if all decks are selected (Player 1: 1 deck, Player 2: 2 decks)
  const allDecksSelected =
    player1DeckId && selectedDecks.length === 3 && selectedDecks.includes(player1DeckId);

  // Check if Player 2 is currently selecting their decks
  const isPlayer2Selecting =
    playerId === 1 && hasChosenDeck && player1DeckId && selectedDecks.length < 3;

  const togglePreview = (deckId: string) => {
    if (previewDeckId === deckId && isPreviewClicked) {
      setPreviewDeckId(null);
      setIsPreviewClicked(false);
    } else {
      setPreviewDeckId(deckId);
      setIsPreviewClicked(true);
    }
  };

  const handleMouseEnter = (deckId: string) => {
    if (!isPreviewClicked) {
      setPreviewDeckId(deckId);
    }
  };

  const handleMouseLeave = () => {
    if (!isPreviewClicked) {
      setPreviewDeckId(null);
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
        setPreviewDeckId(null);
        setIsPreviewClicked(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isPreviewClicked]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-80 z-50"
    >
      <div className="bg-gray-800 p-6 rounded-lg shadow-2xl max-w-4xl w-full">
        <h2 className="text-white text-2xl font-bold mb-4 text-center">
          {allDecksSelected
            ? "Les decks sont sélectionnés, bonne partie !"
            : playerId === 1
              ? isPlayer2Selecting
                ? 'Joueur 1 : En attente du choix du joueur 2...'
                : 'Joueur 1 : Choisissez votre deck'
              : waitingForPlayer1
                ? 'Joueur 2 : En attente du choix du joueur 1...'
                : 'Joueur 2 : Sélectionnez vos deux decks'}
        </h2>
        <div className="grid grid-cols-4 gap-4">
          {randomizers.map((deckObj, index) => {
            const isSelected = selectedDecks.includes(deckObj.id);
            const isPlayer1Deck = player1DeckId === deckObj.id;
            const isPlayer2Selection = playerId === 2 && isSelected && !isPlayer1Deck;

            return (
              <motion.div
                key={deckObj.id}
                whileHover={{ scale: canChooseDeck ? 1.05 : 1 }}
                whileTap={{ scale: canChooseDeck ? 0.95 : 1 }}
                className={`relative p-4 rounded-lg ${
                  isPlayer1Deck
                    ? 'bg-blue-600'
                    : isPlayer2Selection
                      ? 'bg-red-600'
                      : isSelected
                        ? 'bg-blue-600'
                        : canChooseDeck && (playerId === 1 || deckObj.id !== player1DeckId)
                          ? 'bg-gray-700 hover:bg-gray-600 cursor-pointer'
                          : 'bg-gray-500 cursor-not-allowed'
                }`}
                onClick={() =>
                  canChooseDeck &&
                  (playerId === 1 || deckObj.id !== player1DeckId) &&
                  onDeckChoice(deckObj.id)
                }
                onMouseEnter={() => handleMouseEnter(deckObj.id)}
                onMouseLeave={() => handleMouseLeave()}
              >
                <div className="absolute top-2 right-2 z-10">
                  <button
                    ref={(el) => {
                      if (el) zoomButtonsRef.current[index] = el;
                    }}
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent triggering onDeckChoice
                      togglePreview(deckObj.id);
                    }}
                    className="p-2 bg-gray-800 rounded-full shadow-md hover:bg-gray-700 transition"
                    aria-label={`Voir les détails de ${deckObj.name}`}
                  >
                    <ZoomIn className="w-5 h-5 text-white" />
                  </button>
                </div>
                <img
                  src={deckObj.image}
                  alt={deckObj.name}
                  className="w-full h-64 object-cover rounded"
                />
                <p className="text-white text-center mt-2">{deckObj.name}</p>
                <GetDeckBadge
                  deckId={deckObj.id}
                  player1DeckId={player1DeckId}
                  selectedDecks={selectedDecks}
                  allRandomizers={randomizers}
                />
              </motion.div>
            );
          })}
        </div>
        {hasChosenDeck && (
          <div className="mt-4 flex flex-col items-center gap-2">
            <motion.button
              whileHover={{ scale: hasChosenDeck && !isReady ? 1.05 : 1 }}
              whileTap={{ scale: hasChosenDeck && !isReady ? 0.95 : 1 }}
              onClick={onReadyClick}
              className={`w-full px-4 py-2 rounded flex items-center justify-center gap-2 ${
                isReady
                  ? 'bg-gray-500 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700 cursor-pointer'
              } text-white`}
              disabled={isReady}
            >
              <span className="text-md font-semibold">
                {isReady ? 'En attente...' : 'Prêt'}
              </span>
              {!isReady && <BadgeCheck className="w-4 h-4" />}
            </motion.button>
            {isReady && (
              <p
                className={`text-sm font-medium text-center ${
                  opponentReady ? 'text-green-400' : 'text-yellow-300'
                }`}
              >
                {opponentReady
                  ? 'L’autre joueur est prêt !'
                  : 'L’autre joueur n’est pas encore prêt.'}
              </p>
            )}
          </div>
        )}
      </div>
      {previewDeckId && (
        <div ref={previewRef}>
          <DeckInfoPreview hoveredDeckId={previewDeckId} randomizers={randomizers} />
        </div>
      )}
    </motion.div>
  );
}

export default memo(DeckSelection);