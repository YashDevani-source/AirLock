import Conf from 'conf';
import { CLIConfig, AuthCredentials, ServerConfig, RepositoryConfig } from '../types/index.js';
import { cliConfigSchema } from '../config/schema.js';
import { ConfigError } from '../utils/errors.js';
import { normalizeRoute } from '../utils/url.js';

const CONFIG_NAME = 'gh-webhook-cli-config';
const SECRETS_NAME = 'gh-webhook-cli-secrets';

export class ConfigService {
  private configStore: Conf<Record<string, unknown>>;
  private secretsStore: Conf<Record<string, unknown>>;

  constructor() {
    this.configStore = new Conf({
      projectName: CONFIG_NAME,
      configFileMode: 0o600,
    });

    this.secretsStore = new Conf({
      projectName: SECRETS_NAME,
      configFileMode: 0o600,
    });
  }

  public getConfig(): CLIConfig {
    const raw = this.configStore.store;
    const parseResult = cliConfigSchema.safeParse(raw);
    if (!parseResult.success) {
      return {};
    }
    return parseResult.data as CLIConfig;
  }

  public saveConfig(newConfig: Partial<CLIConfig>): CLIConfig {
    const current = this.getConfig();
    const merged: CLIConfig = {
      ...current,
      ...newConfig,
      github: newConfig.github ? { ...current.github, ...newConfig.github } : current.github,
      repository: newConfig.repository ? { ...current.repository, ...newConfig.repository } : current.repository,
      server: newConfig.server ? { ...current.server, ...newConfig.server } : current.server,
    };

    const parseResult = cliConfigSchema.safeParse(merged);
    if (!parseResult.success) {
      throw new ConfigError('Failed to save configuration: invalid schema format.');
    }

    this.configStore.store = parseResult.data as Record<string, unknown>;
    return parseResult.data as CLIConfig;
  }

  public getCredentials(): AuthCredentials | null {
    const accessToken = this.secretsStore.get('accessToken') as string | undefined;
    if (!accessToken) return null;

    return {
      accessToken,
      tokenType: (this.secretsStore.get('tokenType') as string) || 'bearer',
      scope: (this.secretsStore.get('scope') as string) || 'repo',
      createdAt: (this.secretsStore.get('createdAt') as string) || new Date().toISOString(),
    };
  }

  public saveCredentials(credentials: AuthCredentials): void {
    this.secretsStore.set('accessToken', credentials.accessToken);
    this.secretsStore.set('tokenType', credentials.tokenType || 'bearer');
    this.secretsStore.set('scope', credentials.scope || 'repo');
    this.secretsStore.set('createdAt', credentials.createdAt);
  }

  public clearCredentials(): void {
    this.secretsStore.delete('accessToken');
    this.secretsStore.delete('tokenType');
    this.secretsStore.delete('scope');
    this.secretsStore.delete('createdAt');
  }

  public getWebhookSecret(): string | undefined {
    return this.secretsStore.get('webhookSecret') as string | undefined;
  }

  public saveWebhookSecret(secret: string): void {
    this.secretsStore.set('webhookSecret', secret);
  }

  public clearWebhookSecret(): void {
    this.secretsStore.delete('webhookSecret');
  }

  public setVPSHost(host: string): ServerConfig {
    const config = this.getConfig();
    const currentServer: ServerConfig = config.server || {
      protocol: 'http',
      host: '',
      port: null,
      route: '/github-webhook',
    };

    currentServer.host = host.trim();
    this.saveConfig({ server: currentServer });
    return currentServer;
  }

  public setWebhookRoute(route: string): ServerConfig {
    const config = this.getConfig();
    const currentServer: ServerConfig = config.server || {
      protocol: 'http',
      host: '',
      port: null,
      route: '/github-webhook',
    };

    currentServer.route = normalizeRoute(route);
    this.saveConfig({ server: currentServer });
    return currentServer;
  }

  public setRepository(repository: RepositoryConfig): void {
    this.saveConfig({ repository });
  }

  public setUsername(username: string): void {
    this.saveConfig({ github: { username } });
  }

  public clearAll(): void {
    this.configStore.clear();
    this.secretsStore.clear();
  }
}

export const configService = new ConfigService();
