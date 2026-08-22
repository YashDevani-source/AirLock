import chalk from 'chalk';
import ora from 'ora';
import { authService } from '../services/auth.service.js';
import { configService } from '../services/config.service.js';
import { webhookService } from '../services/webhook.service.js';
import { buildWebhookUrl } from '../utils/url.js';

export async function statusCommand(): Promise<void> {
  console.log('\n' + chalk.bold.cyan('=== GitHub Webhook Automator Status ===\n'));

  // 1. Authentication Status
  const user = await authService.getAuthenticatedUser();
  if (user) {
    console.log(`${chalk.bold('Authenticated GitHub User:')} ${chalk.green(`✓ ${user.login}`)}`);
  } else {
    console.log(`${chalk.bold('Authenticated GitHub User:')} ${chalk.red('✗ Not authenticated')} ${chalk.dim('(Run `mycli login`)')}`);
  }

  // 2. Repository Configuration
  const config = configService.getConfig();
  const repo = config.repository;
  if (repo && repo.owner && repo.name) {
    console.log(`${chalk.bold('Selected Repository:')}       ${chalk.cyan(`${repo.owner}/${repo.name}`)}`);
  } else {
    console.log(`${chalk.bold('Selected Repository:')}       ${chalk.yellow('Not configured')} ${chalk.dim('(Run `mycli setup` or `mycli webhook create`)')}`);
  }

  // 3. VPS Configuration
  const server = config.server;
  if (server && server.host) {
    const portStr = server.port ? `:${server.port}` : '';
    console.log(`${chalk.bold('VPS Host / Domain:')}         ${chalk.white(`${server.host}${portStr}`)}`);
    console.log(`${chalk.bold('Webhook Route:')}             ${chalk.white(server.route)}`);
  } else {
    console.log(`${chalk.bold('VPS Host / Domain:')}         ${chalk.yellow('Not configured')} ${chalk.dim('(Run `mycli config set-ip <VPS_IP>`)')}`);
  }

  // 4. Webhook URL
  let webhookUrl: string | null = null;
  if (server && server.host) {
    webhookUrl = buildWebhookUrl(server.protocol, server.host, server.port, server.route);
    console.log(`${chalk.bold('Generated Webhook URL:')}     ${chalk.bold.underline.blue(webhookUrl)}`);
  } else {
    console.log(`${chalk.bold('Generated Webhook URL:')}     ${chalk.yellow('Not configured')}`);
  }

  // 5. Existing Webhook Status
  if (user && repo && repo.owner && repo.name && webhookUrl) {
    const spinner = ora('Checking remote GitHub webhook status...').start();
    try {
      const existing = await webhookService.findWebhookByUrl(repo.owner, repo.name, webhookUrl);
      if (existing) {
        spinner.succeed(
          `Remote Webhook Status: ${chalk.bold.green('Active')} (Hook ID: #${existing.id}, Events: ${existing.events.join(', ')})`
        );
      } else {
        spinner.warn(
          `Remote Webhook Status: ${chalk.yellow('Not deployed on GitHub')} ${chalk.dim('(Run `mycli webhook create` to deploy)')}`
        );
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      spinner.fail(`Remote Webhook Status: ${chalk.red('Failed to check')} (${msg})`);
    }
  }

  console.log();
}
