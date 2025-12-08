// Side Panel JavaScript
const chatContainer = document.getElementById('chatContainer');
const taskInput = document.getElementById('taskInput');
const submitBtn = document.getElementById('submitBtn');
const actionChips = document.querySelectorAll('.action-chip');
let conversationHistory = []; // Add history state

let saveState = () => {
    chrome.storage.local.set({ conversationHistory });
};

// Enable/disable submit button
const updateButtonState = () => {
    const hasText = taskInput.value.trim().length > 0;
    const hasImages = attachedImages.length > 0;
    submitBtn.disabled = !(hasText || hasImages);
};

taskInput.addEventListener('input', () => {
    updateButtonState();
    taskInput.style.height = 'auto';
    taskInput.style.height = Math.min(taskInput.scrollHeight, 120) + 'px';
});

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

// Submit button click
submitBtn.addEventListener('click', sendMessage);

// Quick action chips
actionChips.forEach(chip => {
    chip.addEventListener('click', async () => {
        const action = chip.dataset.action;

        // Special handling for Build - open Sites panel
        if (action === 'Build') {
            const sitesPanel = document.getElementById('sitesPanel');
            if (sitesPanel) {
                sitesPanel.classList.remove('hidden');
                // Trigger site creation
                const createBtn = document.getElementById('createSiteBtn');
                if (createBtn) createBtn.click();
            }
            return;
        }

        const starters = {
            'Design': 'Create a social media graphic for ',
            'Schedule': 'Schedule a meeting with ',
            'Research': 'Research and find information about ',
            'Guide': 'Guide me through '
        };

        if (starters[action]) {
            taskInput.value = starters[action];
            taskInput.focus();
            submitBtn.disabled = false;
        }
    });
});

// Image Handling
let attachedImages = [];
const previewContainer = document.getElementById('imagePreviewContainer');
const dropOverlay = document.getElementById('dropOverlay'); // New overlay

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
            const base64 = reader.result;
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
        thumb.querySelector('.remove-thumb').addEventListener('click', (e) => {
            e.stopPropagation();
            attachedImages.splice(idx, 1);
            renderPreviews();
        });
        previewContainer.appendChild(thumb);
    });
    updateButtonState(); // Update button when images change
}
// ... (rest of logic)

async function sendMessage() {
    const message = taskInput.value.trim();
    // Allow sending if there are images
    if (!message && attachedImages.length === 0) return;

    // Add user message
    addMessage(message, 'user');

    // Show thumbnails in chat
    if (attachedImages.length > 0) {
        addMessage(`[Sent ${attachedImages.length} images]`, 'user');
    }

    conversationHistory.push({ role: 'user', content: message, images: [...attachedImages] });
    saveState();

    // SYNC TO CLOUD (User)
    syncMessageToCloud(message, 'user');

    // Capture and clear
    const currentImages = [...attachedImages];
    attachedImages = [];
    renderPreviews();

    taskInput.value = '';
    taskInput.style.height = 'auto';
    submitBtn.disabled = true;

    // Reset streaming placeholder
    aiMessageDiv = null;

    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        // The response will be streamed via 'stream-chunk' messages
        // The await here will resolve when the stream closes or when the initial fetch is done?
        // Actually, send_message (via runtime) waits for sendResponse? 
        // Background script returns `return true` (async) or the final data.
        // But since we stream, the FINAL return might be just metadata or completion.

        const response = await chrome.runtime.sendMessage({
            type: 'SEND_MESSAGE',
            message: message,
            images: currentImages, // Send images
            tabId: tab.id,
            url: tab.url,
            title: tab.title
        });

        removeThinking(thinkingId);

        if (response && response.error) {
            addMessage('Sorry, something went wrong. ' + response.error, 'assistant');
        }

        // If success, the content was already streamed to 'aiMessageDiv'.
        // We just need to ensure history state is updated IF we want local history sync.
        // Actually, we might want to grab the final text from the div or wait for a 'done' event to update history.
        // But for now, let's trust the UI updates.

        // Update local history for persistence across reloads
        // We can grab the final content from the DOM or wait for a specialized message.
        // Let's rely on the 'stream-chunk' {done: true} to update the history array?

    } catch (error) {
        removeThinking(thinkingId);
        addMessage('Error: ' + error.message, 'assistant');
    }
}

