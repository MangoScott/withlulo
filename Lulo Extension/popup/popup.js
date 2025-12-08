// Popup JavaScript - Immediate chat functionality
const chatContainer = document.getElementById('chatContainer');
const taskInput = document.getElementById('taskInput');
const submitBtn = document.getElementById('submitBtn');
const expandBtn = document.getElementById('expandBtn');
const ideaChips = document.querySelectorAll('.idea-chip');

let conversationHistory = [];

// Enable/disable submit button
const updateButtonState = () => {
    const hasText = taskInput.value.trim().length > 0;
    const hasImages = attachedImages.length > 0;
    submitBtn.disabled = !(hasText || hasImages);
};

taskInput.addEventListener('input', () => {
    updateButtonState();
    autoResize();
});

// Auto-resize textarea
function autoResize() {
    taskInput.style.height = 'auto';
    taskInput.style.height = Math.min(taskInput.scrollHeight, 80) + 'px';
}

// Handle Enter key
// Handle Enter key
taskInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        const hasText = taskInput.value.trim().length > 0;
        const hasImages = attachedImages.length > 0;

        if (hasText || hasImages) {
            e.preventDefault();
            sendMessage();
        }
    }
});

// Submit button
submitBtn.addEventListener('click', sendMessage);

// Quick idea chips
ideaChips.forEach(chip => {
    chip.addEventListener('click', () => {
        const idea = chip.dataset.idea;
        const starters = {
            'Design': 'Create a social media graphic for ',
            'Build': 'Create a landing page for ',
            'Schedule': 'Schedule a meeting with ',
            'Research': 'Research and find information about ',
            'Guide': 'Guide me through '
        };
        taskInput.value = starters[idea] || `Help me with ${idea}: `;
        taskInput.focus();
        submitBtn.disabled = false;
        autoResize();
    });
});

// Image Handling
let attachedImages = [];
const previewContainer = document.getElementById('imagePreviewContainer');
const dropOverlay = document.getElementById('dropOverlay');

// Global Drag Events (Document)
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    document.body.addEventListener(eventName, preventDefaults, false);
});

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

// Show overlay when dragging into window
let dragCounter = 0;
document.body.addEventListener('dragenter', (e) => {
    dragCounter++;
    dropOverlay.classList.add('active');
});

document.body.addEventListener('dragleave', (e) => {
    dragCounter--;
    if (dragCounter === 0) {
        dropOverlay.classList.remove('active');
    }
});

document.body.addEventListener('drop', (e) => {
    // Reset
    dragCounter = 0;
    dropOverlay.classList.remove('active');

    // Handle
    const dt = e.dataTransfer;
    const files = dt.files;
    handleFiles(files);
});

// Also handle drop specifically on overlay
dropOverlay.addEventListener('drop', (e) => {
    dragCounter = 0;
    dropOverlay.classList.remove('active');
    handleFiles(e.dataTransfer.files);
});

function handleFiles(files) {
    ([...files]).forEach(file => {
        if (!file.type.startsWith('image/')) return;

        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onloadend = () => {
            const base64 = reader.result; // Data URL
            attachedImages.push(base64);
            renderPreviews();
        }
    });
}

function renderPreviews() {
    previewContainer.innerHTML = '';
    attachedImages.forEach((src, idx) => {
        const thumb = document.createElement('div');
        thumb.className = 'preview-thumb';
        thumb.innerHTML = `
            <img src="${src}">
            <button class="remove-thumb">×</button>
        `;
        // Handle remove click manually since inline onclick might be blocked by CSP
        thumb.querySelector('.remove-thumb').addEventListener('click', (e) => {
            e.stopPropagation();
            attachedImages.splice(idx, 1);
            renderPreviews();
        });
        previewContainer.appendChild(thumb);
    });
    updateButtonState(); // Update button when images change
}

const saveState = () => {
    chrome.storage.local.set({ conversationHistory });
};

