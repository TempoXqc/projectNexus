import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import OpponentField from '../components/OpponentField';
import OpponentHand from '../components/OpponentHand';
import PlayerField from '../components/PlayerField';
import ChatBox from '../components/chatbox/ChatBox';
import PlayerGraveyard from '../components/PlayerGraveyard';
import PlayerHand from '../components/PlayerHand';
import PlayerDeck from '../components/PlayerDeck';
import OpponentDeck from '../components/OpponentDeck';
import OpponentGraveyard from '../components/OpponentGraveyard';
import CardPreview from '../components/CardPreview';
import PhaseIndicator from '../components/PhaseIndicator';
import DeckSelection from '../components/DeckSelection';
import InitialDrawModal from '../components/InitialDrawModal';
import { useGameState } from '../hooks/useGameState';
import { useGameSocket } from '../hooks/useGameSocket';

export default function Game() {
  const { gameId } = useParams();
  const {
    state,
    set,
    removeCardFromField,
    discardCardFromHand,
    playCardToField,
    exhaustCard,
    attackCard,
    addToDeck,
    drawCard,
    shuffleDeck,
    toggleCardMulligan,
    doMulligan,
    keepInitialHand,
    handleDeckChoice,
    handleReadyClick,
    initializeDeck,
  } = useGameState();
  const { socket, emit } = useGameSocket(
    gameId,
    set,
    state.playerId,
    state.isConnected,
    state.chatMessages,
  );

  useEffect(() => {
      if (
        state.deckSelectionData &&
        state.bothReady &&
        !state.deckSelectionDone &&
        state.playerId !== null
      ) {

      }
    }, [
    state.deckSelectionData,
    state.bothReady,
    state.deckSelectionDone,
    state.playerId,
    gameId,
    state.isConnected,
    emit,
    set,
  ]);

  useEffect(() => {
    if (gameId) {
      initializeDeck(gameId, emit);
    }
  }, [gameId, initializeDeck, emit]);

  const sendChatMessage = () => {
    if (state.chatInput.trim() && gameId && state.isConnected) {
      emit('sendMessage', { gameId, message: state.chatInput });
      set({ chatInput: '' });
    }
  };

  const handlePhaseChange = (newPhase: 'Standby' | 'Main' | 'Battle' | 'End') => {
    set({ currentPhase: newPhase });
  };

  return (
    <div className="w-full min-h-screen flex flex-row relative overflow-hidden">
      {!state.deckSelectionDone && (
        <DeckSelection
          randomizers={state.randomizers}
          selectedDecks={state.selectedDecks}
          player1DeckId={state.player1DeckId}
          hasChosenDeck={state.hasChosenDeck}
          isReady={state.isReady}
          opponentReady={state.opponentReady}
          onDeckChoice={(deckId) => {
            const result = handleDeckChoice(deckId, gameId);
            if (result && gameId) {
              emit('chooseDeck', {
                gameId,
                playerId: state.playerId,
                deckId,
              });
            }
          }}
          onReadyClick={() => {
            const result = handleReadyClick(gameId);
            if (result && gameId) {
              emit('playerReady', { gameId, playerId: state.playerId });
            }
          }}
        />
      )}
      <InitialDrawModal
        initialDraw={state.initialDraw}
        selectedForMulligan={state.selectedForMulligan}
        mulliganDone={state.mulliganDone}
        bothReady={state.bothReady}
        onToggleCardMulligan={toggleCardMulligan}
        onKeepInitialHand={() => {
          const result = keepInitialHand();
          if (result && gameId && state.isConnected) {
            emit('updateGameState', {
              gameId,
              state: result,
            });
          }
        }}
        onDoMulligan={() => {
          const result = doMulligan();
          if (result && gameId && state.isConnected) {
            emit('updateGameState', {
              gameId,
              state: result,
            });
          }
        }}
      />
      <div className="w-full min-h-screen flex flex-row overflow-hidden">
        <div
          className={`flex-grow min-h-screen flex flex-col justify-end items-center p-4 relative z-10 ${!state.isRightPanelOpen ? 'w-full' : 'w-[85%]'}`}
          style={{
            backgroundImage: 'url(/addons/background-2.jpg)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            transition: 'width 0.3s ease-in-out',
          }}
        >
          <div className="z-30">
            <PhaseIndicator
              socket={socket}
              isMyTurn={state.isMyTurn}
              playerId={state.playerId}
              gameId={gameId}
              onPhaseChange={handlePhaseChange}
              currentPhase={state.currentPhase}
              turn={state.turn}
            />
            <PlayerField
              key={state.field.map((c) => c?.exhausted).join('-')}
              field={state.field}
              hoveredCardId={state.hoveredCardId}
              setHoveredCardId={(id) => set({ hoveredCardId: id })}
              removeCardFromField={(index) => {
                const result = removeCardFromField(index);
                if (result && gameId && state.isConnected) {
                  emit('updateGameState', {
                    gameId,
                    state: result,
                  });
                }
              }}
              exhaustCard={(index) => {
                const result = exhaustCard(index);
                if (result && gameId && state.isConnected) {
                  emit('exhaustCard', {
                    gameId,
                    cardId: result.cardId,
                    fieldIndex: result.fieldIndex,
                  });
                }
              }}
              attackCard={(index) => {
                const result = attackCard(index);
                if (result && gameId && state.isConnected) {
                  emit('attackCard', { gameId, cardId: result.cardId });
                }
              }}
            />
            <PlayerHand
              hand={state.hand}
              hoveredCardId={state.hoveredCardId}
              setHoveredCardId={(id) => set({ hoveredCardId: id })}
              isHandHovered={state.isCardHovered}
              setIsHandHovered={(val) => set({ isCardHovered: val })}
              mustDiscard={state.mustDiscard}
              discardCardFromHand={(card) => {
                const result = discardCardFromHand(card);
                if (result && gameId && state.isConnected) {
                  emit('updateGameState', {
                    gameId,
                    state: result,
                  });
                }
              }}
              playCardToField={(card) => {
                const result = playCardToField(card);
                if (result && gameId && state.isConnected) {
                  emit('playCard', {
                    gameId,
                    card: result.card,
                    fieldIndex: result.fieldIndex,
                  });
                }
              }}
              addToDeck={(card) => {
                const result = addToDeck(card);
                if (result && gameId && state.isConnected) {
                  emit('updateGameState', {
                    gameId,
                    state: result,
                  });
                }
              }}
              playerId={state.playerId}
            />
            <OpponentField
              opponentField={state.opponentField}
              hoveredCardId={state.hoveredCardId}
              setHoveredCardId={(id) => set({ hoveredCardId: id })}
            />
            <OpponentHand opponentHand={state.opponentHand} />
          </div>

          <div className="z-30 absolute left-4 bottom-2 flex gap-4">
            <PlayerDeck
              count={state.deck.length}
              handCount={state.hand.length}
              drawCard={() => {
                const result = drawCard();
                if (result && gameId && state.isConnected) {
                  emit('updateGameState', {
                    gameId,
                    state: result,
                  });
                }
              }}
              shuffleDeck={() => {
                const result = shuffleDeck();
                if (result && gameId && state.isConnected) {
                  emit('updateGameState', {
                    gameId,
                    state: result,
                  });
                }
              }}
            />
            <PlayerGraveyard
              count={state.graveyard.length}
              onClick={() => set({ isGraveyardOpen: true })}
              isOpen={state.isGraveyardOpen}
              onClose={() => set({ isGraveyardOpen: false })}
              graveyard={state.graveyard}
              hoveredCardId={state.hoveredCardId}
              setHoveredCardId={(id) => set({ hoveredCardId: id })}
            />
          </div>

          <div className="z-30 absolute left-4 top-2 flex gap-4">
            <OpponentDeck count={state.opponentDeck.length} />
            <OpponentGraveyard
              count={state.opponentGraveyard.length}
              onClick={() => set({ isOpponentGraveyardOpen: true })}
              isOpen={state.isOpponentGraveyardOpen}
              onClose={() => set({ isOpponentGraveyardOpen: false })}
              graveyard={state.opponentGraveyard}
              hoveredCardId={state.hoveredCardId}
              setHoveredCardId={(id) => set({ hoveredCardId: id })}
            />
          </div>

          <CardPreview
            hoveredCardId={state.hoveredCardId}
            field={state.field}
            hand={state.hand}
            opponentField={state.opponentField}
          />
        </div>

        <div className="chatbox-container">
          <ChatBox
            chatMessages={state.chatMessages}
            chatInput={state.chatInput}
            setChatInput={(input) => set({ chatInput: input })}
            sendChatMessage={sendChatMessage}
            playerId={state.playerId}
            isConnected={state.isConnected}
            gameId={gameId}
            turn={state.turn}
            isMyTurn={state.isMyTurn}
          />
        </div>
      </div>
    </div>
  );
}