import { Channel, NewMessage, OnInboundMessage, OnChatMetadata } from '../types.js';
import { registerChannel } from './registry.js';
import { readEnvFile } from '../env.js';
import { logger as rootLogger } from '../logger.js';

const logger = rootLogger.child({ channel: 'mattermost' });

const JID_PREFIX = 'mm_';
const JID_SUFFIX = '@mattermost';

function toJid(mmChannelId: string): string {
  return `${JID_PREFIX}${mmChannelId}${JID_SUFFIX}`;
}

function fromJid(jid: string): string | null {
  if (!jid.startsWith(JID_PREFIX) || !jid.endsWith(JID_SUFFIX)) return null;
  return jid.slice(JID_PREFIX.length, -JID_SUFFIX.length);
}

class MattermostChannel implements Channel {
  name = 'mattermost';

  private serverUrl: string;
  private token: string;
  private botUserId: string | null = null;
  private ws: WebSocket | null = null;
  private connected = false;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private seqCounter = 0;
  private userCache = new Map<string, string>();

  private onMessage: OnInboundMessage;
  private onChatMetadata: OnChatMetadata;

  constructor(
    serverUrl: string,
    token: string,
    onMessage: OnInboundMessage,
    onChatMetadata: OnChatMetadata,
  ) {
    this.serverUrl = serverUrl.replace(/\/$/, '');
    this.token = token;
    this.onMessage = onMessage;
    this.onChatMetadata = onChatMetadata;
  }

  private async apiGet(path: string): Promise<unknown> {
    const res = await fetch(`${this.serverUrl}/api/v4${path}`, {
      headers: { Authorization: `Bearer ${this.token}` },
    });
    if (!res.ok) {
      throw new Error(`Mattermost API ${path} error: ${res.status} ${await res.text()}`);
    }
    return res.json();
  }

  private async apiPost(path: string, body: unknown): Promise<unknown> {
    const res = await fetch(`${this.serverUrl}/api/v4${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      throw new Error(`Mattermost API POST ${path} error: ${res.status} ${await res.text()}`);
    }
    return res.json();
  }

  async connect(): Promise<void> {
    const me = (await this.apiGet('/users/me')) as { id: string; username: string };
    this.botUserId = me.id;
    logger.info({ userId: this.botUserId, username: me.username }, 'Mattermost bot identified');
    this.connectWs();
  }

  private connectWs(): void {
    const wsUrl = this.serverUrl
      .replace(/^https:\/\//, 'wss://')
      .replace(/^http:\/\//, 'ws://');

    const ws = new WebSocket(`${wsUrl}/api/v4/websocket`);
    this.ws = ws;

    ws.addEventListener('open', () => {
      ws.send(
        JSON.stringify({
          seq: ++this.seqCounter,
          action: 'authentication_challenge',
          data: { token: this.token },
        }),
      );
    });

    ws.addEventListener('message', (event) => {
      try {
        const msg = JSON.parse(event.data as string) as Record<string, unknown>;
        void this.handleWsEvent(msg);
      } catch (e) {
        logger.warn({ err: e }, 'Failed to parse WS message');
      }
    });

    ws.addEventListener('error', (err) => {
      logger.error({ err }, 'Mattermost WebSocket error');
    });

    ws.addEventListener('close', () => {
      this.connected = false;
      logger.warn('Mattermost WebSocket closed, reconnecting in 5s');
      this.reconnectTimer = setTimeout(() => this.connectWs(), 5000);
    });
  }

  private async handleWsEvent(msg: Record<string, unknown>): Promise<void> {
    if (msg['event'] === 'hello') {
      this.connected = true;
      logger.info('Mattermost WebSocket authenticated');
      return;
    }

    if (msg['event'] === 'posted') {
      const data = msg['data'] as Record<string, string> | undefined;
      if (!data) return;
      // Only handle direct message channels
      if (data['channel_type'] !== 'D') return;
      let post: Record<string, unknown>;
      try {
        post = JSON.parse(data['post'] ?? '{}') as Record<string, unknown>;
      } catch {
        return;
      }
      await this.handlePost(post, data);
    }
  }

  private async handlePost(
    post: Record<string, unknown>,
    eventData: Record<string, string>,
  ): Promise<void> {
    const userId = post['user_id'] as string;
    if (userId === this.botUserId) return;

    const channelId = post['channel_id'] as string;
    const jid = toJid(channelId);
    const timestamp = new Date(post['create_at'] as number).toISOString();
    const content = (post['message'] as string) ?? '';

    let senderName = userId;
    if (this.userCache.has(userId)) {
      senderName = this.userCache.get(userId)!;
    } else {
      try {
        const user = (await this.apiGet(`/users/${userId}`)) as {
          username: string;
          first_name: string;
          last_name: string;
          nickname: string;
        };
        senderName =
          user.nickname ||
          `${user.first_name} ${user.last_name}`.trim() ||
          user.username;
        this.userCache.set(userId, senderName);
      } catch (e) {
        logger.warn({ err: e, userId }, 'Could not fetch sender info');
      }
    }

    this.onChatMetadata(jid, timestamp, senderName, 'mattermost', false);

    const message: NewMessage = {
      id: post['id'] as string,
      chat_jid: jid,
      sender: userId,
      sender_name: senderName,
      content,
      timestamp,
      is_from_me: false,
      is_bot_message: false,
    };

    this.onMessage(jid, message);
  }

  async sendMessage(jid: string, text: string): Promise<void> {
    const channelId = fromJid(jid);
    if (!channelId) throw new Error(`Invalid Mattermost JID: ${jid}`);
    await this.apiPost('/posts', { channel_id: channelId, message: text });
  }

  isConnected(): boolean {
    return this.connected;
  }

  ownsJid(jid: string): boolean {
    return jid.startsWith(JID_PREFIX) && jid.endsWith(JID_SUFFIX);
  }

  async disconnect(): Promise<void> {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.connected = false;
  }

  async setTyping(jid: string, isTyping: boolean): Promise<void> {
    if (!isTyping || !this.botUserId) return;
    const channelId = fromJid(jid);
    if (!channelId) return;
    try {
      await this.apiPost(`/users/${this.botUserId}/typing`, { channel_id: channelId });
    } catch {
      // non-fatal
    }
  }
}

registerChannel('mattermost', (opts) => {
  const env = readEnvFile(['MATTERMOST_TOKEN', 'MATTERMOST_URL']);
  const token = process.env.MATTERMOST_TOKEN ?? env['MATTERMOST_TOKEN'];
  const serverUrl =
    process.env.MATTERMOST_URL ?? env['MATTERMOST_URL'] ?? 'https://mattermost.palema.io';

  if (!token) return null;

  return new MattermostChannel(serverUrl, token, opts.onMessage, opts.onChatMetadata);
});
