'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

export interface UseWebSocketOptions {
  url: string;
  onOpen?: (event: Event) => void;
  onMessage?: (event: MessageEvent) => void;
  onError?: (event: Event) => void;
  onClose?: (event: CloseEvent) => void;
  reconnectInterval?: number;
  reconnectAttempts?: number;
}

export interface UseWebSocketReturn {
  isConnected: boolean;
  send: (data: string | ArrayBuffer | Blob) => void;
  close: () => void;
  reconnect: () => void;
}

export function useWebSocket({
  url,
  onOpen,
  onMessage,
  onError,
  onClose,
  reconnectInterval = 3000,
  reconnectAttempts = 5,
}: UseWebSocketOptions): UseWebSocketReturn {
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectCountRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const shouldReconnectRef = useRef(true);

  const connect = useCallback(() => {
    try {
      const ws = new WebSocket(url);

      ws.onopen = (event) => {
        console.log('WebSocket connected');
        setIsConnected(true);
        reconnectCountRef.current = 0;
        onOpen?.(event);
      };

      ws.onmessage = (event) => {
        onMessage?.(event);
      };

      ws.onerror = (event) => {
        console.error('WebSocket error:', event);
        onError?.(event);
      };

      ws.onclose = (event) => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
        wsRef.current = null;
        onClose?.(event);

        // Attempt to reconnect
        if (
          shouldReconnectRef.current &&
          reconnectCountRef.current < reconnectAttempts
        ) {
          reconnectCountRef.current += 1;
          console.log(
            `Attempting to reconnect... (${reconnectCountRef.current}/${reconnectAttempts})`
          );

          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        }
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
    }
  }, [url, onOpen, onMessage, onError, onClose, reconnectInterval, reconnectAttempts]);

  const send = useCallback((data: string | ArrayBuffer | Blob) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(data);
    } else {
      console.warn('WebSocket is not connected. Cannot send message.');
    }
  }, []);

  const close = useCallback(() => {
    shouldReconnectRef.current = false;
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    wsRef.current?.close();
  }, []);

  const reconnect = useCallback(() => {
    reconnectCountRef.current = 0;
    shouldReconnectRef.current = true;
    close();
    connect();
  }, [close, connect]);

  useEffect(() => {
    connect();

    return () => {
      shouldReconnectRef.current = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      wsRef.current?.close();
    };
  }, [connect]);

  return {
    isConnected,
    send,
    close,
    reconnect,
  };
}
