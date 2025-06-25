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
  createdAt: z.string().datetime().transform((val) => new Date(val)),
  players: z.array(z.string().min(1)),
});

const Home: React.FC = () => {
  const navigate = useNavigate();
  const socket = socketService.getSocket();
  const [activeGames, setActiveGames] = useState<{ gameId: string; status: string; createdAt: Date; players: string[] }[]>([]);
  const [isCreatingGame, setIsCreatingGame] = useState(false); // État pour débouncer

  useEffect(() => {
    const handleActiveGamesUpdate = (games: unknown) => {
      try {
        const parsedGames = z.array(ActiveGameSchema).parse(games);
        setActiveGames(parsedGames);
      } catch (error) {
        console.error('[ERROR] activeGamesUpdate validation failed:', error);
        toast.error('Erreur lors de la récupération des parties actives.', { toastId: 'active_games_error' });
      }
    };

    const handleGameCreated = (data: unknown) => {
      console.log('Données reçues pour gameCreated:', data);
      try {
        const parsedData = GameStartSchema.parse(data);
        navigate(`/waiting/${parsedData.gameId}`, {
          state: { playerId: parsedData.playerId, availableDecks: parsedData.availableDecks },
        });
      } catch (error) {
        console.error('[ERROR] gameCreated validation failed:', error);
        toast.error('Erreur lors de la création de la partie.', { toastId: 'game_created_error' });
      } finally {
        setIsCreatingGame(false); // Réactiver le bouton après la réponse
      }
    };

    const handleConnect = () => {
      console.log('Socket connecté, rejoindre la salle lobby');
      socket.emit('joinLobby');
    };

    const handleConnectError = (error: Error) => {
      console.error('WebSocket connection error:', error);
      toast.error('Erreur de connexion au serveur.', { toastId: 'connect_error' });
    };

    socket.on('activeGamesUpdate', handleActiveGamesUpdate);
    socket.on('gameCreated', handleGameCreated);
    socket.on('connect', handleConnect);
    socket.on('connect_error', handleConnectError);

    if (!socket.connected) {
      socketService.connect();
    } else {
      console.log('Socket déjà connecté, rejoindre la salle lobby');
      socket.emit('joinLobby');
    }

    return () => {
      console.log('Quitter la salle lobby');
      socket.emit('leaveLobby');
      socket.off('activeGamesUpdate', handleActiveGamesUpdate);
      socket.off('gameCreated', handleGameCreated);
      socket.off('connect', handleConnect);
      socket.off('connect_error', handleConnectError);
    };
  }, [socket, navigate]);

  const handleCreateGame = useCallback(() => {
    if (!socket.connected) {
      toast.error('Vous devez être connecté pour créer une partie.', { toastId: 'create_game_error' });
      return;
    }
    if (isCreatingGame) {
      console.log('Création de partie déjà en cours, ignoré');
      return;
    }
    setIsCreatingGame(true);
    console.log('Émission de createGame, socket ID:', socket.id);
    socket.emit('createGame');
  }, [socket, isCreatingGame]);

  const handleJoinGame = useCallback(
    (gameId: string) => {
      if (!socket.connected) {
        toast.error('Vous devez être connecté pour rejoindre une partie.', { toastId: 'join_game_error' });
        return;
      }
      try {
        const parsedGameId = EmitJoinGameSchema.parse(gameId);
        socket.emit('joinGame', parsedGameId);
        navigate(`/waiting/${gameId}`, { state: { playerId: null } });
      } catch (error) {
        console.error('[ERROR] joinGame validation failed:', error);
        toast.error('ID de partie invalide.', { toastId: 'join_game_error' });
      }
    },
    [socket, navigate],
  );

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4" role="main" aria-label="Page d'accueil">
      <h1 className="text-3xl font-bold mb-8">Project Nexus</h1>
      <button
        onClick={handleCreateGame}
        className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded mb-8 disabled:bg-gray-600 disabled:cursor-not-allowed"
        aria-label="Créer une nouvelle partie"
        disabled={isCreatingGame}
      >
        {isCreatingGame ? 'Création en cours...' : 'Créer une partie'}
      </button>
      <h2 className="text-2xl font-bold mb-4">Parties actives</h2>
      {activeGames.length === 0 ? (
        <p className="text-lg text-gray-400">Aucune partie active pour le moment.</p>
      ) : (
        <div className="w-full max-w-md">
          <ul
            className="space-y-2 max-h-[400px] overflow-y-auto bg-gray-800 rounded-lg p-4 custom-scrollbar"
            role="list"
            aria-label="Liste des parties actives"
          >
            {activeGames.map((game) => (
              <li
                key={game.gameId}
                className="flex justify-between items-center bg-gray-700 p-3 rounded-md"
              >
                <span className="text-lg">
                  Partie {game.gameId} ({game.status}, {game.players.length}/2 joueurs)
                </span>
                <button
                  onClick={() => handleJoinGame(game.gameId)}
                  className="bg-green-500 hover:bg-green-600 text-white py-1 px-3 rounded disabled:bg-gray-600 disabled:cursor-not-allowed"
                  disabled={game.status === 'started' || game.players.length >= 2}
                  aria-label={`Rejoindre la partie ${game.gameId}`}
                >
                  Rejoindre
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default Home;