import { useState, useEffect, useRef, useCallback } from 'react';

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

export interface Step {
    action: 'BROWSE' | 'WRITE' | 'THINK';
    description: string;
    data: any;
}

export interface AgentResult {
    filesCreated: string[];
    sitesVisited: string[];
    completedAt: Date;
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
}

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

    const hasFetched = useRef(false);
    const sitesVisited = useRef<string[]>([]);
    const filesCreated = useRef<string[]>([]);

    // Add message to history
    const addMessage = useCallback((role: 'user' | 'agent', content: string) => {
        setMessages(prev => [...prev, { role, content, timestamp: new Date() }]);
    }, []);

    // Execute steps from API response
    const executeSteps = useCallback(async (steps: Step[]) => {
        const progressPerStep = 70 / steps.length;
        let currentProgress = 20;

        for (let i = 0; i < steps.length; i++) {
            const step = steps[i];

            if (step.action === 'BROWSE') {
                setStatus('Browsing');
                setThought(step.description);
                setUrl(step.data.url);
                sitesVisited.current.push(step.data.url);

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
                        Loading...
                    </div>
                );

                try {
                    const res = await fetch('/api/browser', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ url: step.data.url })
                    });
                    const data = await res.json();

                    if (data.screenshot) {
                        setBrowserContent(
                            <img src={data.screenshot} alt="Browser" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                        );
                    } else {
                        setBrowserContent(
                            <div style={{ color: 'var(--text-muted)', textAlign: 'center' }}>
                                Page loaded
                            </div>
                        );
                    }
                } catch (e) {
                    setBrowserContent(
                        <div style={{ color: 'var(--text-muted)', textAlign: 'center' }}>
                            Browsed {step.data.url}
                        </div>
                    );
                }

                setCursorPos({ x: Math.random() * 80 + 10, y: Math.random() * 80 + 10 });
                await new Promise(r => setTimeout(r, 2000));
            }

            else if (step.action === 'WRITE') {
                setStatus('Writing');
                setThought(`Creating ${step.data.filename}...`);
                filesCreated.current.push(step.data.filename);

                setFiles(prev => [...prev, {
                    name: step.data.filename,
                    type: step.data.type,
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
                        {step.data.content}
                    </pre>
                );
                await new Promise(r => setTimeout(r, 1500));
            }

            else if (step.action === 'THINK') {
                setStatus('Thinking');
                setThought(step.description);
                await new Promise(r => setTimeout(r, 1000));
            }

            currentProgress += progressPerStep;
            setProgress(Math.min(currentProgress, 90));
        }
    }, []);

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
            setResult({
                filesCreated: [...filesCreated.current],
                sitesVisited: [...new Set(sitesVisited.current)],
                completedAt: new Date()
            });

        } catch (err) {
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

    // Initial run
    useEffect(() => {
        if (hasFetched.current || !initialPrompt) return;
        hasFetched.current = true;

        addMessage('user', initialPrompt);
        runAgent(initialPrompt);
    }, [initialPrompt, addMessage, runAgent]);

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
        sendMessage
    };
}
