import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import OpponentField from '../components/OpponentField';
import OpponentHand from '../components/OpponentHand';
import PlayerField from '../components/PlayerField.tsx';
import ChatBox from '../components/chatbox/ChatBox.tsx';
import PlayerGraveyard from '../components/PlayerGraveyard';
import PlayerHand from '../components/PlayerHand';
import PlayerDeck from '../components/PlayerDeck.tsx';
import OpponentDeck from '../components/OpponentDeck';
import OpponentGraveyard from '../components/OpponentGraveyard';
import {
  BadgeCheck,
  X,
} from 'lucide-react';
import { Card } from '../types/Card';
import { Socket } from 'socket.io-client';
import { getSocket } from '../socket.ts';
import getDeckBadge from '../components/GetDeckBadge.tsx';
import CardPreview from '../components/CardPreview';
import PhaseIndicator from '../components/PhaseIndicator';

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
    opponentGraveyard: [] as Card[],
    field: Array(8).fill(null) as (Card | null)[],
    opponentField: Array(8).fill(null) as (Card | null)[],
    opponentHand: [] as Card[],
    opponentDeck: [] as Card[],
    chatMessages: [] as { playerId: number; message: string }[],
    chatInput: '',
    playerId: null as number | null,
    turn: 1,
    isConnected: false,
    hoveredCardId: null as string | null,
    isCardHovered: false,
    isGraveyardOpen: false,
    isOpponentGraveyardOpen: false,
    mustDiscard: false,
    hasPlayedCard: false,
    isMyTurn: false,
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
    randomizers: [] as { id: string; name: string; image: string }[],
    isRightPanelOpen: false,
    currentPhase: 'Main' as string,
    isRightPanelHovered: false,
  });

  const set = (updates: Partial<typeof state>) =>
    setState((prev) => ({ ...prev, ...updates }));

  const hasJoinedRef = useRef(false);

  useEffect(() => {
    socket = getSocket();

    const tryJoin = () => {
      if (!gameId || hasJoinedRef.current) return;
      socket.emit('joinGame', gameId);
      hasJoinedRef.current = true;
    };

    if (socket.connected) {
      tryJoin();
    } else {
      socket.once('connect', tryJoin);
    }

    socket.on('connect', () => {
      set({ isConnected: true });
    });

    socket.on('disconnect', () => {
      set({ isConnected: false });
    });

    socket.on('connect_error', () => {
      set({ isConnected: false });
    });

    socket.on(
      'gameStart',
      ({
        playerId,
        chatHistory,
      }: {
        playerId: number;
        chatHistory: { playerId: number; message: string }[];
      }) => {
        set({ playerId, chatMessages: chatHistory, isMyTurn: playerId === 1 });
      },
    );

    socket.on(
      'deckSelectionUpdate',
      (deckChoices: { 1: string | null; 2: string[] }) => {
        const allSelected = [deckChoices[1], ...(deckChoices[2] || [])].filter(
          Boolean,
        ) as string[];
        set({
          selectedDecks: allSelected,
          player1DeckId: deckChoices[1],
        });
      },
    );

    socket.on(
      'deckSelectionDone',
      (data: {
        player1DeckId: string;
        player2DeckIds: string[];
        selectedDecks: string[];
      }) => {
        set({ deckSelectionData: data });
      },
    );

    socket.on('playerReady', ({ playerId }: { playerId: number }) => {
      if (state.playerId && playerId !== state.playerId) {
        set({ opponentReady: true });
      }
    });

    socket.on('bothPlayersReady', () => {
      set({ bothReady: true });
    });

    socket.on('chatMessage', (msg: { playerId: number; message: string }) => {
      set({ chatMessages: [...state.chatMessages, msg] });
    });

    socket.on('opponentDisconnected', () => {
      alert("Votre adversaire s'est déconnecté.");
      navigate('/');
    });

    socket.on('updateGameState', (gameState: any) => {
      const playerKey = state.playerId === 1 ? 'player1' : 'player2';
      const opponentKey = state.playerId === 1 ? 'player2' : 'player1';
      const opponentHandLength =
        gameState[opponentKey]?.hand?.length ||
        gameState[opponentKey]?.opponentHand?.length ||
        0;

      const newState = {
        field: (gameState[playerKey]?.field || []).map((c: Card | null) =>
          c
            ? {
                ...c,
                exhausted: c.exhausted !== undefined ? c.exhausted : false,
              }
            : null,
        ),
        hand: gameState[playerKey]?.hand || state.hand,
        graveyard: gameState[playerKey]?.graveyard || state.graveyard,
        opponentGraveyard:
          gameState[opponentKey]?.graveyard || state.opponentGraveyard,
        mustDiscard: gameState[playerKey]?.mustDiscard || false,
        hasPlayedCard: gameState[playerKey]?.hasPlayedCard || false,
        opponentField: (gameState[opponentKey]?.field || []).map(
          (c: Card | null) =>
            c
              ? {
                  ...c,
                  exhausted: c.exhausted !== undefined ? c.exhausted : false,
                }
              : null,
        ),
        opponentHand: Array(opponentHandLength).fill({}),
        deck: gameState[playerKey]?.deck || state.deck,
        opponentDeck: gameState[opponentKey]?.deck || state.opponentDeck,
        turn: gameState.turn || state.turn,
        currentPhase: gameState.phase || state.currentPhase,
        isMyTurn: gameState.activePlayer === socket.id,
      };
      set(newState);
    });

    socket.on('yourTurn', () => {
      set({ isMyTurn: true, hasPlayedCard: false });
    });

    socket.on('endTurn', () => {
      set({ isMyTurn: false, hasPlayedCard: false });
      if (gameId && state.isConnected) {
        socket.emit('updateGameState', {
          gameId,
          state: { hasPlayedCard: false },
        });
      }
    });

    socket.on('initialDeckList', (availableDecks: string[]) => {
      const deckImages: { [key: string]: string } = {
        assassin: '/cards/randomizers/Assassin.jpg',
        celestial: '/cards/randomizers/Celestial.jpg',
        dragon: '/cards/randomizers/Dragon.jpg',
        wizard: '/cards/randomizers/Wizard.jpg',
        vampire: '/cards/randomizers/Vampire.jpg',
        viking: '/cards/randomizers/Viking.jpg',
        engine: '/cards/randomizers/Engine.jpg',
        samurai: '/cards/randomizers/Samurai.jpg',
      };
      const randomDeckList = availableDecks.map((id: string) => ({
        id,
        name: id.charAt(0).toUpperCase() + id.slice(1),
        image: deckImages[id],
      }));
      set({ randomizers: randomDeckList });
    });

    socket.on('updatePhase', (phaseData: { phase: string; turn: number }) => {
      if (!phaseData || !phaseData.phase || phaseData.turn === undefined) {
        return;
      }
      set({ currentPhase: phaseData.phase, turn: phaseData.turn });
    });

    socket.on('drawCard', () => {
      drawCard();
    });

    return () => {
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
      socket.off('endTurn');
      socket.off('initialDeckList');
      socket.off('updatePhase');
      socket.off('drawCard');
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
      const { player1DeckId, player2DeckIds, selectedDecks } =
        state.deckSelectionData;
      const remainingDeckId = selectedDecks.find(
        (id: string) => id !== player1DeckId && !player2DeckIds.includes(id),
      );

      Promise.all([
        fetch('/deckLists.json').then((res) => res.json()),
        fetch('/cards.json').then((res) => res.json()),
      ])
        .then(([deckLists, allCards]) => {
          const getDeckCards = (deckId: string) => {
            const cardIds = deckLists[deckId] || [];
            return allCards.filter((card: Card) => cardIds.includes(card.id));
          };

          let currentPlayerCards: Card[];
          if (state.playerId === 1) {
            const player1Cards = getDeckCards(player1DeckId);
            const remainingCards = remainingDeckId
              ? getDeckCards(remainingDeckId)
              : [];
            currentPlayerCards = [...player1Cards, ...remainingCards]
              .sort(() => Math.random() - 0.5)
              .slice(0, 30);
          } else {
            currentPlayerCards = player2DeckIds
              .flatMap((deckId: string) => getDeckCards(deckId))
              .sort(() => Math.random() - 0.5)
              .slice(0, 30);
          }

          if (currentPlayerCards.length === 0) {
            console.error(
              '[ERROR] Aucune carte trouvée pour le deck du joueur',
              state.playerId,
            );
            return;
          }

          const shuffledDeck = [...currentPlayerCards];
          const drawn = getRandomHand(shuffledDeck, 5);
          const rest = shuffledDeck.filter(
            (c: Card) => !drawn.some((d: Card) => d.id === c.id),
          );

          set({
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
        .catch((err: Error) => console.error('[ERREUR INIT DRAW]', err));
    }
  }, [
    state.deckSelectionData,
    state.bothReady,
    state.deckSelectionDone,
    state.playerId,
  ]);

  const handleDeckChoice = (deckId: string) => {
    if (!state.playerId || !state.isConnected || !gameId) return;
    if (state.playerId === 1 && state.hasChosenDeck) return;
    if (
      state.playerId === 2 &&
      (!state.player1DeckId ||
        state.selectedDecks.filter((d: string) => d !== state.player1DeckId)
          .length >= 2)
    )
      return;

    socket.emit('chooseDeck', {
      gameId,
      playerId: state.playerId,
      deckId,
    });

    set({ hasChosenDeck: true });
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
    if (!state.isConnected) return;
    const newHand = state.hand.filter((c: Card) => c.id !== card.id);
    const newGraveyard = [...state.graveyard, card];
    set({ hand: newHand, graveyard: newGraveyard });

    if (gameId) {
      socket.emit('updateGameState', {
        gameId,
        state: {
          hand: newHand,
          graveyard: newGraveyard,
        },
      });
    }
  };

  const playCardToField = (card: Card) => {
    if (
      !state.isMyTurn ||
      state.mustDiscard ||
      !state.isConnected ||
      state.currentPhase !== 'Main'
    ) {
      return;
    }

    const newField = [...state.field];
    const emptyIndex = newField.findIndex((slot: Card | null) => slot === null);
    if (emptyIndex === -1) return;

    newField[emptyIndex] = card;
    const newHand = state.hand.filter((c: Card) => c.id !== card.id);
    setState((prev) => {
      return { ...prev, field: newField, hand: newHand };
    });

    if (gameId) {
      socket.emit('playCard', {
        gameId,
        card,
        fieldIndex: emptyIndex,
      });
    }
  };

  const exhaustCard = (index: number) => {
    if (
      !state.isMyTurn ||
      !state.isConnected ||
      !gameId ||
      state.currentPhase !== 'Main'
    ) {
      return;
    }

    const card = state.field[index];
    if (!card) {
      return;
    }

    const newField = [...state.field];
    newField[index] = { ...card, exhausted: !card.exhausted };
    set({ field: [...newField] });

    socket.emit('exhaustCard', {
      gameId,
      cardId: card.id,
      fieldIndex: index,
    });
  };

  const attackCard = (index: number) => {
    if (
      !state.isMyTurn ||
      !state.isConnected ||
      !gameId ||
      state.currentPhase !== 'Battle'
    )
      return;
    const card = state.field[index];
    if (card) {
      removeCardFromField(index);
      socket.emit('attackCard', { gameId, cardId: card.id });
    }
  };

  const addToDeck = (card: Card) => {
    const newHand = state.hand.filter((c: Card) => c.id !== card.id);
    const newDeck = [...state.deck, card];
    set({ hand: newHand, deck: newDeck });
    if (gameId && state.isConnected) {
      socket.emit('updateGameState', {
        gameId,
        state: { hand: newHand, deck: newDeck },
      });
    }
  };

  const drawCard = () => {
    if (
      state.deck.length === 0 ||
      !state.isMyTurn ||
      !state.isConnected ||
      state.hand.length >= 10
    )
      return;
    const [drawnCard] = state.deck.slice(0, 1);
    const newDeck = state.deck.slice(1);
    const newHand = [...state.hand, drawnCard];
    set({ hand: newHand, deck: newDeck });
    if (gameId) {
      socket.emit('updateGameState', {
        gameId,
        state: { hand: newHand, deck: newDeck },
      });
    }
  };

  const shuffleDeck = () => {
    if (!state.isConnected) return;
    const shuffledDeck = [...state.deck].sort(() => Math.random() - 0.5);
    set({ deck: shuffledDeck });
    if (gameId) {
      socket.emit('updateGameState', {
        gameId,
        state: { deck: shuffledDeck },
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
        ? state.selectedForMulligan.filter((id: string) => id !== cardId)
        : [...state.selectedForMulligan, cardId],
    });
  };

  const doMulligan = () => {
    const toMulligan = state.initialDraw.filter((card: Card) =>
      state.selectedForMulligan.includes(card.id),
    );
    const toKeep = state.initialDraw.filter(
      (card: Card) => !state.selectedForMulligan.includes(card.id),
    );
    const reshuffledDeck = [...state.deck, ...toMulligan].sort(
      () => Math.random() - 0.5,
    );
    const newDraw = getRandomHand(reshuffledDeck, 5 - toKeep.length);
    const finalHand = [...toKeep, ...newDraw];
    const newDeck = reshuffledDeck.filter(
      (c: Card) => !newDraw.some((d: Card) => d.id === c.id),
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
    if (
      state.initialDraw.length === 0 ||
      state.mulliganDone ||
      !state.bothReady
    )
      return null;
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-50">
        <h2 className="text-white text-10xl font-bold mb-6">Main de départ</h2>
        <div className="flex gap-4">
          {state.initialDraw.map((card: Card) => {
            const isSelected = state.selectedForMulligan.includes(card.id);
            return (
              <div
                key={card.id}
                onClick={() => toggleCardMulligan(card.id)}
                className={`relative w-[305px] h-[422px] cursor-pointer rounded border-4 ${isSelected ? 'border-red-500' : 'border-transparent'} hover:scale-105 transition-transform`}
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
          {state.selectedForMulligan.length > 0 && (
            <button
              onClick={doMulligan}
              className="flex items-center gap-2 px-5 py-2 bg-red-600 text-white rounded-full hover:bg-red-700 shadow-md hover:scale-105 transition"
            >
              <X className="w-4 h-4" /> Mulligan (
              {state.selectedForMulligan.length})
            </button>
          )}
        </div>
      </div>
    );
  };

  const handlePhaseChange = (newPhase: string) => {
    set({ currentPhase: newPhase });
  };

  const {
    hand,
    deck,
    graveyard,
    opponentGraveyard,
    field,
    opponentField,
    opponentHand,
    opponentDeck,
    playerId,
    turn,
    hoveredCardId,
    isCardHovered,
    isGraveyardOpen,
    isOpponentGraveyardOpen,
    mustDiscard,
    isMyTurn,
    randomizers,
    isRightPanelOpen,
    currentPhase,
  } = state;



  return (
    <div className="w-full min-h-screen flex flex-row relative overflow-hidden">
      {renderInitialDraw()}
      {!state.deckSelectionDone && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 bg-black/90 z-50">
          <h2 className="text-white text-10xl font-bold mb-4">
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
                  className="w-[398px] h-[550px] relative cursor-pointer transition-transform hover:scale-105 rounded shadow-lg"
                >
                  <div
                    className={`w-full h-full border-4 ${borderColor} rounded ${borderColor !== 'border-transparent' ? 'shadow-lg shadow-black/50' : ''}`}
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
                    randomizers,
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
                <p
                  className={`text-sm font-medium ${state.opponentReady ? 'text-green-400' : 'text-yellow-300'}`}
                >
                  {state.opponentReady
                    ? 'L’autre joueur est prêt !'
                    : 'L’autre joueur n’est pas encore prêt.'}
                </p>
              )}
            </div>
          )}
        </div>
      )}
      <div className="w-full min-h-screen flex flex-row overflow-hidden">
        <div
          className={`flex-grow min-h-screen flex flex-col justify-end items-center p-4 relative z-10 ${!isRightPanelOpen ? 'w-full' : 'w-[85%]'}`}
          style={{
            backgroundImage: 'url(/addons/background-2.jpg)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            transition: 'width 0.3s ease-in-out',
          }}
        >
          <div className="z-30">
            <PhaseIndicator
              socket={socket}
              isMyTurn={isMyTurn}
              playerId={playerId}
              gameId={gameId}
              onPhaseChange={handlePhaseChange}
              currentPhase={currentPhase}
              turn={turn}
            />
            <PlayerField
              key={state.field.map((c) => c?.exhausted).join('-')}
              field={field}
              hoveredCardId={hoveredCardId}
              setHoveredCardId={(id) => set({ hoveredCardId: id })}
              removeCardFromField={(index) => removeCardFromField(index)}
              exhaustCard={(index) => exhaustCard(index)}
              attackCard={(index) => attackCard(index)}
            />
            <PlayerHand
              hand={hand}
              hoveredCardId={hoveredCardId}
              setHoveredCardId={(id) => set({ hoveredCardId: id })}
              isHandHovered={isCardHovered}
              setIsHandHovered={(val) => set({ isCardHovered: val })}
              mustDiscard={mustDiscard}
              discardCardFromHand={(card) => discardCardFromHand(card)}
              playCardToField={(card) => playCardToField(card)}
              addToDeck={(card) => addToDeck(card)}
              playerId={playerId}
            />
            <OpponentField
              opponentField={opponentField}
              hoveredCardId={hoveredCardId}
              setHoveredCardId={(id) => set({ hoveredCardId: id })}
            />
            <OpponentHand opponentHand={opponentHand} />
          </div>

          <div className="z-30 absolute left-4 bottom-2 flex gap-4">
            <PlayerDeck
              count={deck.length}
              handCount={hand.length}
              drawCard={drawCard}
              shuffleDeck={shuffleDeck}
            />
            <PlayerGraveyard
              count={graveyard.length}
              onClick={() => set({ isGraveyardOpen: true })}
              isOpen={isGraveyardOpen}
              onClose={() => set({ isGraveyardOpen: false })}
              graveyard={graveyard}
              hoveredCardId={hoveredCardId}
              setHoveredCardId={(id) => set({ hoveredCardId: id })}
            />
          </div>

          <div className="z-30 absolute left-4 top-2 flex gap-4">
            <OpponentDeck count={opponentDeck.length} />
            <OpponentGraveyard
              count={opponentGraveyard.length}
              onClick={() => set({ isOpponentGraveyardOpen: true })}
              isOpen={isOpponentGraveyardOpen}
              onClose={() => set({ isOpponentGraveyardOpen: false })}
              graveyard={opponentGraveyard}
              hoveredCardId={hoveredCardId}
              setHoveredCardId={(id) => set({ hoveredCardId: id })}
            />
          </div>

          <CardPreview
            hoveredCardId={hoveredCardId}
            field={field}
            hand={hand}
            opponentField={opponentField}
          />
        </div>

        <div className="chatbox-container">
          <ChatBox
            chatMessages={state.chatMessages}
            chatInput={state.chatInput}
            setChatInput={(input) => setState((prev) => ({ ...prev, chatInput: input }))}
            sendChatMessage={sendChatMessage}
            playerId={state.playerId}
            isConnected={state.isConnected}
            gameId={gameId}
            turn={state.turn}
            isMyTurn={state.isMyTurn}
          />
        </div>
      </div>
    </div>
  );
}