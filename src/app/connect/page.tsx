'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';

export default function ConnectPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [apiKey, setApiKey] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [connected, setConnected] = useState(false);
    const [isHandshaking, setIsHandshaking] = useState(false);

    useEffect(() => {
        checkAuthAndLoadKey();
    }, []);

    async function checkAuthAndLoadKey() {
        const supabase = createBrowserClient();
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
            // Forward ext_id if present
            const params = new URLSearchParams(window.location.search);
            const extId = params.get('ext_id');
            router.push(`/login?next=/connect${extId ? `&ext_id=${extId}` : ''}`);
            return;
        }

        // Use the session access token directly for extension auth
        // This is a valid JWT that can authenticate API requests
        const token = session.access_token;
        setApiKey(token);

        // Attempt Magic Handshake with extension
        const params = new URLSearchParams(window.location.search);
        const extId = params.get('ext_id');
        if (extId && token) {
            attemptHandshake(extId, token);
        }

        setLoading(false);
    }

    async function generateKey(token: string) {
        try {
            const res = await fetch('/api/auth/apikey', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            return data.key;
        } catch (err) {
            alert('Failed to generate key');
            return null;
        }
    }

    function attemptHandshake(extId: string, token: string) {
        // Show loading state while attempting
        setIsHandshaking(true);

        // Timeout to show fallback if it takes too long
        const fallbackTimer = setTimeout(() => {
            setIsHandshaking(false);
        }, 4000);

        try {
            if ((window as any).chrome && (window as any).chrome.runtime) {
                (window as any).chrome.runtime.sendMessage(extId, {
                    type: 'LULO_AUTH_TOKEN',
                    token: token
                }, (response: any) => {
                    clearTimeout(fallbackTimer);
                    if (response && response.success) {
                        setConnected(true);
                        // Try to close window automatically after a brief moment
                        // Redirect to Dashboard (not landing page)
                        setTimeout(() => router.push('/dashboard'), 1500);
                    } else {
                        setIsHandshaking(false);
                    }
                });
            } else {
                clearTimeout(fallbackTimer);
                setIsHandshaking(false);
            }
        } catch (e) {
            clearTimeout(fallbackTimer);
            setIsHandshaking(false);
        }
    }

    function copyToClipboard() {
        if (!apiKey) return;
        navigator.clipboard.writeText(apiKey);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }

    if (loading) return (
        <div className={styles.container}>
            <div className={styles.card} style={{ textAlign: 'center', minHeight: '300px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                Loading...
            </div>
        </div>
    );

    if (connected) {
        return (
            <div className={styles.container}>
                <div className={styles.card} style={{ textAlign: 'center', padding: '60px 40px' }}>
                    <div className={styles.icon} style={{ fontSize: '64px', marginBottom: '20px' }}>✅</div>
                    <h1>Connected!</h1>
                    <p className={styles.instruction}>
                        Redirecting to dashboard...
                    </p>
                    <button
                        onClick={() => router.push('/dashboard')}
                        className={styles.copyBtn}
                        style={{ background: '#2D2B3A', marginTop: '16px' }}
                    >
                        Go to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    if (isHandshaking) {
        return (
            <div className={styles.container}>
                <div className={styles.card} style={{ textAlign: 'center', padding: '60px 40px' }}>
                    <div className={styles.icon} style={{ fontSize: '48px', marginBottom: '20px', animation: 'spin 2s linear infinite' }}>🔮</div>
                    <style jsx>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
                    <h1>Linking...</h1>
                    <p className={styles.instruction}>Connecting to Lulo Extension...</p>
                </div>
            </div>
        );
    }

    // Fallback / Error State
    return (
        <div className={styles.container}>
            <div className={styles.card}>
                <div className={styles.header}>
                    <span className={styles.icon}>🔌</span>
                    <h1>Connect Lulo</h1>
                </div>

                <p className={styles.instruction}>
                    We couldn't connect automatically. Please ensure the extension is installed and try refreshing.
                </p>

                <div style={{ textAlign: 'center' }}>
                    <button onClick={() => window.location.reload()} className={styles.copyBtn}>
                        Try Again
                    </button>
                </div>

                <details style={{ marginTop: '32px', textAlign: 'center', color: '#7A7589', fontSize: '13px', cursor: 'pointer' }}>
                    <summary>Advanced: Connect Manually</summary>
                    <div className={styles.keyBox} style={{ marginTop: '16px' }}>
                        <code className={styles.key}>{apiKey}</code>
                        <button
                            onClick={copyToClipboard}
                            className={`${styles.copyBtn} ${copied ? styles.copied : ''}`}
                        >
                            {copied ? 'Copied!' : 'Copy'}
                        </button>
                    </div>
                </details>
            </div>
        </div>
    );
}
