import { memo, useEffect, useState, useCallback, useRef } from 'react';
import { Play, Sword, Hourglass, Check } from 'lucide-react';
import { Socket } from 'socket.io-client';
import { PhaseData } from '@tempoxqc/project-nexus-types';

interface PhaseIndicatorProps {
  socket: Socket;
  isMyTurn: boolean;
  playerId: number | null | undefined;
  gameId: string | undefined;
  onPhaseChange: (newPhase: 'Standby' | 'Main' | 'Battle' | 'End') => void;
  currentPhase: 'Standby' | 'Main' | 'Battle' | 'End';
  turn: number;
}

function PhaseIndicator({
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
  const lastEmittedPhase = useRef<string | null>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

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
      console.log('[DEBUG] PhaseUpdate - Received:', { phase: phaseData.phase, currentPhase, playerId });
      if (phaseData.phase !== currentPhase && isMounted.current) {
        console.log('[DEBUG] PhaseUpdate - Appel de onPhaseChange:', phaseData.phase);
        onPhaseChange(phaseData.phase as 'Standby' | 'Main' | 'Battle' | 'End');
      }
    };

    const handlePhaseChangeMessage = (phaseData: PhaseData) => {
      if (!phaseData || !phaseData.phase || phaseData.turn === undefined) {
        console.log('[DEBUG] handlePhaseChangeMessage - Données invalides:', phaseData);
        return;
      }
      console.log('[DEBUG] handlePhaseChangeMessage - Message reçu pour phase:', phaseData.phase, 'avec turn:', phaseData.turn, 'nextPlayerId:', phaseData.nextPlayerId);
      const nextPlayerId = phaseData.nextPlayerId !== undefined ? phaseData.nextPlayerId : playerId === 1 ? 2 : 1;
      const displayMessage =
        phaseData.phase === 'Main'
          ? 'Phase principale'
          : phaseData.phase === 'Battle'
            ? 'Phase de combat'
            : phaseData.phase === 'End' || phaseData.phase === 'Standby'
              ? `Nouveau tour ${phaseData.turn} - Joueur ${nextPlayerId}`
              : `Phase: ${phaseData.phase}`;
      console.log('[DEBUG] handlePhaseChangeMessage - Message à afficher:', displayMessage);
      if (isMounted.current) {
        setMessage(displayMessage);
        setShowMessage(true);
        setIsAnimationActive(true);
        setTimeout(() => {
          if (isMounted.current) {
            setShowMessage(false);
            setIsAnimationActive(false);
          }
        }, 3000);
      }
    };

    socket.on('updatePhase', handlePhaseUpdate);
    socket.on('phaseChangeMessage', handlePhaseChangeMessage);

    return () => {
      socket.off('updatePhase', handlePhaseUpdate);
      socket.off('phaseChangeMessage', handlePhaseChangeMessage);
    };
  }, [socket, gameId, playerId]);

  const nextPhase = useCallback(() => {
    if (!isMyTurn || isAnimationActive) return;

    let newPhase: 'Standby' | 'Main' | 'Battle' | 'End' = currentPhase;
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

    if (newPhase !== currentPhase && newPhase !== lastEmittedPhase.current) {
      console.log('[DEBUG] nextPhase - Nouvelle phase émise:', newPhase);
      socket.emit('updatePhase', { gameId, phase: newPhase, turn });
      lastEmittedPhase.current = newPhase;
      onPhaseChange(newPhase);
    }
  }, [isMyTurn, gameId, playerId, isAnimationActive, currentPhase, socket, turn, onPhaseChange]);

  const getNextPhase = useCallback(() => {
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
  }, [currentPhase]);

  const getNextPhaseIcon = useCallback(() => {
    const nextPhase = getNextPhase();
    return (
      <div className="mr-2 text-white">
        {nextPhase === 'Standby' && <Hourglass className="w-6 h-6" />}
        {nextPhase === 'Main' && <Play className="w-6 h-6" />}
        {nextPhase === 'Battle' && <Sword className="w-6 h-6" />}
        {nextPhase === 'End' && <Check className="w-6 h-6" />}
      </div>
    );
  }, [getNextPhase]);

  const rightStyle = window.innerWidth >= 2560 ? '16rem' : '10.5rem';
  return (
    <div className="absolute z-50" style={{ bottom: '0.833vw', right: rightStyle }}>
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
            isMyTurn && !isAnimationActive
              ? 'bg-blue-600 text-white hover:bg-blue-700 cursor-pointer'
              : 'bg-gray-500 text-gray-300 cursor-not-allowed'
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

export default memo(PhaseIndicator);