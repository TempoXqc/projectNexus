interface CounterPlayerProps {
  playerId: number | null | undefined;
  gameId: string | undefined;
  counter: number;
  updateCounter: (value: number) => void;
  lifeToken: { id: string; name: string; image: string } | null;
}

export default function CounterPlayer(
  {
    counter,
    lifeToken
  }: CounterPlayerProps)
{
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
          paddingLeft: '1rem',
          fontStyle: '1.5vh'
        }}
      >
        <div className="flex items-center justify-center gap-4">
          <span className="text-white text-1xl font-bold">
            {counter}
          </span>
        </div>
      </div>
    </div>
  );
}