'use client';
export const runtime = 'edge';

import { useEffect, useState } from 'react';
import styles from './page.module.css';

interface PublicRecording {
    id: string;
    title: string;
    description: string | null;
    video_url: string;
    thumbnail_url: string | null;
    view_count: number;
    created_at: string;
    author: {
        display_name: string;
        avatar_url: string | null;
    };
}

export default function PublicVideoPage({
    params
}: {
    params: Promise<{ slug: string }>
}) {
    const [recording, setRecording] = useState<PublicRecording | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Unwrap params using React.use() or await (Next.js 15 pattern)
    // Since this is a client component, we handle the promise in useEffect
    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        try {
            const { slug } = await params;
            const response = await fetch(`/api/share/${slug}`);

            if (!response.ok) {
                throw new Error('Recording not found');
            }

            const data = await response.json();
            setRecording(data.recording);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load video');
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return (
            <div className={styles.container}>
                <div className={styles.loading}>
                    <span className={styles.loadingIcon}>🎬</span>
                    <p>Loading video...</p>
                </div>
            </div>
        );
    }

    if (error || !recording) {
        return (
            <div className={styles.container}>
                <div className={styles.error}>
                    <span className={styles.errorIcon}>😕</span>
                    <h1>Video not found</h1>
                    <p>This link might be private or expired.</p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div className={styles.logo}>
                    <span>🪄</span> Lulo
                </div>
                {recording && (
                    <a
                        href={recording.video_url}
                        download={`recording-${recording.id}.webm`}
                        className={styles.downloadBtn}
                    >
                        Download ⬇️
                    </a>
                )}
            </header>

            <main className={styles.main}>
                <div className={styles.videoWrapper}>
                    <video
                        controls
                        autoPlay
                        className={styles.video}
                        poster={recording.thumbnail_url || undefined}
                    >
                        <source src={recording.video_url} type="video/webm" />
                        <source src={recording.video_url} type="video/mp4" />
                        Your browser does not support the video tag.
                    </video>
                </div>

                <div className={styles.info}>
                    <h1 className={styles.title}>{recording.title}</h1>

                    <div className={styles.meta}>
                        <div className={styles.author}>
                            {recording.author.avatar_url ? (
                                <img src={recording.author.avatar_url} alt="" className={styles.avatar} />
                            ) : (
                                <div className={styles.avatarPlaceholder}>
                                    {recording.author.display_name[0].toUpperCase()}
                                </div>
                            )}
                            <div className={styles.authorInfo}>
                                <span className={styles.name}>{recording.author.display_name}</span>
                                <span className={styles.date}>
                                    {new Date(recording.created_at).toLocaleDateString()}
                                </span>
                            </div>
                        </div>

                        <div className={styles.stats}>
                            <span>👁 {recording.view_count} views</span>
                        </div>
                    </div>

                    {recording.description && (
                        <p className={styles.description}>{recording.description}</p>
                    )}
                </div>
            </main>
        </div>
    );
}
