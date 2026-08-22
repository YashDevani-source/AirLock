import { githubService } from './github.service.js';
import { WebhookDetails, WebhookOptions } from '../types/index.js';
import { WebhookError } from '../utils/errors.js';

export class WebhookService {
  /**
   * Fetches all webhooks for a given repository.
   */
  public async listWebhooks(owner: string, repo: string): Promise<WebhookDetails[]> {
    const octokit = githubService.getOctokit();

    try {
      const { data } = await octokit.rest.repos.listWebhooks({
        owner,
        repo,
        per_page: 100,
      });

      return data.map((hook) => ({
        id: hook.id,
        url: hook.config.url || '',
        active: hook.active,
        events: hook.events,
        contentType: (hook.config.content_type as string) || 'json',
        createdAt: hook.created_at,
        updatedAt: hook.updated_at,
      }));
    } catch (err: unknown) {
      const status = (err as { status?: number }).status;
      if (status === 404) {
        throw new WebhookError(`Repository "${owner}/${repo}" not found or you lack permission to view webhooks.`, [
          'Verify the repository name spelling.',
          'Ensure your account has admin access to this repository.',
        ]);
      }
      if (status === 403) {
        throw new WebhookError(`You do not have admin permissions to manage webhooks on "${owner}/${repo}".`, [
          'Ask the repository owner to grant you admin privileges.',
          'Re-authenticate with a GitHub user account that owns or manages this repository.',
        ]);
      }
      const msg = err instanceof Error ? err.message : String(err);
      throw new WebhookError(`Failed to list webhooks for "${owner}/${repo}": ${msg}`);
    }
  }

  /**
   * Checks whether a webhook with the given target URL already exists for the repository.
   */
  public async findWebhookByUrl(
    owner: string,
    repo: string,
    targetUrl: string
  ): Promise<WebhookDetails | null> {
    const hooks = await this.listWebhooks(owner, repo);
    const normalizedTarget = targetUrl.trim().replace(/\/$/, '');

    const existing = hooks.find((h) => {
      const normalizedHookUrl = h.url.trim().replace(/\/$/, '');
      return normalizedHookUrl === normalizedTarget;
    });

    return existing || null;
  }

  /**
   * Creates a new GitHub repository webhook.
   */
  public async createWebhook(
    owner: string,
    repo: string,
    options: WebhookOptions
  ): Promise<WebhookDetails> {
    const octokit = githubService.getOctokit();

    const events = options.events && options.events.length > 0 ? options.events : ['push', 'pull_request'];
    const insecureSsl = options.insecureSsl ? '1' : '0';

    const webhookConfig: Record<string, string> = {
      url: options.url,
      content_type: 'json',
      insecure_ssl: insecureSsl,
    };

    if (options.secret) {
      webhookConfig.secret = options.secret;
    }

    try {
      const { data } = await octokit.rest.repos.createWebhook({
        owner,
        repo,
        name: 'web',
        active: options.active !== undefined ? options.active : true,
        events,
        config: webhookConfig,
      });

      return {
        id: data.id,
        url: data.config.url || options.url,
        active: data.active,
        events: data.events,
        contentType: (data.config.content_type as string) || 'json',
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    } catch (err: unknown) {
      const status = (err as { status?: number }).status;
      if (status === 403) {
        throw new WebhookError(`Permission denied: Cannot create webhook for "${owner}/${repo}".`, [
          'Check repository admin permissions.',
          'Verify your GitHub OAuth scope includes "admin:repo_hook" or "repo".',
        ]);
      }
      if (status === 422) {
        throw new WebhookError(`Invalid webhook parameters or webhook already exists on GitHub for "${owner}/${repo}".`, [
          'Check that the webhook URL is valid and publicly accessible.',
        ]);
      }
      const msg = err instanceof Error ? err.message : String(err);
      throw new WebhookError(`Failed to create webhook: ${msg}`);
    }
  }

  /**
   * Updates an existing GitHub repository webhook.
   */
  public async updateWebhook(
    owner: string,
    repo: string,
    hookId: number,
    options: WebhookOptions
  ): Promise<WebhookDetails> {
    const octokit = githubService.getOctokit();

    const events = options.events && options.events.length > 0 ? options.events : ['push', 'pull_request'];
    const insecureSsl = options.insecureSsl ? '1' : '0';

    const webhookConfig: Record<string, string> = {
      url: options.url,
      content_type: 'json',
      insecure_ssl: insecureSsl,
    };

    if (options.secret) {
      webhookConfig.secret = options.secret;
    }

    try {
      const { data } = await octokit.rest.repos.updateWebhook({
        owner,
        repo,
        hook_id: hookId,
        active: options.active !== undefined ? options.active : true,
        events,
        config: webhookConfig,
      });

      return {
        id: data.id,
        url: data.config.url || options.url,
        active: data.active,
        events: data.events,
        contentType: (data.config.content_type as string) || 'json',
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new WebhookError(`Failed to update webhook #${hookId} for "${owner}/${repo}": ${msg}`);
    }
  }

  /**
   * Deletes a GitHub repository webhook.
   */
  public async deleteWebhook(owner: string, repo: string, hookId: number): Promise<void> {
    const octokit = githubService.getOctokit();

    try {
      await octokit.rest.repos.deleteWebhook({
        owner,
        repo,
        hook_id: hookId,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new WebhookError(`Failed to delete webhook #${hookId} for "${owner}/${repo}": ${msg}`);
    }
  }
}

export const webhookService = new WebhookService();
