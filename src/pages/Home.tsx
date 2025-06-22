import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Home() {
  const [gameIdInput, setGameIdInput] = useState('');
  const navigate = useNavigate();

  const joinGame = () => {
    if (gameIdInput.trim()) {
      navigate(`/game/${gameIdInput}`);
    }
  };

  const createGame = () => {
    const newGameId = Math.random().toString(36).substring(2, 10);
    navigate(`/game/${newGameId}`);
  };

  return (
    <div className="w-full min-h-screen flex flex-col items-center justify-center" style={{ backgroundColor: 'black' }}>
      <div className="bg-gray-800 p-6 rounded-lg shadow-2xl">
        <h2 className="text-white text-2xl mb-4">Rejoindre ou créer une partie</h2>
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={gameIdInput}
            onChange={(e) => setGameIdInput(e.target.value)}
            className="p-2 rounded bg-gray-700 text-white"
            placeholder="Entrez l'ID de la partie"
          />
          <button
            onClick={joinGame}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Rejoindre
          </button>
        </div>
        <button
          onClick={createGame}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          Créer une nouvelle partie
        </button>
      </div>
    </div>
  );
}
