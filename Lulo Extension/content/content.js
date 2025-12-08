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
        box-shadow: inset 0 0 60px rgba(139, 109, 184, 0.4), 
        inset 0 0 120px rgba(139, 109, 184, 0.2);
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
                box-shadow: inset 0 0 60px rgba(139, 109, 184, 0.45), 
                            inset 0 0 160px rgba(139, 109, 184, 0.25);
            }
            50% { 
                box-shadow: inset 0 0 100px rgba(139, 109, 184, 0.7), 
                            inset 0 0 240px rgba(139, 109, 184, 0.4);
            }
        }
        @keyframes luloCursorPulse {
            0%, 100% { transform: translate(-50%, -50%) scale(1); }
            50% { transform: translate(-50%, -50%) scale(1.2); }
        }
        @keyframes luloHighlight {
            0% { background: rgba(139, 109, 184, 0.3); }
            100% { background: rgba(139, 109, 184, 0.1); }
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
            background: radial-gradient(circle, rgba(139, 109, 184, 0.3) 0%, transparent 70%);
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
            background: radial-gradient(circle, rgba(139, 109, 184, 0.6) 0%, rgba(139, 109, 184, 0.3) 60%, transparent 100%);
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
            background: radial-gradient(circle, #8B6DB8 0%, rgba(139, 109, 184, 0.8) 100%);
            border-radius: 50%;
            box-shadow: 0 0 20px rgba(139, 109, 184, 0.8), 
                        0 0 40px rgba(139, 109, 184, 0.4),
                        0 0 60px rgba(139, 109, 184, 0.2);
            animation: luloCoreGlow 1s ease-in-out infinite;
        }
        @keyframes luloBlobPulse {
            0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.8; }
            50% { transform: translate(-50%, -50%) scale(1.3); opacity: 1; }
        }
        @keyframes luloCoreGlow {
            0%, 100% { 
                box-shadow: 0 0 20px rgba(139, 109, 184, 0.8), 
                            0 0 40px rgba(139, 109, 184, 0.4),
                            0 0 60px rgba(139, 109, 184, 0.2);
            }
            50% { 
                box-shadow: 0 0 30px rgba(139, 109, 184, 1), 
                            0 0 60px rgba(139, 109, 184, 0.6),
                            0 0 90px rgba(139, 109, 184, 0.3);
            }
        }
        .lulo-trail {
            position: fixed;
            width: 8px;
            height: 8px;
            background: radial-gradient(circle, rgba(139, 109, 184, 0.6) 0%, transparent 100%);
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
        border: 2px solid #8B6DB8;
        border-radius: 6px;
        background: rgba(139, 109, 184, 0.2);
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
        <div class="lulo-guide-icon">🪄</div>
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
                0%, 100% { box-shadow: 0 0 0 4px rgba(139, 109, 184, 0.6), 0 0 30px rgba(139, 109, 184, 0.4); }
                50% { box-shadow: 0 0 0 8px rgba(139, 109, 184, 0.4), 0 0 50px rgba(139, 109, 184, 0.6); }
            }
            .lulo-guide-icon {
                font-size: 24px;
                color: #8B6DB8;
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
            border: 3px solid #8B6DB8;
            border-radius: 12px;
            background: transparent;
            box-shadow: 0 0 0 4px rgba(139, 109, 184, 0.6), 0 0 30px rgba(139, 109, 184, 0.4);
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

        // 2. Presentation: Lulo Loom
        case 'TOGGLE_RECORDING': {
            if (message.shouldRecord) {
                startRecording();
            } else {
                stopRecording();
            }
            sendResponse({ status: 'rec_toggled' });
            break;
        }

        // 1. Download/Write File
        case 'LULO_WRITE_FILE': {
            handleWriteFile(message, sendResponse);
            return true; // Keep channel open
        }

        case 'LULO_DOWNLOAD': {
            const { content, mime, filename, isDataUrl } = message;
            const a = document.createElement('a');
            if (isDataUrl) {
                a.href = content;
            } else {
                const blob = new Blob([content], { type: mime || 'text/plain' });
                a.href = URL.createObjectURL(blob);
            }
            a.download = filename || 'download';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            if (!isDataUrl) URL.revokeObjectURL(a.href);
            sendResponse({ status: 'success' });
            break;
        }

        case 'TOGGLE_SCREENSHOT_MODE':
            toggleScreenshotMode();
            sendResponse({ success: true });
            break;
    }
    return true;
});

