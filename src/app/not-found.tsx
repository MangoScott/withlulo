import Link from 'next/link';

export const runtime = 'edge';

export default function NotFound() {
    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100vh',
            fontFamily: 'system-ui, sans-serif'
        }}>
            <h2>Not Found</h2>
            <p>Could not find requested resource</p>
            <Link href="/dashboard" style={{
                marginTop: '20px',
                padding: '10px 20px',
                background: '#000',
                color: '#fff',
                borderRadius: '6px',
                textDecoration: 'none'
            }}>
                Return Home
            </Link>
        </div>
    );
}