// Cloud Sync Helper
async function syncMessageToCloud(content, role) {
    if (!content) return;

    // Get Token
    const { luloCloudToken } = await chrome.storage.sync.get(['luloCloudToken']);
    if (!luloCloudToken) return;

    // Get current project
    const activeProject = allProjects.find(p => p.id === activeProjectId);
    if (!activeProject) return;

    try {
        let conversationId = activeProject.cloud_conversation_id;

        // Create Conversation if needed (Lazy Create)
        if (!conversationId) {
            console.log('Creating new cloud conversation...');
            const res = await fetch('http://localhost:3000/api/conversations', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${luloCloudToken}`
                },
                body: JSON.stringify({
                    title: activeProject.name || 'New Conversation',
                    messages: []
                })
            });

            if (res.ok) {
                const data = await res.json();
                conversationId = data.conversation.id;

                // Save Cloud ID to Local Project
                activeProject.cloud_conversation_id = conversationId;
                await saveProjects();
            }
        }

        if (conversationId) {
            // Append Message
            await fetch(`http://localhost:3000/api/conversations/${conversationId}/messages`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${luloCloudToken}`
                },
                body: JSON.stringify({
                    role: role,
                    content: content
                })
            });
        }
    } catch (e) {
        console.error('Cloud sync failed', e);
    }
}
// ...
// Load conversation history from popup
chrome.storage.local.get(['conversationHistory'], (data) => {
    if (data.conversationHistory && data.conversationHistory.length > 0) {
        const welcome = chatContainer.querySelector('.welcome-message');
        if (welcome) welcome.remove();

        conversationHistory = data.conversationHistory;
        conversationHistory.forEach(msg => {
            addMessage(msg.content, msg.role);
        });

        // Do NOT clear storage (Persistent Mode)
    }

    // CHECK FOR PENDING CONTEXT ACTIONS (Right-Click)
    chrome.storage.local.get(['pendingContextAction'], (data) => {
        if (data.pendingContextAction) {
            // Auto-execute
            taskInput.value = data.pendingContextAction;
            updateButtonState();

            // Clear it so it doesn't run again on reload
            chrome.storage.local.remove('pendingContextAction');

            // Optional: Auto-submit after small delay
            setTimeout(() => sendBtn.click(), 500);
        }
    });
});

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

const conversationContainer = document.querySelector('.conversation-container');

// ... inside sendMessage or wherever the request starts
// We assume the initial user message is already added.

// Create a placeholder for the AI response
let aiMessageDiv = null;

function handleStreamChunk(fullText, done) {
    if (!aiMessageDiv) {
        aiMessageDiv = document.createElement('div');
        aiMessageDiv.className = 'message ai-message streaming';
        conversationContainer.appendChild(aiMessageDiv);
    }

    // Partial Parsing Logic
    // We look for logic inside the "THINK" blocks or the final steps
    // Simple regex strategy for speed

    let displayHtml = '';

    // 1. Extract Thinking
    const thinkMatch = fullText.match(/"action":\s*"THINK",\s*"description":\s*"([^"]*)/g);
    if (thinkMatch) {
        const lastThink = thinkMatch[thinkMatch.length - 1];
        const thinkText = lastThink.match(/"description":\s*"([^"]*)/)[1];
        displayHtml += `<div class="thinking-block">🤔 ${thinkText}...</div>`;
    }

    // 2. Extract Steps (Simple Check)
    // If we see actions, we can infer checks.
    // For now, let's just show the raw accumulated text if it's not JSON, 
    // OR show a "Processing..." state if it IS JSON but not complete.

    // Better UX: Show the Raw Text if it looks like a direct answer, OR specific UI for actions.
    // Since the prompt enforces JSON, we are mostly seeing raw JSON stream.
    // We want to hide the JSON and show the "Thinking" or "Description".

    // If done, we parse properly.
    if (done) {
        aiMessageDiv.classList.remove('streaming');
        try {
            const data = JSON.parse(fullText);
            aiMessageDiv.innerHTML = formatSteps(data.steps);
        } catch (e) {
            aiMessageDiv.textContent = fullText; // Fallback
        }
    } else {
        // While streaming, just show the Thinking block + maybe raw length indicator
        aiMessageDiv.innerHTML = displayHtml || `<div class="thinking-block">⚡ Thinking...</div>`;

        // Auto-scroll
        conversationContainer.scrollTop = conversationContainer.scrollHeight;
    }
}