async function handleWriteFile(message, sendResponse) {
    const { filename, content } = message;

    // Try Modern File System Access API first
    if (window.showSaveFilePicker) {
        try {
            const handle = await window.showSaveFilePicker({
                suggestedName: filename,
                types: [{
                    description: 'Text Files',
                    accept: { 'text/plain': ['.txt', '.js', '.ts', '.html', '.css', '.json', '.md'] }
                }],
            });
            const writable = await handle.createWritable();
            await writable.write(content);
            await writable.close();
            sendResponse({ status: 'success', message: `Saved ${filename} to disk!` });
            return;
        } catch (err) {
            console.log('File System API failed/cancelled, falling back to download', err);
        }
    }

    // Fallback: Classic Download
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    sendResponse({ status: 'success', message: `Downloaded ${filename}` });
}

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
            <div style="width: 12px; height: 12px; border-radius: 50%; background: #8B6DB8; box-shadow: 0 0 10px #8B6DB8;"></div>
            <span style="font-weight: 600; color: #fff; font-size: 14px; font-family: sans-serif;">Lulo Build</span>
        </div>
    `;
    header.insertBefore(tabsContainer, header.children[1]); // Insert tabs in middle

    // Action Buttons Container (Right Side)
    const actionContainer = document.createElement('div');
    actionContainer.style.cssText = `
        display: flex;
        align-items: center;
        gap: 8px;
    `;

    function createActionBtn(text, icon, primary = false) {
        const btn = document.createElement('button');
        btn.innerHTML = `<span>${icon}</span> ${text}`;
        btn.style.cssText = `
            border: 1px solid ${primary ? '#8B6DB8' : '#333'};
            background: ${primary ? '#8B6DB8' : 'transparent'}; 
            color: ${primary ? 'white' : '#888'};
            padding: 6px 12px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 13px;
            font-family: -apple-system, sans-serif;
            font-weight: 500;
            display: flex;
            align-items: center;
            gap: 6px;
            transition: all 0.2s;
        `;
        btn.onmouseover = () => {
            if (!primary) btn.style.color = 'white';
            btn.style.opacity = '0.9';
        };
        btn.onmouseout = () => {
            if (!primary) btn.style.color = '#888';
            btn.style.opacity = '1';
        };
        return btn;
    }

    const downloadBtn = createActionBtn('Download', '↓');
    const deployBtn = createActionBtn('Deploy', '🚀', true);

    // Close Button (moved to action container)
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
    closeBtn.style.cssText = `
        background: none; border: none; cursor: pointer; color: #888; font-size: 16px; padding: 4px; margin-left: 8px;
    `;
    closeBtn.onmouseover = () => closeBtn.style.color = '#fff';
    closeBtn.onmouseout = () => closeBtn.style.color = '#888';

    actionContainer.appendChild(downloadBtn);
    actionContainer.appendChild(deployBtn);
    actionContainer.appendChild(closeBtn);
    header.appendChild(actionContainer);

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
    const srcDocContent = `
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
    iframe.srcdoc = srcDocContent;
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

    // Action Logic
    function downloadProject() {
        const blob = new Blob([srcDocContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'lulo-project.html';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    downloadBtn.onclick = () => {
        downloadProject();
        showNotification("Project downloaded!", 'info');
    };

    deployBtn.onclick = () => {
        // 1. Download
        downloadProject();

        // 2. Open Netlify
        window.open('https://app.netlify.com/drop', '_blank');

        // 3. Notify
        setTimeout(() => {
            showNotification("Opening Netlify Drop... Drag your file there!", 'info');
        }, 1000);
    };

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
        border: 2px solid #8B6DB8;
        border-radius: 4px;
        background: rgba(139, 109, 184, 0.1);
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
        border-left: 4px solid ${type === 'error' ? '#ef4444' : '#8B6DB8'};
    `;

    el.innerHTML = `
        <div style="width: 8px; height: 8px; border-radius: 50%; background: ${type === 'error' ? '#ef4444' : '#8B6DB8'};"></div>
        <span>${message}</span>
    `;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3000);
}

// ==========================================
// PRESENTATION: Lulo Loom (Recorder)
// ==========================================
let faceBubble = null;
let mediaRecorder = null;
let recordedChunks = [];
let screenStream = null;
let camStream = null;
let isGlowEnabled = true;

async function startRecording() {
    try {
        // 1. Face Bubble (Webcam Video Only)
        await createFaceBubble();

        // 2. Request Mic Stream (Separate, for recording)
        // We do this early to ensure permissions
        const micStream = await navigator.mediaDevices.getUserMedia({
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                sampleRate: 44100
            },
            video: false
        });

        // 3. Show countdown
        await showCountdown();

        // 4. Add Lavender Glow
        if (isGlowEnabled) {
            document.body.style.boxShadow = 'inset 0 0 0 8px #8B6DB8';
            document.body.style.transition = 'box-shadow 0.3s ease';
        }

        // 5. Screen Capture (Tab Video + System Audio)
        screenStream = await navigator.mediaDevices.getDisplayMedia({
            video: { displaySurface: 'browser' },
            audio: true // Request System Audio
        });

        // 6. Audio Mixing (System + Mic)
        const audioCtx = new AudioContext();
        const dest = audioCtx.createMediaStreamDestination();

        // Add Mic
        if (micStream.getAudioTracks().length > 0) {
            const micSource = audioCtx.createMediaStreamSource(micStream);
            micSource.connect(dest);
        }

        // Add System Audio (if available)
        if (screenStream.getAudioTracks().length > 0) {
            const sysSource = audioCtx.createMediaStreamSource(screenStream);
            const sysGain = audioCtx.createGain();
            sysGain.gain.value = 0.7; // Balance system audio
            sysSource.connect(sysGain).connect(dest);
        }

        const combinedStream = new MediaStream([
            ...screenStream.getVideoTracks(),
            ...dest.stream.getAudioTracks()
        ]);

        // 6.5. Setup Compositor for Face Bubble
        const { stream: compositorStream, cleanup: cleanupCompositor } = setupCompositor(screenStream, camStream);
        const compositorVideoTrack = compositorStream.getVideoTracks()[0];

        // 7. Start Recording
        recordedChunks = [];
        // Combine compositor video + mixed audio
        const finalStream = new MediaStream([
            compositorVideoTrack,
            ...dest.stream.getAudioTracks()
        ]);

        mediaRecorder = new MediaRecorder(finalStream, { mimeType: 'video/webm;codecs=vp9,opus' });

        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                recordedChunks.push(event.data);
            }
        };

        mediaRecorder.onstop = saveRecording;

        mediaRecorder.start();
        showNotification("Recording Started! 🎙️+🎥");
        startRecordingTimer();

        // Store mic stream to stop it later
        window.luloMicStream = micStream;
        window.luloAudioCtx = audioCtx;
        window.luloCleanupCompositor = cleanupCompositor; // Store cleanup function

        // Stop if user uses system "Stop Sharing" bar
        screenStream.getVideoTracks()[0].onended = () => {
            stopRecording();
        };

    } catch (err) {
        console.error("Recording failed", err);
        showNotification("Recording failed: " + err.message, "error");
        stopRecording(); // Cleanup
    }
}

// Countdown before recording
async function showCountdown() {
    return new Promise(resolve => {
        const overlay = document.createElement('div');
        overlay.id = 'lulo-countdown';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(139, 109, 184, 0.9);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 2147483647;
            font-family: -apple-system, sans-serif;
        `;

        const num = document.createElement('div');
        num.style.cssText = `
            font-size: 120px;
            font-weight: 700;
            color: white;
            text-shadow: 0 0 40px rgba(255,255,255,0.5);
        `;
        overlay.appendChild(num);
        document.body.appendChild(overlay);

        let count = 3;
        num.textContent = count;

        const interval = setInterval(() => {
            count--;
            if (count > 0) {
                num.textContent = count;
                num.style.animation = 'none';
                num.offsetHeight; // Trigger reflow
                num.style.animation = 'countPop 0.5s ease';
            } else {
                clearInterval(interval);
                num.textContent = '🎬';
                setTimeout(() => {
                    overlay.remove();
                    resolve();
                }, 500);
            }
        }, 1000);

        // Add animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes countPop {
                0% { transform: scale(1.5); opacity: 0; }
                100% { transform: scale(1); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    });
}

// Recording timer
let recordingTimerId = null;
let recordingSeconds = 0;

function startRecordingTimer() {
    recordingSeconds = 0;
    updateTimerDisplay();
    recordingTimerId = setInterval(() => {
        recordingSeconds++;
        updateTimerDisplay();
    }, 1000);
}

function updateTimerDisplay() {
    // Check PiP first, then fallback to DOM bubble
    const targetDoc = pipWindow ? pipWindow.document : document;
    const container = pipWindow ? pipWindow.document.querySelector('.lulo-face-bubble') : faceBubble;

    if (!container) return;

    let timerBadge = container.querySelector('.lulo-timer-badge');
    if (!timerBadge) {
        timerBadge = targetDoc.createElement('div');
        timerBadge.className = 'lulo-timer-badge';
        if (!pipWindow) {
            // Inline styles for DOM version
            timerBadge.style.cssText = `
                position: absolute;
                top: -8px;
                left: 50%;
                transform: translateX(-50%);
                background: #8B6DB8;
                color: white;
                padding: 4px 12px;
                border-radius: 12px;
                font-size: 12px;
                font-weight: 600;
                font-family: -apple-system, monospace;
                box-shadow: 0 2px 8px rgba(139, 109, 184, 0.4);
                display: flex;
                align-items: center;
                gap: 6px;
                z-index: 100;
            `;
        }
        container.appendChild(timerBadge);
    }
    const mins = Math.floor(recordingSeconds / 60);
    const secs = recordingSeconds % 60;
    timerBadge.innerHTML = `<span style="width:8px;height:8px;background:#ef4444;border-radius:50%;animation:recBlink 1s infinite;"></span> ${mins}:${secs.toString().padStart(2, '0')}`;
}

function stopRecordingTimer() {
    if (recordingTimerId) {
        clearInterval(recordingTimerId);
        recordingTimerId = null;
    }
}

function stopRecording() {
    stopRecordingTimer();

    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
        showNotification("Recording Stopped. Saving...");
    }

    // Stop streams
    if (screenStream) screenStream.getTracks().forEach(t => t.stop());
    if (camStream) camStream.getTracks().forEach(t => t.stop());

    // Stop Mic Stream
    if (window.luloMicStream) {
        window.luloMicStream.getTracks().forEach(t => t.stop());
        window.luloMicStream = null;
    }

    // Close Audio Context
    if (window.luloAudioCtx) {
        window.luloAudioCtx.close();
        window.luloAudioCtx = null;
    }

    // Cleanup Compositor
    if (window.luloCleanupCompositor) {
        window.luloCleanupCompositor();
        window.luloCleanupCompositor = null;
    }

    // Remove bubble
    if (pipWindow) {
        pipWindow.close();
        pipWindow = null;
    }
    if (faceBubble) {
        faceBubble.remove();
        faceBubble = null;
    }

    // Remove glow
    document.body.style.boxShadow = '';
}

