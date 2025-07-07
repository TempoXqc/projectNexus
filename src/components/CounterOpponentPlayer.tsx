
interface OpponentCounterProps {
  playerId: number | null | undefined;
  gameId: string | undefined;
  opponentCounter: number;
  lifeToken: { id: string; name: string; image: string } | null;
}

export default function CounterOpponentPlayer({ opponentCounter, lifeToken }: OpponentCounterProps) {
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