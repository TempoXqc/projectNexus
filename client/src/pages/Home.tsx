// client/src/pages/Home.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { socketService } from '../services/socketService.ts';
import { z } from 'zod';
import { GameStartSchema } from 'types/SocketSchemas/Game';
import { EmitJoinGameSchema } from 'types/SocketSchemas/Action';

const ActiveGameSchema = z.object({
  gameId: z.string().min(1),
  status: z.enum(['waiting', 'started']),
  createdAt: z.date(),
  players: z.array(z.string().min(1)),
});

const Home: React.FC = () => {
  const navigate = useNavigate();
  const socket = socketService.getSocket();
  const [activeGames, setActiveGames] = useState<{ gameId: string; status: string; createdAt: Date; players: string[] }[]>([]);

  useEffect(() => {
    socket.on('activeGamesUpdate', (games) => {
      try {
        const parsedGames = z.array(ActiveGameSchema).parse(games);
        setActiveGames(parsedGames);
      } catch (error) {
        console.error('[ERROR] activeGamesUpdate validation failed:', error);
        toast.error('Erreur lors de la récupération des parties actives.', { toastId: 'active_games_error' });
      }
    });

    socket.on('gameCreated', (data) => {
      try {
        const parsedData = GameStartSchema.parse(data);
        navigate(`/game/${parsedData.gameId}`, { state: { playerId: parsedData.playerId, availableDecks: parsedData.availableDecks } });
      } catch (error) {
        console.error('[ERROR] gameCreated validation failed:', error);
        toast.error('Erreur lors de la création de la partie.', { toastId: 'game_created_error' });
      }
    });

    socket.on('connect', () => {
      socket.emit('getActiveGames');
    });

    socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      toast.error('Erreur de connexion au serveur.', { toastId: 'connect_error' });
    });

    if (!socket.connected) {
      socketService.connect();
    }

    return () => {
      socket.off('activeGamesUpdate');
      socket.off('gameCreated');
      socket.off('connect');
      socket.off('connect_error');
    };
  }, [socket, navigate]);

  const handleCreateGame = useCallback(() => {
    if (!socket.connected) {
      toast.error('Vous devez être connecté pour créer une partie.', { toastId: 'create_game_error' });
      return;
    }
    socket.emit('createGame');
  }, [socket]);

  const handleJoinGame = useCallback(
    (gameId: string) => {
      if (!socket.connected) {
        toast.error('Vous devez être connecté pour rejoindre une partie.', { toastId: 'join_game_error' });
        return;
      }
      try {
        const parsedGameId = EmitJoinGameSchema.parse(gameId);
        socket.emit('joinGame', parsedGameId);
        navigate(`/game/${gameId}`, { state: { playerId: null } });
      } catch (error) {
        console.error('[ERROR] joinGame validation failed:', error);
        toast.error('ID de partie invalide.', { toastId: 'join_game_error' });
      }
    },
    [socket, navigate],
  );

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4" role="main" aria-label="Page d'accueil">
      <h1 className="text-4xl font-bold mb-8">Project Nexus</h1>
      <button
        onClick={handleCreateGame}
        className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded mb-4"
        aria-label="Créer une nouvelle partie"
      >
        Créer une partie
      </button>
      <h2 className="text-2xl mb-4">Parties actives</h2>
      {activeGames.length === 0 ? (
        <p className="text-gray-400">Aucune partie active pour le moment.</p>
      ) : (
        <ul className="space-y-2" role="list" aria-label="Liste des parties actives">
          {activeGames.map((game) => (
            <li key={game.gameId} className="flex justify-between items-center bg-gray-800 p-4 rounded">
              <span>Partie {game.gameId} ({game.status}, {game.players.length}/2 joueurs)</span>
              <button
                onClick={() => handleJoinGame(game.gameId)}
                className="bg-green-500 hover:bg-green-600 text-white py-1 px-3 rounded"
                disabled={game.status === 'started' || game.players.length >= 2}
                aria-label={`Rejoindre la partie ${game.gameId}`}
              >
                Rejoindre
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Home;