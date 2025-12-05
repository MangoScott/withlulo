"use client";

import { useEffect, useState, useRef } from 'react';
import styles from './Dashboard.module.css';

interface File {
    name: string;
    type: 'file' | 'folder';
    isNew?: boolean;
}

interface Step {
    action: 'BROWSE' | 'WRITE' | 'THINK';
    description: string;
    data: any;
}

interface DashboardProps {
    prompt: string;
}

export default function Dashboard({ prompt }: DashboardProps) {
    const [files, setFiles] = useState<File[]>([
        { name: 'node_modules', type: 'folder' },
        { name: 'public', type: 'folder' },
        { name: 'package.json', type: 'file' },
    ]);
    const [url, setUrl] = useState('about:blank');
    const [cursorPos, setCursorPos] = useState({ x: 50, y: 50 });
    const [status, setStatus] = useState('Initializing Agent...');
    const [browserContent, setBrowserContent] = useState<React.ReactNode>(null);

    const hasFetched = useRef(false);

    useEffect(() => {
        if (hasFetched.current) return;
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
                executeSteps(steps);

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
                        <div className="animate-spin" style={{ width: 24, height: 24, border: '3px solid #E5E7EB', borderTopColor: '#8B5CF6', borderRadius: '50%', marginBottom: '1rem' }} />
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
                        setBrowserContent(<div style={{ color: '#EF4444' }}>Failed to load page</div>);
                    }
                } catch (e) {
                    setBrowserContent(<div style={{ color: '#EF4444' }}>Connection Error</div>);
                }

                // Simulate cursor movement over the real image
                setCursorPos({ x: Math.random() * 80 + 10, y: Math.random() * 80 + 10 });
                await new Promise(r => setTimeout(r, 2000));
            }

            else if (step.action === 'WRITE') {
                setFiles(prev => [...prev, {
                    name: step.data.filename,
                    type: step.data.type,
                    isNew: true
                }]);
                // Show code in browser as a preview
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
    };

    return (
        <div className={styles.dashboard}>
            <header className={styles.header}>
                <div className={styles.logo}>ANTIGRAVITY</div>
                <div className={styles.status}>
                    <div style={{ width: 8, height: 8, background: '#10B981', borderRadius: '50%' }} />
                    {status}
                </div>
            </header>

            <aside className={styles.sidebar}>
                <div className={styles.sidebarTitle}>Local Workspace</div>
                <div className={styles.fileTree}>
                    {files.map((file, i) => (
                        <div key={i} className={`${styles.file} ${file.isNew ? styles.new : ''}`}>
                            <span>{file.type === 'folder' ? '📁' : '📄'}</span>
                            {file.name}
                        </div>
                    ))}
                </div>
            </aside>

            <main className={styles.main}>
                <div className={styles.browserFrame}>
                    <div className={styles.browserHeader}>
                        <div className={styles.trafficLights}>
                            <div className={styles.light} style={{ background: '#EF4444' }} />
                            <div className={styles.light} style={{ background: '#F59E0B' }} />
                            <div className={styles.light} style={{ background: '#10B981' }} />
                        </div>
                        <div className={styles.urlBar}>
                            🔒 {url}
                        </div>
                    </div>
                    <div className={styles.viewport}>
                        {browserContent || <div style={{ color: '#9CA3AF' }}>Waiting for agent...</div>}

                        <div
                            className={styles.cursor}
                            style={{ left: `${cursorPos.x}%`, top: `${cursorPos.y}%`, transition: 'all 1s ease' }}
                        />
                    </div>
                </div>
            </main>
        </div>
    );
}
