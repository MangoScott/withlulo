"use client";

import { useState } from 'react';
import styles from './Dashboard.module.css';
import { useAgent, AgentState } from '@/hooks/useAgent';
import AgentCard from './AgentCard';
import Dashboard from './Dashboard';

export default function AgentGrid() {
    const [agents, setAgents] = useState<{ id: string, prompt: string }[]>([]);
    const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
    const [newPrompt, setNewPrompt] = useState('');

    const addAgent = () => {
        if (!newPrompt) return;
        const id = Math.random().toString(36).substr(2, 9);
        setAgents(prev => [...prev, { id, prompt: newPrompt }]);
        setNewPrompt('');
    };

    return (
        <div className={styles.dashboard} style={{ background: '#F3F4F6' }}>
            {/* Grid View (Always mounted to keep agents running) */}
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <header className={styles.header} style={{ background: '#FFF', borderBottom: '1px solid var(--border-subtle)' }}>
                    <div className={styles.logo} style={{ color: 'var(--accent-primary)' }}>ANTIGRAVITY GRID</div>
                    <div style={{ display: 'flex', gap: '1rem', flex: 1, maxWidth: '600px', marginLeft: '2rem' }}>
                        <input
                            value={newPrompt}
                            onChange={(e) => setNewPrompt(e.target.value)}
                            placeholder="New Mission: e.g. 'Find cheap flights to Tokyo'"
                            style={{
                                flex: 1,
                                padding: '0.5rem 1rem',
                                borderRadius: '8px',
                                border: '1px solid var(--border-subtle)',
                                fontSize: '0.9rem'
                            }}
                            onKeyDown={(e) => e.key === 'Enter' && addAgent()}
                        />
                        <button
                            onClick={addAgent}
                            disabled={!newPrompt}
                            style={{
                                padding: '0.5rem 1.5rem',
                                background: 'var(--accent-primary)',
                                color: '#FFF',
                                border: 'none',
                                borderRadius: '8px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                opacity: !newPrompt ? 0.5 : 1
                            }}
                        >
                            + Spawn Agent
                        </button>
                    </div>
                    <div className={styles.status}>
                        <div style={{ width: 8, height: 8, background: '#10B981', borderRadius: '50%' }} />
                        {agents.length} Agents Active
                    </div>
                </header>

                <main style={{ padding: '2rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '2rem', overflow: 'auto' }}>
                    {agents.map(a => (
                        <AgentContainer
                            key={a.id}
                            id={a.id}
                            prompt={a.prompt}
                            isSelected={selectedAgentId === a.id}
                            onSelect={() => setSelectedAgentId(a.id)}
                            onClose={() => setSelectedAgentId(null)}
                        />
                    ))}

                    {agents.length === 0 && (
                        <div style={{ gridColumn: '1/-1', textAlign: 'center', color: 'var(--text-muted)', marginTop: '4rem' }}>
                            <h2>Mission Control Ready</h2>
                            <p>Spawn your first agent to begin.</p>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}

function AgentContainer({
    id,
    prompt,
    isSelected,
    onSelect,
    onClose
}: {
    id: string,
    prompt: string,
    isSelected: boolean,
    onSelect: () => void,
    onClose: () => void
}) {
    const agent = useAgent(id, prompt);

    return (
        <>
            <AgentCard agent={agent} onClick={onSelect} />
            {isSelected && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100, background: '#FFF' }}>
                    <Dashboard agent={agent} onBack={onClose} />
                </div>
            )}
        </>
    );
}
