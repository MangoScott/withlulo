import { NextResponse } from "next/server";

export const runtime = 'edge';

export async function POST(req: Request) {
    try {
        const { url } = await req.json();

        if (!url) {
            return NextResponse.json({ error: "URL is required" }, { status: 400 });
        }

        // Puppeteer does not run on Edge Runtime / Cloudflare Pages.
        // Returning a placeholder image service or mock response.

        // Using a reliable placeholder image service
        const screenshotUrl = `https://image.thum.io/get/width/1200/crop/800/${url}`;

        return NextResponse.json({
            screenshot: screenshotUrl,
            title: `Viewing: ${url}`
        });

    } catch (error) {
        console.error("Browser Error:", error);
        return NextResponse.json({ error: "Failed to browse URL" }, { status: 500 });
    }
}
