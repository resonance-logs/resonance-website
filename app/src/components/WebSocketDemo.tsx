'use client';

import { useState } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';

export function WebSocketDemo() {
  const [messages, setMessages] = useState<string[]>([]);
  const [inputMessage, setInputMessage] = useState('');

  const { isConnected, send } = useWebSocket({
    url: 'ws://localhost:6420',
    onOpen: () => {
      console.log('Connected to Tauri backend');
    },
    onMessage: (event) => {
      console.log('Message from server:', event.data);
      setMessages((prev) => [...prev, event.data]);
    },
    onError: (error) => {
      console.error('WebSocket error:', error);
    },
    onClose: () => {
      console.log('Disconnected from Tauri backend');
    },
  });

  const handleSend = () => {
    if (inputMessage.trim() && isConnected) {
      send(inputMessage);
      setInputMessage('');
    }
  };

  return (
    <div className="p-4 border rounded-lg">
      <div className="mb-4">
        <h3 className="text-lg font-semibold mb-2">WebSocket Connection</h3>
        <div className="flex items-center gap-2">
          <div
            className={`w-3 h-3 rounded-full ${
              isConnected ? 'bg-green-500' : 'bg-red-500'
            }`}
          />
          <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
        </div>
      </div>

      <div className="mb-4">
        <h4 className="text-sm font-medium mb-2">Messages:</h4>
        <div className="bg-gray-100 p-2 rounded h-32 overflow-y-auto">
          {messages.length === 0 ? (
            <p className="text-gray-500 text-sm">No messages yet</p>
          ) : (
            messages.map((msg, index) => (
              <div key={index} className="text-sm mb-1">
                {msg}
              </div>
            ))
          )}
        </div>
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Type a message..."
          className="flex-1 px-3 py-2 border rounded"
          disabled={!isConnected}
        />
        <button
          onClick={handleSend}
          disabled={!isConnected || !inputMessage.trim()}
          className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300"
        >
          Send
        </button>
      </div>
    </div>
  );
}
