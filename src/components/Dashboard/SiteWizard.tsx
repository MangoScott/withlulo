'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase';
import styles from './SiteWizard.module.css';

const BUSINESS_TYPES = [
    { id: 'personal', label: 'Personal Profile', icon: '👤', desc: 'Showcase your skills, resume, and contact info.' },
    { id: 'bio-card', label: 'Bio Card', icon: '📇', desc: 'A simple link-in-bio page for social media.' },
    { id: 'business', label: 'Small Business', icon: '🏪', desc: 'Promote your services, products, and brand.' },
];

const THEME_COLORS = [
    { id: 'blue', hex: '#3B82F6', label: 'Blue' },
    { id: 'purple', hex: '#8B6DB8', label: 'Purple' },
    { id: 'green', hex: '#10B981', label: 'Green' },
    { id: 'orange', hex: '#F97316', label: 'Orange' },
    { id: 'red', hex: '#EF4444', label: 'Red' },
    { id: 'dark', hex: '#1F2937', label: 'Dark' },
];

type Step = 'type' | 'details' | 'generating';

interface SiteWizardProps {
    mode?: 'create' | 'edit';
    initialData?: any; // The site object
    onCancel?: () => void;
    onSuccess?: (site: any) => void;
}

export default function SiteWizard({ mode = 'create', initialData, onCancel, onSuccess }: SiteWizardProps) {
    const router = useRouter();
    const [step, setStep] = useState<Step>('type');
    const [businessType, setBusinessType] = useState('');
    const [formData, setFormData] = useState<any>({});
    const [fileData, setFileData] = useState<string | null>(null);
    const [mimeType, setMimeType] = useState<string | null>(null);
    const [fileName, setFileName] = useState('');
    const [profileImage, setProfileImage] = useState<string>(''); // URL or Base64
    const [theme, setTheme] = useState(THEME_COLORS[0].hex);
    const [userData, setUserData] = useState<any>(null); // Store fetched user data
    const [error, setError] = useState('');
    const [subdomain, setSubdomain] = useState('');
    const [loadingText, setLoadingText] = useState(mode === 'edit' ? 'Updating your site...' : 'Creating your site...');

    // Load User Data
    useEffect(() => {
        const loadUser = async () => {
            const supabase = createBrowserClient();
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                setUserData(session.user);
                // Auto-set profile image from metadata ONLY if creating or no initial image
                if (mode === 'create' && !profileImage) {
                    const avatar = session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture;
                    if (avatar) setProfileImage(avatar);
                }
            }
        };
        loadUser();

        // If in Edit Mode, populate fields
        if (mode === 'edit' && initialData) {
            setStep('details');
            setBusinessType(initialData.business_type || 'personal');
            setTheme(initialData.theme || THEME_COLORS[0].hex);
            setSubdomain(initialData.subdomain || initialData.slug || '');
            try {
                const parsed = JSON.parse(initialData.description);
                if (parsed.fields) {
                    setFormData(parsed.fields);
                }
                // Note: We can't easily recover profileImage if it wasn't saved separately unless interpreted from description, 
                // but usually the user might want to re-upload or keep existing (logic below).
                // For now, we rely on the user re-uploading if they want to change it, or we assume existing is fine.
            } catch (e) {
                console.error("Failed to parse initial description", e);
            }
        }
    }, [mode, initialData, profileImage]);

    // Handlers
    const handleTypeSelect = (id: string) => {
        setBusinessType(id);
        setStep('details');
        setFormData({});
        setError('');
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const base64: string = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.readAsDataURL(file);
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = reject;
            });

            // Parse base64
            const matches = base64.match(/^data:(.*);base64,(.*)$/);
            if (matches && matches.length === 3) {
                setMimeType(matches[1]);
                setFileData(matches[2]);
                setFileName(file.name);
            }
        } catch (err) {
            console.error('File read error', err);
            setError('Failed to read file');
        }
    };

    const handleProfileImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = () => {
            setProfileImage(reader.result as string);
        };
        reader.readAsDataURL(file);
    };

    const handleGenerate = async () => {
        // Validation
        const required = ['name', 'handle', 'businessName'];
        const provided = Object.keys(formData);
        const hasIdentity = required.some(r => provided.includes(r) && formData[r]?.trim());

        // We force at least one "identity" field unless a file is uploaded (which overrides)
        if (!hasIdentity && !fileData && mode === 'create') {
            setError('Please fill in at least the main name field.');
            return;
        }

        setStep('generating');
        setError('');

        // Animation Loop
        const phrases = ["Analyzing inputs...", "Structuring layout...", "Writing content...", "Applying styles..."];
        let i = 0;
        const interval = setInterval(() => {
            setLoadingText(phrases[i % phrases.length]);
            i++;
        }, 2000);

        try {
            const supabase = createBrowserClient();
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("Please sign in.");

            const description = JSON.stringify({
                type: businessType,
                fields: formData
            });

            const title = formData.name || formData.handle || formData.businessName || initialData?.title || "My Website";

            // Fallback: If subdomain empty, generate valid one from title
            let finalSubdomain = subdomain;
            if (!finalSubdomain) {
                finalSubdomain = title.toLowerCase().replace(/[^a-z0-9]/g, '');
                if (finalSubdomain.length < 3) finalSubdomain += 'site';
            }

            const payload: any = {
                title,
                description,
                businessType,
                businessType,
                theme: theme,
                theme: theme,
                subdomain: finalSubdomain // Use safe subdomain
            };

            if (fileData) {
                payload.fileData = fileData;
                payload.mimeType = mimeType;
            }

            if (profileImage) {
                payload.profileImage = profileImage;
            }

            let response;
            if (mode === 'create') {
                response = await fetch('/api/sites', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${session.access_token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                });
            } else {
                // UPDATE Mode
                payload.shouldRegenerate = true; // Tell backend to re-run AI
                response = await fetch(`/api/sites/${initialData.id}`, {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Bearer ${session.access_token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                });
            }

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Operation failed');
            }

            const data = await response.json();

            clearInterval(interval);

            if (onSuccess) {
                onSuccess(data.site);
            } else if (mode === 'create') {
                router.push(`/dashboard/sites/${data.site.id}`);
            }

        } catch (err: any) {
            clearInterval(interval);
            setStep('details');
            setError(err.message || 'Something went wrong');
        }
    };

    // Render Forms
    const renderFormFields = () => {
        if (businessType === 'personal') return (
            <>
                <div className={styles.formGroup}>
                    <label className={styles.label}>Claim URL (Subdomain)</label>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <input
                            name="subdomain"
                            className={styles.input}
                            placeholder="yourname"
                            value={subdomain}
                            onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                            style={{ borderRadius: '6px 0 0 6px', borderRight: 'none' }}
                        />
                        <div style={{
                            background: '#f3f4f6',
                            padding: '10px 12px',
                            border: '2px solid #e5e7eb',
                            borderLeft: 'none',
                            borderRadius: '0 6px 6px 0',
                            color: '#6b7280',
                            fontSize: '0.9rem'
                        }}>.heylulo.com</div>
                    </div>
                </div>
                <div className={styles.formGroup}>
                    <label className={styles.label}>Full Name</label>
                    <input name="name" className={styles.input} placeholder="Jane Doe" value={formData.name || ''} onChange={handleInputChange} />
                </div>
                <div className={styles.formGroup}>
                    <label className={styles.label}>About Me</label>
                    <textarea name="about" className={styles.textarea} rows={3} placeholder="I'm a designer based in..." value={formData.about || ''} onChange={handleInputChange} />
                </div>
                <div className={styles.formGroup}>
                    <label className={styles.label}>Social Links (Optional)</label>
                    <input name="social1" className={styles.input} placeholder="Twitter / LinkedIn URL" value={formData.social1 || ''} onChange={handleInputChange} style={{ marginBottom: 10 }} />
                    <input name="social2" className={styles.input} placeholder="Portfolio URL" value={formData.social2 || ''} onChange={handleInputChange} />
                </div>

                <div className={styles.formGroup}>
                    <label className={styles.label}>Profile Picture</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        {profileImage && (
                            <img src={profileImage} alt="Profile" style={{ width: 60, height: 60, borderRadius: '50%', objectFit: 'cover', border: '2px solid #eee' }} />
                        )}
                        <div>
                            <input
                                type="file"
                                id="profileUpload"
                                accept="image/*"
                                style={{ display: 'none' }}
                                onChange={handleProfileImageChange}
                            />
                            <button
                                className={styles.backBtn}
                                style={{ padding: '8px 16px', fontSize: '0.9rem' }}
                                onClick={() => document.getElementById('profileUpload')?.click()}
                            >
                                {profileImage ? 'Change Photo' : 'Upload Photo'}
                            </button>
                        </div>
                    </div>
                </div>

                <div className={styles.formGroup}>
                    <label className={styles.label}>Color Theme</label>
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        {THEME_COLORS.map((c) => (
                            <div
                                key={c.id}
                                onClick={() => setTheme(c.hex)}
                                title={c.label}
                                style={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: '50%',
                                    backgroundColor: c.hex,
                                    cursor: 'pointer',
                                    border: theme === c.hex ? '3px solid #333' : '2px solid transparent',
                                    boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
                                    transform: theme === c.hex ? 'scale(1.1)' : 'scale(1)',
                                    transition: 'all 0.2s'
                                }}
                            />
                        ))}
                    </div>
                </div>
            </>
        );

        if (businessType === 'bio-card') return (
            <>
                <div className={styles.formGroup}>
                    <label className={styles.label}>Claim URL (Subdomain)</label>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <input
                            name="subdomain"
                            className={styles.input}
                            placeholder="yourname"
                            value={subdomain}
                            onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                            style={{ borderRadius: '6px 0 0 6px', borderRight: 'none' }}
                        />
                        <div style={{
                            background: '#f3f4f6',
                            padding: '10px 12px',
                            border: '2px solid #e5e7eb',
                            borderLeft: 'none',
                            borderRadius: '0 6px 6px 0',
                            color: '#6b7280',
                            fontSize: '0.9rem'
                        }}>.heylulo.com</div>
                    </div>
                </div>
                <div className={styles.formGroup}>
                    <label className={styles.label}>Handle / Name</label>
                    <input name="handle" className={styles.input} placeholder="@janedoe" value={formData.handle || ''} onChange={handleInputChange} />
                </div>
                <div className={styles.formGroup}>
                    <label className={styles.label}>Tagline / Bio</label>
                    <textarea name="bio" className={styles.textarea} rows={2} placeholder="Creator | Developer | Writer" value={formData.bio || ''} onChange={handleInputChange} />
                </div>
                <div className={styles.formGroup}>
                    <label className={styles.label}>Links (One per line: Title | URL)</label>
                    <textarea name="links" className={styles.textarea} rows={4} placeholder="My Blog | blog.com&#10;Twitter | x.com/me" value={formData.links || ''} onChange={handleInputChange} />
                </div>

                <div className={styles.formGroup}>
                    <label className={styles.label}>Profile Picture</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        {profileImage && (
                            <img src={profileImage} alt="Profile" style={{ width: 60, height: 60, borderRadius: '50%', objectFit: 'cover', border: '2px solid #eee' }} />
                        )}
                        <div>
                            <input
                                type="file"
                                id="profileUpload"
                                accept="image/*"
                                style={{ display: 'none' }}
                                onChange={handleProfileImageChange}
                            />
                            <button
                                className={styles.backBtn}
                                style={{ padding: '8px 16px', fontSize: '0.9rem' }}
                                onClick={() => document.getElementById('profileUpload')?.click()}
                            >
                                {profileImage ? 'Change Photo' : 'Upload Photo'}
                            </button>
                        </div>
                    </div>
                </div>

                <div className={styles.formGroup}>
                    <label className={styles.label}>Color Theme</label>
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        {THEME_COLORS.map((c) => (
                            <div
                                key={c.id}
                                onClick={() => setTheme(c.hex)}
                                title={c.label}
                                style={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: '50%',
                                    backgroundColor: c.hex,
                                    cursor: 'pointer',
                                    border: theme === c.hex ? '3px solid #333' : '2px solid transparent',
                                    boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
                                    transform: theme === c.hex ? 'scale(1.1)' : 'scale(1)',
                                    transition: 'all 0.2s'
                                }}
                            />
                        ))}
                    </div>
                </div>
            </>
        );

        return (
            <>
                <div className={styles.formGroup}>
                    <label className={styles.label}>Claim URL (Subdomain)</label>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <input
                            name="subdomain"
                            className={styles.input}
                            placeholder="acmecorp"
                            value={subdomain}
                            onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                            style={{ borderRadius: '6px 0 0 6px', borderRight: 'none' }}
                        />
                        <div style={{
                            background: '#f3f4f6',
                            padding: '10px 12px',
                            border: '2px solid #e5e7eb',
                            borderLeft: 'none',
                            borderRadius: '0 6px 6px 0',
                            color: '#6b7280',
                            fontSize: '0.9rem'
                        }}>.heylulo.com</div>
                    </div>
                </div>
                <div className={styles.formGroup}>
                    <label className={styles.label}>Business Name</label>
                    <input name="businessName" className={styles.input} placeholder="Acme Corp" value={formData.businessName || ''} onChange={handleInputChange} />
                </div>
                <div className={styles.formGroup}>
                    <label className={styles.label}>Tagline</label>
                    <input name="tagline" className={styles.input} placeholder="Standard of Excellence" value={formData.tagline || ''} onChange={handleInputChange} />
                </div>
                <div className={styles.formGroup}>
                    <label className={styles.label}>Services / Description</label>
                    <textarea name="services" className={styles.textarea} rows={3} placeholder="We provide..." value={formData.services || ''} onChange={handleInputChange} />
                </div>
                <div className={styles.formGroup}>
                    <label className={styles.label}>Contact Email</label>
                    <input name="email" className={styles.input} type="email" placeholder="contact@acme.com" value={formData.email || ''} onChange={handleInputChange} />
                </div>
            </>
        );
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.title}>
                    {step === 'type' ? 'Choose a Template' :
                        step === 'details' ? (mode === 'edit' ? 'Update Details' : 'Add Details') :
                            (mode === 'edit' ? 'Updating Site' : 'Creating Magic')}
                </h1>
                <p className={styles.subtitle}>
                    {step === 'type' ? 'Select the best starting point for your site.' :
                        step === 'details' ? 'Update your content and visuals to regenerate the site.' : 'Hang tight, this takes about 15 seconds.'}
                </p>
            </div>

            {/* Progress - Hide in Edit Mode */}
            {mode === 'create' && (
                <div className={styles.progress}>
                    <div className={styles.progressBar} style={{ width: step === 'type' ? '33%' : step === 'details' ? '66%' : '100%' }} />
                </div>
            )}

            {/* Error */}
            {error && <div className={styles.error}>{error}</div>}

            {/* STEP 1: TYPE (Only for Create) */}
            {step === 'type' && mode === 'create' && (
                <div className={styles.typeGrid}>
                    {BUSINESS_TYPES.map(t => (
                        <div key={t.id} className={styles.typeCard} onClick={() => handleTypeSelect(t.id)}>
                            <div className={styles.typeIcon}>{t.icon}</div>
                            <div className={styles.typeLabel}>{t.label}</div>
                            <div className={styles.typeDesc}>{t.desc}</div>
                        </div>
                    ))}
                </div>
            )}

            {/* STEP 2: DETAILS */}
            {step === 'details' && (
                <div className={styles.form}>
                    {renderFormFields()}

                    <div className={styles.formGroup}>
                        <label className={styles.label}>Upload Resume / Info (Optional)</label>
                        <div className={styles.fileUpload} onClick={() => document.getElementById('fileInput')?.click()}>
                            <input id="fileInput" type="file" className={styles.fileInput} accept=".pdf,.doc,.docx,.txt" onChange={handleFileChange} />
                            <div className={styles.fileLabel}>
                                {fileName ? (
                                    <>
                                        <span className={styles.fileIcon}>📄</span>
                                        <span className={styles.fileName}>{fileName}</span>
                                    </>
                                ) : (
                                    <>
                                        <span className={styles.fileIcon}>📎</span>
                                        <span>Click to upload PDF or Resume</span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className={styles.actions}>
                        {onCancel ? (
                            <button className={styles.backBtn} onClick={onCancel}>Cancel</button>
                        ) : (
                            <button className={styles.backBtn} onClick={() => setStep('type')}>Back</button>
                        )}
                        <button className={styles.nextBtn} onClick={handleGenerate}>
                            {mode === 'edit' ? '✨ Update & Regenerate' : '✨ Generate Site'}
                        </button>
                    </div>
                </div>
            )}

            {/* STEP 3: GENERATING */}
            {step === 'generating' && (
                <div className={styles.generating}>
                    <div className={styles.spinner} />
                    <h2 className={styles.genText}>{loadingText}</h2>
                    <p className={styles.genSub}>Powered by Gemini 2.0</p>
                </div>
            )}
        </div>
    );
}
