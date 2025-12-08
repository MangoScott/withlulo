'use client';

import { useEffect, useState } from 'react';
import styles from './DemoAnimation.module.css';

export default function DemoAnimation() {
    const [replayKey, setReplayKey] = useState(0);

    // Animation Loop - restart every 10 seconds
    useEffect(() => {
        const timer = setInterval(() => {
            setReplayKey((prev) => prev + 1);
        }, 10000);
        return () => clearInterval(timer);
    }, []);

    return (
        <div className={styles.container} key={replayKey}>
            {/* Mock Browser Window */}
            <div className={styles.browserChrome}>
                <div className={styles.browserHeader}>
                    <div className={styles.trafficLights}>
                        <span className={styles.trafficLight} data-color="red"></span>
                        <span className={styles.trafficLight} data-color="yellow"></span>
                        <span className={styles.trafficLight} data-color="green"></span>
                    </div>
                    <div className={styles.urlBar}>
                        <span className={styles.lockIcon}>🔒</span>
                        <span>heylulo.com</span>
                    </div>
                    <div className={styles.browserActions}>
                        <span className={styles.extensionIcon}>🪄</span>
                    </div>
                </div>

                <div className={styles.browserBody}>
                    {/* Webpage Content (Background) */}
                    <div className={styles.webpageContent}>
                        <div className={styles.webpageHeader}>
                            <div className={styles.webpageLogo}></div>
                            <div className={styles.webpageNav}>
                                <div className={styles.navItem}></div>
                                <div className={styles.navItem}></div>
                                <div className={styles.navItem}></div>
                            </div>
                        </div>
                        <div className={styles.webpageHero}>
                            <div className={styles.heroTitle}></div>
                            <div className={styles.heroSubtitle}></div>
                            <div className={styles.heroButton}></div>
                        </div>
                    </div>

                    {/* Lulo Sidepanel (Slides In) */}
                    <div className={styles.sidepanel}>
                        <div className={styles.sidepanelHeader}>
                            <div className={styles.sidepanelLogo}>
                                <span>🪄</span> Lulo
                            </div>
                            <div className={styles.sidepanelActions}>
                                <span className={styles.actionDot}></span>
                                <span className={styles.actionDot}></span>
                            </div>
                        </div>

                        <div className={styles.chatArea}>
                            {/* User Message */}
                            <div className={`${styles.message} ${styles.user}`}>
                                <span className={styles.messageAvatar}>👤</span>
                                <div className={styles.messageBubble}>
                                    Create a landing page for a coffee shop ☕️
                                </div>
                            </div>

                            {/* Agent Thinking */}
                            <div className={`${styles.message} ${styles.agent} ${styles.thinking}`}>
                                <span className={styles.messageAvatar}>🪄</span>
                                <div className={styles.messageBubble}>
                                    <div className={styles.typingDots}>
                                        <span></span><span></span><span></span>
                                    </div>
                                </div>
                            </div>

                            {/* Agent Reply with Preview */}
                            <div className={`${styles.message} ${styles.agent} ${styles.reply}`}>
                                <span className={styles.messageAvatar}>🪄</span>
                                <div className={styles.messageBubble}>
                                    <p>I&apos;ve designed a modern coffee shop landing page for you! ✨</p>

                                    <div className={styles.previewCard}>
                                        <div className={styles.previewHeader}>
                                            <span>☕</span> Bean & Brew
                                        </div>
                                        <div className={styles.previewBody}>
                                            <div className={styles.previewText}>
                                                <h5>Artisanal Coffee</h5>
                                                <p>Crafted with care</p>
                                                <button>Order Now</button>
                                            </div>
                                            <div className={styles.previewImage}>☕️</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className={styles.inputArea}>
                            <div className={styles.inputBox}>
                                <span className={styles.inputText}>Type a message...</span>
                            </div>
                            <button className={styles.sendButton}>↑</button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Animated Cursor */}
            <div className={styles.cursor}></div>
        </div>
    );
}
