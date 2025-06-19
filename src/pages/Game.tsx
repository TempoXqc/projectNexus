import React, { useEffect, useRef, useState } from 'react';
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
import { Socket } from 'socket.io-client';
import { getSocket } from '../socket.ts';
import getDeckBadge from '../components/GetDeckBadge.tsx';

let socket: Socket;

const getRandomHand = <T,>(deck: T[], count: number): T[] =>
  [...deck].sort(() => 0.5 - Math.random()).slice(0, count);

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
    isMyTurn: false, // Ajout pour suivre si c'est le tour du joueur
    selectedDecks: [] as string[],
    player1DeckId: null as string | null,
    player1Deck: [] as Card[],
    player2Deck: [] as Card[],
    hasChosenDeck: false,
    deckSelectionDone: false,
    initialDraw: [] as Card[],
    selectedForMulligan: [] as string[],
    mulliganDone: false,
    isReady: false,
    bothReady: false,
    opponentReady: false,
    deckSelectionData: null as {
      player1DeckId: string;
      player2DeckIds: string[];
      selectedDecks: string[];
    } | null,
    canInitializeDraw: false,
  });

  const set = (updates: Partial<typeof state>) =>
    setState((prev) => ({ ...prev, ...updates }));

  const hasJoinedRef = useRef(false);

  useEffect(() => {
    console.log('[DEBUG] Main Socket.IO useEffect');
    socket = getSocket();

    const tryJoin = () => {
      if (!gameId || hasJoinedRef.current) return;
      console.log('[CLIENT] Emitting joinGame for', gameId);
      socket.emit('joinGame', gameId);
      hasJoinedRef.current = true;
    };

    if (socket.connected) {
      tryJoin();
    } else {
      socket.once('connect', tryJoin);
    }

    socket.on('connect', () => {
      console.log('[DEBUG] Socket connecté');
      set({ isConnected: true });
    });

    socket.on('disconnect', () => {
      console.log('[DEBUG] Socket déconnecté');
      set({ isConnected: false });
    });

    socket.on('connect_error', () => {
      console.log('[DEBUG] Erreur de connexion Socket');
      set({ isConnected: false });
    });

    socket.on('gameStart', ({ playerId, chatHistory }) => {
      console.log('[DEBUG] gameStart reçu, playerId:', playerId);
      set({ playerId, chatMessages: chatHistory, isMyTurn: playerId === 1 });
    });

    socket.on('deckSelectionUpdate', (deckChoices) => {
      console.log('[DEBUG] deckSelectionUpdate reçu:', deckChoices);
      const allSelected = [deckChoices[1], ...(deckChoices[2] || [])].filter(Boolean);
      set({
        selectedDecks: allSelected,
        player1DeckId: deckChoices[1],
      });
    });

    socket.on('deckSelectionDone', (data) => {
      console.log('[DEBUG] deckSelectionDone reçu:', data);
      set({ deckSelectionData: data });
    });

    socket.on('playerReady', ({ playerId }) => {
      console.log(`[DEBUG] playerReady reçu pour player ${playerId}`);
      if (state.playerId && playerId !== state.playerId) {
        set({ opponentReady: true });
      }
    });

    socket.on('bothPlayersReady', () => {
      console.log('[DEBUG] bothPlayersReady reçu');
      set({ bothReady: true });
    });

    socket.on('chatMessage', (msg) => {
      console.log('[DEBUG] chatMessage reçu:', msg);
      set({ chatMessages: [...state.chatMessages, msg] });
    });

    socket.on('opponentDisconnected', () => {
      console.log('[DEBUG] opponentDisconnected reçu');
      alert("Votre adversaire s'est déconnecté.");
      navigate('/');
    });

    socket.on('updateGameState', (gameState) => {
      console.log('[DEBUG] updateGameState reçu:', gameState);
      const playerKey = state.playerId === 1 ? 'player1' : 'player2';
      const opponentKey = state.playerId === 1 ? 'player2' : 'player1';
      set({
        field: gameState[playerKey].field || state.field,
        hand: gameState[playerKey].hand || state.hand,
        graveyard: gameState[playerKey].graveyard || state.graveyard,
        mustDiscard: gameState[playerKey].mustDiscard || false,
        hasPlayedCard: gameState[playerKey].hasPlayedCard || false,
        opponentField: gameState[opponentKey].field || state.opponentField,
        turn: gameState.turn || state.turn,
        isMyTurn: gameState.activePlayer === socket.id,
      });
    });

    socket.on('yourTurn', () => {
      console.log('[DEBUG] yourTurn reçu');
      set({ isMyTurn: true, hasPlayedCard: false });
    });

    return () => {
      console.log('[DEBUG] Nettoyage du useEffect Socket.IO');
      socket.off('connect', tryJoin);
      socket.off('connect');
      socket.off('disconnect');
      socket.off('connect_error');
      socket.off('gameStart');
      socket.off('deckSelectionUpdate');
      socket.off('deckSelectionDone');
      socket.off('playerReady');
      socket.off('bothPlayersReady');
      socket.off('chatMessage');
      socket.off('opponentDisconnected');
      socket.off('updateGameState');
      socket.off('yourTurn');
    };
  }, [gameId, navigate, state.playerId, state.chatMessages]);

  useEffect(() => {
    if (!gameId) navigate('/');
  }, [gameId, navigate]);

  useEffect(() => {
    if (
      state.deckSelectionData &&
      state.bothReady &&
      !state.deckSelectionDone &&
      state.playerId !== null
    ) {
      console.log('[TRIGGER] INIT DRAW PHASE');
      console.log('[DEBUG] deckSelectionData:', state.deckSelectionData);

      const { player1DeckId, player2DeckIds } = state.deckSelectionData;

      Promise.all([
        fetch('/DeckLists.json').then((res) => res.json()),
        fetch('/cards.json').then((res) => res.json()),
      ])
        .then(([deckLists, allCards]: [Record<string, string[]>, Card[]]) => {
          console.log('[DEBUG] DeckLists:', deckLists);
          console.log('[DEBUG] allCards:', allCards.map(c => c.id));

          const currentDeckKeys =
            state.playerId === 1 ? [player1DeckId] : player2DeckIds;

          console.log('[DEBUG] currentDeckKeys:', currentDeckKeys);

          if (!currentDeckKeys || currentDeckKeys.length === 0) {
            console.error('[ERROR] Aucune clé de deck valide pour le joueur', state.playerId);
            return;
          }

          const currentDeckCardIds = currentDeckKeys
            .flatMap(deckId => deckLists[deckId] || [])
            .filter(Boolean);

          console.log('[DEBUG] currentDeckCardIds:', currentDeckCardIds);

          if (currentDeckCardIds.length === 0) {
            console.error('[ERROR] Aucun ID de carte trouvé pour les decks', currentDeckKeys);
            return;
          }

          const currentPlayerCards = allCards.filter(card =>
            currentDeckCardIds.includes(card.id)
          );

          console.log('[DEBUG] currentPlayerCards:', currentPlayerCards.map(c => c.id));

          if (currentPlayerCards.length === 0) {
            console.error('[ERROR] Aucune carte correspondante trouvée pour', currentDeckCardIds);
            return;
          }

          const drawn = getRandomHand(currentPlayerCards, 5);
          const rest = currentPlayerCards.filter(c => !drawn.some(d => d.id === c.id));

          console.log('[DEBUG] Main initiale:', drawn.map(c => c.id));
          console.log('[DEBUG] Deck restant:', rest.map(c => c.id));

          set({
            player1Deck: state.playerId === 1 ? currentPlayerCards : [],
            player2Deck: state.playerId === 2 ? currentPlayerCards : [],
            deck: rest,
            initialDraw: drawn,
            deckSelectionDone: true,
          });

          if (gameId && state.isConnected) {
            socket.emit('updateGameState', {
              gameId,
              state: { hand: drawn, deck: rest },
            });
          }
        })
        .catch(err => console.error('[ERREUR INIT DRAW]', err));
    }
  }, [state.deckSelectionData, state.bothReady, state.deckSelectionDone, state.playerId]);

  const [randomizers, setRandomizers] = useState<any[]>([]);
  useEffect(() => {
    fetch('/Randomizers.json')
      .then(res => res.json())
      .then(setRandomizers)
      .catch(console.error);
  }, []);

  const handleDeckChoice = (deckId: string) => {
    if (!state.playerId || !state.isConnected || !gameId) return;
    if (state.playerId === 1 && state.hasChosenDeck) return;
    if (state.playerId === 2 && state.selectedDecks.filter(d => d !== state.player1DeckId).length >= 2) return;

    socket.emit('chooseDeck', {
      gameId,
      playerId: state.playerId,
      deckId,
    });

    set({ hasChosenDeck: true });
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
    if (!state.isMyTurn || state.hasPlayedCard || state.mustDiscard || !state.isConnected) return;

    const newField = [...state.field];
    const emptyIndex = newField.findIndex((slot) => slot === null);
    if (emptyIndex === -1) return;

    newField[emptyIndex] = card;
    const newHand = state.hand.filter((c) => c.id !== card.id);
    set({ field: newField, hand: newHand, hasPlayedCard: true, isMyTurn: false });

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

    if (gameId && state.isConnected) {
      socket.emit('updateGameState', {
        gameId,
        state: { hand: finalHand, deck: newDeck },
      });
    }
  };

  const keepInitialHand = () => {
    set({
      hand: state.initialDraw,
      initialDraw: [],
      selectedForMulligan: [],
      mulliganDone: true,
    });

    if (gameId && state.isConnected) {
      socket.emit('updateGameState', {
        gameId,
        state: { hand: state.initialDraw },
      });
    }
  };

  const handleReadyClick = () => {
    if (!gameId || !state.playerId || state.isReady) return;
    socket.emit('playerReady', { gameId, playerId: state.playerId });
    set({ isReady: true });
  };

  const renderInitialDraw = () => {
    console.log('[DEBUG] DRAW:', state.initialDraw);
    if (state.initialDraw.length === 0 || state.mulliganDone || !state.bothReady) return null;
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
    isMyTurn,
  } = state;

  return (
    <div className="w-full min-h-screen flex flex-row relative">
      {renderInitialDraw()}
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
                    randomizers
                  )}
                </div>
              );
            })}
          </div>
          {state.hasChosenDeck && (
            <div className="flex flex-col items-center gap-2 mt-6">
              <button
                onClick={handleReadyClick}
                className="flex items-center gap-2 bg-gradient-to-r from-green-600 to-green-500 text-white px-6 py-3 rounded-full shadow-lg hover:scale-105 hover:shadow-xl transition transform duration-200"
              >
                <span className="text-md font-semibold">
                  {state.isReady ? 'En attente de l’autre joueur…' : 'Ready'}
                </span>
              </button>
              {state.isReady && (
                <p className={`text-sm font-medium ${state.opponentReady ? 'text-green-400' : 'text-yellow-300'}`}>
                  {state.opponentReady ? 'L’autre joueur est prêt !' : 'L’autre joueur n’est pas encore prêt.'}
                </p>
              )}
            </div>
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
        <p className="text-white">
          {isMyTurn ? 'À votre tour !' : 'Tour de l\'adversaire'}
        </p>
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