import { getRequestContext } from '@cloudflare/next-on-pages';

export function getEnv(key: string): string | undefined {
    // 1. Try Cloudflare Request Context (Edge Runtime)
    try {
        const ctx = getRequestContext();
        if (ctx && ctx.env) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const env = ctx.env as any;

            // Direct match
            if (env[key]) return env[key];

            // Fuzzy match in ctx.env
            const fuzzyKey = Object.keys(env).find(k => k.trim() === key);
            if (fuzzyKey) return env[fuzzyKey]?.trim();
        }
    } catch (e) {
        // Ignore
    }

    // 2. Fallback to process.env (Node/Local) with fuzzy matching
    if (typeof process !== 'undefined' && process.env) {
        // Direct match
        if (process.env[key]) return process.env[key];

        // Fuzzy match (handle whitespace keys like "KEY\t")
        const fuzzyKey = Object.keys(process.env).find(k => k.trim() === key);
        if (fuzzyKey) {
            return process.env[fuzzyKey]?.trim();
        }
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
