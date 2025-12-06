// Background Service Worker
const API_URL = 'https://lulo-agent.pages.dev/api/agent';
// const API_URL = 'http://localhost:3000/api/agent';
// const API_URL = 'http://localhost:3000/api/agent'; // Use for local dev

// Message handler
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    handleMessage(message, sender).then(sendResponse);
    return true; // Keep channel open for async response
});

async function handleMessage(message, sender) {
    switch (message.type) {
        case 'START_TASK':
            return await startTask(message);
        case 'SEND_MESSAGE':
            return await sendMessage(message);
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

async function sendMessage(data) {
    try {
        // Start the glow effect
        try {
            await chrome.tabs.sendMessage(data.tabId, { type: 'LULO_START' });
        } catch (e) { /* Tab might not have content script */ }

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                prompt: data.message,
                context: {
                    currentUrl: data.url,
                    pageTitle: data.title,
                    isExtension: true
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

        if (apiData.steps && Array.isArray(apiData.steps)) {
            for (const step of apiData.steps) {
                // Add description to reply
                if (step.description) {
                    replyText += step.description + '\n\n';
                }

                // Execute the action
                const actionResult = await executeStep(step, data.tabId);
                if (actionResult) {
                    executedActions.push(actionResult);
                }
            }
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
async function executeStep(step, tabId) {
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
                break;
            }

            case 'GUIDE': {
                if (step.data?.message && tabId) {
                    await chrome.tabs.sendMessage(tabId, {
                        type: 'GUIDE',
                        message: step.data.message,
                        target: step.data.target || null
                    });
                    return {
                        type: 'guide',
                        description: step.data.message
                    };
                }
                break;
            }

            case 'PREVIEW': {
                if (step.data && tabId) {
                    await chrome.tabs.sendMessage(tabId, {
                        type: 'PREVIEW',
                        html: step.data.html || '',
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

async function callAPI(prompt, context = {}) {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                prompt: prompt,
                context: {
                    currentUrl: context.url,
                    pageTitle: context.title,
                    isExtension: true
                }
            })
        });

        if (!response.ok) {
            throw new Error('API request failed');
        }

        const data = await response.json();

        // The API returns { steps: [...] } format
        // Convert steps to a readable response
        if (data.steps && Array.isArray(data.steps)) {
            const descriptions = data.steps
                .map(step => step.description)
                .filter(Boolean)
                .join('\n\n');
            return descriptions || 'Working on your request...';
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
