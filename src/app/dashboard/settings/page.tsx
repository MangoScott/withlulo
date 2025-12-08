'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@/lib/supabase';
import styles from './page.module.css';

interface ApiKey {
    id: string;
    key_hash: string;
    label: string;
    created_at: string;
}

export default function SettingsPage() {
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [displayName, setDisplayName] = useState('');
    const [savingProfile, setSavingProfile] = useState(false);

    // API Keys State
    const [keys, setKeys] = useState<ApiKey[]>([]);
    const [loadingKeys, setLoadingKeys] = useState(true);
    const [generatingKey, setGeneratingKey] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        const supabase = createBrowserClient();
        const { data: { session } } = await supabase.auth.getSession();

        if (session) {
            setUser(session.user);
            // Pre-fill display name (from metadata or profile table if we had one synced)
            // For now, Supabase user metadata is the source of truth for auth
            setDisplayName(session.user.user_metadata?.full_name || '');

            fetchKeys(session.access_token);
        }
        setLoading(false);
    }

    async function fetchKeys(token: string) {
        try {
            const response = await fetch('/api/auth/apikey', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setKeys(data.keys || []);
            }
        } catch (error) {
            console.error('Error fetching keys:', error);
        } finally {
            setLoadingKeys(false);
        }
    }

    async function updateProfile(e: React.FormEvent) {
        e.preventDefault();
        setSavingProfile(true);
        try {
            const supabase = createBrowserClient();
            const { error } = await supabase.auth.updateUser({
                data: { full_name: displayName }
            });

            if (error) throw error;
            alert('Profile updated!');
        } catch (error) {
            console.error('Error updating profile:', error);
            alert('Failed to update profile.');
        } finally {
            setSavingProfile(false);
        }
    }

    async function generateKey() {
        setGeneratingKey(true);
        try {
            // For POST, the existing API uses session cookie or we pass auth header?
            // Route uses withAuth, which checks headers or cookies. 
            // Client-side fetch usually sends cookies if credentials: include, but Next.js handler might need header.
            // Let's get the token again to be safe.
            const supabase = createBrowserClient();
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const response = await fetch('/api/auth/apikey', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${session.access_token}` }
            });

            if (response.ok) {
                fetchKeys(session.access_token); // Refresh list
            }
        } catch (error) {
            console.error('Error creating key:', error);
        } finally {
            setGeneratingKey(false);
        }
    }

    async function deleteKey(id: string) {
        if (!confirm('Are you sure you want to delete this API Key? integrations using it will stop working.')) return;

        try {
            const supabase = createBrowserClient();
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const response = await fetch(`/api/auth/apikey?id=${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${session.access_token}` }
            });

            if (response.ok) {
                setKeys(prev => prev.filter(k => k.id !== id));
            }
        } catch (error) {
            console.error('Error deleting key:', error);
        }
    }

    if (loading) return <div className={styles.container}>Loading...</div>;

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1 className={styles.title}>Settings</h1>
                <p className={styles.subtitle}>Manage your profile and implementation details</p>
            </header>

            {/* Profile Section */}
            <section className={styles.section}>
                <div className={styles.sectionHeader}>
                    <h2 className={styles.sectionTitle}>Profile</h2>
                    <p className={styles.sectionDesc}>Update your personal information</p>
                </div>
                <form onSubmit={updateProfile}>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Display Name</label>
                        <input
                            className={styles.input}
                            value={displayName}
                            onChange={e => setDisplayName(e.target.value)}
                            placeholder="Your Name"
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Email</label>
                        <input
                            className={styles.input}
                            value={user?.email}
                            disabled
                            style={{ background: '#f5f5f5', cursor: 'not-allowed' }}
                        />
                    </div>
                    <button type="submit" className={styles.saveBtn} disabled={savingProfile}>
                        {savingProfile ? 'Saving...' : 'Save Changes'}
                    </button>
                </form>
            </section>

            {/* API Keys Section */}
            <section className={styles.section}>
                <div className={styles.sectionHeader} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <h2 className={styles.sectionTitle}>API Keys</h2>
                        <p className={styles.sectionDesc}>Manage keys for the Lulo Extension or other integrations</p>
                    </div>
                    <button className={styles.createKeyBtn} onClick={generateKey} disabled={generatingKey}>
                        {generatingKey ? 'Generating...' : '+ New Key'}
                    </button>
                </div>

                <div className={styles.keyList}>
                    {loadingKeys ? (
                        <div className={styles.emptyKeys}>Loading keys...</div>
                    ) : keys.length === 0 ? (
                        <div className={styles.emptyKeys}>No API keys found. Create one to get started.</div>
                    ) : (
                        keys.map(key => (
                            <div key={key.id} className={styles.keyItem}>
                                <div className={styles.keyInfo}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span className={styles.keyLabel}>{key.label || 'API Key'}</span>
                                        <code className={styles.keyValue}>{key.key_hash.substring(0, 10)}...</code>
                                    </div>
                                    <span className={styles.keyDate}>Created {new Date(key.created_at).toLocaleDateString()}</span>
                                </div>
                                <button className={styles.deleteBtn} onClick={() => deleteKey(key.id)} title="Revoke Key">
                                    🗑️
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </section>
        </div>
    );
}
