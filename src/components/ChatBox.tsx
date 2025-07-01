import React, { memo, useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight, ExternalLink, FileText } from 'lucide-react';
import { motion } from 'framer-motion';

interface ChatBoxProps {
  chatMessages: { playerId: number; message: string }[];
  chatInput: string;
  setChatInput: (input: string) => void;
  sendChatMessage: () => void;
  playerId: number | null | undefined;
  isConnected: boolean;
  gameId: string | undefined;
  turn: number;
  isMyTurn: boolean;
}

function ChatBox({
                   chatMessages,
                   chatInput,
                   setChatInput,
                   sendChatMessage,
                   playerId,
                   isConnected,
                   gameId,
                   turn,
                 }: ChatBoxProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleIconClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen((prev) => !prev);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setChatInput(e.target.value);
    },
    [setChatInput],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        sendChatMessage();
      }
    },
    [sendChatMessage],
  );

  return (
    <div className="chatbox-container" style={{ height: '100vh' }}>
      <motion.div
        className="chatbox-content min-h-screen flex flex-col items-center justify-start pt-8 gap-4 bg-black"
        initial={{ right: '-20%' }}
        animate={{ right: isOpen ? '0%' : '-15%' }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        style={{
          position: 'fixed',
          width: '15%',
          right: '-20%',
          top: 0,
          zIndex: 20,
          cursor: 'default',
          padding: '0 1%',
        }}
      >
        <p className="text-white font-bold">ID de la partie : {gameId}</p>
        <p className="text-white">Vous êtes le Joueur {playerId || '...'}</p>
        <p className="text-white font-bold">Tour {turn}</p>
        <div className="w-full flex-1 overflow-y-auto bg-gray-900 p-2 rounded">
          {chatMessages.map((msg, index) => (
            <p
              key={index}
              className={`text-sm ${
                msg.playerId === playerId ? 'text-blue-400' : 'text-green-400'
              }`}
            >
              Joueur {msg.playerId}: {msg.message}
            </p>
          ))}
        </div>
        <input
          type="text"
          value={chatInput}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          className="w-full p-2 rounded bg-gray-800 text-white focus:outline-none"
          placeholder={isConnected ? 'Tapez un message...' : 'Déconnecté'}
          disabled={!isConnected}
        />
        <div className="flex flex-row items-center justify-center gap-2 mt-4">
          <a
            href="https://www.notion.so/nexus-card-game/1cd54baaf409803b8ecfe4c1fdd948ae?v=1ce54baaf4098020a27d000c66b5dc94"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            style={{ flex: '1', minWidth: '100px' }}
          >
            <ExternalLink className="w-5 h-5" /> Wiki
          </a>
          <a
            href="/cards/rules.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            style={{ flex: '1', minWidth: '100px' }}
          >
            <FileText className="w-5 h-5" /> Règles
          </a>
        </div>
      </motion.div>

      <motion.div
        className="chatbox-toggle bg-gray-800 text-white p-3 rounded-full shadow-lg hover:bg-gray-700 focus:outline-none"
        onClick={handleIconClick}
        initial={{ right: '1%' }}
        animate={{ right: isOpen ? '16%' : '1%' }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        style={{
          position: 'fixed',
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 30,
          pointerEvents: 'auto',
          cursor: 'pointer',
        }}
        onMouseDown={handleIconClick}
      >
        {isOpen ? <ChevronRight size={24} /> : <ChevronLeft size={24} />}
      </motion.div>
    </div>
  );
}

export default memo(ChatBox);