import { describe, it, expect, beforeEach } from 'vitest';
import { ConfigService } from '../src/services/config.service.js';

describe('ConfigService', () => {
  let service: ConfigService;

  beforeEach(() => {
    service = new ConfigService();
    service.clearAll();
  });

  it('should save and retrieve non-sensitive configuration', () => {
    service.saveConfig({
      github: { username: 'testuser' },
      repository: { owner: 'testuser', name: 'demo-repo' },
    });

    const config = service.getConfig();
    expect(config.github?.username).toBe('testuser');
    expect(config.repository).toEqual({ owner: 'testuser', name: 'demo-repo' });
  });

  it('should isolate and manage secret access tokens', () => {
    service.saveCredentials({
      accessToken: 'gho_mock_token_123456',
      tokenType: 'bearer',
      scope: 'repo',
      createdAt: '2026-08-23T00:00:00.000Z',
    });

    const creds = service.getCredentials();
    expect(creds?.accessToken).toBe('gho_mock_token_123456');

    // Confirm that credentials are NOT in plain config store
    const config = service.getConfig();
    expect((config as Record<string, unknown>).accessToken).toBeUndefined();

    service.clearCredentials();
    expect(service.getCredentials()).toBeNull();
  });

  it('should update VPS host and route correctly', () => {
    service.setVPSHost('192.168.1.100');
    service.setWebhookRoute('github-webhook');

    const config = service.getConfig();
    expect(config.server?.host).toBe('192.168.1.100');
    expect(config.server?.route).toBe('/github-webhook');
  });
});
