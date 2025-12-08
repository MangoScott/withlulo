'use client';

import { useState, useEffect } from 'react';

export default function DebugPage() {
    const [envInfo, setEnvInfo] = useState<any>({});

    useEffect(() => {
        setEnvInfo({
            NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Present' : '❌ Missing',
            NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Present' : '❌ Missing',
            NODE_ENV: process.env.NODE_ENV,
        });
    }, []);

    return (
        <div style={{ padding: 40, fontFamily: 'monospace' }}>
            <h1>Environment Debugger</h1>
            <pre>{JSON.stringify(envInfo, null, 2)}</pre>

            <hr />

            <h2>Raw Process Env Keys (Client)</h2>
            <pre>{JSON.stringify(Object.keys(process.env).filter(k => k.startsWith('NEXT_PUBLIC')), null, 2)}</pre>
        </div>
    );
}
