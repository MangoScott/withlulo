const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
    // ===== File System Operations =====
    createProject: (projectName) => ipcRenderer.invoke('fs:createProject', projectName),
    saveFile: (projectPath, fileName, content) =>
        ipcRenderer.invoke('fs:saveFile', { projectPath, fileName, content }),
    readFile: (filePath) => ipcRenderer.invoke('fs:readFile', filePath),
    listProjects: () => ipcRenderer.invoke('fs:listProjects'),
    getProject: (projectName) => ipcRenderer.invoke('fs:getProject', projectName),
    deleteProject: (projectPath) => ipcRenderer.invoke('fs:deleteProject', projectPath),
    openInFinder: (folderPath) => ipcRenderer.invoke('fs:openInFinder', folderPath),
    getLuloDir: () => ipcRenderer.invoke('fs:getLuloDir'),

    // ===== Browser Control =====
    launchBrowser: (options) => ipcRenderer.invoke('browser:launch', options),
    navigateTo: (url) => ipcRenderer.invoke('browser:navigate', url),
    browserClick: (x, y) => ipcRenderer.invoke('browser:click', { x, y }),
    browserType: (text, options) => ipcRenderer.invoke('browser:type', { text, options }),
    takeScreenshot: () => ipcRenderer.invoke('browser:screenshot'),
    getPageContent: () => ipcRenderer.invoke('browser:getContent'),
    closeBrowser: () => ipcRenderer.invoke('browser:close'),
    isBrowserRunning: () => ipcRenderer.invoke('browser:isRunning'),
    updateBrowserStatus: (status) => ipcRenderer.invoke('browser:updateStatus', status),

    // ===== Platform Info =====
    platform: process.platform,
    isElectron: true,
});
