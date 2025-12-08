'use client';

import { useEffect } from 'react';
import { createBrowserClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';

export default function LoginPage() {
    const router = useRouter();

    useEffect(() => {
        // Check if already logged in
        checkAuth();
    }, []);

    async function checkAuth() {
        const supabase = createBrowserClient();
        const { data: { session } } = await supabase.auth.getSession();

        if (session) {
            const params = new URLSearchParams(window.location.search);
            const next = params.get('next');
            router.push(next || '/dashboard');
        }
    }

    async function handleGoogleLogin() {
        const supabase = createBrowserClient();
        const params = new URLSearchParams(window.location.search);
        const next = params.get('next');
        const redirectTo = `${window.location.origin}/auth/callback${next ? `?next=${next}` : ''}`;

        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo }
        });

        if (error) {
            console.error('Login error:', error);
            if (error.message && error.message.includes('not enabled')) {
                alert('⚠️ Google Auth is disabled in Supabase. Please enable it in Authentication > Providers.');
            } else {
                alert('Login failed. Please try again.');
            }
        }
    }

    async function handleGitHubLogin() {
        const supabase = createBrowserClient();

        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'github',
            options: {
                redirectTo: `${window.location.origin}/auth/callback`
            }
        });

        if (error) {
            console.error('Login error:', error);
            alert('Login failed. Please try again.');
        }
    }

    return (
        <div className={styles.container}>
            <div className={styles.card}>
                <div className={styles.logo}>
                    <span className={styles.logoIcon}>🪄</span>
                    <h1 className={styles.logoText}>Hey Lulo</h1>
                </div>

                <p className={styles.tagline}>
                    Your recordings, chats & projects — synced everywhere
                </p>

                <div className={styles.buttons}>
                    <button onClick={handleGoogleLogin} className={styles.googleBtn}>
                        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4" />
                            <path d="M9.003 18c2.43 0 4.467-.806 5.956-2.18l-2.909-2.259c-.806.54-1.836.86-3.047.86-2.344 0-4.328-1.584-5.036-3.711H.96v2.332C2.44 15.983 5.485 18 9.003 18z" fill="#34A853" />
                            <path d="M3.964 10.712c-.18-.54-.282-1.117-.282-1.71 0-.593.102-1.17.282-1.71V4.96H.957C.347 6.175 0 7.55 0 9.002c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05" />
                            <path d="M9.003 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.464.891 11.428 0 9.002 0 5.485 0 2.44 2.017.96 4.958l3.007 2.332c.708-2.127 2.692-3.71 5.036-3.71z" fill="#EA4335" />
                        </svg>
                        Continue with Google
                    </button>

                    <button onClick={handleGitHubLogin} className={styles.githubBtn}>
                        <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
                            <path fillRule="evenodd" clipRule="evenodd" d="M9 0C4.03 0 0 4.03 0 9c0 3.98 2.58 7.35 6.16 8.54.45.08.62-.2.62-.43v-1.52c-2.5.54-3.03-1.2-3.03-1.2-.41-1.04-1-1.32-1-1.32-.82-.56.06-.55.06-.55.9.06 1.38.93 1.38.93.8 1.38 2.1.98 2.62.75.08-.58.31-.98.57-1.2-2-.23-4.1-1-4.1-4.45 0-.98.35-1.78.93-2.41-.1-.22-.4-1.14.08-2.38 0 0 .76-.24 2.48.92.72-.2 1.49-.3 2.26-.3.76 0 1.54.1 2.26.3 1.72-1.16 2.48-.92 2.48-.92.49 1.24.18 2.16.09 2.38.58.63.92 1.43.92 2.41 0 3.46-2.1 4.22-4.11 4.44.32.28.61.83.61 1.67v2.47c0 .24.16.52.62.43C15.42 16.35 18 12.98 18 9c0-4.97-4.03-9-9-9z" />
                        </svg>
                        Continue with GitHub
                    </button>
                </div>

                <p className={styles.terms}>
                    By continuing, you agree to our Terms of Service and Privacy Policy
                </p>
            </div>

            <div className={styles.features}>
                <div className={styles.feature}>
                    <span className={styles.featureIcon}>🎬</span>
                    <h3>Cloud Recordings</h3>
                    <p>Save & share your Loom-style recordings</p>
                </div>
                <div className={styles.feature}>
                    <span className={styles.featureIcon}>💬</span>
                    <h3>Chat History</h3>
                    <p>Access your Lulo conversations anywhere</p>
                </div>
                <div className={styles.feature}>
                    <span className={styles.featureIcon}>📁</span>
                    <h3>Organized Projects</h3>
                    <p>Keep everything neatly organized</p>
                </div>
            </div>
        </div>
    );
}
