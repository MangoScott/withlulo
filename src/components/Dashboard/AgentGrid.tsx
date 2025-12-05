"use client";

import { useState, useEffect } from 'react';
import styles from './Dashboard.module.css';
import { useAgent } from '@/hooks/useAgent';
import AgentCard from './AgentCard';
import Dashboard from './Dashboard';

interface AgentGridProps {
    initialPrompt?: string;
}

export default function AgentGrid({ initialPrompt }: AgentGridProps) {
    const [agents, setAgents] = useState<{ id: string, prompt: string }[]>([]);
    const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
    const [newPrompt, setNewPrompt] = useState('');

    // Auto-spawn first agent from initial prompt
    useEffect(() => {
        if (initialPrompt && agents.length === 0) {
            const id = Math.random().toString(36).substr(2, 9);
            setAgents([{ id, prompt: initialPrompt }]);
        }
    }, [initialPrompt]);

    const addAgent = () => {
        if (!newPrompt) return;
        const id = Math.random().toString(36).substr(2, 9);
        setAgents(prev => [...prev, { id, prompt: newPrompt }]);
        setNewPrompt('');
    };

    return (
        <div className={styles.gridContainer}>
            {/* Header */}
            <header className={styles.gridHeader}>
                <div className={styles.gridLogo}>
                    <span className={styles.logoIcon}>✦</span>
                    Lulo
                </div>
                <div className={styles.inputRow}>
                    <input
                        value={newPrompt}
                        onChange={(e) => setNewPrompt(e.target.value)}
                        placeholder="Add another task..."
                        className={styles.missionInput}
                        onKeyDown={(e) => e.key === 'Enter' && addAgent()}
                    />
                    <button
                        onClick={addAgent}
                        disabled={!newPrompt}
                        className={styles.spawnButton}
                    >
                        + Add Agent
                    </button>
                </div>
                <div className={styles.statusBadge}>
                    <div className={styles.statusDot} />
                    {agents.length} Agent{agents.length !== 1 ? 's' : ''} Active
                </div>
            </header>

            {/* Agent Grid */}
            <main className={styles.agentGrid}>
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
                    <div className={styles.emptyState}>
                        <h2>Mission Control Ready</h2>
                        <p>Spawn your first agent to begin.</p>
                    </div>
                )}
            </main>
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
                <div className={styles.dashboardOverlay}>
                    <Dashboard agent={agent} onBack={onClose} />
                </div>
            )}
        </>
    );
}
