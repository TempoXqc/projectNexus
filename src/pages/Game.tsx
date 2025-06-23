import React, { useEffect, useMemo, useState } from 'react';
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
import { getSocket } from '../socket.ts';
import getDeckBadge from '../components/GetDeckBadge.tsx';
import CardPreview from '../components/CardPreview';
import PhaseIndicator from '../components/PhaseIndicator';


const getRandomHand = <T,>(deck: T[], count: number): T[] =>
  [...deck].sort(() => 0.5 - Math.random()).slice(0, count);

export default function Game() {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const socket = useMemo(() => getSocket(), []); // Socket stable
  console.log('[DEBUG] Configuration du socket:', {
    url: socket.io.uri,
    opts: socket.io.opts,
    connected: socket.connected,
  });

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
    isConnected: socket.connected, // Initialiser avec socket.connected
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


  useEffect(() => {
    console.log('[DEBUG] Game.tsx useEffect exécuté pour gameId:', gameId);
    if (!gameId) {
      console.log('[DEBUG] gameId manquant, redirection vers /');
      navigate('/');
      return;
    }

    console.log('[DEBUG] État initial du socket:', { connected: socket.connected, socketId: socket.id });

    let isMounted = true;

    socket.onAny((event, ...args) => {
      if (!isMounted) return;
      console.log('[DEBUG] Événement Socket.IO reçu:', { event, args });
    });

    socket.on('connect', () => {
      if (!isMounted) return;
      console.log('[DEBUG] Socket connecté, socketId:', socket.id);
      set({ isConnected: true });
    });

    socket.on('gameStart', ({ playerId, chatHistory }: { playerId: number; chatHistory: { playerId: number; message: string }[] }) => {
      if (!isMounted) return;
      console.log('[DEBUG] gameStart reçu:', { playerId, chatHistory });
      set({
        playerId,
        chatMessages: chatHistory,
        isMyTurn: playerId === 1,
        deckSelectionDone: false,
        randomizers: [],
        hasChosenDeck: false,
        selectedDecks: [],
        player1DeckId: null,
        isConnected: socket.connected,
      });
    });

    socket.on('initialDeckList', (availableDecks: string[]) => {
      if (!isMounted) return;
      console.log('[DEBUG] initialDeckList reçu:', availableDecks);
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
      set({ randomizers: randomDeckList, deckSelectionDone: false, isConnected: socket.connected });
    });

    socket.on('deckSelectionUpdate', (deckChoices: { 1: string | null; 2: string[] }) => {
      if (!isMounted) return;
      console.log('[DEBUG] deckSelectionUpdate reçu:', deckChoices);
      const allSelected = [deckChoices[1], ...(deckChoices[2] || [])].filter(Boolean) as string[];
      set({ selectedDecks: allSelected, player1DeckId: deckChoices[1], isConnected: socket.connected });
    });

    socket.on('deckSelectionDone', (data: { player1DeckId: string; player2DeckIds: string[]; selectedDecks: string[] }) => {
      if (!isMounted) return;
      console.log('[DEBUG] deckSelectionDone reçu:', data);
      set({ deckSelectionData: data, deckSelectionDone: true, isConnected: socket.connected });
    });

    socket.on('playerReady', ({ playerId }: { playerId: number }) => {
      if (!isMounted) return;
      console.log('[DEBUG] playerReady reçu:', playerId);
      if (state.playerId && playerId !== state.playerId) {
        set({ opponentReady: true, isConnected: socket.connected });
      }
    });

    socket.on('bothPlayersReady', () => {
      if (!isMounted) return;
      console.log('[DEBUG] bothPlayersReady reçu');
      set({ bothReady: true, isConnected: socket.connected });
    });

    socket.on('updateGameState', (gameState: any) => {
      if (!isMounted) return;
      console.log('[DEBUG] updateGameState reçu:', {
        player1: {
          field: gameState.player1.field?.filter(Boolean).length,
          hand: gameState.player1.hand?.length,
          deck: gameState.player1.deck?.length,
          graveyard: gameState.player1.graveyard?.length,
        },
        player2: {
          field: gameState.player2.field?.filter(Boolean).length,
          hand: gameState.player2.hand?.length,
          deck: gameState.player2.deck?.length,
          graveyard: gameState.player2.graveyard?.length,
        },
        turn: gameState.turn,
        phase: gameState.phase,
        activePlayer: gameState.activePlayer,
      });
      const playerKey = state.playerId === 1 ? 'player1' : 'player2';
      const opponentKey = state.playerId === 1 ? 'player2' : 'player1';
      set({
        field: gameState[playerKey].field || state.field,
        hand: gameState[playerKey].hand || state.hand,
        deck: gameState[playerKey].deck || state.deck,
        graveyard: gameState[playerKey].graveyard || state.graveyard,
        opponentField: gameState[opponentKey].field || state.opponentField,
        opponentHand: Array(gameState[opponentKey].hand?.length || 0).fill({}),
        opponentDeck: Array(gameState[opponentKey].deck?.length || 0).fill({}),
        opponentGraveyard: gameState[opponentKey].graveyard || state.opponentGraveyard,
        turn: gameState.turn || state.turn,
        currentPhase: gameState.phase || state.currentPhase,
        isMyTurn: gameState.activePlayer === socket.id,
        isConnected: socket.connected,
      });
    });

    socket.on('startGame', ({ gameId: receivedGameId }: { gameId: string }) => {
      if (!isMounted) return;
      console.log('[DEBUG] startGame reçu:', receivedGameId);
    });

    socket.on('opponentJoined', ({ gameId: receivedGameId }: { gameId: string }) => {
      if (!isMounted) return;
      console.log('[DEBUG] opponentJoined reçu:', receivedGameId);
    });

    socket.on('disconnect', () => {
      if (!isMounted) return;
      console.log('[DEBUG] Socket déconnecté');
      set({ isConnected: false });
    });

    socket.on('connect_error', (error) => {
      if (!isMounted) return;
      console.log('[DEBUG] Erreur de connexion Socket:', error.message);
      set({ isConnected: false });
    });

    socket.on('error', (message: string) => {
      if (!isMounted) return;
      console.log('[DEBUG] Erreur Socket:', message);
      alert(message);
    });

    return () => {
      console.log('[DEBUG] Nettoyage des écouteurs Socket dans Game.tsx');
      isMounted = false;
      socket.offAny();
      socket.off('connect');
      socket.off('gameStart');
      socket.off('initialDeckList');
      socket.off('deckSelectionUpdate');
      socket.off('deckSelectionDone');
      socket.off('playerReady');
      socket.off('bothPlayersReady');
      socket.off('startGame');
      socket.off('opponentJoined');
      socket.off('disconnect');
      socket.off('connect_error');
      socket.off('error');
    };
  }, [gameId, navigate, socket]);

  useEffect(() => {
    if (!gameId) navigate('/');
  }, [gameId, navigate]);

  useEffect(() => {
    console.log('[DEBUG] useEffect pour mulligan exécuté:', {
      deckSelectionData: !!state.deckSelectionData,
      bothReady: state.bothReady,
      deckSelectionDone: state.deckSelectionDone,
      playerId: state.playerId,
      isConnected: state.isConnected,
      initialDraw: state.initialDraw.length,
      mulliganDone: state.mulliganDone,
    });
    if (
      state.deckSelectionData &&
      state.bothReady &&
      state.playerId !== null &&
      state.isConnected &&
      state.initialDraw.length === 0 &&
      !state.mulliganDone
    ) {
      console.log('[DEBUG] Conditions remplies pour initialisation mulligan:', state.deckSelectionData);
      const { player1DeckId, player2DeckIds, selectedDecks } = state.deckSelectionData;
      const remainingDeckId = selectedDecks.find(
        (id: string) => id !== player1DeckId && !player2DeckIds.includes(id),
      );
      console.log('[DEBUG] Decks pour mulligan:', { player1DeckId, player2DeckIds, remainingDeckId, selectedDecks });

      Promise.all([
        fetch('/deckLists.json').then((res) => res.json()),
        fetch('/cards.json').then((res) => res.json()),
      ])
        .then(([deckLists, allCards]) => {
          console.log('[DEBUG] Données chargées:', { deckLists: Object.keys(deckLists), allCards: allCards.length });
          const getDeckCards = (deckId: string) => {
            const cardIds = deckLists[deckId] || [];
            console.log('[DEBUG] Récupération cartes pour deckId:', deckId, { cardIds });
            return allCards.filter((card: Card) => cardIds.includes(card.id));
          };

          let currentPlayerCards: Card[];
          if (state.playerId === 1) {
            const player1Cards = getDeckCards(player1DeckId);
            const remainingCards = remainingDeckId ? getDeckCards(remainingDeckId) : [];
            currentPlayerCards = [...player1Cards, ...remainingCards]
              .sort(() => Math.random() - 0.5)
              .slice(0, 30);
            console.log('[DEBUG] Cartes joueur 1:', { player1Cards: player1Cards.length, remainingCards: remainingCards.length, total: currentPlayerCards.length });
          } else {
            currentPlayerCards = player2DeckIds
              .flatMap((deckId: string) => getDeckCards(deckId))
              .sort(() => Math.random() - 0.5)
              .slice(0, 30);
            console.log('[DEBUG] Cartes joueur 2:', { player2DeckIds, total: currentPlayerCards.length });
          }

          if (currentPlayerCards.length === 0) {
            console.error('[ERROR] Aucune carte trouvée pour le deck du joueur:', state.playerId);
            return;
          }

          const shuffledDeck = [...currentPlayerCards];
          const drawn = getRandomHand(shuffledDeck, 5);
          const rest = shuffledDeck.filter(
            (c: Card) => !drawn.some((d: Card) => d.id === c.id),
          );
          console.log('[DEBUG] Main initiale:', { drawn: drawn.length, rest: rest.length });

          set({
            deck: rest,
            initialDraw: drawn,
            mulliganDone: false, // Ne pas définir mulliganDone ici pour permettre l'affichage
          });

          if (gameId && state.isConnected) {
            console.log('[DEBUG] Émission de updateGameState pour mulligan:', { gameId, hand: drawn.length, deck: rest.length });
            socket.emit('updateGameState', {
              gameId,
              state: { hand: drawn, deck: rest },
            });
          }
        })
        .catch((err: Error) => console.error('[ERREUR INIT DRAW]', err.message));
    } else {
      console.log('[DEBUG] Conditions non remplies pour mulligan');
    }
  }, [
    state.deckSelectionData,
    state.bothReady,
    state.playerId,
    state.isConnected,
    state.initialDraw,
    state.mulliganDone,
    gameId,
  ]);

  const handleDeckChoice = (deckId: string) => {
    console.log('[DEBUG] handleDeckChoice appelé:', { deckId, playerId: state.playerId, isConnected: state.isConnected, gameId });
    if (!state.playerId || !state.isConnected || !gameId) {
      console.log('[DEBUG] handleDeckChoice bloqué:', { playerId: state.playerId, isConnected: state.isConnected, gameId });
      return;
    }
    if (state.playerId === 1 && state.hasChosenDeck) {
      console.log('[DEBUG] Joueur 1 a déjà choisi un deck');
      return;
    }
    if (
      state.playerId === 2 &&
      (!state.player1DeckId ||
        state.selectedDecks.filter((d: string) => d !== state.player1DeckId).length >= 2)
    ) {
      console.log('[DEBUG] Joueur 2 ne peut pas choisir plus de decks:', { player1DeckId: state.player1DeckId, selectedDecks: state.selectedDecks });
      return;
    }

    console.log('[DEBUG] Émission de chooseDeck:', { gameId, playerId: state.playerId, deckId });
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
    console.log('[DEBUG] playCardToField appelé:', {
      card: card.id,
      isMyTurn: state.isMyTurn,
      mustDiscard: state.mustDiscard,
      isConnected: state.isConnected,
      currentPhase: state.currentPhase,
      field: state.field.filter(Boolean).length,
      hand: state.hand.length,
    });
    if (
      !state.isMyTurn ||
      state.mustDiscard ||
      !state.isConnected ||
      state.currentPhase !== 'Main'
    ) {
      console.log('[DEBUG] playCardToField bloqué:', {
        isMyTurn: state.isMyTurn,
        mustDiscard: state.mustDiscard,
        isConnected: state.isConnected,
        currentPhase: state.currentPhase,
      });
      return;
    }

    const newField = [...state.field];
    const emptyIndex = newField.findIndex((slot: Card | null) => slot === null);
    if (emptyIndex === -1) {
      console.log('[DEBUG] playCardToField bloqué: aucun emplacement vide');
      return;
    }

    newField[emptyIndex] = { ...card, exhausted: false };
    const newHand = state.hand.filter((c: Card) => c.id !== card.id);
    set({ field: newField, hand: newHand, hasPlayedCard: true });

    if (gameId) {
      console.log('[DEBUG] Émission de playCard:', {
        gameId,
        card: card.id,
        fieldIndex: emptyIndex,
        newHandLength: newHand.length,
        newFieldLength: newField.filter(Boolean).length,
      });
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
    console.log('[DEBUG] doMulligan appelé:', { selectedForMulligan: state.selectedForMulligan.length });
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
      console.log('[DEBUG] Émission de updateGameState pour doMulligan:', { gameId, hand: finalHand.length, deck: newDeck.length });
      socket.emit('updateGameState', {
        gameId,
        state: { hand: finalHand, deck: newDeck },
      });
    }
  };

  const keepInitialHand = () => {
    console.log('[DEBUG] keepInitialHand appelé:', { initialDraw: state.initialDraw.length });
    set({
      hand: state.initialDraw,
      initialDraw: [],
      selectedForMulligan: [],
      mulliganDone: true,
    });

    if (gameId && state.isConnected) {
      console.log('[DEBUG] Émission de updateGameState pour keepInitialHand:', { gameId, hand: state.initialDraw.length });
      socket.emit('updateGameState', {
        gameId,
        state: { hand: state.initialDraw, deck: state.deck },
      });
    }
  };

  const handleReadyClick = () => {
    console.log('[DEBUG] handleReadyClick appelé:', { gameId, playerId: state.playerId, isConnected: state.isConnected, isReady: state.isReady });
    if (!gameId || !state.playerId || !state.isConnected || state.isReady) {
      console.log('[DEBUG] handleReadyClick bloqué:', { gameId, playerId: state.playerId, isConnected: state.isConnected, isReady: state.isReady });
      return;
    }
    console.log('[DEBUG] Émission de playerReady:', { gameId, playerId: state.playerId });
    socket.emit('playerReady', { gameId, playerId: state.playerId });
    set({ isReady: true });
  };

  const renderInitialDraw = () => {
    console.log('[DEBUG] renderInitialDraw appelé:', {
      initialDraw: state.initialDraw.length,
      mulliganDone: state.mulliganDone,
      bothReady: state.bothReady,
    });
    if (
      state.initialDraw.length === 0 ||
      state.mulliganDone ||
      !state.bothReady
    ) {
      console.log('[DEBUG] renderInitialDraw bloqué');
      return null;
    }
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
    isRightPanelOpen,
    currentPhase,
  } = state;

  return (
    <div className="w-full min-h-screen flex flex-row relative overflow-hidden">
      {renderInitialDraw()}
      {!state.deckSelectionDone && state.randomizers.length > 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 bg-black/90 z-50">
          <h2 className="text-white text-10xl font-bold mb-4">
            Choix des decks
          </h2>
          <div className="flex gap-6">
            {state.randomizers.map((deckObj) => {
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
                    state.randomizers,
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
            {state.playerId !== null && (
              <PhaseIndicator
                socket={socket}
                isMyTurn={isMyTurn}
                playerId={playerId}
                gameId={gameId}
                onPhaseChange={handlePhaseChange}
                currentPhase={currentPhase}
                turn={turn}
              />
            )}
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