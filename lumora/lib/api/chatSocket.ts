import { env } from '@/lib/config';

const WS_BASE = env.apiBaseUrl.replace(/^http/, 'ws');

export interface WSMessage {
  type: 'message';
  text: string;
}

export interface WSGoalComplete {
  type: 'goal_complete';
  goal: { goal: string };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  roadmap: any;
}

export type WSResponse = WSMessage | WSGoalComplete;

/**
 * Open the ngrok URL in a new tab so the user can accept the
 * browser-warning interstitial. Once accepted, the session cookie
 * is set and WebSocket connections will work.
 */
export function openNgrokWarning(): void {
  window.open(env.apiBaseUrl, '_blank');
}

export class ChatSocket {
  private ws: WebSocket | null = null;
  private onMessageCallback: ((response: WSResponse) => void) | null = null;

  connect(userId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const url = `${WS_BASE}/ws/text?user_id=${encodeURIComponent(userId)}`;
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        resolve();
      };

      this.ws.onerror = (err) => {
        console.error('WebSocket error:', err);
        reject(new Error('WEBSOCKET_NGROK_BLOCKED'));
      };

      this.ws.onmessage = (event) => {
        try {
          const data: WSResponse = JSON.parse(event.data);
          if (this.onMessageCallback) {
            this.onMessageCallback(data);
          }
        } catch (e) {
          console.error('Failed to parse WS message:', e);
        }
      };

      this.ws.onclose = () => {
        this.ws = null;
      };
    });
  }

  send(text: string) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error('WebSocket not connected');
      return;
    }
    this.ws.send(JSON.stringify({ text }));
  }

  onMessage(callback: (response: WSResponse) => void) {
    this.onMessageCallback = callback;
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.onMessageCallback = null;
  }

  get isConnected() {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}
