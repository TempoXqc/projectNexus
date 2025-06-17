import React, { useEffect, useState, useRef } from 'react';
import { RefreshCcw, X } from 'lucide-react';
import { motion } from 'framer-motion';

interface Card {
  id: string;
  name: string;
  image: string;
}

function getRandomHand(deck: Card[], count: number): Card[] {
  const shuffled = [...deck].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

export function OpponentField({ opponentField }: { opponentField: (Card | null)[] }) {
  return (
    <div
      className="flex justify-center items-center gap-2"
      style={{
        position: 'absolute',
        top: '35%',
        left: '30%',
        transform: 'translate(-25%, -50%)'
      }}
    >
      {opponentField.map((card, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: index * 0.1 }}
          className="w-[140px] h-[190px] rounded bg-gray-800 flex items-center justify-center"
        >
          {card && (
            <img
              src={card.image}
              alt={card.name}
              className="w-full h-full object-cover rounded"
            />
          )}
        </motion.div>
      ))}
    </div>
  );
}

// OpponentHand.tsx
export function OpponentHand({ opponentHand }: { opponentHand: number[] }) {
  return (
    <div
      className="flex justify-center gap-4"
      style={{
        position: 'absolute',
        top: '0%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        transition: 'top 0.3s ease-in-out'
      }}
    >
      {opponentHand.map((_, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: index * 0.05 }}
          className="w-[140px] h-[190px] rounded shadow bg-white"
        >
          <img
            src="/src/assets/addons/backcard.png"
            alt="Opponent card"
            className="w-full h-full object-cover rounded"
          />
        </motion.div>
      ))}
    </div>
  );
}

