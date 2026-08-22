import { createOAuthDeviceAuth } from '@octokit/auth-oauth-device';
import { Octokit } from '@octokit/rest';
import dotenv from 'dotenv';
import ora from 'ora';
import chalk from 'chalk';
import { configService } from './config.service.js';
import { GitHubUser, AuthCredentials } from '../types/index.js';
import { GitHubAuthError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

dotenv.config();

// Default GitHub OAuth Client ID for CLI Device Flow (or user overridden via GITHUB_CLIENT_ID)
const DEFAULT_CLIENT_ID = '178c6fc778ccc68e1d6a'; // GitHub CLI OAuth app client ID

export class AuthService {
  private getClientId(): string {
    return process.env.GITHUB_CLIENT_ID || DEFAULT_CLIENT_ID;
  }

  /**
   * Initiates GitHub OAuth Device Authorization Flow and polls until user completes login.
   */
  public async login(): Promise<{ user: GitHubUser; token: string }> {
    const clientId = this.getClientId();
    const spinner = ora('Initializing GitHub Device Flow...').start();

    try {
      const auth = createOAuthDeviceAuth({
        clientType: 'oauth-app',
        clientId,
        scopes: ['repo', 'read:user', 'admin:repo_hook'],
        onVerification: (verification) => {
          spinner.stop();
          console.log('\n' + chalk.bold.cyan('=== GitHub Authentication Required ==='));
          console.log(`\n1. Please visit the authorization URL in your browser:`);
          console.log(`   ${chalk.bold.underline.blue(verification.verification_uri)}`);
          console.log(`\n2. Enter the following code:`);
          console.log(`   ${chalk.bold.black.bgYellow(`  ${verification.user_code}  `)}`);
          console.log(`\nWaiting for authorization (code expires in ${Math.floor(verification.expires_in / 60)} minutes)...\n`);

          spinner.start('Waiting for user authorization on GitHub...');
        },
      });

      const tokenAuthentication = await auth({ type: 'oauth' });
      spinner.succeed('Device authorization confirmed!');

      const token = tokenAuthentication.token;
      const verifySpinner = ora('Verifying authenticated account with GitHub...').start();

      const user = await this.verifyToken(token);
      verifySpinner.succeed(`Logged in as: ${chalk.bold.green(user.login)}`);

      // Store credentials securely
      const credentials: AuthCredentials = {
        accessToken: token,
        tokenType: tokenAuthentication.tokenType,
        scope: tokenAuthentication.scopes.join(','),
        createdAt: new Date().toISOString(),
      };

      configService.saveCredentials(credentials);
      configService.setUsername(user.login);

      return { user, token };
    } catch (err: unknown) {
      spinner.fail('GitHub authentication failed.');
      const errorMessage = err instanceof Error ? err.message : String(err);
      throw new GitHubAuthError(`Authentication failed: ${errorMessage}`);
    }
  }

  /**
   * Verifies an access token with GitHub REST API and returns authenticated user info.
   */
  public async verifyToken(token: string): Promise<GitHubUser> {
    try {
      const octokit = new Octokit({ auth: token });
      const { data } = await octokit.rest.users.getAuthenticated();

      return {
        login: data.login,
        id: data.id,
        name: data.name,
        email: data.email,
        avatar_url: data.avatar_url,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Invalid or expired GitHub token';
      throw new GitHubAuthError(`Token verification failed: ${message}`, [
        'Run `mycli login` to re-authenticate with GitHub.',
      ]);
    }
  }

  /**
   * Retrieves current authenticated user if credentials exist and token is valid.
   */
  public async getAuthenticatedUser(): Promise<GitHubUser | null> {
    const creds = configService.getCredentials();
    if (!creds || !creds.accessToken) {
      return null;
    }

    try {
      return await this.verifyToken(creds.accessToken);
    } catch {
      return null;
    }
  }

  /**
   * Logs out user by wiping credentials.
   */
  public logout(): void {
    configService.clearCredentials();
    logger.success('Logged out successfully. Removed local GitHub authentication token.');
  }
}

export const authService = new AuthService();
