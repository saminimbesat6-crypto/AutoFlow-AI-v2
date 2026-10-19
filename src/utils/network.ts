import * as dns from 'node:dns/promises';
import * as net from 'node:net';

export function isPrivateIpAddress(ip: string): boolean {
  const cleanIp = ip.toLowerCase().trim();

  // Handle IPv4-mapped IPv6 (e.g. ::ffff:127.0.0.1 or ::ffff:7f00:1)
  if (cleanIp.startsWith('::ffff:')) {
    const v4Part = cleanIp.slice(7);
    if (net.isIPv4(v4Part)) {
      return isPrivateIpAddress(v4Part);
    }
  }

  // IPv6 checks
  if (net.isIPv6(cleanIp)) {
    if (cleanIp === '::1' || cleanIp === '::') return true;
    // Unique local address (fc00::/7)
    if (cleanIp.startsWith('fc') || cleanIp.startsWith('fd')) return true;
    // Link-local address (fe80::/10)
    if (/^fe[89ab]/i.test(cleanIp)) return true;
    return false;
  }

  // IPv4 checks
  if (net.isIPv4(cleanIp)) {
    const parts = cleanIp.split('.').map((p) => parseInt(p, 10));
    if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
      return true; // malformed, treat as unsafe
    }

    const [a, b] = parts;

    // 0.0.0.0/8
    if (a === 0) return true;
    // 10.0.0.0/8
    if (a === 10) return true;
    // 100.64.0.0/10 (Carrier-Grade NAT)
    if (a === 100 && b >= 64 && b <= 127) return true;
    // 127.0.0.0/8 (Loopback)
    if (a === 127) return true;
    // 169.254.0.0/16 (Link-local & Cloud Metadata)
    if (a === 169 && b === 254) return true;
    // 172.16.0.0/12 (Private)
    if (a === 172 && b >= 16 && b <= 31) return true;
    // 192.168.0.0/16 (Private)
    if (a === 192 && b === 168) return true;
    // 198.18.0.0/15 (Benchmarking)
    if (a === 198 && (b === 18 || b === 19)) return true;
    // 224.0.0.0/4 (Multicast) & 240.0.0.0/4 (Reserved)
    if (a >= 224) return true;

    return false;
  }

  // Non-standard formats (e.g. integer IP like 2130706433 or octal)
  return true;
}

/**
 * Validates a URL against SSRF vulnerabilities by inspecting scheme, hostname,
 * and performing pre-flight DNS resolution against private network ranges.
 */
export async function validateSafeUrl(rawUrl: string, allowPrivate = false): Promise<URL> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error(`Invalid URL format: "${rawUrl}"`);
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(`Security violation: Only HTTP and HTTPS protocols are permitted, got "${parsed.protocol}"`);
  }

  const hostname = parsed.hostname.toLowerCase().trim();

  // If private networks are permitted (e.g. testing or explicit user opt-in)
  if (allowPrivate) {
    return parsed;
  }

  // Fast string checks for standard localhost and metadata names
  if (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '::1' ||
    hostname === '0.0.0.0' ||
    hostname === '169.254.169.254' ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal')
  ) {
    throw new Error(`Security violation: Request to internal host "${hostname}" is blocked by SSRF defense.`);
  }

  // Check if hostname is directly an IP literal
  if (net.isIP(hostname)) {
    if (isPrivateIpAddress(hostname)) {
      throw new Error(`Security violation: Destination IP "${hostname}" belongs to a private/internal network.`);
    }
    return parsed;
  }

  // Pre-resolve DNS to prevent DNS rebinding attacks
  try {
    const records = await dns.lookup(hostname, { all: true });
    for (const record of records) {
      if (isPrivateIpAddress(record.address)) {
        throw new Error(
          `Security violation: Host "${hostname}" resolved to private IP "${record.address}", blocked by SSRF defense.`
        );
      }
    }
  } catch (err: any) {
    if (err.message && err.message.includes('Security violation')) {
      throw err;
    }
    throw new Error(`DNS resolution failed for host "${hostname}": ${err.message}`);
  }

  return parsed;
}

/**
 * Safe fetch wrapper that enforces SSRF checks across all initial and redirected requests.
 */
export async function safeFetch(
  inputUrl: string | URL,
  init: RequestInit = {},
  allowPrivate = false,
  maxRedirects = 5
): Promise<Response> {
  let currentUrl = typeof inputUrl === 'string' ? inputUrl : inputUrl.toString();
  let redirectsRemaining = maxRedirects;

  while (redirectsRemaining >= 0) {
    await validateSafeUrl(currentUrl, allowPrivate);

    const response = await fetch(currentUrl, {
      ...init,
      redirect: 'manual'
    });

    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get('location');
      if (!location) {
        return response;
      }
      currentUrl = new URL(location, currentUrl).toString();
      redirectsRemaining--;
      continue;
    }

    return response;
  }

  throw new Error(`Too many redirects (exceeded limit of ${maxRedirects})`);
}
