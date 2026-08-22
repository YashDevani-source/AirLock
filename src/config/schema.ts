import { z } from 'zod';
import { validateHost, normalizeRoute } from '../utils/url.js';

export const hostSchema = z
  .string()
  .trim()
  .min(1, 'Host IP or domain is required.')
  .refine(
    (val) => validateHost(val),
    {
      message: 'Must be a valid IPv4 address, IPv6 address, or domain name (e.g. 123.45.67.89 or example.com).',
    }
  );

export const routeSchema = z
  .string()
  .trim()
  .min(1, 'Route cannot be empty.')
  .transform((val) => normalizeRoute(val));

export const portSchema = z
  .number()
  .int()
  .min(1, 'Port must be between 1 and 65535.')
  .max(65535, 'Port must be between 1 and 65535.')
  .nullable()
  .optional();

export const protocolSchema = z.enum(['http', 'https']);

export const serverConfigSchema = z.object({
  protocol: protocolSchema,
  host: hostSchema,
  port: portSchema,
  route: routeSchema,
});

export const repositoryConfigSchema = z.object({
  owner: z.string().trim().min(1, 'Repository owner is required.'),
  name: z.string().trim().min(1, 'Repository name is required.'),
});

export const cliConfigSchema = z.object({
  github: z
    .object({
      username: z.string().trim().min(1),
    })
    .optional(),
  repository: repositoryConfigSchema.optional(),
  server: serverConfigSchema.optional(),
});

export const webhookUrlSchema = z
  .string()
  .url('Must be a valid Webhook URL (e.g. http://123.45.67.89/github-webhook).');
