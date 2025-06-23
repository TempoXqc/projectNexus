import React, { useCallback, useEffect, useMemo } from 'react';
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
import { Card } from '../types/Card';

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
    state.connection.playerId,
    state.connection.isConnected,
    state.chat.messages,
  );

  useEffect(() => {
    if (gameId) {
      initializeDeck(gameId, emit);
    }
  }, [gameId, initializeDeck, emit]);

  const sendChatMessage = useCallback(() => {
    if (state.chat.input.trim() && gameId && state.connection.isConnected) {
      emit('sendMessage', { gameId, message: state.chat.input });
      set({ chat: { input: '' } });
    }
  }, [state.chat.input, gameId, state.connection.isConnected, emit, set]);

  const handlePhaseChange = useCallback(
    (newPhase: 'Standby' | 'Main' | 'Battle' | 'End') => {
      set({ game: { currentPhase: newPhase } });
    },
    [set],
  );

  const handleDeckChoiceCallback = useCallback(
    (deckId: string) => {
      const result = handleDeckChoice(deckId, gameId);
      if (result && gameId) {
        emit('chooseDeck', {
          gameId,
          playerId: state.connection.playerId,
          deckId,
        });
      }
    },
    [handleDeckChoice, gameId, emit, state.connection.playerId],
  );

  const handleReadyClickCallback = useCallback(() => {
    const result = handleReadyClick(gameId);
    if (result && gameId) {
      emit('playerReady', { gameId, playerId: state.connection.playerId });
    }
  }, [handleReadyClick, gameId, emit, state.connection.playerId]);

  const handleKeepInitialHand = useCallback(() => {
    const result = keepInitialHand();
    if (result && gameId && state.connection.isConnected) {
      emit('updateGameState', {
        gameId,
        state: { hand: result.hand, deck: state.player.deck },
      });
    }
  }, [keepInitialHand, gameId, state.connection.isConnected, state.player.deck, emit]);

  const handleDoMulligan = useCallback(() => {
    const result = doMulligan();
    if (result && gameId && state.connection.isConnected) {
      emit('updateGameState', {
        gameId,
        state: { hand: result.hand, deck: result.deck },
      });
    }
  }, [doMulligan, gameId, state.connection.isConnected, emit]);

  const setHoveredCardId = useCallback(
    (id: string | null) => {
      set({ ui: { hoveredCardId: id } });
    },
    [set],
  );

  const setIsHandHovered = useCallback(
    (val: boolean) => {
      set({ ui: { isCardHovered: val } });
    },
    [set],
  );

  const handleRemoveCardFromField = useCallback(
    (index: number) => {
      const result = removeCardFromField(index);
      if (result && gameId && state.connection.isConnected) {
        emit('updateGameState', {
          gameId,
          state: { field: result.field, graveyard: result.graveyard },
        });
      }
    },
    [removeCardFromField, gameId, state.connection.isConnected, emit],
  );

  const handleExhaustCard = useCallback(
    (index: number) => {
      const result = exhaustCard(index);
      if (result && gameId && state.connection.isConnected) {
        emit('exhaustCard', {
          gameId,
          cardId: result.cardId,
          fieldIndex: result.fieldIndex,
        });
      }
    },
    [exhaustCard, gameId, state.connection.isConnected, emit],
  );

  const handleAttackCard = useCallback(
    (index: number) => {
      const result = attackCard(index);
      if (result && gameId && state.connection.isConnected) {
        emit('attackCard', { gameId, cardId: result.cardId });
      }
    },
    [attackCard, gameId, state.connection.isConnected, emit],
  );

  const handleDiscardCardFromHand = useCallback(
    (card: Card) => {
      const result = discardCardFromHand(card);
      if (result && gameId && state.connection.isConnected) {
        emit('updateGameState', {
          gameId,
          state: { hand: result.hand, graveyard: result.graveyard },
        });
      }
    },
    [discardCardFromHand, gameId, state.connection.isConnected, emit],
  );

  const handlePlayCardToField = useCallback(
    (card: Card) => {
      const result = playCardToField(card);
      if (result && gameId && state.connection.isConnected) {
        emit('playCard', {
          gameId,
          card: result.card,
          fieldIndex: result.fieldIndex,
        });
      }
    },
    [playCardToField, gameId, state.connection.isConnected, emit],
  );

  const handleAddToDeck = useCallback(
    (card: Card) => {
      const result = addToDeck(card);
      if (result && gameId && state.connection.isConnected) {
        emit('updateGameState', {
          gameId,
          state: { hand: result.hand, deck: result.deck },
        });
      }
    },
    [addToDeck, gameId, state.connection.isConnected, emit],
  );

  const handleDrawCard = useCallback(() => {
    const result = drawCard();
    if (result && gameId && state.connection.isConnected) {
      emit('updateGameState', {
        gameId,
        state: { hand: result.hand, deck: result.deck },
      });
    }
  }, [drawCard, gameId, state.connection.isConnected, emit]);

  const handleShuffleDeck = useCallback(() => {
    const result = shuffleDeck();
    if (result && gameId && state.connection.isConnected) {
      emit('updateGameState', {
        gameId,
        state: { deck: result.deck },
      });
    }
  }, [shuffleDeck, gameId, state.connection.isConnected, emit]);

  const setGraveyardOpen = useCallback(
    (isOpen: boolean) => {
      set({ ui: { isGraveyardOpen: isOpen } });
    },
    [set],
  );

  const setOpponentGraveyardOpen = useCallback(
    (isOpen: boolean) => {
      set({ ui: { isOpponentGraveyardOpen: isOpen } });
    },
    [set],
  );

  const setChatInput = useCallback(
    (input: string) => {
      set({ chat: { input } });
    },
    [set],
  );

  const fieldKey = useMemo(
    () => state.player.field.map((c) => c?.exhausted).join('-'),
    [state.player.field],
  );

  return (
    <div className="w-full min-h-screen flex flex-row relative overflow-hidden">
      {!state.deckSelection.deckSelectionDone && (
        <DeckSelection
          randomizers={state.deckSelection.randomizers}
          selectedDecks={state.deckSelection.selectedDecks}
          player1DeckId={state.deckSelection.player1DeckId}
          hasChosenDeck={state.deckSelection.hasChosenDeck}
          isReady={state.deckSelection.isReady}
          opponentReady={state.deckSelection.opponentReady}
          onDeckChoice={handleDeckChoiceCallback}
          onReadyClick={handleReadyClickCallback}
        />
      )}
      <InitialDrawModal
        initialDraw={state.deckSelection.initialDraw}
        selectedForMulligan={state.deckSelection.selectedForMulligan}
        mulliganDone={state.deckSelection.mulliganDone}
        bothReady={state.deckSelection.bothReady}
        onToggleCardMulligan={toggleCardMulligan}
        onKeepInitialHand={handleKeepInitialHand}
        onDoMulligan={handleDoMulligan}
      />
      <div className="w-full min-h-screen flex flex-row overflow-hidden">
        <div
          className={`flex-grow min-h-screen flex flex-col justify-end items-center p-4 relative z-10 ${
            !state.ui.isRightPanelOpen ? 'w-full' : 'w-[85%]'
          }`}
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
              isMyTurn={state.game.isMyTurn}
              playerId={state.connection.playerId}
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
              removeCardFromField={handleRemoveCardFromField}
              exhaustCard={handleExhaustCard}
              attackCard={handleAttackCard}
            />
            <PlayerHand
              hand={state.player.hand}
              hoveredCardId={state.ui.hoveredCardId}
              setHoveredCardId={setHoveredCardId}
              isHandHovered={state.ui.isCardHovered}
              setIsHandHovered={setIsHandHovered}
              mustDiscard={state.player.mustDiscard}
              discardCardFromHand={handleDiscardCardFromHand}
              playCardToField={handlePlayCardToField}
              addToDeck={handleAddToDeck}
              playerId={state.connection.playerId}
            />
            <OpponentField
              opponentField={state.opponent.field}
              hoveredCardId={state.ui.hoveredCardId}
              setHoveredCardId={setHoveredCardId}
            />
            <OpponentHand opponentHand={state.opponent.hand} />
          </div>

          <div className="z-30 absolute left-4 bottom-2 flex gap-4">
            <PlayerDeck
              count={state.player.deck.length}
              handCount={state.player.hand.length}
              drawCard={handleDrawCard}
              shuffleDeck={handleShuffleDeck}
            />
            <PlayerGraveyard
              count={state.player.graveyard.length}
              onClick={() => setGraveyardOpen(true)}
              isOpen={state.ui.isGraveyardOpen}
              onClose={() => setGraveyardOpen(false)}
              graveyard={state.player.graveyard}
              hoveredCardId={state.ui.hoveredCardId}
              setHoveredCardId={setHoveredCardId}
            />
          </div>

          <div className="z-30 absolute left-4 top-2 flex gap-4">
            <OpponentDeck count={state.opponent.deck.length} />
            <OpponentGraveyard
              count={state.opponent.graveyard.length}
              onClick={() => setOpponentGraveyardOpen(true)}
              isOpen={state.ui.isOpponentGraveyardOpen}
              onClose={() => setOpponentGraveyardOpen(false)}
              graveyard={state.opponent.graveyard}
              hoveredCardId={state.ui.hoveredCardId}
              setHoveredCardId={setHoveredCardId}
            />
          </div>

          <CardPreview
            hoveredCardId={state.ui.hoveredCardId}
            field={state.player.field}
            hand={state.player.hand}
            opponentField={state.opponent.field}
          />
        </div>

        <div className="chatbox-container">
          <ChatBox
            chatMessages={state.chat.messages}
            chatInput={state.chat.input}
            setChatInput={setChatInput}
            sendChatMessage={sendChatMessage}
            playerId={state.connection.playerId}
            isConnected={state.connection.isConnected}
            gameId={gameId}
            turn={state.game.turn}
            isMyTurn={state.game.isMyTurn}
          />
        </div>
      </div>
    </div>
  );
}