import React, { useEffect } from 'react';
import { Play, Sword, Hourglass, Check } from 'lucide-react';
import { Socket } from 'socket.io-client';

interface PhaseIndicatorProps {
  socket: Socket;
  isMyTurn: boolean;
  playerId: number | null;
  gameId: string | undefined;
  onPhaseChange: (newPhase: string) => void;
  currentPhase: string;
}

export default function PhaseIndicator({
                                         socket,
                                         isMyTurn,
                                         playerId,
                                         gameId,
                                         onPhaseChange,
                                         currentPhase,
                                       }: PhaseIndicatorProps) {
  useEffect(() => {
    if (!socket || !gameId || !playerId) return;

    const handlePhaseUpdate = (phaseData: { phase: string; turn: number }) => {
      if (!phaseData || !phaseData.phase || phaseData.turn === undefined) {
        return;
      }
      onPhaseChange(phaseData.phase);
    };

    socket.on('updatePhase', handlePhaseUpdate);

    return () => {
      socket.off('updatePhase', handlePhaseUpdate);
    };
  }, [socket, gameId, playerId, onPhaseChange]);

  const nextPhase = () => {
    if (!isMyTurn || !gameId || !playerId) {
      return;
    }

    let newPhase = currentPhase;
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
        socket.emit('endTurn', { gameId, nextPlayerId: playerId === 1 ? 2 : 1 });
        return;
    }

    if (newPhase !== currentPhase) {
      socket.emit('updatePhase', { gameId, phase: newPhase, turn: 1 });
      onPhaseChange(newPhase);
    }
  };

  const getPhaseIcon = () => {
    switch (currentPhase) {
      case 'Standby':
        return <Hourglass className="w-6 h-6" />;
      case 'Main':
        return <Play className="w-6 h-6" />;
      case 'Battle':
        return <Sword className="w-6 h-6" />;
      case 'End':
        return <Check className="w-6 h-6" />;
      default:
        return null;
    }
  };

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