import { describe, it, expect } from 'vitest';
import {
  normalizeRoute,
  validateHost,
  buildWebhookUrl,
  isSecureUrl,
} from '../src/utils/url.js';

describe('URL Utility Functions', () => {
  describe('normalizeRoute', () => {
    it('should add a leading slash if missing', () => {
      expect(normalizeRoute('github-webhook')).toBe('/github-webhook');
    });

    it('should preserve leading slash if already present', () => {
      expect(normalizeRoute('/github-webhook')).toBe('/github-webhook');
    });

    it('should strip trailing slash', () => {
      expect(normalizeRoute('/github-webhook/')).toBe('/github-webhook');
      expect(normalizeRoute('github-webhook/')).toBe('/github-webhook');
    });

    it('should default to /github-webhook if empty or whitespace', () => {
      expect(normalizeRoute('')).toBe('/github-webhook');
      expect(normalizeRoute('   ')).toBe('/github-webhook');
    });

    it('should handle multi-segment route paths', () => {
      expect(normalizeRoute('api/v1/github-webhook/')).toBe('/api/v1/github-webhook');
    });
  });

  describe('validateHost', () => {
    it('should validate valid IPv4 addresses', () => {
      expect(validateHost('123.45.67.89')).toBe(true);
      expect(validateHost('192.168.1.1')).toBe(true);
      expect(validateHost('10.0.0.1')).toBe(true);
    });

    it('should reject invalid IPv4 addresses', () => {
      expect(validateHost('256.0.0.1')).toBe(false);
      expect(validateHost('123.45.67')).toBe(false);
      expect(validateHost('-invalid..host')).toBe(false);
    });

    it('should validate valid IPv6 addresses', () => {
      expect(validateHost('::1')).toBe(true);
      expect(validateHost('2001:0db8:85a3:0000:0000:8a2e:0370:7334')).toBe(true);
    });

    it('should validate valid domain names', () => {
      expect(validateHost('example.com')).toBe(true);
      expect(validateHost('server.my-domain.co.uk')).toBe(true);
      expect(validateHost('localhost')).toBe(true);
    });

    it('should reject invalid domain formats', () => {
      expect(validateHost('')).toBe(false);
      expect(validateHost('http://example.com')).toBe(false);
      expect(validateHost('example..com')).toBe(false);
    });
  });

  describe('buildWebhookUrl', () => {
    it('should construct standard HTTP URL', () => {
      const url = buildWebhookUrl('http', '123.45.67.89', null, 'github-webhook');
      expect(url).toBe('http://123.45.67.89/github-webhook');
    });

    it('should construct HTTPS URL with custom route', () => {
      const url = buildWebhookUrl('https', 'example.com', null, '/webhooks/github');
      expect(url).toBe('https://example.com/webhooks/github');
    });

    it('should include custom port if not standard', () => {
      const url = buildWebhookUrl('http', '123.45.67.89', 3000, 'github-webhook');
      expect(url).toBe('http://123.45.67.89:3000/github-webhook');
    });

    it('should omit port 80 for HTTP and 443 for HTTPS', () => {
      expect(buildWebhookUrl('http', 'example.com', 80, 'hook')).toBe('http://example.com/hook');
      expect(buildWebhookUrl('https', 'example.com', 443, 'hook')).toBe('https://example.com/hook');
    });
  });

  describe('isSecureUrl', () => {
    it('should return true for HTTPS URLs', () => {
      expect(isSecureUrl('https://example.com/webhook')).toBe(true);
    });

    it('should return false for HTTP URLs', () => {
      expect(isSecureUrl('http://123.45.67.89/webhook')).toBe(false);
    });
  });
});