async function saveRecording() {
    const blob = new Blob(recordedChunks, { type: 'video/webm' });
    const fileSizeBytes = blob.size;
    const durationSeconds = recordingSeconds;

    // Generate filename
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric'
    });
    const timeStr = now.toLocaleTimeString('en-US', {
        hour: 'numeric', minute: '2-digit', hour12: true
    }).replace(':', '-').replace(' ', '');
    const filename = `Lulo Recording - ${dateStr} ${timeStr}.webm`;

    // 1. ALWAYS save locally first (most reliable)
    showNotification("Saving recording... 💾");

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    // Small delay before revoking URL
    setTimeout(() => URL.revokeObjectURL(url), 1000);

    // 2. Try to create recording metadata in dashboard (if logged in)
    const { luloCloudToken } = await chrome.storage.sync.get(['luloCloudToken']);

    if (luloCloudToken) {
        try {
            const title = `Recording - ${dateStr} ${timeStr}`;

            // Create recording entry in database
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout

            const response = await fetch('https://heylulo.com/api/recordings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${luloCloudToken}`
                },
                body: JSON.stringify({
                    title: title,
                    description: `Recorded with Lulo Extension (${Math.round(fileSizeBytes / 1024 / 1024)}MB, ${Math.floor(durationSeconds / 60)}:${(durationSeconds % 60).toString().padStart(2, '0')})`,
                    duration_seconds: durationSeconds,
                    file_size_bytes: fileSizeBytes,
                    status: 'ready', // Mark as ready since we saved locally
                    is_public: false
                }),
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (response.ok) {
                showNotification("Saved! Check Downloads folder & Dashboard 📁✨");
            } else {
                console.warn('Failed to create recording metadata:', await response.text());
                showNotification("Saved to Downloads! (Couldn't sync to cloud) 📁");
            }
        } catch (err) {
            console.warn('Could not sync to cloud:', err);
            showNotification("Saved to Downloads! 📁");
        }
    } else {
        showNotification("Saved to Downloads! Sign in to sync to cloud ☁️");
    }
}

