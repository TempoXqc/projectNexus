import React, { useEffect, useState } from 'react';
import { Play, Sword, Hourglass, Check } from 'lucide-react';
import { Socket } from 'socket.io-client';

interface PhaseIndicatorProps {
  socket: Socket;
  isMyTurn: boolean;
  playerId: number | null;
  gameId: string | undefined;
  onPhaseChange: (newPhase: 'Standby' | 'Main' | 'Battle' | 'End') => void;
  currentPhase: 'Standby' | 'Main' | 'Battle' | 'End';
  turn: number;
}

interface PhaseData {
  phase: string;
  turn: number;
  nextPlayerId?: number;
}

export default function PhaseIndicator({
                                         socket,
                                         isMyTurn,
                                         playerId,
                                         gameId,
                                         onPhaseChange,
                                         currentPhase,
                                         turn,
                                       }: PhaseIndicatorProps) {
  const [showMessage, setShowMessage] = useState(false);
  const [message, setMessage] = useState('');
  const [isAnimationActive, setIsAnimationActive] = useState(false);

  useEffect(() => {
    if (!socket || !gameId || !playerId) {
      console.log('[DEBUG] useEffect - Socket, gameId ou playerId manquant:', { socket, gameId, playerId });
      return;
    }

    const handlePhaseUpdate = (phaseData: PhaseData) => {
      if (!phaseData || !phaseData.phase || phaseData.turn === undefined) {
        console.log('[DEBUG] PhaseUpdate - Invalid data:', phaseData);
        return;
      }
      console.log('[DEBUG] PhaseUpdate - Received:', phaseData.phase);
      onPhaseChange(phaseData.phase as 'Standby' | 'Main' | 'Battle' | 'End');
    };

    const handlePhaseChangeMessage = (phaseData: PhaseData) => {
      if (!phaseData || !phaseData.phase || phaseData.turn === undefined) {
        console.log('[DEBUG] handlePhaseChangeMessage - Données invalides:', phaseData);
        return;
      }
      console.log('[DEBUG] handlePhaseChangeMessage - Message reçu pour phase:', phaseData.phase, 'avec turn:', phaseData.turn, 'nextPlayerId:', phaseData.nextPlayerId);
      const nextPlayerId = phaseData.nextPlayerId !== undefined ? phaseData.nextPlayerId : (playerId === 1 ? 2 : 1);
      const displayMessage = phaseData.phase === 'Main'
        ? 'MainPhase'
        : phaseData.phase === 'Battle'
          ? 'BattlePhase'
          : phaseData.phase === 'End' || phaseData.phase === 'Standby'
            ? `Nouveau tour ${phaseData.turn} - Joueur ${nextPlayerId}`
            : `Phase: ${phaseData.phase}`;
      console.log('[DEBUG] handlePhaseChangeMessage - Message à afficher:', displayMessage);
      setMessage(displayMessage);
      setShowMessage(true);
      setIsAnimationActive(true);

      const timeoutId = setTimeout(() => {
        setShowMessage(false);
        setIsAnimationActive(false);
      }, 3000);

      return () => clearTimeout(timeoutId);
    };

    socket.on('updatePhase', handlePhaseUpdate);
    socket.on('phaseChangeMessage', handlePhaseChangeMessage);

    return () => {
      socket.off('updatePhase', handlePhaseUpdate);
      socket.off('phaseChangeMessage', handlePhaseChangeMessage);
    };
  }, [socket, gameId, playerId, onPhaseChange]);

  const nextPhase = () => {
    if (!isMyTurn || !gameId || !playerId || isAnimationActive) {
      console.log('[DEBUG] nextPhase - Bloqué, isMyTurn:', isMyTurn, 'gameId:', gameId, 'playerId:', playerId, 'isAnimationActive:', isAnimationActive);
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
        socket.emit('endTurn', { gameId, nextPlayerId: playerId === 1 ? 2 : 1 });
        break;
      case 'End':
        newPhase = 'Standby';
        break;
    }

    if (newPhase !== currentPhase) {
      console.log('[DEBUG] nextPhase - Nouvelle phase émise:', newPhase);
      socket.emit('updatePhase', { gameId, phase: newPhase, turn });
      onPhaseChange(newPhase);
    }
  };

  const getNextPhase = () => {
    switch (currentPhase) {
      case 'Standby':
        return 'Main';
      case 'Main':
        return 'Battle';
      case 'Battle':
        return 'End';
      case 'End':
        return 'Standby';
      default:
        return 'Main';
    }
  };

  const getNextPhaseIcon = () => {
    const nextPhase = getNextPhase();
    return (
      <div className="mr-2 text-white">
        {nextPhase === 'Standby' && <Hourglass className="w-6 h-6" />}
        {nextPhase === 'Main' && <Play className="w-6 h-6" />}
        {nextPhase === 'Battle' && <Sword className="w-6 h-6" />}
        {nextPhase === 'End' && <Check className="w-6 h-6" />}
      </div>
    );
  };

  return (
    <div className="absolute bottom-10 right-80 z-50">
      <div className="flex flex-col items-center w-56">
        {showMessage && (
          <div className="fixed inset-0 flex items-center justify-center z-1000">
            <div className="bg-gray-800 text-white p-6 rounded-lg shadow-lg animate-fade-in-out text-4xl max-w-[90%] text-center break-words">
              {message}
            </div>
          </div>
        )}
        <button
          onClick={nextPhase}
          className={`px-4 py-3 w-56 rounded-full flex items-center justify-center transition duration-200 ${
            isMyTurn && !isAnimationActive ? 'bg-blue-600 text-white hover:bg-blue-700 cursor-pointer' : 'bg-gray-500 text-gray-300 cursor-not-allowed'
          }`}
          disabled={!isMyTurn || isAnimationActive}
        >
          {getNextPhaseIcon()}
          <span>{getNextPhase()}</span>
        </button>
      </div>
    </div>
  );
}