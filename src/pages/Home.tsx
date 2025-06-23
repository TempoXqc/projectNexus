import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Socket } from 'socket.io-client';
import { getSocket } from '../socket.ts';

export default function Home() {
  const [gameIdInput, setGameIdInput] = useState('');
  const [gamesList, setGamesList] = useState<{ gameId: string; status: 'waiting' | 'in-progress'; players: number }[]>([]);
  const [isCreator, setIsCreator] = useState(false);
  const [gameIdCreated, setGameIdCreated] = useState<string | null>(null);
  const [opponentJoined, setOpponentJoined] = useState(false);
  const navigate = useNavigate();
  const socket: Socket = getSocket();
  const [isWaitingForCreator, setIsWaitingForCreator] = useState(false);
  const [joinedGameId, setJoinedGameId] = useState<string | null>(null);
  const hasJoinedRef = useRef(false);

  useEffect(() => {
    console.log('[DEBUG] Home.tsx chargé');
    socket.emit('getGamesList');

    socket.on('gamesList', (games: { gameId: string; status: 'waiting' | 'in-progress'; players: number }[]) => {
      console.log('[DEBUG] gamesList reçu:', games);
      setGamesList(games);
    });

    socket.on('opponentJoined', ({ gameId }: { gameId: string }) => {
      console.log('[DEBUG] opponentJoined reçu:', gameId);
      if (gameIdCreated === gameId) {
        setOpponentJoined(true);
      }
    });

    socket.on('startGame', ({ gameId }: { gameId: string }) => {
      console.log('[DEBUG] startGame reçu:', gameId);
      setIsWaitingForCreator(false);
      setJoinedGameId(null);
      hasJoinedRef.current = false;
      navigate(`/game/${gameId}`);
    });

    socket.on('error', (message: string) => {
      console.log('[DEBUG] error reçu:', message);
      setIsWaitingForCreator(false);
      setJoinedGameId(null);
      hasJoinedRef.current = false;
      alert(message);
    });

    return () => {
      console.log('[DEBUG] Nettoyage des écouteurs Socket dans Home.tsx');
      socket.off('gamesList');
      socket.off('opponentJoined');
      socket.off('startGame');
      socket.off('error');
      hasJoinedRef.current = false;
    };
  }, [socket, gameIdCreated, navigate]);

  const createGame = () => {
    console.log('[DEBUG] Création de nouvelle partie');
    const newGameId = Math.random().toString(36).substring(2, 10);
    socket.emit('createGame', newGameId);
    setGameIdCreated(newGameId);
    setIsCreator(true);
  };

  const joinWaitingGame = (gameId: string) => {
    if (hasJoinedRef.current) {
      console.log('[DEBUG] joinWaitingGame ignoré, déjà émis pour gameId:', gameId);
      return;
    }
    console.log('[DEBUG] Émission de joinGame pour gameId:', gameId);
    socket.emit('joinGame', gameId);
    setIsWaitingForCreator(true);
    setJoinedGameId(gameId);
    hasJoinedRef.current = true;
  };

  const joinGameById = () => {
    if (gameIdInput.trim() && !hasJoinedRef.current) {
      console.log('[DEBUG] Émission de joinGame pour gameId:', gameIdInput);
      socket.emit('joinGame', gameIdInput);
      setIsWaitingForCreator(true);
      setJoinedGameId(gameIdInput);
      hasJoinedRef.current = true;
    } else {
      console.log('[DEBUG] joinGameById ignoré:', { hasJoined: hasJoinedRef.current, gameIdInput });
    }
  };

  const handleReady = () => {
    if (gameIdCreated && opponentJoined) {
      socket.emit('creatorReady', gameIdCreated);
    }
  };

  return (
    <div className="w-full min-h-screen flex flex-col items-center justify-center" style={{ backgroundColor: 'black' }}>
      <div className="bg-gray-800 p-6 rounded-lg shadow-2xl w-full max-w-md">
        <h2 className="text-white text-2xl mb-4 text-center">Menu du jeu</h2>
        {isWaitingForCreator ? (
          <div className="text-center">
            <p className="text-white mb-4">
              En attente de la confirmation du créateur de la partie {joinedGameId}...
            </p>
          </div>
        ) : !isCreator ? (
          <>
            <div className="flex flex-col gap-4 mb-4">
              <button
                onClick={createGame}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Créer une partie
              </button>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={gameIdInput}
                  onChange={(e) => setGameIdInput(e.target.value)}
                  className="p-2 rounded bg-gray-700 text-white flex-1"
                  placeholder="Entrez l'ID de la partie"
                />
                <button
                  onClick={joinGameById}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Rejoindre
                </button>
              </div>
            </div>
            <div className="mt-6">
              <h3 className="text-white text-lg mb-2">Parties disponibles</h3>
              <div className="bg-gray-700 p-4 rounded max-h-60 overflow-y-auto">
                {gamesList.length === 0 ? (
                  <p className="text-gray-400">Aucune partie disponible.</p>
                ) : (
                  gamesList.map((game) => (
                    <div
                      key={game.gameId}
                      className="flex justify-between items-center p-2 bg-gray-600 rounded mb-2"
                    >
                    <span className="text-white">
                      Partie {game.gameId} ({game.players}/2) -{' '}
                      {game.status === 'waiting' ? 'En attente' : 'En cours'}
                    </span>
                      {game.status === 'waiting' && game.players < 2 && (
                        <button
                          onClick={() => joinWaitingGame(game.gameId)}
                          className="px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                        >
                          +
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="text-center">
            <p className="text-white mb-4">
              Partie créée : {gameIdCreated}
              <br />
              En attente d'un adversaire...
            </p>
            {opponentJoined && (
              <button
                onClick={handleReady}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Prêt
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}