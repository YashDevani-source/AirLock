import chalk from 'chalk';
import ora from 'ora';
import { authService } from '../services/auth.service.js';
import { webhookService } from '../services/webhook.service.js';
import { buildWebhookUrl, isSecureUrl } from '../utils/url.js';
import { promptRepositorySelection, promptServerConfig } from './webhook.js';
import { logger } from '../utils/logger.js';
import { CLIError } from '../utils/errors.js';

export async function setupCommand(): Promise<void> {
  try {
    logger.header('Starting GitHub Webhook Setup Wizard');

    // Step 1: Check Auth
    logger.step(1, 'Checking GitHub authentication...');
    let user = await authService.getAuthenticatedUser();

    if (!user) {
      logger.info('User not authenticated.');
      logger.step(2, 'Starting GitHub OAuth login...');
      const result = await authService.login();
      user = result.user;
    } else {
      logger.success(`Logged in as ${chalk.bold.green(user.login)}`);
    }

    // Step 2: Fetch and Select Repository
    logger.step(3, 'Repository Selection');
    const repoConfig = await promptRepositorySelection();
    logger.success(`Selected repository: ${chalk.bold.cyan(`${repoConfig.owner}/${repoConfig.name}`)}`);

    // Step 3: Configure Server
    logger.step(4, 'Configure Server Settings');
    const { server, webhookSecret } = await promptServerConfig();

    const generatedUrl = buildWebhookUrl(server.protocol, server.host, server.port, server.route);
    console.log('\n' + chalk.bold('Generated Webhook URL:'));
    console.log(`  ${chalk.bold.underline.blue(generatedUrl)}\n`);

    // Step 4: Check Existing Webhooks
    logger.step(5, 'Checking existing repository webhooks...');
    const checkSpinner = ora('Querying GitHub API...').start();
    const existingHook = await webhookService.findWebhookByUrl(repoConfig.owner, repoConfig.name, generatedUrl);
    checkSpinner.stop();

    if (existingHook) {
      logger.warn(`Found an existing webhook matching URL: ${generatedUrl}`);
      const select = (await import('@inquirer/prompts')).select;
      const action = await select({
        message: 'An identical webhook URL already exists on GitHub. What would you like to do?',
        choices: [
          { name: 'Keep existing webhook', value: 'keep' },
          { name: 'Update existing webhook', value: 'update' },
          { name: 'Delete and recreate webhook', value: 'recreate' },
        ],
      });

      if (action === 'keep') {
        logger.success('Kept existing webhook without modifications.');
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
        displaySetupSummary(repoConfig, updated.url, updated.events);
        return;
      }

      if (action === 'recreate') {
        const deleteSpinner = ora('Deleting existing webhook...').start();
        await webhookService.deleteWebhook(repoConfig.owner, repoConfig.name, existingHook.id);
        deleteSpinner.succeed('Deleted existing webhook.');
      }
    }

    // Step 5: Create Webhook
    logger.step(6, 'Creating GitHub webhook...');
    const createSpinner = ora('Sending webhook request to GitHub...').start();
    const createdHook = await webhookService.createWebhook(repoConfig.owner, repoConfig.name, {
      url: generatedUrl,
      secret: webhookSecret,
      events: ['push', 'pull_request'],
      insecureSsl: !isSecureUrl(generatedUrl),
    });
    createSpinner.succeed('Webhook created successfully!');

    displaySetupSummary(repoConfig, createdHook.url, createdHook.events);
  } catch (err: unknown) {
    if (err instanceof CLIError) {
      logger.error(err);
    } else {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error(`Setup wizard failed: ${msg}`);
    }
    process.exitCode = 1;
  }
}

function displaySetupSummary(repo: { owner: string; name: string }, webhookUrl: string, events: string[]) {
  console.log('\n' + chalk.bold.green('✓ Webhook Setup Complete!'));
  console.log('\n' + chalk.bold('Repository:'));
  console.log(`  ${repo.owner}/${repo.name}`);
  console.log('\n' + chalk.bold('Webhook URL:'));
  console.log(`  ${chalk.underline.blue(webhookUrl)}`);
  console.log('\n' + chalk.bold('Events:'));
  for (const event of events) {
    console.log(`  - ${event}`);
  }
  console.log();
}
