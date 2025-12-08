'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient, Project } from '@/lib/supabase';
import styles from './page.module.css';

export default function ProjectsPage() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [newProjectName, setNewProjectName] = useState('');
    const [newProjectDesc, setNewProjectDesc] = useState('');
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        fetchProjects();
    }, []);

    async function fetchProjects() {
        try {
            const response = await fetch('/api/projects');
            if (response.ok) {
                const data = await response.json();
                setProjects(data.projects || []);
            }
        } catch (error) {
            console.error('Error fetching projects:', error);
        } finally {
            setLoading(false);
        }
    }

    async function handleCreate(e: React.FormEvent) {
        e.preventDefault();
        setCreating(true);

        try {
            const response = await fetch('/api/projects', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: newProjectName,
                    description: newProjectDesc
                })
            });

            if (response.ok) {
                const { project } = await response.json();
                setProjects([project, ...projects]);
                setShowModal(false);
                setNewProjectName('');
                setNewProjectDesc('');
            }
        } catch (error) {
            console.error('Error creating project:', error);
        } finally {
            setCreating(false);
        }
    }

    if (loading) {
        return <div className={styles.loading}>Loading projects...</div>;
    }

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div>
                    <h1>Projects</h1>
                    <p>Organize your recordings and chats</p>
                </div>
                <button
                    className={styles.createBtn}
                    onClick={() => setShowModal(true)}
                >
                    + New Project
                </button>
            </header>

            {projects.length === 0 ? (
                <div className={styles.empty}>
                    <span>📁</span>
                    <h3>No projects yet</h3>
                    <p>Create a project to organize your work.</p>
                </div>
            ) : (
                <div className={styles.grid}>
                    {projects.map(project => (
                        <div key={project.id} className={styles.card}>
                            <div className={styles.cardIcon}>📁</div>
                            <div className={styles.cardContent}>
                                <h3 className={styles.cardTitle}>{project.name}</h3>
                                {project.description && (
                                    <p className={styles.cardDesc}>{project.description}</p>
                                )}
                                <div className={styles.cardMeta}>
                                    <span>{new Date(project.created_at).toLocaleDateString()}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showModal && (
                <div className={styles.modalOverlay} onClick={() => setShowModal(false)}>
                    <div className={styles.modal} onClick={e => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h2 className={styles.modalTitle}>Create New Project</h2>
                            <button
                                className={styles.closeBtn}
                                onClick={() => setShowModal(false)}
                            >
                                ×
                            </button>
                        </div>
                        <form onSubmit={handleCreate}>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Project Name</label>
                                <input
                                    className={styles.input}
                                    value={newProjectName}
                                    onChange={e => setNewProjectName(e.target.value)}
                                    placeholder="e.g. Q4 Marketing"
                                    required
                                    autoFocus
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Description (Optional)</label>
                                <input
                                    className={styles.input}
                                    value={newProjectDesc}
                                    onChange={e => setNewProjectDesc(e.target.value)}
                                    placeholder="Brief description..."
                                />
                            </div>
                            <div className={styles.modalActions}>
                                <button
                                    type="button"
                                    className={styles.cancelBtn}
                                    onClick={() => setShowModal(false)}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className={styles.submitBtn}
                                    disabled={!newProjectName.trim() || creating}
                                >
                                    {creating ? 'Creating...' : 'Create Project'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
