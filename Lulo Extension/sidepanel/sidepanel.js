// Side Panel JavaScript
const chatContainer = document.getElementById('chatContainer');
const taskInput = document.getElementById('taskInput');
const submitBtn = document.getElementById('submitBtn');
const actionChips = document.querySelectorAll('.action-chip');

// Enable/disable submit button
taskInput.addEventListener('input', () => {
    submitBtn.disabled = !taskInput.value.trim();
    adjustTextareaHeight();
});

// Auto-resize textarea
function adjustTextareaHeight() {
    taskInput.style.height = 'auto';
    taskInput.style.height = Math.min(taskInput.scrollHeight, 120) + 'px';
}

// Handle Enter key
taskInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey && taskInput.value.trim()) {
        e.preventDefault();
        sendMessage();
    }
});

// Submit button click
submitBtn.addEventListener('click', sendMessage);

// Quick action chips
actionChips.forEach(chip => {
    chip.addEventListener('click', async () => {
        const action = chip.dataset.action;

        if (action === 'screenshot') {
            addMessage('📸 Taking screenshot...', 'action');
            chrome.runtime.sendMessage({ type: 'SCREENSHOT' }, (response) => {
                if (response.success) {
                    addMessage('Screenshot captured!', 'assistant');
                }
            });
        } else if (action === 'extract') {
            addMessage('📄 Extracting page text...', 'action');
            chrome.runtime.sendMessage({ type: 'EXTRACT_TEXT' }, (response) => {
                if (response.success) {
                    addMessage(`Extracted ${response.text.length} characters from the page.`, 'assistant');
                }
            });
        } else if (action === 'click') {
            addMessage('👆 Click on any element on the page. I\'ll wait...', 'action');
            chrome.runtime.sendMessage({ type: 'ENABLE_CLICK_MODE' });
        }
    });
});

async function sendMessage() {
    const message = taskInput.value.trim();
    if (!message) return;

    // Add user message
    addMessage(message, 'user');
    taskInput.value = '';
    taskInput.style.height = 'auto';
    submitBtn.disabled = true;

    // Show thinking indicator
    const thinkingId = addThinking();

    try {
        // Get current tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        // Send to background service worker
        const response = await chrome.runtime.sendMessage({
            type: 'SEND_MESSAGE',
            message: message,
            tabId: tab.id,
            url: tab.url,
            title: tab.title
        });

        // Remove thinking indicator
        removeThinking(thinkingId);

        if (response.success) {
            addMessage(response.reply, 'assistant');

            // Handle any actions
            if (response.actions) {
                for (const action of response.actions) {
                    addMessage(`🔧 ${action.description}`, 'action');
                }
            }
        } else {
            addMessage('Sorry, something went wrong. ' + (response.error || ''), 'assistant');
        }
    } catch (error) {
        removeThinking(thinkingId);
        addMessage('Error: ' + error.message, 'assistant');
    }
}

function addMessage(content, type) {
    const msg = document.createElement('div');
    msg.className = `message ${type}`;
    msg.textContent = content;

    // Remove welcome message on first user message
    const welcome = chatContainer.querySelector('.welcome-message');
    if (welcome && type === 'user') {
        welcome.remove();
    }

    chatContainer.appendChild(msg);
    chatContainer.scrollTop = chatContainer.scrollHeight;
    return msg;
}

function addThinking() {
    const id = 'thinking-' + Date.now();
    const msg = document.createElement('div');
    msg.className = 'message thinking';
    msg.id = id;
    msg.innerHTML = `
        <div class="thinking-dots">
            <span></span><span></span><span></span>
        </div>
        Thinking...
    `;
    chatContainer.appendChild(msg);
    chatContainer.scrollTop = chatContainer.scrollHeight;
    return id;
}

function removeThinking(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
}

// Listen for messages from background
chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'TASK_UPDATE') {
        addMessage(message.content, 'action');
    } else if (message.type === 'ELEMENT_CLICKED') {
        addMessage(`Clicked: ${message.element}`, 'action');
    }
});

// Load conversation history from popup
chrome.storage.local.get(['conversationHistory'], (data) => {
    if (data.conversationHistory && data.conversationHistory.length > 0) {
        const welcome = chatContainer.querySelector('.welcome-message');
        if (welcome) welcome.remove();

        data.conversationHistory.forEach(msg => {
            addMessage(msg.content, msg.role);
        });

        // Clear storage after loading (fresh start next time)
        chrome.storage.local.remove('conversationHistory');
    }
});
