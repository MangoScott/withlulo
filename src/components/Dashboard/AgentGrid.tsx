"use client";

import { useState } from 'react';
import styles from './Dashboard.module.css';
import { useAgent, AgentState } from '@/hooks/useAgent';
import AgentCard from './AgentCard';
import Dashboard from './Dashboard';

// Wrapper component to run the hook
function ActiveAgent({ id, prompt, onView }: { id: string, prompt: string, onView: (agent: AgentState) => void }) {
    const agent = useAgent(id, prompt);
    return <AgentCard agent={agent} onClick={() => onView(agent)} />;
}

export default function AgentGrid() {
    const [agents, setAgents] = useState<{ id: string, prompt: string }[]>([]);
    const [selectedAgent, setSelectedAgent] = useState<AgentState | null>(null);
    const [newPrompt, setNewPrompt] = useState('');

    const addAgent = () => {
        if (!newPrompt) return;
        const id = Math.random().toString(36).substr(2, 9);
        setAgents(prev => [...prev, { id, prompt: newPrompt }]);
        setNewPrompt('');
    };

    // If an agent is selected, show the full dashboard
    // Note: We need a way to keep the hook running even when viewing the dashboard.
    // The current architecture re-mounts the ActiveAgent when in grid view.
    // To fix this, we should render ALL ActiveAgents hidden, and just show the selected one's data.
    // BUT, for this MVP, we will render the list of ActiveAgents. When one is selected, we pass its state?
    // No, hooks need to run.

    // Revised Architecture for Grid:
    // We map over `agents` and render an `ActiveAgentRunner` for EACH.
    // The Runner calls the hook. It passes the state up to a parent? Or we just render the view there.

    // Let's do this:
    // AgentGrid renders a list of `AgentContainer` components.
    // `AgentContainer` calls `useAgent`.
    // `AgentContainer` decides whether to render a Card or (if selected) the Dashboard.
    // But only ONE can be selected.

    return (
        <div className={styles.dashboard} style={{ background: '#F3F4F6' }}>
            {/* Dashboard Overlay */}
            {selectedAgent && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100, background: '#FFF' }}>
                    <Dashboard agent={selectedAgent} onBack={() => setSelectedAgent(null)} />
                </div>
            )}

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
                            onSelect={setSelectedAgent}
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

function AgentContainer({ id, prompt, onSelect }: { id: string, prompt: string, onSelect: (a: AgentState) => void }) {
    const agent = useAgent(id, prompt);

    // We render the card. If this agent is "selected" in the parent, the parent hides this grid 
    // and shows the Dashboard with THIS agent's state?
    // Wait, if the parent unmounts this Grid to show the Dashboard, this hook unmounts and the agent DIES.

    // CRITICAL FIX: The Grid must ALWAYS be mounted. The Dashboard view must be an overlay or the Grid must just hide the cards visually but keep them mounted.

    // Actually, for the "Selected" view, we can just pass the `agent` object to the `onSelect` handler.
    // But if we unmount `AgentContainer`, `useAgent` stops.

    // So `AgentGrid` must render ALL `AgentContainer`s regardless of view mode.
    // But `AgentContainer` should render `null` if we are in "Dashboard Mode" for ANOTHER agent?
    // No, we want them to keep running in the background.

    // So: AgentGrid renders the list of AgentContainers HIDDEN if a specific agent is selected?
    // Or better: AgentGrid handles the view switching.

    // Let's change the architecture slightly in `AgentGrid` above.
    // We will NOT conditionally render the list. We will render the list ALWAYS.
    // But we will pass a `hidden` prop?

    return (
        <AgentCard agent={agent} onClick={() => onSelect(agent)} />
    );
}
