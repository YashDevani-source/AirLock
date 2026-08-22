import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WebhookService } from '../src/services/webhook.service.js';
import { githubService } from '../src/services/github.service.js';

describe('WebhookService', () => {
  let webhookService: WebhookService;

  beforeEach(() => {
    webhookService = new WebhookService();
  });

  it('should detect existing webhook by matching URL', async () => {
    const mockListWebhooks = vi.fn().mockResolvedValue({
      data: [
        {
          id: 101,
          config: { url: 'http://123.45.67.89/github-webhook', content_type: 'json' },
          active: true,
          events: ['push', 'pull_request'],
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
        },
        {
          id: 102,
          config: { url: 'https://other-server.com/hook', content_type: 'json' },
          active: true,
          events: ['push'],
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
        },
      ],
    });

    vi.spyOn(githubService, 'getOctokit').mockReturnValue({
      rest: {
        repos: {
          listWebhooks: mockListWebhooks,
        },
      },
    } as unknown as ReturnType<typeof githubService.getOctokit>);

    const found = await webhookService.findWebhookByUrl('yash', 'my-project', 'http://123.45.67.89/github-webhook');
    expect(found).not.toBeNull();
    expect(found?.id).toBe(101);

    const notFound = await webhookService.findWebhookByUrl('yash', 'my-project', 'http://non-existent-url.com/hook');
    expect(notFound).toBeNull();
  });

  it('should map createWebhook parameters correctly to Octokit call', async () => {
    const mockCreateWebhook = vi.fn().mockResolvedValue({
      data: {
        id: 999,
        active: true,
        events: ['push', 'pull_request'],
        config: { url: 'http://123.45.67.89/github-webhook', content_type: 'json' },
        created_at: '2026-08-23T00:00:00Z',
        updated_at: '2026-08-23T00:00:00Z',
      },
    });

    vi.spyOn(githubService, 'getOctokit').mockReturnValue({
      rest: {
        repos: {
          createWebhook: mockCreateWebhook,
        },
      },
    } as unknown as ReturnType<typeof githubService.getOctokit>);

    const result = await webhookService.createWebhook('yash', 'my-project', {
      url: 'http://123.45.67.89/github-webhook',
      secret: 'my-secret-key',
      events: ['push', 'pull_request'],
    });

    expect(mockCreateWebhook).toHaveBeenCalledWith({
      owner: 'yash',
      repo: 'my-project',
      name: 'web',
      active: true,
      events: ['push', 'pull_request'],
      config: {
        url: 'http://123.45.67.89/github-webhook',
        content_type: 'json',
        insecure_ssl: '0',
        secret: 'my-secret-key',
      },
    });

    expect(result.id).toBe(999);
  });
});