async function sendMessage() {
    const message = taskInput.value.trim();
    // Allow sending if there are images, even if no text
    if (!message && attachedImages.length === 0) return;

    // Clear welcome message
    const welcome = chatContainer.querySelector('.welcome-msg');
    if (welcome) welcome.remove();

    // Add user message
    addMessage(message, 'user');

    // Show thumbnails in chat history for user
    if (attachedImages.length > 0) {
        addMessage(`[Sent ${attachedImages.length} images]`, 'user');
    }

    conversationHistory.push({ role: 'user', content: message, images: [...attachedImages] }); // Save images to history too?
    saveState(); // Save immediately

    // Capture images and clear for next message
    const currentImages = [...attachedImages];
    attachedImages = [];
    renderPreviews();

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
            images: currentImages, // Send images!
            tabId: tab.id,
            url: tab.url,
            title: tab.title
        });

        // Remove thinking
        thinkingEl.remove();

        if (response.success) {
            addMessage(response.reply || 'Done!', 'assistant');
            conversationHistory.push({ role: 'assistant', content: response.reply });
            saveState(); // Save assistant response
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

// Activity Feed Listener
chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'LULO_STEP_UPDATE') {
        updateActivityLog(message);
    }
});

function updateActivityLog(step) {
    // 1. Find or Create the current Activity Block (usually the last message if it's an activity block)
    let activityBlock = document.querySelector('.activity-block:last-child');

    if (!activityBlock) {
        // Create new block
        activityBlock = document.createElement('div');
        activityBlock.className = 'activity-block';
        chatContainer.appendChild(activityBlock);
    }

    // 2. Map Actions to Icons
    const icons = {
        'THINK': '🧠',
        'BROWSE': '🌍',
        'CLICK': '🖱️',
        'TYPE': '⌨️',
        'EXTRACT': '📄',
        'GENERATE_GRAPHIC': '🎨',
        'PREVIEW': '✨',
        'GUIDE': '🎓'
    };
    const icon = icons[step.action] || '⚡';

    // 3. Create or Update Item
    // We append new items for 'running', and update them for 'completed'
    // But since backend sends distinct events, let's just append simple log lines for now
    const item = document.createElement('div');
    item.className = `activity-item ${step.status}`;
    item.innerHTML = `
        <span class="activity-icon">${icon}</span>
        <span class="activity-text">${step.description || step.action}</span>
        ${step.status === 'running' ? '<span class="activity-spinner">⏳</span>' : '<span class="activity-check">✅</span>'}
    `;

    // Remove spinner from previous if same action?
    // Let's keep it simple: Just append log stream
    activityBlock.appendChild(item);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

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

// ==========================================
// INTELLIGENCE: User Profile (Settings)
// ==========================================
const settingsBtn = document.getElementById('settingsBtn');
const settingsPanel = document.getElementById('settingsPanel');
const closeSettings = document.getElementById('closeSettings');
const saveSettings = document.getElementById('saveSettings');

// Inputs
const userRoleInput = document.getElementById('userRole');
const userBrandInput = document.getElementById('userBrand');
const userInstructionsInput = document.getElementById('userInstructions');

// Open
if (settingsBtn) {
    settingsBtn.addEventListener('click', () => {
        settingsPanel.classList.remove('hidden');
        // Load latest
        chrome.storage.sync.get(['userProfile'], (result) => {
            if (result.userProfile) {
                userRoleInput.value = result.userProfile.role || '';
                userBrandInput.value = result.userProfile.brand || '';
                userInstructionsInput.value = result.userProfile.instructions || '';
            }
        });
    });
}

// Close
if (closeSettings) {
    closeSettings.addEventListener('click', () => {
        settingsPanel.classList.add('hidden');
    });
}

// Save
if (saveSettings) {
    saveSettings.addEventListener('click', () => {
        const profile = {
            role: userRoleInput.value.trim(),
            brand: userBrandInput.value.trim(),
            instructions: userInstructionsInput.value.trim()
        };

        chrome.storage.sync.set({ userProfile: profile }, () => {
            // Visual feedback
            const originalText = saveSettings.textContent;
            saveSettings.textContent = 'Saved!';
            setTimeout(() => {
                saveSettings.textContent = originalText;
                settingsPanel.classList.add('hidden');
            }, 800);
        });
    });
}

// ==========================================
// COMMUNITY: Skills Engine (Recipes)
// ==========================================
const skillsBtn = document.getElementById('skillsBtn');
const skillsPanel = document.getElementById('skillsPanel');
const closeSkills = document.getElementById('closeSkills');
const skillsList = document.getElementById('skillsList');
const addSkillBtn = document.getElementById('addSkillBtn');
const importSkillBtn = document.getElementById('importSkillBtn');
const importSkillInput = document.getElementById('importSkillInput');
const newSkillForm = document.getElementById('newSkillForm');
const saveNewSkill = document.getElementById('saveNewSkill');

// Open Library
if (skillsBtn) {
    skillsBtn.addEventListener('click', () => {
        skillsPanel.classList.remove('hidden');
        loadSkills();
    });
}

// Close Library
if (closeSkills) {
    closeSkills.addEventListener('click', () => {
        skillsPanel.classList.add('hidden');
    });
}

// Toggle New Skill Form
if (addSkillBtn) {
    addSkillBtn.addEventListener('click', () => {
        newSkillForm.classList.toggle('hidden');
    });
}

// Save New Skill
if (saveNewSkill) {
    saveNewSkill.addEventListener('click', () => {
        const name = document.getElementById('newSkillName').value.trim();
        const prompt = document.getElementById('newSkillPrompt').value.trim();

        if (!name || !prompt) return;

        chrome.storage.sync.get(['savedSkills'], (result) => {
            const skills = result.savedSkills || [];
            skills.push({ id: Date.now(), name, prompt });
            chrome.storage.sync.set({ savedSkills: skills }, () => {
                loadSkills();
                newSkillForm.classList.add('hidden');
                document.getElementById('newSkillName').value = '';
                document.getElementById('newSkillPrompt').value = '';
            });
        });
    });
}

// Load & Render Skills
function loadSkills() {
    chrome.storage.sync.get(['savedSkills'], (result) => {
        const skills = result.savedSkills || [];
        skillsList.innerHTML = '';

        if (skills.length === 0) {
            skillsList.innerHTML = '<div class="empty-state">No skills saved yet.</div>';
            return;
        }

        skills.forEach(skill => {
            const div = document.createElement('div');
            div.className = 'skill-item';
            div.innerHTML = `
                <div class="skill-name">${skill.name}</div>
                <div class="skill-actions-mini">
                    <button class="icon-btn play-skill" title="Run">▶️</button>
                    <button class="icon-btn export-skill" title="Export">📤</button>
                    <button class="icon-btn delete-skill" title="Delete">🗑️</button>
                </div>
            `;

            // Run
            div.querySelector('.play-skill').addEventListener('click', (e) => {
                e.stopPropagation();
                taskInput.value = skill.prompt;
                updateButtonState();
                skillsPanel.classList.add('hidden');
            });

            // Export
            div.querySelector('.export-skill').addEventListener('click', (e) => {
                e.stopPropagation();
                const blob = new Blob([JSON.stringify(skill, null, 2)], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${skill.name.toLowerCase().replace(/ /g, '_')}_recipe.json`;
                a.click();
            });

            // Delete
            div.querySelector('.delete-skill').addEventListener('click', (e) => {
                e.stopPropagation();
                if (confirm('Delete this skill?')) {
                    const newSkills = skills.filter(s => s.id !== skill.id);
                    chrome.storage.sync.set({ savedSkills: newSkills }, loadSkills);
                }
            });

            skillsList.appendChild(div);
        });
    });
}

// Import Skill
if (importSkillBtn) {
    importSkillBtn.addEventListener('click', () => importSkillInput.click());

    importSkillInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const skill = JSON.parse(event.target.result);
                if (skill.name && skill.prompt) {
                    skill.id = Date.now(); // Regenerate ID to avoid conflicts

                    chrome.storage.sync.get(['savedSkills'], (result) => {
                        const skills = result.savedSkills || [];
                        skills.push(skill);
                        chrome.storage.sync.set({ savedSkills: skills }, () => {
                            loadSkills();
                            alert(`Imported "${skill.name}"!`);
                        });
                    });
                } else {
                    alert('Invalid recipe file.');
                }
            } catch (err) {
                alert('Error parsing recipe file.');
            }
        };
        reader.readAsText(file);
    });
}
