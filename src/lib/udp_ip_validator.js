import dns from 'dns';
import { promisify } from 'util';

const resolve4 = promisify(dns.resolve4);

/**
 * Validate IPv4 address format
 * @param {string} ip
 * @returns {boolean}
 */
export function isIPv4(ip) {
    const parts = ip.split('.');
    if (parts.length !== 4) return false;
    return parts.every((part) => {
        if (!/^\d+$/.test(part)) return false;
        const num = parseInt(part, 10);
        return num >= 0 && num <= 255;
    });
}

/**
 * Resolve hostname to IPv4 addresses
 * @param {string} hostname
 * @returns {Promise<string[]>}
 */
async function resolveHostname(hostname) {
    try {
        const addresses = await resolve4(hostname);
        return addresses;
    } catch {
        return [];
    }
}

/**
 * Parse and resolve allowed sources from config
 * @param {string[]} sources - Array of IPs or hostnames
 * @returns {Promise<{ allowedIPs: string[], errors: string[] }>}
 */
export async function parseAllowedSources(sources) {
    const allowedIPs = [];
    const errors = [];

    for (const source of sources) {
        if (isIPv4(source)) {
            allowedIPs.push(source);
        } else {
            // Treat as hostname, try to resolve
            const resolved = await resolveHostname(source);
            if (resolved.length > 0) {
                allowedIPs.push(...resolved);
            } else {
                errors.push(`Cannot resolve hostname or invalid IPv4: "${source}"`);
            }
        }
    }

    return { allowedIPs, errors };
}

/**
 * Check if an IP address is in the allowed list
 * @param {string} ip - The IP address to check
 * @param {string[]} allowedIPs - Array of allowed IP addresses
 * @returns {boolean}
 */
export function isIpAllowed(ip, allowedIPs) {
    if (!allowedIPs || allowedIPs.length === 0) {
        return false; // No IPs configured = deny all
    }

    return allowedIPs.includes(ip);
}
