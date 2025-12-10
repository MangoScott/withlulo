'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient, Site } from '@/lib/supabase';
import styles from './page.module.css';
import Link from 'next/link';

export default function SitesPage() {
    const [sites, setSites] = useState<Site[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadSites();
    }, []);

    async function loadSites() {
        try {
            const supabase = createBrowserClient();
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const response = await fetch('/api/sites', {
                headers: { 'Authorization': `Bearer ${session.access_token}` }
            });

            if (response.ok) {
                const data = await response.json();
                setSites(data.sites || []);
            }
        } catch (error) {
            console.error('Error loading sites:', error);
        } finally {
            setLoading(false);
        }
    }

    async function handleDelete(id: string) {
        if (!confirm('Are you sure you want to delete this site?')) return;

        try {
            const supabase = createBrowserClient();
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            setSites(prev => prev.filter(s => s.id !== id));

            await fetch(`/api/sites/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${session.access_token}` }
            });
        } catch (error) {
            console.error('Error deleting site:', error);
            loadSites();
        }
    }

    async function handleTogglePublish(site: Site) {
        try {
            const supabase = createBrowserClient();
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            // Optimistic update
            setSites(prev => prev.map(s =>
                s.id === site.id ? { ...s, published: !s.published } : s
            ));

            await fetch(`/api/sites/${site.id}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ published: !site.published })
            });
        } catch (error) {
            console.error('Error updating site:', error);
            loadSites();
        }
    }

    if (loading) {
        return (
            <div className={styles.loading}>
                <span className={styles.loadingIcon}>🌐</span>
                <p>Loading your sites...</p>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div className={styles.headerContent}>
                    <div>
                        <h1 className={styles.title}>🌐 My Sites</h1>
                        <p className={styles.subtitle}>Create and manage your landing pages</p>
                    </div>
                    <Link href="/dashboard/sites/new" className={styles.createBtn}>
                        ✨ Create New Site
                    </Link>
                </div>
            </header>

            {sites.length === 0 ? (
                <div className={styles.emptyState}>
                    <span className={styles.emptyIcon}>🎨</span>
                    <h2>No sites yet</h2>
                    <p>Create your first stunning landing page in seconds!</p>
                    <Link href="/dashboard/sites/new" className={styles.createBtnLarge}>
                        ✨ Create Your First Site
                    </Link>
                </div>
            ) : (
                <div className={styles.grid}>
                    {sites.map((site) => (
                        <div key={site.id} className={styles.card}>
                            <div className={styles.cardPreview}>
                                <iframe
                                    srcDoc={site.html_content || ''}
                                    className={styles.previewFrame}
                                    title={site.title}
                                    sandbox="allow-same-origin"
                                />
                                <div className={styles.previewOverlay} />
                            </div>

                            <div className={styles.cardContent}>
                                <h3 className={styles.cardTitle}>{site.title}</h3>
                                <p className={styles.cardType}>{site.business_type?.replace('-', ' ')}</p>

                                <div className={styles.cardStatus}>
                                    <span className={`${styles.statusBadge} ${site.published ? styles.published : styles.draft}`}>
                                        {site.published ? '🟢 Published' : '📝 Draft'}
                                    </span>
                                    {site.published && (
                                        <span className={styles.viewCount}>👁️ {site.view_count} views</span>
                                    )}
                                </div>

                                <div className={styles.cardActions}>
                                    <Link href={`/dashboard/sites/${site.id}`} className={styles.actionBtn}>
                                        Edit
                                    </Link>
                                    {site.published && (
                                        <a
                                            href={site.subdomain ? `https://${site.subdomain}.heylulo.com` : `/s/${site.slug}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className={styles.actionBtn}
                                        >
                                            View
                                        </a>
                                    )}
                                    <button
                                        onClick={() => handleTogglePublish(site)}
                                        className={`${styles.actionBtn} ${styles.publishBtn}`}
                                    >
                                        {site.published ? 'Unpublish' : 'Publish'}
                                    </button>
                                    <button
                                        onClick={() => handleDelete(site.id)}
                                        className={`${styles.actionBtn} ${styles.deleteBtn}`}
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
