"use client";

import { useState } from 'react';
import styles from './TaskWizard.module.css';

interface TaskWizardProps {
    onSubmit: (task: string) => void;
}

const TEMPLATES = [
    {
        icon: '🌐',
        title: 'Build a Website',
        description: 'Landing page, portfolio, or business site',
        prompt: 'Create a modern landing page for'
    },
    {
        icon: '🔍',
        title: 'Research & Analyze',
        description: 'Find information and summarize insights',
        prompt: 'Research and summarize information about'
    },
    {
        icon: '📊',
        title: 'Organize Data',
        description: 'Scrape, collect, or structure information',
        prompt: 'Collect and organize data about'
    },
    {
        icon: '🤖',
        title: 'Automate a Task',
        description: 'Set up automated workflows',
        prompt: 'Help me automate'
    }
];

export default function TaskWizard({ onSubmit }: TaskWizardProps) {
    const [step, setStep] = useState<'templates' | 'input'>('templates');
    const [selectedTemplate, setSelectedTemplate] = useState<typeof TEMPLATES[0] | null>(null);
    const [userInput, setUserInput] = useState('');

    const handleTemplateSelect = (template: typeof TEMPLATES[0]) => {
        setSelectedTemplate(template);
        setStep('input');
    };

    const handleSubmit = () => {
        if (!userInput.trim()) return;
        const fullPrompt = selectedTemplate
            ? `${selectedTemplate.prompt} ${userInput}`
            : userInput;
        onSubmit(fullPrompt);
    };

    return (
        <div className={styles.wizard}>
            <div className={styles.header}>
                <h1 className={styles.logo}>
                    <span className={styles.logoIcon}>✦</span>
                    Lulo
                </h1>
                <p className={styles.tagline}>Your AI team, working in parallel</p>
            </div>

            {step === 'templates' && (
                <div className={styles.templatesSection}>
                    <h2 className={styles.sectionTitle}>What would you like to accomplish?</h2>
                    <div className={styles.templates}>
                        {TEMPLATES.map((template, i) => (
                            <button
                                key={i}
                                className={styles.templateCard}
                                onClick={() => handleTemplateSelect(template)}
                            >
                                <span className={styles.templateIcon}>{template.icon}</span>
                                <span className={styles.templateTitle}>{template.title}</span>
                                <span className={styles.templateDesc}>{template.description}</span>
                            </button>
                        ))}
                    </div>
                    <div className={styles.divider}>
                        <span>or describe anything</span>
                    </div>
                    <div className={styles.freeformInput}>
                        <input
                            type="text"
                            placeholder="Tell me what you want to build..."
                            value={userInput}
                            onChange={(e) => setUserInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && userInput.trim()) {
                                    onSubmit(userInput);
                                }
                            }}
                            className={styles.mainInput}
                        />
                        <button
                            className={styles.submitButton}
                            onClick={() => userInput.trim() && onSubmit(userInput)}
                            disabled={!userInput.trim()}
                        >
                            Start Building →
                        </button>
                    </div>
                </div>
            )}

            {step === 'input' && selectedTemplate && (
                <div className={styles.inputSection}>
                    <button className={styles.backButton} onClick={() => setStep('templates')}>
                        ← Back
                    </button>
                    <div className={styles.selectedTemplate}>
                        <span className={styles.bigIcon}>{selectedTemplate.icon}</span>
                        <h2>{selectedTemplate.title}</h2>
                    </div>
                    <div className={styles.promptBuilder}>
                        <span className={styles.promptPrefix}>{selectedTemplate.prompt}</span>
                        <input
                            type="text"
                            placeholder="your project details..."
                            value={userInput}
                            onChange={(e) => setUserInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                            className={styles.detailInput}
                            autoFocus
                        />
                    </div>
                    <button
                        className={styles.launchButton}
                        onClick={handleSubmit}
                        disabled={!userInput.trim()}
                    >
                        Launch Agent →
                    </button>
                </div>
            )}
        </div>
    );
}