export default function NexusGame() {
  const [hand, setHand] = useState<Card[]>([]);
  const [deck, setDeck] = useState<Card[]>([]);
  const [opponentHand] = useState<number[]>(Array(5).fill(0));
  const [opponentField] = useState<(Card | null)[]>(Array(8).fill(null));
  const [graveyard, setGraveyard] = useState<Card[]>([]);
  const [field, setField] = useState<(Card | null)[]>(Array(8).fill(null));
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);
  const [isGraveyardOpen, setIsGraveyardOpen] = useState(false);
  const [hoveredGraveCardId, setHoveredGraveCardId] = useState<string | null>(null);
  const [isHandHovered, setIsHandHovered] = useState(false);
  const graveyardModalRef = useRef<HTMLDivElement>(null);
  const [turn, setTurn] = useState(1);
  const [hasPlayedCard, setHasPlayedCard] = useState(false);
  const [mustDiscard, setMustDiscard] = useState(false);

  const drawNewHand = () => {
    setDeck((prevDeck) => {
      if (prevDeck.length < 5) return prevDeck;
      const drawn = getRandomHand(prevDeck, 5);
      setHand(drawn);
      return prevDeck.filter((card) => !drawn.some((d) => d.id === card.id));
    });
  };

  const removeCardFromField = (index: number) => {
    setField((prevField) => {
      const newField = [...prevField];
      const removedCard = newField[index];
      newField[index] = null;

      const compacted = newField.filter((c): c is Card => c !== null);
      while (compacted.length < newField.length) {
        // @ts-ignore
        compacted.push(null);
      }

      if (removedCard) {
        setGraveyard((prev) => {
          if (!prev.some((c) => c.id === removedCard.id)) {
            return [...prev, removedCard];
          }
          return prev;
        });
      }

      return compacted;
    });
  };

  const playCardToField = (card: Card) => {
    if (hasPlayedCard || mustDiscard) return;
    const updatedField = [...field];
    const emptyIndex = updatedField.findIndex((slot) => slot === null);
    if (emptyIndex !== -1) {
      updatedField[emptyIndex] = card;
      setField(updatedField);
      setHand((prevHand) => prevHand.filter((c) => c.id !== card.id));
      setHasPlayedCard(true);
    }
  };

  const discardCardFromHand = (card: Card) => {
    if (!mustDiscard) return;
    setHand((prev) => prev.filter((c) => c.id !== card.id));
    setGraveyard((prev) => [...prev, card]);
    setMustDiscard(false);
  };

  const passTurn = () => {
    if (mustDiscard) return;

    if (deck.length > 0) {
      const [newCard, ...rest] = deck;
      if (hand.length >= 10) {
        setHand((prev) => [...prev, newCard]);
        setMustDiscard(true);
      } else {
        setHand((prev) => [...prev, newCard]);
      }
      setDeck(rest);
    }

    setHasPlayedCard(false);
    setTurn((prev) => prev + 1);
  };


  useEffect(() => {
    fetch('/cards.json')
      .then((res) => res.json())
      .then((allCards: Card[]) => {
        const drawn = getRandomHand(allCards, 5);
        setHand(drawn);
        setDeck(allCards.filter((card) => !drawn.some((d) => d.id === card.id)));
      })
      .catch((err) => console.error('Failed to load cards:', err));
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (graveyardModalRef.current && !graveyardModalRef.current.contains(event.target as Node)) {
        setIsGraveyardOpen(false);
      }
    };
    if (isGraveyardOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isGraveyardOpen]);

  return (
    <div className="w-full min-h-screen flex" style={{ margin: 0 }}>
      {/* Left Section (Game Area) */}
      <div
        className="w-[85%] min-h-screen flex flex-col justify-end items-center p-4 relative"
        style={{
          backgroundImage: 'url(/src/assets/addons/background.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        <OpponentField opponentField={opponentField} />
        <OpponentHand opponentHand={opponentHand} />

        {/* Field */}
        <div
          className="relative"
          style={{
            position: 'absolute',
            top: '70%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            height: '190px'
          }}
        >
          {field
            .map((card, index) => ({ card, index }))
            .filter(({ card }) => card !== null)
            .map(({ card }, visibleIndex) => (
              <motion.div
                key={card!.id}
                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                onClick={() => removeCardFromField(field.indexOf(card))}
                className="absolute w-[140px] h-[190px] bg-white shadow rounded"
                style={{
                  left: `calc(50% + ${visibleIndex * 160 - ((field.filter(c => c !== null).length - 1) * 160) / 2}px)`,
                  transform: 'translateX(-50%)',
                  cursor: 'pointer'
                }}
                onMouseEnter={() => setHoveredCardId(card!.id)}
                onMouseLeave={() => setHoveredCardId(null)}
              >
                <img
                  src={card!.image}
                  alt={card!.name}
                  className="w-full h-full object-cover rounded"
                />
                {hoveredCardId === card!.id && (
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-50">
                    <div className="border-4 border-white rounded-lg shadow-2xl">
                      <img
                        src={card!.image}
                        alt={card!.name}
                        style={{ width: '300px', height: '420px' }}
                        className="rounded"
                      />
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
        </div>

        <div className="flex items-end w-full h-full">
          {/* Deck & Graveyard */}
          <div className="flex gap-4">
            <div className="flex flex-col items-center justify-center relative" style={{ width: '120px', height: '180px' }}>
              {deck.length > 0 && (
                <>
                  <img
                    src="/src/assets/addons/backcard.png"
                    alt="Deck"
                    className="w-full h-full object-cover rounded shadow"
                  />
                  <span className="absolute inset-0 flex items-center justify-center text-white font-bold text-[2rem]">
                    {deck.length}
                  </span>
                </>
              )}
            </div>

            <div
              className="flex flex-col items-center justify-center relative cursor-pointer"
              style={{ width: '120px', height: '180px' }}
              onClick={() => setIsGraveyardOpen(true)}
            >
              {graveyard.length > 0 && (
                <>
                  <img
                    src="/src/assets/addons/backcard.png"
                    alt="Graveyard"
                    className="w-full h-full object-cover rounded shadow grayscale"
                  />
                  <span className="absolute inset-0 flex items-center justify-center text-white font-bold text-[2rem]">
                    {graveyard.length}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Hand */}
          <div
            className="flex justify-center items-center gap-4 flex-1"
            onMouseEnter={() => setIsHandHovered(true)}
            onMouseLeave={() => setIsHandHovered(false)}
            style={{
              position: 'absolute',
              top: isHandHovered ? '88%' : '100%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              transition: 'top 0.3s ease-in-out'
            }}
          >
            {hand.map((card) => (
              <div
                key={card.id}
                onClick={() => mustDiscard ? discardCardFromHand(card) : playCardToField(card)}
                onMouseEnter={() => setHoveredCardId(card.id)}
                onMouseLeave={() => setHoveredCardId(null)}
                className="relative rounded border shadow p-2 bg-white cursor-pointer transition-transform hover:scale-105"
                style={{ width: '140px', height: '190px' }}
              >
                <img
                  src={card.image}
                  alt={card.name}
                  className="w-full h-full object-cover rounded"
                />
                {hoveredCardId === card.id && (
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-50">
                    <div className="border-4 border-white rounded-lg shadow-2xl">
                      <img
                        src={card.image}
                        alt={card.name}
                        style={{ width: '300px', height: '420px' }}
                        className="rounded"
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Graveyard Modal */}
      {isGraveyardOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center">
          <div
            ref={graveyardModalRef}
            className="bg-white p-6 rounded-lg shadow-2xl w-[80%] h-[80%] overflow-auto relative animate-fade-in"
          >
            <button
              className="absolute top-2 right-2 text-black hover:text-red-600"
              onClick={() => setIsGraveyardOpen(false)}
            >
              <X />
            </button>
            <div className="flex flex-wrap gap-4 justify-center">
              {graveyard.map((card) => (
                <div
                  key={card.id}
                  onMouseEnter={() => setHoveredGraveCardId(card.id)}
                  onMouseLeave={() => setHoveredGraveCardId(null)}
                  className="relative"
                >
                  <img
                    src={card.image}
                    alt={card.name}
                    style={{ width: '140px', height: '190px' }}
                    className="rounded shadow"
                  />
                  {hoveredGraveCardId === card.id && (
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-50">
                      <div className="border-4 border-white rounded-lg shadow-2xl">
                        <img
                          src={card.image}
                          alt={card.name}
                          style={{ width: '300px', height: '420px' }}
                          className="rounded"
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Right Section */}
      <div className="w-[15%] min-h-screen flex flex-col items-center justify-start pt-8 gap-4" style={{ backgroundColor: 'black' }}>
        {hand.length === 0 && deck.length >= 5 && (
          <button
            onClick={drawNewHand}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            <RefreshCcw className="w-5 h-5" /> Nouvelle main
          </button>
        )}

        <p className="text-white font-bold">Tour {turn}</p>

        <button
          onClick={passTurn}
          disabled={mustDiscard}
          className={`flex items-center gap-2 px-4 py-2 rounded text-white w-[90%] ${
            mustDiscard ? 'bg-red-600' :
              hasPlayedCard ? 'bg-green-600' :
                'bg-gray-500 cursor-not-allowed'
          }`}
        >
          {mustDiscard ? 'Défaussez une carte' : 'Passer mon tour'}
        </button>
      </div>
    </div>
  );
}