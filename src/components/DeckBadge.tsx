import { JSX } from 'react';

interface DeckBadgeProps {
  deckId: string;
  player1DeckId: string[] | string | null;
  selectedDecks: string[];
  allRandomizers: { id: string }[];
  player2DeckIds: string[];
}

function DeckBadge({
                     deckId,
                     player1DeckId,
                     selectedDecks,
                     player2DeckIds,
                   }: DeckBadgeProps): JSX.Element | null {
  if (!player1DeckId || selectedDecks.length < 3) return null;

  const normalizedPlayer1DeckId = Array.isArray(player1DeckId)
    ? player1DeckId
    : typeof player1DeckId === 'string'
      ? player1DeckId.split(',')
      : [];
  const isPlayer1Deck = normalizedPlayer1DeckId.includes(deckId);
  const isPlayer2Deck = player2DeckIds.includes(deckId);
  const badgeText = isPlayer1Deck ? 'Joueur 1' : isPlayer2Deck ? 'Joueur 2' : null;
  const badgeColor = isPlayer1Deck ? 'bg-blue-500' : isPlayer2Deck ? 'bg-red-500' : '';

  if (!badgeText) return null;

  return (
    <div
      className={`absolute -top-3 left-1/2 transform -translate-x-1/2 ${badgeColor} text-white text-sm font-bold px-2 py-1 rounded-full z-10`}
    >
      {badgeText}
    </div>
  );
}

export default DeckBadge;