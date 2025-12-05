import { useEffect, useState } from 'react';

/**
 * Hook to detect if running in Electron and access Electron APIs
 */
export function useElectron() {
    const [isElectron, setIsElectron] = useState(false);
    const [api, setApi] = useState<typeof window.electronAPI | null>(null);

    useEffect(() => {
        if (typeof window !== 'undefined' && window.electronAPI) {
            setIsElectron(true);
            setApi(window.electronAPI);
        }
    }, []);

    return { isElectron, api };
}

/**
 * Check if we're running in Electron (can be used outside of React)
 */
export function isElectronApp(): boolean {
    return typeof window !== 'undefined' && !!window.electronAPI?.isElectron;
}
