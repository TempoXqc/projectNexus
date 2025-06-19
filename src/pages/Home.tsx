// src/pages/Home.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import io from 'socket.io-client';

const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';
const socket = io(socketUrl, {
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

export default function Home() {
  const [gameIdInput, setGameIdInput] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));
    socket.on('connect_error', () => setIsConnected(false));

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('connect_error');
    };
  }, []);

  const joinGame = () => {
    if (gameIdInput.trim()) {
      socket.emit('joinGame', gameIdInput);
      navigate(`/game/${gameIdInput}`);
    }
  };

  const createGame = () => {
    const newGameId = Math.random().toString(36).substring(2, 10);
    socket.emit('joinGame', newGameId);
    navigate(`/game/${newGameId}`);
  };


  return (
    <div className="w-full min-h-screen flex flex-col items-center justify-center" style={{ backgroundColor: 'black' }}>
      <div className="bg-gray-800 p-6 rounded-lg shadow-2xl">
        <h2 className="text-white text-2xl mb-4">Rejoindre ou créer une partie</h2>
        <p className="text-white">Connexion : {isConnected ? 'Serveur en ligne' : 'Serveur hors-ligne'}</p>
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={gameIdInput}
            onChange={(e) => setGameIdInput(e.target.value)}
            className="p-2 rounded bg-gray-700 text-white"
            placeholder="Entrez l'ID de la partie"
            disabled={!isConnected}
          />
          <button
            onClick={joinGame}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            disabled={!isConnected}
          >
            Rejoindre
          </button>
        </div>
        <button
          onClick={createGame}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          disabled={!isConnected}
        >
          Créer une nouvelle partie
        </button>
      </div>
    </div>
  );
}
