/**
 * Encrypted Chat Service
 *
 * WebSocket-based real-time chat with E2E encryption.
 * RAM-only message storage - messages wiped on disconnect.
 */

import { getSessionKey } from '@/utils/srpAuth';
import {
  deriveCaseKey,
  encryptMessage,
  decryptMessage,
} from '@/utils/chatEncryption';

type MessageHandler = (msg: ChatMessage) => void;
type StatusHandler = (connected: boolean) => void;

export interface ChatMessage {
  id: string;
  sender: string;
  content: string;
  timestamp: string;
  caseId: string;
}

export interface EncryptedPayload {
  sender: string;
  ciphertext: string;
  iv: string;
  timestamp: string;
  caseId: string;
  id: string;
}

class ChatService {
  private ws: WebSocket | null = null;
  private messageHandlers: Set<MessageHandler> = new Set();
  private statusHandlers: Set<StatusHandler> = new Set();
  private caseKeys: Map<string, CryptoKey> = new Map();
  private messages: ChatMessage[] = []; // RAM-only storage
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private url: string = '';
  private caseId: string = '';
  private username: string = '';

  connect(url: string, caseId: string, username: string): void {
    this.url = url;
    this.caseId = caseId;
    this.username = username;

    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      console.log('[Chat] Connected');
      this.statusHandlers.forEach((h) => h(true));
      // Authenticate
      this.sendRaw({ type: 'auth', caseId, username });
    };

    this.ws.onmessage = async (event) => {
      try {
        const payload: EncryptedPayload = JSON.parse(event.data);
        const key = await this.getCaseKey(caseId);
        const content = await decryptMessage(
          key,
          payload.ciphertext,
          payload.iv
        );

        const msg: ChatMessage = {
          id: payload.id,
          sender: payload.sender,
          content,
          timestamp: payload.timestamp,
          caseId: payload.caseId,
        };

        this.messages.push(msg);
        this.messageHandlers.forEach((h) => h(msg));
      } catch (err) {
        console.error('[Chat] Decryption error:', err);
      }
    };

    this.ws.onclose = () => {
      console.log('[Chat] Disconnected');
      this.statusHandlers.forEach((h) => h(false));
      this.scheduleReconnect();
    };

    this.ws.onerror = (err) => {
      console.error('[Chat] WebSocket error:', err);
    };
  }

  async sendMessage(content: string): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('Not connected');
    }

    const key = await this.getCaseKey(this.caseId);
    const encrypted = await encryptMessage(key, content);

    const payload: EncryptedPayload = {
      id: crypto.randomUUID(),
      sender: this.username,
      ciphertext: encrypted.ciphertext,
      iv: encrypted.iv,
      timestamp: new Date().toISOString(),
      caseId: this.caseId,
    };

    this.sendRaw({ type: 'message', payload });

    // Optimistically add to local messages
    const msg: ChatMessage = {
      id: payload.id,
      sender: this.username,
      content,
      timestamp: payload.timestamp,
      caseId: this.caseId,
    };
    this.messages.push(msg);
  }

  getMessages(): ChatMessage[] {
    return [...this.messages];
  }

  onMessage(handler: MessageHandler): () => void {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  onStatusChange(handler: StatusHandler): () => void {
    this.statusHandlers.add(handler);
    return () => this.statusHandlers.delete(handler);
  }

  disconnect(): void {
    // Wipe all messages (RAM-only)
    this.messages = [];
    this.caseKeys.clear();

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.ws?.close();
    this.ws = null;
  }

  private async getCaseKey(caseId: string): Promise<CryptoKey> {
    if (this.caseKeys.has(caseId)) {
      return this.caseKeys.get(caseId)!;
    }

    const sessionKey = getSessionKey();
    const key = await deriveCaseKey(sessionKey, caseId);
    this.caseKeys.set(caseId, key);
    return key;
  }

  private sendRaw(data: unknown): void {
    this.ws?.send(JSON.stringify(data));
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.url && this.caseId && this.username) {
        this.connect(this.url, this.caseId, this.username);
      }
    }, 3000);
  }
}

export const chatService = new ChatService();