// PiP State
let pipWindow = null;

async function createFaceBubble() {
    if (faceBubble || pipWindow) return;

    // Try Document Picture-in-Picture first (Chrome 111+)
    if ('documentPictureInPicture' in window) {
        try {
            // Request a small PiP window
            pipWindow = await window.documentPictureInPicture.requestWindow({
                width: 250,
                height: 250,
            });

            // Copy styles to PiP window
            // We need to copy the Lulo styles (blob cursor etc not needed, but general styles useful)
            // Actually, we just need the bubble styles. We'll inject them directly.
            const style = pipWindow.document.createElement('style');
            style.textContent = `
                    body { 
                        margin: 0; 
                        background: transparent; 
                        display: flex; 
                        align-items: center; 
                        justify-content: center; 
                        height: 100vh; 
                        width: 100vw;
                        overflow: hidden;
                    }
                    .lulo-face-bubble {
                        width: 100%;
                        height: 100%;
                        border-radius: 50%;
                        border: 4px solid #8B6DB8;
                        overflow: hidden;
                        box-shadow: 0 0 0 2px rgba(139, 109, 184, 0.15);
                        background: #1a1a2e;
                        position: relative;
                    }
                    video {
                        width: 100%;
                        height: 100%;
                        object-fit: cover;
                    }
                    .lulo-controls {
                        position: absolute;
                        bottom: 0;
                        left: 0;
                        width: 100%;
                        padding: 10px;
                        display: flex;
                        justify-content: center;
                        gap: 8px;
                        background: linear-gradient(to top, rgba(0,0,0,0.9), transparent);
                        transform: translateY(100%);
                        transition: transform 0.2s;
                        opacity: 0;
                    }
                    body:hover .lulo-controls {
                        transform: translateY(0);
                        opacity: 1;
                    }
                    button {
                        width: 32px; height: 32px;
                        border-radius: 50%;
                        border: none;
                        color: white;
                        cursor: pointer;
                        display: flex; align-items: center; justify-content: center;
                        font-size: 14px;
                        transition: transform 0.1s;
                    }
                    button:hover { transform: scale(1.1); }
                    .lulo-timer-badge {
                        position: absolute;
                        top: 10px;
                        left: 50%;
                        transform: translateX(-50%);
                        background: #8B6DB8;
                        color: white;
                        padding: 2px 8px;
                        border-radius: 10px;
                        font-size: 10px;
                        font-family: monospace;
                        font-weight: bold;
                        pointer-events: none;
                    }
                `;
            pipWindow.document.head.appendChild(style);

            // Create Bubble Structure
            const container = pipWindow.document.createElement('div');
            container.className = 'lulo-face-bubble';

            const video = pipWindow.document.createElement('video');
            video.autoplay = true;
            video.muted = true;
            video.playsInline = true;
            container.appendChild(video);

            // Controls
            const controls = pipWindow.document.createElement('div');
            controls.className = 'lulo-controls';

            const makeBtn = (icon, bg, action) => {
                const btn = pipWindow.document.createElement('button');
                btn.innerHTML = icon;
                btn.style.background = bg;
                btn.onclick = (e) => { e.stopPropagation(); action(btn); };
                return btn;
            };

            const stopBtn = makeBtn('⏹', '#ef4444', () => {
                stopRecording();
                pipWindow.close();
            });

            const glowBtn = makeBtn('✨', '#8B6DB8', (btn) => {
                isGlowEnabled = !isGlowEnabled;
                document.body.style.boxShadow = isGlowEnabled ? 'inset 0 0 0 8px #8B6DB8' : '';
                btn.style.opacity = isGlowEnabled ? '1' : '0.5';
            });

            let isMirrored = false;
            const mirrorBtn = makeBtn('🪞', 'rgba(255,255,255,0.3)', () => {
                isMirrored = !isMirrored;
                video.style.transform = isMirrored ? 'scaleX(-1)' : 'scaleX(1)';
                mirrorBtn.style.opacity = isMirrored ? '1' : '0.6';
            });

            controls.appendChild(stopBtn);
            controls.appendChild(glowBtn);
            controls.appendChild(mirrorBtn);
            container.appendChild(controls);

            pipWindow.document.body.appendChild(container);

            // Handle PiP Close (User clicks X)
            pipWindow.addEventListener('pagehide', () => {
                stopRecording();
                pipWindow = null;
            });

            // Start Camera
            try {
                camStream = await navigator.mediaDevices.getUserMedia({
                    video: { width: { ideal: 720 }, aspectRatio: 1 },
                    audio: false
                });
                video.srcObject = camStream;
                await video.play();
            } catch (e) {
                console.warn("PiP Camera Error", e);
                video.style.display = 'none';
                container.innerHTML = "<div style='color:white;text-align:center;'>📷<br>Camera Error</div>";
            }

            return; // Success!
        } catch (err) {
            console.log("Document PiP failed, falling back to DOM overlay", err);
        }
    }

    // ===================================
    // FALLBACK: Legacy DOM Overlay
    // ===================================
    createFaceBubbleDOM();
}

