interface CounterPlayerProps {
  playerId: number | null | undefined;
  gameId: string | undefined;
  counter: number;
  updateCounter: (value: number) => void;
  lifeToken: { id: string; name: string; image: string } | null;
}

export default function CounterPlayer({ playerId, gameId, counter, updateCounter, lifeToken }: CounterPlayerProps) {
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
      className="relative flex items-center justify-center p-2 rounded-lg z-30"
      style={{
        backgroundImage: lifeToken ? `url(${lifeToken.image})` : 'url(https://res.cloudinary.com/dsqxexeam/image/upload/v1751913421/lifetoken_mhgzuj.png)',
        backgroundSize: 'contain',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
        width: '15.625vw',
        maxWidth: '400px',
        height: '7.8125vw',
        maxHeight: '200px',
      }}
    >
      <div
        className="flex flex-col items-center justify-end w-full h-full"
        style={{
          paddingBottom: '0.5rem',
        }}
      >
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={decrement}
            className="bg-red-500 text-white p-2 rounded-full hover:bg-red-600 focus:outline-none disabled:opacity-50"
            disabled={counter <= 0}
          >
            -
          </button>
          <span className="text-white text-1xl font-bold">
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
    </div>
  );
}