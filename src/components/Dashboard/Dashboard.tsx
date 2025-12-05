"use client";

import { useState, useRef, useEffect } from 'react';
import styles from './Dashboard.module.css';
import { AgentState } from '@/hooks/useAgent';

interface DashboardProps {
    agent: AgentState;
    onBack: () => void;
}

export default function Dashboard({ agent, onBack }: DashboardProps) {
    const { files, url, status, thought, browserContent, messages, sendMessage, isActive } = agent;
    const [input, setInput] = useState('');
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

    return (
        <div className={styles.dashboard}>
            {/* Header */}
            <header className={styles.header}>
                <button onClick={onBack} className={styles.backButton}>
                    ← Back
                </button>
                <div className={styles.statusPill}>
                    <span className={`${styles.statusDot} ${isActive ? styles.active : ''}`} />
                    {status}
                </div>
            </header>

            {/* Sidebar - Files */}
            <aside className={styles.sidebar}>
                <div className={styles.sidebarTitle}>Files</div>
                <div className={styles.fileTree}>
                    {files.map((file, i) => (
                        <div key={i} className={`${styles.file} ${file.isNew ? styles.new : ''}`}>
                            {file.type === 'folder' ? '📁' : '📄'} {file.name}
                        </div>
                    ))}
                </div>

                {/* Current Activity */}
                {thought && (
                    <div className={styles.activitySection}>
                        <div className={styles.sidebarTitle}>Current Activity</div>
                        <p className={styles.activityText}>{thought}</p>
                    </div>
                )}
            </aside>

            {/* Main Content */}
            <main className={styles.main}>
                {/* Browser Preview */}
                <div className={styles.browserFrame}>
                    <div className={styles.browserHeader}>
                        <div className={styles.trafficLights}>
                            <div style={{ background: '#FF5F56' }} />
                            <div style={{ background: '#FFBD2E' }} />
                            <div style={{ background: '#27C93F' }} />
                        </div>
                        <div className={styles.urlBar}>{url}</div>
                    </div>
                    <div className={styles.viewport}>
                        {browserContent || (
                            <div className={styles.emptyViewport}>
                                Agent workspace
                            </div>
                        )}
                    </div>
                </div>

                {/* Chat Area */}
                <div className={styles.chatArea}>
                    {/* Messages */}
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

                    {/* Input */}
                    <div className={styles.chatInputArea}>
                        <textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={isActive ? "Agent is working..." : "Tell the agent what to do next..."}
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
            </main>
        </div>
    );
}
