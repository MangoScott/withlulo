import { NextResponse } from "next/server";
import puppeteer from "puppeteer";

export async function POST(req: Request) {
    try {
        const { url } = await req.json();

        if (!url) {
            return NextResponse.json({ error: "URL is required" }, { status: 400 });
        }

        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 800 });

        // Navigate to URL
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

        // Take screenshot
        const screenshot = await page.screenshot({ encoding: 'base64' });
        const title = await page.title();

        await browser.close();

        return NextResponse.json({
            screenshot: `data:image/png;base64,${screenshot}`,
            title
        });

    } catch (error) {
        console.error("Browser Error:", error);
        return NextResponse.json({ error: "Failed to browse URL" }, { status: 500 });
    }
}
