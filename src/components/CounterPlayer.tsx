interface CounterPlayerProps {
  playerId: number | null | undefined;
  gameId: string | undefined;
  counter: number;
  updateCounter: (value: number) => void;
}

export default function CounterPlayer({ playerId, gameId, counter, updateCounter }: CounterPlayerProps) {
  const increment = () => {
    if (counter < 30 && gameId && playerId) {
      const newValue = counter + 1;
      updateCounter(newValue);
    }
  };

  const decrement = () => {
    if (counter > 0 && gameId && playerId) {
      const newValue = counter - 1;
      updateCounter(newValue);
    }
  };

  return (
    <div
      className="relative flex items-center justify-center p-2 rounded-lg shadow-md z-30"
      style={{
        backgroundImage: 'url(/addons/lifetoken.png)',
        backgroundSize: 'contain',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
        width: '300px', // Augmenté pour accueillir les boutons et le chiffre
        height: '150px', // Ajustez selon la taille de votre image
      }}
    >
      <div className="flex items-center justify-center w-full h-full">
        <button
          onClick={decrement}
          className="bg-red-500 text-white p-2 rounded-full hover:bg-red-600 focus:outline-none disabled:opacity-50"
          disabled={counter <= 0}
        >
          -
        </button>
        <span className="text-white text-5xl font-bold mx-4">
          {counter}
        </span>
        <button
          onClick={increment}
          className="bg-green-500 text-white p-2 rounded-full hover:bg-green-600 focus:outline-none disabled:opacity-50"
          disabled={counter >= 30}
        >
          +
        </button>
      </div>
    </div>
  );
}