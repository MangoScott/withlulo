// Content Script for page interaction
let clickModeEnabled = false;
let highlightOverlay = null;
let luloGlow = null;
let luloCursor = null;

// Create the Lulo glow border
function createLuloGlow() {
    if (luloGlow) return;

    luloGlow = document.createElement('div');
    luloGlow.id = 'lulo-glow';
    luloGlow.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        pointer-events: none;
        z-index: 2147483646;
        border: 3px solid transparent;
        border-radius: 0;
        box-shadow: inset 0 0 60px rgba(115, 158, 130, 0.4), 
        inset 0 0 120px rgba(115, 158, 130, 0.2);
        animation: luloGlowPulse 2s ease-in-out infinite;
        opacity: 0;
        transition: opacity 0.3s ease;
    `;

    // Add the keyframes
    const style = document.createElement('style');
    style.id = 'lulo-styles';
    style.textContent = `
        @keyframes luloGlowPulse {
            0%, 100% { 
                box-shadow: inset 0 0 60px rgba(115, 158, 130, 0.45), 
                            inset 0 0 160px rgba(115, 158, 130, 0.25);
            }
            50% { 
                box-shadow: inset 0 0 100px rgba(115, 158, 130, 0.7), 
                            inset 0 0 240px rgba(115, 158, 130, 0.4);
            }
        }
        @keyframes luloCursorPulse {
            0%, 100% { transform: translate(-50%, -50%) scale(1); }
            50% { transform: translate(-50%, -50%) scale(1.2); }
        }
        @keyframes luloHighlight {
            0% { background: rgba(115, 158, 130, 0.3); }
            100% { background: rgba(115, 158, 130, 0.1); }
        }
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
    `;
    document.head.appendChild(style);
    document.body.appendChild(luloGlow);
}

// Create animated cursor - glowing blob like Antigravity
function createLuloCursor() {
    if (luloCursor) return luloCursor;

    luloCursor = document.createElement('div');
    luloCursor.id = 'lulo-cursor';
    luloCursor.innerHTML = `
        <div class="lulo-blob-outer"></div>
        <div class="lulo-blob-inner"></div>
        <div class="lulo-blob-core"></div>
    `;
    luloCursor.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        width: 40px;
        height: 40px;
        transform: translate(-50%, -50%);
        pointer-events: none;
        z-index: 2147483647;
        opacity: 0;
        transition: opacity 0.3s ease;
    `;

    // Add blob styles
    const blobStyle = document.createElement('style');
    blobStyle.id = 'lulo-blob-styles';
    blobStyle.textContent = `
        #lulo-cursor .lulo-blob-outer {
            position: absolute;
            top: 50%;
            left: 50%;
            width: 40px;
            height: 40px;
            transform: translate(-50%, -50%);
            background: radial-gradient(circle, rgba(115, 158, 130, 0.3) 0%, transparent 70%);
            border-radius: 50%;
            animation: luloBlobPulse 1.5s ease-in-out infinite;
        }
        #lulo-cursor .lulo-blob-inner {
            position: absolute;
            top: 50%;
            left: 50%;
            width: 24px;
            height: 24px;
            transform: translate(-50%, -50%);
            background: radial-gradient(circle, rgba(115, 158, 130, 0.6) 0%, rgba(115, 158, 130, 0.3) 60%, transparent 100%);
            border-radius: 50%;
            animation: luloBlobPulse 1.5s ease-in-out infinite 0.2s;
            filter: blur(2px);
        }
        #lulo-cursor .lulo-blob-core {
            position: absolute;
            top: 50%;
            left: 50%;
            width: 12px;
            height: 12px;
            transform: translate(-50%, -50%);
            background: radial-gradient(circle, #739E82 0%, rgba(115, 158, 130, 0.8) 100%);
            border-radius: 50%;
            box-shadow: 0 0 20px rgba(115, 158, 130, 0.8), 
                        0 0 40px rgba(115, 158, 130, 0.4),
                        0 0 60px rgba(115, 158, 130, 0.2);
            animation: luloCoreGlow 1s ease-in-out infinite;
        }
        @keyframes luloBlobPulse {
            0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.8; }
            50% { transform: translate(-50%, -50%) scale(1.3); opacity: 1; }
        }
        @keyframes luloCoreGlow {
            0%, 100% { 
                box-shadow: 0 0 20px rgba(115, 158, 130, 0.8), 
                            0 0 40px rgba(115, 158, 130, 0.4),
                            0 0 60px rgba(115, 158, 130, 0.2);
            }
            50% { 
                box-shadow: 0 0 30px rgba(115, 158, 130, 1), 
                            0 0 60px rgba(115, 158, 130, 0.6),
                            0 0 90px rgba(115, 158, 130, 0.3);
            }
        }
        .lulo-trail {
            position: fixed;
            width: 8px;
            height: 8px;
            background: radial-gradient(circle, rgba(115, 158, 130, 0.6) 0%, transparent 100%);
            border-radius: 50%;
            pointer-events: none;
            z-index: 2147483646;
            animation: luloTrailFade 0.5s ease-out forwards;
        }
        @keyframes luloTrailFade {
            0% { opacity: 1; transform: scale(1); }
            100% { opacity: 0; transform: scale(0.3); }
        }
    `;
    document.head.appendChild(blobStyle);
    document.body.appendChild(luloCursor);
    return luloCursor;
}

