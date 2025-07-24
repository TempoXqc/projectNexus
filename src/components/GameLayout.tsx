import { GameState, Card } from '@tempoxqc/project-nexus-types';
import { memo, ReactNode, useEffect, useState } from 'react';
import InitialDrawModal from './InitialDrawModal.tsx';
import CounterPlayer from '@/components/CounterPlayer.tsx';
import PhaseIndicator from '@/components/PhaseIndicator.tsx';
import PlayerField from '@/components/PlayerField.tsx';
import PlayerHand from '@/components/PlayerHand.tsx';
import OpponentField from '@/components/OpponentField.tsx';
import PlayerDeck from '@/components/PlayerDeck.tsx';
import OpponentHand from '@/components/OpponentHand.tsx';
import PlayerGraveyard from '@/components/PlayerGraveyard.tsx';
import PlayerTokenZone from '@/components/PlayerTokenZone.tsx';
import OpponentDeck from '@/components/OpponentDeck.tsx';
import OpponentGraveyard from '@/components/OpponentGraveyard.tsx';
import OpponentTokenZone from '@/components/OpponentTokenZone.tsx';
import CardPreview from '@/components/CardPreview.tsx';
import ChatBox from '@/components/ChatBox.tsx';
import DeckSelection from '@/components/DeckSelection.tsx';
import CounterOpponentPlayer from '@/components/CounterOpponentPlayer.tsx';
import Modal from '@/components/Modal.tsx';
import { toast } from 'react-toastify';

interface GameLayoutProps {
  state: GameState;
  set: (updates: Partial<GameState> | ((prev: GameState) => Partial<GameState>)) => void;
  fieldKey: string;
  playerId: number | null;
  gameId: string | undefined;
  socket: any;
  sendChatMessage: () => void;
  handlePhaseChange: (newPhase: 'Standby' | 'Main' | 'Battle' | 'End') => void;
  handleDeckChoice: (deckId: string) => void;
  handleReadyClick: () => void;
  handleKeepInitialHand: () => void;
  handleDoMulligan: () => void;
  setHoveredCardId: (id: string | null) => void;
  setIsHandHovered: (val: boolean) => void;
  removeCardFromField: (index: number) => void;
  exhaustCard: (index: number) => void;
  attackCard: (index: number) => void;
  discardCardFromHand: (card: Card) => void;
  playCardToField: (card: Card) => void;
  addToDeck: (card: Card) => void;
  drawCard: () => void;
  shuffleDeck: () => void;
  updateLifePoints: (newValue: number) => void;
  updateTokenCount: (newValue: number) => void;
  setHoveredTokenId: (id: string | null) => void;
  addAssassinTokenToOpponentDeck: () => void;
  placeAssassinTokenAtOpponentDeckBottom: () => void;
  setGraveyardOpen: (isOpen: boolean) => void;
  setOpponentGraveyardOpen: (isOpen: boolean) => void;
  setTokenZoneOpen: (isOpen: boolean) => void;
  setOpponentTokenZoneOpen: (isOpen: boolean) => void;
  setChatInput: (input: string) => void;
  deckSelectionData: { player1DeckId: string[] | string | null; player2DeckIds: string[]; selectedDecks: string[] } | null;
  backcard: { id: string; name: string; image: string } | null;
  children?: ReactNode;
  playmats: { id: string; name: string; image: string }[];
  lifeToken: { id: string; name: string; image: string } | null;
  revealedCards: Card[];
  onSelectChoice: (cardId: string, choice: string) => void;
  onReorderRevealedCards: (cardIds: string[]) => void;
  onSelectSplitDamageTargets: (targets: any[]) => void;
  isStateInitialized: boolean;
}

