"use client";

import { useState } from 'react';
import styles from './Concierge.module.css';

interface ConciergeProps {
  onComplete: (data: { prompt: string }) => void;
}

export default function Concierge({ onComplete }: ConciergeProps) {
  const [prompt, setPrompt] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt) {
      onComplete({ prompt });
    }
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>
        What are we building?
      </h1>
      <p className={styles.subtitle}>
        Describe your idea, and I'll handle the rest.
      </p>

      <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: '600px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div style={{ position: 'relative' }}>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g., A landing page for a coffee shop with a dark theme..."
            style={{
              width: '100%',
              minHeight: '120px',
              padding: '1.5rem',
              borderRadius: '20px',
              border: '1px solid var(--border-subtle)',
              background: '#FFF',
              fontSize: '1.1rem',
              fontFamily: 'inherit',
              resize: 'none',
              boxShadow: 'var(--shadow-soft)',
              outline: 'none',
              transition: 'all 0.3s'
            }}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
          <button
            type="submit"
            disabled={!prompt}
            style={{
              padding: '1rem 2.5rem',
              background: 'var(--accent-primary)',
              color: '#FFF',
              border: 'none',
              borderRadius: '30px',
              fontSize: '1.1rem',
              fontWeight: 600,
              cursor: 'pointer',
              opacity: (!prompt) ? 0.5 : 1,
              transition: 'all 0.3s',
              boxShadow: '0 4px 15px rgba(139, 92, 246, 0.3)'
            }}
          >
            Start Building
          </button>
        </div>
      </form>
    </div>
  );
}
