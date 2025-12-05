/**
 * File Storage Service
 * Manages local project folders and file operations
 */

const path = require('path');
const fs = require('fs');
const { app, shell } = require('electron');

// Base directory for Lulo projects
function getLuloDir() {
    return path.join(app.getPath('home'), 'Lulo');
}

function getProjectsDir() {
    return path.join(getLuloDir(), 'projects');
}

/**
 * Ensure base directories exist
 */
function ensureDirectories() {
    const dirs = [getLuloDir(), getProjectsDir()];
    dirs.forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    });
}

/**
 * Create a new project folder
 */
function createProject(projectName) {
    ensureDirectories();

    // Sanitize project name
    const safeName = projectName.replace(/[^a-zA-Z0-9-_\s]/g, '').trim().replace(/\s+/g, '-');
    const projectPath = path.join(getProjectsDir(), safeName);

    if (fs.existsSync(projectPath)) {
        // Add timestamp to make unique
        const timestamp = Date.now();
        const uniquePath = path.join(getProjectsDir(), `${safeName}-${timestamp}`);
        fs.mkdirSync(uniquePath, { recursive: true });
        return uniquePath;
    }

    fs.mkdirSync(projectPath, { recursive: true });
    return projectPath;
}

/**
 * Save a file to a project
 */
function saveFile(projectPath, fileName, content) {
    const filePath = path.join(projectPath, fileName);
    const dir = path.dirname(filePath);

    // Ensure subdirectories exist
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(filePath, content, 'utf8');
    return filePath;
}

/**
 * Read a file from a project
 */
function readFile(filePath) {
    if (!fs.existsSync(filePath)) {
        return null;
    }
    return fs.readFileSync(filePath, 'utf8');
}

/**
 * List all projects
 */
function listProjects() {
    ensureDirectories();
    const projectsDir = getProjectsDir();

    return fs.readdirSync(projectsDir)
        .filter(name => {
            const stat = fs.statSync(path.join(projectsDir, name));
            return stat.isDirectory();
        })
        .map(name => {
            const projectPath = path.join(projectsDir, name);
            const stat = fs.statSync(projectPath);
            const files = getProjectFiles(projectPath);

            return {
                name,
                path: projectPath,
                createdAt: stat.birthtime,
                modifiedAt: stat.mtime,
                fileCount: files.length,
                files: files.slice(0, 5) // First 5 files for preview
            };
        })
        .sort((a, b) => b.modifiedAt - a.modifiedAt); // Most recent first
}

/**
 * Get files in a project folder (recursive)
 */
function getProjectFiles(projectPath, relativePath = '') {
    const files = [];
    const fullPath = path.join(projectPath, relativePath);

    if (!fs.existsSync(fullPath)) return files;

    const items = fs.readdirSync(fullPath);

    for (const item of items) {
        const itemPath = path.join(fullPath, item);
        const relPath = path.join(relativePath, item);
        const stat = fs.statSync(itemPath);

        if (stat.isDirectory()) {
            files.push({ name: relPath, type: 'folder' });
            files.push(...getProjectFiles(projectPath, relPath));
        } else {
            files.push({ name: relPath, type: 'file', size: stat.size });
        }
    }

    return files;
}

/**
 * Open project folder in Finder/Explorer
 */
function openInFinder(folderPath) {
    shell.openPath(folderPath);
}

/**
 * Delete a project
 */
function deleteProject(projectPath) {
    if (!projectPath.startsWith(getProjectsDir())) {
        throw new Error('Invalid project path');
    }

    if (fs.existsSync(projectPath)) {
        fs.rmSync(projectPath, { recursive: true, force: true });
        return true;
    }
    return false;
}

/**
 * Get project info
 */
function getProject(projectName) {
    const projectPath = path.join(getProjectsDir(), projectName);

    if (!fs.existsSync(projectPath)) {
        return null;
    }

    const stat = fs.statSync(projectPath);
    const files = getProjectFiles(projectPath);

    return {
        name: projectName,
        path: projectPath,
        createdAt: stat.birthtime,
        modifiedAt: stat.mtime,
        files
    };
}

module.exports = {
    getLuloDir,
    getProjectsDir,
    ensureDirectories,
    createProject,
    saveFile,
    readFile,
    listProjects,
    getProjectFiles,
    openInFinder,
    deleteProject,
    getProject
};
