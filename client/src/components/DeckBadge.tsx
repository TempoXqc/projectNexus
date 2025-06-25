import { JSX } from 'react';

interface DeckBadgeProps {
  deckId: string;
  player1DeckId: string | null;
  selectedDecks: string[];
  allRandomizers: { id: string }[];
}

function DeckBadge({
                     deckId,
                     player1DeckId,
                     selectedDecks,
                     allRandomizers,
                   }: DeckBadgeProps): JSX.Element | null {
  if (!player1DeckId || selectedDecks.length < 3) return null;

  const allDeckIds = allRandomizers.map((d) => d.id);
  const remainingDeck = allDeckIds.find((id) => !selectedDecks.includes(id));
  const p1Decks = [player1DeckId, remainingDeck].filter(Boolean) as string[];
  const isPlayer1 = p1Decks.includes(deckId);
  const badgeText = isPlayer1 ? 'Joueur 1' : 'Joueur 2';
  const badgeColor = isPlayer1 ? 'bg-blue-500' : 'bg-red-500';

  return (
    <div
      className={`absolute -top-3 left-1/2 transform -translate-x-1/2 ${badgeColor} text-white text-sm font-bold px-2 py-1 rounded-full z-10`}
    >
      {badgeText}
    </div>
  );
}

export default DeckBadge;