const GameLayout = memo(
  ({
     state,
     set,
     fieldKey,
     playerId,
     gameId,
     socket,
     sendChatMessage,
     handlePhaseChange,
     handleDeckChoice,
     handleReadyClick,
     handleKeepInitialHand,
     handleDoMulligan,
     setHoveredCardId,
     setIsHandHovered,
     removeCardFromField,
     exhaustCard,
     attackCard,
     discardCardFromHand,
     playCardToField,
     addToDeck,
     drawCard,
     shuffleDeck,
     updateLifePoints,
     updateTokenCount,
     setHoveredTokenId,
     addAssassinTokenToOpponentDeck,
     placeAssassinTokenAtOpponentDeckBottom,
     setGraveyardOpen,
     setOpponentGraveyardOpen,
     setTokenZoneOpen,
     setOpponentTokenZoneOpen,
     setChatInput,
     deckSelectionData,
     backcard,
     playmats = [],
     lifeToken,
     revealedCards,
     onSelectChoice,
     onReorderRevealedCards,
     onSelectSplitDamageTargets,
    isStateInitialized
   }: GameLayoutProps) => {
    const playerPlaymat = playmats.length >= 2 ? playmats.find(p => p.id === 'playmat_bottom') || null : null;
    const opponentPlaymat = playmats.length >= 2 ? playmats.find(p => p.id === 'playmat_top') || null : null;
    const [choiceModal, setChoiceModal] = useState<{ cardId: string; options: { title: string; actions: any[] }[] } | null>(null);
    const [splitDamageModal, setSplitDamageModal] = useState<{ amount: number; targets: any[] } | null>(null);

    // Gestion des choix interactifs
    useEffect(() => {
      socket.on('requestChoice', (data) => {
        setChoiceModal(data);
        // Attendre la réponse de l'utilisateur via la modale
      });

      socket.on('selectSplitDamageTargets', (data) => {
        setSplitDamageModal(data);
        // Attendre la réponse de l'utilisateur via la modale
      });

      socket.on('reorderRevealedCards', (data, callback) => {
        set({ ui: { ...state.ui, isReorderCardsOpen: true } });
        // Simuler une réorganisation (à remplacer par une interaction utilisateur réelle)
        callback(data.cards.map((card: Card) => card.id));
      });

      return () => {
        socket.off('requestChoice');
        socket.off('selectSplitDamageTargets');
        socket.off('reorderRevealedCards');
      };
    }, [socket, onSelectChoice, onSelectSplitDamageTargets, set, state.ui]);

    return (
      <div className="w-full min-h-screen flex flex-row relative overflow-hidden bg-black" role="main" aria-label="Interface de jeu">
        {playerPlaymat && (
          <div
            className="absolute bottom-0 left-0 w-full h-[50vh] flex justify-center"
            style={{ zIndex: 0 }}
          >
            <img
              src={playerPlaymat.image}
              className="w-[55vw] h-full object-contain object-center max-w-[1600px]"
              style={{
                maxWidth: '1600px',
                maxHeight: '918px',
              }}
              alt={`Playmat ${playerPlaymat.name}`}
              aria-label={`Playmat ${playerPlaymat.name}`}
            />
          </div>
        )}
        {opponentPlaymat && (
          <div
            className="absolute top-0 left-0 w-full h-[50vh] flex justify-center"
            style={{ zIndex: 0 }}
          >
            <img
              src={opponentPlaymat.image}
              className="w-[55vw] h-full object-contain object-center max-w-[1600px]"
              style={{
                maxWidth: '1600px',
                maxHeight: '918px',
              }}
              alt={`Playmat adverse ${opponentPlaymat.name}`}
              aria-label={`Playmat adverse ${opponentPlaymat.name}`}
            />
          </div>
        )}
        {!state.deckSelection.bothReady && (
          <DeckSelection
            randomizers={state.deckSelection.randomizers}
            selectedDecks={state.deckSelection.selectedDecks}
            player1DeckId={state.deckSelection.player1DeckId}
            hasChosenDeck={state.deckSelection.hasChosenDeck}
            isReady={state.deckSelection.isReady}
            opponentReady={state.deckSelection.opponentReady}
            onDeckChoice={handleDeckChoice}
            onReadyClick={handleReadyClick}
            playerId={playerId}
            waitingForPlayer1={state.deckSelection.waitingForPlayer1}
            deckSelectionData={deckSelectionData}
          />
        )}
        {state.deckSelection.deckSelectionDone && state.deckSelection.bothReady && state.deckSelection.initialDraw.length > 0 && !state.deckSelection.mulliganDone && (
          <InitialDrawModal
            initialDraw={state.deckSelection.initialDraw}
            selectedForMulligan={state.deckSelection.selectedForMulligan}
            mulliganDone={state.deckSelection.mulliganDone}
            bothReady={state.deckSelection.bothReady}
            onToggleCardMulligan={(cardId: string) =>
              set((prev) => ({
                ...prev,
                deckSelection: {
                  ...prev.deckSelection,
                  selectedForMulligan: prev.deckSelection.selectedForMulligan.includes(cardId)
                    ? prev.deckSelection.selectedForMulligan.filter((id) => id !== cardId)
                    : [...prev.deckSelection.selectedForMulligan, cardId],
                },
              }))
            }
            onKeepInitialHand={handleKeepInitialHand}
            onDoMulligan={handleDoMulligan}
          />
        )}
        {state.game.gameOver && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75 z-50" role="dialog" aria-label="Fin de partie">
            <div className="bg-gray-800 p-6 rounded-lg text-white text-center">
              <h2 className="text-2xl font-bold mb-4">
                {state.game.winner === (playerId === 1 ? 'player1' : 'player2')
                  ? 'Victoire !'
                  : 'Défaite !'}
              </h2>
              <button
                onClick={() => (window.location.href = '/')}
                className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded"
                aria-label="Retour à l'accueil"
              >
                Retour à l'accueil
              </button>
            </div>
          </div>
        )}
        <div
          className={`flex-grow min-h-screen flex flex-col justify-end items-center p-4 relative z-10 ${
            !state.ui.isRightPanelOpen ? 'w-full' : 'w-[85%]'
          }`}
          role="region"
          aria-label="Zone de jeu principale"
        >
          <div
            style={{
              position: 'absolute',
              top: '5%',
              left: '85%',
              transform: 'translateX(-50%)',
            }}
          >
            <CounterOpponentPlayer
              playerId={playerId}
              gameId={gameId}
              opponentCounter={state.opponent.nexus.health}
              lifeToken={lifeToken}
            />
          </div>
          <div
            style={{
              position: 'absolute',
              top: '85%',
              left: '85%',
              transform: 'translate(-50%, -50%)',
            }}
          >
            <CounterPlayer
              playerId={playerId}
              gameId={gameId}
              counter={state.player.nexus.health}
              updateCounter={updateLifePoints}
              lifeToken={lifeToken}
            />
          </div>
          <div className="z-30">
            <PhaseIndicator
              socket={socket}
              isMyTurn={state.game.isMyTurn}
              playerId={playerId}
              gameId={gameId}
              onPhaseChange={handlePhaseChange}
              currentPhase={state.game.currentPhase}
              turn={state.game.turn}
            />
            <PlayerField
              key={fieldKey}
              field={state.player.field}
              hoveredCardId={state.ui.hoveredCardId}
              setHoveredCardId={setHoveredCardId}
              removeCardFromField={removeCardFromField}
              exhaustCard={exhaustCard}
              attackCard={attackCard}
            />
            {!isStateInitialized ? (
              <div className="flex justify-center items-center h-screen">
                <p>Chargement de la partie...</p>
              </div>
            ) : (
              <div>
                <div className="action-points-display">
                  <p>Points d'action restants : {state.player.actionPoints || 0}</p>
                </div>
                <PlayerHand
                  hand={state.player.hand}
                  hoveredCardId={state.ui.hoveredCardId}
                  setHoveredCardId={setHoveredCardId}
                  isHandHovered={state.ui.isCardHovered}
                  setIsHandHovered={setIsHandHovered}
                  discardCardFromHand={discardCardFromHand}
                  playCardToField={
                    isStateInitialized && state.connection.gameId
                      ? playCardToField
                      : () => toast.error('Partie non initialisée ou ID de partie manquant.', { toastId: 'game_not_initialized' })
                  }
                  addToDeck={addToDeck}
                  playerId={playerId}
                  isMyTurn={state.game?.isMyTurn || false}
                  currentPhase={state.game?.currentPhase || 'Standby'}
                  isStateInitialized={isStateInitialized}
                />
              </div>
            )}
            <OpponentField
              opponentField={state.opponent.field}
              hoveredCardId={state.ui.hoveredCardId}
              setHoveredCardId={setHoveredCardId}
            />
            <OpponentHand opponentHand={state.opponent.hand} backcardImage={backcard?.image} />
          </div>

          <div className="z-30 absolute left-4 bottom-2 flex gap-4" role="region" aria-label="Zone de deck et cimetière du joueur">
            <PlayerDeck
              count={state.player.deck.length}
              handCount={state.player.hand.length}
              drawCard={drawCard}
              shuffleDeck={shuffleDeck}
              backcardImage={backcard?.image}
            />
            <PlayerGraveyard
              count={state.player.graveyard.length}
              onClick={() => setGraveyardOpen(true)}
              isOpen={state.ui.isGraveyardOpen}
              onClose={() => setGraveyardOpen(false)}
              graveyard={state.player.graveyard}
              hoveredCardId={state.ui.hoveredCardId}
              setHoveredCardId={setHoveredCardId}
              backcardImage={backcard?.image}
            />
            <PlayerTokenZone
              tokenCount={state.player.tokenCount || 0}
              tokenType={state.player.tokenType}
              onClick={() => setTokenZoneOpen(true)}
              isOpen={state.ui.isTokenZoneOpen}
              onClose={() => setTokenZoneOpen(false)}
              updateTokenCount={updateTokenCount}
              setHoveredTokenId={setHoveredTokenId}
              addAssassinTokenToOpponentDeck={addAssassinTokenToOpponentDeck}
              placeAssassinTokenAtOpponentDeckBottom={placeAssassinTokenAtOpponentDeckBottom}
              gameId={gameId}
              playerId={playerId}
              opponentDeck={state.opponent.deck}
            />
          </div>

          {!state.ui.isTokenZoneOpen && (
            <div className="z-30 absolute left-4 top-2 flex gap-4" role="region" aria-label="Zone de deck et cimetière adverse">
              <OpponentDeck count={state.opponent.deck.length} backcardImage={backcard?.image} />
              <OpponentGraveyard
                count={state.opponent.graveyard.length}
                onClick={() => setOpponentGraveyardOpen(true)}
                isOpen={state.ui.isOpponentGraveyardOpen}
                onClose={() => setOpponentGraveyardOpen(false)}
                graveyard={state.opponent.graveyard}
                hoveredCardId={state.ui.hoveredCardId}
                setHoveredCardId={setHoveredCardId}
                backcardImage={backcard?.image}
              />
              <OpponentTokenZone
                tokenCount={state.opponent.tokenCount || 0}
                tokenType={state.opponent.tokenType}
                onClick={() => setOpponentTokenZoneOpen(true)}
                isOpen={state.ui.isOpponentTokenZoneOpen}
                onClose={() => setOpponentTokenZoneOpen(false)}
              />
            </div>
          )}

          <CardPreview
            hoveredCardId={state.ui.hoveredCardId}
            field={state.player.field}
            hand={state.player.hand}
            opponentField={state.opponent.field}
            graveyard={state.ui.isGraveyardOpen ? state.player.graveyard : undefined}
            opponentGraveyard={state.ui.isOpponentGraveyardOpen ? state.opponent.graveyard : undefined}
            isGraveyardOpen={state.ui.isGraveyardOpen}
            isOpponentGraveyardOpen={state.ui.isOpponentGraveyardOpen}
            mulliganDone={state.deckSelection.mulliganDone}
          />

          {state.ui.isRevealedCardsOpen && (
            <Modal
              isOpen={state.ui.isRevealedCardsOpen}
              onClose={() => set({ ui: { ...state.ui, isRevealedCardsOpen: false } })}
              onOutsideClick={() => set({ ui: { ...state.ui, isRevealedCardsOpen: false } })}
              title="Cartes révélées"
              width="720px"
            >
              <div className="flex flex-wrap gap-4 justify-center relative">
                {revealedCards.length > 0 ? (
                  revealedCards.map((card) => (
                    <div
                      key={card.id}
                      onMouseEnter={() => setHoveredCardId(card.id)}
                      onMouseLeave={() => setHoveredCardId(null)}
                      className="relative w-[100px] h-[140px] rounded"
                    >
                      <img
                        src={card.image.fr}
                        alt={card.name.fr}
                        className="w-full h-full object-cover rounded shadow"
                      />
                      {card.stealthed && (
                        <span className="absolute top-2 left-2 bg-green-500 text-white text-xs rounded px-1">Furtif</span>
                      )}
                      {card.keywords && card.keywords.length > 0 && (
                        <span className="absolute top-2 right-2 bg-blue-500 text-white text-xs rounded px-1">{card.keywords.join(', ')}</span>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-center text-gray-500">Aucune carte révélée.</p>
                )}
              </div>
              <button
                onClick={() => onReorderRevealedCards(revealedCards.map((card) => card.id))}
                className="mt-4 w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Réorganiser les cartes
              </button>
            </Modal>
          )}

          {choiceModal && (
            <Modal
              isOpen={!!choiceModal}
              onClose={() => setChoiceModal(null)}
              onOutsideClick={() => setChoiceModal(null)}
              title="Choisir une option"
              width="500px"
            >
              <div className="flex flex-col gap-4">
                {choiceModal.options.map((option, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      onSelectChoice(choiceModal.cardId, option.title);
                      setChoiceModal(null);
                    }}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    {option.title}
                  </button>
                ))}
              </div>
            </Modal>
          )}

          {splitDamageModal && (
            <Modal
              isOpen={!!splitDamageModal}
              onClose={() => setSplitDamageModal(null)}
              onOutsideClick={() => setSplitDamageModal(null)}
              title="Sélectionner les cibles pour les dégâts"
              width="720px"
            >
              <div className="flex flex-wrap gap-4 justify-center relative">
                {splitDamageModal.targets.map((target, index) => (
                  <div
                    key={index}
                    onClick={() => {
                      onSelectSplitDamageTargets([target]);
                      setSplitDamageModal(null);
                    }}
                    className="relative w-[100px] h-[140px] rounded cursor-pointer"
                  >
                    <img
                      src={target.type === 'nexus' ? lifeToken?.image : target.image.fr}
                      alt={target.type === 'nexus' ? 'Nexus' : target.name.fr}
                      className="w-full h-full object-cover rounded shadow"
                    />
                  </div>
                ))}
              </div>
            </Modal>
          )}
        </div>

        <div className="chatbox-container" role="region" aria-label="Zone de chat">
          <ChatBox
            chatMessages={state.chat.messages}
            chatInput={state.chat.input}
            setChatInput={setChatInput}
            sendChatMessage={sendChatMessage}
            playerId={playerId}
            isConnected={state.connection.isConnected}
            gameId={gameId}
            turn={state.game.turn}
            isMyTurn={state.game.isMyTurn}
          />
        </div>
      </div>
    );
  },
);

export default GameLayout;