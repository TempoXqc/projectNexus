import React, { useState, useEffect } from 'react';
import { Play, Sword, Hourglass, Check } from 'lucide-react';
import { Socket } from 'socket.io-client';

interface PhaseIndicatorProps {
  socket: Socket;
  isMyTurn: boolean;
  playerId: number | null;
  gameId: string | undefined;
  onPhaseChange: (newPhase: string) => void;
}

export default function PhaseIndicator({ socket, isMyTurn, playerId, gameId, onPhaseChange }: PhaseIndicatorProps) {
  const [currentPhase, setCurrentPhase] = useState(null); // Pas d'initialisation statique
  const [turnCount, setTurnCount] = useState(1);

  useEffect(() => {
    if (!socket || !gameId || !playerId) return;

    const handlePhaseUpdate = (phaseData) => {
      if (!phaseData || !phaseData.phase || phaseData.turn === undefined) {
        console.log('[DEBUG] updatePhase reçu avec données invalides:', phaseData);
        return;
      }
      console.log('[DEBUG] updatePhase reçu:', phaseData);
      setCurrentPhase(phaseData.phase);
      setTurnCount(phaseData.turn);
      onPhaseChange(phaseData.phase);
    };

    socket.on('updatePhase', handlePhaseUpdate);

    return () => {
      socket.off('updatePhase', handlePhaseUpdate);
    };
  }, [socket, gameId, playerId, onPhaseChange]);

  const nextPhase = () => {
    if (!isMyTurn || !gameId || !playerId) {
      console.log('[DEBUG] nextPhase bloqué - isMyTurn:', isMyTurn, 'gameId:', gameId, 'playerId:', playerId);
      return;
    }

    let newPhase = currentPhase;
    let newTurn = turnCount;
    switch (currentPhase) {
      case 'Standby':
        newPhase = 'Main';
        break;
      case 'Main':
        newPhase = 'Battle';
        break;
      case 'Battle':
        newPhase = 'End';
        break;
      case 'End':
        console.log('[DEBUG] nextPhase - Émission de endTurn pour nextPlayerId:', playerId === 1 ? 2 : 1, 'currentTurn:', turnCount, 'currentPhase:', currentPhase);
        socket.emit('endTurn', { gameId, nextPlayerId: playerId === 1 ? 2 : 1 });
        return; // Pas de mise à jour locale, attendre updateGameState
    }

    if (newPhase !== currentPhase) {
      console.log('[DEBUG] nextPhase - Changement de phase:', currentPhase, '->', newPhase);
      setCurrentPhase(newPhase);
      setTurnCount(newTurn);
      socket.emit('updatePhase', { gameId, phase: newPhase, turn: newTurn });
      onPhaseChange(newPhase);
    }
  };

  const getPhaseIcon = () => {
    switch (currentPhase) {
      case 'Standby': return <Hourglass className="w-6 h-6" />;
      case 'Main': return <Play className="w-6 h-6" />;
      case 'Battle': return <Sword className="w-6 h-6" />;
      case 'End': return <Check className="w-6 h-6" />;
      default: return null;
    }
  };

  if (!currentPhase) return null; // Ne rien afficher tant que la phase n'est pas synchronisée

  return (
    <div className="absolute bottom-10 right-75 z-50">
      <div className="flex items-center gap-2 bg-gray-800 bg-opacity-90 p-2 rounded-lg shadow-lg">
        {getPhaseIcon()}
        <span className="text-white text-lg">{currentPhase}</span>
        <button
          onClick={nextPhase}
          className="ml-2 px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
          disabled={!isMyTurn}
        >
          Suivant
        </button>
      </div>
    </div>
  );
}