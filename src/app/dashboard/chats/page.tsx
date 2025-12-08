'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient, Conversation } from '@/lib/supabase';
import styles from './page.module.css';

export default function ChatsPage() {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadChats();
    }, []);

    async function loadChats() {
        const supabase = createBrowserClient();
        const { data, error } = await supabase
            .from('conversations')
            .select('*')
            .order('updated_at', { ascending: false });

        if (data) setConversations(data);
        setLoading(false);
    }

    if (loading) return <div className={styles.loading}>Loading chats...</div>;

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1>Chat History</h1>
                <p>Your past conversations with Lulo</p>
            </header>

            <div className={styles.grid}>
                {conversations.length === 0 ? (
                    <div className={styles.empty}>
                        <span>💬</span>
                        <h3>No chats yet</h3>
                        <p>Start talking to Lulo in the extension to see history here.</p>
                    </div>
                ) : (
                    conversations.map(chat => (
                        <a href={`/dashboard/chats/${chat.id}`} key={chat.id} className={styles.card}>
                            <div className={styles.icon}>💬</div>
                            <div className={styles.info}>
                                <h3>{chat.title || 'Untitled Conversation'}</h3>
                                <span className={styles.date}>
                                    {new Date(chat.updated_at).toLocaleDateString()}
                                </span>
                            </div>
                            <div className={styles.arrow}>→</div>
                        </a>
                    ))
                )}
            </div>
        </div>
    );
}
