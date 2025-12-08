'use client';

import Link from 'next/link';
import styles from './page.module.css';

export default function Home() {
  return (
    <div className={styles.container}>
      {/* Header */}
      <nav className={styles.header}>
        <Link href="/" className={styles.logo}>
          <span className={styles.logoIcon}>🪄</span>
          <span>Lulo</span>
        </Link>
        <div className={styles.nav}>
          <Link href="/dashboard" className={styles.loginBtn}>
            Sign In
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <header className={styles.hero}>
        <div className={styles.pill}>✨ Now with Cloud Sync</div>
        <h1 className={styles.headline}>
          Your AI Superpower <br />
          <span className={styles.highlight}>for the Web</span>
        </h1>
        <p className={styles.subhead}>
          Lulo lives in your browser to help you create, build, and organize.
          Capture screenshots, record videos, and chat with AI in context.
        </p>

        <div className={styles.ctaGroup}>
          <a href="https://chrome.google.com/webstore" target="_blank" className={styles.ctaPrimary}>
            Add to Chrome
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
          </a>
          <Link href="/dashboard" className={styles.ctaSecondary}>
            Go to Dashboard
          </Link>
        </div>
      </header>

      {/* Showcase / Placeholder */}
      <section className={styles.showcase}>
        <div className={styles.showcasePlaceholder} style={{ padding: 0, overflow: 'hidden', background: 'transparent', border: 'none' }}>
          <img
            src="/demo.webp"
            alt="Lulo Demo"
            style={{
              width: '100%',
              height: 'auto',
              borderRadius: '12px',
              display: 'block'
            }}
          />
        </div>
      </section>

      {/* Features */}
      <section className={styles.features}>
        <div className={styles.featureGrid}>
          <div className={styles.featureCard}>
            <span className={styles.featureIcon}>💬</span>
            <h3 className={styles.featureTitle}>Contextual AI</h3>
            <p className={styles.featureText}>
              Chat with Lulo about any webpage. Ask questions, summarize content, or generate new ideas instantly.
            </p>
          </div>
          <div className={styles.featureCard}>
            <span className={styles.featureIcon}>📸</span>
            <h3 className={styles.featureTitle}>Smart Capture</h3>
            <p className={styles.featureText}>
              Snap screenshots or record videos with a single click. Everything is synced to your cloud dashboard.
            </p>
          </div>
          <div className={styles.featureCard}>
            <span className={styles.featureIcon}>📂</span>
            <h3 className={styles.featureTitle}>Workspace Ready</h3>
            <p className={styles.featureText}>
              Organize your chats and clips into projects. Keep your research and creative work tidy and accessible.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerLinks}>
          <Link href="/dashboard" className={styles.footerLink}>Dashboard</Link>
          <a href="#" className={styles.footerLink}>Privacy</a>
          <a href="#" className={styles.footerLink}>Terms</a>
          <a href="#" className={styles.footerLink}>Twitter</a>
        </div>
        <p>&copy; {new Date().getFullYear()} Lulo AI. All rights reserved.</p>
      </footer>
    </div>
  );
}
