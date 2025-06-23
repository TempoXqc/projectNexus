import { useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { getSocket } from '../socket';
import { Card } from '../types/Card';
import { PartialGameState } from '../types/PartialGameState';
import {
  ChatMessageSchema,
  GameStartSchema,
  DeckSelectionUpdateSchema,
  DeckSelectionDoneSchema,
  PlayerReadySchema,
  InitialDeckListSchema,
  GameStateUpdateSchema,
  EmitSendMessageSchema,
  EmitChooseDeckSchema,
  EmitPlayerReadySchema,
  EmitUpdateGameStateSchema,
  EmitExhaustCardSchema,
  EmitAttackCardSchema,
  EmitEndTurnSchema,
  EmitUpdatePhaseSchema,
  EmitJoinGameSchema,
  PhaseDataSchema,
} from '../types/SocketSchemas';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

export const useGameSocket = (
  gameId: string | undefined,
  setState: (updates: PartialGameState) => void,
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

    const persistentListeners = () => {
      socket.on('connect', () => {
        setState({ connection: { isConnected: true } });
        toast.success('Connecté au serveur !', { toastId: 'connect' });
      });

      socket.on('disconnect', () => {
        setState({ connection: { isConnected: false } });
        toast.warn('Déconnexion du serveur. Tentative de reconnexion...', {
          toastId: 'disconnect',
        });
      });

      socket.on('connect_error', () => {
        setState({ connection: { isConnected: false } });
        toast.error('Erreur de connexion au serveur. Veuillez vérifier votre réseau.', {
          toastId: 'connect_error',
        });
      });
    };

    const gameListeners = () => {
      socket.on('gameStart', (data) => {
        try {
          const parsedData = GameStartSchema.parse(data);
          setState({
            connection: { playerId: parsedData.playerId },
            chat: { messages: parsedData.chatHistory },
            game: { isMyTurn: parsedData.playerId === 1 },
          });
        } catch (error) {
          toast.error('Données de démarrage de jeu invalides.', { toastId: 'gameStart_error' });
          console.error('[ERROR] gameStart validation failed:', error);
        }
      });

      socket.on('deckSelectionUpdate', (deckChoices) => {
        try {
          const parsedChoices = DeckSelectionUpdateSchema.parse(deckChoices);
          const allSelected = [parsedChoices[1], ...(parsedChoices[2] || [])].filter(
            Boolean,
          ) as string[];
          setState({
            deckSelection: {
              selectedDecks: allSelected,
              player1DeckId: parsedChoices[1],
            },
          });
        } catch (error) {
          toast.error('Données de sélection de deck invalides.', {
            toastId: 'deckSelectionUpdate_error',
          });
          console.error('[ERROR] deckSelectionUpdate validation failed:', error);
        }
      });

      socket.on('deckSelectionDone', (data) => {
        try {
          const parsedData = DeckSelectionDoneSchema.parse(data);
          setState({ deckSelection: { deckSelectionData: parsedData } });
        } catch (error) {
          toast.error('Données de fin de sélection de deck invalides.', {
            toastId: 'deckSelectionDone_error',
          });
          console.error('[ERROR] deckSelectionDone validation failed:', error);
        }
      });

      socket.on('playerReady', (data) => {
        try {
          const parsedData = PlayerReadySchema.parse(data);
          if (playerId !== parsedData.playerId) {
            setState({ deckSelection: { opponentReady: true } });
          }
        } catch (error) {
          toast.error('Données de joueur prêt invalides.', { toastId: 'playerReady_error' });
          console.error('[ERROR] playerReady validation failed:', error);
        }
      });

      socket.on('bothPlayersReady', () => {
        setState({ deckSelection: { bothReady: true } });
      });

      socket.on('chatMessage', (msg) => {
        try {
          const parsedMsg = ChatMessageSchema.parse(msg);
          setState({ chat: { messages: [...chatMessages, parsedMsg] } });
        } catch (error) {
          toast.error('Message de chat invalide.', { toastId: 'chatMessage_error' });
          console.error('[ERROR] chatMessage validation failed:', error);
        }
      });

      socket.on('opponentDisconnected', () => {
        toast.error("Votre adversaire s'est déconnecté. Retour à l'accueil.", {
          toastId: 'opponent_disconnected',
        });
        navigate('/');
      });

      socket.on('updateGameState', (gameState) => {
        try {
          const parsedGameState = GameStateUpdateSchema.parse(gameState);
          const playerKey = playerId === 1 ? 'player1' : 'player2';
          const opponentKey = playerId === 1 ? 'player2' : 'player1';
          const opponentHandLength =
            parsedGameState[opponentKey]?.hand?.length ||
            parsedGameState[opponentKey]?.opponentHand?.length ||
            0;

          const newState: PartialGameState = {
            player: {
              field: (parsedGameState[playerKey]?.field || []).map((c: Card | null) =>
                c ? { ...c, exhausted: c.exhausted !== undefined ? c.exhausted : false } : null,
              ),
              hand: parsedGameState[playerKey]?.hand || [],
              graveyard: parsedGameState[playerKey]?.graveyard || [],
              mustDiscard: parsedGameState[playerKey]?.mustDiscard || false,
              hasPlayedCard: parsedGameState[playerKey]?.hasPlayedCard || false,
              deck: parsedGameState[playerKey]?.deck || [],
              lifePoints: parsedGameState[playerKey]?.lifePoints || 30,
            },
            opponent: {
              graveyard: parsedGameState[opponentKey]?.graveyard || [],
              field: (parsedGameState[opponentKey]?.field || []).map((c: Card | null) =>
                c ? { ...c, exhausted: c.exhausted !== undefined ? c.exhausted : false } : null,
              ),
              hand: Array(opponentHandLength).fill({}),
              deck: parsedGameState[opponentKey]?.deck || [],
              mustDiscard: parsedGameState[opponentKey]?.mustDiscard || false,
              hasPlayedCard: parsedGameState[opponentKey]?.hasPlayedCard || false,
              lifePoints: parsedGameState[opponentKey]?.lifePoints || 30,
            },
            game: {
              turn: parsedGameState.turn || 1,
              currentPhase: parsedGameState.phase || 'Standby',
              isMyTurn: parsedGameState.activePlayer === socket.id,
              gameOver: parsedGameState.gameOver || false,
              winner: parsedGameState.winner || null,
            },
          };
          setState(newState);
        } catch (error) {
          toast.error('Données de mise à jour du jeu invalides.', {
            toastId: 'updateGameState_error',
          });
          console.error('[ERROR] updateGameState validation failed:', error);
        }
      });

      socket.on('gameOver', ({ winner }) => {
        const playerKey = playerId === 1 ? 'player1' : 'player2';
        const message = winner === playerKey ? 'Vous avez gagné !' : 'Vous avez perdu !';
        toast.info(message, { toastId: 'gameOver' });
        setState({ game: { gameOver: true, winner } });
      });

      socket.on('yourTurn', () => {
        setState({
          game: { isMyTurn: true },
          player: { hasPlayedCard: false, mustDiscard: false },
        });
      });

      socket.on('endTurn', () => {
        try {
          setState({
            game: { isMyTurn: false },
            player: { hasPlayedCard: false, mustDiscard: false },
          });
          if (gameId && isConnected) {
            const payload = EmitUpdateGameStateSchema.parse({
              gameId,
              state: { hasPlayedCard: false, mustDiscard: false },
            });
            socket.emit('updateGameState', payload);
          }
        } catch (error) {
          toast.error('Erreur lors de la fin du tour.', { toastId: 'endTurn_error' });
          console.error('[ERROR] endTurn emit validation failed:', error);
        }
      });

      socket.on('initialDeckList', (availableDecks) => {
        try {
          const parsedDecks = InitialDeckListSchema.parse(availableDecks);
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
          const randomDeckList = parsedDecks.map((id: string) => ({
            id,
            name: id.charAt(0).toUpperCase() + id.slice(1),
            image: deckImages[id],
          }));
          setState({ deckSelection: { randomizers: randomDeckList } });
        } catch (error) {
          toast.error('Données de liste de decks invalides.', {
            toastId: 'initialDeckList_error',
          });
          console.error('[ERROR] initialDeckList validation failed:', error);
        }
      });

      socket.on('updatePhase', (phaseData) => {
        try {
          const parsedPhaseData = PhaseDataSchema.parse(phaseData);
          setState({
            game: {
              currentPhase: parsedPhaseData.phase,
              turn: parsedPhaseData.turn,
            },
          });
        } catch (error) {
          toast.error('Données de mise à jour de phase invalides.', {
            toastId: 'updatePhase_error',
          });
          console.error('[ERROR] updatePhase validation failed:', error);
        }
      });

      socket.on('drawCard', () => {
        // Handled in useGameState
      });
    };

    const tryJoin = () => {
      if (!gameId || hasJoinedRef.current) return;
      try {
        const parsedGameId = EmitJoinGameSchema.parse(gameId);
        socket.emit('joinGame', parsedGameId);
        hasJoinedRef.current = true;
      } catch (error) {
        toast.error('ID de jeu invalide.', { toastId: 'joinGame_error' });
        console.error('[ERROR] joinGame validation failed:', error);
      }
    };

    persistentListeners();

    if (socket.connected) {
      tryJoin();
      gameListeners();
    } else {
      socket.once('connect', () => {
        tryJoin();
        gameListeners();
      });
    }

    return () => {
      socket.off('gameStart');
      socket.off('deckSelectionUpdate');
      socket.off('deckSelectionDone');
      socket.off('playerReady');
      socket.off('bothPlayersReady');
      socket.off('chatMessage');
      socket.off('opponentDisconnected');
      socket.off('updateGameState');
      socket.off('gameOver');
      socket.off('yourTurn');
      socket.off('endTurn');
      socket.off('initialDeckList');
      socket.off('updatePhase');
      socket.off('drawCard');
    };
  }, [gameId, navigate, playerId, chatMessages, setState, isConnected]);

  const emit = (event: string, data: any) => {
    if (!isConnected) return;

    try {
      let parsedData: any;
      switch (event) {
        case 'sendMessage':
          parsedData = EmitSendMessageSchema.parse(data);
          break;
        case 'chooseDeck':
          parsedData = EmitChooseDeckSchema.parse(data);
          break;
        case 'playerReady':
          parsedData = EmitPlayerReadySchema.parse(data);
          break;
        case 'updateGameState':
          parsedData = EmitUpdateGameStateSchema.parse(data);
          break;
        case 'exhaustCard':
          parsedData = EmitExhaustCardSchema.parse(data);
          break;
        case 'attackCard':
          parsedData = EmitAttackCardSchema.parse(data);
          break;
        case 'endTurn':
          parsedData = EmitEndTurnSchema.parse(data);
          break;
        case 'updatePhase':
          parsedData = EmitUpdatePhaseSchema.parse(data);
          break;
        case 'joinGame':
          parsedData = EmitJoinGameSchema.parse(data);
          break;
        case 'updateLifePoints':
          parsedData = data; // Add schema validation if needed
          break;
        default:
          parsedData = data;
      }
      socketRef.current.emit(event, parsedData);
    } catch (error) {
      toast.error(`Erreur lors de l'envoi de l'événement ${event}.`, {
        toastId: `${event}_emit_error`,
      });
      console.error(`[ERROR] Emit validation failed for ${event}:`, error);
    }
  };

  return { socket: socketRef.current, emit };
};