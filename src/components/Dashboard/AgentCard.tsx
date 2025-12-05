import styles from './Dashboard.module.css';
import { AgentState } from '@/hooks/useAgent';

interface AgentCardProps {
    agent: AgentState;
    onClick: () => void;
}

export default function AgentCard({ agent, onClick }: AgentCardProps) {
    const { prompt, status, url, browserContent } = agent;

    return (
        <div
            onClick={onClick}
            style={{
                background: '#FFF',
                borderRadius: '16px',
                border: '1px solid var(--border-subtle)',
                overflow: 'hidden',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                flexDirection: 'column',
                height: '300px',
                boxShadow: 'var(--shadow-soft)'
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
        >
            <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-subtle)', background: '#FAFAFA' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>Agent {agent.id.slice(0, 4)}</div>
                    <div style={{ fontSize: '0.8rem', color: status.includes('Error') ? '#EF4444' : '#10B981' }}>● {status}</div>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {prompt}
                </div>
            </div>

            <div style={{ flex: 1, position: 'relative', background: '#F3F4F6' }}>
                {/* Mini Browser View */}
                <div style={{ transform: 'scale(0.5)', transformOrigin: 'top left', width: '200%', height: '200%', pointerEvents: 'none' }}>
                    {browserContent}
                </div>

                <div style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    padding: '0.5rem',
                    background: 'rgba(255,255,255,0.9)',
                    fontSize: '0.7rem',
                    color: 'var(--text-muted)',
                    borderTop: '1px solid var(--border-subtle)'
                }}>
                    {url}
                </div>
            </div>
        </div>
    );
}