// Show the Lulo glow
function showLuloGlow() {
    createLuloGlow();
    luloGlow.style.opacity = '1';
}

// Hide the Lulo glow
function hideLuloGlow() {
    if (luloGlow) {
        luloGlow.style.opacity = '0';
    }
}

// Animate cursor to position with trail effect
async function animateCursorTo(x, y, duration = 500) {
    const cursor = createLuloCursor();
    cursor.style.opacity = '1';

    // Get current position
    const currentX = parseFloat(cursor.style.left) || window.innerWidth / 2;
    const currentY = parseFloat(cursor.style.top) || window.innerHeight / 2;

    // Animate
    const startTime = Date.now();
    let lastTrailTime = 0;

    return new Promise(resolve => {
        function animate() {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Easing function - smooth cubic
            const eased = 1 - Math.pow(1 - progress, 3);

            const newX = currentX + (x - currentX) * eased;
            const newY = currentY + (y - currentY) * eased;

            cursor.style.left = newX + 'px';
            cursor.style.top = newY + 'px';
            cursor.style.transform = 'translate(-50%, -50%)';

            // Spawn trail particles
            if (Date.now() - lastTrailTime > 30) {
                spawnTrailParticle(newX, newY);
                lastTrailTime = Date.now();
            }

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                // Burst effect on arrival
                for (let i = 0; i < 5; i++) {
                    setTimeout(() => spawnTrailParticle(newX, newY), i * 30);
                }
                resolve();
            }
        }
        animate();
    });
}

// Spawn a trail particle
function spawnTrailParticle(x, y) {
    const particle = document.createElement('div');
    particle.className = 'lulo-trail';
    particle.style.left = (x + (Math.random() - 0.5) * 10) + 'px';
    particle.style.top = (y + (Math.random() - 0.5) * 10) + 'px';
    document.body.appendChild(particle);
    setTimeout(() => particle.remove(), 500);
}

// Hide cursor
function hideLuloCursor() {
    if (luloCursor) {
        luloCursor.style.opacity = '0';
    }
}

// Highlight an element
function highlightElement(element) {
    const rect = element.getBoundingClientRect();

    const highlight = document.createElement('div');
    highlight.className = 'lulo-element-highlight';
    highlight.style.cssText = `
        position: fixed;
        left: ${rect.left - 4}px;
        top: ${rect.top - 4}px;
        width: ${rect.width + 8}px;
        height: ${rect.height + 8}px;
        border: 2px solid #739E82;
        border-radius: 6px;
        background: rgba(115, 158, 130, 0.2);
        pointer-events: none;
        z-index: 2147483645;
        animation: luloHighlight 0.5s ease forwards;
    `;
    document.body.appendChild(highlight);

    setTimeout(() => highlight.remove(), 1000);
}

// ============= INTERACTIVE GUIDE MODE =============
let guideTooltip = null;
let guideSpotlight = null;
let guideOverlay = null;