function formatSteps(steps) {
    if (!steps) return '';
    return steps.map(step => {
        if (step.action === 'THINK') return `<div class="thinking-block">🤔 ${step.description}</div>`;
        if (step.action === 'PREVIEW') return `<div class="preview-block">✨ ${step.description}</div>`;
        return `<div class="step-block">✅ ${step.description || step.action}</div>`;
    }).join('');
}

// Listen for messages from background
chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'TASK_UPDATE') {
        addMessage(message.content, 'action');
    } else if (message.type === 'stream-chunk') {
        handleStreamChunk(message.content, message.done);
    } else if (message.type === 'ELEMENT_CLICKED') {
        addMessage(`Clicked: ${message.element}`, 'action');
    } else if (message.type === 'LULO_STEP_UPDATE') {
        updateActivityLog(message);
    }
});

function updateActivityLog(step) {
    let activityBlock = document.querySelector('.activity-block:last-child');
    if (!activityBlock) {
        activityBlock = document.createElement('div');
        activityBlock.className = 'activity-block';
        chatContainer.appendChild(activityBlock);
    }

    const icons = {
        'THINK': '🧠', 'BROWSE': '🌍', 'CLICK': '🖱️', 'TYPE': '⌨️',
        'EXTRACT': '📄', 'GENERATE_GRAPHIC': '🎨', 'PREVIEW': '✨', 'GUIDE': '🎓'
    };
    const icon = icons[step.action] || '⚡';

    const item = document.createElement('div');
    activityBlock.appendChild(item);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

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
        chrome.storage.sync.get(['userProfile', 'luloCloudToken'], (result) => {
            if (result.userProfile) {
                userRoleInput.value = result.userProfile.role || '';
                userBrandInput.value = result.userProfile.brand || '';
                userInstructionsInput.value = result.userProfile.instructions || '';
            }
            updateCloudStatus(result.luloCloudToken);
        });
    });
}

// Cloud Connection
const connectCloudBtn = document.getElementById('connectCloudBtn');
const manualTokenInput = document.getElementById('manualTokenInput');
const cloudTokenField = document.getElementById('cloudToken');
const saveCloudTokenBtn = document.getElementById('saveCloudToken');
const cloudConnectionStatus = document.getElementById('cloudConnectionStatus');

if (connectCloudBtn) {
    connectCloudBtn.addEventListener('click', () => {
        // Toggle manual input
        manualTokenInput.classList.toggle('hidden');
        if (!manualTokenInput.classList.contains('hidden')) {
            cloudTokenField.focus();
        }
    });
}

if (saveCloudTokenBtn) {
    saveCloudTokenBtn.addEventListener('click', () => {
        const token = cloudTokenField.value.trim();
        if (token) {
            chrome.storage.sync.set({ luloCloudToken: token }, () => {
                updateCloudStatus(token);
                manualTokenInput.classList.add('hidden');
                cloudTokenField.value = '';
            });
        }
    });
}

