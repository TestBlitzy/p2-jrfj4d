/**
 * @fileoverview Custom React hook for managing WebSocket connections with enhanced features
 * @version 1.0.0
 */

import { useState, useEffect, useCallback } from 'react';
import { webSocketService } from '../services/websocket.service';
import { NotificationType } from '../types/notification.types';

/**
 * Configuration options for the WebSocket hook
 */
interface WebSocketHookOptions {
  autoConnect?: boolean;
  reconnect?: boolean;
  reconnectAttempts?: number;
  reconnectInterval?: number;
  onMessage?: (data: any) => void;
  onError?: (error: string) => void;
  heartbeatInterval?: number;
  messageTimeout?: number;
  enableCompression?: boolean;
}

/**
 * Return type for the WebSocket hook
 */
interface WebSocketHookReturn {
  isConnected: boolean;
  lastMessage: any | null;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  sendMessage: (event: string, data: any, options?: MessageOptions) => Promise<void>;
  reconnectCount: number;
  isReconnecting: boolean;
  clearError: () => void;
}

/**
 * Message options for WebSocket communication
 */
interface MessageOptions {
  compress?: boolean;
  batch?: boolean;
  priority?: 'high' | 'normal' | 'low';
  retry?: boolean;
}

/**
 * Custom hook for managing WebSocket connections with enhanced features
 * @param url WebSocket server URL
 * @param options Configuration options
 * @returns WebSocket connection state and control functions
 */
export const useWebSocket = (
  url: string,
  options: WebSocketHookOptions = {}
): WebSocketHookReturn => {
  // Connection state
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [lastMessage, setLastMessage] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reconnectCount, setReconnectCount] = useState<number>(0);
  const [isReconnecting, setIsReconnecting] = useState<boolean>(false);

  // Default options
  const defaultOptions: WebSocketHookOptions = {
    autoConnect: true,
    reconnect: true,
    reconnectAttempts: 5,
    reconnectInterval: 5000,
    heartbeatInterval: 30000,
    messageTimeout: 5000,
    enableCompression: true,
    ...options
  };

  /**
   * Memoized connect function with exponential backoff
   */
  const connect = useCallback(async () => {
    try {
      setError(null);
      await webSocketService.connect(url, {
        reconnection: defaultOptions.reconnect,
        reconnectionAttempts: defaultOptions.reconnectAttempts,
        reconnectionDelay: defaultOptions.reconnectInterval,
        compress: defaultOptions.enableCompression
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed');
      if (defaultOptions.onError) {
        defaultOptions.onError(err instanceof Error ? err.message : 'Connection failed');
      }
    }
  }, [url, defaultOptions]);

  /**
   * Memoized disconnect function with cleanup
   */
  const disconnect = useCallback(() => {
    webSocketService.disconnect();
    setIsConnected(false);
    setLastMessage(null);
  }, []);

  /**
   * Memoized message sending function with timeout handling
   */
  const sendMessage = useCallback(async (
    event: string,
    data: any,
    options: MessageOptions = {}
  ) => {
    try {
      await webSocketService.sendMessage(event, data, {
        compress: defaultOptions.enableCompression,
        ...options
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
      if (defaultOptions.onError) {
        defaultOptions.onError(err instanceof Error ? err.message : 'Failed to send message');
      }
    }
  }, [defaultOptions]);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Set up connection and event handlers
   */
  useEffect(() => {
    let heartbeatInterval: NodeJS.Timeout;
    let isActive = true;

    const setupConnection = async () => {
      if (defaultOptions.autoConnect) {
        await connect();
      }
    };

    const handleConnection = () => {
      if (isActive) {
        setIsConnected(true);
        setIsReconnecting(false);
        setReconnectCount(0);
      }
    };

    const handleDisconnection = () => {
      if (isActive) {
        setIsConnected(false);
        if (defaultOptions.reconnect) {
          setIsReconnecting(true);
          setReconnectCount(prev => prev + 1);
        }
      }
    };

    const handleMessage = (data: any) => {
      if (isActive) {
        setLastMessage(data);
        if (defaultOptions.onMessage) {
          defaultOptions.onMessage(data);
        }
      }
    };

    const handleError = (error: any) => {
      if (isActive) {
        const errorMessage = error?.message || 'WebSocket error occurred';
        setError(errorMessage);
        if (defaultOptions.onError) {
          defaultOptions.onError(errorMessage);
        }
      }
    };

    // Set up subscriptions
    const unsubscribeConnection = webSocketService.subscribe('connection', handleConnection);
    const unsubscribeDisconnect = webSocketService.subscribe('disconnect', handleDisconnection);
    const unsubscribeError = webSocketService.subscribe('error', handleError);
    const unsubscribeMessage = webSocketService.subscribe('message', handleMessage);

    // Set up heartbeat
    if (defaultOptions.heartbeatInterval) {
      heartbeatInterval = setInterval(() => {
        if (isConnected) {
          sendMessage('heartbeat', { timestamp: Date.now() }, { priority: 'low' });
        }
      }, defaultOptions.heartbeatInterval);
    }

    setupConnection();

    // Cleanup function
    return () => {
      isActive = false;
      unsubscribeConnection();
      unsubscribeDisconnect();
      unsubscribeError();
      unsubscribeMessage();
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
      }
      disconnect();
    };
  }, [
    connect,
    disconnect,
    sendMessage,
    defaultOptions.autoConnect,
    defaultOptions.heartbeatInterval,
    defaultOptions.onMessage,
    defaultOptions.onError,
    defaultOptions.reconnect,
    isConnected
  ]);

  return {
    isConnected,
    lastMessage,
    error,
    connect,
    disconnect,
    sendMessage,
    reconnectCount,
    isReconnecting,
    clearError
  };
};