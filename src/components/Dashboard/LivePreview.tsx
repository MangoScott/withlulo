"use client";

import { useMemo } from 'react';
import styles from './Dashboard.module.css';

interface LivePreviewProps {
    html?: string;
    css?: string;
    js?: string;
    className?: string;
}

export default function LivePreview({ html, css, js, className }: LivePreviewProps) {
    // Combine HTML, CSS, and JS into a single document
    const srcDoc = useMemo(() => {
        if (!html && !css && !js) return null;

        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
        ${css || ''}
    </style>
</head>
<body>
    ${html || '<div style="padding: 2rem; color: #666; text-align: center;">Preview will appear here</div>'}
    ${js ? `<script>${js}</script>` : ''}
</body>
</html>`;
    }, [html, css, js]);

    if (!srcDoc) {
        return (
            <div className={`${styles.previewPlaceholder} ${className || ''}`}>
                <div className={styles.previewIcon}>🌐</div>
                <span>Live preview will appear here</span>
            </div>
        );
    }

    return (
        <iframe
            srcDoc={srcDoc}
            className={`${styles.livePreviewFrame} ${className || ''}`}
            sandbox="allow-scripts"
            title="Live Preview"
        />
    );
}
