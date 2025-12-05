import { useState, useRef, useCallback, useEffect } from 'react';

export interface File {
    name: string;
    type: 'file' | 'folder';
    isNew?: boolean;
}

export interface Message {
    role: 'user' | 'agent';
    content: string;
    timestamp: Date;
}

export interface StepData {
    url?: string;
    filename?: string;
    content?: string;
    type?: 'file' | 'folder';
}

export interface Step {
    action: 'BROWSE' | 'WRITE' | 'THINK';
    description: string;
    data: StepData | null;
}

export interface AgentResult {
    filesCreated: string[];
    sitesVisited: string[];
    completedAt: Date;
}

export interface GeneratedCode {
    html: string;
    css: string;
    js: string;
}

export interface GeneratedFile {
    name: string;
    content: string;
}

export interface AgentState {
    id: string;
    prompt: string;
    files: File[];
    url: string;
    cursorPos: { x: number; y: number };
    status: string;
    thought: string;
    progress: number;
    browserContent: React.ReactNode;
    isActive: boolean;
    hasError: boolean;
    result: AgentResult | null;
    messages: Message[];
    sendMessage: (message: string) => void;
    generatedCode: GeneratedCode;
    generatedFiles: GeneratedFile[];
}

// Check if running in Electron (will be checked in effect)
// const isElectron = typeof window !== 'undefined' && !!window.electronAPI?.isElectron;

