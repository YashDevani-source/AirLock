import { isIPv4, isIPv6 } from 'node:net';

/**
 * Normalizes a route string so it begins with a single leading slash
 * and has no trailing slash (unless the route is strictly '/').
 *
 * @example
 * normalizeRoute('github-webhook') // '/github-webhook'
 * normalizeRoute('/github-webhook/') // '/github-webhook'
 */
export function normalizeRoute(route: string): string {
  const trimmed = route.trim();
  if (!trimmed) {
    return '/github-webhook';
  }

  let result = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  if (result.length > 1 && result.endsWith('/')) {
    result = result.slice(0, -1);
  }
  return result;
}

/**
 * Validates whether a host is a valid IPv4 address, IPv6 address, or domain name.
 */
export function validateHost(host: string): boolean {
  const cleaned = host.trim().toLowerCase();
  if (!cleaned) return false;

  // Check IP addresses
  if (isIPv4(cleaned) || isIPv6(cleaned)) {
    return true;
  }

  // Domain regex matching hostname / FQDN (including localhost)
  if (cleaned === 'localhost') return true;

  const domainRegex =
    /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
  return domainRegex.test(cleaned);
}

/**
 * Constructs a full, normalized Webhook URL.
 */
export function buildWebhookUrl(
  protocol: 'http' | 'https',
  host: string,
  port: number | null,
  route: string
): string {
  const normalizedRoute = normalizeRoute(route);
  const cleanedHost = host.trim();

  // If host is IPv6 and not enclosed in brackets, wrap it for URL format
  const formattedHost =
    isIPv6(cleanedHost) && !cleanedHost.startsWith('[')
      ? `[${cleanedHost}]`
      : cleanedHost;

  const portSuffix =
    port &&
    ((protocol === 'http' && port !== 80) ||
      (protocol === 'https' && port !== 443))
      ? `:${port}`
      : '';

  return `${protocol}://${formattedHost}${portSuffix}${normalizedRoute}`;
}

/**
 * Checks if a given webhook URL uses HTTPS.
 */
export function isSecureUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:';
  } catch {
    return url.startsWith('https://');
  }
}
