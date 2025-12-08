'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient, Recording, Project } from '@/lib/supabase';
import styles from './page.module.css';
import VideoCard from '@/components/Dashboard/VideoCard';

export default function RecordingsPage() {
    const [recordings, setRecordings] = useState<Recording[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        try {
            const supabase = createBrowserClient();
            const { data: { session } } = await supabase.auth.getSession();

            if (!session) return;

            // Fetch Recordings
            const recResponse = await fetch('/api/recordings', {
                headers: { 'Authorization': `Bearer ${session.access_token}` }
            });
            if (recResponse.ok) {
                const data = await recResponse.json();
                setRecordings(data.recordings || []);
            }

            // Fetch Projects
            const projResponse = await fetch('/api/projects');
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

    if (loading) {
        return (
            <div className={styles.loading}>
                <span className={styles.loadingIcon}>🎬</span>
                <p>Loading recordings...</p>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1 className={styles.title}>🎬 My Recordings</h1>
                <p className={styles.subtitle}>All your screen recordings in one place.</p>
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
        </div>
    );
}
