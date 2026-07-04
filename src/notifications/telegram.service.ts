import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);
  private readonly botToken: string | undefined;
  private readonly chatId: string | undefined;

  constructor(config: ConfigService) {
    this.botToken = config.get<string>('TELEGRAM_BOT_TOKEN');
    this.chatId = config.get<string>('TELEGRAM_CHAT_ID');
  }

  async send(message: string): Promise<void> {
    if (!this.botToken || !this.chatId) {
      this.logger.warn('Telegram not configured — skipping alert');
      return;
    }

    const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: this.chatId, text: message }),
      });
      if (!res.ok) {
        this.logger.warn(`Telegram send failed: ${res.status}`);
      }
    } catch (err) {
      // Swallow network errors: one failed alert must not fail (and retry) the
      // whole notification batch, which would re-send already-delivered alerts.
      this.logger.warn(`Telegram send error: ${(err as Error).message}`);
    }
  }
}
