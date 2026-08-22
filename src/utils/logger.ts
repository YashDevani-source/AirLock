import chalk from 'chalk';
import { CLIError } from './errors.js';

export function maskSecret(secret?: string): string {
  if (!secret) return 'None';
  if (secret.length <= 8) return '********';
  return `${secret.substring(0, 4)}...${secret.substring(secret.length - 4)}`;
}

export const logger = {
  info: (message: string) => {
    console.log(chalk.blue('ℹ'), message);
  },

  success: (message: string) => {
    console.log(chalk.green('✓'), message);
  },

  warn: (message: string) => {
    console.log(chalk.yellow('⚠'), message);
  },

  error: (message: string | CLIError, errorDetails?: unknown) => {
    if (message instanceof CLIError) {
      console.log('\n' + chalk.red.bold(`✗ ${message.message}`));
      if (message.suggestions && message.suggestions.length > 0) {
        console.log('\n' + chalk.yellow('Try:'));
        for (const suggestion of message.suggestions) {
          console.log(chalk.dim(`  - ${suggestion}`));
        }
      }
    } else {
      console.log('\n' + chalk.red.bold(`✗ ${message}`));
    }

    if (errorDetails && process.env.DEBUG) {
      console.error(chalk.gray('\nDebug Details:'), errorDetails);
    }
  },

  step: (stepNumber: number | string, message: string) => {
    console.log(`\n${chalk.cyan.bold(`${stepNumber}.`)} ${chalk.bold(message)}`);
  },

  header: (title: string) => {
    console.log('\n' + chalk.magenta.bold(`🚀 ${title}`) + '\n');
  },

  kv: (key: string, value: string | number | boolean | null | undefined) => {
    const formattedValue = value === null || value === undefined ? chalk.gray('None') : String(value);
    console.log(`${chalk.bold(key)}:\n${formattedValue}\n`);
  },

  list: (items: string[]) => {
    for (const item of items) {
      console.log(chalk.cyan(`  - ${item}`));
    }
  },
};
