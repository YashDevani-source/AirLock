import { input, select, password, confirm } from '@inquirer/prompts';
import ora from 'ora';
import chalk from 'chalk';
import { authService } from '../services/auth.service.js';
import { githubService } from '../services/github.service.js';
import { webhookService } from '../services/webhook.service.js';
import { configService } from '../services/config.service.js';
import { buildWebhookUrl, isSecureUrl, normalizeRoute } from '../utils/url.js';
import { validateHostInput, validateRouteInput, parseRepositoryString } from '../utils/validation.js';
import { Repository, ServerConfig, RepositoryConfig } from '../types/index.js';
import { logger } from '../utils/logger.js';
import { CLIError } from '../utils/errors.js';

export async function promptRepositorySelection(): Promise<RepositoryConfig> {
  const fetchSpinner = ora('Fetching accessible GitHub repositories...').start();
  let userRepos: Repository[] = [];

  try {
    userRepos = await githubService.fetchUserRepositories();
    fetchSpinner.succeed(`Fetched ${userRepos.length} repositories.`);
  } catch (err) {
    fetchSpinner.fail('Could not list repositories automatically.');
    logger.warn('Falling back to manual repository entry.');
  }

  const choices: Array<{ name: string; value: string }> = userRepos.map((r) => ({
    name: `${r.full_name}${r.private ? ' (Private)' : ''}`,
    value: r.full_name,
  }));

  choices.push({
    name: '➕ Manually enter repository (owner/repository)',
    value: '__MANUAL__',
  });

  const selectedStr = await select({
    message: 'Select a repository:',
    choices,
  });

  if (selectedStr === '__MANUAL__') {
    const manualInput = await input({
      message: 'Enter repository in owner/repository format (e.g. yash/my-project):',
      validate: (val) => {
        try {
          parseRepositoryString(val);
          return true;
        } catch (err: unknown) {
          return err instanceof Error ? err.message : 'Invalid repository format.';
        }
      },
    });

    const parsed = parseRepositoryString(manualInput);
    configService.setRepository(parsed);
    return parsed;
  }

  const parsed = parseRepositoryString(selectedStr);
  configService.setRepository(parsed);
  return parsed;
}

export async function promptServerConfig(): Promise<{ server: ServerConfig; webhookSecret?: string }> {
  const current = configService.getConfig().server;

  // 1. VPS IP or domain
  const hostInput = await input({
    message: 'Enter your VPS public IP or domain name:',
    default: current?.host || '',
    validate: validateHostInput,
  });
  const host = hostInput.trim();

  // 2. Protocol
  const protocol = await select<'http' | 'https'>({
    message: 'Select protocol:',
    choices: [
      { name: 'HTTP (Standard unencrypted)', value: 'http' },
      { name: 'HTTPS (Secure - Recommended)', value: 'https' },
    ],
    default: current?.protocol || 'http',
  });

  if (protocol === 'http') {
    logger.warn('Security Notice: You selected HTTP. For production environments, HTTPS is strongly recommended.');
  }

  // 3. Port (optional)
  const portAnswer = await input({
    message: 'Enter custom port (leave empty for standard port):',
    default: current?.port ? String(current.port) : '',
    validate: (val) => {
      if (!val.trim()) return true;
      const num = Number(val.trim());
      if (isNaN(num) || num < 1 || num > 65535) {
        return 'Port must be a number between 1 and 65535.';
      }
      return true;
    },
  });

  const port = portAnswer.trim() ? Number(portAnswer.trim()) : null;

  // 4. Route
  const routeInput = await input({
    message: 'Enter webhook route:',
    default: current?.route || '/github-webhook',
    validate: validateRouteInput,
  });

  const route = normalizeRoute(routeInput);

  // Save server configuration
  const server: ServerConfig = { protocol, host, port, route };
  configService.saveConfig({ server });

  // 5. Optional Webhook secret
  const setSecret = await confirm({
    message: 'Do you want to configure a secret token for payload signature verification?',
    default: false,
  });

  let webhookSecret: string | undefined = undefined;
  if (setSecret) {
    webhookSecret = await password({
      message: 'Enter your Webhook Secret:',
      mask: '*',
    });
    if (webhookSecret.trim()) {
      configService.saveWebhookSecret(webhookSecret.trim());
    }
  } else {
    configService.clearWebhookSecret();
  }

  return { server, webhookSecret };
}