async function createFaceBubbleDOM() {
    if (faceBubble) return;

    // Container
    faceBubble = document.createElement('div');
    faceBubble.className = 'lulo-face-bubble';

    // Video
    const video = document.createElement('video');
    video.autoplay = true;
    video.muted = true; // Local mute to prevent echo
    video.playsInline = true;

    // Styles - Lavender theme with premium feel
    Object.assign(faceBubble.style, {
        position: 'fixed',
        bottom: '20px',
        left: '20px',
        width: '200px',
        height: '200px',
        borderRadius: '50%',
        border: '4px solid #8B6DB8',
        overflow: 'hidden',
        zIndex: '2147483647',
        boxShadow: '0 10px 30px rgba(139, 109, 184, 0.4), 0 0 0 2px rgba(139, 109, 184, 0.15)',
        cursor: 'grab',
        transition: 'box-shadow 0.3s',
        animation: 'slideUp 0.5s ease-out',
        background: '#1a1a2e'
    });

    Object.assign(video.style, {
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        transform: 'scaleX(1)' // Un-mirrored by default (shows as others see you)
    });

    faceBubble.appendChild(video);

    // Controls Dock
    const controls = document.createElement('div');
    controls.className = 'lulo-controls';
    controls.style.cssText = `
            position: absolute;
            bottom: 0;
            left: 0;
            width: 100%;
            padding: 16px 10px 20px 10px;
            display: flex;
            justify-content: center;
            gap: 10px;
            background: linear-gradient(to top, rgba(0,0,0,0.9), transparent);
            transform: translateY(100%);
            transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            z-index: 10;
            pointer-events: auto;
        `;

    // Helper for buttons
    const makeBtn = (icon, title, bg, action) => {
        const btn = document.createElement('button');
        btn.innerHTML = icon;
        btn.title = title;
        btn.style.cssText = `
                width: 36px; height: 36px;
                border-radius: 50%;
                border: none;
                background: ${bg};
                color: white;
                cursor: pointer;
                display: flex; align-items: center; justify-content: center;
                box-shadow: 0 4px 6px rgba(0,0,0,0.2);
                transition: all 0.2s;
                font-size: 16px;
            `;
        btn.onmousedown = (e) => e.stopPropagation(); // Prevent drag
        btn.onclick = (e) => { e.stopPropagation(); action(btn); };
        btn.onmouseenter = () => btn.style.transform = 'scale(1.15)';
        btn.onmouseleave = () => btn.style.transform = 'scale(1)';
        return btn;
    };

    // Stop Button
    const stopBtn = makeBtn('⏹', 'Stop Recording', '#ef4444', () => stopRecording());

    // Magic/Glow Button
    const glowBtn = makeBtn('✨', 'Toggle Glow', '#8B6DB8', (btn) => {
        isGlowEnabled = !isGlowEnabled;
        if (isGlowEnabled) {
            document.body.style.boxShadow = 'inset 0 0 0 8px #8B6DB8';
            btn.style.opacity = '1';
        } else {
            document.body.style.boxShadow = '';
            btn.style.opacity = '0.5';
        }
    });

    let isMirrored = false; // Default to un-mirrored
    const mirrorBtn = makeBtn('🪞', 'Mirror Camera', 'rgba(255,255,255,0.3)', () => {
        isMirrored = !isMirrored;
        video.style.transform = isMirrored ? 'scaleX(-1)' : 'scaleX(1)';
        mirrorBtn.style.opacity = isMirrored ? '1' : '0.6';
    });
    mirrorBtn.style.opacity = '0.6'; // Start dimmed since not mirrored

    controls.appendChild(stopBtn);
    controls.appendChild(glowBtn);
    controls.appendChild(mirrorBtn);
    faceBubble.appendChild(controls);

    // Hover Logic
    faceBubble.onmouseenter = () => controls.style.transform = 'translateY(0)';
    faceBubble.onmouseleave = () => controls.style.transform = 'translateY(100%)';

    document.body.appendChild(faceBubble);

    // Smooth Drag Logic
    let isDragging = false;
    let currentX;
    let currentY;
    let initialX;
    let initialY;
    let xOffset = 0;
    let yOffset = 0;

    faceBubble.addEventListener("mousedown", dragStart);
    document.addEventListener("mouseup", dragEnd);
    document.addEventListener("mousemove", drag);

    function dragStart(e) {
        if (e.target.tagName === 'BUTTON' || controls.contains(e.target)) return;

        initialX = e.clientX - xOffset;
        initialY = e.clientY - yOffset;

        if (faceBubble.contains(e.target)) {
            isDragging = true;
            faceBubble.style.cursor = 'grabbing';
            faceBubble.style.transition = 'none'; // Disable transition for instant follow
        }
    }

    function dragEnd(e) {
        if (!isDragging) return;
        initialX = currentX;
        initialY = currentY;
        isDragging = false;
        faceBubble.style.cursor = 'grab';
        faceBubble.style.transition = 'box-shadow 0.3s'; // Re-enable
    }

    function drag(e) {
        if (isDragging) {
            e.preventDefault();
            currentX = e.clientX - initialX;
            currentY = e.clientY - initialY;

            xOffset = currentX;
            yOffset = currentY;

            // Use requestAnimationFrame for smoothness
            requestAnimationFrame(() => {
                faceBubble.style.transform = `translate3d(${currentX}px, ${currentY}px, 0)`;
            });
        }
    }

    // Camera Stream
    try {
        camStream = await navigator.mediaDevices.getUserMedia({
            video: {
                width: { ideal: 720 }, // Higher quality
                aspectRatio: 1
            },
            audio: false
        });
        video.srcObject = camStream;
        await video.play();
    } catch (e) {
        console.warn("No camera access", e);
        const fbDiv = document.createElement('div');
        fbDiv.innerHTML = "📷";
        fbDiv.style.cssText = "width:100%;height:100%;background:#333;display:flex;align-items:center;justify-content:center;color:#fff;font-size:40px;";
        video.replaceWith(fbDiv);
    }
}
// ==========================================
// Canvas Compositor (Face Bubble Persistence)
// ==========================================
function setupCompositor(screenStream, camStream) {
    const canvas = document.createElement('canvas');
    // We'll set dimensions based on the screen track settings
    const screenTrack = screenStream.getVideoTracks()[0];
    const settings = screenTrack.getSettings();
    const width = settings.width || 1920;
    const height = settings.height || 1080;
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d', { alpha: false }); // Optimize for video

    // Create video elements for source streams
    const screenVideo = document.createElement('video');
    screenVideo.srcObject = screenStream;
    screenVideo.muted = true;
    screenVideo.play();

    let camVideo = null;
    if (camStream) {
        camVideo = document.createElement('video');
        camVideo.srcObject = camStream;
        camVideo.muted = true;
        camVideo.play();
    }

    let animationId = null;
    let isActive = true;

    // Drawing Loop
    function draw() {
        if (!isActive) return;

        // 1. Draw Screen (Background)
        ctx.drawImage(screenVideo, 0, 0, width, height);

        // 2. Draw Face Bubble (Bottom-Left)
        if (camVideo && camVideo.readyState === 4) { // HAVE_ENOUGH_DATA
            const bubbleSize = Math.max(width * 0.15, 200); // 15% of screen width or min 200px
            const padding = 40;
            const x = padding;
            const y = height - bubbleSize - padding;

            ctx.save();
            ctx.beginPath();
            ctx.arc(x + bubbleSize / 2, y + bubbleSize / 2, bubbleSize / 2, 0, Math.PI * 2);
            ctx.closePath();
            ctx.clip(); // Circular mask

            // Flip camera horizontally (mirror effect) - Optional, users usually expect mirror
            ctx.translate(x + bubbleSize, y);
            ctx.scale(-1, 1);
            // Draw video centered in circle (cover fit)
            // Assuming simplified "cover" logic: center crop
            const vidRatio = camVideo.videoWidth / camVideo.videoHeight;
            const drawHeight = bubbleSize;
            const drawWidth = drawHeight * vidRatio;
            const drawX = (bubbleSize - drawWidth) / 2; // centered

            // Because we flipped context, we draw at relative 0, 0 (or adjusted coords)
            // But since we translated to top-right of the box (x+size), and scaled -1,
            // valid x range is [0, bubbleSize] effectively running backwards.
            // Let's simplify: Draw rect [0, 0, bubbleSize, bubbleSize] but mapped from video source

            // To be safe with flip:
            ctx.drawImage(camVideo, drawX, 0, drawWidth, drawHeight);

            ctx.restore();

            // Draw Border/Glow (Overlay)
            ctx.save();
            ctx.beginPath();
            ctx.arc(x + bubbleSize / 2, y + bubbleSize / 2, bubbleSize / 2, 0, Math.PI * 2);
            ctx.lineWidth = 4;
            ctx.strokeStyle = '#8B6DB8'; // Lulo Purple
            ctx.stroke();
            ctx.restore();
        }

        animationId = requestAnimationFrame(draw);
    }

    // Start loop
    draw();

    // Capture stream at 30fps
    const stream = canvas.captureStream(30);

    return {
        stream,
        cleanup: () => {
            isActive = false;
            if (animationId) cancelAnimationFrame(animationId);
            if (screenVideo) {
                screenVideo.pause();
                screenVideo.srcObject = null;
            }
            if (camVideo) {
                camVideo.pause();
                camVideo.srcObject = null;
            }
            canvas.remove();
        }
    };
}

