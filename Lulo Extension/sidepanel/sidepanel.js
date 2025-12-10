// Side Panel JavaScript
document.addEventListener('DOMContentLoaded', () => {

    const WEB_URL = 'https://lulo-agent.pages.dev';
    const AUTH_URL = `${WEB_URL}/connect`;

    // DOM Elements
    const chatContainer = document.getElementById('chatContainer');
    const taskInput = document.getElementById('taskInput');
    const submitBtn = document.getElementById('submitBtn');
    const actionChips = document.querySelectorAll('.action-chip');
    const previewContainer = document.getElementById('imagePreviewContainer');
    const dropOverlay = document.getElementById('dropOverlay');

    // Auth Elements
    const loginOverlay = document.getElementById('loginOverlay');
    const googleSignInBtn = document.getElementById('googleSignInBtn');
    const showManualInput = document.getElementById('showManualInput');
    const inlineManualInput = document.getElementById('inlineManualInput');
    const loginKeyInput = document.getElementById('loginKeyInput');
    const loginKeySubmit = document.getElementById('loginKeySubmit');

    // Settings Elements
    const settingsBtn = document.getElementById('settingsBtn');
    const settingsPanel = document.getElementById('settingsPanel');
    const closeSettings = document.getElementById('closeSettings');
    const saveSettings = document.getElementById('saveSettings');
    const userRoleInput = document.getElementById('userRole');
    const userBrandInput = document.getElementById('userBrand');
    const userInstructionsInput = document.getElementById('userInstructions');

    // Cloud Elements
    const connectCloudBtn = document.getElementById('connectCloudBtn');
    const manualTokenInput = document.getElementById('manualTokenInput');
    const cloudTokenField = document.getElementById('cloudToken');
    const saveCloudTokenBtn = document.getElementById('saveCloudToken');
    const cloudConnectionStatus = document.getElementById('cloudConnectionStatus');

    // Project Elements
    const projectsBtn = document.getElementById('projectsBtn');
    const projectsPanel = document.getElementById('projectsPanel');
    const closeProjects = document.getElementById('closeProjects');
    const projectsList = document.getElementById('projectsList');
    const currentProjectName = document.getElementById('currentProjectName');
    const newProjectBtn = document.getElementById('newProjectBtn');

    // Recording Elements
    const captureBtn = document.getElementById('captureBtn');
    const captureOverlay = document.getElementById('captureOverlay');
    const closeCapture = document.getElementById('closeCapture');
    const recordOptionBtn = document.getElementById('recordOptionBtn');
    const screenshotOptionBtn = document.getElementById('screenshotOptionBtn');

    // Sites Elements
    const sitesBtn = document.getElementById('sitesBtn');
    const sitesPanel = document.getElementById('sitesPanel');
    const closeSites = document.getElementById('closeSites');
    const sitesList = document.getElementById('sitesList');
    const createSiteBtn = document.getElementById('createSiteBtn');
    const siteWizard = document.getElementById('siteWizard');
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
    const typeButtons = document.querySelectorAll('.template-card');

    const THEME_COLORS = [
        '#3B82F6', // Blue
        '#8B5CF6', // Purple
        '#10B981', // Green
        '#F59E0B', // Orange
        '#EF4444', // Red
        '#1F2937'  // Dark
    ];

    let conversationHistory = [];
    let allProjects = [];
    let activeProjectId = null;
    let attachedImages = [];
    let isRecording = false;
    let dragCounter = 0;
    let userSites = [];
    let selectedBusinessType = '';
    let selectedThemeColor = THEME_COLORS[0];
    let currentGeneratedSite = null;

    let saveState = () => {
        chrome.storage.local.set({ conversationHistory });
    };

    // ... (keeping existing event listeners generic)

    // FORM RENDERER
    function renderForm(type) {
        const container = document.getElementById('dynamicFormContainer');
        if (!container) {
            console.error('Dynamic Form Container not found!');
            return;
        }

        console.log('Rendering form. Type:', type);

        // Fallback
        if (!type) {
            console.warn('No type provided to renderForm, defaulting to personal');
            type = 'personal';
        }

        let subdomainHtml = `
        <div style="margin-bottom:16px;">
            <label style="font-size:0.8rem; font-weight:600; display:block; margin-bottom:4px; color:var(--text-secondary);">Claim your URL</label>
            <div style="display:flex; align-items:stretch;">
                <input type="text" class="dynamic-input" name="subdomain" placeholder="username" style="border-radius:6px 0 0 6px; border-right:none; flex:1;" required pattern="[a-z0-9\\-]{3,}">
                <div style="background:var(--bg-secondary); padding:10px 12px; border:2px solid var(--border-subtle); border-left:none; border-radius:0 6px 6px 0; font-size:0.85rem; color:var(--text-secondary); display:flex; align-items:center; box-sizing:border-box;">.heylulo.com</div>
            </div>
            <p style="font-size:0.75rem; color:var(--text-muted); margin-top:4px;">Lowercase letters, numbers, dashes</p>
        </div>
        `;

        let formHtml = '';

        if (type === 'personal') {
            formHtml = `
            <input type="text" class="dynamic-input" name="name" placeholder="Your Name" required>
            <textarea class="dynamic-input" name="about" placeholder="About Me (Short bio)" rows="2" required></textarea>
            <input type="text" class="dynamic-input" name="social1" placeholder="Twitter/X Link (Optional)">
            <input type="text" class="dynamic-input" name="social2" placeholder="GitHub/LinkedIn Link (Optional)">
            <label style="display:flex; align-items:center; gap:8px; font-size:0.85rem; color:var(--text-secondary); margin-top:8px;">
                <input type="checkbox" name="onepage" checked> Single Page Layout
            </label>
        `;
        } else if (type === 'bio-card') {
            formHtml = `
            <input type="text" class="dynamic-input" name="handle" placeholder="@handle (or Name)" required>
            <textarea class="dynamic-input" name="bio" placeholder="Tagline / Short Bio" rows="2"></textarea>
            <p style="font-size:0.8rem; color:var(--text-muted); margin-top:8px; margin-bottom:4px">Links (Title | URL)</p>
            <textarea class="dynamic-input" name="links" placeholder="Portfolio | mywebsite.com&#10;Twitter | twitter.com/me" rows="4"></textarea>
        `;
        } else {
            // Business
            formHtml = `
            <input type="text" class="dynamic-input" name="businessName" placeholder="Business Name" required>
            <input type="text" class="dynamic-input" name="tagline" placeholder="Tagline (e.g. 'Best Coffee in Town')" required>
            <textarea class="dynamic-input" name="services" placeholder="List your key services..." rows="3"></textarea>
            <input type="email" class="dynamic-input" name="email" placeholder="Contact Email">
        `;
        }

        // Combine parts
        let html = subdomainHtml + formHtml;


        // Add Theme Selector
        html += `
        <div style="margin-top:16px; margin-bottom:16px;">
            <label class="theme-label">Accent Color</label>
            <div class="theme-selector">
                ${THEME_COLORS.map(color => `
                    <div class="color-circle ${color === selectedThemeColor ? 'selected' : ''}" 
                         style="background-color: ${color};" 
                         data-color="${color}"></div>
                `).join('')}
            </div>
        </div>
        `;

        // Add File Upload to all forms
        html += `
        <div style="margin-top:12px; border-top:1px solid var(--border-subtle); padding-top:12px;">
            <label style="font-size:0.8rem; font-weight:600; display:block; margin-bottom:4px;">Upload Resume/Content (Optional)</label>
            <input type="file" id="siteFile" class="dynamic-input" accept=".pdf,application/pdf,text/*,.doc,.docx">
        </div>
    `;

        container.innerHTML = html;

        // Add Event Listeners for Color Circles
        const circles = container.querySelectorAll('.color-circle');
        circles.forEach(circle => {
            circle.addEventListener('click', () => {
                // Update State
                selectedThemeColor = circle.dataset.color;

                // Update UI
                circles.forEach(c => c.classList.remove('selected'));
                circle.classList.add('selected');
            });
        });

        // Ensure visible - HARD FORCE
        container.style.display = 'block';
        container.style.visibility = 'visible';
        container.style.opacity = '1';
        container.classList.remove('hidden');
    }

    // SPINNER ROTATION
    let spinnerInterval;
    function startSpinnerRotation() {
        const phrases = [
            "Reading content...",
            "Analyzing file...",
            "Drafting structure...",
            "Polishing pixels...",
            "Applying theme...",
            "Almost ready..."
        ];
        let i = 0;
        // Reset
        const statusEl = document.getElementById('generatingStatus');
        if (statusEl) statusEl.textContent = "Checking inputs...";

        if (spinnerInterval) clearInterval(spinnerInterval);

        spinnerInterval = setInterval(() => {
            if (!statusEl) return;
            statusEl.textContent = phrases[i % phrases.length];
            i++;
        }, 3000);
    }

    // UPDATE WIZARD GENERATE LISTENER
    if (wizardGenerate) {
        wizardGenerate.addEventListener('click', async () => {
            // Collect Data
            const inputs = document.querySelectorAll('.dynamic-input:not([type="file"])');
            let isValid = true;
            const data = {};

            inputs.forEach(input => {
                if (input.hasAttribute('required') && !input.value.trim()) {
                    input.style.borderColor = '#ef4444';
                    isValid = false;
                } else {
                    input.style.borderColor = '';
                }
                data[input.name] = input.value.trim();
            });

            if (!isValid) return;

            // Handle File Upload
            const fileInput = document.getElementById('siteFile');
            let fileData = null;
            let mimeType = null;

            if (fileInput && fileInput.files.length > 0) {
                const file = fileInput.files[0];
                try {
                    // Read file as Base64
                    const base64 = await new Promise((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = () => resolve(reader.result);
                        reader.onerror = reject;
                        reader.readAsDataURL(file);
                    });

                    // Extract base64 part (remove "data:application/pdf;base64," prefix)
                    // format: "data:<mime>;base64,<data>"
                    const matches = base64.match(/^data:(.*);base64,(.*)$/);
                    if (matches && matches.length === 3) {
                        mimeType = matches[1];
                        fileData = matches[2];
                    }
                } catch (e) {
                    console.error("File read error", e);
                    alert("Failed to read file. Proceeding with text only.");
                }
            }

            // Construct Rich Description for API
            const payload = {
                type: selectedBusinessType,
                fields: data
            };
            const description = JSON.stringify(payload);

            // Title fallback
            const title = data.name || data.handle || data.businessName || "My Website";

            showWizardStep(3);
            startSpinnerRotation();

            // Pass fileData and mimeType separately (not in description JSON)
            await generateSite(title, description, fileData, mimeType, data.subdomain);

            if (spinnerInterval) clearInterval(spinnerInterval);
        });
    }

    // Updated showWizardStep to render form
    function showWizardStep(step) {
        [wizardStep1, wizardStep2, wizardStep3, wizardStep4].forEach((el, i) => {
            if (el) el.classList.toggle('hidden', i + 1 !== step);
        });

        if (step === 2) {
            // Always render, even if type is missing (renderForm handles fallback)
            renderForm(selectedBusinessType);

            const titleEl = document.getElementById('step2Title');
            if (titleEl) {
                if (selectedBusinessType === 'bio-card') titleEl.textContent = 'Create Bio Card';
                else if (selectedBusinessType === 'business') titleEl.textContent = 'Business Details';
                else titleEl.textContent = 'Build your Profile'; // Default
            }
        }
    }

    // Generate Site
    async function generateSite(title, description, fileData = null, mimeType = null, subdomain = null) {
        const { luloCloudToken } = await chrome.storage.sync.get(['luloCloudToken']);
        if (!luloCloudToken) {
            if (generatingStatus) generatingStatus.textContent = 'Please sign in first';
            return;
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout

        try {
            const response = await fetch(`${WEB_URL}/api/sites`, {
                method: 'POST',
                signal: controller.signal,
                headers: {
                    'Authorization': `Bearer ${luloCloudToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    title,
                    description, // This now contains the JSON string of form data
                    businessType: selectedBusinessType,
                    theme: selectedThemeColor || 'modern',
                    fileData, // Base64
                    mimeType,
                    subdomain
                })
            });
            clearTimeout(timeoutId);

            if (response.ok) {
                const data = await response.json();
                currentGeneratedSite = data.site || data;

                showWizardStep(4);
                const previewEl = document.getElementById('sitePreviewFrame');
                if (previewEl) {
                    // Use a Blob URL or srcdoc
                    const blob = new Blob([currentGeneratedSite.html_content], { type: 'text/html' });
                    previewEl.src = URL.createObjectURL(blob);
                }
            } else {
                const error = await response.json();
                if (generatingStatus) generatingStatus.textContent = 'Error: ' + (error.error || 'Failed');
                console.error('Generation failed:', error);
            }
        } catch (e) {
            clearTimeout(timeoutId);
            console.error('API Error:', e);
            if (generatingStatus) generatingStatus.textContent = 'Network Error';
        }
    }

    function resetWizard() {
        // Reset state
        selectedBusinessType = '';
        const inputs = document.querySelectorAll('.dynamic-input');
        inputs.forEach(i => i.value = '');
        document.querySelectorAll('.template-card').forEach(c => c.classList.remove('selected'));

        showWizardStep(1);
        document.querySelector('.sites-content').classList.remove('hidden');
        if (siteWizard) siteWizard.classList.add('hidden');
    }

    // ==========================================
    // INTELLIGENCE: User Profile (Settings)
    // ==========================================
    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => {
            settingsPanel.classList.remove('hidden');
            chrome.storage.sync.get(['userProfile', 'luloCloudToken'], (result) => {
                if (result.userProfile) {
                    if (userRoleInput) userRoleInput.value = result.userProfile.role || '';
                    if (userBrandInput) userBrandInput.value = result.userProfile.brand || '';
                    if (userInstructionsInput) userInstructionsInput.value = result.userProfile.instructions || '';
                }
                updateCloudStatus(result.luloCloudToken);
            });
        });
    }

    if (connectCloudBtn) {
        connectCloudBtn.addEventListener('click', () => {
            manualTokenInput.classList.toggle('hidden');
            if (!manualTokenInput.classList.contains('hidden')) cloudTokenField.focus();
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
        if (!cloudConnectionStatus) return;
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

    if (closeSettings) closeSettings.addEventListener('click', () => settingsPanel.classList.add('hidden'));

    if (saveSettings) {
        saveSettings.addEventListener('click', () => {
            const profile = {
                role: userRoleInput.value.trim(),
                brand: userBrandInput.value.trim(),
                instructions: userInstructionsInput.value.trim()
            };
            chrome.storage.sync.set({ userProfile: profile }, () => {
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
    async function initProjects() {
        const data = await chrome.storage.local.get(['projects', 'activeProjectId', 'conversationHistory']);
        if (!data.projects || data.projects.length === 0) {
            const generalId = 'proj_' + Date.now();
            const generalProject = { id: generalId, name: 'General', history: data.conversationHistory || [] };
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
        const activeIndex = allProjects.findIndex(p => p.id === activeProjectId);
        if (activeIndex !== -1) allProjects[activeIndex].history = conversationHistory;
        await chrome.storage.local.set({ projects: allProjects, activeProjectId: activeProjectId });
    }

    saveState = () => saveProjects();

    function renderCurrentProject() {
        const active = allProjects.find(p => p.id === activeProjectId);
        if (active) {
            if (currentProjectName) currentProjectName.textContent = active.name;
            conversationHistory = active.history || [];
            if (chatContainer) {
                chatContainer.innerHTML = '';
                conversationHistory.forEach(msg => {
                    if (msg.role === 'user' || msg.role === 'assistant') addMessage(msg.content, msg.role);
                });
                chatContainer.scrollTop = chatContainer.scrollHeight;
            }
        }
    }

    if (projectsBtn) {
        projectsBtn.addEventListener('click', () => {
            projectsPanel.classList.remove('hidden');
            renderProjectList();
        });
    }
    if (closeProjects) closeProjects.addEventListener('click', () => projectsPanel.classList.add('hidden'));

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
        saveProjects().then(() => {
            activeProjectId = id;
            saveProjects().then(() => {
                renderCurrentProject();
                projectsPanel.classList.add('hidden');
            });
        });
    }

    function renderProjectList() {
        if (!projectsList) return;
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
                        if (activeProjectId === p.id) activeProjectId = allProjects[0].id;
                        saveProjects().then(() => { renderProjectList(); renderCurrentProject(); });
                    }
                });
            }
            projectsList.appendChild(div);
        });
    }

    // ==========================================
    // PRESENTATION: Lulo Loom
    // ==========================================
    const logo = document.querySelector('.logo');
    if (logo) logo.addEventListener('click', () => chrome.tabs.create({ url: 'https://lulo-agent.pages.dev/dashboard' }));

    // ==========================================
    // UNIFIED CAPTURE HANDLERS
    // ==========================================

    if (captureBtn) {
        captureBtn.addEventListener('click', () => {
            if (captureOverlay) {
                const isHidden = captureOverlay.classList.contains('hidden');
                // Close others
                if (settingsPanel) settingsPanel.classList.add('hidden');
                if (projectsPanel) projectsPanel.classList.add('hidden');
                if (sitesPanel) sitesPanel.classList.add('hidden');

                if (isHidden) {
                    captureOverlay.classList.remove('hidden');
                } else {
                    captureOverlay.classList.add('hidden');
                }
            }
        });
    }

    if (closeCapture) {
        closeCapture.addEventListener('click', () => {
            if (captureOverlay) captureOverlay.classList.add('hidden');
        });
    }

    if (recordOptionBtn) {
        recordOptionBtn.addEventListener('click', async () => {
            console.log('🎥 Record option clicked');
            // Close overlay
            if (captureOverlay) captureOverlay.classList.add('hidden');

            try {
                // Trigger recording logic
                const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
                console.log('Found tabs:', tabs);
                const tab = tabs[0];

                if (tab) {
                    console.log('Sending TOGGLE_RECORDING to tab:', tab.id);
                    chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_RECORDING' }, (response) => {
                        if (chrome.runtime.lastError) {
                            console.error('Message failed:', chrome.runtime.lastError);
                        } else {
                            console.log('Message sent, response:', response);
                            // Auto-close for clean recording
                            window.close();
                        }
                    });

                    // Add visual feedback class to capture button (simplified)
                    if (captureBtn) captureBtn.classList.add('recording');
                } else {
                    console.warn('No active tab found');
                }
            } catch (err) {
                console.error('Error in record handler:', err);
            }
        });
    }

    if (screenshotOptionBtn) {
        screenshotOptionBtn.addEventListener('click', async () => {
            console.log('📷 Screenshot option clicked');
            // Close overlay
            if (captureOverlay) captureOverlay.classList.add('hidden');

            try {
                // Take Screenshot
                const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
                console.log('Found tabs for screenshot:', tabs);
                const tab = tabs[0];

                if (tab) {
                    console.log('Sending TAKE_SCREENSHOT to tab:', tab.id);
                    chrome.tabs.sendMessage(tab.id, { type: 'TAKE_SCREENSHOT' }, (response) => {
                        if (chrome.runtime.lastError) {
                            console.error('Screenshot Message failed:', chrome.runtime.lastError);
                        } else {
                            console.log('Screenshot command sent');
                        }
                    });
                } else {
                    console.warn('No active tab found for screenshot');
                }
            } catch (err) {
                console.error('Error in screenshot handler:', err);
            }
        });
    }

    // LISTENER FOR STOP RECORDING (to reset UI)
    chrome.runtime.onMessage.addListener((message) => {
        if (message.action === 'RECORDING_STOPPED' && captureBtn) {
            captureBtn.classList.remove('recording');
        }
    });
    // Start
    checkAuthAndInit();

    // ==========================================
    // AUTHENTICATION LOGIC
    // ==========================================

    function checkAuthAndInit() {
        chrome.storage.sync.get(['luloCloudToken'], (result) => {
            if (result.luloCloudToken) {
                // HIDE OVERLAY
                if (loginOverlay) loginOverlay.classList.add('hidden');
                initProjects();
                updateCloudStatus(result.luloCloudToken);
            } else {
                // SHOW OVERLAY
                if (loginOverlay) loginOverlay.classList.remove('hidden');
            }
        });
    }

    if (googleSignInBtn) {
        googleSignInBtn.addEventListener('click', () => {
            const extId = chrome.runtime.id;
            chrome.tabs.create({ url: `${AUTH_URL}?ext_id=${extId}` });
        });
    }

    if (showManualInput) {
        showManualInput.addEventListener('click', () => {
            if (inlineManualInput) inlineManualInput.classList.remove('hidden');
            showManualInput.classList.add('hidden');
        });
    }

    if (loginKeySubmit) {
        loginKeySubmit.addEventListener('click', () => {
            const key = loginKeyInput.value.trim();
            if (key) {
                chrome.storage.sync.set({ luloCloudToken: key }, () => {
                    checkAuthAndInit(); // Re-run check to hide overlay
                });
            }
        });
    }

    // LISTENER FOR TOKEN UPDATES (e.g. from Content Script)
    chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'sync' && changes.luloCloudToken) {
            checkAuthAndInit();
        }
    });

    // ==========================================
    // CHAT HELPERS
    // ==========================================

    function addMessage(content, type) {
        if (!chatContainer) return;
        const msg = document.createElement('div');
        msg.className = `message ${type}`;

        // Handle structured content (Object or JSON String)
        let isRichContent = false;

        if (typeof content === 'object' && content !== null) {
            if (content.steps) {
                msg.innerHTML = formatSteps(content.steps);
                isRichContent = true;
            } else if (content.reply) {
                // Handle Legacy/Fallback Format
                msg.textContent = content.reply;
            } else {
                msg.textContent = JSON.stringify(content, null, 2);
            }
        } else if (typeof content === 'string') {
            // Try parsing only if it looks like JSON starts with {
            if (content.trim().startsWith('{')) {
                try {
                    const data = JSON.parse(content);
                    if (data && data.steps) {
                        msg.innerHTML = formatSteps(data.steps);
                        isRichContent = true;
                    } else if (data && data.reply) {
                        msg.textContent = data.reply;
                    } else {
                        msg.textContent = content; // Just text if not steps/reply
                    }
                } catch (e) {
                    msg.textContent = content;
                }
            } else {
                msg.textContent = content;
            }
        }

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
        if (!chatContainer) return;
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

    // Create a placeholder for the AI response
    let aiMessageDiv = null;

    function handleStreamChunk(fullText, done) {
        if (!conversationContainer) return;
        if (!aiMessageDiv) {
            aiMessageDiv = document.createElement('div');
            aiMessageDiv.className = 'message ai-message streaming';
            conversationContainer.appendChild(aiMessageDiv);
        }

        // Simple loading state - no partial JSON parsing (looks cleaner)
        if (done) {
            aiMessageDiv.classList.remove('streaming');
            try {
                const data = JSON.parse(fullText);
                aiMessageDiv.innerHTML = formatSteps(data.steps);
            } catch (e) {
                aiMessageDiv.textContent = fullText; // Fallback
            }
        } else {
            // Clean loading state with animated dots
            aiMessageDiv.innerHTML = `
            <div class="thinking-block" style="display: flex; align-items: center; gap: 8px;">
                <div class="thinking-dots" style="display: flex; gap: 4px;">
                    <span></span><span></span><span></span>
                </div>
                <span>Thinking...</span>
            </div>
        `;

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
        if (!chatContainer) return;
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

    async function sendMessage() {
        if (!taskInput || !submitBtn) return;
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

        // Show thinking indicator
        const thinkingId = addThinking();

        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

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
            } else if (response) {
                // Success

                // Format response steps
                if (response.steps) {
                    const msgDiv = document.createElement('div');
                    msgDiv.className = 'message assistant';
                    msgDiv.innerHTML = formatSteps(response.steps);
                    conversationContainer.appendChild(msgDiv);
                    conversationContainer.scrollTop = conversationContainer.scrollHeight;

                    // Keep history updated
                    conversationHistory.push({ role: 'assistant', content: response });
                    saveState();

                    // SYNC TO CLOUD
                    syncMessageToCloud(JSON.stringify(response), 'assistant');

                } else {
                    // Fallback
                    const text = response.reply || JSON.stringify(response);
                    addMessage(text, 'assistant');
                    conversationHistory.push({ role: 'assistant', content: text });
                    saveState();
                    syncMessageToCloud(text, 'assistant');
                }
            }

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
                const res = await fetch('https://lulo-agent.pages.dev/api/conversations', {
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
                await fetch(`https://lulo-agent.pages.dev/api/conversations/${conversationId}/messages`, {
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

    // ==========================================
    // SITES: Website Builder
    // ==========================================


    // SITES LOGIC
    if (sitesBtn) {
        sitesBtn.addEventListener('click', async () => {
            sitesPanel.classList.remove('hidden');
            await loadUserSites();
        });
    }

    if (closeSites) {
        closeSites.addEventListener('click', () => {
            sitesPanel.classList.add('hidden');
            resetWizard();
        });
    }

    async function loadUserSites() {
        const { luloCloudToken } = await chrome.storage.sync.get(['luloCloudToken']);
        if (!luloCloudToken) {
            if (sitesList) {
                sitesList.innerHTML = `
                <div class="sites-empty">
                    <span>🔒</span>
                    <p>Sign in to manage sites</p>
                </div>
            `;
            }
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

    function renderSitesList() {
        if (!sitesList) return;
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

        document.querySelectorAll('.site-item').forEach(item => {
            item.addEventListener('click', () => {
                const siteId = item.dataset.id;
                chrome.tabs.create({ url: `${WEB_URL}/dashboard/sites/${siteId}` });
            });
        });
    }

    if (createSiteBtn) {
        createSiteBtn.addEventListener('click', () => {
            document.querySelector('.sites-content').classList.add('hidden');
            if (siteWizard) {
                siteWizard.classList.remove('hidden');
                showWizardStep(1);
            }
        });
    }

    typeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            typeButtons.forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            selectedBusinessType = btn.dataset.type;
            setTimeout(() => showWizardStep(2), 200);
        });
    });

    if (wizardBack) {
        wizardBack.addEventListener('click', () => showWizardStep(1));
    }



}); // END DOMContentLoaded
