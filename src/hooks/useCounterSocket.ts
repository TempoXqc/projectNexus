// import { useEffect } from 'react';
// import { Socket } from 'socket.io-client';
//
// export function useCounterSocket(socket: Socket, playerId: number | null, gameId: string | undefined, setCounter: (value: number) => void) {
//   useEffect(() => {
//     if (!socket || !gameId) return;
//
//     const handleUpdateCounter = (data: { gameId: string; playerId: number; value: number }) => {
//       if (data.gameId === gameId && playerId !== null && data.playerId !== playerId) {
//         setCounter(data.value);
//       } else if (playerId === null) {
//         setCounter(data.value);
//       }
//     };
//
//     socket.on('updateCounter', handleUpdateCounter);
//
//     return () => {
//       socket.off('updateCounter', handleUpdateCounter);
//     };
//   }, [socket, playerId, gameId, setCounter]);
// }