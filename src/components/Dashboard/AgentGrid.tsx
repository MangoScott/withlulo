"use client";

import { useState, useRef } from 'react';
import styles from './Dashboard.module.css';
import { useAgent } from '@/hooks/useAgent';
import AgentCard from './AgentCard';
import Dashboard from './Dashboard';

interface AgentGridProps {
    initialPrompt?: string;
}

export default function AgentGrid({ initialPrompt }: AgentGridProps) {
    // Use ref to track if initial agent was already created
    const initializedRef = useRef(false);

    // Initialize with the initial agent if provided
    const getInitialAgents = () => {
        if (initialPrompt && !initializedRef.current) {
            initializedRef.current = true;
            const id = Math.random().toString(36).substr(2, 9);
            return [{ id, prompt: initialPrompt }];
        }
        return [];
    };

    const [agents, setAgents] = useState<{ id: string, prompt: string }[]>(getInitialAgents);
    const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
    const [newPrompt, setNewPrompt] = useState('');

    const addAgent = () => {
        if (!newPrompt) return;
        const id = Math.random().toString(36).substr(2, 9);
        setAgents(prev => [...prev, { id, prompt: newPrompt }]);
        setNewPrompt('');
    };

    return (
        <div className={styles.gridContainer}>
            {/* Minimal Header */}
            <header className={styles.gridHeader}>
                <div className={styles.gridLogo}>lulo</div>

                <div className={styles.addTaskRow}>
                    <input
                        value={newPrompt}
                        onChange={(e) => setNewPrompt(e.target.value)}
                        placeholder="Add another task..."
                        className={styles.taskInput}
                        onKeyDown={(e) => e.key === 'Enter' && addAgent()}
                    />
                    <button
                        onClick={addAgent}
                        disabled={!newPrompt}
                        className={styles.addButton}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M12 5v14M5 12h14" />
                        </svg>
                    </button>
                </div>

                <div className={styles.agentCount}>
                    {agents.length} agent{agents.length !== 1 ? 's' : ''}
                </div>
            </header>

            {/* Clean Agent Grid */}
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
                        <p>Your agents will appear here</p>
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
            <AgentCard agent={agent} onExpand={onSelect} />
            {isSelected && (
                <div className={styles.dashboardOverlay}>
                    <Dashboard agent={agent} onBack={onClose} />
                </div>
            )}
        </>
    );
}
