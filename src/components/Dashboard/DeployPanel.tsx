"use client";

import { useState } from 'react';
import styles from './Dashboard.module.css';

interface DeployPanelProps {
    projectName: string;
    files: { name: string; content: string }[];
    onDeploy?: (platform: string) => void;
}

type DeployOption = 'github' | 'vercel' | 'download';

export default function DeployPanel({ projectName, files, onDeploy }: DeployPanelProps) {
    const [selected, setSelected] = useState<DeployOption | null>(null);
    const [step, setStep] = useState(0);

    const handleDownload = () => {
        // Create a simple HTML file for download
        const htmlFile = files.find(f => f.name.includes('.html'));
        const cssFile = files.find(f => f.name.includes('.css'));

        const fullHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${projectName}</title>
    ${cssFile ? `<style>${cssFile.content}</style>` : ''}
</head>
<body>
${htmlFile?.content || ''}
</body>
</html>`;

        const blob = new Blob([fullHtml], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${projectName.replace(/\s+/g, '-').toLowerCase()}.html`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const deploySteps = {
        github: [
            { title: 'Go to GitHub', description: 'I\'ll open GitHub for you', action: 'Open GitHub' },
            { title: 'Create Repository', description: 'Create a new repository for your project', action: 'Create Repo' },
            { title: 'Upload Files', description: 'Upload your generated files', action: 'Upload' },
            { title: 'Enable Pages', description: 'Go to Settings → Pages → Enable', action: 'Enable' },
        ],
        vercel: [
            { title: 'Go to Vercel', description: 'I\'ll open Vercel for you', action: 'Open Vercel' },
            { title: 'Import Project', description: 'Click "Add New" → "Project"', action: 'Import' },
            { title: 'Deploy', description: 'Vercel will build and deploy automatically', action: 'Deploy' },
        ],
        download: []
    };

    return (
        <div className={styles.deployPanel}>
            <div className={styles.deployHeader}>
                <span className={styles.deployIcon}>🚀</span>
                <h3>Deploy Your Project</h3>
            </div>

            <div className={styles.deployOptions}>
                <button
                    className={`${styles.deployOption} ${selected === 'github' ? styles.selected : ''}`}
                    onClick={() => { setSelected('github'); setStep(0); }}
                >
                    <span>📦</span>
                    <span>GitHub Pages</span>
                    <span className={styles.deployBadge}>Free</span>
                </button>

                <button
                    className={`${styles.deployOption} ${selected === 'vercel' ? styles.selected : ''}`}
                    onClick={() => { setSelected('vercel'); setStep(0); }}
                >
                    <span>▲</span>
                    <span>Vercel</span>
                    <span className={styles.deployBadge}>Fast</span>
                </button>

                <button
                    className={`${styles.deployOption} ${selected === 'download' ? styles.selected : ''}`}
                    onClick={() => { setSelected('download'); handleDownload(); }}
                >
                    <span>💾</span>
                    <span>Download</span>
                </button>
            </div>

            {selected && selected !== 'download' && (
                <div className={styles.deploySteps}>
                    {deploySteps[selected].map((s, i) => (
                        <div
                            key={i}
                            className={`${styles.deployStep} ${i === step ? styles.activeStep : ''} ${i < step ? styles.completedStep : ''}`}
                        >
                            <div className={styles.stepNumber}>
                                {i < step ? '✓' : i + 1}
                            </div>
                            <div className={styles.stepContent}>
                                <strong>{s.title}</strong>
                                <span>{s.description}</span>
                            </div>
                            {i === step && (
                                <button
                                    className={styles.stepAction}
                                    onClick={() => {
                                        if (onDeploy) onDeploy(selected);
                                        if (i < deploySteps[selected].length - 1) {
                                            setStep(i + 1);
                                        }
                                    }}
                                >
                                    {s.action}
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
