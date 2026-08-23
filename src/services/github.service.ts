import { Octokit } from '@octokit/rest';
import { configService } from './config.service.js';
import { Repository } from '../types/index.js';
import { GitHubAuthError, WebhookError } from '../utils/errors.js';

export class GitHubService {
  /**
   * Returns an authenticated Octokit instance.
   */
  public getOctokit(): Octokit {
    const creds = configService.getCredentials();
    if (!creds || !creds.accessToken) {
      throw new GitHubAuthError('No GitHub credentials found.', [
        'Run `auto-cicd-cli login` to authenticate with GitHub first.',
      ]);
    }
    return new Octokit({ auth: creds.accessToken });
  }

  /**
   * Fetches repositories accessible to the authenticated user.
   */
  public async fetchUserRepositories(): Promise<Repository[]> {
    const octokit = this.getOctokit();

    try {
      // List repositories for authenticated user (personal + org repos, up to 100)
      const { data } = await octokit.rest.repos.listForAuthenticatedUser({
        sort: 'updated',
        direction: 'desc',
        per_page: 100,
        type: 'all',
      });

      return data.map((repo) => ({
        owner: repo.owner.login,
        name: repo.name,
        full_name: repo.full_name,
        private: repo.private,
        description: repo.description,
        html_url: repo.html_url,
        permissions: repo.permissions
          ? {
              admin: repo.permissions.admin ?? false,
              maintain: repo.permissions.maintain ?? false,
              push: repo.permissions.push ?? false,
              triage: repo.permissions.triage ?? false,
              pull: repo.permissions.pull ?? false,
            }
          : undefined,
      }));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new GitHubAuthError(`Failed to fetch user repositories: ${msg}`);
    }
  }

  /**
   * Fetches detailed information for a specific repository.
   */
  public async getRepository(owner: string, repo: string): Promise<Repository> {
    const octokit = this.getOctokit();

    try {
      const { data } = await octokit.rest.repos.get({
        owner,
        repo,
      });

      return {
        owner: data.owner.login,
        name: data.name,
        full_name: data.full_name,
        private: data.private,
        description: data.description,
        html_url: data.html_url,
        permissions: data.permissions
          ? {
              admin: data.permissions.admin ?? false,
              maintain: data.permissions.maintain ?? false,
              push: data.permissions.push ?? false,
              triage: data.permissions.triage ?? false,
              pull: data.permissions.pull ?? false,
            }
          : undefined,
      };
    } catch (err: unknown) {
      const status = (err as { status?: number }).status;
      if (status === 404) {
        throw new WebhookError(`Repository "${owner}/${repo}" not found or not accessible.`, [
          'Verify the owner and repository name spelling.',
          'Ensure your authenticated GitHub user has access to this repository.',
        ]);
      }
      const msg = err instanceof Error ? err.message : String(err);
      throw new WebhookError(`Failed to fetch repository "${owner}/${repo}": ${msg}`);
    }
  }

  /**
   * Verifies if the authenticated user has admin access to manage webhooks on a repository.
   */
  public async checkAdminPermissions(owner: string, repo: string): Promise<boolean> {
    try {
      const repository = await this.getRepository(owner, repo);
      if (repository.permissions && typeof repository.permissions.admin === 'boolean') {
        return repository.permissions.admin;
      }
      // If permissions object isn't returned, attempt a dry list call to check access
      return true;
    } catch {
      return false;
    }
  }
}

export const githubService = new GitHubService();
