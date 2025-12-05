const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const browserService = require('./services/browser');
const fileService = require('./services/files');

let mainWindow = null;

// Create the main application window
function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 800,
        minHeight: 600,
        titleBarStyle: 'hiddenInset',
        backgroundColor: '#FAF8F5',
        icon: path.join(__dirname, '../assets/icon.png'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
        },
    });

    // In development, load from Next.js dev server
    // In production (packaged app), load from localhost (we start the server)
    const isDev = !app.isPackaged;

    if (isDev) {
        mainWindow.loadURL('http://localhost:3000');
        mainWindow.webContents.openDevTools();
    } else {
        // In production, we still load from localhost
        // The packaged app should include all necessary files
        mainWindow.loadURL('http://localhost:3000');
    }

    mainWindow.on('closed', () => {
        mainWindow = null;
        // Also close browser when main window closes
        browserService.closeBrowser();
    });
}

// ===== File Storage IPC Handlers =====

ipcMain.handle('fs:createProject', async (event, projectName) => {
    return fileService.createProject(projectName);
});

ipcMain.handle('fs:saveFile', async (event, { projectPath, fileName, content }) => {
    return fileService.saveFile(projectPath, fileName, content);
});

ipcMain.handle('fs:readFile', async (event, filePath) => {
    return fileService.readFile(filePath);
});

ipcMain.handle('fs:listProjects', async () => {
    return fileService.listProjects();
});

ipcMain.handle('fs:getProject', async (event, projectName) => {
    return fileService.getProject(projectName);
});

ipcMain.handle('fs:deleteProject', async (event, projectPath) => {
    return fileService.deleteProject(projectPath);
});

ipcMain.handle('fs:openInFinder', async (event, folderPath) => {
    fileService.openInFinder(folderPath);
});

ipcMain.handle('fs:getLuloDir', async () => {
    return fileService.getLuloDir();
});

// ===== Browser Control IPC Handlers =====

ipcMain.handle('browser:launch', async (event, options) => {
    return await browserService.launchBrowser(options);
});

ipcMain.handle('browser:navigate', async (event, url) => {
    return await browserService.navigate(url);
});

ipcMain.handle('browser:click', async (event, { x, y }) => {
    return await browserService.click(x, y);
});

ipcMain.handle('browser:type', async (event, { text, options }) => {
    return await browserService.type(text, options);
});

ipcMain.handle('browser:screenshot', async () => {
    return await browserService.screenshot();
});

ipcMain.handle('browser:getContent', async () => {
    return await browserService.getPageContent();
});

ipcMain.handle('browser:close', async () => {
    return await browserService.closeBrowser();
});

ipcMain.handle('browser:isRunning', async () => {
    return browserService.isRunning();
});

ipcMain.handle('browser:updateStatus', async (event, status) => {
    browserService.updateGlowStatus(status);
});

// ===== App Lifecycle =====

app.whenReady().then(() => {
    // Ensure directories exist on startup
    fileService.ensureDirectories();

    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    browserService.closeBrowser();
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
