'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@/lib/supabase';
import styles from './layout.module.css';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

interface User {
    id: string;
    email: string;
    display_name?: string;
    avatar_url?: string;
}

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const pathname = usePathname();
    const router = useRouter();

    useEffect(() => {
        checkAuth();
    }, []);

    async function checkAuth() {
        try {
            const supabase = createBrowserClient();
            const { data: { session } } = await supabase.auth.getSession();

            if (session?.user) {
                setUser({
                    id: session.user.id,
                    email: session.user.email || '',
                    display_name: typeof session.user.user_metadata?.full_name === 'string'
                        ? session.user.user_metadata.full_name
                        : (session.user.email?.split('@')[0] || 'User'),
                    avatar_url: session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture
                });
            } else {
                // Redirect to login
                router.push('/login');
            }
        } catch (error) {
            console.error('Auth error:', error);
        } finally {
            setLoading(false);
        }
    }

    async function handleLogout() {
        const supabase = createBrowserClient();
        await supabase.auth.signOut();
        router.push('/login');
    }

    if (loading) {
        return (
            <div className={styles.loadingContainer}>
                <div className={styles.loadingSpinner}>
                    <span className={styles.loadingIcon}>🪄</span>
                </div>
                <p>Loading your magic...</p>
            </div>
        );
    }

    const navItems = [
        { href: '/dashboard', icon: '🎬', label: 'Recordings' },
        { href: '/dashboard/chats', icon: '💬', label: 'Chats' },
        { href: '/dashboard/projects', icon: '📁', label: 'Projects' },
        { href: '/dashboard/images', icon: '🖼️', label: 'Images' },
    ];

    return (
        <div className={styles.container}>
            {/* Sidebar */}
            <aside className={styles.sidebar}>
                <div className={styles.logo}>
                    <span className={styles.logoIcon}>🪄</span>
                    <span className={styles.logoText}>Hey Lulo</span>
                </div>

                <nav className={styles.nav}>
                    {navItems.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`${styles.navItem} ${pathname === item.href ? styles.navItemActive : ''}`}
                        >
                            <span className={styles.navIcon}>{item.icon}</span>
                            <span>{item.label}</span>
                        </Link>
                    ))}
                </nav>

                <div className={styles.sidebarFooter}>
                    {user && (
                        <div className={styles.userInfo}>
                            {user.avatar_url ? (
                                <img src={user.avatar_url} alt="" className={styles.avatar} />
                            ) : (
                                <div className={styles.avatarPlaceholder}>
                                    {user.display_name?.[0]?.toUpperCase() || '?'}
                                </div>
                            )}
                            <div className={styles.userDetails}>
                                <span className={styles.userName}>{user.display_name}</span>
                                <span className={styles.userEmail}>{user.email}</span>
                            </div>
                        </div>
                    )}
                    <button onClick={handleLogout} className={styles.logoutBtn}>
                        Logout
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className={styles.main}>
                {children}
            </main>
        </div>
    );
}
