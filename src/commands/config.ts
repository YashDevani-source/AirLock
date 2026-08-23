import { configService } from '../services/config.service.js';
import { hostSchema, routeSchema, portSchema } from '../config/schema.js';
import { buildWebhookUrl } from '../utils/url.js';
import { logger } from '../utils/logger.js';
import { CLIError } from '../utils/errors.js';

export async function setIpCommand(vpsIp: string): Promise<void> {
  try {
    const parseResult = hostSchema.safeParse(vpsIp);
    if (!parseResult.success) {
      const msg = parseResult.error.errors[0]?.message || 'Invalid VPS IP or domain.';
      throw new CLIError(`Invalid IP/domain "${vpsIp}": ${msg}`, [
        'Enter a valid IPv4 address (e.g. 123.45.67.89)',
        'Or a valid domain name (e.g. server.example.com)',
      ]);
    }

    const host = parseResult.data;
    const server = configService.setVPSHost(host);

    logger.success(`Saved VPS host: ${server.host}`);

    const webhookUrl = buildWebhookUrl(
      server.protocol,
      server.host,
      server.port,
      server.route
    );
    logger.info(`Updated generated Webhook URL: ${webhookUrl}`);
  } catch (err: unknown) {
    if (err instanceof CLIError) {
      logger.error(err);
    } else {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error(`Failed to set VPS IP: ${msg}`);
    }
    process.exitCode = 1;
  }
}

export async function setPortCommand(portInput: string): Promise<void> {
  try {
    const trimmed = portInput.trim();
    let port: number | null = null;

    if (trimmed && trimmed.toLowerCase() !== 'none') {
      const num = Number(trimmed);
      const parseResult = portSchema.safeParse(num);
      if (!parseResult.success || Number.isNaN(num)) {
        const msg = parseResult.error?.errors[0]?.message || 'Invalid port number.';
        throw new CLIError(`Invalid port "${portInput}": ${msg}`, [
          'Enter a port number between 1 and 65535 (e.g. 3000).',
          'Pass "none" to clear a previously configured port and use the protocol default.',
        ]);
      }
      port = num;
    }

    const server = configService.setPort(port);

    logger.success(port === null ? 'Cleared custom port (using protocol default).' : `Saved port: ${server.port}`);

    if (server.host) {
      const webhookUrl = buildWebhookUrl(
        server.protocol,
        server.host,
        server.port,
        server.route
      );
      logger.info(`Updated generated Webhook URL: ${webhookUrl}`);
    }
  } catch (err: unknown) {
    if (err instanceof CLIError) {
      logger.error(err);
    } else {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error(`Failed to set port: ${msg}`);
    }
    process.exitCode = 1;
  }
}

export async function clearSecretCommand(): Promise<void> {
  configService.clearWebhookSecret();
  logger.success('Cleared saved webhook secret. Signatures will no longer be verified.');
}

export async function setRouteCommand(route: string): Promise<void> {
  try {
    const parseResult = routeSchema.safeParse(route);
    if (!parseResult.success) {
      const msg = parseResult.error.errors[0]?.message || 'Invalid route format.';
      throw new CLIError(`Invalid route "${route}": ${msg}`, [
        'Specify a route path like "/github-webhook" or "github-webhook".',
      ]);
    }

    const normalizedRoute = parseResult.data;
    const server = configService.setWebhookRoute(normalizedRoute);

    logger.success(`Saved webhook route: ${server.route}`);

    if (server.host) {
      const webhookUrl = buildWebhookUrl(
        server.protocol,
        server.host,
        server.port,
        server.route
      );
      logger.info(`Updated generated Webhook URL: ${webhookUrl}`);
    }
  } catch (err: unknown) {
    if (err instanceof CLIError) {
      logger.error(err);
    } else {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error(`Failed to set webhook route: ${msg}`);
    }
    process.exitCode = 1;
  }
}
