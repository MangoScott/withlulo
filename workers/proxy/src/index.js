export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        const rootDomain = "heylulo.com";
        const targetOrigin = "lulo-agent.pages.dev"; // Your Pages URL

        // Check if the request is for a subdomain
        // e.g. "mangoscott.heylulo.com"
        if (url.hostname.endsWith(rootDomain) && url.hostname !== rootDomain && url.hostname !== `www.${rootDomain}`) {

            // Extract subdomain
            const parts = url.hostname.split('.');
            const subdomain = parts[0];

            // Construct the new target URL
            // We rewrite to the internal route: /sites/[subdomain]/...
            // e.g. https://lulo-agent.pages.dev/sites/mangoscott/about
            url.hostname = targetOrigin;
            url.pathname = `/sites/${subdomain}${url.pathname}`;

            console.log(`Proxying ${subdomain} to ${url.toString()}`);

            // Create a new request to the Pages project
            // precise: true ensures we don't get stuck in redirect loops if configured incorrectly
            return fetch(url.toString(), {
                method: request.method,
                headers: request.headers,
                body: request.body
            });
        }

        // If it's not a subdomain (or it's the root), just fetch transparently
        // Assuming this Worker is also triggered for root, but usually you'd verify
        return fetch(request);
    }
};
