import styles from './Dashboard.module.css';
import { AgentState } from '@/hooks/useAgent';

interface AgentCardProps {
    agent: AgentState;
    onClick: () => void;
}

export default function AgentCard({ agent, onClick }: AgentCardProps) {
    const { prompt, status, url, browserContent } = agent;
    const isError = status.includes('Error');
    const isComplete = status.includes('Completed');

    return (
        <div
            onClick={onClick}
            className={styles.agentCard}
        >
            {/* Header */}
            <div className={styles.cardHeader}>
                <div className={styles.cardTitle}>
                    <span className={styles.agentIcon}>🤖</span>
                    Agent {agent.id.slice(0, 4)}
                </div>
                <div className={`${styles.cardStatus} ${isError ? styles.error : isComplete ? styles.complete : ''}`}>
                    <span className={styles.statusIndicator} />
                    {status}
                </div>
            </div>

            {/* Prompt */}
            <div className={styles.cardPrompt}>
                {prompt}
            </div>

            {/* Browser Preview */}
            <div className={styles.cardPreview}>
                <div className={styles.previewContent}>
                    {browserContent}
                </div>
                <div className={styles.previewUrl}>
                    🔗 {url}
                </div>
            </div>
        </div>
    );
}
