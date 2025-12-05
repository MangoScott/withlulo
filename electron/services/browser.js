/**
 * Browser Control Service
 * Provides Puppeteer-based browser automation with visual effects
 */

const puppeteer = require('puppeteer');
const { BrowserWindow } = require('electron');

let browser = null;
let page = null;
let overlayWindow = null;

/**
 * Launch a controlled browser with visual glow effect
 */
async function launchBrowser(options = {}) {
    if (browser) {
        await closeBrowser();
    }

    // Launch Chrome with visible UI
    browser = await puppeteer.launch({
        headless: false,
        defaultViewport: null,
        args: [
            '--start-maximized',
            '--disable-infobars',
            `--window-size=1200,800`,
            '--window-position=100,100',
        ],
        ...options,
    });

    page = (await browser.pages())[0];

    // Create overlay window for glow effect
    createGlowOverlay();

    return {
        success: true,
        message: 'Browser launched with visual control',
    };
}

/**
 * Create a transparent overlay window for the glow effect
 */
function createGlowOverlay() {
    if (overlayWindow) {
        overlayWindow.close();
    }

    overlayWindow = new BrowserWindow({
        width: 1220,
        height: 820,
        x: 90,
        y: 90,
        transparent: true,
        frame: false,
        alwaysOnTop: true,
        focusable: false,
        skipTaskbar: true,
        hasShadow: false,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
        },
    });

    // Load glow overlay HTML
    overlayWindow.loadURL(`data:text/html,
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body {
                    background: transparent;
                    overflow: hidden;
                }
                .glow-border {
                    position: fixed;
                    top: 10px;
                    left: 10px;
                    right: 10px;
                    bottom: 10px;
                    border: 3px solid rgba(217, 119, 87, 0.8);
                    border-radius: 12px;
                    pointer-events: none;
                    box-shadow: 
                        0 0 20px rgba(217, 119, 87, 0.4),
                        0 0 40px rgba(217, 119, 87, 0.2),
                        inset 0 0 20px rgba(217, 119, 87, 0.1);
                    animation: pulse 2s ease-in-out infinite;
                }
                @keyframes pulse {
                    0%, 100% { opacity: 0.8; }
                    50% { opacity: 1; }
                }
                .status-badge {
                    position: fixed;
                    top: 20px;
                    left: 20px;
                    background: rgba(217, 119, 87, 0.95);
                    color: white;
                    padding: 8px 16px;
                    border-radius: 20px;
                    font-family: -apple-system, BlinkMacSystemFont, sans-serif;
                    font-size: 12px;
                    font-weight: 600;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
                }
                .dot {
                    width: 8px;
                    height: 8px;
                    background: white;
                    border-radius: 50%;
                    animation: blink 1s ease-in-out infinite;
                }
                @keyframes blink {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.3; }
                }
            </style>
        </head>
        <body>
            <div class="glow-border"></div>
            <div class="status-badge">
                <div class="dot"></div>
                Lulo is controlling this browser
            </div>
        </body>
        </html>
    `);

    overlayWindow.setIgnoreMouseEvents(true);
}

/**
 * Update the glow status text
 */
function updateGlowStatus(status) {
    if (overlayWindow && !overlayWindow.isDestroyed()) {
        overlayWindow.webContents.executeJavaScript(`
            document.querySelector('.status-badge').innerHTML = 
                '<div class="dot"></div>${status}';
        `);
    }
}

/**
 * Navigate to a URL
 */
async function navigate(url) {
    if (!page) {
        return { success: false, error: 'Browser not launched' };
    }

    updateGlowStatus('Navigating...');

    try {
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
        updateGlowStatus('Lulo is controlling this browser');
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

/**
 * Click at coordinates with visual feedback
 */
async function click(x, y) {
    if (!page) {
        return { success: false, error: 'Browser not launched' };
    }

    updateGlowStatus('Clicking...');

    // Show click indicator on overlay
    if (overlayWindow && !overlayWindow.isDestroyed()) {
        overlayWindow.webContents.executeJavaScript(`
            const indicator = document.createElement('div');
            indicator.style.cssText = \`
                position: fixed;
                left: ${x + 10}px;
                top: ${y + 10}px;
                width: 30px;
                height: 30px;
                border: 2px solid rgba(217, 119, 87, 0.9);
                border-radius: 50%;
                pointer-events: none;
                animation: clickPulse 0.5s ease-out forwards;
            \`;
            document.body.appendChild(indicator);
            setTimeout(() => indicator.remove(), 500);
        `);
    }

    await page.mouse.click(x, y);
    updateGlowStatus('Lulo is controlling this browser');

    return { success: true };
}

/**
 * Type text with visual feedback
 */
async function type(text, options = {}) {
    if (!page) {
        return { success: false, error: 'Browser not launched' };
    }

    updateGlowStatus('Typing...');
    await page.keyboard.type(text, { delay: options.delay || 50 });
    updateGlowStatus('Lulo is controlling this browser');

    return { success: true };
}

/**
 * Take a screenshot
 */
async function screenshot() {
    if (!page) {
        return null;
    }

    const buffer = await page.screenshot({ encoding: 'base64' });
    return `data:image/png;base64,${buffer}`;
}

/**
 * Get page content/HTML
 */
async function getPageContent() {
    if (!page) {
        return null;
    }
    return await page.content();
}

/**
 * Close the browser and overlay
 */
async function closeBrowser() {
    if (overlayWindow && !overlayWindow.isDestroyed()) {
        overlayWindow.close();
        overlayWindow = null;
    }

    if (browser) {
        await browser.close();
        browser = null;
        page = null;
    }

    return { success: true };
}

/**
 * Check if browser is running
 */
function isRunning() {
    return browser !== null && page !== null;
}

module.exports = {
    launchBrowser,
    navigate,
    click,
    type,
    screenshot,
    getPageContent,
    closeBrowser,
    isRunning,
    updateGlowStatus,
};
