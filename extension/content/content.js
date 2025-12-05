// Content Script for page interaction
let clickModeEnabled = false;
let highlightOverlay = null;

// Listen for messages from background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.type) {
        case 'ENABLE_CLICK_MODE':
            enableClickMode();
            sendResponse({ success: true });
            break;
        case 'CLICK_ELEMENT':
            clickElement(message.selector);
            sendResponse({ success: true });
            break;
        case 'TYPE_TEXT':
            typeText(message.selector, message.text);
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

function enableClickMode() {
    clickModeEnabled = true;
    document.body.style.cursor = 'crosshair';

    // Create overlay
    highlightOverlay = document.createElement('div');
    highlightOverlay.id = 'lulo-highlight';
    highlightOverlay.style.cssText = `
        position: fixed;
        pointer-events: none;
        border: 2px solid #D97757;
        border-radius: 4px;
        background: rgba(217, 119, 87, 0.1);
        z-index: 999999;
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

function clickElement(selector) {
    try {
        // Try various selector approaches
        let element = null;

        // Try as CSS selector
        try {
            element = document.querySelector(selector);
        } catch (e) { }

        // Try finding by text content
        if (!element) {
            const elements = document.querySelectorAll('button, a, [role="button"], input[type="submit"]');
            element = Array.from(elements).find(el =>
                el.textContent?.toLowerCase().includes(selector.toLowerCase())
            );
        }

        // Try finding by aria-label
        if (!element) {
            element = document.querySelector(`[aria-label*="${selector}" i]`);
        }

        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setTimeout(() => {
                element.click();
                showNotification(`Clicked: ${getElementDescription(element)}`);
            }, 300);
        } else {
            showNotification(`Could not find element: ${selector}`, 'error');
        }
    } catch (error) {
        showNotification(`Error clicking: ${error.message}`, 'error');
    }
}

function typeText(selector, text) {
    try {
        let element = document.querySelector(selector);

        // Try finding input by placeholder or label
        if (!element) {
            element = document.querySelector(`input[placeholder*="${selector}" i], textarea[placeholder*="${selector}" i]`);
        }

        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            element.focus();
            element.value = text;
            element.dispatchEvent(new Event('input', { bubbles: true }));
            element.dispatchEvent(new Event('change', { bubbles: true }));
            showNotification(`Typed: "${text.slice(0, 30)}..."`);
        } else {
            showNotification(`Could not find input: ${selector}`, 'error');
        }
    } catch (error) {
        showNotification(`Error typing: ${error.message}`, 'error');
    }
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
    const placeholder = element.getAttribute('placeholder') || '';

    if (ariaLabel) return `${tag}: "${ariaLabel}"`;
    if (text) return `${tag}: "${text}"`;
    if (placeholder) return `${tag} with placeholder "${placeholder}"`;
    return tag;
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        background: ${type === 'error' ? '#ef4444' : '#D97757'};
        color: white;
        border-radius: 8px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        font-size: 14px;
        z-index: 9999999;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        animation: slideIn 0.3s ease;
    `;
    notification.textContent = message;

    // Add animation keyframes
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
    `;
    document.head.appendChild(style);

    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}
