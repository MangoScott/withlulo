'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase';

function CallbackContent() {
    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        const handleCallback = async () => {
            const supabase = createBrowserClient();
            const code = searchParams.get('code');
            const next = searchParams.get('next') || '/dashboard';

            if (code) {
                // Exchange code for session
                try {
                    const { error } = await supabase.auth.exchangeCodeForSession(code);
                    if (error) throw error;

                    // Redirect only after successful exchange
                    router.push(next);
                } catch (err) {
                    console.error('Auth error:', err);
                    router.push('/login?error=auth_callback_error');
                }
            } else {
                // Fallback: Check if we already have a session (e.g. Implicit flow or already logged in)
                const { data: { session } } = await supabase.auth.getSession();
                if (session) {
                    router.push(next);
                } else {
                    // Listen for auth state changes (Magic Link or Implicit hash)
                    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
                        if (event === 'SIGNED_IN') {
                            router.push(next);
                        }
                    });
                    return () => subscription.unsubscribe();
                }
            }
        };

        handleCallback();
    }, [router, searchParams]);

    return (
        <div style={{
            height: '100vh',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            background: '#FAF8F5',
            color: '#8B6DB8',
            fontFamily: 'Inter, sans-serif'
        }}>
            <h2 style={{ marginBottom: '16px', fontSize: '24px', fontWeight: '600' }}>Connecting...</h2>
            <div style={{ fontSize: '48px', animation: 'pulse 2s infinite' }}>🪄</div>
            <style jsx>{`
                @keyframes pulse {
                    0% { transform: scale(1); opacity: 1; }
                    50% { transform: scale(1.1); opacity: 0.8; }
                    100% { transform: scale(1); opacity: 1; }
                }
            `}</style>
        </div>
    );
}

export default function AuthCallbackPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <CallbackContent />
        </Suspense>
    );
}