function updateCloudStatus(token) {
    const statusText = cloudConnectionStatus.querySelector('.status-text');

    if (token) {
        cloudConnectionStatus.classList.remove('disconnected');
        cloudConnectionStatus.classList.add('connected');
        statusText.textContent = 'Connected';
        connectCloudBtn.textContent = 'Update Token';
    } else {
        cloudConnectionStatus.classList.remove('connected');
        cloudConnectionStatus.classList.add('disconnected');
        statusText.textContent = 'Not Connected';
        connectCloudBtn.textContent = 'Connect Account';
    }
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
// WORKSPACES: Project Management
// ==========================================
// State
let allProjects = [];
let activeProjectId = null;

// UI Elements
const projectsBtn = document.getElementById('projectsBtn');
const projectsPanel = document.getElementById('projectsPanel');
const closeProjects = document.getElementById('closeProjects');
const projectsList = document.getElementById('projectsList');
const currentProjectName = document.getElementById('currentProjectName');
const newProjectBtn = document.getElementById('newProjectBtn');

// Initialize
async function initProjects() {
    const data = await chrome.storage.local.get(['projects', 'activeProjectId', 'conversationHistory']);

    // Migration: If no projects but old history exists
    if (!data.projects || data.projects.length === 0) {
        const generalId = 'proj_' + Date.now();
        const generalProject = {
            id: generalId,
            name: 'General',
            history: data.conversationHistory || []
        };

        allProjects = [generalProject];
        activeProjectId = generalId;

        await saveProjects();
    } else {
        allProjects = data.projects;
        activeProjectId = data.activeProjectId || allProjects[0].id;
    }

    renderCurrentProject();
}

async function saveProjects() {
    // Save current active history back into the project object
    const activeIndex = allProjects.findIndex(p => p.id === activeProjectId);
    if (activeIndex !== -1) {
        allProjects[activeIndex].history = conversationHistory;
    }

    await chrome.storage.local.set({
        projects: allProjects,
        activeProjectId: activeProjectId
    });
}

saveState = () => {
    // Override default saveState to save to Project System
    saveProjects();
};

function renderCurrentProject() {
    const active = allProjects.find(p => p.id === activeProjectId);
    if (active) {
        currentProjectName.textContent = active.name;
        conversationHistory = active.history || [];

        // Re-render chat
        chatContainer.innerHTML = ''; // Clear current
        // Add welcome if empty? or not?

        conversationHistory.forEach(msg => {
            if (msg.role === 'user' || msg.role === 'assistant') {
                addMessage(msg.content, msg.role);
            }
        });
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }
}

// UI Handlers
if (projectsBtn) {
    projectsBtn.addEventListener('click', () => {
        projectsPanel.classList.remove('hidden');
        renderProjectList();
    });
}

if (closeProjects) {
    closeProjects.addEventListener('click', () => projectsPanel.classList.add('hidden'));
}

if (newProjectBtn) {
    newProjectBtn.addEventListener('click', () => {
        const name = prompt('New Project Name:');
        if (name) {
            const newProj = { id: 'proj_' + Date.now(), name: name, history: [] };
            allProjects.push(newProj);
            switchProject(newProj.id);
        }
    });
}

function switchProject(id) {
    // Save current before switching
    saveProjects().then(() => {
        activeProjectId = id;
        saveProjects().then(() => { // Save new active ID
            renderCurrentProject();
            projectsPanel.classList.add('hidden');
        });
    });
}

function renderProjectList() {
    projectsList.innerHTML = '';
    allProjects.forEach(p => {
        const div = document.createElement('div');
        div.className = `project-item ${p.id === activeProjectId ? 'active' : ''}`;
        div.innerHTML = `
            <div>
                <div class="project-name">${p.name}</div>
                <div class="project-meta">${p.history.length} messages</div>
            </div>
            ${p.id !== allProjects[0].id ? '<button class="icon-btn delete-proj">🗑️</button>' : ''}
        `;

        div.addEventListener('click', () => switchProject(p.id));

        const delBtn = div.querySelector('.delete-proj');
        if (delBtn) {
            delBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (confirm(`Delete project "${p.name}"?`)) {
                    allProjects = allProjects.filter(prj => prj.id !== p.id);
                    if (activeProjectId === p.id) {
                        activeProjectId = allProjects[0].id;
                    }
                    saveProjects().then(() => {
                        renderProjectList();
                        renderCurrentProject();
                    });
                }
            });
        }

        projectsList.appendChild(div);
    });
}
// ==========================================
// PRESENTATION: Lulo Loom (Screen Recorder)
// ==========================================
const recordBtn = document.getElementById('recordBtn');
let isRecording = false;

