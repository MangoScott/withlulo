// Popup JavaScript - Immediate chat functionality
const chatContainer = document.getElementById('chatContainer');
const taskInput = document.getElementById('taskInput');
const submitBtn = document.getElementById('submitBtn');
const expandBtn = document.getElementById('expandBtn');
const ideaChips = document.querySelectorAll('.idea-chip');

let conversationHistory = [];

// Enable/disable submit button
taskInput.addEventListener('input', () => {
    submitBtn.disabled = !taskInput.value.trim();
    autoResize();
});

// Auto-resize textarea
function autoResize() {
    taskInput.style.height = 'auto';
    taskInput.style.height = Math.min(taskInput.scrollHeight, 80) + 'px';
}

// Handle Enter key
taskInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey && taskInput.value.trim()) {
        e.preventDefault();
        sendMessage();
    }
});

// Submit button
submitBtn.addEventListener('click', sendMessage);

// Quick idea chips
ideaChips.forEach(chip => {
    chip.addEventListener('click', () => {
        const idea = chip.dataset.idea;
        const starters = {
            'Research': 'Research and find information about ',
            'Automate': 'Help me automate ',
            'Fill forms': 'Fill out the form on this page with '
        };
        taskInput.value = starters[idea] || `Help me with ${idea}: `;
        taskInput.focus();
        submitBtn.disabled = false;
        autoResize();
    });
});

// Send message
async function sendMessage() {
    const message = taskInput.value.trim();
    if (!message) return;

    // Clear welcome message
    const welcome = chatContainer.querySelector('.welcome-msg');
    if (welcome) welcome.remove();

    // Add user message
    addMessage(message, 'user');
    conversationHistory.push({ role: 'user', content: message });

    taskInput.value = '';
    taskInput.style.height = 'auto';
    submitBtn.disabled = true;

    // Show thinking
    const thinkingEl = addThinking();

    try {
        // Get current tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        // Send to background
        const response = await chrome.runtime.sendMessage({
            type: 'SEND_MESSAGE',
            message: message,
            tabId: tab.id,
            url: tab.url,
            title: tab.title
        });

        // Remove thinking
        thinkingEl.remove();

        if (response.success) {
            addMessage(response.reply || 'Done!', 'assistant');
            conversationHistory.push({ role: 'assistant', content: response.reply });

            // Store conversation for side panel
            chrome.storage.local.set({ conversationHistory });
        } else {
            addMessage('Sorry, something went wrong. ' + (response.error || ''), 'assistant');
        }
    } catch (error) {
        thinkingEl.remove();
        addMessage('Error: ' + error.message, 'assistant');
    }
}

function addMessage(content, type) {
    const msg = document.createElement('div');
    msg.className = `message ${type}`;
    msg.textContent = content;
    chatContainer.appendChild(msg);
    chatContainer.scrollTop = chatContainer.scrollHeight;
    return msg;
}

function addThinking() {
    const msg = document.createElement('div');
    msg.className = 'message thinking';
    msg.innerHTML = `
        <div class="thinking-dots">
            <span></span><span></span><span></span>
        </div>
        Thinking...
    `;
    chatContainer.appendChild(msg);
    chatContainer.scrollTop = chatContainer.scrollHeight;
    return msg;
}

// Expand to side panel
expandBtn.addEventListener('click', async () => {
    // Save conversation first
    chrome.storage.local.set({ conversationHistory });

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    chrome.sidePanel.open({ windowId: tab.windowId });
    window.close();
});

// Load any existing conversation
chrome.storage.local.get(['conversationHistory'], (data) => {
    if (data.conversationHistory && data.conversationHistory.length > 0) {
        const welcome = chatContainer.querySelector('.welcome-msg');
        if (welcome) welcome.remove();

        conversationHistory = data.conversationHistory;
        conversationHistory.forEach(msg => {
            addMessage(msg.content, msg.role);
        });
    }
});
