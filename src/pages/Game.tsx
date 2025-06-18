import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import io from 'socket.io-client';
import OpponentField from '../components/OpponentField';
import OpponentHand from '../components/OpponentHand';
import GameBoard from '../components/GameBoard';
import ChatBox from '../components/ChatBox';
import GraveyardModal from '../components/Graveyard';
import { RefreshCcw } from 'lucide-react';
import { Card } from '../types/Card';

const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';
const socket = io(socketUrl, {
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

function getRandomHand(deck: Card[], count: number): Card[] {
  const shuffled = [...deck].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

export default function Game() {
  const { gameId } = useParams();
  const [hand, setHand] = useState<Card[]>([]);
  const [deck, setDeck] = useState<Card[]>([]);
  const [graveyard, setGraveyard] = useState<Card[]>([]);
  const [field, setField] = useState<(Card | null)[]>(Array(8).fill(null));
  const [opponentField, setOpponentField] = useState<(Card | null)[]>(Array(8).fill(null));
  const [opponentHand, setOpponentHand] = useState<number[]>(Array(5).fill(0));
  const [chatMessages, setChatMessages] = useState<{ playerId: number; message: string }[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [playerId, setPlayerId] = useState<number | null>(null);
  const [turn, setTurn] = useState(1);
  const [isConnected, setIsConnected] = useState(false);
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);
  const [isHandHovered, setIsHandHovered] = useState(false);
  const [isGraveyardOpen, setIsGraveyardOpen] = useState(false);
  const [mustDiscard, setMustDiscard] = useState(false);
  const [hasPlayedCard, setHasPlayedCard] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!gameId) {
      navigate('/');
    }
  }, [gameId, navigate]);

  useEffect(() => {
    fetch('/cards.json')
      .then((res) => res.json())
      .then((allCards: Card[]) => {
        const drawn = getRandomHand(allCards, 5);
        setHand(drawn);
        setDeck(allCards.filter((card) => !drawn.some((d) => d.id === card.id)));
      });
  }, []);

  useEffect(() => {
    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));
    socket.on('connect_error', () => setIsConnected(false));

    socket.on('gameStart', ({ chatHistory, playerId }) => {
      setPlayerId(playerId);
      setChatMessages(chatHistory || []);
    });

    socket.on('updateGameState', (state) => {
      if (!playerId) return;
      const selfKey = playerId === 1 ? 'player1' : 'player2';
      const opponentKey = playerId === 1 ? 'player2' : 'player1';

      setHand(state[selfKey].hand || []);
      setDeck(state[selfKey].deck || []);
      setGraveyard(state[selfKey].graveyard || []);
      setField(state[selfKey].field || Array(8).fill(null));
      setOpponentField(state[opponentKey].field || Array(8).fill(null));
      setOpponentHand(Array(state[opponentKey].hand?.length || 0).fill(0));
      setTurn(state.turn || 1);
      setMustDiscard(!!state[selfKey].mustDiscard);
      setHasPlayedCard(state.activePlayer !== socket.id);
    });

    socket.on('chatMessage', (msg) => {
      setChatMessages((prev) => [...prev, msg]);
    });

    socket.on('opponentDisconnected', () => {
      alert("Votre adversaire s'est déconnecté.");
      setPlayerId(null);
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('connect_error');
      socket.off('gameStart');
      socket.off('updateGameState');
      socket.off('chatMessage');
      socket.off('opponentDisconnected');
    };
  }, [playerId]);

  const playCardToField = (card: Card) => {
    if (hasPlayedCard || mustDiscard || !isConnected) return;
    const newField = [...field];
    const emptyIndex = newField.findIndex((slot) => slot === null);
    if (emptyIndex !== -1) {
      newField[emptyIndex] = card;
      setField(newField);
      setHand((prev) => prev.filter((c) => c.id !== card.id));
      setHasPlayedCard(true);
      if (gameId) {
        socket.emit('playCard', { gameId, card, fieldIndex: emptyIndex });
      }
    }
  };

  const discardCardFromHand = (card: Card) => {
    if (!mustDiscard || !isConnected) return;
    const newHand = hand.filter((c) => c.id !== card.id);
    const newGraveyard = [...graveyard, card];
    setHand(newHand);
    setGraveyard(newGraveyard);
    setMustDiscard(false);
    if (gameId) {
      socket.emit('updateGameState', {
        gameId,
        state: { hand: newHand, graveyard: newGraveyard, mustDiscard: false },
      });
    }
  };

  const removeCardFromField = (index: number) => {
    const newField = [...field];
    const removedCard = newField[index];
    newField[index] = null;

    const compacted: (Card | null)[] = newField.filter((c): c is Card => c !== null);
    while (compacted.length < newField.length) {
      compacted.push(null);
    }

    setField(compacted);

    if (removedCard !== null) {
      const newGraveyard = [...graveyard, removedCard];
      setGraveyard(newGraveyard);

      if (gameId && isConnected) {
        socket.emit('updateGameState', {
          gameId,
          state: { field: compacted, graveyard: newGraveyard },
        });
      }
    }
  };


  const passTurn = () => {
    if (mustDiscard || !isConnected) return;
    setHasPlayedCard(false);
    setTurn((t) => t + 1);

    if (deck.length > 0) {
      const [newCard, ...rest] = deck;
      const newHand = [...hand, newCard];
      const mustDiscardNow = newHand.length > 10;
      setHand(newHand);
      setDeck(rest);
      setMustDiscard(mustDiscardNow);

      if (gameId) {
        socket.emit('updateGameState', {
          gameId,
          state: { hand: newHand, deck: rest, mustDiscard: mustDiscardNow },
        });
        socket.emit('passTurn', { gameId });
      }
    }
  };

  const drawNewHand = () => {
    if (deck.length < 5) return;
    const drawn = getRandomHand(deck, 5);
    const newDeck = deck.filter((card) => !drawn.some((d) => d.id === card.id));
    setHand(drawn);
    setDeck(newDeck);
    if (gameId && isConnected) {
      socket.emit('updateGameState', {
        gameId,
        state: { hand: drawn, deck: newDeck },
      });
    }
  };

  const sendChatMessage = () => {
    if (chatInput.trim() && gameId && isConnected) {
      socket.emit('sendMessage', { gameId, message: chatInput });
      setChatInput('');
    }
  };

  return (
    <div className="w-full min-h-screen flex">
      <GameBoard
        deck={deck}
        graveyard={graveyard}
        field={field}
        hand={hand}
        hoveredCardId={hoveredCardId}
        setHoveredCardId={setHoveredCardId}
        isHandHovered={isHandHovered}
        setIsHandHovered={setIsHandHovered}
        isGraveyardOpen={isGraveyardOpen}
        setIsGraveyardOpen={setIsGraveyardOpen}
        playCardToField={playCardToField}
        discardCardFromHand={discardCardFromHand}
        removeCardFromField={removeCardFromField}
        mustDiscard={mustDiscard}
        hasPlayedCard={hasPlayedCard}
      />

      <div className="w-[30%] min-h-screen flex flex-col items-center justify-start pt-8 gap-4 bg-black">
        <p className="text-white font-bold">ID de la partie : {gameId}</p>
        <p className="text-white">Joueur {playerId || '...'}</p>
        {hand.length === 0 && deck.length >= 5 && (
          <button
            onClick={drawNewHand}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            disabled={!isConnected}
          >
            <RefreshCcw className="w-5 h-5" /> Nouvelle main
          </button>
        )}
        <p className="text-white font-bold">Tour {turn}</p>

        <button
          onClick={passTurn}
          disabled={mustDiscard || hasPlayedCard || !isConnected}
          className={`flex items-center gap-2 px-4 py-2 rounded text-white w-[90%] ${
            mustDiscard
              ? 'bg-red-600'
              : hasPlayedCard || !isConnected
                ? 'bg-gray-500 cursor-not-allowed'
                : 'bg-green-600'
          }`}
        >
          {mustDiscard ? 'Défaussez une carte' : 'Passer mon tour'}
        </button>

        <ChatBox
          chatMessages={chatMessages}
          chatInput={chatInput}
          setChatInput={setChatInput}
          sendChatMessage={sendChatMessage}
          playerId={playerId}
          isConnected={isConnected}
        />
      </div>

      <OpponentField opponentField={opponentField} />
      <OpponentHand opponentHand={opponentHand} />
      <GraveyardModal
        isOpen={isGraveyardOpen}
        onClose={() => setIsGraveyardOpen(false)}
        graveyard={graveyard}
      />
    </div>
  );
}
