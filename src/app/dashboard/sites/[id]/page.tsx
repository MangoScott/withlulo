'use client';

export const runtime = 'edge';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createBrowserClient, Site } from '@/lib/supabase';
import styles from './page.module.css';
import Link from 'next/link';
import SiteWizard from '@/components/Dashboard/SiteWizard';

export default function SiteDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [site, setSite] = useState<Site | null>(null);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        loadSite();
    }, [params.id]);

    async function loadSite() {
        try {
            const supabase = createBrowserClient();
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const response = await fetch(`/api/sites/${params.id}`, {
                headers: { 'Authorization': `Bearer ${session.access_token}` }
            });

            if (response.ok) {
                const data = await response.json();
                setSite(data.site);
            }
        } catch (error) {
            console.error('Error loading site:', error);
        } finally {
            setLoading(false);
        }
    }

    async function handleTogglePublish() {
        if (!site) return;

        try {
            const supabase = createBrowserClient();
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            setSite({ ...site, published: !site.published });

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
            loadSite();
        }
    }

    async function handleDelete() {
        if (!site || !confirm('Are you sure you want to delete this site?')) return;

        try {
            const supabase = createBrowserClient();
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            await fetch(`/api/sites/${site.id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${session.access_token}` }
            });

            router.push('/dashboard/sites');
        } catch (error) {
            console.error('Error deleting site:', error);
        }
    }

    function copyLink() {
        if (!site) return;
        // Use subdomain URL if subdomain is set, otherwise fallback to slug
        const url = site.subdomain
            ? `https://${site.subdomain}.heylulo.com`
            : `${window.location.origin}/s/${site.slug}`;
        navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }

    if (loading) {
        return (
            <div className={styles.loading}>
                <span className={styles.loadingIcon}>🌐</span>
                <p>Loading site...</p>
            </div>
        );
    }

    if (!site) {
        return (
            <div className={styles.notFound}>
                <h2>Site not found</h2>
                <Link href="/dashboard/sites">← Back to Sites</Link>
            </div>
        );
    }

    if (isEditing) {
        return (
            <div className={styles.container}>
                <div className={styles.header}>
                    <h1 className={styles.title}>Editing {site.title}</h1>
                </div>
                <SiteWizard
                    mode="edit"
                    initialData={site}
                    onCancel={() => setIsEditing(false)}
                    onSuccess={(updatedSite) => {
                        setSite(updatedSite);
                        setIsEditing(false);
                    }}
                />
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <Link href="/dashboard/sites" className={styles.backLink}>
                ← Back to Sites
            </Link>

            <div className={styles.header}>
                <div className={styles.headerInfo}>
                    <h1 className={styles.title}>{site.title}</h1>
                    <p className={styles.type}>{site.business_type?.replace('-', ' ')}</p>
                    <div className={styles.status}>
                        <span className={`${styles.badge} ${site.published ? styles.published : styles.draft}`}>
                            {site.published ? '🟢 Published' : '📝 Draft'}
                        </span>
                        {site.published && (
                            <span className={styles.views}>👁️ {site.view_count} views</span>
                        )}
                    </div>
                </div>

                <div className={styles.actions}>
                    <button
                        className={styles.copyBtn}
                        onClick={copyLink}
                        disabled={!site.published}
                    >
                        {copied ? '✓ Copied!' : '📋 Copy Link'}
                    </button>

                    <button
                        className={styles.regenerateBtn}
                        onClick={() => setIsEditing(true)}
                    >
                        ✏️ Edit Content
                    </button>

                    <button
                        className={`${styles.publishBtn} ${site.published ? styles.unpublish : ''}`}
                        onClick={handleTogglePublish}
                    >
                        {site.published ? 'Unpublish' : '🚀 Publish'}
                    </button>
                    <button className={styles.deleteBtn} onClick={handleDelete}>
                        🗑️ Delete
                    </button>
                </div>
            </div>

            {site.published && (
                <div className={styles.linkBar}>
                    <span className={styles.linkLabel}>Live URL:</span>
                    <a
                        href={site.subdomain ? `https://${site.subdomain}.heylulo.com` : `/s/${site.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.liveLink}
                    >
                        {site.subdomain ? `${site.subdomain}.heylulo.com` : `heylulo.com/s/${site.slug}`}
                    </a>
                </div>
            )}

            <div className={styles.previewWrapper}>
                <div className={styles.browserBar}>
                    <div className={styles.dots}>
                        <span></span><span></span><span></span>
                    </div>
                    <div className={styles.urlBar}>
                        {site.subdomain ? `${site.subdomain}.heylulo.com` : `heylulo.com/s/${site.slug}`}
                    </div>
                </div>
                <iframe
                    srcDoc={site.html_content || ''}
                    className={styles.preview}
                    title="Site Preview"
                />
            </div>
        </div>
    );
}