// LOGO CLICK -> Open Dashboard
const logo = document.querySelector('.logo');
if (logo) {
    logo.addEventListener('click', () => {
        chrome.tabs.create({ url: WEB_URL + '/dashboard' });
    });
}


if (recordBtn) {
    recordBtn.addEventListener('click', async () => {
        isRecording = !isRecording;

        // Toggle UI
        if (isRecording) {
            recordBtn.classList.add('recording');
            recordBtn.textContent = '⏹'; // Stop icon
        } else {
            recordBtn.classList.remove('recording');
            recordBtn.textContent = '🎥'; // Camera icon
        }

        // Send to Content Script
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        chrome.tabs.sendMessage(tab.id, {
            type: 'TOGGLE_RECORDING',
            shouldRecord: isRecording
        });
    });
}

// ==========================================
// SCREENSHOT FEATURE
// ==========================================
const screenshotBtn = document.getElementById('screenshotBtn');

if (screenshotBtn) {
    screenshotBtn.addEventListener('click', async () => {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        chrome.tabs.sendMessage(tab.id, {
            type: 'TOGGLE_SCREENSHOT_MODE'
        });
        window.close(); // Close sidepanel to get it out of the way? Or keep open? 
        // Better to close or at least minimal interference. 
        // Actually, user might want to screenshot the sidepanel? No, usually main content.
        // Let's NOT close it for now, user might want to retry.
    });
}

// Start
initProjects();

// ==========================================
// SITES: Website Builder
// ==========================================
const sitesBtn = document.getElementById('sitesBtn');
const sitesPanel = document.getElementById('sitesPanel');
const closeSites = document.getElementById('closeSites');
const sitesList = document.getElementById('sitesList');
const createSiteBtn = document.getElementById('createSiteBtn');
const siteWizard = document.getElementById('siteWizard');

// Wizard Elements
const wizardStep1 = document.getElementById('wizardStep1');
const wizardStep2 = document.getElementById('wizardStep2');
const wizardStep3 = document.getElementById('wizardStep3');
const wizardStep4 = document.getElementById('wizardStep4');
const wizardBack = document.getElementById('wizardBack');
const wizardGenerate = document.getElementById('wizardGenerate');
const wizardEdit = document.getElementById('wizardEdit');
const wizardPublish = document.getElementById('wizardPublish');
const siteTitleInput = document.getElementById('siteTitle');
const siteDescriptionInput = document.getElementById('siteDescription');
const sitePreviewFrame = document.getElementById('sitePreviewFrame');
const generatingStatus = document.getElementById('generatingStatus');
const typeButtons = document.querySelectorAll('.type-btn');

// State
let userSites = [];
let selectedBusinessType = '';
let currentGeneratedSite = null;

// Open Sites Panel
if (sitesBtn) {
    sitesBtn.addEventListener('click', async () => {
        sitesPanel.classList.remove('hidden');
        await loadUserSites();
    });
}

// Close Sites Panel
if (closeSites) {
    closeSites.addEventListener('click', () => {
        sitesPanel.classList.add('hidden');
        resetWizard();
    });
}