// ============= SCREENSHOT MODE =============
let screenshotOverlay = null;
let screenshotSelection = null;
let isSelecting = false;
let startX = 0;
let startY = 0;

function toggleScreenshotMode() {
    if (screenshotOverlay) {
        closeScreenshotMode();
    } else {
        openScreenshotMode();
    }
}

function openScreenshotMode() {
    showLuloGlow();

    screenshotOverlay = document.createElement('div');
    screenshotOverlay.id = 'lulo-screenshot-overlay';
    screenshotOverlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.3);
        cursor: crosshair;
        z-index: 2147483660;
    `;

    // Selection Box
    screenshotSelection = document.createElement('div');
    screenshotSelection.id = 'lulo-screenshot-selection';
    screenshotSelection.style.cssText = `
        position: fixed;
        border: 2px solid #8B6DB8;
        background: rgba(139, 109, 184, 0.1);
        display: none;
        pointer-events: none; /* Let clicks pass through during select */
        z-index: 2147483661;
    `;

    // Help Text
    const helpText = document.createElement('div');
    helpText.textContent = 'Click and drag to capture';
    helpText.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: #2D2B3A;
        color: white;
        padding: 8px 16px;
        border-radius: 20px;
        font-family: sans-serif;
        font-size: 14px;
        z-index: 2147483662;
        pointer-events: none;
    `;
    screenshotOverlay.appendChild(helpText);
    document.body.appendChild(screenshotSelection);
    document.body.appendChild(screenshotOverlay);

    // Events
    screenshotOverlay.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);

    // Escape to cancel
    document.addEventListener('keydown', onKeyDown);
}

