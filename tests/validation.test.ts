import { describe, it, expect } from 'vitest';
import { hostSchema, routeSchema, serverConfigSchema } from '../src/config/schema.js';
import { parseRepositoryString } from '../src/utils/validation.js';

describe('Validation Schemas & Utilities', () => {
  describe('hostSchema', () => {
    it('should pass for valid IPv4 and domain strings', () => {
      expect(hostSchema.parse('123.45.67.89')).toBe('123.45.67.89');
      expect(hostSchema.parse('my-vps.example.com')).toBe('my-vps.example.com');
    });

    it('should fail for invalid host strings', () => {
      expect(() => hostSchema.parse('invalid host format')).toThrow();
    });
  });

  describe('routeSchema', () => {
    it('should normalize valid route strings', () => {
      expect(routeSchema.parse('github-webhook')).toBe('/github-webhook');
      expect(routeSchema.parse('/custom/route/')).toBe('/custom/route');
    });
  });

  describe('serverConfigSchema', () => {
    it('should parse valid server config object', () => {
      const input = {
        protocol: 'https',
        host: 'example.com',
        port: 8080,
        route: 'my-route',
      };

      const result = serverConfigSchema.parse(input);
      expect(result).toEqual({
        protocol: 'https',
        host: 'example.com',
        port: 8080,
        route: '/my-route',
      });
    });
  });

  describe('parseRepositoryString', () => {
    it('should parse owner and repository name correctly', () => {
      const parsed = parseRepositoryString('yash/my-project');
      expect(parsed).toEqual({
        owner: 'yash',
        name: 'my-project',
      });
    });

    it('should trim whitespace around owner and name', () => {
      const parsed = parseRepositoryString('  owner-name / repo-name  ');
      expect(parsed).toEqual({
        owner: 'owner-name',
        name: 'repo-name',
      });
    });

    it('should throw ValidationError on missing owner or repo', () => {
      expect(() => parseRepositoryString('single-string')).toThrow();
      expect(() => parseRepositoryString('owner/repo/extra')).toThrow();
      expect(() => parseRepositoryString('/repo')).toThrow();
    });
  });
});