// Load User Sites
async function loadUserSites() {
    const { luloCloudToken } = await chrome.storage.sync.get(['luloCloudToken']);
    if (!luloCloudToken) {
        sitesList.innerHTML = `
            <div class="sites-empty">
                <span>🔒</span>
                <p>Sign in to manage sites</p>
            </div>
        `;
        return;
    }

    try {
        const response = await fetch(`${WEB_URL}/api/sites`, {
            headers: { 'Authorization': `Bearer ${luloCloudToken}` }
        });

        if (response.ok) {
            const data = await response.json();
            userSites = data.sites || [];
            renderSitesList();
        }
    } catch (error) {
        console.error('Failed to load sites:', error);
    }
}

// Render Sites List
function renderSitesList() {
    if (userSites.length === 0) {
        sitesList.innerHTML = `
            <div class="sites-empty">
                <span>🎨</span>
                <p>No sites yet</p>
            </div>
        `;
        return;
    }

    sitesList.innerHTML = userSites.map(site => `
        <div class="site-item" data-id="${site.id}">
            <div class="site-info">
                <div class="site-name">${site.title}</div>
                <div class="site-meta">${site.business_type?.replace('-', ' ') || 'Website'}</div>
            </div>
            <div class="site-status ${site.published ? 'published' : 'draft'}">
                ${site.published ? '🟢' : '📝'}
            </div>
        </div>
    `).join('');

    // Add click handlers
    document.querySelectorAll('.site-item').forEach(item => {
        item.addEventListener('click', () => {
            const siteId = item.dataset.id;
            // Open in dashboard
            chrome.tabs.create({ url: `${WEB_URL}/dashboard/sites/${siteId}` });
        });
    });
}

// Create Site Button
if (createSiteBtn) {
    createSiteBtn.addEventListener('click', () => {
        document.querySelector('.sites-content').classList.add('hidden');
        siteWizard.classList.remove('hidden');
        showWizardStep(1);
    });
}

// Type Selection
typeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        typeButtons.forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        selectedBusinessType = btn.dataset.type;

        // Move to step 2 after short delay
        setTimeout(() => showWizardStep(2), 200);
    });
});

// Wizard Navigation
if (wizardBack) {
    wizardBack.addEventListener('click', () => showWizardStep(1));
}

if (wizardGenerate) {
    wizardGenerate.addEventListener('click', async () => {
        const title = siteTitleInput.value.trim();
        const description = siteDescriptionInput.value.trim();

        if (!title || !description) {
            siteTitleInput.style.borderColor = !title ? '#ef4444' : '';
            siteDescriptionInput.style.borderColor = !description ? '#ef4444' : '';
            return;
        }

        showWizardStep(3);
        await generateSite(title, description);
    });
}

if (wizardEdit) {
    wizardEdit.addEventListener('click', () => {
        if (currentGeneratedSite) {
            chrome.tabs.create({ url: `${WEB_URL}/dashboard/sites/${currentGeneratedSite.id}` });
        }
    });
}

