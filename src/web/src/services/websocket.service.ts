/**
 * @fileoverview WebSocket service for real-time communication with enhanced features
 * @version 1.0.0
 */

import { Socket, io } from 'socket.io-client';
import { deflate, inflate } from 'pako';
import { NotificationType, NotificationCategory } from '../types/notification.types';

// Constants for WebSocket configuration
const WS_RECONNECT_INTERVAL = 5000;
const WS_MAX_RECONNECT_ATTEMPTS = 5;
const WS_MESSAGE_BATCH_SIZE = 100;
const WS_MESSAGE_BATCH_INTERVAL = 1000;

/**
 * Interface for WebSocket connection options
 */
interface ConnectionOptions {
  auth?: {
    token: string;
  };
  reconnection?: boolean;
  reconnectionAttempts?: number;
  reconnectionDelay?: number;
  timeout?: number;
  compress?: boolean;
}

/**
 * Interface for message options
 */
interface MessageOptions {
  compress?: boolean;
  batch?: boolean;
  priority?: 'high' | 'normal' | 'low';
  retry?: boolean;
}

/**
 * Interface for pending messages in the queue
 */
interface PendingMessage {
  event: string;
  data: any;
  options: MessageOptions;
  timestamp: number;
}

/**
 * Interface for message batches
 */
interface MessageBatch {
  messages: PendingMessage[];
  timer: NodeJS.Timeout | null;
}

/**
 * Class representing the WebSocket service with enhanced features
 */
class WebSocketService {
  private socket: Socket | null = null;
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private subscribers: Map<string, Function[]> = new Map();
  private messageQueue: PendingMessage[] = [];
  private messageBatches: Map<string, MessageBatch> = new Map();
  private lastReconnectTime: number = 0;

  /**
   * Establishes WebSocket connection with enhanced error handling
   * @param url WebSocket server URL
   * @param options Connection options
   */
  public async connect(url: string, options: ConnectionOptions = {}): Promise<void> {
    try {
      if (this.socket?.connected) {
        return;
      }

      const defaultOptions: ConnectionOptions = {
        reconnection: true,
        reconnectionAttempts: WS_MAX_RECONNECT_ATTEMPTS,
        reconnectionDelay: WS_RECONNECT_INTERVAL,
        timeout: 10000,
        compress: true,
        ...options
      };

      this.socket = io(url, defaultOptions);

      this.setupEventHandlers();
      await this.waitForConnection();
    } catch (error) {
      this.handleConnectionError(error);
    }
  }

