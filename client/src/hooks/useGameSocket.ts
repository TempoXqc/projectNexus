import { useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { GameState } from 'types/GameStateTypes';
import { socketService } from '@/services/socketService.ts';
import { ChatMessageSchema, EmitSendMessageSchema } from 'types/SocketSchemas/Chat';
import { GameStartSchema } from 'types/SocketSchemas/Game';
import { EmitJoinGameSchema } from 'types/SocketSchemas/Action';

export const useGameSocket = (
  gameId: string | undefined,
  setState: (updates: Partial<GameState> | ((prev: GameState) => Partial<GameState>)) => void,
  playerId: number | null,
  isConnected: boolean,
  chatMessages: { playerId: number; message: string }[]
) => {
  const navigate = useNavigate();
  const hasJoinedRef = useRef(false);
  const socketRef = useRef<Socket>(socketService.getSocket());

  useEffect(() => {
    if (!gameId) {
      navigate('/');
      return;
    }

    const socket = socketRef.current;

    const persistentListeners = () => {
      socket.on('connect', () => {
        console.log('WebSocket connecté, socket ID:', socket.id, 'timestamp:', new Date().toISOString());
        setState((prev) => ({
          ...prev,
          connection: { ...prev.connection, isConnected: true },
        }));
        toast.success('Connecté au serveur !', { toastId: 'connect' });
      });

      socket.on('connect_error', (error) => {
        console.error('WebSocket connection error:', error);
        setState((prev) => ({
          ...prev,
          connection: { ...prev.connection, isConnected: false },
        }));
        toast.error('Erreur de connexion au serveur.', { toastId: 'connect_error' });
        hasJoinedRef.current = false;
      });

      socket.on('disconnect', () => {
        console.log('WebSocket déconnecté, socket ID:', socket.id, 'timestamp:', new Date().toISOString());
        setState((prev) => ({
          ...prev,
          connection: { ...prev.connection, isConnected: false },
        }));
        toast.warn('Déconnexion du serveur.', { toastId: 'disconnect' });
        hasJoinedRef.current = false;
      });
    };

    const gameListeners = () => {
      socket.on('gameStart', (data) => {
        console.log('Received gameStart:', data, 'timestamp:', new Date().toISOString());
        try {
          const parsedData = GameStartSchema.parse(data);
          setState((prev) => ({
            ...prev,
            connection: { ...prev.connection, playerId: parsedData.playerId },
            chat: { ...prev.chat, messages: parsedData.chatHistory },
            game: { ...prev.game, isMyTurn: parsedData.playerId === 1 },
          }));
        } catch (error) {
          toast.error('Données de démarrage de jeu invalides.', { toastId: 'gameStart_error' });
          console.error('[ERROR] gameStart validation failed:', error);
        }
      });
    };

    const tryJoin = () => {
      if (!gameId || hasJoinedRef.current) return;
      try {
        const parsedGameId = EmitJoinGameSchema.parse(gameId);
        hasJoinedRef.current = true;
        socket.emit('joinGame', parsedGameId);
        console.log('Émis joinGame pour socket ID:', socket.id, 'gameId:', gameId, 'timestamp:', new Date().toISOString());
      } catch (error) {
        toast.error('ID de jeu invalide.', { toastId: 'joinGame_error' });
        console.error('[ERROR] joinGame validation failed:', error);
        hasJoinedRef.current = false;
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
      socket.off('connect');
      socket.off('connect_error');
      socket.off('disconnect');
    };
  }, [gameId, navigate, setState]);

  const emit = (event: string, data: any) => {
    if (!isConnected) return;
    console.log('Émission de', event, 'pour socket ID:', socketRef.current.id, 'data:', data, 'timestamp:', new Date().toISOString());
    try {
      let parsedData: any;
      switch (event) {
        case 'joinGame':
          parsedData = EmitJoinGameSchema.parse(data);
          break;
        case 'sendMessage':
          parsedData = EmitSendMessageSchema.parse(data);
          break;
        default:
          parsedData = data;
      }
      socketRef.current.emit(event, parsedData);
    } catch (error) {
      toast.error(`Erreur lors de l'envoi de l'événement ${event}.`, { toastId: `${event}_emit_error` });
      console.error(`[ERROR] Emit validation failed for ${event}:`, error);
    }
  };

  return { socket: socketRef.current, emit };
};