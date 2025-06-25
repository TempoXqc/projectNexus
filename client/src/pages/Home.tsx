import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { socketService } from '../services/socketService.ts';
import { z } from 'zod';
import { GameStartSchema } from 'types/SocketSchemas/Game';
import { EmitJoinGameSchema } from 'types/SocketSchemas/Action';
import { FaGithub, FaDiscord, FaTwitter, FaEye, FaClock, FaGamepad, FaList } from 'react-icons/fa';

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
  const [isCreatingGame, setIsCreatingGame] = useState(false);
  const [isRanked, setIsRanked] = useState(false);
  const [gameFormat, setGameFormat] = useState<'BO1' | 'BO3'>('BO1');
  const [language, setLanguage] = useState('Français');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'waiting' | 'started'>('all');

  // Données fictives pour le classement (à remplacer par une API réelle)
  const leaderboard = [
    { pseudo: 'Player1', score: 1500 },
    { pseudo: 'Player2', score: 1450 },
    { pseudo: 'Player3', score: 1400 },
    { pseudo: 'Player4', score: 1350 },
    { pseudo: 'Player5', score: 1300 },
    { pseudo: 'Player6', score: 1250 },
    { pseudo: 'Player7', score: 1200 },
    { pseudo: 'Player8', score: 1150 },
    { pseudo: 'Player9', score: 1100 },
    { pseudo: 'Player10', score: 1050 },
  ];

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
        setIsCreatingGame(false);
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
    console.log('Émission de createGame, socket ID:', socket.id, { isRanked, gameFormat });
    socket.emit('createGame', { isRanked, gameFormat });
  }, [socket, isCreatingGame, isRanked, gameFormat]);

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

  const handleJoinAsSpectator = (gameId: string) => {
    if (!socket.connected) {
      toast.error('Vous devez être connecté pour spectater une partie.', { toastId: 'spectate_game_error' });
      return;
    }
    try {
      const parsedGameId = EmitJoinGameSchema.parse(gameId);
      console.log('Émission de joinAsSpectator pour gameId:', gameId);
      socket.emit('joinAsSpectator', parsedGameId);
      navigate(`/game/${gameId}`, { state: { isSpectator: true } });
    } catch (error) {
      console.error('[ERROR] joinAsSpectator validation failed:', error);
      toast.error('ID de partie invalide.', { toastId: 'spectate_game_error' });
    }
  };

  const handleToggleRanked = () => {
    setIsRanked((prev) => !prev);
  };

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setLanguage(e.target.value);
  };

  const openAuthModal = () => setIsAuthModalOpen(true);
  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
    setUsername('');
    setPassword('');
    setRememberMe(false);
  };

  const handleAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Connexion soumise', { username, password, rememberMe });
    // Logique de connexion à implémenter
    closeAuthModal();
  };

  const handleSignUp = () => {
    console.log('Inscription cliquée');
    // Logique d'inscription à implémenter
    closeAuthModal();
  };

  const filteredGames = filterStatus === 'all' ? activeGames : activeGames.filter((game) => game.status === filterStatus);

  return (
    <div className="min-h-screen w-full bg-gray-900 text-white flex flex-col">
      {/* En-tête fixe, pleine largeur */}
      <header className="sticky top-0 z-10 bg-gray-900 shadow-sm w-full">
        <div className="flex justify-between items-center w-full px-8 py-4">
          <div className="flex items-center">
            <button
              className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded"
              aria-label="Se connecter ou créer un compte"
              onClick={openAuthModal}
            >
              Connexion / Inscription
            </button>
          </div>
          <nav className="flex space-x-4">
            <button
              className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded"
              aria-label="Project-Nexus"
              onClick={() => navigate('/')}
            >
              Project-Nexus
            </button>
            <button
              className="bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded"
              aria-label="Base de données des cartes"
              onClick={() => navigate('/cards')}
            >
              Card Database
            </button>
          </nav>
          <div className="flex items-center space-x-4">
            <a
              href="https://github.com/your-repo"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Visiter le GitHub du projet"
            >
              <FaGithub className="w-6 h-6 text-gray-400 hover:text-white" />
            </a>
            <a
              href="https://discord.example.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Rejoindre le serveur Discord"
            >
              <FaDiscord className="w-6 h-6 text-gray-400 hover:text-white" />
            </a>
            <a
              href="https://twitter.com/example"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Suivre sur Twitter"
            >
              <FaTwitter className="w-6 h-6 text-gray-400 hover:text-white" />
            </a>
            <select
              value={language}
              onChange={handleLanguageChange}
              className="bg-gray-800 text-white border border-gray-700 rounded py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Sélectionner la langue"
            >
              <option value="Français">Français</option>
              <option value="English">English</option>
              <option value="Español">Español</option>
            </select>
          </div>
        </div>
      </header>

      {/* Corps principal : Grille de tuiles centrée */}
      <main className="w-full max-w-7xl mx-auto py-8 flex items-center justify-center min-h-[calc(100vh-80px)]">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full">
          {/* Tuile 1 : Liste des parties actives avec filtres */}
          <div className="bg-gray-800 rounded-lg p-6 h-[600px] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">Parties actives</h2>
              <div className="flex space-x-2">
                <button
                  className={`p-2 rounded-full ${
                    filterStatus === 'waiting' ? 'bg-blue-500 text-white' : 'bg-gray-700 text-gray-300'
                  } hover:bg-blue-600`}
                  onClick={() => setFilterStatus('waiting')}
                  title="Parties en attente"
                  aria-label="Filtrer les parties en attente"
                >
                  <FaClock className="w-4 h-4" />
                </button>
                <button
                  className={`p-2 rounded-full ${
                    filterStatus === 'started' ? 'bg-blue-500 text-white' : 'bg-gray-700 text-gray-300'
                  } hover:bg-blue-600`}
                  onClick={() => setFilterStatus('started')}
                  title="Parties en cours"
                  aria-label="Filtrer les parties en cours"
                >
                  <FaGamepad className="w-4 h-4" />
                </button>
                <button
                  className={`p-2 rounded-full ${
                    filterStatus === 'all' ? 'bg-blue-500 text-white' : 'bg-gray-700 text-gray-300'
                  } hover:bg-blue-600`}
                  onClick={() => setFilterStatus('all')}
                  title="Toutes les parties"
                  aria-label="Afficher toutes les parties"
                >
                  <FaList className="w-4 h-4" />
                </button>
              </div>
            </div>
            {filteredGames.length === 0 ? (
              <p className="text-lg text-gray-400">Aucune partie correspondante.</p>
            ) : (
              <ul
                className="space-y-2 overflow-y-auto custom-scrollbar flex-1"
                role="list"
                aria-label="Liste des parties actives"
              >
                {filteredGames.map((game) => (
                  <li
                    key={game.gameId}
                    className="flex justify-between items-center bg-gray-700 p-3 rounded-md"
                  >
                    <span className="text-lg">
                      Partie {game.gameId} ({game.status}, {game.players.length}/2 joueurs)
                    </span>
                    <div className="flex items-center space-x-2">
                      {game.status === 'waiting' && (
                        <button
                          onClick={() => handleJoinGame(game.gameId)}
                          className="bg-green-500 hover:bg-green-600 text-white py-1 px-3 rounded text-sm disabled:bg-gray-600 disabled:cursor-not-allowed"
                          disabled={game.players.length >= 2}
                          aria-label={`Rejoindre la partie ${game.gameId}`}
                        >
                          Rejoindre
                        </button>
                      )}
                      {game.status === 'started' && (
                        <button
                          onClick={() => handleJoinAsSpectator(game.gameId)}
                          className="bg-gray-500 hover:bg-gray-600 text-white p-2 rounded"
                          aria-label={`Spectater la partie ${game.gameId}`}
                        >
                          <FaEye className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Tuile 2 : Classement */}
          <div className="bg-gray-800 rounded-lg p-6 h-[600px] flex flex-col">
            <h2 className="text-2xl font-bold mb-4">Classement</h2>
            <ul className="space-y-2 overflow-y-auto custom-scrollbar flex-1 text-md">
              {leaderboard.map((player, index) => (
                <li key={index} className="bg-gray-700 p-2 rounded-md flex justify-between">
                  <span>{player.pseudo}</span>
                  <span>{player.score}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Tuile 3 : Trois sous-tuiles empilées */}
          <div className="flex flex-col gap-4 h-[600px]">
            {/* Sous-tuile : Créer une partie */}
            <div className="bg-gray-800 rounded-lg p-6 flex-1 flex flex-col items-center justify-center">
              <h3 className="text-xl font-bold mb-4">Nouvelle partie</h3>
              <button
                onClick={handleCreateGame}
                className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded mb-4 text-md disabled:bg-gray-600 disabled:cursor-not-allowed"
                aria-label="Créer une nouvelle partie"
                disabled={isCreatingGame}
              >
                {isCreatingGame ? 'Création en cours...' : 'Créer une partie'}
              </button>
              <div className="flex items-center mb-4">
                <span className="mr-2 text-md">{isRanked ? 'Ranked' : 'Unranked'}</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isRanked}
                    onChange={handleToggleRanked}
                    className="sr-only"
                    aria-label="Basculer entre Unranked et Ranked"
                  />
                  <div className="w-9 h-5 bg-gray-700 rounded-full peer peer-focus:ring-2 peer-focus:ring-blue-300 transition">
                    <div
                      className={`w-4 h-4 bg-white rounded-full shadow transform transition ${
                        isRanked ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    ></div>
                  </div>
                </label>
              </div>
              <select
                value={gameFormat}
                onChange={(e) => setGameFormat(e.target.value as 'BO1' | 'BO3')}
                className="bg-gray-800 text-white border border-gray-700 rounded py-1 px-2 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full max-w-[120px] text-sm"
                aria-label="Sélectionner le format de la partie"
              >
                <option value="BO1">BO1</option>
                <option value="BO3">BO3</option>
              </select>
            </div>

            {/* Sous-tuile : Image */}
            <div className="bg-gray-800 rounded-lg p-6 flex-1 flex flex-col items-center justify-center">
              <div className="w-full h-full bg-gray-700 rounded-lg flex items-center justify-center">
                <span className="text-gray-400 text-sm">Image à définir</span>
              </div>
            </div>

            {/* Sous-tuile : Liens Wiki et Règles */}
            <div className="bg-gray-800 rounded-lg p-6 flex-1 flex flex-col items-center justify-center">
              <div className="flex space-x-4">
                <a
                  href="https://wiki.example.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded text-sm"
                  aria-label="Consulter le Wiki"
                >
                  Wiki
                </a>
                <a
                  href="https://rules.example.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded text-sm"
                  aria-label="Consulter les règles"
                >
                  Règles
                </a>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Modale de connexion/inscription */}
      {isAuthModalOpen && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-20"
          onClick={closeAuthModal}
          role="dialog"
          aria-label="Modale de connexion ou inscription"
        >
          <div
            className="bg-gray-800 rounded-lg p-6 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <form onSubmit={handleAuthSubmit} className="flex flex-col gap-4">
              <h3 className="text-xl font-bold text-center">Connexion</h3>
              <div>
                <label htmlFor="username" className="block text-sm font-medium mb-1">
                  Nom d'utilisateur
                </label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-gray-700 text-white border border-gray-600 rounded py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  aria-label="Nom d'utilisateur"
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium mb-1">
                  Mot de passe
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-gray-700 text-white border border-gray-600 rounded py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  aria-label="Mot de passe"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="rememberMe"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 text-blue-500 focus:ring-blue-500 border-gray-600 rounded"
                  aria-label="Se souvenir de moi"
                />
                <label htmlFor="rememberMe" className="text-sm">
                  Se souvenir de moi
                </label>
              </div>
              <a
                href="#"
                className="text-sm text-blue-500 hover:underline text-center"
                aria-label="Mot de passe oublié"
              >
                Mot de passe oublié ?
              </a>
              <button
                type="submit"
                className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded text-md"
                aria-label="Se connecter"
              >
                Connexion
              </button>
              <div className="flex items-center gap-2">
                <hr className="flex-1 border-gray-600" />
                <span className="text-sm text-gray-400">ou</span>
                <hr className="flex-1 border-gray-600" />
              </div>
              <button
                type="button"
                onClick={handleSignUp}
                className="bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded text-md"
                aria-label="S'inscrire"
              >
                Inscription
              </button>
              <p className="text-sm text-gray-400 italic text-center">
                En utilisant la fonction Se souvenir de moi, vous consentez à ce qu'un cookie soit stocké dans votre navigateur pour identifier votre compte lors de futures visites.{' '}
                <a
                  href="https://privacy.example.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline"
                  aria-label="Politique de confidentialité"
                >
                  Politique de confidentialité
                </a>
              </p>
            </form>
          </div>
        </div>
      )}

      {/* Version du site */}
      <div className="fixed bottom-4 right-4 text-gray-400 text-sm" aria-label="Version du site">
        v0.0.1
      </div>
    </div>
  );
};

export default Home;