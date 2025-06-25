import React, { useCallback, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import OpponentField from '../components/OpponentField';
import OpponentHand from '../components/OpponentHand';
import PlayerField from '../components/PlayerField';
import ChatBox from '../components/chatbox/ChatBox';
import PlayerGraveyard from '../components/PlayerGraveyard';
import PlayerHand from '../components/PlayerHand';
import PlayerDeck from '../components/PlayerDeck';
import OpponentDeck from '../components/OpponentDeck';
import OpponentGraveyard from '../components/OpponentGraveyard';
import PlayerTokenZone from '../components/PlayerTokenZone';
import OpponentTokenZone from '../components/OpponentTokenZone';
import CardPreview from '../components/CardPreview';
import PhaseIndicator from '../components/PhaseIndicator';
import DeckSelection from '../components/DeckSelection';
import InitialDrawModal from '../components/InitialDrawModal';
import CounterPlayer from '../components/CounterPlayer';
import CounterOpponentPlayer from '../components/CounterOpponentPlayer';
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
    updateLifePoints,
    updateTokenCount,
    setHoveredTokenId,
    addAssassinTokenToOpponentDeck,
    placeAssassinTokenAtOpponentDeckBottom,
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
        emit('attackCard', {
          gameId,
          cardId: result.cardId,
        });
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
    if (!gameId || !state.connection.playerId || !state.connection.isConnected) {
      console.error('[ERROR] handleDrawCard failed:', {
        gameId,
        playerId: state.connection.playerId,
        isConnected: state.connection.isConnected,
      });
      return;
    }
    const result = drawCard();
    if (result) {
      console.log('[DEBUG] handleDrawCard:', {
        gameId,
        playerId: state.connection.playerId,
        handLength: result.hand.length,
        deckLength: result.deck.length,
      });
      emit('drawCard', {
        gameId,
        playerId: state.connection.playerId,
      });
    } else {
      console.log('[DEBUG] drawCard returned null');
    }
  }, [drawCard, gameId, state.connection.playerId, state.connection.isConnected, emit]);

  const handleShuffleDeck = useCallback(() => {
    const result = shuffleDeck();
    if (result && gameId && state.connection.isConnected) {
      emit('updateGameState', {
        gameId,
        state: { deck: result.deck },
      });
    }
  }, [shuffleDeck, gameId, state.connection.isConnected, emit]);

  const handleUpdateLifePoints = useCallback(
    (newValue: number) => {
      const result = updateLifePoints(newValue);
      if (result && gameId && state.connection.isConnected) {
        emit('updateLifePoints', {
          gameId,
          lifePoints: newValue,
        });
      }
    },
    [updateLifePoints, gameId, state.connection.isConnected, emit],
  );

  const handleUpdateTokenCount = useCallback(
    (newValue: number) => {
      const result = updateTokenCount(newValue);
      if (result && gameId && state.connection.isConnected) {
        emit('updateTokenCount', {
          gameId,
          tokenCount: newValue,
        });
      }
    },
    [updateTokenCount, gameId, state.connection.isConnected, emit],
  );

  const handleAddAssassinTokenToOpponentDeck = useCallback(() => {
    const result = addAssassinTokenToOpponentDeck();
    if (result && gameId && state.connection.isConnected) {
      const assassinToken = result.opponentDeck.find((c) => c.name === 'Assassin Token');
      emit('addAssassinTokenToOpponentDeck', {
        gameId,
        tokenCount: result.tokenCount,
        tokenCard: {
          id: assassinToken?.id || `token_assassin_${Math.random().toString(36).substr(2, 9)}`,
          name: 'Assassin Token',
          image: '/cards/tokens/token_assassin.jpg',
          exhausted: false,
        },
      });
      toast.success('Token assassin ajouté au deck adverse et mélangé !', {
        toastId: 'add_assassin_token',
      });
    } else {
      toast.error('Impossible d’ajouter le token assassin au deck adverse.', {
        toastId: 'add_assassin_token_error',
      });
    }
  }, [addAssassinTokenToOpponentDeck, gameId, state.connection.isConnected, emit]);

  const handlePlaceAssassinTokenAtOpponentDeckBottom = useCallback(() => {
    const result = placeAssassinTokenAtOpponentDeckBottom();
    if (result && gameId && state.connection.isConnected) {
      const assassinToken = result.opponentDeck[result.opponentDeck.length - 1];
      console.log('[DEBUG] Emitting placeAssassinTokenAtOpponentDeckBottom:', {
        gameId,
        tokenCard: assassinToken,
        tokenCount: result.tokenCount,
      });
      emit('placeAssassinTokenAtOpponentDeckBottom', {
        gameId,
        tokenCard: {
          id: assassinToken.id,
          name: 'Assassin Token',
          image: '/cards/tokens/token_assassin.jpg',
          exhausted: false,
        },
      });
      toast.success('Token assassin placé en bas du deck adverse !', {
        toastId: 'place_assassin_token',
      });
    }
  }, [placeAssassinTokenAtOpponentDeckBottom, gameId, state.connection.isConnected, emit]);

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

  const setTokenZoneOpen = useCallback(
    (isOpen: boolean) => {
      set({ ui: { isTokenZoneOpen: isOpen } });
    },
    [set],
  );

  const setOpponentTokenZoneOpen = useCallback(
    (isOpen: boolean) => {
      set({ ui: { isOpponentTokenZoneOpen: isOpen } });
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
          waitingForPlayer1={state.deckSelection.waitingForPlayer1}
          playerId={state.connection.playerId}
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
      {state.game.gameOver && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75 z-50">
          <div className="bg-gray-800 p-6 rounded-lg text-white text-center">
            <h2 className="text-2xl font-bold mb-4">
              {state.game.winner === (state.connection.playerId === 1 ? 'player1' : 'player2')
                ? 'Victoire !'
                : 'Défaite !'}
            </h2>
            <button
              onClick={() => window.location.href = '/'}
              className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded"
            >
              Retour à l'accueil
            </button>
          </div>
        </div>
      )}
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
          <div
            style={{
              position: 'absolute',
              top: '12%',
              left: '50%',
              transform: 'translateX(-50%)',
            }}
          >
            <CounterOpponentPlayer
              playerId={state.connection.playerId}
              gameId={gameId}
              opponentCounter={state.opponent.lifePoints}
            />
          </div>
          <div
            style={{
              position: 'absolute',
              top: '76%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
            }}
          >
            <CounterPlayer
              playerId={state.connection.playerId}
              gameId={gameId}
              counter={state.player.lifePoints}
              updateCounter={handleUpdateLifePoints}
            />
          </div>
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
            <PlayerTokenZone
              tokenCount={state.player.tokenCount}
              tokenType={state.player.tokenType}
              onClick={() => setTokenZoneOpen(true)}
              isOpen={state.ui.isTokenZoneOpen}
              onClose={() => setTokenZoneOpen(false)}
              updateTokenCount={handleUpdateTokenCount}
              setHoveredTokenId={setHoveredTokenId}
              addAssassinTokenToOpponentDeck={handleAddAssassinTokenToOpponentDeck}
              placeAssassinTokenAtOpponentDeckBottom={handlePlaceAssassinTokenAtOpponentDeckBottom}
              gameId={gameId}
              playerId={state.connection.playerId}
              opponentDeck={state.opponent.deck}
            />
          </div>

          {!state.ui.isTokenZoneOpen && (
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
              <OpponentTokenZone
                tokenCount={state.opponent.tokenCount}
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