export async function webhookCreateCommand(): Promise<void> {
  try {
    // 1. Auth verification
    let user = await authService.getAuthenticatedUser();
    if (!user) {
      logger.info('User not authenticated. Starting login process...');
      const result = await authService.login();
      user = result.user;
    } else {
      logger.success(`Logged in as: ${user.login}`);
    }

    // 2. Select Repository
    const repoConfig = await promptRepositorySelection();
    logger.success(`Selected repository: ${repoConfig.owner}/${repoConfig.name}`);

    // 3. Configure Server
    const { server, webhookSecret } = await promptServerConfig();
    const generatedUrl = buildWebhookUrl(server.protocol, server.host, server.port, server.route);

    console.log('\n' + chalk.bold('Generated Webhook URL:'));
    console.log(chalk.bold.underline.blue(generatedUrl) + '\n');

    // 4. Check Existing Webhooks
    const checkSpinner = ora('Checking existing repository webhooks...').start();
    const existingHook = await webhookService.findWebhookByUrl(repoConfig.owner, repoConfig.name, generatedUrl);
    checkSpinner.stop();

    if (existingHook) {
      logger.warn(`Found an existing webhook matching URL: ${generatedUrl}`);
      const action = await select({
        message: 'An identical webhook URL already exists on GitHub. What would you like to do?',
        choices: [
          { name: 'Keep existing webhook (No changes)', value: 'keep' },
          { name: 'Update existing webhook configuration', value: 'update' },
          { name: 'Delete existing webhook and recreate new one', value: 'recreate' },
        ],
      });

      if (action === 'keep') {
        logger.info('Keeping existing webhook.');
        logger.kv('Webhook URL', existingHook.url);
        logger.kv('Webhook ID', existingHook.id);
        return;
      }

      if (action === 'update') {
        const updateSpinner = ora('Updating existing GitHub webhook...').start();
        const updated = await webhookService.updateWebhook(repoConfig.owner, repoConfig.name, existingHook.id, {
          url: generatedUrl,
          secret: webhookSecret,
          events: ['push', 'pull_request'],
          insecureSsl: !isSecureUrl(generatedUrl),
        });
        updateSpinner.succeed('Webhook updated successfully!');
        displayWebhookDetails(repoConfig, updated);
        return;
      }

      if (action === 'recreate') {
        const deleteSpinner = ora('Deleting existing webhook...').start();
        await webhookService.deleteWebhook(repoConfig.owner, repoConfig.name, existingHook.id);
        deleteSpinner.succeed('Deleted old webhook.');
      }
    }

    // 5. Create Webhook
    const createSpinner = ora('Creating GitHub repository webhook...').start();
    const createdHook = await webhookService.createWebhook(repoConfig.owner, repoConfig.name, {
      url: generatedUrl,
      secret: webhookSecret,
      events: ['push', 'pull_request'],
      insecureSsl: !isSecureUrl(generatedUrl),
    });
    createSpinner.succeed('Webhook created successfully!');

    displayWebhookDetails(repoConfig, createdHook);
  } catch (err: unknown) {
    if (err instanceof CLIError) {
      logger.error(err);
    } else {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error(`Webhook creation failed: ${msg}`);
    }
    process.exitCode = 1;
  }
}

function displayWebhookDetails(repo: RepositoryConfig, hook: { id: number; url: string; events: string[] }) {
  console.log('\n' + chalk.bold.green('✓ Webhook Configuration Complete!'));
  console.log('\n' + chalk.bold('Repository:'));
  console.log(`  ${repo.owner}/${repo.name}`);
  console.log('\n' + chalk.bold('Webhook ID:'));
  console.log(`  #${hook.id}`);
  console.log('\n' + chalk.bold('Webhook URL:'));
  console.log(`  ${chalk.underline.blue(hook.url)}`);
  console.log('\n' + chalk.bold('Subscribed Events:'));
  for (const event of hook.events) {
    console.log(`  - ${event}`);
  }
  console.log();
}
