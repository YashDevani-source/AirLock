import { authService } from '../services/auth.service.js';
import { logger } from '../utils/logger.js';
import { CLIError } from '../utils/errors.js';

export async function loginCommand(): Promise<void> {
  try {
    const existingUser = await authService.getAuthenticatedUser();
    if (existingUser) {
      logger.info(`Already logged in as ${existingUser.login}`);
    }

    const { user } = await authService.login();
    logger.success(`Logged in as: ${user.login}`);
  } catch (err: unknown) {
    if (err instanceof CLIError) {
      logger.error(err);
    } else {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error(`Login failed: ${msg}`);
    }
    process.exitCode = 1;
  }
}
