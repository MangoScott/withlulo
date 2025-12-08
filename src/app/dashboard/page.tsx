'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient, Recording, Project } from '@/lib/supabase';
import styles from './page.module.css';
import VideoCard from '@/components/Dashboard/VideoCard';
import Link from 'next/link';

export default function DashboardPage() {
    const [recordings, setRecordings] = useState<Recording[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        try {
            const supabase = createBrowserClient();
            const { data: { session } } = await supabase.auth.getSession();

            if (!session) return;
            setUser(session.user);

            // Fetch Recordings
            const recResponse = await fetch('/api/recordings', {
                headers: { 'Authorization': `Bearer ${session.access_token}` }
            });
            if (recResponse.ok) {
                const data = await recResponse.json();
                setRecordings(data.recordings || []);
            }

            // Fetch Projects
            const projResponse = await fetch('/api/projects'); // Cookie auth
            if (projResponse.ok) {
                const data = await projResponse.json();
                setProjects(data.projects || []);
            }

        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    }

    async function handleUpdate(id: string, updates: Partial<Recording>) {
        try {
            const supabase = createBrowserClient();
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            // Optimistic Update
            setRecordings(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));

            const response = await fetch(`/api/recordings/${id}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updates)
            });

            if (!response.ok) {
                // Revert on failure
                loadData();
            }
        } catch (error) {
            console.error('Error updating recording:', error);
            loadData();
        }
    }

    async function handleDelete(id: string) {
        if (!confirm('Are you sure you want to delete this recording?')) return;

        try {
            const supabase = createBrowserClient();
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            // Optimistic Update
            setRecordings(prev => prev.filter(r => r.id !== id));

            await fetch(`/api/recordings/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${session.access_token}` }
            });
        } catch (error) {
            console.error('Error deleting recording:', error);
            loadData();
        }
    }

    // Filter recordings not in any project (or all?)
    // Typically Dashboard shows "Recent" or "All". Let's show All sorted by date.
    // Or maybe grouped by "Unsorted" and "In Projects"? 
    // The user asked for "Folders".
    // For now, let's keep the main view as "All Recent Recordings".

    if (loading) {
        return (
            <div className={styles.loading}>
                <span className={styles.loadingIcon}>🎬</span>
                <p>Loading recordings...</p>
            </div>
        );
    }

    const [showOnboarding, setShowOnboarding] = useState(false);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('welcome') === 'true') {
            setShowOnboarding(true);
        }
    }, []);

    const greeting = (user?.user_metadata?.full_name && typeof user.user_metadata.full_name === 'string')
        ? user.user_metadata.full_name.split(' ')[0]
        : 'Lulo';

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h1 className={styles.title}>🪄 {greeting}</h1>
                        <p className={styles.subtitle}>Here's what you've created recently.</p>
                    </div>
                    <Link href="/dashboard/projects" className={styles.projectLink}>
                        Manage Projects ➔
                    </Link>
                </div>
            </header>

            {recordings.length === 0 ? (
                <div className={styles.emptyState}>
                    <span className={styles.emptyIcon}>🎬</span>
                    <h2>No recordings yet</h2>
                    <p>Start recording in the Lulo extension to see them here!</p>
                </div>
            ) : (
                <div className={styles.grid}>
                    {recordings.map((recording) => (
                        <VideoCard
                            key={recording.id}
                            recording={recording}
                            projects={projects}
                            onUpdate={handleUpdate}
                            onDelete={handleDelete}
                        />
                    ))}
                </div>
            )}

            {showOnboarding && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modal}>
                        <button className={styles.modalClose} onClick={() => setShowOnboarding(false)}>×</button>
                        <div className={styles.modalContent}>
                            <span className={styles.welcomeIcon}>🎉</span>
                            <h2 className={styles.modalTitle}>Welcome to Lulo!</h2>
                            <p className={styles.modalText}>You're all set. Here's how to get the most out of your new superpower:</p>

                            <div className={styles.steps}>
                                <div className={styles.step}>
                                    <div className={styles.stepNumber}>1</div>
                                    <div className={styles.stepText}>
                                        <strong>Pin the Extension</strong><br />
                                        Click the puzzle icon 🧩 in Chrome and pin Lulo for easy access.
                                    </div>
                                </div>
                                <div className={styles.step}>
                                    <div className={styles.stepNumber}>2</div>
                                    <div className={styles.stepText}>
                                        <strong>Record a Video</strong><br />
                                        Open the extension and click 🎥 to record your screen + camera.
                                    </div>
                                </div>
                                <div className={styles.step}>
                                    <div className={styles.stepNumber}>3</div>
                                    <div className={styles.stepText}>
                                        <strong>Share with Magic</strong><br />
                                        Your video will instantly appear here, ready to share.
                                    </div>
                                </div>
                            </div>

                            <button className={styles.primaryBtn} onClick={() => setShowOnboarding(false)}>
                                Let's go! 🚀
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
