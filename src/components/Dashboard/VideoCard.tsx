'use client';

import { useState, useEffect, useRef } from 'react';
import styles from './VideoCard.module.css';
import { Recording, Project } from '@/lib/supabase';

interface RecordingWithUrls extends Recording {
    thumbnail_url?: string;
    video_url?: string;
}

interface VideoCardProps {
    recording: RecordingWithUrls;
    projects: Project[];
    onUpdate: (id: string, updates: Partial<Recording>) => void;
    onDelete: (id: string) => void;
}

export default function VideoCard({ recording, projects, onUpdate, onDelete }: VideoCardProps) {
    const [showMenu, setShowMenu] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editTitle, setEditTitle] = useState(recording.title);
    const menuRef = useRef<HTMLDivElement>(null);

    // Close menu when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setShowMenu(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    function formatDuration(seconds: number | null): string {
        if (!seconds) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    function formatDate(dateStr: string): string {
        return new Date(dateStr).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric'
        });
    }

    async function handleRename(e: React.FormEvent) {
        e.preventDefault();
        onUpdate(recording.id, { title: editTitle });
        setIsEditing(false);
        setShowMenu(false);
    }

    async function copyLink() {
        const url = `${window.location.origin}/v/${recording.share_slug}`;
        await navigator.clipboard.writeText(url);
        alert('Link copied!');
        setShowMenu(false);
    }

    return (
        <div className={styles.card}>
            <div className={styles.thumbnail}>
                {recording.thumbnail_url ? (
                    <img src={recording.thumbnail_url} alt="" />
                ) : (
                    <div className={styles.thumbnailPlaceholder}><span>🎬</span></div>
                )}
                <span className={styles.duration}>
                    {formatDuration(recording.duration_seconds)}
                </span>
                {recording.status === 'processing' && (
                    <span className={styles.processing}>Processing...</span>
                )}
            </div>

            <button
                className={`${styles.menuBtn} ${showMenu ? styles.active : ''}`}
                onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
            >
                ⋮
            </button>

            {showMenu && (
                <div className={styles.dropdown} ref={menuRef}>
                    <button className={styles.dropdownItem} onClick={() => { setIsEditing(true); setShowMenu(false); }}>
                        ✏️ Rename
                    </button>
                    {projects.length > 0 && projects.map(p => (
                        <button key={p.id} className={styles.dropdownItem} onClick={() => { onUpdate(recording.id, { project_id: p.id }); setShowMenu(false); }}>
                            📁 Move to {p.name}
                        </button>
                    ))}
                    {recording.project_id && (
                        <button className={styles.dropdownItem} onClick={() => { onUpdate(recording.id, { project_id: null }); setShowMenu(false); }}>
                            🏠 Remove from Project
                        </button>
                    )}
                    <button className={styles.dropdownItem} onClick={() => {
                        // Handle Download
                        const format = recording.mp4_key ? 'mp4' : 'webm';
                        fetch(`/api/recordings/download?id=${recording.id}&format=${format}`)
                            .then(res => res.json())
                            .then(data => {
                                if (data.url) {
                                    const a = document.createElement('a');
                                    a.href = data.url;
                                    a.download = data.filename || `video.${format}`;
                                    document.body.appendChild(a);
                                    a.click();
                                    document.body.removeChild(a);
                                } else {
                                    alert('Download failed: ' + (data.error || 'Unknown error'));
                                }
                            })
                            .catch(err => alert('Error: ' + err.message));
                        setShowMenu(false);
                    }}>
                        ⬇️ Download {recording.mp4_key ? 'MP4' : 'Video'}
                    </button>
                    <button className={`${styles.dropdownItem} ${styles.delete}`} onClick={() => onDelete(recording.id)}>
                        🗑️ Delete
                    </button>
                </div>
            )}

            <div className={styles.cardContent}>
                {isEditing ? (
                    <form onSubmit={handleRename}>
                        <input
                            className={styles.editInput}
                            value={editTitle}
                            onChange={e => setEditTitle(e.target.value)}
                            autoFocus
                            onBlur={() => setIsEditing(false)}
                        />
                    </form>
                ) : (
                    <h3 className={styles.cardTitle}>{recording.title}</h3>
                )}
                <div className={styles.cardMeta}>
                    <span>{formatDate(recording.created_at)}</span>
                    {recording.is_public && (
                        <span className={styles.publicBadge}>
                            👁 {recording.view_count}
                        </span>
                    )}
                </div>
            </div>

            <div className={styles.cardActions}>
                <button
                    className={`${styles.actionBtn} ${recording.is_public ? styles.publicBtn : ''}`}
                    onClick={() => onUpdate(recording.id, { is_public: !recording.is_public })}
                >
                    {recording.is_public ? '🔓 Public' : '🔒 Private'}
                </button>
                {recording.is_public && recording.share_slug && (
                    <button className={styles.actionBtn} onClick={copyLink}>
                        📋 Copy Link
                    </button>
                )}
            </div>
        </div>
    );
}
