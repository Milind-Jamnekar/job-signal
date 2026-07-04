import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TelegramService } from './telegram.service';

describe('TelegramService.send', () => {
  const fetchMock = jest.fn();

  beforeAll(() => {
    // The failure-path tests deliberately trigger warn logs — silence them.
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  });
  afterAll(() => jest.restoreAllMocks());

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = fetchMock;
  });

  function makeService(token?: string, chatId?: string): TelegramService {
    const config = {
      get: jest.fn((key: string) =>
        key === 'TELEGRAM_BOT_TOKEN' ? token : chatId,
      ),
    };
    return new TelegramService(config as unknown as ConfigService);
  }

  it('skips the HTTP call when Telegram is not configured', async () => {
    const service = makeService(undefined, undefined);

    await service.send('hi');

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sends when configured', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200 });
    const service = makeService('token', 'chat');

    await service.send('hi');

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('swallows a network error so the batch is not failed/retried', async () => {
    fetchMock.mockRejectedValue(new Error('ENOTFOUND'));
    const service = makeService('token', 'chat');

    // Must resolve, not throw — one failed alert must not fail the whole job.
    await expect(service.send('hi')).resolves.toBeUndefined();
  });

  it('does not throw on a non-ok response', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 429 });
    const service = makeService('token', 'chat');

    await expect(service.send('hi')).resolves.toBeUndefined();
  });
});