// Show guide instruction on screen
function showGuideInstruction(message, targetSelector) {
    showLuloGlow();

    // Create dark overlay with spotlight cutout
    if (!guideOverlay) {
        guideOverlay = document.createElement('div');
        guideOverlay.id = 'lulo-guide-overlay';
        guideOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            pointer-events: none;
            z-index: 2147483640;
            transition: opacity 0.3s ease;
        `;
        document.body.appendChild(guideOverlay);
    }
    guideOverlay.style.opacity = '1';

    // Create tooltip
    if (!guideTooltip) {
        guideTooltip = document.createElement('div');
        guideTooltip.id = 'lulo-guide-tooltip';
        document.body.appendChild(guideTooltip);
    }

    guideTooltip.innerHTML = `
        <div class="lulo-guide-icon">✦</div>
        <div class="lulo-guide-message">${message}</div>
        <div class="lulo-guide-hint">Click the highlighted area to continue</div>
    `;
    guideTooltip.style.cssText = `
        position: fixed;
        bottom: 30px;
        left: 50%;
        transform: translateX(-50%);
        background: white;
        padding: 16px 24px;
        border-radius: 16px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.2);
        z-index: 2147483647;
        max-width: 400px;
        text-align: center;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        animation: slideUp 0.4s ease;
    `;

    // Add tooltip styles
    if (!document.getElementById('lulo-guide-styles')) {
        const style = document.createElement('style');
        style.id = 'lulo-guide-styles';
        style.textContent = `
            @keyframes slideUp {
                from { transform: translateX(-50%) translateY(20px); opacity: 0; }
                to { transform: translateX(-50%) translateY(0); opacity: 1; }
            }
            @keyframes spotlightPulse {
                0%, 100% { box-shadow: 0 0 0 4px rgba(115, 158, 130, 0.6), 0 0 30px rgba(115, 158, 130, 0.4); }
                50% { box-shadow: 0 0 0 8px rgba(115, 158, 130, 0.4), 0 0 50px rgba(115, 158, 130, 0.6); }
            }
            .lulo-guide-icon {
                font-size: 24px;
                color: #739E82;
                margin-bottom: 8px;
            }
            .lulo-guide-message {
                font-size: 16px;
                color: #2D2A26;
                line-height: 1.5;
                margin-bottom: 8px;
            }
            .lulo-guide-hint {
                font-size: 12px;
                color: #8B8580;
            }
        `;
        document.head.appendChild(style);
    }

    // Highlight target element if specified
    if (targetSelector) {
        highlightGuideTarget(targetSelector);
    }
}

// Highlight the target element with spotlight
function highlightGuideTarget(selector) {
    const element = findElement(selector);
    if (!element) return;

    element.scrollIntoView({ behavior: 'smooth', block: 'center' });

    setTimeout(() => {
        const rect = element.getBoundingClientRect();

        // Create spotlight around element
        if (!guideSpotlight) {
            guideSpotlight = document.createElement('div');
            guideSpotlight.id = 'lulo-guide-spotlight';
            document.body.appendChild(guideSpotlight);
        }

        guideSpotlight.style.cssText = `
            position: fixed;
            left: ${rect.left - 8}px;
            top: ${rect.top - 8}px;
            width: ${rect.width + 16}px;
            height: ${rect.height + 16}px;
            border: 3px solid #739E82;
            border-radius: 12px;
            background: transparent;
            box-shadow: 0 0 0 4px rgba(115, 158, 130, 0.6), 0 0 30px rgba(115, 158, 130, 0.4);
            z-index: 2147483645;
            pointer-events: none;
            animation: spotlightPulse 1.5s ease-in-out infinite;
        `;

        // Move the blob cursor to the element
        animateCursorTo(rect.left + rect.width / 2, rect.top + rect.height / 2, 600);

        // Make element clickable through overlay
        element.style.position = element.style.position || 'relative';
        element.style.zIndex = '2147483646';
        element.style.pointerEvents = 'auto';

        // Listen for click on target
        element.addEventListener('click', hideGuide, { once: true });
    }, 300);
}

// Hide the guide
function hideGuide() {
    if (guideOverlay) {
        guideOverlay.style.opacity = '0';
        setTimeout(() => {
            guideOverlay?.remove();
            guideOverlay = null;
        }, 300);
    }
    if (guideTooltip) {
        guideTooltip.remove();
        guideTooltip = null;
    }
    if (guideSpotlight) {
        guideSpotlight.remove();
        guideSpotlight = null;
    }
    hideLuloCursor();
    hideLuloGlow();

    // Notify extension that user completed step
    chrome.runtime.sendMessage({ type: 'GUIDE_STEP_COMPLETE' });
}

// Listen for messages from background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.type) {
        case 'LULO_START':
            showLuloGlow();
            sendResponse({ success: true });
            break;
        case 'LULO_END':
            hideLuloGlow();
            hideLuloCursor();
            sendResponse({ success: true });
            break;
        case 'GUIDE':
            showGuideInstruction(message.message, message.target);
            sendResponse({ success: true });
            break;
        case 'GUIDE_HIDE':
            hideGuide();
            sendResponse({ success: true });
            break;
        case 'PREVIEW':
            showPreview(message.html, message.css, message.js);
            sendResponse({ success: true });
            break;
        case 'ENABLE_CLICK_MODE':
            enableClickMode();
            sendResponse({ success: true });
            break;
        case 'CLICK_ELEMENT':
            clickElementWithAnimation(message.selector);
            sendResponse({ success: true });
            break;
        case 'TYPE_TEXT':
            typeTextWithAnimation(message.selector, message.text);
            sendResponse({ success: true });
            break;
        case 'GET_PAGE_INFO':
            sendResponse({
                success: true,
                info: {
                    url: window.location.href,
                    title: document.title,
                    text: document.body.innerText.slice(0, 5000)
                }
            });
            break;
    }
    return true;
});

// ============= PREVIEW MODE =============
let previewOverlay = null;

function showPreview(html, css = '', js = '') {
    showLuloGlow();

    if (previewOverlay) {
        previewOverlay.remove();
    }

    // Format code for display
    const fullCode = `<!-- HTML -->
${html}

/* CSS */
<style>
${css}
</style>

/* JS */
<script>
${js}
</script>`;

    previewOverlay = document.createElement('div');
    previewOverlay.id = 'lulo-preview-overlay';
    previewOverlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.7);
        z-index: 2147483650;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        transition: opacity 0.3s ease;
        padding: 40px;
    `;

    const containerWrapper = document.createElement('div');
    containerWrapper.style.cssText = `
        width: 100%;
        max-width: 1000px;
        height: 80vh;
        background: #1e1e1e; /* Dark theme for code */
        border-radius: 12px;
        box-shadow: 0 20px 50px rgba(0,0,0,0.5);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        transform: scale(0.95);
        transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        border: 1px solid #333;
    `;

    // Header
    const header = document.createElement('div');
    header.style.cssText = `
        padding: 12px 20px;
        border-bottom: 1px solid #333;
        display: flex;
        align-items: center;
        justify-content: space-between;
        background: #252526;
    `;

    // Tabs Container
    const tabsContainer = document.createElement('div');
    tabsContainer.style.display = 'flex';
    tabsContainer.style.gap = '8px';
    tabsContainer.style.background = '#333';
    tabsContainer.style.padding = '4px';
    tabsContainer.style.borderRadius = '6px';

    function createTab(id, text, active = false) {
        const btn = document.createElement('button');
        btn.textContent = text;
        btn.id = id;
        btn.style.cssText = `
            border: none;
            background: ${active ? '#0e639c' : 'transparent'}; 
            color: ${active ? 'white' : '#ccc'};
            padding: 6px 16px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 13px;
            font-family: -apple-system, sans-serif;
            font-weight: 500;
            transition: all 0.2s;
        `;
        return btn;
    }

    const codeTab = createTab('tab-code', 'Code', true);
    const previewTab = createTab('tab-preview', 'Preview', false);

    tabsContainer.appendChild(codeTab);
    tabsContainer.appendChild(previewTab);

    header.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px;">
            <div style="width: 12px; height: 12px; border-radius: 50%; background: #739E82; box-shadow: 0 0 10px #739E82;"></div>
            <span style="font-weight: 600; color: #fff; font-size: 14px; font-family: sans-serif;">Lulo Build</span>
        </div>
    `;
    header.insertBefore(tabsContainer, header.children[1]); // Insert tabs in middle

    // Close Button
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
    closeBtn.style.cssText = `
        background: none; border: none; cursor: pointer; color: #888; font-size: 16px; padding: 4px;
    `;
    closeBtn.onmouseover = () => closeBtn.style.color = '#fff';
    closeBtn.onmouseout = () => closeBtn.style.color = '#888';
    header.appendChild(closeBtn);

    // Content Area
    const contentArea = document.createElement('div');
    contentArea.style.cssText = `
        flex: 1;
        position: relative;
        overflow: hidden;
        background: #1e1e1e;
    `;

    // 1. Code View (Visible initially)
    const codeView = document.createElement('div');
    codeView.id = 'view-code';
    codeView.style.cssText = `
        width: 100%;
        height: 100%;
        padding: 20px;
        overflow: auto;
        font-family: 'Fira Code', 'Consolas', monospace;
        font-size: 14px;
        color: #d4d4d4;
        line-height: 1.5;
        white-space: pre-wrap;
    `;

    // 2. Preview View (Hidden initially)
    const previewView = document.createElement('div');
    previewView.id = 'view-preview';
    previewView.style.cssText = `
        width: 100%;
        height: 100%;
        padding: 0;
        background: white;
        display: none; /* Hidden by default */
    `;

    // Check if we already have an iframe URL to reuse? No, simplicity first.
    const srcDoc = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
                ${css}
            </style>
        </head>
        <body>
            ${html}
            ${js ? `<script>${js}</script>` : ''}
        </body>
        </html>
    `;

    const iframe = document.createElement('iframe');
    iframe.srcdoc = srcDoc;
    iframe.style.cssText = "width: 100%; height: 100%; border: none;";
    previewView.appendChild(iframe);

    contentArea.appendChild(codeView);
    contentArea.appendChild(previewView);

    containerWrapper.appendChild(header);
    containerWrapper.appendChild(contentArea);
    previewOverlay.appendChild(containerWrapper);
    document.body.appendChild(previewOverlay);

    // Fade in
    requestAnimationFrame(() => {
        previewOverlay.style.opacity = '1';
        containerWrapper.style.transform = 'scale(1)';
    });

    // Close Logic
    function closePreview() {
        previewOverlay.style.opacity = '0';
        containerWrapper.style.transform = 'scale(0.95)';
        setTimeout(() => {
            if (previewOverlay) {
                previewOverlay.remove();
                previewOverlay = null;
            }
            hideLuloGlow();
        }, 300);
    }

    closeBtn.onclick = closePreview;
    previewOverlay.onclick = (e) => { if (e.target === previewOverlay) closePreview(); };

    // Tab Logic
    function switchTab(tab) {
        if (tab === 'code') {
            codeView.style.display = 'block';
            previewView.style.display = 'none';
            codeTab.style.background = '#0e639c'; codeTab.style.color = 'white';
            previewTab.style.background = 'transparent'; previewTab.style.color = '#ccc';
        } else {
            codeView.style.display = 'none';
            previewView.style.display = 'block';
            previewTab.style.background = '#0e639c'; previewTab.style.color = 'white';
            codeTab.style.background = 'transparent'; codeTab.style.color = '#ccc';
        }
    }

    codeTab.onclick = () => switchTab('code');
    previewTab.onclick = () => switchTab('preview');

    // Typewriter Effect
    let i = 0;
    const speed = 5; // ms per char
    const maxChars = 2000; // Cap to avoid waiting too long for huge files
    const codeToType = fullCode.length > maxChars ? fullCode.substring(0, maxChars) + '\n... (rendering)' : fullCode;

    function typeWriter() {
        if (!previewOverlay) return; // Stop if closed
        if (i < codeToType.length) {
            codeView.textContent += codeToType.charAt(i);
            codeView.scrollTop = codeView.scrollHeight; // Auto-scroll
            i += Math.floor(Math.random() * 3) + 1; // Random chunking for realism
            setTimeout(typeWriter, speed);
        } else {
            // Done typing, switch to preview after short delay
            setTimeout(() => {
                if (previewOverlay) switchTab('preview');
            }, 800);
        }
    }

    // Start typing
    typeWriter();

}

