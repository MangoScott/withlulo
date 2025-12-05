"use client";

import styles from './Dashboard.module.css';
import { AgentState } from '@/hooks/useAgent';

interface DashboardProps {
    agent: AgentState;
    onBack: () => void;
}

export default function Dashboard({ agent, onBack }: DashboardProps) {
    const { files, url, cursorPos, status, browserContent } = agent;

    return (
        <div className={styles.dashboard}>
            <header className={styles.header}>
                <div className={styles.logo} onClick={onBack} style={{ cursor: 'pointer' }}>
                    ← Back to Grid
                </div>
                <div className={styles.status}>
                    <div style={{ width: 8, height: 8, background: '#10B981', borderRadius: '50%' }} />
                    {status}
                </div>
            </header>

            <aside className={styles.sidebar}>
                <div className={styles.sidebarTitle}>Local Workspace</div>
                <div className={styles.fileTree}>
                    {files.map((file, i) => (
                        <div key={i} className={`${styles.file} ${file.isNew ? styles.new : ''}`}>
                            {file.type === 'folder' ? '📁' : '📄'} {file.name}
                        </div>
                    ))}
                </div>
            </aside>

            <main className={styles.main}>
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
                        {browserContent}
                        <div
                            className={styles.cursor}
                            style={{
                                left: `${cursorPos.x}%`,
                                top: `${cursorPos.y}%`
                            }}
                        />
                    </div>
                </div>
            </main>
        </div>
    );
}
