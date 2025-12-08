import { getRequestContext } from '@cloudflare/next-on-pages';

export function getEnv(key: string): string | undefined {
    // 1. Try Cloudflare Request Context (Edge Runtime)
    try {
        const ctx = getRequestContext();
        if (ctx && ctx.env) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const val = (ctx.env as any)[key];
            if (val) return val;
        }
    } catch (e) {
        // Ignore
    }

    // 2. Fallback to process.env (Node/Local)
    if (typeof process !== 'undefined' && process.env) {
        return process.env[key];
    }

    return undefined;
}

export function requireEnv(key: string): string {
    const val = getEnv(key);
    if (!val) {
        throw new Error(`Missing environment variable: ${key}`);
    }
    return val;
}
