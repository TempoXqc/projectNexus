import { useEffect, useCallback, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { PuffLoader } from 'react-spinners';
import { socketService } from '@/services/socketService.ts';
import { useGameSocket } from '@/hooks/useGameSocket';
import { clientConfig } from '@/config/clientConfig.ts';

const WaitingRoom = () => {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const socket = socketService.getSocket();
  const [username, setUsername] = useState(location.state?.username);
  const [playerId, setPlayerId] = useState(location.state?.playerId || null);

  useEffect(() => {
    if (!username) {
      const token = localStorage.getItem('authToken');
      if (token) {
        fetch(`${clientConfig.apiUrl}/api/verify`, {
          headers: { Authorization: `Bearer ${token}` },
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.username) {
              setUsername(data.username);
              console.log('[WaitingRoom] Username récupéré via /api/verify:', data.username);
            } else {
              localStorage.removeItem('authToken');
              toast.error('Utilisateur non connecté.', { toastId: 'auth_required' });
              navigate('/');
            }
          })
          .catch((error) => {
            console.error('[WaitingRoom] Erreur lors de la vérification du token:', error);
            localStorage.removeItem('authToken');
            toast.error('Utilisateur non connecté.', { toastId: 'auth_required' });
            navigate('/');
          });
      } else {
        toast.error('Utilisateur non connecté.', { toastId: 'auth_required' });
        navigate('/');
      }
    }
  }, [username, navigate]);

  const { tryJoin } = useGameSocket(gameId, () => {}, playerId, socket.connected, username, setPlayerId);

  useEffect(() => {
    console.log('[WaitingRoom] Username:', username, 'PlayerId:', playerId, 'Location state:', location.state);
    if (!gameId) {
      toast.error('ID de partie manquant.', { toastId: 'game_id_missing' });
      navigate('/');
      return;
    }

    if (!socket.connected) {
      socketService.connect();
    }

    socket.on('connect', () => {
      console.log('[WaitingRoom] Connecté, appel de tryJoin');
      tryJoin();
    });

    socket.on('gameStart', (data) => {
      console.log('[WaitingRoom] gameStart reçu:', data);
      setPlayerId(data.playerId);
      navigate(`/game/${data.gameId}`, {
        state: {
          playerId: data.playerId,
          availableDecks: data.availableDecks,
          playmats: data.playmats,
          lifeToken: data.lifeToken,
          username,
        },
      });
    });

    socket.on('connect_error', (error) => {
      console.error('[WaitingRoom] WebSocket connection error:', error);
      toast.error('Erreur de connexion au serveur.', { toastId: 'connect_error' });
      navigate('/');
    });

    socket.on('error', (message) => {
      console.error('[WaitingRoom] Server error:', message);
      toast.error(message, { toastId: 'server_error' });
      navigate('/');
    });

    return () => {
      socket.off('connect');
      socket.off('gameStart');
      socket.off('connect_error');
      socket.off('error');
    };
  }, [gameId, navigate, socket, username, playerId, tryJoin]);

  const handleLeaveGame = useCallback(() => {
    socket.emit('leaveGame', { gameId, playerId });
    navigate('/');
  }, [gameId, socket, navigate, playerId]);

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