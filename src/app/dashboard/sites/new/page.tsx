'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase';
import styles from './page.module.css';
import Link from 'next/link';

const BUSINESS_TYPES = [
    { id: 'coffee-shop', label: 'Coffee Shop', icon: '☕' },
    { id: 'restaurant', label: 'Restaurant', icon: '🍽️' },
    { id: 'portfolio', label: 'Portfolio', icon: '💼' },
    { id: 'startup', label: 'Startup', icon: '🚀' },
    { id: 'agency', label: 'Agency', icon: '🏢' },
    { id: 'personal', label: 'Personal', icon: '👤' },
    { id: 'ecommerce', label: 'E-Commerce', icon: '🛍️' },
    { id: 'fitness', label: 'Fitness', icon: '💪' },
    { id: 'real-estate', label: 'Real Estate', icon: '🏠' },
];

type Step = 'type' | 'details' | 'generating' | 'preview';

export default function NewSitePage() {
    const router = useRouter();
    const [step, setStep] = useState<Step>('type');
    const [businessType, setBusinessType] = useState('');
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [error, setError] = useState('');
    const [generatedSite, setGeneratedSite] = useState<{ id: string; slug: string; html: string } | null>(null);

    async function handleGenerate() {
        if (!title.trim() || !description.trim()) {
            setError('Please fill in all fields');
            return;
        }

        setStep('generating');
        setError('');

        try {
            const supabase = createBrowserClient();
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                setError('Please sign in to create a site');
                setStep('details');
                return;
            }

            const response = await fetch('/api/sites', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    title,
                    description,
                    businessType
                })
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to create site');
            }

            const data = await response.json();
            setGeneratedSite({
                id: data.site.id,
                slug: data.site.slug,
                html: data.site.html_content
            });
            setStep('preview');
        } catch (err) {
            console.error('Generation error:', err);
            setError(err instanceof Error ? err.message : 'Failed to generate site');
            setStep('details');
        }
    }

    async function handlePublish() {
        if (!generatedSite) return;

        try {
            const supabase = createBrowserClient();
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            await fetch(`/api/sites/${generatedSite.id}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ published: true })
            });

            router.push(`/s/${generatedSite.slug}`);
        } catch (err) {
            console.error('Publish error:', err);
        }
    }

    return (
        <div className={styles.container}>
            {/* Progress Bar */}
            <div className={styles.progress}>
                <div
                    className={styles.progressBar}
                    style={{
                        width: step === 'type' ? '25%' :
                            step === 'details' ? '50%' :
                                step === 'generating' ? '75%' : '100%'
                    }}
                />
            </div>

            <Link href="/dashboard/sites" className={styles.backLink}>
                ← Back to Sites
            </Link>

            {/* Step 1: Business Type */}
            {step === 'type' && (
                <div className={styles.stepContent}>
                    <h1 className={styles.stepTitle}>What kind of site are you creating?</h1>
                    <p className={styles.stepSubtitle}>Pick the option that best describes your project</p>

                    <div className={styles.typeGrid}>
                        {BUSINESS_TYPES.map((type) => (
                            <button
                                key={type.id}
                                className={`${styles.typeCard} ${businessType === type.id ? styles.selected : ''}`}
                                onClick={() => setBusinessType(type.id)}
                            >
                                <span className={styles.typeIcon}>{type.icon}</span>
                                <span className={styles.typeLabel}>{type.label}</span>
                            </button>
                        ))}
                    </div>

                    <button
                        className={styles.nextBtn}
                        disabled={!businessType}
                        onClick={() => setStep('details')}
                    >
                        Continue →
                    </button>
                </div>
            )}

            {/* Step 2: Details */}
            {step === 'details' && (
                <div className={styles.stepContent}>
                    <h1 className={styles.stepTitle}>Tell us about your {businessType.replace('-', ' ')}</h1>
                    <p className={styles.stepSubtitle}>The more detail you provide, the better your site will be</p>

                    {error && <div className={styles.error}>{error}</div>}

                    <div className={styles.form}>
                        <div className={styles.field}>
                            <label className={styles.label}>Site Name</label>
                            <input
                                type="text"
                                className={styles.input}
                                placeholder="e.g., Bean & Brew Coffee"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                            />
                        </div>

                        <div className={styles.field}>
                            <label className={styles.label}>Description</label>
                            <textarea
                                className={styles.textarea}
                                placeholder="Describe your business, what makes it special, and what you want visitors to know..."
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={5}
                            />
                        </div>
                    </div>

                    <div className={styles.btnGroup}>
                        <button className={styles.backBtn} onClick={() => setStep('type')}>
                            ← Back
                        </button>
                        <button
                            className={styles.generateBtn}
                            disabled={!title.trim() || !description.trim()}
                            onClick={handleGenerate}
                        >
                            ✨ Generate My Site
                        </button>
                    </div>
                </div>
            )}

            {/* Step 3: Generating */}
            {step === 'generating' && (
                <div className={styles.generating}>
                    <div className={styles.spinner} />
                    <h2 className={styles.generatingTitle}>Creating your site...</h2>
                    <p className={styles.generatingText}>
                        Lulo is designing a beautiful landing page for <strong>{title}</strong>
                    </p>
                    <div className={styles.generatingSteps}>
                        <div className={styles.genStep}>✓ Analyzing your description</div>
                        <div className={styles.genStep}>✓ Choosing the perfect layout</div>
                        <div className={`${styles.genStep} ${styles.active}`}>⚡ Generating HTML & CSS</div>
                        <div className={styles.genStep}>○ Finalizing design</div>
                    </div>
                </div>
            )}

            {/* Step 4: Preview */}
            {step === 'preview' && generatedSite && (
                <div className={styles.previewStep}>
                    <div className={styles.previewHeader}>
                        <div>
                            <h2 className={styles.previewTitle}>🎉 Your site is ready!</h2>
                            <p className={styles.previewSubtitle}>Preview it below, then publish to make it live</p>
                        </div>
                        <div className={styles.previewActions}>
                            <button className={styles.editBtn} onClick={() => router.push(`/dashboard/sites/${generatedSite.id}`)}>
                                Edit Site
                            </button>
                            <button className={styles.publishBtn} onClick={handlePublish}>
                                🚀 Publish Now
                            </button>
                        </div>
                    </div>

                    <div className={styles.previewFrame}>
                        <div className={styles.browserBar}>
                            <div className={styles.dots}>
                                <span></span><span></span><span></span>
                            </div>
                            <div className={styles.urlBar}>heylulo.com/s/{generatedSite.slug}</div>
                        </div>
                        <iframe
                            srcDoc={generatedSite.html}
                            className={styles.iframe}
                            title="Site Preview"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