async function clickElementWithAnimation(selector) {
    showLuloGlow();

    try {
        let element = findElement(selector);

        if (element) {
            const rect = element.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;

            // Animate cursor to element
            await animateCursorTo(centerX, centerY, 400);

            // Highlight and click
            highlightElement(element);
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });

            await new Promise(r => setTimeout(r, 200));
            element.click();

            showNotification(`Clicked: ${getElementDescription(element)}`);
        } else {
            showNotification(`Could not find: ${selector}`, 'error');
        }
    } catch (error) {
        showNotification(`Error: ${error.message}`, 'error');
    }

    setTimeout(() => {
        hideLuloCursor();
        hideLuloGlow();
    }, 1000);
}

async function typeTextWithAnimation(selector, text) {
    showLuloGlow();

    try {
        let element = findElement(selector) || document.activeElement;

        if (element && (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA')) {
            const rect = element.getBoundingClientRect();
            await animateCursorTo(rect.left + 20, rect.top + rect.height / 2, 400);

            highlightElement(element);
            element.focus();

            // Type character by character for effect
            element.value = '';
            for (let i = 0; i < text.length; i++) {
                element.value += text[i];
                element.dispatchEvent(new Event('input', { bubbles: true }));
                await new Promise(r => setTimeout(r, 30));
            }

            showNotification(`Typed: "${text.slice(0, 30)}..."`);
        }
    } catch (error) {
        showNotification(`Error: ${error.message}`, 'error');
    }

    setTimeout(() => {
        hideLuloCursor();
        hideLuloGlow();
    }, 1000);
}

function findElement(selector) {
    // Try CSS selector
    try {
        const el = document.querySelector(selector);
        if (el) return el;
    } catch (e) { }

    // Try by text content
    const elements = document.querySelectorAll('button, a, [role="button"], input[type="submit"]');
    const found = Array.from(elements).find(el =>
        el.textContent?.toLowerCase().includes(selector.toLowerCase())
    );
    if (found) return found;

    // Try by aria-label
    return document.querySelector(`[aria-label*="${selector}" i]`);
}

function enableClickMode() {
    clickModeEnabled = true;
    showLuloGlow();
    document.body.style.cursor = 'crosshair';

    // Create overlay
    highlightOverlay = document.createElement('div');
    highlightOverlay.id = 'lulo-highlight';
    highlightOverlay.style.cssText = `
        position: fixed;
        pointer-events: none;
        border: 2px solid #739E82;
        border-radius: 4px;
        background: rgba(115, 158, 130, 0.1);
        z-index: 2147483645;
        transition: all 0.1s ease;
    `;
    document.body.appendChild(highlightOverlay);

    // Add listeners
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('click', handleClick, true);

    // Show notification
    showNotification('Click mode enabled. Click on any element.');
}

function disableClickMode() {
    clickModeEnabled = false;
    document.body.style.cursor = '';
    hideLuloGlow();

    if (highlightOverlay) {
        highlightOverlay.remove();
        highlightOverlay = null;
    }

    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('click', handleClick, true);
}

function handleMouseMove(e) {
    if (!clickModeEnabled || !highlightOverlay) return;

    const element = document.elementFromPoint(e.clientX, e.clientY);
    if (element && element !== highlightOverlay) {
        const rect = element.getBoundingClientRect();
        highlightOverlay.style.left = rect.left + 'px';
        highlightOverlay.style.top = rect.top + 'px';
        highlightOverlay.style.width = rect.width + 'px';
        highlightOverlay.style.height = rect.height + 'px';
    }
}

function handleClick(e) {
    if (!clickModeEnabled) return;

    e.preventDefault();
    e.stopPropagation();

    const element = e.target;
    const selector = generateSelector(element);
    const description = getElementDescription(element);

    // Send clicked element info back
    chrome.runtime.sendMessage({
        type: 'ELEMENT_CLICKED',
        selector: selector,
        element: description,
        tagName: element.tagName.toLowerCase(),
        text: element.innerText?.slice(0, 100)
    });

    disableClickMode();
}

function generateSelector(element) {
    if (element.id) return `#${element.id}`;
    if (element.className && typeof element.className === 'string') {
        const classes = element.className.split(' ').filter(c => c).slice(0, 2).join('.');
        if (classes) return `${element.tagName.toLowerCase()}.${classes}`;
    }
    return element.tagName.toLowerCase();
}

function getElementDescription(element) {
    const tag = element.tagName.toLowerCase();
    const text = element.innerText?.slice(0, 50) || '';
    const ariaLabel = element.getAttribute('aria-label') || '';

    if (ariaLabel) return `${tag}: "${ariaLabel}"`;
    if (text) return `${tag}: "${text}"`;
    return tag;
}

function showNotification(message, type = 'info') {
    const el = document.createElement('div');
    el.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: white;
        padding: 12px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 2147483647;
        font-family: -apple-system, sans-serif;
        font-size: 14px;
        color: #333;
        display: flex;
        align-items: center;
        gap: 10px;
        animation: slideIn 0.3s ease;
        border-left: 4px solid ${type === 'error' ? '#ef4444' : '#739E82'};
    `;

    el.innerHTML = `
        <div style="width: 8px; height: 8px; border-radius: 50%; background: ${type === 'error' ? '#ef4444' : '#739E82'};"></div>
        <span>${message}</span>
    `;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3000);
}
