"use client";

import { useState, useRef, useEffect } from 'react';
import styles from './Dashboard.module.css';
import { AgentState } from '@/hooks/useAgent';
import LivePreview from './LivePreview';
import DeployPanel from './DeployPanel';

interface DashboardProps {
    agent: AgentState;
    onBack: () => void;
}

export default function Dashboard({ agent, onBack }: DashboardProps) {
    const { prompt, status, thought, messages, sendMessage, isActive, generatedCode, generatedFiles } = agent;
    const [input, setInput] = useState('');
    const [showDeploy, setShowDeploy] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to latest message
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = () => {
        if (!input.trim() || isActive) return;
        sendMessage(input.trim());
        setInput('');
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleDeploy = (platform: string) => {
        // Open the platform URL
        if (platform === 'github') {
            window.open('https://github.com/new', '_blank');
        } else if (platform === 'vercel') {
            window.open('https://vercel.com/new', '_blank');
        }
    };

    const hasCode = generatedCode.html || generatedCode.css || generatedCode.js;

    return (
        <div className={styles.simpleDashboard}>
            {/* Header */}
            <header className={styles.simpleHeader}>
                <button onClick={onBack} className={styles.backButton}>
                    ← Back
                </button>
                <div className={styles.headerInfo}>
                    <span className={styles.taskName}>
                        {prompt.slice(0, 50)}{prompt.length > 50 ? '...' : ''}
                    </span>
                    <div className={styles.statusPill}>
                        <span className={`${styles.statusDot} ${isActive ? styles.active : ''}`} />
                        {status}
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <div className={styles.simpleContent}>
                {/* Left: Live Preview */}
                <div className={styles.previewSection}>
                    <div className={styles.previewHeader}>
                        <span>Live Preview</span>
                        {hasCode && (
                            <button
                                className={styles.deployToggle}
                                onClick={() => setShowDeploy(!showDeploy)}
                            >
                                🚀 Deploy
                            </button>
                        )}
                    </div>
                    <div className={styles.previewContainer}>
                        <LivePreview
                            html={generatedCode.html}
                            css={generatedCode.css}
                            js={generatedCode.js}
                        />
                    </div>

                    {/* Current thought */}
                    {isActive && thought && (
                        <div className={styles.thoughtBanner}>
                            <span className={styles.thoughtSpinner} />
                            {thought}
                        </div>
                    )}
                </div>

                {/* Right: Chat */}
                <div className={styles.chatSection}>
                    <div className={styles.chatHeader}>Chat</div>

                    <div className={styles.messageList}>
                        {messages.map((msg, i) => (
                            <div
                                key={i}
                                className={`${styles.message} ${msg.role === 'user' ? styles.userMessage : styles.agentMessage}`}
                            >
                                <p>{msg.content}</p>
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </div>

                    <div className={styles.chatInputArea}>
                        <textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={isActive ? "Agent is working..." : "Ask for changes..."}
                            className={styles.chatInput}
                            disabled={isActive}
                            rows={1}
                        />
                        <button
                            onClick={handleSend}
                            disabled={!input.trim() || isActive}
                            className={styles.sendButton}
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M5 12h14M12 5l7 7-7 7" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>

            {/* Deploy Panel */}
            {showDeploy && hasCode && (
                <div className={styles.deployOverlay}>
                    <div className={styles.deployModal}>
                        <button
                            className={styles.closeButton}
                            onClick={() => setShowDeploy(false)}
                        >
                            ✕
                        </button>
                        <DeployPanel
                            projectName={prompt.slice(0, 30)}
                            files={generatedFiles}
                            onDeploy={handleDeploy}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
