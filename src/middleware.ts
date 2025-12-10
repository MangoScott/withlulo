import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const url = request.nextUrl;

    // Get hostname (e.g. "sub.heylulo.com" or "sub.localhost:3000")
    let hostname = request.headers.get('host') || 'heylulo.com';

    // Remove port if present
    hostname = hostname.replace(/:\d+$/, '');

    // Define domains
    // Adjust these validation logic based on your actual deployment domains
    const isLocal = hostname.includes('localhost');
    const rootDomain = isLocal ? 'localhost' : 'heylulo.com';

    // Check if it's the main domain or www
    if (hostname === rootDomain || hostname === `www.${rootDomain}`) {
        return NextResponse.next();
    }

    // Also handle the Cloudflare Pages default domain if necessary, or ignore
    if (hostname.endsWith('.pages.dev')) {
        // e.g. lulo-agent.pages.dev -> Main
        // sub.lulo-agent.pages.dev -> Sub? 
        // Managing wildcards on pages.dev is different. 
        // We will assume "heylulo.com" is the target for wildcards.
        return NextResponse.next();
    }

    // Extract subdomain
    // Assumptions: hostname is "[subdomain].[rootDomain]"
    // e.g. "mangoscott.heylulo.com" -> "mangoscott"
    const subdomain = hostname.replace(`.${rootDomain}`, '');

    // Allow strict "dashboard" or "app" subdomains to go to main if needed?
    // For now, treat all as sites.

    console.log(`Rewriting subdomain ${subdomain} to /sites/${subdomain}`);

    // Rewrite the URL to the dynamic route
    // We map "/" to "/sites/[subdomain]"
    // We keeps paths: "/about" -> "/sites/[subdomain]/about" (though our sites are currently single page)
    url.pathname = `/sites/${subdomain}${url.pathname}`;

    return NextResponse.rewrite(url);
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - dashboard (Dashboard paths shouldn't be rewritten if accessed on main domain, 
         *   but if accessed on subdomain, they become site paths)
         */
        '/((?!api|_next/static|_next/image|favicon.ico).*)',
    ],
};
