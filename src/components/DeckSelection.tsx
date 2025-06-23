import React, { memo } from 'react';
import { BadgeCheck } from 'lucide-react';
import GetDeckBadge from './DeckBadge';

interface DeckSelectionProps {
  randomizers: { id: string; name: string; image: string }[];
  selectedDecks: string[];
  player1DeckId: string | null;
  hasChosenDeck: boolean;
  isReady: boolean;
  opponentReady: boolean;
  onDeckChoice: (deckId: string) => void;
  onReadyClick: () => void;
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
                       }: DeckSelectionProps) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 bg-black/90 z-50">
      <h2 className="text-white text-10xl font-bold mb-4">Choix des decks</h2>
      <div className="flex gap-6">
        {randomizers.map((deckObj) => {
          const isSelected = selectedDecks.includes(deckObj.id);
          const borderColor = isSelected
            ? player1DeckId === deckObj.id
              ? 'border-blue-500'
              : 'border-red-500'
            : 'border-transparent';

          return (
            <div
              key={deckObj.id}
              onClick={() => onDeckChoice(deckObj.id)}
              className="w-[398px] h-[550px] relative cursor-pointer transition-transform hover:scale-105 rounded shadow-lg"
            >
              <div
                className={`w-full h-full border-4 ${borderColor} rounded ${
                  borderColor !== 'border-transparent' ? 'shadow-lg shadow-black/50' : ''
                }`}
              >
                <img
                  src={deckObj.image}
                  alt={deckObj.name}
                  className="w-full h-full object-cover rounded"
                />
              </div>
              <GetDeckBadge
                deckId={deckObj.id}
                player1DeckId={player1DeckId}
                selectedDecks={selectedDecks}
                allRandomizers={randomizers}
              />
            </div>
          );
        })}
      </div>
      {hasChosenDeck && (
        <div className="flex flex-col items-center gap-2 mt-6">
          <button
            onClick={onReadyClick}
            className="flex items-center gap-2 bg-gradient-to-r from-green-600 to-green-500 text-white px-6 py-3 rounded-full shadow-lg hover:scale-105 hover:shadow-xl transition transform duration-200"
          >
            <span className="text-md font-semibold">
              {isReady ? 'En attente de l’autre joueur…' : 'Ready'}
            </span>
            {!isReady && <BadgeCheck className="w-4 h-4" />}
          </button>
          {isReady && (
            <p
              className={`text-sm font-medium ${opponentReady ? 'text-green-400' : 'text-yellow-300'}`}
            >
              {opponentReady ? 'L’autre joueur est prêt !' : 'L’autre joueur n’est pas encore prêt.'}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default memo(DeckSelection);