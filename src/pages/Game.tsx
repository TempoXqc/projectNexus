import React, { useEffect, useState, useRef } from 'react';
import { RefreshCcw, X, Send } from 'lucide-react';
import { motion } from 'framer-motion';
import io from 'socket.io-client';

interface Card {
  id: string;
  name: string;
  image: string;
}

const socket = io('http://localhost:3000'); // URL du serveur

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
            src="/addons/backcard.png"
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
  const [opponentHand, setOpponentHand] = useState<number[]>(Array(5).fill(0));
  const [opponentField, setOpponentField] = useState<(Card | null)[]>(Array(8).fill(null));
  const [graveyard, setGraveyard] = useState<Card[]>([]);
  const [field, setField] = useState<(Card | null)[]>(Array(8).fill(null));
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);
  const [isGraveyardOpen, setIsGraveyardOpen] = useState(false);
  const [hoveredGraveCardId, setHoveredGraveCardId] = useState<string | null>(null);
  const [isHandHovered, setIsHandHovered] = useState(false);
  const [turn, setTurn] = useState(1);
  const [hasPlayedCard, setHasPlayedCard] = useState(false);
  const [mustDiscard, setMustDiscard] = useState(false);
  const [gameId, setGameId] = useState<string | null>(null);
  const [playerId, setPlayerId] = useState<number | null>(null);
  const [chatMessages, setChatMessages] = useState<{ playerId: number, message: string }[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [gameIdInput, setGameIdInput] = useState('');
  const graveyardModalRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const joinGame = () => {
    if (gameIdInput.trim()) {
      setGameId(gameIdInput);
      socket.emit('joinGame', gameIdInput);
    }
  };

  const createGame = () => {
    const newGameId = Math.random().toString(36).substring(2, 10);
    setGameId(newGameId);
    socket.emit('joinGame', newGameId);
  };

  const drawNewHand = () => {
    setDeck((prevDeck) => {
      if (prevDeck.length < 5) return prevDeck;
      const drawn = getRandomHand(prevDeck, 5);
      setHand(drawn);
      socket.emit('updateGameState', { gameId, state: { hand: drawn, deck: prevDeck.filter((card) => !drawn.some((d) => d.id === card.id)) } });
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
        socket.emit('updateGameState', {
          gameId,
          state: { field: compacted, graveyard: [...graveyard, removedCard] },
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
      socket.emit('playCard', { gameId, card, fieldIndex: emptyIndex });
    }
  };

  const discardCardFromHand = (card: Card) => {
    if (!mustDiscard) return;
    setHand((prev) => prev.filter((c) => c.id !== card.id));
    setGraveyard((prev) => [...prev, card]);
    setMustDiscard(false);
    socket.emit('updateGameState', { gameId, state: { hand, graveyard: [...graveyard, card], mustDiscard: false } });
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
      socket.emit('updateGameState', { gameId, state: { hand, deck: rest, mustDiscard } });
    }
    setHasPlayedCard(false);
    setTurn((prev) => prev + 1);
    socket.emit('passTurn', { gameId });
  };

  const sendChatMessage = () => {
    if (chatInput.trim() && gameId) {
      socket.emit('sendMessage', { gameId, message: chatInput });
      setChatInput('');
    }
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

    socket.on('gameStart', ({ chatHistory }) => {
      console.log('Game started, socketId:', socket.id, 'chatHistory:', chatHistory);
      setPlayerId(1); // Simplifier pour le moment
      setChatMessages(chatHistory || []);
    });

    socket.on('updateGameState', (state) => {
      console.log('Game state updated:', state);
      setHand(state[playerId === 1 ? 'player1' : 'player2'].hand);
      setField(state[playerId === 1 ? 'player1' : 'player2'].field);
      setGraveyard(state[playerId === 1 ? 'player1' : 'player2'].graveyard);
      setDeck(state[playerId === 1 ? 'player1' : 'player2'].deck);
      setOpponentHand(state[playerId === 1 ? 'player2' : 'player1'].hand.length);
      setOpponentField(state[playerId === 1 ? 'player2' : 'player1'].field);
      setTurn(state.turn);
      setHasPlayedCard(state.activePlayer !== socket.id);
    });

    socket.on('chatMessage', (chatMessage) => {
      console.log('Chat message received:', chatMessage);
      setChatMessages((prev) => [...prev, chatMessage]);
    });

    socket.on('opponentDisconnected', () => {
      alert('Votre adversaire s\'est déconnecté.');
      setGameId(null);
      setPlayerId(null);
    });

    socket.on('error', (message) => {
      alert(message);
    });

    return () => {
      socket.off('gameStart');
      socket.off('updateGameState');
      socket.off('yourTurn');
      socket.off('chatMessage');
      socket.off('opponentDisconnected');
      socket.off('error');
    };
  }, [playerId]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

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

  if (!gameId) {
    return (
      <div className="w-full min-h-screen flex flex-col items-center justify-center" style={{ backgroundColor: 'black' }}>
        <div className="bg-gray-800 p-6 rounded-lg shadow-2xl">
          <h2 className="text-white text-2xl mb-4">Rejoindre ou créer une partie</h2>
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={gameIdInput}
              onChange={(e) => setGameIdInput(e.target.value)}
              className="p-2 rounded bg-gray-700 text-white"
              placeholder="Entrez l'ID de la partie"
            />
            <button
              onClick={joinGame}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Rejoindre
            </button>
          </div>
          <button
            onClick={createGame}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Créer une nouvelle partie
          </button>
          {gameId && <p className="text-white mt-4">ID de la partie : {gameId}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen flex" style={{ margin: 0 }}>
      {/* Left Section (Game Area) */}
      <div
        className="w-[70%] min-h-screen flex flex-col justify-end items-center p-4 relative"
        style={{
          backgroundImage: 'url(/addons/background.jpg)',
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
                    src="/addons/backcard.png"
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
                    src="/addons/backcard.png"
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

      {/* Right Section (Game Controls and Chat) */}
      <div className="w-[30%] min-h-screen flex flex-col items-center justify-start pt-8 gap-4" style={{ backgroundColor: 'black' }}>
        <p className="text-white font-bold">ID de la partie : {gameId}</p>
        <p className="text-white">Joueur {playerId || 'en attente'}</p>
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
          disabled={mustDiscard || hasPlayedCard}
          className={`flex items-center gap-2 px-4 py-2 rounded text-white w-[90%] ${
            mustDiscard ? 'bg-red-600' :
              hasPlayedCard ? 'bg-gray-500 cursor-not-allowed' :
                'bg-green-600'
          }`}
        >
          {mustDiscard ? 'Défaussez une carte' : 'Passer mon tour'}
        </button>


        {/* Chat Section */}
        <div className="w-[90%] flex flex-col gap-2">
          <div
            ref={chatContainerRef}
            className="h-64 bg-gray-800 rounded-lg p-4 overflow-y-auto"
          >
            {chatMessages.map((msg, index) => (
              <div
                key={index}
                className={`text-white mb-2 ${msg.playerId === playerId ? 'text-right' : 'text-left'}`}
              >
                <span className="font-bold text-white">Joueur {msg.playerId}: </span>
                <span className="text-white">{msg.message}</span>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              className="flex-1 p-2 rounded bg-gray-700 text-white placeholder-white placeholder-opacity-50"
              placeholder="Écrivez un message..."
              onKeyDown={(e) => e.key === 'Enter' && sendChatMessage()}
            />
            <button
              onClick={sendChatMessage}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              <Send className="w-5 h-5 text-white" />
            </button>
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
    </div>
  );
}