  /**
   * Sets up WebSocket event handlers
   */
  private setupEventHandlers(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.processMessageQueue();
      this.notifySubscribers('connection', { status: 'connected' });
    });

    this.socket.on('disconnect', (reason) => {
      this.isConnected = false;
      this.handleDisconnect(reason);
    });

    this.socket.on('error', (error) => {
      this.handleConnectionError(error);
    });

    this.socket.on('reconnect_attempt', (attempt) => {
      this.handleReconnectAttempt(attempt);
    });
  }

  /**
   * Gracefully disconnects the WebSocket connection
   */
  public disconnect(): void {
    this.clearMessageBatches();
    this.socket?.disconnect();
    this.socket = null;
    this.isConnected = false;
    this.subscribers.clear();
  }

  /**
   * Subscribes to WebSocket events with type-safe callback handling
   * @param event Event name to subscribe to
   * @param callback Callback function for event handling
   * @returns Unsubscribe function
   */
  public subscribe(event: string, callback: Function): () => void {
    if (!this.subscribers.has(event)) {
      this.subscribers.set(event, []);
    }

    const callbacks = this.subscribers.get(event)!;
    callbacks.push(callback);

    if (this.socket) {
      this.socket.on(event, (data: any) => {
        this.handleEventData(event, data);
      });
    }

    return () => {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    };
  }

  /**
   * Sends messages with batching and compression support
   * @param event Event name
   * @param data Message data
   * @param options Message options
   */
  public async sendMessage(event: string, data: any, options: MessageOptions = {}): Promise<void> {
    const message: PendingMessage = {
      event,
      data,
      options,
      timestamp: Date.now()
    };

    if (!this.isConnected) {
      this.queueMessage(message);
      return;
    }

    if (options.batch) {
      this.addToBatch(message);
    } else {
      await this.sendSingleMessage(message);
    }
  }

  /**
   * Adds message to batch for optimized sending
   * @param message Pending message to batch
   */
  private addToBatch(message: PendingMessage): void {
    const { event } = message;
    
    if (!this.messageBatches.has(event)) {
      this.messageBatches.set(event, {
        messages: [],
        timer: null
      });
    }

    const batch = this.messageBatches.get(event)!;
    batch.messages.push(message);

    if (batch.messages.length >= WS_MESSAGE_BATCH_SIZE) {
      this.sendBatch(event);
    } else if (!batch.timer) {
      batch.timer = setTimeout(() => this.sendBatch(event), WS_MESSAGE_BATCH_INTERVAL);
    }
  }

  /**
   * Sends a batch of messages
   * @param event Event name
   */
  private async sendBatch(event: string): Promise<void> {
    const batch = this.messageBatches.get(event);
    if (!batch || !this.socket?.connected) return;

    if (batch.timer) {
      clearTimeout(batch.timer);
      batch.timer = null;
    }

    const messages = batch.messages;
    batch.messages = [];

    try {
      const compressedData = this.compressData(messages);
      await this.socket.emit(`${event}_batch`, compressedData);
    } catch (error) {
      this.handleSendError(error, messages);
    }
  }

  /**
   * Sends a single message
   * @param message Message to send
   */
  private async sendSingleMessage(message: PendingMessage): Promise<void> {
    if (!this.socket?.connected) {
      this.queueMessage(message);
      return;
    }

    try {
      const { event, data, options } = message;
      const processedData = options.compress ? this.compressData(data) : data;
      await this.socket.emit(event, processedData);
    } catch (error) {
      this.handleSendError(error, [message]);
    }
  }

  /**
   * Compresses data using pako
   * @param data Data to compress
   * @returns Compressed data
   */
  private compressData(data: any): Uint8Array {
    try {
      const jsonString = JSON.stringify(data);
      return deflate(jsonString);
    } catch (error) {
      console.error('Compression error:', error);
      return data;
    }
  }

  /**
   * Decompresses data using pako
   * @param data Compressed data
   * @returns Decompressed data
   */
  private decompressData(data: Uint8Array): any {
    try {
      const decompressed = inflate(data, { to: 'string' });
      return JSON.parse(decompressed);
    } catch (error) {
      console.error('Decompression error:', error);
      return data;
    }
  }

  /**
   * Handles WebSocket connection errors
   * @param error Error object
   */
  private handleConnectionError(error: any): void {
    console.error('WebSocket connection error:', error);
    this.notifySubscribers('error', {
      type: NotificationType.ERROR,
      category: NotificationCategory.SYSTEM,
      message: 'WebSocket connection error'
    });
  }

  /**
   * Handles WebSocket disconnection
   * @param reason Disconnection reason
   */
  private handleDisconnect(reason: string): void {
    this.isConnected = false;
    console.warn('WebSocket disconnected:', reason);
    this.notifySubscribers('disconnect', { reason });
  }

  /**
   * Handles reconnection attempts
   * @param attempt Attempt number
   */
  private handleReconnectAttempt(attempt: number): void {
    this.reconnectAttempts = attempt;
    const now = Date.now();
    
    if (now - this.lastReconnectTime > WS_RECONNECT_INTERVAL * 5) {
      this.reconnectAttempts = 0;
    }
    
    this.lastReconnectTime = now;
    
    this.notifySubscribers('reconnect_attempt', { attempt });
  }

  /**
   * Processes queued messages after reconnection
   */
  private async processMessageQueue(): Promise<void> {
    while (this.messageQueue.length > 0 && this.isConnected) {
      const message = this.messageQueue.shift();
      if (message) {
        await this.sendMessage(message.event, message.data, message.options);
      }
    }
  }

  /**
   * Queues a message for later sending
   * @param message Message to queue
   */
  private queueMessage(message: PendingMessage): void {
    if (message.options.retry !== false) {
      this.messageQueue.push(message);
    }
  }

  /**
   * Clears all message batches
   */
  private clearMessageBatches(): void {
    for (const batch of this.messageBatches.values()) {
      if (batch.timer) {
        clearTimeout(batch.timer);
      }
    }
    this.messageBatches.clear();
  }

  /**
   * Notifies subscribers of events
   * @param event Event name
   * @param data Event data
   */
  private notifySubscribers(event: string, data: any): void {
    const callbacks = this.subscribers.get(event);
    if (callbacks) {
      callbacks.forEach(callback => callback(data));
    }
  }

  /**
   * Waits for connection to be established
   * @returns Promise that resolves when connected
   */
  private waitForConnection(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Socket not initialized'));
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, 10000);

      this.socket.once('connect', () => {
        clearTimeout(timeout);
        resolve();
      });

      this.socket.once('connect_error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }

  /**
   * Handles errors during message sending
   * @param error Error object
   * @param messages Affected messages
   */
  private handleSendError(error: any, messages: PendingMessage[]): void {
    console.error('Message send error:', error);
    messages.forEach(message => {
      if (message.options.retry !== false) {
        this.queueMessage(message);
      }
    });
  }
}

// Export singleton instance
export const webSocketService = new WebSocketService();