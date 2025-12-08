'use client';

import { useEffect } from 'react';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error('Dashboard Error:', error);
    }, [error]);

    return (
        <div style={{
            padding: '40px',
            textAlign: 'center',
            fontFamily: 'system-ui, sans-serif',
            color: '#333'
        }}>
            <h2 style={{ fontSize: '24px', marginBottom: '16px' }}>Dashboard Error</h2>
            <div style={{
                background: '#fff0f0',
                border: '1px solid #ffcdd2',
                borderRadius: '8px',
                padding: '20px',
                display: 'inline-block',
                textAlign: 'left',
                maxWidth: '600px',
                overflow: 'auto'
            }}>
                <p style={{ color: '#c62828', fontWeight: 600, margin: 0 }}>{error.message}</p>
                <pre style={{ marginTop: '10px', fontSize: '12px', color: '#555' }}>
                    {error.stack}
                </pre>
            </div>
            <div style={{ marginTop: '24px' }}>
                <button
                    onClick={() => reset()}
                    style={{
                        background: '#2D2B3A',
                        color: 'white',
                        border: 'none',
                        padding: '10px 20px',
                        borderRadius: '20px',
                        cursor: 'pointer',
                        fontSize: '14px'
                    }}
                >
                    Try again
                </button>
            </div>
        </div>
    );
}
