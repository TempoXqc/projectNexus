import React from 'react';

export default function OpponentGraveyard({ count }: { count: number }) {
  return (
    <div
      className="w-[120px] h-[180px] flex items-center justify-center border-2 border-gray-500 bg-gray-800 rounded relative"
    >
      <img
        src="/addons/backcard.png"
        alt="Opponent PlayerGraveyard"
        className="w-full h-full object-cover rounded grayscale"
      />
      <span className="absolute text-white font-bold text-[2rem]">{count}</span>
    </div>
  );
}
