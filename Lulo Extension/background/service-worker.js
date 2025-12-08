// Background Service Worker
// const API_URL = 'http://localhost:3000/api/agent'; // Dev - uncomment for local development
const API_URL = 'https://heylulo.com/api/agent'; // Prod

// Message handler
// Message handler
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(console.error);

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    handleMessage(message, sender).then(sendResponse);
    return true; // Keep channel open for async response
});

// External Message Handler (Auth from Web App)
chrome.runtime.onMessageExternal.addListener((request, sender, sendResponse) => {
    if (request.type === 'LULO_AUTH_TOKEN') {
        const token = request.token;
        // Accept any token (JWT or lulo_ prefixed API key)
        if (token && token.length > 20) {
            chrome.storage.sync.set({ luloCloudToken: token }, () => {
                console.log('Token synced from external source');
                sendResponse({ success: true });
            });
        } else {
            sendResponse({ success: false, error: 'Invalid Token' });
        }
    }
    return true;
});

async function handleMessage(message, sender) {
    switch (message.type) {
        case 'START_TASK':
            return await startTask(message);
        case 'SEND_MESSAGE':
            return await sendMessage(message, sender);
        case 'SCREENSHOT':
            return await takeScreenshot();
        case 'EXTRACT_TEXT':
            return await extractText();
        case 'ENABLE_CLICK_MODE':
            return await enableClickMode();
        case 'EXECUTE_ACTION':
            return await executeAction(message);
        default:
            return { success: false, error: 'Unknown message type' };
    }
}

