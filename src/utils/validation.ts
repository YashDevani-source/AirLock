import { hostSchema, routeSchema } from '../config/schema.js';
import { ValidationError } from './errors.js';

export function validateHostInput(input: string): true | string {
  const result = hostSchema.safeParse(input);
  if (!result.success) {
    return result.error.errors[0]?.message || 'Invalid host IP or domain.';
  }
  return true;
}

export function validateRouteInput(input: string): true | string {
  const result = routeSchema.safeParse(input);
  if (!result.success) {
    return result.error.errors[0]?.message || 'Invalid route format.';
  }
  return true;
}

export function parseRepositoryString(repoString: string): { owner: string; name: string } {
  const parts = repoString.trim().split('/');
  if (parts.length !== 2 || !parts[0]?.trim() || !parts[1]?.trim()) {
    throw new ValidationError(
      `Invalid repository format "${repoString}". Expected "owner/repository".`,
      [
        'Specify the repository in the format "owner/name" (e.g., "yash/my-project").',
      ]
    );
  }
  return {
    owner: parts[0].trim(),
    name: parts[1].trim(),
  };
}
