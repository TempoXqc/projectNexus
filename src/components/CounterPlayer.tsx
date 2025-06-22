//
// import React from 'react';
//
// interface CounterPlayerProps {
//   playerId: number | null;
//   gameId: string | undefined;
//   counter: number;
//   updateCounter: (value: number) => void;
// }
//
// export default function CounterComponent({ playerId, gameId, counter, updateCounter }: CounterPlayerProps) {
//   const increment = () => {
//     if (counter < 30 && gameId && playerId) {
//       const newValue = counter + 1;
//       updateCounter(newValue);
//     }
//   };
//
//   const decrement = () => {
//     if (counter > 0 && gameId && playerId) {
//       const newValue = counter - 1;
//       updateCounter(newValue);
//     }
//   };
//
//   return (
//     <div className="flex items-center justify-center gap-4 p-2 bg-gray-800 rounded-lg shadow-md z-30" style={{ position: 'absolute', top: '76%', left: '50%', transform: 'translate(-50%, -50%)' }}>
//       <button
//         onClick={decrement}
//         className="bg-red-500 text-white p-2 rounded-full hover:bg-red-600 focus:outline-none disabled:opacity-50"
//         disabled={counter <= 0}
//       >
//         -
//       </button>
//       <span className="text-white text-xl font-bold">{counter}</span>
//       <button
//         onClick={increment}
//         className="bg-green-500 text-white p-2 rounded-full hover:bg-green-600 focus:outline-none disabled:opacity-50"
//         disabled={counter >= 30}
//       >
//         +
//       </button>
//     </div>
//   );
// }