if (wizardPublish) {
    wizardPublish.addEventListener('click', async () => {
        if (!currentGeneratedSite) return;

        const { luloCloudToken } = await chrome.storage.sync.get(['luloCloudToken']);
        if (!luloCloudToken) return;

        try {
            await fetch(`${WEB_URL}/api/sites/${currentGeneratedSite.id}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${luloCloudToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ published: true })
            });

            // Open the published site
            chrome.tabs.create({ url: `${WEB_URL}/s/${currentGeneratedSite.slug}` });

            // Reset and close
            resetWizard();
            sitesPanel.classList.add('hidden');
        } catch (error) {
            console.error('Failed to publish:', error);
        }
    });
}

// Show Wizard Step
function showWizardStep(step) {
    [wizardStep1, wizardStep2, wizardStep3, wizardStep4].forEach((el, i) => {
        if (el) el.classList.toggle('hidden', i + 1 !== step);
    });
}

// Generate Site
async function generateSite(title, description) {
    const { luloCloudToken } = await chrome.storage.sync.get(['luloCloudToken']);
    if (!luloCloudToken) {
        generatingStatus.textContent = 'Please sign in first';
        return;
    }

    generatingStatus.textContent = 'Analyzing your description...';

    try {
        const response = await fetch(`${WEB_URL}/api/sites`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${luloCloudToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                title,
                description,
                businessType: selectedBusinessType
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Generation failed');
        }

        generatingStatus.textContent = 'Creating beautiful design...';
        const data = await response.json();
        currentGeneratedSite = data.site;

        // Show preview
        if (sitePreviewFrame && currentGeneratedSite.html_content) {
            sitePreviewFrame.srcdoc = currentGeneratedSite.html_content;
        }

        showWizardStep(4);
    } catch (error) {
        console.error('Site generation failed:', error);
        generatingStatus.textContent = 'Error: ' + error.message;
    }
}

// Reset Wizard
function resetWizard() {
    document.querySelector('.sites-content')?.classList.remove('hidden');
    siteWizard?.classList.add('hidden');
    showWizardStep(1);
    selectedBusinessType = '';
    currentGeneratedSite = null;
    if (siteTitleInput) siteTitleInput.value = '';
    if (siteDescriptionInput) siteDescriptionInput.value = '';
    typeButtons.forEach(b => b.classList.remove('selected'));
}


// CONFIGURATION
// CONFIGURATION
// const WEB_URL = 'http://localhost:3000'; // Dev - uncomment for local development
const WEB_URL = 'https://heylulo.com'; // Prod

// ==========================================
// LOGIN OVERLAY
// ==========================================
const loginOverlay = document.getElementById('loginOverlay');
const showManualInput = document.getElementById('showManualInput');
const inlineManualInput = document.getElementById('inlineManualInput');
const loginKeyInput = document.getElementById('loginKeyInput');
const loginKeySubmit = document.getElementById('loginKeySubmit');
const googleSignInBtn = document.getElementById('googleSignInBtn');

// Auth Check on Init
chrome.storage.sync.get(['luloCloudToken'], (result) => {
    if (!result.luloCloudToken && loginOverlay) {
        loginOverlay.classList.remove('hidden');
    } else if (loginOverlay) {
        loginOverlay.classList.add('hidden');
    }
});

// Auto-Login Listener (Seamless Auth)
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'sync' && changes.luloCloudToken) {
        const newToken = changes.luloCloudToken.newValue;
        if (newToken) {
            // Token received!
            if (loginOverlay) loginOverlay.classList.add('hidden');
            updateCloudStatus(newToken);
            initProjects();

            // Welcome Animation
            const welcome = document.querySelector('.welcome-message');
            if (welcome) {
                welcome.style.animation = 'none';
                welcome.offsetHeight;
                welcome.style.animation = 'welcomeIn 0.5s ease';
            }
        }
    }
});

// Handlers
if (googleSignInBtn) {
    googleSignInBtn.addEventListener('click', () => {
        const extId = chrome.runtime.id;
        // Open with Extension ID for seamless handshake
        window.open(`${WEB_URL}/connect?ext_id=${extId}`, '_blank');

        // Show the manual input so they can paste the key immediately when they return (Fallback)
        if (inlineManualInput) inlineManualInput.classList.remove('hidden');
        if (showManualInput) showManualInput.classList.add('hidden');
    });
}

if (showManualInput) {
    showManualInput.addEventListener('click', () => {
        inlineManualInput.classList.remove('hidden');
        showManualInput.classList.add('hidden');
    });
}

if (loginKeySubmit) {
    loginKeySubmit.addEventListener('click', () => {
        const key = loginKeyInput.value.trim();
        // Accept lulo_ prefixed keys OR JWT tokens (longer than 50 chars)
        if (key.startsWith('lulo_') || key.length > 50) {
            chrome.storage.sync.set({ luloCloudToken: key }, () => {
                loginOverlay.classList.add('hidden');
                updateCloudStatus(key);
                initProjects();
            });
        } else {
            loginKeyInput.style.borderColor = '#ef4444';
            setTimeout(() => loginKeyInput.style.borderColor = '#E8E4DE', 500);
        }
    });
}
