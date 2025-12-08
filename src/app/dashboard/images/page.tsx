'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@/lib/supabase';
import styles from './page.module.css';

interface ImageItem {
    id: string;
    title: string;
    url: string;
    created_at: string;
}

export default function ImagesPage() {
    const [images, setImages] = useState<ImageItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedImage, setSelectedImage] = useState<ImageItem | null>(null);

    useEffect(() => {
        loadImages();
    }, []);

    async function loadImages() {
        const supabase = createBrowserClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        try {
            const res = await fetch('/api/images', {
                headers: { 'Authorization': `Bearer ${session.access_token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setImages(data.images || []);
            }
        } catch (e) {
            console.error('Error loading images', e);
        } finally {
            setLoading(false);
        }
    }

    // Copy Link
    function copyLink(url: string) {
        navigator.clipboard.writeText(url);
        alert('Link copied to clipboard! 📋');
    }

    if (loading) return <div className={styles.loading}>Loading gallery...</div>;

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1 className={styles.title}>Your Screenshots</h1>
                <p className={styles.subtitle}>Captured moments from the web.</p>
            </header>

            {images.length === 0 ? (
                <div className={styles.emptyState}>
                    <span className={styles.emptyIcon}>🖼️</span>
                    <h2>No saved images</h2>
                    <p>Use the 📷 button in the Lulo extension to snap and save screenshots.</p>
                </div>
            ) : (
                <div className={styles.grid}>
                    {images.map(img => (
                        <div key={img.id} className={styles.card} onClick={() => setSelectedImage(img)}>
                            <div className={styles.thumbnail}>
                                <img src={img.url} alt={img.title} loading="lazy" />
                            </div>
                            <div className={styles.cardContent}>
                                <h3 className={styles.cardTitle}>{img.title}</h3>
                                <div className={styles.cardMeta}>
                                    <span>{new Date(img.created_at).toLocaleDateString()}</span>
                                    <button
                                        className={styles.copyBtn}
                                        onClick={(e) => { e.stopPropagation(); copyLink(img.url); }}
                                    >
                                        🔗 Link
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Lightbox / Modal */}
            {selectedImage && (
                <div className={styles.modalOverlay} onClick={() => setSelectedImage(null)}>
                    <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                        <button className={styles.closeBtn} onClick={() => setSelectedImage(null)}>×</button>
                        <img src={selectedImage.url} className={styles.fullImage} alt={selectedImage.title} />
                        <div className={styles.actionRow}>
                            <a href={selectedImage.url} download target="_blank" className={styles.downloadBtn}>⬇️ Download</a>
                            <button onClick={() => copyLink(selectedImage.url)} className={styles.copyBtn}>🔗 Copy Link</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
