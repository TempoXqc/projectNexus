import { useEffect } from 'react';
import { socket } from '@/services/socket';

export function useSocket(
  onUpdate: (data: any) => void,
  setPlayerId: (id: string | undefined) => void,
) {
  useEffect(() => {
    socket.connect();

    socket.on('connect', () => {
      return setPlayerId(socket.id);
    });

    socket.on('updateState', onUpdate);

    return () => {
      socket.disconnect();
      socket.off('connect');
      socket.off('updateState');
    };
  }, [onUpdate, setPlayerId]);
}
