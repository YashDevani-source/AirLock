import { authService } from '../services/auth.service.js';
import { logger } from '../utils/logger.js';

export async function logoutCommand(): Promise<void> {
  try {
    authService.logout();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`Logout failed: ${msg}`);
    process.exitCode = 1;
  }
}