async function startTask(data) {
    try {
        const response = await callAPI(data.task, {
            url: data.url,
            tabId: data.tabId
        });
        return { success: true, reply: response };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function sendMessage(data, sender) {
    try {
        // Start the glow effect
        try {
            await chrome.tabs.sendMessage(data.tabId, { type: 'LULO_START' });
        } catch (e) { /* Tab might not have content script */ }

        // Fetch User Profile
        const storageData = await chrome.storage.sync.get('userProfile');
        const userProfile = storageData.userProfile || null;

        // Fetch Page Summary (Smart Context)
        let pageContent = "";
        try {
            const summaryResults = await chrome.scripting.executeScript({
                target: { tabId: data.tabId },
                func: () => {
                    const h1 = document.querySelector('h1')?.innerText || '';
                    const meta = document.querySelector('meta[name="description"]')?.content || '';
                    const body = document.body.innerText.slice(0, 1000).replace(/\s+/g, ' ');
                    return { h1, meta, body };
                }
            });
            const res = summaryResults[0]?.result;
            if (res) {
                pageContent = `Title: ${res.h1}\nDescription: ${res.meta}\nSnippet: ${res.body}...`;
            }
        } catch (e) { console.log('Context fetch failed', e); }

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${sender.tab ? '' : (await chrome.storage.sync.get('luloCloudToken')).luloCloudToken}`
            },
            body: JSON.stringify({
                prompt: data.message,
                context: {
                    currentUrl: data.url,
                    pageTitle: data.title,
                    isExtension: true,
                    userProfile: userProfile,
                    pageContent: pageContent // <--- INJECTED HERE
                }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API Error ${response.status}: ${response.statusText} - ${errorText}`);
        }

        const apiData = await response.json();

        // Execute steps and collect responses
        const executedActions = [];
        let replyText = '';

        // Helper: Process steps recursively (max 3 turns)
        async function processSteps(steps, turnCount = 0) {
            if (turnCount > 3) return; // Prevent infinite loops

            for (const step of steps) {
                // Add description to reply
                if (step.description) {
                    replyText += step.description + '\n\n';
                }

                // Execute the action
                const actionResult = await executeStep(step, data.tabId, data.images);

                if (actionResult) {
                    executedActions.push(actionResult);

                    // LOOP: If we extracted data or looked at the page, feed it back to the Agent!
                    if ((actionResult.type === 'extract' || actionResult.type === 'look') && actionResult.extractedData) {
                        try {
                            let followUpPrompt = "";
                            let nextImages = [];

                            if (actionResult.type === 'extract') {
                                followUpPrompt = `I have extracted the data: ${actionResult.extractedData.substring(0, 1000)}... Now please continue with the next step.`;
                            }
                            else if (actionResult.type === 'look') {
                                followUpPrompt = "I have captured a visual snapshot of the page (attached). Please analyze it as requested.";
                                nextImages = [actionResult.extractedData]; // Send base64 image
                            }

                            // Call API again with new context
                            const nextResponse = await fetch(API_URL, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${(await chrome.storage.sync.get('luloCloudToken')).luloCloudToken}`
                                },
                                body: JSON.stringify({
                                    prompt: followUpPrompt,
                                    images: nextImages,
                                    context: {
                                        currentUrl: data.url,
                                        pageTitle: "Lulo Feedback Loop",
                                        isExtension: true,
                                        userProfile: userProfile
                                    }
                                })
                            });

                            if (nextResponse.ok) {
                                const nextJson = await nextResponse.json();
                                if (nextJson.steps) {
                                    // Recursive processing of new steps
                                    await processSteps(nextJson.steps, turnCount + 1);
                                }
                            }
                        } catch (err) {
                            console.error('Loop Error:', err);
                        }
                    }
                }
            }
        }

        if (apiData.steps && Array.isArray(apiData.steps)) {
            await processSteps(apiData.steps);
        }

        // End the glow effect after a delay
        setTimeout(async () => {
            try {
                await chrome.tabs.sendMessage(data.tabId, { type: 'LULO_END' });
            } catch (e) { }
        }, 2000);

        return {
            success: true,
            reply: replyText.trim() || 'Working on your request...',
            actions: executedActions
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Execute a single step from the AI
async function executeStep(step, tabId, userImages = []) {
    // Broadcast: Step Started
    try {
        chrome.runtime.sendMessage({
            type: 'LULO_STEP_UPDATE',
            status: 'running',
            action: step.action,
            description: step.description
        }).catch(() => { }); // If popup closed, ignore
    } catch (e) { }

    try {
        switch (step.action) {
            case 'BROWSE':
                if (step.data?.url) {
                    const newTab = await chrome.tabs.create({ url: step.data.url });

                    // Non-blocking wait (Fire and Forget)
                    (async () => {
                        await waitForTabLoad(newTab.id);
                        try {
                            await chrome.tabs.sendMessage(newTab.id, { type: 'LULO_START' });
                            setTimeout(async () => {
                                try { await chrome.tabs.sendMessage(newTab.id, { type: 'LULO_END' }); } catch (e) { }
                            }, 3000);
                        } catch (e) { }
                    })();

                    return {
                        type: 'browse',
                        description: `Opened ${step.data.url}`,
                        tabId: newTab.id
                    };
                }
                break;

            case 'NAVIGATE':
                if (step.data?.url && tabId) {
                    await chrome.tabs.update(tabId, { url: step.data.url });

                    // Non-blocking wait
                    (async () => {
                        await waitForTabLoad(tabId);
                    })();

                    return {
                        type: 'navigate',
                        description: `Navigated to ${step.data.url}`
                    };
                }
                break;

            case 'CLICK':
                if (step.data?.selector && tabId) {
                    await chrome.tabs.sendMessage(tabId, {
                        type: 'CLICK_ELEMENT',
                        selector: step.data.selector
                    });
                    return {
                        type: 'click',
                        description: `Clicked ${step.data.selector}`
                    };
                }
                break;

            case 'TYPE':
                if (step.data?.text && tabId) {
                    await chrome.tabs.sendMessage(tabId, {
                        type: 'TYPE_TEXT',
                        selector: step.data.selector || 'input:focus, textarea:focus',
                        text: step.data.text
                    });
                    return {
                        type: 'type',
                        description: `Typed "${step.data.text.slice(0, 30)}..."`
                    };
                }
                break;

            case 'THINK':
                return null;

            case 'EMAIL': {
                const emailData = step.data || {};
                const params = new URLSearchParams();
                params.append('view', 'cm'); // Compose Mode - Key for reliability
                params.append('fs', '1');
                params.append('tf', '1');
                if (emailData.to) params.append('to', emailData.to);
                if (emailData.subject) params.append('su', emailData.subject);
                if (emailData.body) params.append('body', emailData.body);

                // Direct link to compose window, skips inbox loading issues
                const gmailUrl = `https://mail.google.com/mail/?${params.toString()}`;
                const emailTab = await chrome.tabs.create({ url: gmailUrl });

                // FINAL FIX: Non-blocking wait. 
                // We return success immediately so the UI doesn't freeze.
                // The glow effect will happen "eventually" when the tab loads.
                (async () => {
                    await waitForTabLoad(emailTab.id);
                    try {
                        await chrome.tabs.sendMessage(emailTab.id, { type: 'LULO_START' });
                        setTimeout(async () => {
                            try { await chrome.tabs.sendMessage(emailTab.id, { type: 'LULO_END' }); } catch (e) { }
                        }, 3000);
                    } catch (e) { }
                })();

                return {
                    type: 'email',
                    description: `Opened email draft${emailData.to ? ` to ${emailData.to}` : ''}`,
                    tabId: emailTab.id
                };
            }

            case 'SEARCH': {
                if (step.data?.query) {
                    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(step.data.query)}`;
                    const searchTab = await chrome.tabs.create({ url: searchUrl });

                    // Non-blocking wait
                    (async () => {
                        await waitForTabLoad(searchTab.id);
                    })();
                    return {
                        type: 'search',
                        description: `Searched for "${step.data.query}"`,
                        tabId: searchTab.id
                    };
                }
                return { type: 'error', description: 'Missing query' };
            }

            case 'CALENDAR': {
                const calData = step.data || {};
                const calParams = new URLSearchParams();
                calParams.append('action', 'TEMPLATE');
                if (calData.title) calParams.append('text', calData.title);
                if (calData.details) calParams.append('details', calData.details);
                if (calData.location) calParams.append('location', calData.location);
                if (calData.start && calData.end) {
                    calParams.append('dates', `${calData.start}/${calData.end}`);
                }

                const calUrl = `https://calendar.google.com/calendar/render?${calParams.toString()}`;
                const calTab = await chrome.tabs.create({ url: calUrl });

                // Non-blocking wait
                (async () => {
                    await waitForTabLoad(calTab.id);
                })();

                return {
                    type: 'calendar',
                    description: `Opened Calendar for "${calData.title || 'Event'}"`,
                    tabId: calTab.id
                };
            }

            case 'EXTRACT': {
                const exData = step.data || {};
                const selector = exData.selector || 'body';
                const filename = exData.filename || 'extracted_data.json';
                const format = exData.format || 'json';

                // Execute script to get data
                const result = await chrome.scripting.executeScript({
                    target: { tabId: tabId },
                    func: (sel, fmt) => {
                        // 1. Specialized: Emails
                        if (sel === 'body' || sel.includes('email')) {
                            const text = document.body.innerText;
                            const emailRegex = /[\w.-]+@[\w.-]+\.\w+/g;
                            const emails = [...new Set(text.match(emailRegex) || [])];
                            return fmt === 'csv' ? emails.map(e => [e]).join('\n') : JSON.stringify(emails);
                        }

                        // 2. Specialized: Images
                        if (sel === 'img' || sel.includes('img') || sel === 'images') {
                            const imgs = Array.from(document.querySelectorAll('img'))
                                .map(img => img.src)
                                .filter(src => src && src.startsWith('http')) // valid urls only
                                .slice(0, 10); // Limit to 10 to avoid token limits
                            return JSON.stringify(imgs);
                        }

                        // 3. Specialized: Brand DNA
                        if (sel === 'brand') {
                            const DNA = {
                                title: document.title,
                                description: document.querySelector('meta[name="description"]')?.content || '',
                                logo: document.querySelector('link[rel*="icon"]')?.href || '',
                                // Simple color extraction (scan buttons and headers)
                                colors: Array.from(document.querySelectorAll('button, a.btn, header, nav'))
                                    .map(el => {
                                        const s = getComputedStyle(el);
                                        return [s.backgroundColor, s.color];
                                    })
                                    .flat()
                                    .filter(c => c !== 'rgba(0, 0, 0, 0)' && c !== 'rgb(255, 255, 255)')
                                    .slice(0, 5), // Top 5 colors
                                font: getComputedStyle(document.body).fontFamily.split(',')[0].replace(/['"]/g, '')
                            };
                            return JSON.stringify(DNA);
                        }

                        // 3. Generic Text
                        const els = document.querySelectorAll(sel);
                        const texts = Array.from(els).map(el => el.innerText.trim()).filter(t => t);
                        return fmt === 'csv' ? texts.join('\n') : JSON.stringify(texts);
                    },
                    args: [selector, format]
                });

                const content = result[0]?.result || '';

                // Truncate for prompt injection if too huge
                const previewContent = content.length > 5000 ? content.substring(0, 5000) + '... (truncated)' : content;

                return {
                    type: 'extract',
                    description: `Extracted data from ${selector}`,
                    extractedData: previewContent
                };
            }

            case 'SCREENSHOT':
                // High-speed JPEG capture
                const dataUrl = await chrome.tabs.captureVisibleTab(null, { format: 'jpeg', quality: 60 });

                // Direct download via content script
                await chrome.tabs.sendMessage(tabId, {
                    type: 'LULO_DOWNLOAD',
                    content: dataUrl,
                    isDataUrl: true,
                    filename: `lulo-snap-${Date.now()}.jpg`
                });

                return { type: 'screenshot', description: 'Saved screenshot to Downloads' };

            case 'LOOK': // The Designer's Eye
                const visualContext = await chrome.tabs.captureVisibleTab(null, { format: 'jpeg', quality: 50 });
                // Return data for the Agent loop
                return {
                    type: 'look',
                    description: 'Captured visual snapshot of the page',
                    extractedData: visualContext
                };

            case 'WRITE_FILE': // The Engineer's Hand
                const { filename, content } = step.data;
                // Forward to Content Script (Window context)
                await chrome.tabs.sendMessage(tabId, {
                    type: 'LULO_WRITE_FILE',
                    filename: filename || 'lulo-download.txt',
                    content: content
                });
                return { type: 'complete', description: `Saved file: ${filename}` };

            case 'CLICK': {
                const selector = step.data?.selector;
                await chrome.scripting.executeScript({
                    target: { tabId: tabId },
                    func: async (sel) => {
                        // Helper to find partial text match or CSS
                        function findEl(s) {
                            if (s.includes(':contains(')) {
                                const text = s.match(/:contains\(['"]?(.*?)['"]?\)/)[1];
                                const tag = s.split(':')[0] || '*';
                                const elements = document.querySelectorAll(tag);
                                return Array.from(elements).find(e => e.innerText.includes(text));
                            }
                            return document.querySelector(s);
                        }

                        const el = findEl(sel);
                        if (!el) throw new Error(`Element not found: ${sel}`);

                        // 1. VISUAL: Create Glow Overlay
                        const rect = el.getBoundingClientRect();
                        const scrollX = window.scrollX;
                        const scrollY = window.scrollY;

                        const overlay = document.createElement('div');
                        overlay.style.cssText = `
                            position: absolute;
                            left: ${rect.left + scrollX}px;
                            top: ${rect.top + scrollY}px;
                            width: ${rect.width}px;
                            height: ${rect.height}px;
                            border: 2px solid #8B6DB8;
                            box-shadow: 0 0 10px #8B6DB8, 0 0 20px rgba(139, 109, 184, 0.4);
                            background: rgba(139, 109, 184, 0.1);
                            z-index: 999999;
                            border-radius: 4px;
                            transition: all 0.3s ease;
                            pointer-events: none;
                        `;
                        document.body.appendChild(overlay);

                        el.scrollIntoView({ behavior: 'smooth', block: 'center' });

                        // 2. WAIT: Simulate target lock (Reduced for speed)
                        await new Promise(r => setTimeout(r, 200));

                        // 3. EFFECT: Click Pulse
                        overlay.style.transform = 'scale(0.95)';
                        overlay.style.background = 'rgba(139, 109, 184, 0.4)';
                        await new Promise(r => setTimeout(r, 100));

                        // 4. ACTION
                        el.click();

                        // 5. CLEANUP
                        overlay.remove();
                    },
                    args: [selector]
                });
                return { type: 'click', description: `Clicked ${selector}` };
            }

            case 'TYPE': {
                const { selector, text } = step.data || {};
                await chrome.scripting.executeScript({
                    target: { tabId: tabId },
                    func: async (sel, inputTxt) => {
                        const el = document.querySelector(sel);
                        if (!el) throw new Error(`Input not found: ${sel}`);

                        // 1. VISUAL
                        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        el.style.transition = 'box-shadow 0.2s';
                        el.style.boxShadow = '0 0 0 3px #8B6DB8, 0 0 15px rgba(139, 109, 184, 0.5)';

                        // 2. TYPE
                        el.focus();
                        el.value = inputTxt;
                        // Trigger events for React/Angular/Vue
                        el.dispatchEvent(new Event('input', { bubbles: true }));
                        el.dispatchEvent(new Event('change', { bubbles: true }));

                        // 3. WAIT (Reduced)
                        await new Promise(r => setTimeout(r, 200));

                        // 4. CLEANUP
                        el.style.boxShadow = 'none';
                    },
                    args: [selector, text]
                });
                return { type: 'type', description: `Typed "${text}"` };
            }

            case 'GUIDE': {
                const { message, target } = step.data || {};

                if (target && tabId) {
                    // 1. Highlighting Logic
                    await chrome.scripting.executeScript({
                        target: { tabId: tabId },
                        func: (sel, msg) => {
                            // Find Element Helper
                            function findEl(s) {
                                if (s.includes(':contains(')) {
                                    const text = s.match(/:contains\(['"]?(.*?)['"]?\)/)[1];
                                    const tag = s.split(':')[0] || '*';
                                    const elements = document.querySelectorAll(tag);
                                    return Array.from(elements).find(e => e.innerText.includes(text));
                                }
                                return document.querySelector(s);
                            }

                            const el = findEl(sel);
                            if (!el) return; // Fail silently if not found

                            el.scrollIntoView({ behavior: 'smooth', block: 'center' });

                            // Overlay
                            const rect = el.getBoundingClientRect();
                            const overlay = document.createElement('div');
                            overlay.className = 'lulo-guide-overlay'; // For easy cleanup
                            overlay.style.cssText = `
                                position: absolute;
                                left: ${rect.left + window.scrollX}px;
                                top: ${rect.top + window.scrollY}px;
                                width: ${rect.width}px;
                                height: ${rect.height}px;
                                border: 2px solid #8B6DB8;
                                box-shadow: 0 0 15px #8B6DB8, 0 0 30px rgba(139, 109, 184, 0.4);
                                background: rgba(139, 109, 184, 0.1);
                                z-index: 999999;
                                border-radius: 4px;
                                pointer-events: none; /* Let clicks pass through */
                                animation: luloPulse 2s infinite;
                            `;

                            // Tooltip
                            const tooltip = document.createElement('div');
                            tooltip.innerText = msg;
                            tooltip.style.cssText = `
                                position: absolute;
                                bottom: 100%;
                                left: 50%;
                                transform: translateX(-50%);
                                margin-bottom: 10px;
                                background: #1e1e1e;
                                color: #fff;
                                padding: 8px 12px;
                                border-radius: 6px;
                                font-family: sans-serif;
                                font-size: 13px;
                                white-space: nowrap;
                                box-shadow: 0 4px 12px rgba(0,0,0,0.2);
                                border: 1px solid #333;
                            `;
                            // Arrow
                            const arrow = document.createElement('div');
                            arrow.style.cssText = `
                                position: absolute;
                                top: 100%;
                                left: 50%;
                                margin-left: -5px;
                                border-width: 5px;
                                border-style: solid;
                                border-color: #1e1e1e transparent transparent transparent;
                            `;
                            tooltip.appendChild(arrow);
                            overlay.appendChild(tooltip);
                            document.body.appendChild(overlay);

                            // CSS for Pulse
                            if (!document.getElementById('lulo-guide-css')) {
                                const style = document.createElement('style');
                                style.id = 'lulo-guide-css';
                                style.textContent = `
                                    @keyframes luloPulse {
                                        0% { box-shadow: 0 0 0 0 rgba(139, 109, 184, 0.7); }
                                        70% { box-shadow: 0 0 0 10px rgba(139, 109, 184, 0); }
                                        100% { box-shadow: 0 0 0 0 rgba(139, 109, 184, 0); }
                                    }
                                `;
                                document.head.appendChild(style);
                            }

                            // Cleanup on click (Simulating "Task Done")
                            // We attach listener to document to check if click happened inside the target rect
                            function clickHandler(e) {
                                const r = el.getBoundingClientRect();
                                if (e.clientX >= r.left && e.clientX <= r.right &&
                                    e.clientY >= r.top && e.clientY <= r.bottom) {
                                    overlay.remove();
                                    document.removeEventListener('click', clickHandler);
                                }
                            }
                            // Slight delay to avoid immediate removal if user is already clicking
                            setTimeout(() => document.addEventListener('click', clickHandler), 500);

                            // Auto-remove after 30s to prevent stuck overlays
                            setTimeout(() => overlay.remove(), 30000);
                        },
                        args: [target, message]
                    });
                    return { type: 'guide', description: `Highlighted element: ${message}` };

                } else if (message) {
                    // Fallback to sending message
                    await chrome.tabs.sendMessage(tabId, {
                        type: 'LULO_GUIDE',
                        message: message
                    });
                    return { type: 'guide', description: `Showed message: ${message}` };
                }
                return { type: 'error', description: 'No target or message for GUIDE' };
            }

            case 'PREVIEW': {
                if (step.data && tabId) {
                    let htmlContent = step.data.html || '';

                    // Inject User Images if placeholders exist
                    if (userImages && userImages.length > 0) {
                        // Replace {{USER_IMAGE_0}}, {{USER_IMAGE_1}} etc.
                        userImages.forEach((base64, idx) => {
                            const placeholder = `{{USER_IMAGE_${idx}}}`;
                            // Also support simple {{USER_IMAGE}} for single image
                            if (idx === 0) {
                                htmlContent = htmlContent.replace(/{{USER_IMAGE}}/g, base64);
                            }
                            htmlContent = htmlContent.split(placeholder).join(base64);
                        });
                    }

                    await chrome.tabs.sendMessage(tabId, {
                        type: 'PREVIEW',
                        html: htmlContent,
                        css: step.data.css || '',
                        js: step.data.js || ''
                    });
                    return {
                        type: 'preview',
                        description: 'Generated interactive preview'
                    };
                }
                break;
            }
        }
    } catch (error) {
        console.error('Error executing step:', error);
    }

    // Broadcast: Step Completed
    try {
        chrome.runtime.sendMessage({
            type: 'LULO_STEP_UPDATE',
            status: 'completed',
            action: step.action,
            description: step.description
        }).catch(() => { });
    } catch (e) { }

    return null;
}

// Helper to wait for tab to complete loading with Polling (More Robust)
function waitForTabLoad(tabId) {
    return new Promise((resolve) => {
        const startTime = Date.now();
        const timeout = 15000; // 15 seconds max wait

        const poll = () => {
            chrome.tabs.get(tabId, (tab) => {
                // If tab doesn't exist or runtime error, stop waiting (resolve to let flow continue)
                if (chrome.runtime.lastError || !tab) {
                    return resolve();
                }

                // If complete, we are good!
                if (tab.status === 'complete') {
                    return resolve();
                }

                // Check for timeout
                if (Date.now() - startTime > timeout) {
                    console.log('Wait for tab load timed out, proceeding anyway...');
                    return resolve(); // Proceed anyway to avoid getting stuck
                }

                // Retry
                setTimeout(poll, 500);
            });
        };

        poll();
    });
}

async function callAPI(message) {
    try {
        // Get conversation ID from storage
        const { luloCloudToken, conversationId: storedConvId } = await chrome.storage.sync.get(['luloCloudToken', 'conversationId']);

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${luloCloudToken || ''}`
            },
            body: JSON.stringify({
                prompt: message.text,
                context: message.context,
                images: message.images,
                conversationId: storedConvId
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            return { error: `Server Error: ${response.status}`, details: errText };
        }


        // Fallback for other response formats
        return data.response || data.message || JSON.stringify(data, null, 2);
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

async function takeScreenshot() {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'png' });

        // Store screenshot
        await chrome.storage.local.set({
            lastScreenshot: {
                dataUrl,
                timestamp: Date.now(),
                url: tab.url
            }
        });

        return { success: true, dataUrl };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function extractText() {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        const [result] = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => document.body.innerText
        });

        return { success: true, text: result.result };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function enableClickMode() {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        await chrome.tabs.sendMessage(tab.id, { type: 'ENABLE_CLICK_MODE' });

        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function executeAction(action) {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        switch (action.type) {
            case 'click':
                await chrome.tabs.sendMessage(tab.id, {
                    type: 'CLICK_ELEMENT',
                    selector: action.selector
                });
                break;
            case 'type':
                await chrome.tabs.sendMessage(tab.id, {
                    type: 'TYPE_TEXT',
                    selector: action.selector,
                    text: action.text
                });
                break;
            case 'navigate':
                await chrome.tabs.update(tab.id, { url: action.url });
                break;
        }

        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

function parseActions(response) {
    // Simple action parsing - look for common patterns
    const actions = [];

    // Check for click actions
    const clickMatch = response.match(/click(?:ing)?\s+(?:on\s+)?["']?([^"'\n]+)["']?/i);
    if (clickMatch) {
        actions.push({
            type: 'click',
            description: `Clicking ${clickMatch[1]}`,
            selector: clickMatch[1]
        });
    }

    // Check for navigation
    const navMatch = response.match(/navigate?\s+to\s+["']?([^"'\s]+)["']?/i);
    if (navMatch) {
        actions.push({
            type: 'navigate',
            description: `Navigating to ${navMatch[1]}`,
            url: navMatch[1]
        });
    }

    return actions;
}

// ==========================================
// ACCESSIBILITY: Context Menus & Shortcuts
// ==========================================

// Create Menus on Install
chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: "lulo-ask-selection",
        title: "Ask Lulo about this",
        contexts: ["selection"]
    });
    chrome.contextMenus.create({
        id: "lulo-use-image",
        title: "Use this image with Lulo",
        contexts: ["image"]
    });
    chrome.contextMenus.create({
        id: "lulo-design-page",
        title: "Design a graphic for this page",
        contexts: ["page", "frame"]
    });
});

// Handle Menu Clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    let actionPrompt = "";

    if (info.menuItemId === "lulo-ask-selection") {
        actionPrompt = `Explain this text: "${info.selectionText}"`;
    } else if (info.menuItemId === "lulo-use-image") {
        // We can't easily get the base64 here without re-fetching, 
        // but we can pass the URL and let Lulo "EXTRACT" it.
        actionPrompt = `Use this image in a design: ${info.srcUrl}`;
    } else if (info.menuItemId === "lulo-design-page") {
        actionPrompt = "Design a sleek social media graphic for this page using its brand colors.";
    }

    if (actionPrompt) {
        // Save intent to storage so Side Panel picks it up
        await chrome.storage.local.set({
            pendingContextAction: actionPrompt
        });

        // Open Side Panel
        // Note: Side Panel opening requires user gesture, context menu click counts!
        chrome.sidePanel.open({ windowId: tab.windowId });
    }
});
