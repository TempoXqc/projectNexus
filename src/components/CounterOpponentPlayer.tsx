
interface OpponentCounterProps {
  playerId: number | null | undefined;
  gameId: string | undefined;
  opponentCounter: number;
  lifeToken: { id: string; name: string; image: string } | null;
  attackingCardId: string | null;  // New
  hoveredTarget: { type: 'card' | 'nexus'; id?: string } | null;  // New
  setHoveredTarget: (target: { type: 'card' | 'nexus'; id?: string } | null) => void;  // New
  onConfirmAttack: (target: { type: 'card' | 'nexus'; id?: string }) => void;  // New
}

export default function CounterOpponentPlayer({
                                                opponentCounter,
                                                lifeToken,
                                                attackingCardId,
                                                hoveredTarget,
                                                setHoveredTarget,
                                                onConfirmAttack
                                              }: OpponentCounterProps) {
  return (
    <div
      className={`relative flex items-center justify-center p-2 rounded-lg z-30 ${attackingCardId && hoveredTarget?.type === 'nexus' ? 'border-4 border-red-500 animate-pulse' : ''}`}
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
      onMouseEnter={() => {
        if (attackingCardId) setHoveredTarget({ type: 'nexus' });
      }}
      onMouseLeave={() => {
        if (attackingCardId) setHoveredTarget(null);
      }}
      onClick={() => {
        if (attackingCardId) onConfirmAttack({ type: 'nexus' });
      }}
      role="button"
      tabIndex={0}
      aria-label="Target Nexus for attack"
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