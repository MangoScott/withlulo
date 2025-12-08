'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@/lib/supabase';
import styles from './page.module.css';

export default function DashboardHomePage() {
    const [userName, setUserName] = useState<string>('');
    const [showText, setShowText] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadUser();
    }, []);

    async function loadUser() {
        try {
            const supabase = createBrowserClient();
            const { data: { session } } = await supabase.auth.getSession();

            if (session?.user) {
                const fullName = session.user.user_metadata?.full_name;
                const firstName = (typeof fullName === 'string' && fullName)
                    ? fullName.split(' ')[0]
                    : session.user.email?.split('@')[0] || 'friend';
                setUserName(firstName);
            }
        } catch (error) {
            console.error('Error loading user:', error);
        } finally {
            setLoading(false);
            // Trigger text animation after wand settles
            setTimeout(() => setShowText(true), 1500);
        }
    }

    if (loading) {
        return (
            <div className={styles.loadingContainer}>
                <span className={styles.loadingWand}>🪄</span>
            </div>
        );
    }

    return (
        <div className={styles.welcomeContainer}>
            {/* Sparkle particles */}
            <div className={styles.particles}>
                {[...Array(20)].map((_, i) => (
                    <div
                        key={i}
                        className={styles.particle}
                        style={{
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                            animationDelay: `${Math.random() * 3}s`,
                            animationDuration: `${2 + Math.random() * 2}s`
                        }}
                    />
                ))}
            </div>

            {/* Animated Wand */}
            <div className={styles.wandContainer}>
                <span className={styles.wand}>🪄</span>
                <div className={styles.wandGlow} />
            </div>

            {/* Welcome Text */}
            <div className={`${styles.welcomeText} ${showText ? styles.visible : ''}`}>
                <h1 className={styles.greeting}>
                    Hello, <span className={styles.name}>{userName}</span>
                </h1>
                <p className={styles.subtitle}>Welcome to Lulo</p>
            </div>

            {/* Quick Actions */}
            <div className={`${styles.quickActions} ${showText ? styles.visible : ''}`}>
                <p className={styles.hint}>✨ What would you like to create today?</p>
            </div>
        </div>
    );
}
