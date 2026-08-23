import { Command } from 'commander';
import { loginCommand } from './commands/login.js';
import { logoutCommand } from './commands/logout.js';
import { statusCommand } from './commands/status.js';
import { setIpCommand, setRouteCommand, setPortCommand } from './commands/config.js';
import { webhookCreateCommand } from './commands/webhook.js';
import { setupCommand } from './commands/setup.js';
import { logger } from './utils/logger.js';
import { CLIError } from './utils/errors.js';

const program = new Command();

program
  .name('mycli')
  .description('Production-ready CLI tool for GitHub authentication and repository webhook setup')
  .version('1.0.0');

// mycli login
program
  .command('login')
  .description('Authenticate with GitHub using OAuth Device Flow')
  .action(async () => {
    await loginCommand();
  });

// mycli setup
program
  .command('setup')
  .description('Run the complete interactive setup wizard')
  .action(async () => {
    await setupCommand();
  });

// mycli status
program
  .command('status')
  .description('Display authenticated user, selected repository, VPS configuration, and webhook status')
  .action(async () => {
    await statusCommand();
  });

// mycli logout
program
  .command('logout')
  .description('Remove locally stored authentication credentials securely')
  .action(async () => {
    await logoutCommand();
  });

// mycli webhook group
const webhookGroup = program
  .command('webhook')
  .description('Manage GitHub repository webhooks');

webhookGroup
  .command('create')
  .description('Create or configure a GitHub webhook for a repository')
  .action(async () => {
    await webhookCreateCommand();
  });

// mycli config group
const configGroup = program
  .command('config')
  .description('Manage local CLI configuration');

configGroup
  .command('set-ip')
  .argument('<vps_ip>', 'VPS public IP address or domain name (e.g. 123.45.67.89 or server.example.com)')
  .description('Save the VPS public IP address or domain')
  .action(async (vpsIp: string) => {
    await setIpCommand(vpsIp);
  });

configGroup
  .command('set-route')
  .argument('<route>', 'Webhook endpoint route path (e.g. /github-webhook)')
  .description('Save the webhook route path')
  .action(async (route: string) => {
    await setRouteCommand(route);
  });

configGroup
  .command('set-port')
  .argument('<port>', 'Custom port your server listens on (1-65535), or "none" to clear it')
  .description('Save a custom port for the webhook URL (needed when your server is not on the protocol default port)')
  .action(async (port: string) => {
    await setPortCommand(port);
  });

// Global unhandled error handler
process.on('uncaughtException', (err) => {
  if (err instanceof CLIError) {
    logger.error(err);
  } else {
    logger.error(`Unexpected error: ${err.message}`);
  }
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  const message = reason instanceof Error ? reason.message : String(reason);
  logger.error(`Unhandled rejection: ${message}`);
  process.exit(1);
});

program.parseAsync(process.argv);
