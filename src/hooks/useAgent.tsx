import { useState, useEffect, useRef } from 'react';

export interface File {
    name: string;
    type: 'file' | 'folder';
    isNew?: boolean;
}

export interface Step {
    action: 'BROWSE' | 'WRITE' | 'THINK';
    description: string;
    data: any;
}

export interface AgentState {
    id: string;
    prompt: string;
    files: File[];
    url: string;
    cursorPos: { x: number; y: number };
    status: string;
    browserContent: React.ReactNode;
    isActive: boolean;
}

export function useAgent(id: string, prompt: string) {
    const [files, setFiles] = useState<File[]>([
        { name: 'node_modules', type: 'folder' },
        { name: 'public', type: 'folder' },
        { name: 'package.json', type: 'file' },
    ]);
    const [url, setUrl] = useState('about:blank');
    const [cursorPos, setCursorPos] = useState({ x: 50, y: 50 });
    const [status, setStatus] = useState('Initializing Agent...');
    const [browserContent, setBrowserContent] = useState<React.ReactNode>(null);
    const [isActive, setIsActive] = useState(true);

    const hasFetched = useRef(false);

    useEffect(() => {
        if (hasFetched.current || !prompt) return;
        hasFetched.current = true;

        const runAgent = async () => {
            try {
                setStatus('Contacting Gemini...');
                const res = await fetch('/api/agent', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ prompt })
                });

                const data = await res.json();

                if (data.error) {
                    setStatus(`Error: ${data.error}`);
                    return;
                }

                const steps: Step[] = data.steps;
                await executeSteps(steps);

            } catch (err) {
                setStatus('Connection Failed');
            }
        };

        runAgent();
    }, [prompt]);

    const executeSteps = async (steps: Step[]) => {
        for (const step of steps) {
            setStatus(step.description);

            if (step.action === 'BROWSE') {
                setUrl(step.data.url);
                setBrowserContent(
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9CA3AF' }}>
                        <div className="animate-spin" style={{ width: 24, height: 24, border: '3px solid #E5E7EB', borderTopColor: '#8B5CF6', borderRadius: '50%', marginBottom: '1rem' }
                        } />
                        Loading page...
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
                            <img src={data.screenshot} alt="Browser View" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                        );
                    } else {
                        setBrowserContent(<div style={{ color: '#EF4444' }}> Failed to load page </div>);
                    }
                } catch (e) {
                    setBrowserContent(<div style={{ color: '#EF4444' }}> Connection Error </div>);
                }

                setCursorPos({ x: Math.random() * 80 + 10, y: Math.random() * 80 + 10 });
                await new Promise(r => setTimeout(r, 2000));
            }

            else if (step.action === 'WRITE') {
                setFiles(prev => [...prev, {
                    name: step.data.filename,
                    type: step.data.type,
                    isNew: true
                }]);
                setBrowserContent(
                    <pre style={{
                        padding: '1rem',
                        background: '#F9FAFB',
                        borderRadius: '8px',
                        width: '90%',
                        height: '80%',
                        overflow: 'auto',
                        fontSize: '0.8rem',
                        border: '1px solid #E5E7EB'
                    }}>
                        {step.data.content}
                    </pre>
                );
                await new Promise(r => setTimeout(r, 1500));
            }

            else if (step.action === 'THINK') {
                await new Promise(r => setTimeout(r, 1000));
            }
        }
        setStatus('Task Completed');
        setIsActive(false);
    };

    return {
        id,
        prompt,
        files,
        url,
        cursorPos,
        status,
        browserContent,
        isActive
    };
}
