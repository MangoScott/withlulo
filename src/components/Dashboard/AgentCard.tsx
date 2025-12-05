import { useState } from 'react';
import styles from './Dashboard.module.css';
import { AgentState } from '@/hooks/useAgent';
import LivePreview from './LivePreview';

interface AgentCardProps {
    agent: AgentState;
    onExpand: () => void;
}

export default function AgentCard({ agent, onExpand }: AgentCardProps) {
    const { prompt, status, progress, isActive, hasError, result, browserContent, sendMessage, generatedCode } = agent;
    const [chatInput, setChatInput] = useState('');

    // Determine status color class
    const statusClass = hasError ? styles.error : !isActive ? styles.complete : '';

    const handleSendMessage = () => {
        if (!chatInput.trim() || isActive) return;
        sendMessage(chatInput.trim());
        setChatInput('');
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            e.stopPropagation();
            handleSendMessage();
        }
    };

    const handleCardClick = (e: React.MouseEvent) => {
        // Don't expand if clicking on input or buttons
        if ((e.target as HTMLElement).closest(`.${styles.cardChat}`)) {
            return;
        }
        onExpand();
    };

    const hasCode = generatedCode.html || generatedCode.css || generatedCode.js;

    return (
        <div onClick={handleCardClick} className={styles.agentCard}>
            {/* Header with prompt and status */}
            <div className={styles.cardHeader}>
                <span className={styles.cardPrompt}>
                    {prompt.length > 60 ? prompt.slice(0, 60) + '...' : prompt}
                </span>
                <span className={`${styles.cardStatus} ${statusClass}`}>
                    {status}
                </span>
            </div>

            {/* Preview Area */}
            <div className={styles.cardPreview}>
                {hasCode ? (
                    <div className={styles.previewContent}>
                        <LivePreview
                            html={generatedCode.html}
                            css={generatedCode.css}
                            js={generatedCode.js}
                            className={styles.miniPreview}
                        />
                    </div>
                ) : browserContent ? (
                    <div className={styles.previewContent}>
                        {browserContent}
                    </div>
                ) : (
                    <div className={styles.previewPlaceholder}>
                        {isActive ? (
                            <>
                                <div className={styles.previewSpinner} />
                                <span>Working...</span>
                            </>
                        ) : (
                            <span>Preview will appear here</span>
                        )}
                    </div>
                )}
            </div>

            {/* Progress bar */}
            {isActive && (
                <div className={styles.cardProgress}>
                    <div
                        className={styles.cardProgressFill}
                        style={{ width: `${progress}%` }}
                    />
                </div>
            )}

            {/* Inline Chat */}
            <div className={styles.cardChat}>
                <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={isActive ? "Agent is working..." : "Ask for changes..."}
                    className={styles.cardChatInput}
                    disabled={isActive}
                />
                <button
                    onClick={handleSendMessage}
                    disabled={!chatInput.trim() || isActive}
                    className={styles.cardSendButton}
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                </button>
            </div>

            {/* Footer with results and expand hint */}
            <div className={styles.cardFooter}>
                <div className={styles.cardResults}>
                    {result && (
                        <>
                            {result.filesCreated.length > 0 && (
                                <span>📄 {result.filesCreated.length} files</span>
                            )}
                            {result.sitesVisited.length > 0 && (
                                <span>🌐 {result.sitesVisited.length} sites</span>
                            )}
                        </>
                    )}
                </div>
                <span className={styles.expandHint}>
                    Click to expand ↗
                </span>
            </div>
        </div>
    );
}
