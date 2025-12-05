// TypeScript declarations for Electron API exposed via preload

interface BrowserResult {
    success: boolean;
    message?: string;
    error?: string;
}

interface ProjectInfo {
    name: string;
    path: string;
    createdAt: Date;
    modifiedAt: Date;
    fileCount?: number;
    files: { name: string; type: 'file' | 'folder'; size?: number }[];
}

interface ElectronAPI {
    // ===== File System Operations =====
    createProject: (projectName: string) => Promise<string>;
    saveFile: (projectPath: string, fileName: string, content: string) => Promise<string>;
    readFile: (filePath: string) => Promise<string | null>;
    listProjects: () => Promise<ProjectInfo[]>;
    getProject: (projectName: string) => Promise<ProjectInfo | null>;
    deleteProject: (projectPath: string) => Promise<boolean>;
    openInFinder: (folderPath: string) => Promise<void>;
    getLuloDir: () => Promise<string>;

    // ===== Browser Control =====
    launchBrowser: (options?: { headless?: boolean }) => Promise<BrowserResult>;
    navigateTo: (url: string) => Promise<BrowserResult>;
    browserClick: (x: number, y: number) => Promise<BrowserResult>;
    browserType: (text: string, options?: { delay?: number }) => Promise<BrowserResult>;
    takeScreenshot: () => Promise<string | null>;
    getPageContent: () => Promise<string | null>;
    closeBrowser: () => Promise<BrowserResult>;
    isBrowserRunning: () => Promise<boolean>;
    updateBrowserStatus: (status: string) => Promise<void>;

    // ===== Platform Info =====
    platform: 'darwin' | 'win32' | 'linux';
    isElectron: true;
}

declare global {
    interface Window {
        electronAPI?: ElectronAPI;
    }
}

export { };