export function useAgent(id: string, initialPrompt: string) {
    const [files, setFiles] = useState<File[]>([
        { name: 'node_modules', type: 'folder' },
        { name: 'public', type: 'folder' },
        { name: 'package.json', type: 'file' },
    ]);
    const [url, setUrl] = useState('about:blank');
    const [cursorPos, setCursorPos] = useState({ x: 50, y: 50 });
    const [status, setStatus] = useState('Initializing');
    const [thought, setThought] = useState('Getting ready to work on your task...');
    const [progress, setProgress] = useState(0);
    const [browserContent, setBrowserContent] = useState<React.ReactNode>(null);
    const [isActive, setIsActive] = useState(true);
    const [hasError, setHasError] = useState(false);
    const [result, setResult] = useState<AgentResult | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [generatedCode, setGeneratedCode] = useState<GeneratedCode>({ html: '', css: '', js: '' });
    const [generatedFiles, setGeneratedFiles] = useState<GeneratedFile[]>([]);
    const [isElectron, setIsElectron] = useState(false);

    // Detect Electron environment on mount
    useEffect(() => {
        setIsElectron(typeof window !== 'undefined' && !!window.electronAPI?.isElectron);
    }, []);

    const hasFetched = useRef(false);
    const sitesVisited = useRef<string[]>([]);
    const filesCreated = useRef<string[]>([]);
    const browserLaunched = useRef(false);
    const currentProjectPath = useRef<string | null>(null);

    // Add message to history
    const addMessage = useCallback((role: 'user' | 'agent', content: string) => {
        setMessages(prev => [...prev, { role, content, timestamp: new Date() }]);
    }, []);

    // Browse URL - uses Electron APIs if available, falls back to web API
    const browseUrl = useCallback(async (targetUrl: string): Promise<string | null> => {
        if (isElectron && window.electronAPI) {
            const api = window.electronAPI;

            // Launch browser if not already running
            if (!browserLaunched.current) {
                await api.launchBrowser();
                browserLaunched.current = true;
                await new Promise(r => setTimeout(r, 1000)); // Wait for browser to be ready
            }

            // Navigate with glow effect
            api.updateBrowserStatus('Navigating...');
            await api.navigateTo(targetUrl);
            api.updateBrowserStatus('Lulo is controlling this browser');

            // Take screenshot
            const screenshot = await api.takeScreenshot();
            return screenshot;
        } else {
            // Web fallback - use API route
            const res = await fetch('/api/browser', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: targetUrl })
            });
            const data = await res.json();
            return data.screenshot || null;
        }
    }, []);

    // Execute steps from API response
    const executeSteps = useCallback(async (steps: Step[]) => {
        const progressPerStep = 70 / steps.length;
        let currentProgress = 20;

        for (let i = 0; i < steps.length; i++) {
            const step = steps[i];

            if (step.action === 'BROWSE' && step.data?.url) {
                const browseUrlTarget = step.data.url;
                setStatus('Browsing');
                setThought(step.description);
                setUrl(browseUrlTarget);
                sitesVisited.current.push(browseUrlTarget);

                // Show loading state
                setBrowserContent(
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
                        <div style={{
                            width: 24,
                            height: 24,
                            border: '2px solid var(--border-subtle)',
                            borderTopColor: 'var(--accent-primary)',
                            borderRadius: '50%',
                            marginBottom: '1rem',
                            animation: 'spin 1s linear infinite'
                        }} />
                        {isElectron ? 'Controlling browser...' : 'Loading...'}
                    </div>
                );

                try {
                    const screenshot = await browseUrl(browseUrlTarget);

                    if (screenshot) {
                        setBrowserContent(
                            <img src={screenshot} alt="Browser" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                        );
                    } else {
                        setBrowserContent(
                            <div style={{ color: 'var(--text-muted)', textAlign: 'center' }}>
                                {isElectron ? '🌐 Browser window open' : 'Page loaded'}
                            </div>
                        );
                    }
                } catch {
                    setBrowserContent(
                        <div style={{ color: 'var(--text-muted)', textAlign: 'center' }}>
                            Browsed {browseUrlTarget}
                        </div>
                    );
                }

                setCursorPos({ x: Math.random() * 80 + 10, y: Math.random() * 80 + 10 });
                await new Promise(r => setTimeout(r, 2000));
            }

            else if (step.action === 'WRITE' && step.data?.filename && step.data?.type) {
                const filename = step.data.filename;
                const fileType = step.data.type;
                const content = step.data.content || '';

                setStatus('Writing');
                setThought(`Creating ${filename}...`);
                filesCreated.current.push(filename);

                // Track generated code for live preview
                setGeneratedFiles(prev => [...prev, { name: filename, content }]);

                // Update generatedCode based on file type
                if (filename.endsWith('.html') || filename.endsWith('.htm')) {
                    setGeneratedCode(prev => ({ ...prev, html: content }));
                } else if (filename.endsWith('.css')) {
                    setGeneratedCode(prev => ({ ...prev, css: content }));
                } else if (filename.endsWith('.js')) {
                    setGeneratedCode(prev => ({ ...prev, js: content }));
                }

                // Update glow status if in Electron
                if (isElectron && window.electronAPI) {
                    window.electronAPI.updateBrowserStatus(`Writing ${filename}...`);

                    // Save file locally if we have a project path
                    if (currentProjectPath.current) {
                        try {
                            await window.electronAPI.saveFile(
                                currentProjectPath.current,
                                filename,
                                content
                            );
                        } catch (e) {
                            console.error('Failed to save file locally:', e);
                        }
                    }
                }

                setFiles(prev => [...prev, {
                    name: filename,
                    type: fileType,
                    isNew: true
                }]);

                setBrowserContent(
                    <pre style={{
                        padding: '1rem',
                        background: 'var(--bg-secondary)',
                        borderRadius: 'var(--radius-sm)',
                        width: '90%',
                        height: '80%',
                        overflow: 'auto',
                        fontSize: '0.75rem',
                        color: 'var(--text-primary)',
                        border: '1px solid var(--border-subtle)'
                    }}>
                        {content}
                    </pre>
                );
                await new Promise(r => setTimeout(r, 1500));
            }

            else if (step.action === 'THINK') {
                setStatus('Thinking');
                setThought(step.description);

                // Update glow status if in Electron
                if (isElectron && window.electronAPI) {
                    window.electronAPI.updateBrowserStatus('Thinking...');
                }

                await new Promise(r => setTimeout(r, 1000));
            }

            currentProgress += progressPerStep;
            setProgress(Math.min(currentProgress, 90));
        }
    }, [browseUrl]);

    // Run agent with a prompt
    const runAgent = useCallback(async (prompt: string, isFollowUp = false) => {
        try {
            if (!isFollowUp) {
                setStatus('Planning');
                setThought('Analyzing your request...');
                setProgress(10);
            } else {
                setStatus('Processing');
                setThought('Working on your follow-up...');
                setProgress(20);
            }
            setIsActive(true);
            setHasError(false);

            // Update glow status if in Electron
            if (isElectron && window.electronAPI) {
                window.electronAPI.updateBrowserStatus('Planning...');

                // Create a project folder for this task (if not a follow-up)
                if (!isFollowUp && !currentProjectPath.current) {
                    try {
                        // Create project name from first few words of prompt
                        const projectName = prompt
                            .slice(0, 50)
                            .replace(/[^a-zA-Z0-9\s]/g, '')
                            .trim()
                            .replace(/\s+/g, '-')
                            .toLowerCase() || 'new-project';

                        currentProjectPath.current = await window.electronAPI.createProject(projectName);
                        console.log('Created project at:', currentProjectPath.current);
                    } catch (e) {
                        console.error('Failed to create project:', e);
                    }
                }
            }

            const res = await fetch('/api/agent', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt })
            });

            const data = await res.json();

            if (data.error) {
                setStatus('Error');
                setThought(data.error);
                setHasError(true);
                setIsActive(false);
                addMessage('agent', `Error: ${data.error}`);
                return;
            }

            setProgress(20);
            const steps: Step[] = data.steps;

            // Add agent response about what it's doing
            const actionSummary = steps.map(s => s.description).join(', ');
            addMessage('agent', actionSummary || 'Working on it...');

            await executeSteps(steps);

            // Complete
            setStatus('Ready');
            setThought('Done! What would you like me to do next?');
            setProgress(100);
            setIsActive(false);

            // Update glow status if in Electron
            if (isElectron && window.electronAPI) {
                window.electronAPI.updateBrowserStatus('Task complete ✓');
            }

            setResult({
                filesCreated: [...filesCreated.current],
                sitesVisited: [...new Set(sitesVisited.current)],
                completedAt: new Date()
            });

        } catch {
            setStatus('Error');
            setThought('Failed to connect. Please try again.');
            setHasError(true);
            setIsActive(false);
            addMessage('agent', 'Sorry, I encountered an error. Please try again.');
        }
    }, [addMessage, executeSteps]);

    // Send a follow-up message
    const sendMessage = useCallback((message: string) => {
        if (!message.trim()) return;
        addMessage('user', message);
        runAgent(message, true);
    }, [addMessage, runAgent]);

    // Initial run - use initialization pattern to avoid setState in effect
    const hasInitialized = useRef(false);
    if (!hasInitialized.current && initialPrompt) {
        hasInitialized.current = true;
        // Schedule the initial run for after mount
        setTimeout(() => {
            if (!hasFetched.current) {
                hasFetched.current = true;
                setMessages([{ role: 'user', content: initialPrompt, timestamp: new Date() }]);
                runAgent(initialPrompt);
            }
        }, 0);
    }

    return {
        id,
        prompt: initialPrompt,
        files,
        url,
        cursorPos,
        status,
        thought,
        progress,
        browserContent,
        isActive,
        hasError,
        result,
        messages,
        sendMessage,
        generatedCode,
        generatedFiles
    };
}