function closeScreenshotMode() {
    if (screenshotOverlay) {
        screenshotOverlay.remove();
        screenshotOverlay = null;
    }
    if (screenshotSelection) {
        screenshotSelection.remove();
        screenshotSelection = null;
    }

    // Cleanup listeners
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
    document.removeEventListener('keydown', onKeyDown);

    // Remove Action Bar if exists
    const oldBar = document.getElementById('lulo-screenshot-actions');
    if (oldBar) oldBar.remove();

    hideLuloGlow();
}

function onKeyDown(e) {
    if (e.key === 'Escape') {
        closeScreenshotMode();
    }
}

function onMouseDown(e) {
    isSelecting = true;
    startX = e.clientX;
    startY = e.clientY;

    // Reset styles
    screenshotSelection.style.display = 'block';
    screenshotSelection.style.left = startX + 'px';
    screenshotSelection.style.top = startY + 'px';
    screenshotSelection.style.width = '0px';
    screenshotSelection.style.height = '0px';

    // Remove any existing action bar
    const oldBar = document.getElementById('lulo-screenshot-actions');
    if (oldBar) oldBar.remove();
}

function onMouseMove(e) {
    if (!isSelecting) return;

    const currentX = e.clientX;
    const currentY = e.clientY;

    const width = Math.abs(currentX - startX);
    const height = Math.abs(currentY - startY);
    const left = Math.min(currentX, startX);
    const top = Math.min(currentY, startY);

    screenshotSelection.style.left = left + 'px';
    screenshotSelection.style.top = top + 'px';
    screenshotSelection.style.width = width + 'px';
    screenshotSelection.style.height = height + 'px';
}

