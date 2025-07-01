// src/pages/WaitingRoom.tsx
import React, { useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { socketService } from '@/services/socketService.ts';
import { PuffLoader } from 'react-spinners';
import { GameStartSchema } from '@tempoxqc/project-nexus-types';

const WaitingRoom: React.FC = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const socket = socketService.getSocket();

  useEffect(() => {
    if (!gameId) {
      navigate('/');
      return;
    }

    if (!socket.connected) {
      console.log('Socket non connecté, tentative de connexion...');
      socketService.connect();
    }

    socket.on('connect', () => {
      console.log(`Socket connecté, ID: ${socket.id}, gameId: ${gameId}, timestamp: ${new Date().toISOString()}`);
      // Tenter de rejoindre la partie si le joueur n'est pas encore assigné
      socket.emit('checkGameExists', gameId, (exists: boolean) => {
        if (exists) {
          socket.emit('joinGame', gameId);
        } else {
          console.log(`Partie ${gameId} n'existe pas, redirection vers /`);
          navigate('/');
          toast.error("La partie n'existe plus.", { toastId: 'game_not_found' });
        }
      });
    });

    socket.on('gameStart', (data) => {
      console.log('Données brutes reçues pour gameStart:', JSON.stringify(data, null, 2));
      try {
        const parsedData = GameStartSchema.parse(data); // Line 42
        console.log('Navigation vers Game.tsx avec state:', {
          playerId: parsedData.playerId,
          availableDecks: parsedData.availableDecks,
        });
        navigate(`/game/${parsedData.gameId}`, {
          state: { playerId: parsedData.playerId, availableDecks: parsedData.availableDecks },
        });
      } catch (error) {
        console.error('[ERROR] gameStart validation failed:', error); // Line 51
        toast.error('Erreur lors du démarrage de la partie.', { toastId: 'game_start_error' });
      }
    });

    socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      toast.error('Erreur de connexion au serveur.', { toastId: 'connect_error' });
      navigate('/');
    });

    socket.on('error', (message) => {
      console.error('Server error:', message);
      toast.error(message, { toastId: 'server_error' });
      navigate('/');
    });

    return () => {
      socket.off('connect');
      socket.off('gameStart');
      socket.off('connect_error');
      socket.off('error');
    };
  }, [gameId, navigate, socket]);

  const handleLeaveGame = useCallback(() => {
    socket.emit('leaveGame', { gameId, playerId: null });
    navigate('/');
  }, [gameId, socket, navigate]);

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4" role="main" aria-label="Salle d'attente">
      <h1 className="text-3xl font-bold mb-4">Salle d'attente</h1>
      <p className="text-lg mb-4">En attente d'un adversaire pour la partie {gameId}...</p>
      <PuffLoader color="#3B82F6" size={60} aria-label="Chargement en attente d'un adversaire" />
      <button
        onClick={handleLeaveGame}
        className="bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded mt-6"
        aria-label="Quitter la partie"
      >
        Quitter
      </button>
    </div>
  );
};

export default WaitingRoom;