import React, { useEffect, useRef } from 'react';
import { Send } from 'lucide-react';

interface ChatMessage {
  playerId: number;
  message: string;
}

interface ChatBoxProps {
  chatMessages: ChatMessage[];
  chatInput: string;
  setChatInput: (value: string) => void;
  sendChatMessage: () => void;
  playerId: number | null;
  isConnected: boolean;
}

export default function ChatBox({
                                  chatMessages,
                                  chatInput,
                                  setChatInput,
                                  sendChatMessage,
                                  playerId,
                                  isConnected,
                                }: ChatBoxProps) {
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  return (
    <div className="w-[90%] flex flex-col gap-2">
      <div ref={chatContainerRef} className="h-64 bg-gray-800 rounded-lg p-4 overflow-y-auto">
        {chatMessages.map((msg, index) => (
          <div
            key={index}
            className={`text-white mb-2 ${msg.playerId === playerId ? 'text-right' : 'text-left'}`}
          >
            <span className="font-bold">Joueur {msg.playerId}: </span>
            <span>{msg.message}</span>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          className="flex-1 p-2 rounded bg-gray-700 text-white placeholder-white placeholder-opacity-50"
          placeholder="Écrivez un message..."
          disabled={!isConnected}
          onKeyDown={(e) => e.key === 'Enter' && sendChatMessage()}
        />
        <button
          onClick={sendChatMessage}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          disabled={!isConnected}
        >
          <Send className="w-5 h-5 text-white" />
        </button>
      </div>
    </div>
  );
}
