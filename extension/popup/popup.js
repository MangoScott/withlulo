// Popup JavaScript
const taskInput = document.getElementById('taskInput');
const submitBtn = document.getElementById('submitBtn');
const openPanelBtn = document.getElementById('openPanelBtn');
const statusEl = document.getElementById('status');
const ideaChips = document.querySelectorAll('.idea-chip');

// Enable/disable submit button based on input
taskInput.addEventListener('input', () => {
    submitBtn.disabled = !taskInput.value.trim();
});

// Handle Enter key
taskInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey && taskInput.value.trim()) {
        e.preventDefault();
        submitTask();
    }
});

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
    });
});

// Submit task
submitBtn.addEventListener('click', submitTask);

async function submitTask() {
    const task = taskInput.value.trim();
    if (!task) return;

    showStatus('Starting task...', 'loading');
    submitBtn.disabled = true;

    try {
        // Get current tab info
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        // Send to background service worker
        const response = await chrome.runtime.sendMessage({
            type: 'START_TASK',
            task: task,
            tabId: tab.id,
            url: tab.url
        });

        if (response.success) {
            showStatus('Task started! Check the side panel for updates.', 'success');
            // Open side panel
            chrome.sidePanel.open({ windowId: tab.windowId });
        } else {
            showStatus(response.error || 'Failed to start task', 'error');
        }
    } catch (error) {
        showStatus('Error: ' + error.message, 'error');
    }

    submitBtn.disabled = false;
}

// Open side panel
openPanelBtn.addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    chrome.sidePanel.open({ windowId: tab.windowId });
    window.close();
});

function showStatus(message, type = '') {
    statusEl.textContent = message;
    statusEl.className = `status ${type}`;
    statusEl.classList.remove('hidden');
}
