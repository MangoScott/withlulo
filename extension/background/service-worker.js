// Background Service Worker
const API_URL = 'https://lulo-agent.pages.dev/api/agent';

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
        const response = await callAPI(data.message, {
            url: data.url,
            title: data.title,
            tabId: data.tabId
        });

        // Parse response for any actions
        const actions = parseActions(response);

        // Execute actions if any
        if (actions.length > 0) {
            for (const action of actions) {
                await executeAction(action);
            }
        }

        return {
            success: true,
            reply: response,
            actions: actions
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
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
        return data.response || data.message || 'Task processed successfully.';
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
