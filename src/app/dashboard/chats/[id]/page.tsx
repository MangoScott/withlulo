'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase';
import styles from './page.module.css';

export const runtime = 'edge';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    created_at: string;
}

export default function ChatPage() {
    const params = useParams();
    const id = params.id as string;

    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(true);
    const [input, setInput] = useState('');
    const [sending, setSending] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (id) {
            loadMessages();
        }
    }, [id]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    async function loadMessages() {
        const supabase = createBrowserClient();
        const { data, error } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', id)
            .order('created_at', { ascending: true });

        if (data) {
            setMessages(data);
        }
        setLoading(false);
    }

    async function sendMessage(e?: React.FormEvent) {
        e?.preventDefault();
        if (!input.trim() || sending) return;

        const content = input.trim();
        setInput('');
        setSending(true);

        // Optimistic UI
        const tempId = 'temp-' + Date.now();
        const optimisticMsg: Message = {
            id: tempId,
            role: 'user',
            content: content,
            created_at: new Date().toISOString()
        };
        setMessages(prev => [...prev, optimisticMsg]);

        try {
            const res = await fetch('/api/chats/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ conversationId: id, content })
            });

            if (res.ok) {
                const data = await res.json();
                // Replace optimistic or just append AI response?
                // Ideally refresh or append.
                // Since we don't have the real ID of our user msg easily without reloading or advanced state,
                // we'll just append the AI response. 
                // BUT, to be correct, we should probably re-fetch or use the returned data if we structured the API to return both?
                // The API currently returns the *assistant* message.
                // Let's reload loosely or append.
                if (data.message) {
                    setMessages(prev => [...prev, data.message]);
                }
            } else {
                console.error('Failed to send');
                // Revert?
            }
        } catch (error) {
            console.error(error);
        } finally {
            setSending(false);
        }
    }

    if (loading) return <div className={styles.loading}>Loading conversation...</div>;

    return (
        <div className={styles.container}>
            <div className={styles.messageList}>
                {messages.map((msg) => (
                    <div key={msg.id} className={`${styles.message} ${styles[msg.role]}`}>
                        <div className={styles.bubble}>
                            {msg.content}
                        </div>
                    </div>
                ))}
                {sending && (
                    <div className={`${styles.message} ${styles.assistant}`}>
                        <div className={styles.bubble}>
                            <span className={styles.dot}>.</span>
                            <span className={styles.dot}>.</span>
                            <span className={styles.dot}>.</span>
                        </div>
                    </div>
                )}
                <div ref={bottomRef} />
            </div>

            <div className={styles.inputArea}>
                <form onSubmit={sendMessage} className={styles.inputForm}>
                    <input
                        className={styles.input}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Type a message..."
                        disabled={sending}
                    />
                    <button type="submit" className={styles.sendBtn} disabled={!input.trim() || sending}>
                        Send
                    </button>
                </form>
            </div>
        </div>
    );
}
