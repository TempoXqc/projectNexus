
interface OpponentCounterProps {
  playerId: number | null | undefined;
  gameId: string | undefined;
  opponentCounter: number;
}

export default function CounterOpponentPlayer({ opponentCounter }: OpponentCounterProps) {
  return (
    <div
      className="relative flex items-center justify-center p-2 rounded-lg shadow-md z-30"
      style={{
        backgroundImage: 'url(/addons/lifetoken.png)',
        backgroundSize: 'contain',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
        width: '150px',
        height: '150px',
      }}
    >
      <span
        className="absolute text-white text-5xl font-bold"
        style={{
          top: '50%',
          left: '55%',
          transform: 'translate(-50%, -50%)',
        }}
      >
        {opponentCounter}
      </span>
    </div>
  );
}