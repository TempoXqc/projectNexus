import React, { JSX, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import OpponentField from '../components/OpponentField';
import OpponentHand from '../components/OpponentHand';
import PlayerField from '../components/PlayerField.tsx';
import ChatBox from '../components/ChatBox';
import PlayerGraveyard from '../components/PlayerGraveyard';
import PlayerHand from '../components/PlayerHand';
import PlayerDeck from '../components/PlayerDeck.tsx';
import OpponentDeck from '../components/OpponentDeck';
import OpponentGraveyard from '../components/OpponentGraveyard';
import { BadgeCheck, RefreshCcw, X } from 'lucide-react';
import { Card } from '../types/Card';
import randomizers from '../../public/Randomizers.json';
import { Socket } from 'socket.io-client';
import { getSocket } from '../socket.ts';

let socket: Socket;

const getRandomHand = <T,>(deck: T[], count: number): T[] =>
  [...deck].sort(() => 0.5 - Math.random()).slice(0, count);

const getDeckBadge = (
  deckId: string,
  player1DeckId: string | null,
  selectedDecks: string[],
): JSX.Element | null => {
  if (selectedDecks.length < 3 || !player1DeckId) return null;

  const allDeckIds = randomizers.map((d) => d.id);
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
};

export default function Game() {
  const { gameId } = useParams();
  const navigate = useNavigate();

  const [state, setState] = useState({
    hand: [] as Card[],
    deck: [] as Card[],
    graveyard: [] as Card[],
    field: Array(8).fill(null) as (Card | null)[],
    opponentField: Array(8).fill(null) as (Card | null)[],
    opponentHand: Array(5).fill(0),
    chatMessages: [] as { playerId: number; message: string }[],
    chatInput: '',
    playerId: null as number | null,
    turn: 1,
    isConnected: false,
    hoveredCardId: null as string | null,
    isHandHovered: false,
    isGraveyardOpen: false,
    mustDiscard: false,
    hasPlayedCard: false,
    selectedDecks: [] as string[],
    player1DeckId: null as string | null,
    player1Deck: [] as Card[],
    player2Deck: [] as Card[],
    hasChosenDeck: false,
    deckSelectionDone: false,
    initialDraw: [] as Card[],
    selectedForMulligan: [] as string[],
    mulliganDone: false,
  });


  useEffect(() => {
    socket = getSocket();
  }, []);



  const set = (updates: Partial<typeof state>) =>
    setState((prev) => ({ ...prev, ...updates }));

  useEffect(() => {
    if (!gameId) navigate('/');
  }, [gameId, navigate]);

  const hasJoinedRef = useRef(false);

  useEffect(() => {
    if (!gameId || hasJoinedRef.current) return;

    const tryJoin = () => {
      console.log('[CLIENT] Emitting joinGame for', gameId);
      socket.emit('joinGame', gameId);
      hasJoinedRef.current = true;
    };

    if (socket?.connected) {
      tryJoin();
    } else {
      socket?.once('connect', tryJoin);
    }

    return () => {
      socket?.off('connect', tryJoin);
    };
  }, [gameId]);



  useEffect(() => {
    socket.on('gameStart', ({ playerId, chatHistory }) => {
      console.log('Vous êtes joueur', playerId);
      set({ playerId, chatMessages: chatHistory });
    });

    socket.on('deckSelectionUpdate', (deckChoices) => {
      const allSelected = [deckChoices[1], ...deckChoices[2] ?? []].filter(Boolean);
      set({
        selectedDecks: allSelected,
        player1DeckId: deckChoices[1],
      });
    });


    socket.on('connect', () => set({ isConnected: true }));
    socket.on('disconnect', () => set({ isConnected: false }));
    socket.on('connect_error', () => set({ isConnected: false }));
    socket.on('chatMessage', (msg) =>
      set({ chatMessages: [...state.chatMessages, msg] }),
    );
    socket.on('opponentDisconnected', () => {
      alert("Votre adversaire s'est déconnecté.");
      navigate('/');
    });


    return () => {
      socket.removeAllListeners();
    };
  }, [state.chatMessages]);


  const handleDeckChoice = (deckId: string) => {
    if (state.hasChosenDeck || !state.playerId || !state.isConnected || !gameId) return;

    socket.emit('chooseDeck', {
      gameId,
      playerId: state.playerId,
      deckId,
    });
    set({ hasChosenDeck: true });

  };


  const finalizeDeckSelection = async () => {
    if (!state.player1DeckId) return;
    const res = await fetch('/cards.json');
    const allCards: Card[] = await res.json();
    const p2Decks = state.selectedDecks.filter(
      (id) => id !== state.player1DeckId,
    );
    const p1Decks = randomizers
      .map((d) => d.id)
      .filter((id) => !p2Decks.includes(id));
    const p1Cards = allCards.filter((card) =>
      p1Decks.includes(card.id.split('_')[0]),
    );
    const p2Cards = allCards.filter((card) =>
      p2Decks.includes(card.id.split('_')[0]),
    );
    const drawn = getRandomHand(p1Cards, 5);
    const rest = p1Cards.filter((c) => !drawn.some((d) => d.id === c.id));
    set({
      player1Deck: p1Cards,
      deck: rest,
      initialDraw: drawn,
      player2Deck: p2Cards,
      deckSelectionDone: true,
    });
  };

  const drawNewHand = () => {
    if (state.deck.length < 5) return;
    const drawn = getRandomHand(state.deck, 5);
    const newDeck = state.deck.filter(
      (card) => !drawn.some((d) => d.id === card.id),
    );
    set({ hand: drawn, deck: newDeck });
    gameId &&
      state.isConnected &&
      socket.emit('updateGameState', {
        gameId,
        state: { hand: drawn, deck: newDeck },
      });
  };

  const passTurn = () => {
    if (state.mustDiscard || !state.isConnected) return;
    const [newCard, ...rest] = state.deck;
    const newHand = [...state.hand, newCard];
    const mustDiscardNow = newHand.length > 10;
    set({
      hand: newHand,
      deck: rest,
      mustDiscard: mustDiscardNow,
      hasPlayedCard: false,
      turn: state.turn + 1,
    });
    if (gameId) {
      socket.emit('updateGameState', {
        gameId,
        state: { hand: newHand, deck: rest, mustDiscard: mustDiscardNow },
      });
      socket.emit('passTurn', { gameId });
    }
  };

  const removeCardFromField = (index: number) => {
    const newField = [...state.field];
    const removedCard = newField[index];
    newField[index] = null;

    if (!removedCard) return;

    const newGraveyard = [...state.graveyard, removedCard];
    set({ field: newField, graveyard: newGraveyard });

    if (gameId && state.isConnected) {
      socket.emit('updateGameState', {
        gameId,
        state: { field: newField, graveyard: newGraveyard },
      });
    }
  };

  const discardCardFromHand = (card: Card) => {
    if (!state.mustDiscard || !state.isConnected) return;

    const newHand = state.hand.filter((c) => c.id !== card.id);
    const newGraveyard = [...state.graveyard, card];
    set({ hand: newHand, graveyard: newGraveyard, mustDiscard: false });

    if (gameId) {
      socket.emit('updateGameState', {
        gameId,
        state: {
          hand: newHand,
          graveyard: newGraveyard,
          mustDiscard: false,
        },
      });
    }
  };

  const playCardToField = (card: Card) => {
    if (state.hasPlayedCard || state.mustDiscard || !state.isConnected) return;

    const newField = [...state.field];
    const emptyIndex = newField.findIndex((slot) => slot === null);
    if (emptyIndex === -1) return;

    newField[emptyIndex] = card;
    const newHand = state.hand.filter((c) => c.id !== card.id);
    set({ field: newField, hand: newHand, hasPlayedCard: true });

    if (gameId) {
      socket.emit('playCard', {
        gameId,
        card,
        fieldIndex: emptyIndex,
      });
    }
  };

  const sendChatMessage = () => {
    if (state.chatInput.trim() && gameId && state.isConnected) {
      socket.emit('sendMessage', { gameId, message: state.chatInput });
      set({ chatInput: '' });
    }
  };

  const toggleCardMulligan = (cardId: string) => {
    set({
      selectedForMulligan: state.selectedForMulligan.includes(cardId)
        ? state.selectedForMulligan.filter((id) => id !== cardId)
        : [...state.selectedForMulligan, cardId],
    });
  };

  const doMulligan = () => {
    const toMulligan = state.initialDraw.filter((card) =>
      state.selectedForMulligan.includes(card.id),
    );
    const toKeep = state.initialDraw.filter(
      (card) => !state.selectedForMulligan.includes(card.id),
    );
    const reshuffledDeck = [...state.deck, ...toMulligan].sort(
      () => Math.random() - 0.5,
    );
    const newDraw = getRandomHand(reshuffledDeck, 5 - toKeep.length);
    const finalHand = [...toKeep, ...newDraw];
    const newDeck = reshuffledDeck.filter(
      (c) => !newDraw.some((d) => d.id === c.id),
    );
    set({
      hand: finalHand,
      deck: newDeck,
      initialDraw: [],
      selectedForMulligan: [],
      mulliganDone: true,
    });
  };

  const keepInitialHand = () => {
    set({
      hand: state.initialDraw,
      initialDraw: [],
      selectedForMulligan: [],
      mulliganDone: true,
    });
  };

  const renderInitialDraw = () => {
    if (state.initialDraw.length === 0 || state.mulliganDone) return null;
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-50">
        <h2 className="text-white text-2xl font-bold mb-6">Main de départ</h2>
        <div className="flex gap-4">
          {state.initialDraw.map((card) => {
            const isSelected = state.selectedForMulligan.includes(card.id);
            return (
              <div
                key={card.id}
                onClick={() => toggleCardMulligan(card.id)}
                className={`relative w-[150px] h-[210px] cursor-pointer rounded border-4 ${isSelected ? 'border-red-500' : 'border-transparent'} hover:scale-105 transition-transform`}
              >
                <img
                  src={card.image}
                  alt={card.name}
                  className="w-full h-full object-cover rounded"
                />
                {isSelected && (
                  <div className="absolute top-1 left-1 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full shadow">
                    Mulligan
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="mt-6 flex gap-4">
          <button
            onClick={keepInitialHand}
            className="flex items-center gap-2 px-5 py-2 bg-green-600 text-white rounded-full hover:bg-green-700 shadow-md hover:scale-105 transition"
          >
            <BadgeCheck className="w-4 h-4" /> Je garde ma main
          </button>
          <button
            onClick={doMulligan}
            className="flex items-center gap-2 px-5 py-2 bg-red-600 text-white rounded-full hover:bg-red-700 shadow-md hover:scale-105 transition"
          >
            <X className="w-4 h-4" /> Mulligan (
            {state.selectedForMulligan.length})
          </button>
        </div>
      </div>
    );
  };

  const {
    hand,
    deck,
    graveyard,
    field,
    opponentField,
    opponentHand,
    chatMessages,
    chatInput,
    playerId,
    turn,
    isConnected,
    hoveredCardId,
    isHandHovered,
    isGraveyardOpen,
    mustDiscard,
    hasPlayedCard,
  } = state;

  return (
    <div className="w-full min-h-screen flex flex-row relative">
      {renderInitialDraw()}
      {state.playerId === 2 && state.hasChosenDeck && !state.deckSelectionDone && (
        <p className="text-white text-lg font-semibold">
          En attente de la confirmation du joueur 1...
        </p>
      )}

      {!state.deckSelectionDone && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 bg-black/90 z-50">
          <h2 className="text-white text-3xl font-bold mb-4">
            Choix des decks
          </h2>
          <div className="flex gap-6">
            {randomizers.map((deckObj) => {
              const isSelected = state.selectedDecks.includes(deckObj.id);
              const borderColor = isSelected
                ? state.player1DeckId === deckObj.id
                  ? 'border-blue-500'
                  : 'border-red-500'
                : 'border-transparent';

              return (
                <div
                  key={deckObj.id}
                  onClick={() => handleDeckChoice(deckObj.id)}
                  className="w-[180px] h-[250px] relative cursor-pointer transition-transform hover:scale-105 rounded shadow-lg"
                >
                  <div
                    className={`w-full h-full border-4 ${borderColor} rounded ${
                      borderColor !== 'border-transparent'
                        ? 'shadow-lg shadow-black/50'
                        : ''
                    }`}
                  >
                    <img
                      src={deckObj.image}
                      alt={deckObj.name}
                      className="w-full h-full object-cover rounded"
                    />
                  </div>
                  {getDeckBadge(
                    deckObj.id,
                    state.player1DeckId,
                    state.selectedDecks,
                  )}
                </div>
              );
            })}
          </div>
          {state.hasChosenDeck && state.playerId === 1 && (
            <button
              onClick={finalizeDeckSelection}
              className="mt-8 flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white px-6 py-3 rounded-full shadow-lg hover:scale-105 hover:shadow-xl transition transform duration-200"
            >
              <span className="text-md font-semibold">Suivant</span>
              <span className="text-xl">→</span>
            </button>
          )}
        </div>
      )}

      <div
        className="w-[85%] min-h-screen flex flex-col justify-end items-center p-4 relative"
        style={{
          backgroundImage: 'url(/addons/background.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <PlayerField
          field={field}
          hoveredCardId={hoveredCardId}
          setHoveredCardId={(id) => set({ hoveredCardId: id })}
          removeCardFromField={(index) => removeCardFromField(index)}
        />
        <PlayerHand
          hand={hand}
          hoveredCardId={hoveredCardId}
          setHoveredCardId={(id) => set({ hoveredCardId: id })}
          isHandHovered={isHandHovered}
          setIsHandHovered={(val) => set({ isHandHovered: val })}
          mustDiscard={mustDiscard}
          discardCardFromHand={(card) => discardCardFromHand(card)}
          playCardToField={(card) => playCardToField(card)}
        />

        <div className="absolute left-4 bottom-4 flex gap-4">
          <PlayerDeck count={deck.length} />
          <PlayerGraveyard
            count={graveyard.length}
            onClick={() => set({ isGraveyardOpen: true })}
            isOpen={isGraveyardOpen}
            onClose={() => set({ isGraveyardOpen: false })}
            graveyard={graveyard}
          />
        </div>

        <div className="absolute left-4 top-4 flex gap-4">
          <OpponentDeck count={opponentHand.length} />
          <OpponentGraveyard count={0} />
        </div>

        <OpponentField opponentField={opponentField} />
        <OpponentHand opponentHand={opponentHand} />
      </div>

      <div className="w-[15%] min-h-screen flex flex-col items-center justify-start pt-8 gap-4 bg-black">
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
          setChatInput={(input) => set({ chatInput: input })}
          sendChatMessage={sendChatMessage}
          playerId={playerId}
          isConnected={isConnected}
        />
      </div>
    </div>
  );
}
