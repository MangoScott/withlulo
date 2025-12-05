import styles from './Dashboard.module.css';
import { AgentState } from '@/hooks/useAgent';

interface AgentCardProps {
    agent: AgentState;
    onClick: () => void;
}

export default function AgentCard({ agent, onClick }: AgentCardProps) {
    const { prompt, status, thought, progress, isActive, hasError, result } = agent;

    // Determine status color class
    const statusClass = hasError ? styles.error : !isActive ? styles.complete : '';

    return (
        <div onClick={onClick} className={styles.agentCard}>
            {/* Simple Header with Status */}
            <div className={styles.cardHeader}>
                <span className={styles.cardPrompt}>
                    {prompt.length > 50 ? prompt.slice(0, 50) + '...' : prompt}
                </span>
                <span className={`${styles.cardStatus} ${statusClass}`}>
                    {status}
                </span>
            </div>

            {/* What the agent is thinking */}
            <div className={styles.thoughtArea}>
                <p className={styles.thoughtText}>{thought}</p>
            </div>

            {/* Progress */}
            <div className={styles.progressArea}>
                <div className={styles.progressTrack}>
                    <div
                        className={styles.progressFill}
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>

            {/* Completion Summary */}
            {result && (
                <div className={styles.resultArea}>
                    {result.filesCreated.length > 0 && (
                        <span>{result.filesCreated.length} files</span>
                    )}
                    {result.sitesVisited.length > 0 && (
                        <span>{result.sitesVisited.length} sites</span>
                    )}
                </div>
            )}
        </div>
    );
}