function onMouseUp(e) {
    if (!isSelecting) return;
    isSelecting = false;

    // Show Actions
    const rect = screenshotSelection.getBoundingClientRect();
    if (rect.width > 50 && rect.height > 50) {
        showScreenshotActions(rect);
    } else {
        // Too small, reset
        screenshotSelection.style.display = 'none';
    }
}

function showScreenshotActions(rect) {
    const actionBar = document.createElement('div');
    actionBar.id = 'lulo-screenshot-actions';
    actionBar.style.cssText = `
        position: fixed;
        left: ${rect.left}px;
        top: ${rect.bottom + 10}px;
        background: white;
        padding: 8px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        display: flex;
        gap: 8px;
        z-index: 2147483663;
        animation: slideIn 0.2s ease;
    `;

    // Ensure it's on screen
    if (rect.bottom + 60 > window.innerHeight) {
        actionBar.style.top = (rect.top - 60) + 'px';
    }

    const downloadBtn = createActionBtn('Download', '⬇️', () => captureAndAction(rect, 'download'));
    const cloudBtn = createActionBtn('Save to Cloud', '☁️', () => captureAndAction(rect, 'upload'));
    const cancelBtn = createActionBtn('', '✕', closeScreenshotMode);

    actionBar.appendChild(downloadBtn);
    actionBar.appendChild(cloudBtn);
    actionBar.appendChild(cancelBtn);

    document.body.appendChild(actionBar);
}

function createActionBtn(text, icon, onClick) {
    const btn = document.createElement('button');
    btn.innerHTML = `${icon} ${text}`;
    btn.style.cssText = `
        border: none;
        background: #F5F3FA;
        color: #2D2B3A;
        padding: 6px 12px;
        border-radius: 6px;
        cursor: pointer;
        font-family: sans-serif;
        font-size: 13px;
        display: flex;
        align-items: center;
        gap: 6px;
    `;
    btn.onmouseover = () => btn.style.background = '#E8E4F0';
    btn.onmouseout = () => btn.style.background = '#F5F3FA';
    btn.onclick = onClick;
    return btn;
}

async function captureAndAction(rect, action) {
    // Hide UI elements temporarily
    screenshotSelection.style.display = 'none';
    screenshotOverlay.style.display = 'none';
    document.getElementById('lulo-screenshot-actions').style.display = 'none';

    // Wait for render
    await new Promise(r => setTimeout(r, 100));

    try {
        // Request Capture
        const response = await chrome.runtime.sendMessage({ type: 'CAPTURE_VISIBLE_TAB' });

        if (response.dataUrl) {
            // Crop it
            const croppedDataUrl = await cropImage(response.dataUrl, rect);

            if (action === 'download') {
                const link = document.createElement('a');
                link.download = `lulo-screenshot-${Date.now()}.png`;
                link.href = croppedDataUrl;
                link.click();
            } else if (action === 'upload') {
                await uploadScreenshot(croppedDataUrl);
            }
        }
    } catch (e) {
        console.error('Screenshot failed', e);
        alert('Failed to capture screenshot.');
    } finally {
        closeScreenshotMode();
    }
}

function cropImage(dataUrl, rect) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const dpr = window.devicePixelRatio || 1;

            // Set canvas size to crop size
            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;

            const ctx = canvas.getContext('2d');

            // Draw cropped portion
            // Source x, y, w, h -> Dest x, y, w, h
            ctx.drawImage(
                img,
                rect.left * dpr, rect.top * dpr, rect.width * dpr, rect.height * dpr,
                0, 0, canvas.width, canvas.height
            );

            resolve(canvas.toDataURL('image/png'));
        };
        img.src = dataUrl;
    });
}

async function uploadScreenshot(dataUrl) {
    // Get token
    const { luloCloudToken } = await chrome.storage.sync.get(['luloCloudToken']);
    if (!luloCloudToken) {
        alert('Please connect your Lulo account in Settings to upload.');
        return;
    }

    // Convert Base64 to Blob
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    const formData = new FormData();
    formData.append('file', blob, `screenshot-${Date.now()}.png`);

    // We need an endpoint
    // Assuming backend will be at localhost:3000/api/images

    // For now, in MVP content script, we might not reach localhost due to CORS if not configured
    // But extension host permissions should allow it.

    try {
        // const API_URL = 'http://localhost:3000/api/images';
        const API_URL = 'https://heylulo.com/api/images'; // Prod

        const uploadRes = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${luloCloudToken}`
            },
            body: formData
        });

        if (uploadRes.ok) {
            alert('Screenshot saved to cloud! ☁️');
        } else {
            console.error('Upload failed', await uploadRes.text());
            alert('Failed to upload.');
        }
    } catch (e) {
        console.error('Upload error', e);
        alert('Error uploading screenshot.');
    }
}
