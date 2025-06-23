import { useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { getSocket } from '../socket';
import { Card } from '../types/Card';
import { useNavigate } from 'react-router-dom';

export const useGameSocket = (
  gameId: string | undefined,
  setState: (updates: any) => void,
  playerId: number | null,
  isConnected: boolean,
  chatMessages: { playerId: number; message: string }[],
) => {
  const navigate = useNavigate();
  const hasJoinedRef = useRef(false);
  const socketRef = useRef<Socket>(getSocket());

  useEffect(() => {
    if (!gameId) {
      navigate('/');
      return;
    }

    const socket = socketRef.current;

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
      setState({ isConnected: true });
    });

    socket.on('disconnect', () => {
      setState({ isConnected: false });
    });

    socket.on('connect_error', () => {
      setState({ isConnected: false });
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
        setState({ playerId, chatMessages: chatHistory, isMyTurn: playerId === 1 });
      },
    );

    socket.on(
      'deckSelectionUpdate',
      (deckChoices: { 1: string | null; 2: string[] }) => {
        const allSelected = [deckChoices[1], ...(deckChoices[2] || [])].filter(
          Boolean,
        ) as string[];
        setState({
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
        setState({ deckSelectionData: data });
      },
    );

    socket.on('playerReady', ({ playerId: incomingPlayerId }: { playerId: number }) => {
      if (playerId !== incomingPlayerId) {
        setState({ opponentReady: true });
      }
    });

    socket.on('bothPlayersReady', () => {
      setState({ bothReady: true });
    });

    socket.on('chatMessage', (msg: { playerId: number; message: string }) => {
      setState({ chatMessages: [...chatMessages, msg] });
    });

    socket.on('opponentDisconnected', () => {
      alert("Votre adversaire s'est déconnecté.");
      navigate('/');
    });

    socket.on('updateGameState', (gameState: any) => {
      const playerKey = playerId === 1 ? 'player1' : 'player2';
      const opponentKey = playerId === 1 ? 'player2' : 'player1';
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
        hand: gameState[playerKey]?.hand || [],
        graveyard: gameState[playerKey]?.graveyard || [],
        opponentGraveyard:
          gameState[opponentKey]?.graveyard || [],
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
        deck: gameState[playerKey]?.deck || [],
        opponentDeck: gameState[opponentKey]?.deck || [],
        turn: gameState.turn || 1,
        currentPhase: gameState.phase || 'Standby',
        isMyTurn: gameState.activePlayer === socket.id,
      };
      setState(newState);
    });

    socket.on('yourTurn', () => {
      setState({ isMyTurn: true, hasPlayedCard: false });
    });

    socket.on('endTurn', () => {
      setState({ isMyTurn: false, hasPlayedCard: false });
      if (gameId && isConnected) {
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
      setState({ randomizers: randomDeckList });
    });

    socket.on('updatePhase', (phaseData: { phase: string; turn: number }) => {
      if (!phaseData || !phaseData.phase || phaseData.turn === undefined) {
        return;
      }
      setState({ currentPhase: phaseData.phase as 'Standby' | 'Main' | 'Battle' | 'End', turn: phaseData.turn });
    });

    socket.on('drawCard', () => {
      // Handled in useGameState
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
  }, [gameId, navigate, playerId, chatMessages, setState, isConnected]);

  const emit = (event: string, data: any) => {
    if (isConnected) {
      socketRef.current.emit(event, data);
    }
  };

  return { socket: socketRef.current, emit };
};