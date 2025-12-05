"use client";

import { useState } from 'react';
import styles from './TaskWizard.module.css';

interface TaskWizardProps {
    onSubmit: (task: string) => void;
}

const QUICK_IDEAS = [
    { label: 'Website', icon: '🌐' },
    { label: 'Research', icon: '🔍' },
    { label: 'Automation', icon: '🤖' },
    { label: 'Data', icon: '📊' },
];

export default function TaskWizard({ onSubmit }: TaskWizardProps) {
    const [prompt, setPrompt] = useState('');
    const [showDetails, setShowDetails] = useState(false);
    const [details, setDetails] = useState({
        projectName: '',
        style: '',
        audience: ''
    });

    const handleSubmit = () => {
        if (!prompt.trim()) return;

        // Build the full prompt with optional details
        let fullPrompt = prompt.trim();

        const addedDetails = [];
        if (details.projectName) addedDetails.push(`Project: ${details.projectName}`);
        if (details.style) addedDetails.push(`Style: ${details.style}`);
        if (details.audience) addedDetails.push(`Target audience: ${details.audience}`);

        if (addedDetails.length > 0) {
            fullPrompt += `\n\nAdditional context:\n${addedDetails.join('\n')}`;
        }

        onSubmit(fullPrompt);
    };

    const handleQuickIdea = (idea: string) => {
        const starters: Record<string, string> = {
            'Website': 'Build a modern website for ',
            'Research': 'Research and analyze ',
            'Automation': 'Create an automation that ',
            'Data': 'Collect and organize data about ',
        };
        setPrompt(starters[idea] || `Help me with ${idea.toLowerCase()}: `);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && e.metaKey) {
            handleSubmit();
        }
    };

    return (
        <div className={styles.wizard}>
            <div className={styles.header}>
                <h1 className={styles.logo}>
                    <span className={styles.logoIcon}>✦</span>
                    Lulo
                </h1>
                <p className={styles.tagline}>Your AI team, working in parallel</p>
            </div>

            <div className={styles.mainSection}>
                <h2 className={styles.promptLabel}>What would you like to accomplish?</h2>

                <div className={styles.textareaWrapper}>
                    <textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Describe your project, task, or question..."
                        className={styles.mainTextarea}
                        rows={4}
                        autoFocus
                    />
                    <span className={styles.hint}>⌘ + Enter to submit</span>
                </div>

                {/* Collapsible Details Section */}
                <button
                    className={styles.detailsToggle}
                    onClick={() => setShowDetails(!showDetails)}
                >
                    <span className={styles.toggleIcon}>{showDetails ? '−' : '+'}</span>
                    Add details (optional)
                </button>

                {showDetails && (
                    <div className={styles.detailsPanel}>
                        <div className={styles.detailField}>
                            <label>Project name</label>
                            <input
                                type="text"
                                value={details.projectName}
                                onChange={(e) => setDetails({ ...details, projectName: e.target.value })}
                                placeholder="e.g., My Portfolio"
                            />
                        </div>
                        <div className={styles.detailField}>
                            <label>Style / Theme</label>
                            <input
                                type="text"
                                value={details.style}
                                onChange={(e) => setDetails({ ...details, style: e.target.value })}
                                placeholder="e.g., Minimal, dark mode, modern"
                            />
                        </div>
                        <div className={styles.detailField}>
                            <label>Target audience</label>
                            <input
                                type="text"
                                value={details.audience}
                                onChange={(e) => setDetails({ ...details, audience: e.target.value })}
                                placeholder="e.g., Developers, small businesses"
                            />
                        </div>
                    </div>
                )}

                <button
                    className={styles.submitButton}
                    onClick={handleSubmit}
                    disabled={!prompt.trim()}
                >
                    Start Building →
                </button>

                {/* Quick Ideas */}
                <div className={styles.quickIdeas}>
                    <span className={styles.quickLabel}>Quick ideas:</span>
                    {QUICK_IDEAS.map((idea) => (
                        <button
                            key={idea.label}
                            className={styles.ideaChip}
                            onClick={() => handleQuickIdea(idea.label)}
                        >
                            {idea.icon} {idea.label}
                        </button>
                    ))}
                </div>

                {/* Chrome Extension Banner */}
                <div className={styles.desktopBanner}>
                    <div className={styles.bannerContent}>
                        <span className={styles.bannerIcon}>🧩</span>
                        <div className={styles.bannerText}>
                            <strong>Get Lulo for Chrome</strong>
                            <span>Browser automation + AI assistant</span>
                        </div>
                    </div>
                    <a
                        href="https://chrome.google.com/webstore"
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.downloadButton}
                    >
                        Add to Chrome
                    </a>
                </div>
            </div>
        </div>
    );
}
